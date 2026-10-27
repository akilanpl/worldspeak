#!/usr/bin/env node
/* eslint-disable no-console -- emits only named test results, never credentials */
/** Real hosted Auth/Data API/Storage tests; never resets a database or applies shims.
 * Admin is used only for this run's synthetic accounts, confirmation-token
 * fixtures, and cleanup. All data assertions use genuine user JWTs or anon.
 * Token verification is tested separately from SMTP/inbox delivery (not proven).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const envPath = resolve(root, '.env.hosted.local');
if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expected = process.env.WORLDSPEAK_EXPECTED_PROJECT_REF;
if (expected !== 'cafkyowssdemzivhzxbb' || url !== `https://${expected}.supabase.co` || !publishable || !secret) {
  console.error('BLOCKED: expected isolated WorldSpeak URL/ref and local credentials required.'); process.exit(2);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opts);
const client = () => createClient(url, publishable, opts);
const clients = [];
const created = [];
const files = [];
const results = [];
const tag = randomUUID();
const assert = (value, label) => { if (!value) throw new Error(label); };
const pass = (name) => { results.push({ name, pass: true }); console.log(`PASS: ${name}`); };
let browser;
let failure = null;
let publicSignup = { status: "not-run" };
try {
  const settingsRes = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishable } });
  const settings = await settingsRes.json();
  assert(settingsRes.ok && settings.external?.email && settings.mailer_autoconfirm === false, 'email confirmation configuration');
  pass('hosted email enabled and confirmation required');
  for (const suffix of ['a', 'b']) {
    const email = `worldspeak-${tag}-${suffix}@example.test`;
    const password = randomBytes(30).toString('base64url');
    const generated = await admin.auth.admin.generateLink({ type: 'signup', email, password });
    if (generated.data?.user?.id) created.push(generated.data.user.id);
    assert(!generated.error && generated.data?.properties?.hashed_token, 'synthetic signup-token fixture creation');
    const c = client(); clients.push(c);
    const unconfirmed = await c.auth.signInWithPassword({ email, password });
    assert(unconfirmed.error?.code === 'email_not_confirmed', 'unconfirmed password sign-in must fail');
    const confirmed = await c.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: 'signup' });
    assert(!confirmed.error && confirmed.data.user?.id === generated.data.user.id && confirmed.data.session, 'real confirmation-token consumption');
    const signed = await c.auth.signInWithPassword({ email, password });
    assert(!signed.error && signed.data.session && signed.data.user.id === generated.data.user.id, 'real password sign-in');
    clients[clients.length - 1] = { c, id: generated.data.user.id, email, password };
  }
  pass('two disposable users reject unconfirmed sign-in, consume real confirmation tokens and sign in');
  const [a, b] = clients;
  const publicEmail = `worldspeak-${tag}-public@example.test`;
  const signup = await client().auth.signUp({ email: publicEmail, password: randomBytes(30).toString('base64url') });
  if (signup.data?.user?.id) created.push(signup.data.user.id);
  publicSignup = { status: signup.error ? "blocked" : "unconfirmed-registration-created", code: signup.error?.code ?? null };
  // Failed email delivery can leave an unconfirmed account; only this exact
  // generated address is eligible for cleanup.
  if (signup.error) {
    const listed = await admin.auth.admin.listUsers({ perPage: 100 });
    for (const u of listed.data?.users ?? []) if (u.email === publicEmail && !created.includes(u.id)) created.push(u.id);
  }
  console.log('PUBLIC SIGNUP:', publicSignup.status, publicSignup.code ?? '');
  const recovery = await admin.auth.admin.generateLink({ type: 'recovery', email: a.email });
  assert(!recovery.error && recovery.data.properties.hashed_token, 'recovery fixture');
  assert(!(await a.c.auth.verifyOtp({ token_hash: recovery.data.properties.hashed_token, type: 'recovery' })).error, 'recovery token verification');
  const nextPassword = randomBytes(30).toString('base64url');
  assert(!(await a.c.auth.updateUser({ password: nextPassword })).error, 'recovery password update');
  assert((await client().auth.signInWithPassword({ email: a.email, password: a.password })).error, 'old password denied');
  a.password = nextPassword;
  assert(!(await a.c.auth.signInWithPassword({ email: a.email, password: a.password })).error, 'new password sign-in');
  pass('real recovery-token consumption, password update and old-password rejection');
  const profile = await a.c.from('profiles').select('*').single();
  assert(!profile.error && profile.data.owner_id === a.id, 'profile provisioned');
  pass('Auth signup trigger provisions owner-only profile');
  const prefs = await a.c.from('accessibility_preferences').update({ high_contrast: true, communication_locale: 'ta' }).eq('owner_id', a.id).select().single();
  assert(!prefs.error && prefs.data.high_contrast && prefs.data.communication_locale === 'ta', 'preferences persistence');
  pass('preferences persist through hosted Data API');
  const conv = await a.c.from('conversations').insert({ owner_id: a.id, title: `Synthetic ${tag}`, language: 'ta' }).select().single();
  assert(!conv.error, 'conversation insertion');
  const snapshot = { kind: 'communication', text: 'எனக்குத் தண்ணீர் வேண்டும்.', locale: 'ta', origin: 'user_text', text_hash: '1234abcd', revision: 1, template_version: null, client_event_id: randomUUID() };
  const msg = await a.c.from('messages').insert({ owner_id: a.id, conversation_id: conv.data.id, ...snapshot }).select().single();
  assert(!msg.error && msg.data.text === snapshot.text, 'approved message persistence');
  pass('conversation and exact Tamil message persist');
  const favorite = await a.c.from('favorites').insert({ owner_id: a.id, message_id: msg.data.id }).select().single();
  assert(!favorite.error, 'favorite insertion');
  const search = await a.c.from('messages').select('*').ilike('text', '%தண்ணீர்%');
  assert(!search.error && search.data.some(x => x.id === msg.data.id), 'Tamil search');
  pass('favorite and Tamil substring search work');
  for (const table of ['profiles', 'accessibility_preferences', 'consent_events', 'conversations', 'messages', 'favorites']) {
    const denied = await b.c.from(table).select('*').eq('owner_id', a.id);
    assert(!denied.error && denied.data.length === 0, 'cross-user reads blocked');
    const anon = await client().from(table).select('*');
    assert(anon.error, 'anonymous read blocked');
  }
  pass('all six private tables isolate user B and deny anonymous reads');
  assert((await b.c.from('conversations').insert({ owner_id: a.id, title: 'spoof' })).error, 'spoofed owner insert');
  assert((await a.c.from('conversations').update({ owner_id: b.id }).eq('id', conv.data.id)).error, 'owner mutation');
  assert((await b.c.from('messages').insert({ owner_id: b.id, conversation_id: conv.data.id, ...snapshot, client_event_id: randomUUID() })).error, 'foreign parent link');
  assert((await a.c.from('messages').update({ text: 'changed' }).eq('id', msg.data.id)).error, 'immutable message');
  const noUpdate = await b.c.from('conversations').update({ title: 'hijack' }).eq('id', conv.data.id).select();
  const noDelete = await b.c.from('conversations').delete().eq('id', conv.data.id).select();
  assert(!noUpdate.error && noUpdate.data.length === 0 && !noDelete.error && noDelete.data.length === 0, 'cross-user modifications');
  pass('owner spoofing, owner updates, cross-owner links and foreign modifications rejected');
  const fsnap = { ...snapshot, client_event_id: randomUUID() };
  const sf = await a.c.rpc('save_favorite_snapshot', { snapshot: fsnap, conversation_title: 'Atomic fixture' });
  const sfAgain = await a.c.rpc('save_favorite_snapshot', { snapshot: fsnap, conversation_title: 'Atomic fixture' });
  assert(!sf.error && !sfAgain.error && sf.data.id === sfAgain.data.id, 'idempotent favorite');
  const conflict = await a.c.rpc('save_favorite_snapshot', { snapshot: { ...fsnap, text: 'different' }, conversation_title: 'Conflict' });
  assert(conflict.error, 'favorite payload conflict');
  pass('favorite snapshot RPC is atomic and idempotent with conflict rejection');
  const path = `${a.id}/${tag}/fixture.png`;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=', 'base64');
  const upload = await a.c.storage.from('transient-inputs').upload(path, png, { contentType: 'image/png' });
  assert(!upload.error, 'owner storage upload'); files.push({ c: a.c, path });
  assert(!(await a.c.storage.from('transient-inputs').download(path)).error, 'owner storage download');
  assert((await b.c.storage.from('transient-inputs').download(path)).error, 'foreign storage download');
  assert((await client().storage.from('transient-inputs').download(path)).error, 'anon storage download');
  assert((await b.c.storage.from('transient-inputs').upload(`${a.id}/${tag}/spoof.png`, png, { contentType: 'image/png' })).error, 'foreign storage upload');
  assert((await a.c.storage.from('transient-inputs').update(path, png, { contentType: 'image/png' })).error, 'storage update denied');
  const deleteForeign = await b.c.storage.from('transient-inputs').remove([path]);
  assert(deleteForeign.error || (deleteForeign.data?.length ?? 0) === 0, 'foreign storage removal');
  assert(!(await a.c.storage.from('transient-inputs').download(path)).error, 'foreign removal preserved source');
  pass('real Storage upload/read, private access, folder isolation and no-upsert policy verified');
  const refreshed = await a.c.auth.refreshSession();
  assert(!refreshed.error && refreshed.data.session, 'refresh session');
  const invalid = createClient(url, publishable, { ...opts, global: { headers: { Authorization: 'Bearer invalid-token' } } });
  assert((await invalid.from('profiles').select('*')).error, 'invalid JWT rejection');
  pass('real session refresh works and invalid JWT is rejected');
  if (process.argv.includes('--api')) {
    const origin = process.env.WORLDSPEAK_API_ORIGIN ?? 'http://127.0.0.1:3101';
    const trustedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? origin;
    const jar = new Map();
    const ssr = createServerClient(url, publishable, { cookies: { getAll: () => [...jar].map(([name,value]) => ({ name,value })), setAll: pairs => pairs.forEach(({ name,value }) => jar.set(name,value)) } });
    const auth = await ssr.auth.signInWithPassword({ email: a.email, password: a.password });
    assert(!auth.error, 'SSR authenticated fixture');
    const cookie = () => [...jar].map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
    async function call(path, init = {}) { return fetch(origin+path, { ...init, redirect: 'manual', headers: { origin: trustedOrigin, cookie: cookie(), ...init.headers } }); }
    const guest = await fetch(origin+'/history', { redirect: 'manual' });
    assert([303,307].includes(guest.status) && guest.headers.get('location')?.includes('/sign-in'), 'protected guest route');
    const read = await call('/api/v1/profile'); assert(read.ok && read.headers.get('cache-control')?.includes('no-store'), 'authenticated API no-store');
    const csrf = await call('/api/v1/profile', { method:'PATCH', headers:{ origin:'https://evil.test','content-type':'application/json' },body:JSON.stringify({display_name:'bad'}) });
    assert(csrf.status === 403, 'cross-origin mutation');
    const spoof = await call('/api/v1/profile', { method:'PATCH', headers:{'content-type':'application/json'},body:JSON.stringify({display_name:'A',owner_id:b.id}) }); assert(spoof.status===400, 'unknown owner input HTTP '+spoof.status);
    const hs = await call('/api/v1/history/search?q='+encodeURIComponent('தண்ணீர்')); assert(hs.ok && (await hs.json()).data.rows.length>0,'authenticated API Tamil search');
    const badCursor=Buffer.from(JSON.stringify({createdAt:'x,owner_id.neq.null',id:randomUUID()})).toString('base64url');
    assert((await call('/api/v1/history/recent?cursor='+badCursor)).status===400,'cursor injection');
    const erase = await call('/api/v1/account?scope=content',{method:'DELETE',headers:{'x-worldspeak-confirm':'erase'}}); assert(erase.ok,'atomic API content erasure');
    pass('authenticated Next routes, private caching, CSRF, owner validation, Tamil search, cursor rejection and erasure');
    if (process.argv.includes('--browser')) {
      const { chromium } = require('playwright');
      browser = await chromium.launch({ headless:true });
      const context=await browser.newContext();
      await context.addInitScript({path:resolve(root,'apps/web/e2e/stub-speech.js')});
      const page=await context.newPage();
      await page.goto(origin+'/sign-in');
      await page.getByLabel('Email',{exact:true}).fill(a.email);
      await page.getByLabel('Password',{exact:true}).fill(a.password);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.waitForURL('**/history');
      await page.goto(origin+'/');
      await page.getByRole('button',{name:'Water',exact:true}).click();
      await page.getByRole('button',{name:'Save',exact:true}).click();
      await page.getByText('Saved to history.',{exact:true}).waitFor();
      await page.goto(origin+'/history');
      await page.getByRole('link',{name:'Open in composer'}).first().click();
      await page.locator('.preview-sentence').waitFor();
      const speechCalls=await page.evaluate(()=>window.__speakCalls);
      assert(Array.isArray(speechCalls)&&speechCalls.length===0,'live replay must not auto-speak');
      await page.goto(origin+'/settings');
      await page.getByRole('button',{name:'Sign out',exact:true}).click();
      await page.waitForURL(origin+'/');
      await page.goto(origin+'/history');
      await page.waitForURL('**/sign-in');
      await context.close();
      pass('real browser password sign-in, save, history replay without speech and sign-out');
    }
  }
  const bConv=await b.c.from('conversations').insert({owner_id:b.id,title:'B remains',language:'en'}).select().single();assert(!bConv.error,'B conversation');
  assert(!(await a.c.rpc('erase_my_saved_data',{reset_settings:true})).error,'account-data reset');
  assert((await a.c.from('conversations').select('*')).data.length===0,'all A content erased');
  assert((await b.c.from('conversations').select('*').eq('id',bConv.data.id)).data.length===1,'B content retained');
  assert((await a.c.from('accessibility_preferences').select('*').single()).data.high_contrast===false,'settings reset');
  pass('account-data erasure resets A while preserving B');
  if (process.argv.includes('--api')) {
    const origin=process.env.WORLDSPEAK_API_ORIGIN ?? 'http://127.0.0.1:3101';
    const jar=new Map();
    const ssr=createServerClient(url,publishable,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:pairs=>pairs.forEach(({name,value})=>jar.set(name,value))}});
    assert(!(await ssr.auth.signInWithPassword({email:b.email,password:b.password})).error,'deletion reauth fixture');
    const eraseIdentity=(password)=>fetch(origin+'/api/v1/account?scope=identity',{method:'DELETE',headers:{origin:process.env.NEXT_PUBLIC_APP_URL??origin,cookie:[...jar].map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('; '),'content-type':'application/json','x-worldspeak-confirm':'erase'},body:JSON.stringify({password})});
    assert((await eraseIdentity('wrong-test-password')).status===401,'wrong reauthentication must deny account removal');
    assert(!(await admin.auth.admin.getUserById(b.id)).error,'failed deletion preserved identity');
    const removed=await eraseIdentity(b.password);assert(removed.ok && (await removed.json()).data.authUserDeleted,'verified account removal');
    assert((await admin.auth.admin.getUserById(b.id)).error,'Auth identity gone');
    assert((await admin.from('profiles').select('*').eq('owner_id',b.id)).data.length===0,'account cascade removed profile');
    pass('account removal requires password reauthentication and cascades real Auth/data deletion');
  }
  const session=await a.c.auth.getSession();
  const oldRefresh=session.data.session.refresh_token;
  assert(!(await a.c.auth.signOut()).error,'signout');
  assert((await client().auth.refreshSession({refresh_token:oldRefresh})).error,'revoked refresh');
  pass('sign-out revokes the actual refresh token');
} catch (e) {
  failure=e instanceof Error ? e.message : 'Unknown hosted test failure';
  console.error('FAIL:',failure);
} finally {
  await browser?.close().catch(()=>{});
  for(const file of files){const res=await admin.storage.from('transient-inputs').remove([file.path]);if(res.error)failure??='synthetic Storage cleanup failed';}
  for(const id of created){const res=await admin.auth.admin.deleteUser(id);if(res.error && res.error.code!=='user_not_found')failure??='synthetic Auth cleanup failed';}
  const report={projectRef:expected,passCount:results.length,results,failure,publicSignup,cleanupUserCount:created.length,syntheticUserIds:created,syntheticObjectPaths:files.map(x=>x.path),mailDelivery:'not tested; signup confirmation uses official admin-generated token fixtures',googleOAuth:'not tested; provider credentials and interactive flow required',physicalDevice:'not tested',finishedAt:new Date().toISOString()};
  writeFileSync(resolve(root,'docs/evidence/hosted-phase2.json'),JSON.stringify(report,null,2)+'\n');
}
process.exitCode=failure?1:0;
