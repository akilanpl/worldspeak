/* eslint-disable no-console -- local synthetic scenario outcomes only */
import postgres from "postgres";
import assert from "node:assert/strict";
import { createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeStore } from "../src/store";
import { InferenceResultSchema, JobViewSchema } from "@worldspeak/contracts";
const host = process.env.PGHOST, database = process.env.PGDATABASE;
if (!host || !["127.0.0.1", "localhost", "::1"].includes(host) || !database ||
 !/^worldspeak_phase2(?:_[a-zA-Z0-9_]+)?$/.test(database) || process.env.DATABASE_URL || process.env.PGSERVICE || process.env.PGSERVICEFILE)
 throw Error("Local named scratch only");
globalThis.fetch = async () => { throw Error("HTTP forbidden in SAM authorization tests"); };
const sql = postgres({host, database, port:Number(process.env.PGPORT??5432), username:process.env.PGUSER??"postgres",password:process.env.PGPASSWORD??"",prepare:false,max:6,onnotice:()=>{}});
type Tx = postgres.TransactionSql;
const owner=randomUUID(), foreign=randomUUID(), historicalOwner=randomUUID(), historicalJob=randomUUID();
const sha="a27313c7b3732ec3a3dea8df1f920c9c105884068705093608676ee248e4f8cc";
const rollback = Error("synthetic scenario rollback");
let passed=0;
const role="worldspeak_sam_"+randomUUID().replaceAll("-","");
const password=randomBytes(32).toString("hex"),salt=randomBytes(16);
const salted=pbkdf2Sync(password,salt,4096,32,"sha256");
const hmac=(text:string)=>createHmac("sha256",salted).update(text).digest();
const verifier=`SCRAM-SHA-256$4096:${salt.toString("base64")}$${createHash("sha256").update(hmac("Client Key")).digest("base64")}:${hmac("Server Key").toString("base64")}`;
let store:ReturnType<typeof makeStore>|undefined, roleCreated=false;
async function seed(t:Tx) {
 // This suite runs last in a destructive, named LOCAL scratch DB only. Earlier
 // suites leave synthetic receipts; transaction rollback restores their state.
 await t`delete from world_inference.credit_events`;
 await t`delete from world_inference.cleanup`;
 await t`delete from world_inference.budgets where account<>'global'`;
 await t`update world_inference.budgets set limit_micro=0,reserved_micro=0,spent_micro=4402 where account='global'`;
 await t`insert into auth.users(id,email) values(${owner},${"sam-"+owner+"@example.test"}),(${foreign},${"sam-"+foreign+"@example.test"})`;
 await t`insert into world_inference.smoke_authorizations(owner_id,cap_micro,operations) values(${historicalOwner},50000,array['scene','segment'])`;
 await t`update world_inference.generation_permits set remaining=0,owner_id=${historicalOwner},armed_at=now(),consumed_at=case when operation='scene' then now() else null end`;
 await t`insert into world_inference.credit_events(job_id,event,amount_micro) values(${historicalJob},'reserve',25000),(${historicalJob},'settle',4402)`;
}
async function issue(t:Tx) {
 return (await t`select world_inference.authorize_sam_test(${owner},'synthetic-explicit-approval',${sha},2500,'meta-standard-sam-image-2500-v1',now()+interval '20 minutes') as v`)[0]!.v as string;
}
async function user<T>(t:Tx,id:string,fn:(q:Tx)=>Promise<T>) {
 return t.savepoint(async q=>{await q`set local role authenticated`;await q`select set_config('request.jwt.claim.sub',${id},true)`;const value=await fn(q);await q`reset role`;return value;});
}
async function worker<T>(t:Tx,fn:(q:Tx)=>Promise<T>) {return t.savepoint(async q=>{await q`set local role worldspeak_inference_worker`;const value=await fn(q);await q`reset role`;return value;});}
async function media(t:Tx,id=owner,digest=sha) {
 const row=await user(t,id,q=>q`select public.create_inference_media(${digest},512,512,25949,'scene-v1') as v`);
 const asset=row[0]!.v.id as string;
 await worker(t,q=>q`select world_inference.media_ready(${asset})`); return asset;
}
async function admit(t:Tx,asset:string,key=randomUUID(),id=owner,operation="segment",concept:string|null="chair") {
 return (await user(t,id,q=>q`select public.submit_inference_job(${asset},${operation},${key},${concept}) as v`))[0]!.v as string;
}
async function claim(t:Tx) {return (await worker(t,q=>q`select world_inference.claim_sam_test() as v`))[0]!.v as {id:string;lease_token:string}|null;}
async function dispatch(t:Tx,j:{id:string;lease_token:string}) {return (await worker(t,q=>q`select world_inference.dispatch_sam_test(${j.id},${j.lease_token}) as v`))[0]!.v;}
async function snapshot(t:Tx) {
 return (await t`select (select jsonb_agg(to_jsonb(p) order by operation) from world_inference.generation_permits p) as permits,
 (select jsonb_agg(to_jsonb(a)) from world_inference.smoke_authorizations a) as tombstone,
 (select jsonb_agg(to_jsonb(e) order by event) from world_inference.credit_events e where job_id=${historicalJob}) as historical`)[0]!;
}
async function scenario(name:string,fn:(t:Tx)=>Promise<void>) {
 try {await sql.begin(async t=>{await seed(t);const before=await snapshot(t);await fn(t);assert.deepEqual(await snapshot(t),before);throw rollback;});}
 catch(e){if(e!==rollback)throw e;}
 passed++;console.log("PASS sam-authorization: "+name);
}
try {
 await scenario("issuance rejects changed pricing, hash, expiry, unknown receipts and live headroom",async t=>{
  await assert.rejects(t.savepoint(q=>q`select world_inference.authorize_sam_test(${owner},'synthetic-approval',${sha},2501,'meta-standard-sam-image-2500-v1',now()+interval '20 minutes')`),/PRICING_NOT_CONFIRMED/);
  await assert.rejects(t.savepoint(q=>q`select world_inference.authorize_sam_test(${owner},'synthetic-approval',${"a".repeat(64)},2500,'meta-standard-sam-image-2500-v1',now()+interval '20 minutes')`),/SCOPE_MISMATCH/);
  await assert.rejects(t.savepoint(q=>q`select world_inference.authorize_sam_test(${owner},'synthetic-approval',${sha},2500,'meta-standard-sam-image-2500-v1',now()-interval '1 second')`),/SCOPE_MISMATCH/);
  await assert.rejects(t.savepoint(async q=>{await q`insert into world_inference.credit_events(job_id,event,amount_micro) values(${randomUUID()},'settle',1)`;await issue(q);}),/RECONCILIATION_REQUIRED/);
  await assert.rejects(t.savepoint(async q=>{await q`insert into world_inference.budgets(account,limit_micro) values(${foreign},1)`;await issue(q);}),/RECONCILIATION_REQUIRED/);
 });
 await scenario("operator-only issuance; immutable ticket/events; no legacy worker fallback",async t=>{
  for(const role of ["anon","authenticated","worldspeak_inference_worker"]){
   await assert.rejects(t.savepoint(async q=>{await q.unsafe(`set local role ${role}`);await issue(q);}),/permission denied/);
  }
  await issue(t);
  await assert.rejects(t.savepoint(q=>q`update world_inference.sam_test_authorizations set concept='chair'`),/APPEND_ONLY/);
  await assert.rejects(t.savepoint(q=>q`delete from world_inference.sam_test_authorizations`),/APPEND_ONLY/);
  await assert.rejects(t.savepoint(q=>q`truncate world_inference.sam_test_authorizations cascade`),/APPEND_ONLY/);
  await assert.rejects(t.savepoint(q=>issue(q)),/ALREADY_ISSUED/);
  await assert.rejects(worker(t,q=>q`select world_inference.deactivate_sam_test()`),/permission denied/);
  await assert.rejects(worker(t,q=>q`select * from world_inference.sam_test_authorizations`),/permission denied/);
  await assert.rejects(worker(t,q=>q`select world_inference.claim_legacy()`),/permission denied/);
  assert.equal((await worker(t,q=>q`select world_inference.claim() as v`))[0]!.v,null);
 });
 await scenario("exact owner, operation, concept, image digest and one admission/idempotency",async t=>{
  await issue(t);const asset=await media(t), wrong=await media(t,owner,"b".repeat(64)), foreignAsset=await media(t,foreign);
  await assert.rejects(t.savepoint(q=>admit(q,asset,randomUUID(),foreign)),/NOT_AUTHORIZED/);
  await assert.rejects(t.savepoint(q=>admit(q,asset,randomUUID(),owner,"scene",null)),/NOT_AUTHORIZED/);
  await assert.rejects(t.savepoint(q=>admit(q,asset,randomUUID(),owner,"segment","cup")),/NOT_AUTHORIZED/);
  await assert.rejects(t.savepoint(q=>admit(q,wrong)),/MEDIA_MISMATCH/);
  await assert.rejects(t.savepoint(q=>admit(q,foreignAsset)),/MEDIA_MISMATCH/);
  const key=randomUUID(),id=await admit(t,asset,key);assert.equal(await admit(t,asset,key),id);
  await assert.rejects(t.savepoint(q=>q`update world_inference.sam_test_events set job_id=${randomUUID()} where event='admitted'`),/APPEND_ONLY/);
  await assert.rejects(t.savepoint(q=>q`delete from world_inference.sam_test_events where event='admitted'`),/APPEND_ONLY/);
  await assert.rejects(t.savepoint(q=>admit(q,wrong,key)),/IDEMPOTENCY_CONFLICT/);
  await assert.rejects(t.savepoint(q=>admit(q,asset)),/ALREADY_ADMITTED/);
  const sums=await t`select reserved_micro,spent_micro,limit_micro from world_inference.budgets where account='global'`;
  assert.equal(String(sums[0]!.reserved_micro),"2500");assert.equal(String(sums[0]!.spent_micro),"4402");assert.equal(String(sums[0]!.limit_micro),"6902");
 });
 await scenario("cancel before dispatch releases once; ticket/job identity cannot be reused",async t=>{
  await issue(t);const asset=await media(t), id=await admit(t,asset);
  await user(t,owner,q=>q`select public.cancel_inference_job(${id})`);await worker(t,q=>q`select world_inference.sweep()`);
  assert.equal(await claim(t),null);
  assert.equal(String((await t`select reserved_micro from world_inference.budgets where account='global'`)[0]!.reserved_micro),"0");
  await assert.rejects(t.savepoint(q=>admit(q,asset)),/NOT_AUTHORIZED|ALREADY_ADMITTED/);
 });
 await scenario("lease crash before dispatch closes with zero charge; no second claim",async t=>{
  await issue(t);const asset=await media(t),id=await admit(t,asset),l=await claim(t);assert.ok(l);
  await t`update public.inference_jobs set lease_until=now()-interval '1 second' where id=${id}`;
  assert.equal(await claim(t),null);
  const job=(await t`select status,error_code,actual_micro from public.inference_jobs where id=${id}`)[0]!;
  assert.equal(job.status,"failed");assert.equal(job.error_code,"SAM_TEST_NO_RETRY");assert.equal(String(job.actual_micro),"0");
 });
 await scenario("durable dispatch rejects wrong token/duplicate/legacy; no paid automatic retry after crash",async t=>{
  await issue(t);const asset=await media(t),id=await admit(t,asset),l=await claim(t);assert.ok(l);
  assert.equal(await dispatch(t,{...l,lease_token:randomUUID()}),null);
  await assert.rejects(worker(t,q=>q`select world_inference.finish_legacy(${id},${l.lease_token},'succeeded',0,null,null)`),/permission denied/);
  assert.equal((await worker(t,q=>q`select world_inference.finish(${id},${l.lease_token},'failed',0,null,'BYPASS') as v`))[0]!.v,false);
  await assert.rejects(worker(t,q=>q`select world_inference.finish_sam_test(${id},${l.lease_token},'succeeded',0,null,null)`),/NOT_DISPATCHED/);
  assert.equal((await worker(t,q=>q`select world_inference.dispatch(${id},${l.lease_token}) as v`))[0]!.v,null);
  assert.ok(await dispatch(t,l));assert.equal(await dispatch(t,l),null);
  await t`update public.inference_jobs set lease_until=now()-interval '1 second' where id=${id}`;
  await worker(t,q=>q`select world_inference.sweep()`);
  assert.equal(await claim(t),null);
  const row=(await t`select status,settled from public.inference_jobs where id=${id}`)[0]!;assert.equal(row.status,"uncertain");assert.equal(row.settled,false);
  const money=(await t`select reserved_micro,limit_micro,spent_micro from world_inference.budgets where account='global'`)[0]!;
  assert.equal(String(money.reserved_micro),"2500");assert.equal(String(money.limit_micro),"0");assert.equal(String(money.spent_micro),"4402");
  await t`select world_inference.reconcile(${id},2500)`;
  assert.equal(String((await t`select spent_micro from world_inference.budgets where account='global'`)[0]!.spent_micro),"6902");
 });
 await scenario("operator deactivation queues consent cleanup, fences dispatch and preserves unknown held funds",async t=>{
  await issue(t);const asset=await media(t),id=await admit(t,asset),l=await claim(t);assert.ok(l);assert.ok(await dispatch(t,l));
  await t`select world_inference.deactivate_sam_test()`;
  assert.equal((await t`select cancel_requested from public.inference_jobs where id=${id}`)[0]!.cancel_requested,true);
  assert.equal((await t`select state from public.inference_media where id=${asset}`)[0]!.state,"revoked");
  const c=(await t`select status from world_inference.cleanup where asset_id=${asset}`)[0]!;assert.equal(c.status,"pending");
  assert.equal(String((await t`select reserved_micro from world_inference.budgets where account='global'`)[0]!.reserved_micro),"2500");
  assert.equal((await worker(t,q=>q`select world_inference.finish_sam_test(${id},${l.lease_token},'failed',2500,null,'SYNTHETIC_CANCELED_OUTPUT') as v`))[0]!.v,true);
  const view=(await user(t,owner,q=>q`select public.inference_job_status(${id}) as v`))[0]!.v;assert.equal(view.status,"canceled");assert.equal(view.result,null);assert.equal(await claim(t),null);
 });
 await scenario("Auth cascade retains ticket/consumption/credit and cleanup; cannot reissue",async t=>{
  await issue(t);const asset=await media(t),id=await admit(t,asset),l=await claim(t);assert.ok(l);assert.ok(await dispatch(t,l));
  await t`delete from auth.users where id=${owner}`;
  assert.equal((await t`select count(*)::int as n from world_inference.sam_test_authorizations`)[0]!.n,1);
  assert.equal((await t`select count(*)::int as n from world_inference.sam_test_events where event='dispatched'`)[0]!.n,1);
  assert.equal((await t`select count(*)::int as n from world_inference.sam_test_events where event='revoked'`)[0]!.n,1);
  assert.equal((await t`select count(*)::int as n from world_inference.budgets where limit_micro<>0`)[0]!.n,0);
  assert.equal((await t`select count(*)::int as n from world_inference.cleanup where asset_id=${asset}`)[0]!.n,1);
  assert.equal((await t`select count(*)::int as n from world_inference.credit_events where job_id=${id} and event='settle' and amount_micro=2500`)[0]!.n,1);
  await assert.rejects(t.savepoint(q=>issue(q)),/ALREADY_ISSUED/);
 });
 await scenario("expired ticket automatically deactivates admission without touching history",async t=>{
  await t`insert into world_inference.sam_test_authorizations(approval_ref,owner_id,model,operation,concept,input_sha256,cap_micro,pricing_ref,issued_at,expires_at)
   values('synthetic-expired-ticket',${owner},'sam-3.1','segment','chair',${sha},2500,'meta-standard-sam-image-2500-v1',now()-interval '2 minutes',now()-interval '1 minute')`;
  await t`insert into world_inference.budgets(account,limit_micro) values(${owner},2500)`;
  await t`update world_inference.budgets set limit_micro=spent_micro+2500 where account='global'`;
  await worker(t,q=>q`select world_inference.sweep()`);
  assert.equal((await t`select count(*)::int as n from world_inference.sam_test_events where event='revoked'`)[0]!.n,1);
  assert.equal((await t`select count(*)::int as n from world_inference.budgets where limit_micro<>0`)[0]!.n,0);
  assert.equal(await claim(t),null);
 });
 // Final committed fixture permits truly concurrent connections; all prior
 // scenarios rolled back. Database is disposable and removed by the operator.
 await sql.begin(async t=>{await seed(t);await issue(t);});
 const committedHistory=await sql.begin(t=>snapshot(t));
 const asset=(await sql.begin(t=>media(t))) as string;
 const key=randomUUID();
 const admissions=await Promise.allSettled(Array.from({length:5},()=>sql.begin(t=>admit(t,asset,key))));
 assert.equal(admissions.filter(x=>x.status==='fulfilled').length,5);
 const ids=admissions.map(x=>x.status==='fulfilled'?x.value:null);assert.equal(new Set(ids).size,1);
 const id=ids[0]!;
 const duplicate=await Promise.allSettled(Array.from({length:4},()=>sql.begin(t=>admit(t,asset))));assert.equal(duplicate.filter(x=>x.status==='rejected').length,4);
 await sql.unsafe(`create role "${role}" login inherit password '${verifier}'`);roleCreated=true;
 await sql.unsafe(`grant worldspeak_inference_worker to "${role}"`);
 const url=new URL("postgresql://localhost");url.hostname=host==="::1"?"[::1]":host;url.port=process.env.PGPORT??"5432";url.pathname=database;url.username=role;url.password=password;
 store=makeStore({databaseUrl:url.toString(),supabaseUrl:"https://cafkyowssdemzivhzxbb.supabase.co",storageKey:"synthetic-local-no-storage",dispatchMode:"sam-only"});
 const actualLease=await store.store.claim();assert.ok(actualLease);assert.equal(actualLease.id,id);assert.equal(actualLease.operation,"segment");assert.equal(actualLease.concept,"chair");
 const claims=await Promise.all(Array.from({length:5},()=>sql.begin(t=>claim(t))));assert.equal(claims.filter(Boolean).length,0);
 const lease={id:actualLease.id,lease_token:actualLease.leaseToken};
 const sends=await Promise.all(Array.from({length:5},()=>sql.begin(t=>dispatch(t,lease))));assert.equal(sends.filter(Boolean).length,1);
 const receipts=await sql`select count(*)::int as n from world_inference.sam_test_events where event='dispatched'`;assert.equal(receipts[0]!.n,1);
 const result=InferenceResultSchema.parse({detections:[{label:"chair",catalogId:null,confidence:0.99,box:{x1:.247,y1:.139,x2:.746,y2:.868},mask:null}],tracks:[],segmentationMasks:[],
  provenance:{source:"model",model:"sam-3.1",adapterVersion:"meta-v1",responseId:"synthetic-sam-driver-round-trip",inputSha256:sha,inputTokens:null,outputTokens:null,costMicroUsd:2500}});
 assert.equal(await store.store.dispatch(actualLease),false); // Already consumed by the concurrent dispatch winner.
 // These are reconstructed model-transport fixtures, not genuine provider IDs.
 for (const bad of [JSON.stringify(result),{...result,provenance:{...result.provenance,source:"fixture"}},
  {...result,provenance:{...result.provenance,model:"muse-spark-1.3"}},
  {...result,provenance:{...result.provenance,inputSha256:"b".repeat(64)}}]) {
  await assert.rejects(sql.begin(t=>worker(t,q=>q`select world_inference.finish_sam_test(${id},${lease.lease_token},'succeeded',2500,${q.json(bad)}::jsonb,null)`)),/RESULT_MISMATCH/);
 }
 assert.equal(await store.store.finish(actualLease,"succeeded",2500,result,null),true);
 await sql.begin(async t=>{
  const view=JobViewSchema.parse((await user(t,owner,q=>q`select public.inference_job_status(${id}) as v`))[0]!.v);
  assert.deepEqual(view.result,result);assert.equal(view.status,"succeeded");assert.equal(view.chargedMicroUsd,2500);
  assert.equal((await user(t,foreign,q=>q`select public.inference_job_status(${id}) as v`))[0]!.v,null);
  assert.equal((await worker(t,q=>q`select world_inference.finish_sam_test(${id},${lease.lease_token},'failed',2500,null,'DUPLICATE') as v`))[0]!.v,false);
  assert.equal(String((await t`select spent_micro from world_inference.budgets where account='global'`)[0]!.spent_micro),"6902");
  assert.equal(String((await t`select reserved_micro from world_inference.budgets where account='global'`)[0]!.reserved_micro),"0");
  await t`select world_inference.deactivate_sam_test()`;
 });
 assert.deepEqual(await sql.begin(t=>snapshot(t)),committedHistory);
 passed++;console.log("PASS sam-authorization: concurrent same-key admissions, competing jobs, leases and dispatch settle exactly once");
 // Production cleanup command against a bounded local Storage HTTP double.
 // Actual physical tempfile deletion is verified independently. This is NOT a
 // hosted Storage receipt and transmits nothing outside this test process.
 const path=(await sql`select path from public.inference_media where id=${asset}`)[0]!.path as string;
 const dir=await mkdtemp(join(tmpdir(),"worldspeak-sam-cleanup-")),file=join(dir,"synthetic.png");
 let storageCalls=0;
 try {
  await writeFile(file,new Uint8Array(25949));assert.equal((await readFile(file)).length,25949);
  globalThis.fetch=async(input,init)=>{
   const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
   assert.equal(url,"https://cafkyowssdemzivhzxbb.supabase.co/storage/v1/object/world-inference");
   assert.equal(init?.method,"DELETE");assert.deepEqual(JSON.parse(init?.body as string),{prefixes:[path]});
   storageCalls++;await unlink(file);return Response.json([{name:path}]);
  };
  await sql`update world_inference.cleanup set due_at=now()-interval '1 second' where asset_id=${asset}`;
  assert.equal(await store.cleanupOnce(),true);assert.equal(storageCalls,1);
  await assert.rejects(readFile(file),{code:"ENOENT"});
  const receipt=(await sql`select status,lease_token,last_error from world_inference.cleanup where asset_id=${asset}`)[0]!;
  assert.equal(receipt.status,"done");assert.equal(receipt.lease_token,null);assert.equal(receipt.last_error,null);
  assert.equal((await sql`select state from public.inference_media where id=${asset}`)[0]!.state,"deleted");
  assert.equal((await sql`select count(*)::int as n from world_inference.sam_test_events where event='dispatched'`)[0]!.n,1);
  assert.deepEqual(await sql.begin(t=>snapshot(t)),committedHistory);
 } finally {
  globalThis.fetch=async()=>{throw Error("HTTP forbidden in SAM authorization tests");};
  await unlink(file).catch(()=>{});await rmdir(dir);
 }
 passed++;console.log("PASS sam-authorization: production cleanup removes exact local fixture bytes, closes fenced receipt, cannot dispatch");
 console.log(`SAM AUTHORIZATION: ${passed} scenario groups passed; local PostgreSQL, zero HTTP/Meta/hosted calls.`);
} catch(e) {
 console.error(e instanceof assert.AssertionError?e.stack:`SAM authorization local failure (${(e as {code?:string}).code??"error"}); connection/query values suppressed.`);process.exitCode=1;
} finally {await store?.close();if(roleCreated)await sql.unsafe(`drop role "${role}"`);await sql.end({timeout:5});}
