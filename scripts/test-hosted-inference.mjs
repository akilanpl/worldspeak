#!/usr/bin/env node
/* eslint-disable no-console -- synthetic IDs/counts only; no keys/tokens/passwords */
import { loadEnvFile } from 'node:process';
import { createRequire } from 'node:module';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import { readFileSync,writeFileSync,existsSync,unlinkSync,statSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
loadEnvFile(process.env.WORLDSPEAK_HOSTED_ENV_FILE??resolve(root,'.env.hosted.local'));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(url!=='https://cafkyowssdemzivhzxbb.supabase.co')throw Error('Wrong project; stop');
if(process.env.WORLDSPEAK_LIVE_INFERENCE_APPROVED)throw Error('Live inference must stay disabled');
const require=createRequire(resolve(root,'apps/worker/package.json'));
const {createClient}=require('@supabase/supabase-js');const sharp=require('sharp');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}};
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const file=resolve(root,'.env.inference-fixtures.local');
const save=f=>writeFileSync(file,JSON.stringify(f),{mode:0o600});
const fail=(label,error)=>{throw Error(`${label}: ${error?.code??'unexpected result'}; STOP, no recovery attempted`);};
const assert=(value,label)=>{if(!value)fail(label);};
async function client(user){const c=createClient(url,publicKey,options);const r=await c.auth.signInWithPassword({email:user.email,password:user.password});if(r.error)fail('Fixture login',r.error);return c;}
function fixture(){const f=JSON.parse(readFileSync(file,'utf8'));assert((statSync(file).mode&0o777)===0o600,'Fixture file permissions');
 assert(/^[a-f0-9-]{36}$/.test(f.tag),'Fixture tag');
 assert(f.users.every((u,i)=>u.email===`worldspeak-inference-${f.tag}-${['a','b'][i]}@example.test`),'Synthetic fixture emails only');
 assert(f.assets.every(a=>f.users.some(u=>u.id===a.owner)&&a.path===`${a.owner}/${a.id}.png`),'Exact synthetic asset paths');return f;}
async function verifiedUser(user,tag){const r=await admin.auth.admin.getUserById(user.id);assert(!r.error&&r.data.user?.user_metadata?.worldspeak_fixture===tag&&r.data.user.email===user.email,'Fixture identity mismatch');}
async function present(asset){
 const r=await fetch(`${url}/storage/v1/object/authenticated/world-inference/${asset.path}?verification=${randomUUID()}`,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(r.ok){await r.arrayBuffer();return true;}
 let body;try{body=await r.json();}catch{fail('Unexpected fresh Storage response');}
 assert((r.status===400||r.status===404)&&String(body.statusCode)==='404'&&['not_found','Object not found','object_not_found'].includes(body.error??body.message),'Fresh absence must be genuine not-found, never an auth/network error');return false;
}
async function listed(asset){const r=await admin.storage.from('world-inference').list(asset.owner,{search:asset.id+'.png'});if(r.error)fail('Storage listing',r.error);return r.data.some(x=>x.name===asset.id+'.png');}
if(process.argv[2]==='setup'){
 assert(!existsSync(file),'Existing fixture requires review first');
 const f={tag:randomUUID(),users:[],assets:[]};writeFileSync(file,JSON.stringify(f),{flag:'wx',mode:0o600});
 for(const letter of ['a','b']){
  const user={email:`worldspeak-inference-${f.tag}-${letter}@example.test`,password:'Aa1!'+randomBytes(30).toString('base64url')};
  const r=await admin.auth.admin.createUser({...user,email_confirm:true,user_metadata:{worldspeak_fixture:f.tag}});if(r.error)fail('Fixture creation',r.error);
  user.id=r.data.user.id;f.users.push(user);save(f);
  const c=await client(user);const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#336699'}}).png().toBuffer();
  const r2=await c.rpc('create_inference_media',{p_sha256:createHash('sha256').update(bytes).digest('hex'),p_width:8,p_height:8,p_bytes:bytes.length,p_notice:'scene-v1'});if(r2.error)fail('Media admission',r2.error);
  const asset={id:r2.data.id,path:r2.data.path,owner:user.id,sha256:createHash('sha256').update(bytes).digest('hex')};f.assets.push(asset);save(f);
  const upload=await admin.storage.from('world-inference').upload(asset.path,bytes,{contentType:'image/png',upsert:false});if(upload.error)fail('Synthetic Storage upload',upload.error);
 }
 console.log(JSON.stringify({tag:f.tag,users:f.users.map(x=>x.id),assets:f.assets.map(x=>({id:x.id,owner:x.owner})),note:'Only synthetic 8x8 PNGs; no jobs submitted or model calls.'}));
}else if(process.argv[2]==='verify'){
 const f=fixture();for(const user of f.users)await verifiedUser(user,f.tag);
 const [a,b]=await Promise.all(f.users.map(client));const [assetA,assetB]=f.assets;
 const own=await a.from('inference_media').select('id').eq('id',assetA.id);assert(!own.error&&own.data.length===1,'Owner media read');
 const foreign=await b.from('inference_media').select('id').eq('id',assetA.id);assert(!foreign.error&&foreign.data.length===0,'Foreign media denied');
 const denied=await a.from('inference_media').update({owner_id:f.users[1].id}).eq('id',assetA.id);assert(Boolean(denied.error),'Direct media mutation denied');
 const lease=await a.from('inference_jobs').select('lease_token');assert(Boolean(lease.error),'Lease token read denied');
 const anon=createClient(url,publicKey,options);const anonymous=await anon.from('inference_media').select('id');assert(Boolean(anonymous.error)||anonymous.data.length===0,'Anonymous media denied');
 const job=await a.rpc('inference_job_status',{p_id:f.jobId});assert(!job.error&&job.data?.status==='canceled'&&job.data.result===null,'Synthetic terminal job read');
 const foreignJob=await b.rpc('inference_job_status',{p_id:f.jobId});assert(!foreignJob.error&&foreignJob.data===null,'Foreign job denied');
 const storageRead=await a.storage.from('world-inference').download(assetA.path);assert(Boolean(storageRead.error),'Client raw Storage read denied');
 await b.storage.from('world-inference').remove([assetA.path]);
 const stillPresent=await admin.storage.from('world-inference').download(assetA.path);assert(!stillPresent.error&&stillPresent.data.size>0,'Foreign Storage delete denied');
 const foreignRevoke=await a.rpc('revoke_inference_media',{p_id:assetB.id});assert(!foreignRevoke.error&&foreignRevoke.data===false,'Foreign revoke denied');
 const revoke=await a.rpc('revoke_inference_media',{p_id:assetA.id});assert(!revoke.error&&revoke.data===true,'Own revoke');
 const hidden=await a.from('inference_media').select('id').eq('id',assetA.id);assert(!hidden.error&&hidden.data.length===0,'Revoked media hidden');
 await verifiedUser(f.users[1],f.tag);const removed=await admin.auth.admin.deleteUser(f.users[1].id);if(removed.error)fail('Fixture account deletion',removed.error);f.deletedUser=f.users[1].id;save(f);
 const cascaded=await admin.from('inference_media').select('id').eq('id',assetB.id);assert(!cascaded.error&&cascaded.data.length===0,'Auth deletion cascades media metadata');
 console.log(JSON.stringify({checksPassed:13,consentRevoked:true,syntheticAccountDeleted:true,note:'No inference admission/dispatch/authorization was invoked; budgets/permits unchanged.'}));
}else if(process.argv[2]==='delete-fixtures'){
 const f=fixture();
 for(const user of f.users){if(user.id===f.deletedUser)continue;await verifiedUser(user,f.tag);const r=await admin.auth.admin.deleteUser(user.id);if(r.error)fail('Final fixture account cleanup',r.error);}
 f.allUsersDeleted=true;save(f);console.log('Synthetic identities removed; durable cleanup outbox must remain.');
 }else if(process.argv[2]==='remove-bytes'){
 const f=fixture();assert(f.allUsersDeleted===true,'Identities must already be removed');let removedCount=0;
 for(const asset of f.assets){
  const before=await present(asset);assert(await listed(asset)===before,'Fresh read and listing must agree before deletion');
  if(before){const r=await admin.storage.from('world-inference').remove([asset.path]);if(r.error)fail('Physical cleanup',r.error);removedCount++;}
  assert(!await present(asset),'Fresh bytes unavailable after Storage API removal');assert(!await listed(asset),'Independent listing confirms absence');
 }
 console.log(JSON.stringify({newRemovals:removedCount,verifiedAbsent:f.assets.length,note:'Exact fixtures only, cache-busted reads, independent listings, no automatic retries.'}));
}else if(process.argv[2]==='inspect'){
 const f=fixture();const checks=[];
 for(const asset of f.assets){
  const listing=await admin.storage.from('world-inference').list(asset.owner,{search:asset.id+'.png'});if(listing.error)fail('Read-only listing',listing.error);
  const response=await fetch(`${url}/storage/v1/object/authenticated/world-inference/${asset.path}?verification=${randomUUID()}`,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(20000)});
  checks.push({asset:asset.id,listed:listing.data.some(x=>x.name===asset.id+'.png'),freshReadStatus:response.status,cache:response.headers.get('cf-cache-status')});await response.arrayBuffer();
 }
 console.log(JSON.stringify({readOnly:true,checks}));
 }else if(process.argv[2]==='finish'){
 const f=fixture();for(const asset of f.assets){assert(!await present(asset)&&!await listed(asset),'No residual bytes or Storage listing');}
 assert(f.allUsersDeleted===true,'Synthetic identities already removed');
 unlinkSync(file);console.log('Synthetic Auth fixtures removed; no model calls.');
}else throw Error('Use setup | verify | delete-fixtures | remove-bytes | finish');
