/* eslint-disable no-console -- synthetic local regression outcomes only */
import assert from "node:assert/strict";
import { createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";
import { InferenceResultSchema, JobViewSchema, type InferenceResult } from "@worldspeak/contracts";
import type { Lease } from "@worldspeak/inference";
import { makeStore } from "../src/store";

const host = process.env.PGHOST;
const database = process.env.PGDATABASE;
if (!host || !["localhost", "127.0.0.1", "::1"].includes(host) ||
    !database || !/^worldspeak_phase2(?:_[a-zA-Z0-9_]+)?$/.test(database) ||
    process.env.DATABASE_URL || process.env.PGSERVICE || process.env.PGSERVICEFILE)
  throw Error("Local named scratch DB only");
// No model, Storage or Auth HTTP is permitted by this driver-only suite.
globalThis.fetch = async () => { throw Error("HTTP forbidden in local driver regression"); };
const port = Number(process.env.PGPORT ?? 5432);
const sql = postgres({ host, port, database, username: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "", max: 2, prepare: false });
const owners = [randomUUID(), randomUUID()];
const owner = owners[0]!;
const role = "worldspeak_jsonb_" + randomUUID().replaceAll("-", "");
const password = randomBytes(32).toString("hex");
// Send only a SCRAM verifier in fixture DDL, never a plaintext password.
const salt = randomBytes(16);
const salted = pbkdf2Sync(password, salt, 4096, 32, "sha256");
const hmac = (text: string) => createHmac("sha256", salted).update(text).digest();
const verifier = `SCRAM-SHA-256$4096:${salt.toString("base64")}$${createHash("sha256").update(hmac("Client Key")).digest("base64")}:${hmac("Server Key").toString("base64")}`;
const connection = new URL("postgresql://localhost");
connection.hostname = host === "::1" ? "[::1]" : host;
connection.port = String(port);
connection.pathname = database;
connection.username = role;
connection.password = password;
let run: ReturnType<typeof makeStore> | undefined;
let roleCreated = false;
let passed = 0;
const box = { x1: 0.247, y1: 0.139, x2: 0.746, y2: 0.868 };
const result: InferenceResult = InferenceResultSchema.parse({
  detections: [
    { label: 'chair "demo" \\ தமிழ்', catalogId: null, box, mask: null, confidence: 0.99 },
    { label: "synthetic cup", catalogId: "water", box: { x1: 0.01, y1: 0.02, x2: 0.1, y2: 0.2 },
      mask: [{ x: 0.01, y: 0.02 }, { x: 0.1, y: 0.02 }, { x: 0.1, y: 0.2 }], confidence: null },
  ],
  tracks: [],
  provenance: { source: "fixture", model: "muse-spark-1.3", adapterVersion: "meta-v1",
    responseId: "synthetic-driver-round-trip", inputSha256: "a".repeat(64),
    inputTokens: 424, outputTokens: 911, costMicroUsd: 4402 },
  segmentationMasks: [{ objectId: "synthetic-mask", bounds: box, width: 2, height: 2, rasterBase64: "AAEBAA==" }],
});
async function check(name: string, test: () => Promise<void>) {
  await test(); passed++; console.log(`PASS result-driver: ${name}`);
}
async function user<T>(id: string, test: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claim.sub',${id},true)`;
    return test(tx);
  });
}
async function status(id: string) {
  const rows = await user(owner, tx => tx`select public.inference_job_status(${id}) as value`);
  return JobViewSchema.parse(rows[0]!.value);
}
async function stored(id: string) {
  const rows = await sql`select jsonb_typeof(result) as kind, result, result is null as sql_null,
    settled, actual_micro from public.inference_jobs where id=${id}`;
  return rows[0]!;
}
// Seed only local lease/reservation fixtures: no permits, authorization function,
// provider dispatch, Storage bytes or HTTP. Calls exercise the production store,
// never a copied/mocked finish implementation.
async function lease(asset: string, expired = false): Promise<Lease> {
  const id = randomUUID(), token = randomUUID();
  await sql.begin(async tx => {
    await tx`update world_inference.budgets set reserved_micro=reserved_micro+25000
      where account in ('global',${owner})`;
    await tx`insert into public.inference_jobs
      (id,owner_id,asset_id,operation,idempotency_key,input_hash,status,reserved_micro,
       lease_token,lease_until,dispatched_at)
      values(${id},${owner},${asset},'scene',${randomUUID()},${"b".repeat(64)},'dispatching',25000,
       ${token},now()+(${expired ? -1 : 300} * interval '1 second'),now())`;
    await tx`insert into world_inference.credit_events(job_id,event,amount_micro) values(${id},'reserve',25000)`;
  });
  return { id, leaseToken: token, operation: "scene", concept: null };
}
async function spent() {
  return String((await sql`select spent_micro from world_inference.budgets where account='global'`)[0]!.spent_micro);
}
try {
  await sql.unsafe(`create role "${role}" login inherit password '${verifier}'`);
  roleCreated = true;
  await sql.unsafe(`grant worldspeak_inference_worker to "${role}"`);
  run = makeStore({ databaseUrl: connection.toString(),
    supabaseUrl: "https://cafkyowssdemzivhzxbb.supabase.co", storageKey: "local-driver-no-storage-access" });
  for (const id of owners)
    await sql`insert into auth.users(id,email) values(${id},${"jsonb-" + id + "@example.test"})`;
  await sql`insert into world_inference.budgets(account) values(${owner})`;
  const media = await user(owner, tx => tx`select public.create_inference_media(${"a".repeat(64)},32,32,100,'scene-v1') as value`);
  const asset = media[0]!.value.id as string;
  await sql`select world_inference.media_ready(${asset})`;

  await check("pinned driver reproduces legacy double encoding; sql.json encodes one object", async () => {
    const legacy = (await sql`select jsonb_typeof(${JSON.stringify(result)}::jsonb) as kind,
      ${JSON.stringify(result)}::jsonb as result`)[0]!;
    assert.equal(legacy.kind, "string");
    assert.equal(typeof legacy.result, "string");
    assert.equal(InferenceResultSchema.safeParse(legacy.result).success, false);
    const typed = (await sql`select jsonb_typeof(${sql.json(result)}::jsonb) as kind,
      ${sql.json(result)}::jsonb as result`)[0]!;
    assert.equal(typed.kind, "object");
    assert.deepEqual(typed.result, result);
  });
  await check("production store preserves object, nested fields, numeric usage and owner RPC schema", async () => {
    const l = await lease(asset);
    assert.equal(await run!.store.finish(l,"succeeded",4402,result,null), true);
    const row = await stored(l.id);
    assert.equal(row.kind, "object");
    assert.deepEqual(row.result, result);
    const view = await status(l.id);
    assert.equal(view.status, "succeeded");
    assert.equal(view.billingState, "settled");
    assert.equal(view.chargedMicroUsd, 4402);
    assert.deepEqual(view.result, result);
    assert.equal(typeof view.result!.provenance.inputTokens, "number");
    assert.equal(typeof view.result!.provenance.outputTokens, "number");
    assert.equal(typeof view.result!.provenance.costMicroUsd, "number");
    assert.deepEqual(view.result!.detections[0]!.box, box);
    const foreign = await user(owners[1]!, tx => tx`select public.inference_job_status(${l.id}) as value`);
    assert.equal(foreign[0]!.value, null);
  });
  await check("failed outcomes retain SQL NULL, with null or supplied result", async () => {
    for (const payload of [null, result]) {
      const l = await lease(asset);
      assert.equal(await run!.store.finish(l,"failed",0,payload,"SYNTHETIC_FAILURE"), true);
      const row = await stored(l.id);
      assert.equal(row.sql_null, true);
      assert.equal(row.kind, null);
      const view = await status(l.id);
      assert.equal(view.status, "failed");
      assert.equal(view.result, null);
      assert.equal(view.errorCode, "SYNTHETIC_FAILURE");
      assert.equal(view.chargedMicroUsd, 0);
    }
  });
  await check("cancellation fences late structured output but settles known usage", async () => {
    const l = await lease(asset);
    await user(owner, tx => tx`select public.cancel_inference_job(${l.id})`);
    assert.equal(await run!.store.finish(l,"succeeded",4402,result,null), true);
    assert.equal((await stored(l.id)).sql_null, true);
    const view = await status(l.id);
    assert.equal(view.status, "canceled");
    assert.equal(view.cancelRequested, true);
    assert.equal(view.result, null);
    assert.equal(view.chargedMicroUsd, 4402);
  });
  await check("wrong, expired and finalized leases cannot write or charge twice", async () => {
    const l = await lease(asset), before = await spent();
    assert.equal(await run!.store.finish({...l,leaseToken:randomUUID()},"succeeded",4402,result,null), false);
    assert.equal((await stored(l.id)).sql_null, true);
    assert.equal((await stored(l.id)).settled, false);
    assert.equal(await spent(), before);
    assert.equal(await run!.store.finish(l,"succeeded",4402,result,null), true);
    const after = await spent();
    assert.equal(await run!.store.finish(l,"succeeded",1,{...result,detections:[]},null), false);
    assert.equal(await spent(), after);
    assert.deepEqual((await status(l.id)).result, result);
    const expired = await lease(asset,true);
    assert.equal(await run!.store.finish(expired,"succeeded",4402,result,null), false);
    assert.equal((await stored(expired.id)).sql_null, true);
    assert.equal((await stored(expired.id)).settled, false);
    assert.equal(await spent(), after);
  });
  console.log(`RESULT DRIVER DATABASE: ${passed} scenario groups passed; real Postgres.js, zero HTTP/model/hosted calls.`);
} catch (error) {
  // Driver errors can carry connection/query parameters; never dump those.
  console.error(error instanceof assert.AssertionError ? error.message :
    `Local driver regression failed (${(error as {code?:string}).code ?? "error"}); connection/query values suppressed.`);
  process.exitCode = 1;
} finally {
  await run?.close();
  for (const id of owners) await sql`delete from auth.users where id=${id}`;
  if (roleCreated) await sql.unsafe(`drop role "${role}"`);
  await sql.end({ timeout: 5 });
}
