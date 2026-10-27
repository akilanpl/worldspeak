/* eslint-disable no-console -- local synthetic security outcomes only */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import postgres from "postgres";

const host=process.env.PGHOST, database=process.env.PGDATABASE;
if (!host || !["127.0.0.1","localhost","::1"].includes(host) || !database ||
    !/^worldspeak_phase2(?:_[a-zA-Z0-9_]+)?$/.test(database) ||
    process.env.DATABASE_URL || process.env.PGSERVICE || process.env.PGSERVICEFILE)
  throw Error("Local named scratch DB only");
globalThis.fetch=async()=>{throw Error("HTTP forbidden in privilege regression");};
const sql=postgres({host,database,port:Number(process.env.PGPORT??5432),
  username:process.env.PGUSER??"postgres",password:process.env.PGPASSWORD??"",prepare:false,max:1,onnotice:()=>{}});
type Tx=postgres.TransactionSql;
const member="worldspeak_svc_"+randomUUID().replaceAll("-","");
const owner=randomUUID(),foreign=randomUUID(),key=randomUUID();
const migrationDir=new URL("../../../supabase/migrations/",import.meta.url);
const files=readdirSync(migrationDir).filter(f=>f.endsWith("_worldspeak_009_legacy_rpc_privilege.sql"));
assert.equal(files.length,1);
const migration=readFileSync(new URL(files[0]!,migrationDir),"utf8");
assert.equal(migration.replace(/--[^\n]*/g,"").trim(),
  "revoke execute on function public.submit_legacy_inference_job(uuid,text,uuid,text) from service_role;");
const legacy="public.submit_legacy_inference_job(uuid,text,uuid,text)";
const wrapper="public.submit_inference_job(uuid,text,uuid,text)";
const rollback=Error("synthetic rollback");
let created=false,passed=0;
async function as<T>(t:Tx,role:string,id:string|null,fn:(q:Tx)=>Promise<T>) {
  return t.savepoint(async q=>{
    await q.unsafe(`set local role "${role}"`);
    await q`select set_config('request.jwt.claim.sub',${id??""},true)`;
    const result=await fn(q);await q`reset role`;return result;
  });
}
async function denied(fn:()=>Promise<unknown>){await assert.rejects(fn(),(e:unknown)=>(e as {code?:string}).code==="42501");}
async function call(q:Tx,which:"legacy"|"wrapper",asset:string|null=null,operation="segment",concept:string|null="chair") {
  return which==="legacy"
    ? q`select public.submit_legacy_inference_job(${asset},${operation},${key},${concept}) as value`
    : q`select public.submit_inference_job(${asset},${operation},${key},${concept}) as value`;
}
async function privilege(t:Tx,role:string,fn:string){return (await t`select has_function_privilege(${role},${fn},'EXECUTE') as allowed`)[0]!.allowed;}
async function snapshot(t:Tx){
  const data:Record<string,unknown>={};
  for(const table of ["world_inference.budgets","world_inference.generation_permits","world_inference.smoke_authorizations","world_inference.credit_events","world_inference.cleanup","world_inference.sam_test_authorizations","world_inference.sam_test_events","public.inference_jobs","public.inference_media"])
    data[table]=(await t.unsafe(`select coalesce(jsonb_agg(v order by v::text),'[]'::jsonb) as value from (select to_jsonb(x) v from ${table} x) s`))[0]!.value;
  data.policies=await t`select * from pg_policies where schemaname in('public','world_inference','storage') order by schemaname,tablename,policyname`;
  data.definitions=await t`select p.oid,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','world_inference') and p.prokind='f' order by p.oid`;
  data.otherFunctionGrants=await t`select p.oid,p.proacl::text,p.proowner,p.proconfig,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','world_inference') and p.prokind='f' and p.oid<>${legacy}::regprocedure order by p.oid`;
  data.wrapper=await t`select p.proacl::text,p.prosecdef,p.proowner,p.proconfig from pg_proc p where p.oid=${wrapper}::regprocedure`;
  data.tables=await t`select c.oid,c.relowner,c.relrowsecurity,c.relacl::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','world_inference') and c.relkind='r' order by c.oid`;
  return JSON.parse(JSON.stringify(data)) as unknown;
}
async function check(name:string,fn:()=>Promise<void>){await fn();passed++;console.log("PASS legacy-privilege: "+name);}
try {
  await sql.unsafe(`create role "${member}" nologin inherit`);created=true;
  await sql.unsafe(`grant service_role to "${member}"`);
  try {await sql.begin(async t=>{
    await check("009 denies direct service, inherited service, anon, authenticated and worker execution",async()=>{
      for(const role of ["service_role",member,"anon","authenticated","worldspeak_inference_worker"]){
        assert.equal(await privilege(t,role,legacy),false);
        await denied(()=>as(t,role,owner,q=>call(q,"legacy")));
      }
      const publicAcl=await t`select exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid=${legacy}::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') as allowed`;
      assert.equal(publicAcl[0]!.allowed,false);
    });
    await check("reproduces inherited hosted grant and removes only that capability without changing protected state",async()=>{
      const before=await snapshot(t);
      // Reconstruct the independently observed hosted 008 ACL inside a rollback-
      // only local transaction. Default public-function grants are also emulated
      // before migration replay by setup-shim.sql, unlike the previous harness.
      await t`grant execute on function public.submit_legacy_inference_job(uuid,text,uuid,text) to service_role`;
      for(const role of ["service_role",member]){
        assert.equal(await privilege(t,role,legacy),true);
        await assert.rejects(as(t,role,null,q=>call(q,"legacy")),/UNAUTHENTICATED/);
      }
      await t.unsafe(migration);
      for(const role of ["service_role",member]){
        assert.equal(await privilege(t,role,legacy),false);
        await denied(()=>as(t,role,owner,q=>call(q,"legacy")));
      }
      assert.deepEqual(await snapshot(t),before);
      await t.unsafe(migration); // REVOKE is safely repeatable; never rearms data.
      assert.deepEqual(await snapshot(t),before);
    });
    await check("supported definer wrapper retains documented grants and executes its internal owner call",async()=>{
      for(const role of ["authenticated","service_role",member]){
        assert.equal(await privilege(t,role,wrapper),true);
        await assert.rejects(as(t,role,null,q=>call(q,"wrapper")),/UNAUTHENTICATED/);
        // This error is raised inside the private legacy implementation, proving
        // wrapper-to-helper execution still works with caller EXECUTE revoked.
        await assert.rejects(as(t,role,owner,q=>call(q,"wrapper")),/CONSENT_REQUIRED/);
      }
      for(const role of ["anon","worldspeak_inference_worker"]){
        assert.equal(await privilege(t,role,wrapper),false);
        await denied(()=>as(t,role,owner,q=>call(q,"wrapper")));
      }
    });
    await check("all other renamed legacy helpers deny service, inherited service and client/worker roles",async()=>{
      const helpers=[
        ["world_inference.claim_legacy()","select world_inference.claim_legacy()"],
        ["world_inference.dispatch_legacy(uuid,uuid)","select world_inference.dispatch_legacy(null,null)"],
        ["world_inference.finish_legacy(uuid,uuid,text,bigint,jsonb,text)","select world_inference.finish_legacy(null,null,'failed',0,null,null)"],
        ["world_inference.sweep_legacy()","select world_inference.sweep_legacy()"],
      ];
      for(const role of ["service_role",member,"anon","authenticated","worldspeak_inference_worker"])
        for(const [fn,query] of helpers){assert.equal(await privilege(t,role,fn!),false);await denied(()=>as(t,role,owner,q=>q.unsafe(query!)));}
    });
    await t`insert into auth.users(id,email) values(${owner},${"acl-"+owner+"@example.test"}),(${foreign},${"acl-"+foreign+"@example.test"})`;
    const asset=(await as(t,"authenticated",owner,q=>q`select public.create_inference_media(${'a'.repeat(64)},32,32,100,'scene-v1') as v`))[0]!.v.id as string;
    await as(t,"worldspeak_inference_worker",null,q=>q`select world_inference.media_ready(${asset})`);
    await check("owner-scoped operations remain functional and a ready asset cannot raise zero budgets",async()=>{
      assert.equal((await as(t,"authenticated",owner,q=>q`select count(*)::int n from public.inference_media where id=${asset}`))[0]!.n,1);
      assert.equal((await as(t,"authenticated",foreign,q=>q`select count(*)::int n from public.inference_media where id=${asset}`))[0]!.n,0);
      assert.equal((await as(t,"authenticated",owner,q=>q`select public.inference_job_status(${randomUUID()}) v`))[0]!.v,null);
      const before=await snapshot(t);
      for(const role of ["authenticated","service_role",member])
        await assert.rejects(as(t,role,owner,q=>call(q,"wrapper",asset)),/BUDGET_EXCEEDED/);
      assert.deepEqual(await snapshot(t),before);
    });
    await check("with a synthetic SAM ticket the wrapper enforces its scope and legacy access cannot bypass it",async()=>{
      // Local rollback-only fixture, not operator issuance, no funded budget.
      await t`insert into world_inference.sam_test_authorizations(approval_ref,owner_id,model,operation,concept,input_sha256,cap_micro,pricing_ref,expires_at)
        values('synthetic-acl-009',${owner},'sam-3.1','segment','chair','a27313c7b3732ec3a3dea8df1f920c9c105884068705093608676ee248e4f8cc',2500,'meta-standard-sam-image-2500-v1',now()+interval '10 minutes')`;
      const before=await snapshot(t);
      for(const role of ["authenticated","service_role",member]){
        await denied(()=>as(t,role,owner,q=>call(q,"legacy",asset)));
        await assert.rejects(as(t,role,owner,q=>call(q,"wrapper",asset,"scene",null)),/SAM_TEST_NOT_AUTHORIZED/);
        await assert.rejects(as(t,role,owner,q=>call(q,"wrapper",asset,"segment","water")),/SAM_TEST_NOT_AUTHORIZED/);
        await assert.rejects(as(t,role,foreign,q=>call(q,"wrapper",asset)),/SAM_TEST_NOT_AUTHORIZED/);
        await assert.rejects(as(t,role,owner,q=>call(q,"wrapper",asset)),/SAM_TEST_MEDIA_MISMATCH/);
      }
      assert.deepEqual(await snapshot(t),before);
    });
    throw rollback;
  });}catch(e){if(e!==rollback)throw e;}
  console.log(`LEGACY PRIVILEGES: ${passed} scenario groups passed; local Postgres.js, zero HTTP/hosted/model calls.`);
} catch(e){console.error(e instanceof assert.AssertionError?e.message:`Local ACL regression failed (${(e as {code?:string}).code??"error"}); connection/query values suppressed.`);process.exitCode=1;}
finally {if(created)await sql.unsafe(`drop role "${member}"`);await sql.end({timeout:5});}
