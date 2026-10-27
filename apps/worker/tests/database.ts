/* eslint-disable no-console -- aggregate synthetic test outcomes only */
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
  throw Error("Local named scratch DB only");
const sql = postgres({
  host,
  port: Number(process.env.PGPORT ?? 5432),
  database: db,
  username: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "",
  max: 12,
  prepare: false,
});
const users = [randomUUID(), randomUUID(), randomUUID()],
  a = users[0]!,
  b = users[1]!;
let passed = 0;
async function check(name: string, f: () => Promise<void>) {
  await f();
  passed++;
  console.log(`PASS inference-db: ${name}`);
}
async function user<T>(
  u: string,
  f: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claim.sub',${u},true)`;
    return f(tx);
  });
}
async function worker<T>(f: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx`set local role worldspeak_inference_worker`;
    return f(tx);
  });
}
async function asset(u: string) {
  const r = await user(
    u,
    (t) =>
      t`select public.create_inference_media(${"a".repeat(64)},32,32,100,'scene-v1') as v`,
  );
  const id = r[0]!.v.id as string;
  await worker((t) => t`select world_inference.media_ready(${id})`);
  return id;
}
async function submit(
  u: string,
  id: string,
  key = randomUUID(),
  op = "scene",
  concept: string | null = null,
) {
  const r = await user(
    u,
    (t) =>
      t`select public.submit_inference_job(${id},${op},${key},${concept}) as id`,
  );
  return r[0]!.id as string;
}
async function cancel(u: string, id: string) {
  await user(u, (t) => t`select public.cancel_inference_job(${id})`);
}
async function claim() {
  const r = await worker((t) => t`select world_inference.claim() as v`);
  return r[0]!.v as {
    id: string;
    lease_token: string;
    attempt_count: number;
  } | null;
}
async function dispatch(j: { id: string; lease_token: string }) {
  return (
    await worker(
      (t) => t`select world_inference.dispatch(${j.id},${j.lease_token}) as v`,
    )
  )[0]!.v;
}
async function finish(
  j: { id: string; lease_token: string },
  outcome = "succeeded",
  cost: number | null = 100,
) {
  return (
    await worker(
      (t) =>
        t`select world_inference.finish(${j.id},${j.lease_token},${outcome},${cost},${JSON.stringify({ detections: [] })}::jsonb,null) as v`,
    )
  )[0]!.v;
}
async function status(u: string, id: string) {
  return (
    await user(u, (t) => t`select public.inference_job_status(${id}) as v`)
  )[0]!.v;
}
async function config(global = 1000000) {
  await sql`update world_inference.budgets set limit_micro=${global}`;
  for (const u of users)
    await sql`insert into world_inference.budgets(account,limit_micro) values(${u},1000000) on conflict(account) do update set limit_micro=1000000`;
  await sql`update world_inference.generation_permits set remaining=1,owner_id=${a},armed_at=now(),consumed_at=null`;
}
async function reserved() {
  return Number(
    (
      await sql`select reserved_micro from world_inference.budgets where account='global'`
    )[0]!.reserved_micro,
  );
}
try {
  for (const id of users)
    await sql`insert into auth.users(id,email) values(${id},${"inference-" + id + "@example.test"})`;
  const aa = await asset(a),
    bb = await asset(b);
  await check(
    "zero default budget, bad consent, spoof and private worker denial",
    async () => {
      await assert.rejects(submit(a, aa), /BUDGET_EXCEEDED/);
      await assert.rejects(
        user(
          a,
          (t) =>
            t`select public.create_inference_media(${"a".repeat(64)},32,32,100,'unknown')`,
        ),
        /CONSENT_REQUIRED/,
      );
      await assert.rejects(
        user(a, (t) => t`select world_inference.claim()`),
        /permission denied/,
      );
      await assert.rejects(
        user(
          a,
          (t) =>
            t`insert into public.inference_jobs(owner_id,asset_id) values(${b},${bb})`,
        ),
        /permission denied/,
      );
    },
  );
  await config();
  await check(
    "concurrent duplicate requests reserve once, conflicting payload rejects",
    async () => {
      const key = randomUUID();
      const ids = await Promise.all(
        Array.from({ length: 8 }, () => submit(a, aa, key)),
      );
      assert.equal(new Set(ids).size, 1);
      assert.equal(await reserved(), 25000);
      await assert.rejects(submit(a, bb, key), /IDEMPOTENCY_CONFLICT/);
      assert.equal(await status(b, ids[0]!), null);
      const rows = await user(
        b,
        (t) => t`select id from public.inference_jobs where id=${ids[0]!}`,
      );
      assert.equal(rows.length, 0);
      await assert.rejects(
        user(a, (t) => t`select lease_token from public.inference_jobs`),
        /permission denied/,
      );
      await cancel(a, ids[0]!);
      await cancel(a, ids[0]!);
      assert.equal(await reserved(), 0);
    },
  );
  await check("concurrent global reservation cannot overspend", async () => {
    await config(25000);
    const rs = await Promise.allSettled([submit(a, aa), submit(b, bb)]);
    assert.equal(rs.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await reserved(), 25000);
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i]!;
      if (r.status === "fulfilled") await cancel(users[i]!, r.value);
    }
    assert.equal(await reserved(), 0);
    await config();
  });
  await check("foreign media rejected; one active job per user", async () => {
    await assert.rejects(submit(b, aa), /CONSENT_REQUIRED/);
    const id = await submit(a, aa);
    await assert.rejects(submit(a, aa), /RATE_LIMITED/);
    await cancel(a, id);
  });
  await check(
    "permits bind owner even if another account is accidentally funded",
    async () => {
      const id = await submit(b, bb);
      assert.equal(await claim(), null);
      await cancel(b, id);
      assert.equal(await reserved(), 0);
    },
  );
  await check(
    "lease restart safe, stale tokens fenced, bounded pre-send attempts",
    async () => {
      const id = await submit(a, aa);
      const first = await claim();
      assert.equal(first?.id, id);
      await sql`update public.inference_jobs set lease_until=now()-interval '1 second' where id=${id}`;
      const second = await claim();
      assert.equal(second?.attempt_count, 2);
      assert.notEqual(first!.lease_token, second!.lease_token);
      assert.equal(await finish(first!), false);
      await sql`update public.inference_jobs set lease_until=now()-interval '1 second' where id=${id}`;
      const third = await claim();
      assert.equal(third?.attempt_count, 3);
      await sql`update public.inference_jobs set lease_until=now()-interval '1 second' where id=${id}`;
      assert.equal(await claim(), null);
      assert.equal((await status(a, id)).status, "failed");
      assert.equal(await reserved(), 0);
    },
  );
  await check(
    "post-dispatch lease expiry is uncertain, never re-claimed, holds funds",
    async () => {
      await config();
      const id = await submit(a, aa);
      const j = (await claim())!;
      assert.ok(await dispatch(j));
      await sql`update public.inference_jobs set lease_until=now()-interval '1 second' where id=${id}`;
      assert.equal(await claim(), null);
      assert.equal((await status(a, id)).status, "uncertain");
      assert.equal(await reserved(), 25000);
      assert.equal(await finish(j), false);
      await cancel(a, id);
      assert.equal((await status(a, id)).status, "uncertain");
      await sql`select world_inference.reconcile(${id},1000)`;
      assert.equal(await reserved(), 0);
    },
  );
  await check(
    "cancellation suppresses late output but settles actual cost",
    async () => {
      await config();
      const id = await submit(a, aa),
        j = (await claim())!;
      await dispatch(j);
      await cancel(a, id);
      assert.equal(await finish(j, "succeeded", 300), true);
      const v = await status(a, id);
      assert.equal(v.status, "canceled");
      assert.equal(v.result, null);
      assert.equal(await reserved(), 0);
      assert.equal(await finish(j), false);
    },
  );
  await check(
    "one-shot generation permit prevents second dispatch across restart",
    async () => {
      await config();
      await submit(a, aa);
      const j = (await claim())!;
      assert.ok(await dispatch(j));
      await finish(j);
      const next = await submit(a, aa);
      assert.equal(await claim(), null);
      await cancel(a, next);
    },
  );
  await check(
    "consent revoke atomically cancels and removes access",
    async () => {
      await config();
      const id = await submit(a, aa);
      await user(a, (t) => t`select public.revoke_inference_media(${aa})`);
      assert.equal((await status(a, id)).status, "canceled");
      assert.equal(await reserved(), 0);
      await assert.rejects(submit(a, aa), /CONSENT_REQUIRED/);
      assert.equal(
        (
          await user(
            a,
            (t) => t`select id from public.inference_media where id=${aa}`,
          )
        ).length,
        0,
      );
    },
  );
  await check(
    "append-only global revoke and data reset also stop jobs",
    async () => {
      await config();
      const id = await submit(b, bb);
      await user(
        b,
        (t) =>
          t`insert into public.consent_events(owner_id,scope,decision,notice_version) values(${b},'scene_upload','revoke','scene-v1')`,
      );
      assert.equal((await status(b, id)).status, "canceled");
      const cc = await asset(b),
        next = await submit(b, cc);
      await user(b, (t) => t`select public.erase_my_saved_data(true)`);
      assert.equal((await status(b, next)).status, "canceled");
    },
  );
  await check(
    "expiry hides media; cleanup lease survives crashed worker, stale completion rejected",
    async () => {
      await sql`update world_inference.cleanup set due_at=now()-interval '1 second' where asset_id=${aa}`;
      let r = await worker(
        (t) => t`select world_inference.claim_cleanup() as v`,
      );
      const c = r[0]!.v;
      assert.ok(c);
      await sql`update world_inference.cleanup set lease_until=now()-interval '1 second' where asset_id=${c.asset_id}`;
      r = await worker((t) => t`select world_inference.claim_cleanup() as v`);
      const recovered = r[0]!.v;
      assert.equal(recovered.asset_id, c.asset_id);
      assert.notEqual(recovered.lease_token, c.lease_token);
      assert.equal(
        (
          await worker(
            (t) =>
              t`select world_inference.finish_cleanup(${c.asset_id},${c.lease_token},true) as v`,
          )
        )[0]!.v,
        false,
      );
      assert.equal(
        (
          await worker(
            (t) =>
              t`select world_inference.finish_cleanup(${recovered.asset_id},${recovered.lease_token},true) as v`,
          )
        )[0]!.v,
        true,
      );
      const exp = await asset(a);
      await sql`update public.inference_media set expires_at=now()-interval '1 second' where id=${exp}`;
      await assert.rejects(submit(a, exp), /CONSENT_REQUIRED/);
    },
  );
  await check(
    "Auth deletion retains durable cleanup and conservatively accounts unknown spend",
    async () => {
      await config();
      const x = await asset(a),
        id = await submit(a, x),
        j = (await claim())!;
      await dispatch(j);
      await sql`delete from auth.users where id=${a}`;
      assert.equal(await reserved(), 0);
      assert.ok(
        (
          await sql`select asset_id from world_inference.cleanup where asset_id=${x}`
        ).length,
      );
      assert.equal(
        (await sql`select id from public.inference_jobs where id=${id}`).length,
        0,
      );
    },
  );
  await check(
    "cleanup failure is durable and bounded; successful tombstones are rechecked",
    async () => {
      const x = randomUUID(),
        path = `${a}/${x}.png`;
      await sql`insert into world_inference.cleanup(asset_id,path,due_at,attempts) values(${x},${path},now()-interval '1 second',10)`;
      await worker((t) => t`select world_inference.claim_cleanup()`);
      assert.equal(
        (
          await sql`select status from world_inference.cleanup where asset_id=${x}`
        )[0]!.status,
        "blocked",
      );
    },
  );
  await check(
    "anonymous RPC denied; no client bucket access; definer grants restricted",
    async () => {
      await assert.rejects(
        sql.begin(async (t) => {
          await t`set local role anon`;
          return t`select public.inference_job_status(${randomUUID()})`;
        }),
        /permission denied/,
      );
      const objectId = randomUUID();
      await sql`insert into storage.objects(id,bucket_id,name,owner) values(${objectId},'world-inference',${b + "/synthetic.png"},${b})`;
      assert.equal(
        (
          await user(
            b,
            (t) => t`select id from storage.objects where id=${objectId}`,
          )
        ).length,
        0,
      );
      await assert.rejects(
        user(
          b,
          (t) =>
            t`insert into storage.objects(bucket_id,name,owner) values('world-inference',${b + "/spoof.png"},${b})`,
        ),
        /row-level security/,
      );
      assert.equal(
        (
          await user(
            b,
            (t) =>
              t`delete from storage.objects where id=${objectId} returning id`,
          )
        ).length,
        0,
      );
      await sql`delete from storage.objects where id=${objectId}`;
      const policies =
        await sql`select policyname from pg_policies where schemaname='storage' and tablename='objects' and qual like '%world-inference%'`;
      assert.equal(policies.length, 0);
      assert.equal(
        (
          await sql`select has_function_privilege('authenticated','world_inference.dispatch(uuid,uuid)','execute') as ok`
        )[0]!.ok,
        false,
      );
    },
  );
  await check(
    "credit receipts reconstruct held funds and settled global spend",
    async () => {
      const rows =
        await sql`select (select coalesce(sum(amount_micro),0) from world_inference.credit_events where event='settle') as spent, (select spent_micro from world_inference.budgets where account='global') as counter`;
      assert.equal(String(rows[0]!.spent), String(rows[0]!.counter));
      assert.equal(await reserved(), 0);
    },
  );
  console.log(
    `INFERENCE DATABASE: ${passed} scenario groups passed; no model/hosted calls.`,
  );
} finally {
  for (const id of users) await sql`delete from auth.users where id=${id}`;
  await sql.end({ timeout: 5 });
}
