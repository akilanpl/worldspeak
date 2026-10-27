#!/usr/bin/env node
/* eslint-disable no-console -- only disposable IDs/status; never credentials */
import { loadEnvFile } from 'node:process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');loadEnvFile(resolve(root,'.env.hosted.local'));
if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://cafkyowssdemzivhzxbb.supabase.co')throw Error('Wrong project');
const require=createRequire(resolve(root,'apps/web/package.json'));const {createClient}=require('@supabase/supabase-js');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,opts);
const file=resolve(root,'.env.oauth-fixture.local');
if(process.argv[2]==='create'){
 if(existsSync(file))throw Error('Existing disposable fixture: verify/clean it first');
 const tag=randomUUID(),password=randomBytes(30).toString('base64url');
 const email=`worldspeak-oauth-privacy-${tag}@example.test`;
 const u=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{worldspeak_fixture:tag}});
 if(u.error)throw Error('Fixture creation failed');
 writeFileSync(file,JSON.stringify({userId:u.data.user.id,tag}),{mode:0o600});
 const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,opts);
 if((await c.auth.signInWithPassword({email,password})).error)throw Error('Fixture login failed');
 const conv=await c.from('conversations').insert({owner_id:u.data.user.id,title:'Synthetic OAuth isolation fixture',language:'en'}).select().single();
 if(conv.error)throw Error('Fixture conversation failed');
 const msg=await c.from('messages').insert({owner_id:u.data.user.id,conversation_id:conv.data.id,kind:'communication',origin:'user_text',text:'Private synthetic ownership fixture',locale:'en',text_hash:'1234abcd',client_event_id:randomUUID()}).select().single();
 if(msg.error)throw Error('Fixture message failed');
 writeFileSync(file,JSON.stringify({userId:u.data.user.id,tag,messageId:msg.data.id,conversationId:conv.data.id}),{mode:0o600});
 console.log(JSON.stringify({syntheticMessageId:msg.data.id,syntheticConversationId:conv.data.id}));
}else if(process.argv[2]==='cleanup'){
 const fixture=JSON.parse(readFileSync(file,'utf8'));const u=await admin.auth.admin.getUserById(fixture.userId);
 if(u.error||u.data.user.user_metadata.worldspeak_fixture!==fixture.tag||u.data.user.email!==`worldspeak-oauth-privacy-${fixture.tag}@example.test`)throw Error('Fixture identity mismatch: no deletion');
 if((await admin.auth.admin.deleteUser(fixture.userId)).error)throw Error('Fixture cleanup failed');
 unlinkSync(file);console.log('Disposable OAuth privacy fixture removed.');
}else throw Error('Use create or cleanup');
