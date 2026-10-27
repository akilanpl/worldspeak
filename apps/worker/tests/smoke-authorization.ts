/* eslint-disable no-console -- synthetic local-only scenario summaries */
import postgres from "postgres";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const host = process.env.PGHOST,
  db = process.env.PGDATABASE;
if (
  !host ||
  !["localhost", "127.0.0.1", "::1"].includes(host) ||
  !db ||
  !/^worldspeak_phase2(?:_[a-zA-Z0-9_]+)?$/.test(db) ||
  process.env.DATABASE_URL ||
  process.env.PGSERVICE
)
  throw Error("Local scratch only");
const sql = postgres({
  host,
  port: Number(process.env.PGPORT ?? 5432),
  database: db,
  username: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "",
  max: 3,
  prepare: false,
});
const a = randomUUID(),
  b = randomUUID();
let passed = 0;
async function rejected(
  name: string,
  prepare: (t: postgres.TransactionSql) => Promise<unknown>,
  message: RegExp,
) {
  await assert.rejects(
    sql.begin(async (t) => {
      await prepare(t);
      await t`select world_inference.authorize_first_smoke(${a})`;
    }),
    message,
  );
  passed++;
  console.log("PASS smoke-authorization: " + name);
}
try {
  for (const id of [a, b])
    await sql`insert into auth.users(id,email) values(${id},${"smoke-" + id + "@example.test"})`;
  await rejected(
    "worker cannot authorize",
    async (t) => {
      await t`set local role worldspeak_inference_worker`;
    },
    /permission denied/,
  );
  await rejected(
    "designated user accounting cannot be reset",
    (t) =>
      t`insert into world_inference.budgets(account,spent_micro) values(${a},1)`,
    /SMOKE_OWNER_NOT_PRISTINE/,
  );
  await rejected(
    "other funded accounts stop activation",
    (t) =>
      t`insert into world_inference.budgets(account,limit_micro) values(${b},1)`,
    /SMOKE_OTHER_ACCOUNT_NOT_ZERO/,
  );
  await rejected(
    "global prior spending stops activation",
    (t) =>
      t`update world_inference.budgets set spent_micro=1 where account='global'`,
    /SMOKE_GLOBAL_NOT_PRISTINE/,
  );
  await rejected(
    "missing operation scope stops activation",
    (t) =>
      t`delete from world_inference.generation_permits where operation='segment'`,
    /SMOKE_PERMITS_NOT_PRISTINE/,
  );
  await rejected(
    "prior accounting receipts survive missing jobs",
    (t) =>
      t`insert into world_inference.credit_events(job_id,event,amount_micro) values(${randomUUID()},'reserve',0)`,
    /SMOKE_ALREADY_USED/,
  );
  await rejected(
    "prior dispatch rejects setup even without a surviving credit receipt",
    async (t) => {
      await t`select set_config('request.jwt.claim.sub',${a},true)`;
      const row =
        await t`select public.create_inference_media(${"a".repeat(64)},5,5,100,'scene-v1') as v`;
      const asset = row[0]!.v.id;
      await t`insert into public.inference_jobs(owner_id,asset_id,operation,idempotency_key,input_hash,reserved_micro,dispatched_at,status) values(${a},${asset},'scene',${randomUUID()},${"b".repeat(64)},25000,now(),'dispatching')`;
    },
    /SMOKE_ALREADY_USED/,
  );
  await rejected(
    "consumed marker is not treated as a fresh zero permit",
    (t) =>
      t`update world_inference.generation_permits set owner_id=${a},armed_at=now(),consumed_at=now() where operation='scene'`,
    /SMOKE_PERMITS_NOT_PRISTINE/,
  );
  const race = await Promise.allSettled([
    sql`select world_inference.authorize_first_smoke(${a})`,
    sql`select world_inference.authorize_first_smoke(${b})`,
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  const authorization = (
    await sql`select owner_id from world_inference.smoke_authorizations`
  )[0]!;
  const owner = String(authorization.owner_id);
  const permits =
    await sql`select operation,owner_id,remaining from world_inference.generation_permits order by operation`;
  assert.deepEqual(
    permits.map((p) => p.operation),
    ["scene", "segment"],
  );
  assert.ok(permits.every((p) => p.owner_id === owner && p.remaining === 1));
  assert.equal(
    Number(
      (
        await sql`select limit_micro from world_inference.budgets where account='global'`
      )[0]!.limit_micro,
    ),
    50000,
  );
  passed++;
  console.log(
    "PASS smoke-authorization: concurrent activation is atomic and bound to one owner",
  );
  await sql`update world_inference.generation_permits set remaining=0,consumed_at=now()`;
  await sql`delete from auth.users where id=${owner}`;
  const survivor = owner === a ? b : a;
  await assert.rejects(
    sql`select world_inference.authorize_first_smoke(${survivor})`,
    /SMOKE_ALREADY_USED/,
  );
  assert.equal(
    (
      await sql`select count(*) as n from world_inference.generation_permits where remaining<>0`
    )[0]!.n,
    "0",
  );
  passed++;
  console.log(
    "PASS smoke-authorization: consumed permits cannot rearm after identity/history deletion",
  );
  console.log(
    `SMOKE AUTHORIZATION: ${passed} scenario groups passed; local only, zero model calls.`,
  );
} finally {
  for (const id of [a, b]) await sql`delete from auth.users where id=${id}`;
  // Explicit synthetic fixture teardown, never executable against a hosted DB.
  await sql`delete from world_inference.smoke_authorizations`;
  await sql`update world_inference.generation_permits set remaining=0,owner_id=null,armed_at=null,consumed_at=null`;
  await sql`update world_inference.budgets set limit_micro=0 where account='global'`;
  await sql.end({ timeout: 5 });
}
