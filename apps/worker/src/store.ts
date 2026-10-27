import postgres from "postgres";
import {
  workerDatabaseOptions,
  assertWorldSpeakStorageUrl,
  WORKER_CAPABILITY_SQL,
} from "@worldspeak/inference";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { InferenceResult } from "@worldspeak/contracts";
import {
  type WorkerStore,
  type Lease,
  type ImageInput,
  ProviderError,
} from "@worldspeak/inference";
const Claim = z.object({
  id: z.string().uuid(),
  lease_token: z.string().uuid(),
  operation: z.enum(["scene", "segment"]),
  concept: z.string().nullable(),
});
const Media = z.object({
  path: z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.png$/),
  sha256: z.string(),
  width: z.number().int().min(1).max(512),
  height: z.number().int().min(1).max(512),
  bytes: z.number().int().max(1048576),
});
const Cleanup = z.object({
  asset_id: z.string().uuid(),
  path: Media.shape.path,
  lease_token: z.string().uuid(),
});
/** Dedicated DB login inheriting worldspeak_inference_worker; no table grants. */
export function makeStore(config: {
  databaseUrl: string;
  supabaseUrl: string;
  storageKey: string;
  dispatchMode?: "legacy" | "sam-only";
}) {
  const connection = workerDatabaseOptions(config.databaseUrl);
  assertWorldSpeakStorageUrl(config.supabaseUrl);
  const sql = postgres(connection.url, {
    ssl: connection.ssl,
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });
  const storage = createClient(config.supabaseUrl, config.storageKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
    },
  }).storage.from("world-inference");
  async function scalar(
    query: PromiseLike<postgres.RowList<postgres.Row[]>>,
  ): Promise<unknown> {
    const rows = await query;
    return rows[0]?.value ?? null;
  }
  let verified = false;
  async function ensureWorker() {
    if (verified) return;
    const rows = await sql.unsafe(WORKER_CAPABILITY_SQL);
    if (rows[0]?.allowed !== true)
      throw Error("A least-privilege inference worker login is required");
    if (config.dispatchMode === "sam-only") {
      const checks = await sql`select
        not has_function_privilege(current_user,'world_inference.authorize_sam_test(uuid,text,text,bigint,text,timestamptz)','execute')
        and not has_function_privilege(current_user,'world_inference.deactivate_sam_test()','execute')
        and not has_table_privilege(current_user,'world_inference.sam_test_authorizations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        and not has_table_privilege(current_user,'world_inference.sam_test_events','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed`;
      if (checks[0]?.allowed !== true) throw Error("A least-privilege SAM worker login is required");
    }
    verified = true;
  }
  const store: WorkerStore = {
    async claim() {
      await ensureWorker();
      const raw = await scalar(config.dispatchMode === "sam-only"
        ? sql`select world_inference.claim_sam_test() as value`
        : sql`select world_inference.claim() as value`);
      if (!raw) return null;
      const j = Claim.parse(raw);
      return {
        id: j.id,
        leaseToken: j.lease_token,
        operation: j.operation,
        concept: j.concept,
      };
    },
    async load(l: Lease): Promise<ImageInput> {
      const m = Media.parse(
        await scalar(
          sql`select world_inference.load_input(${l.id},${l.leaseToken}) as value`,
        ),
      );
      const { data, error } = await storage.download(m.path);
      if (error || !data || data.size !== m.bytes)
        throw new ProviderError("MEDIA_UNAVAILABLE", 0);
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        sha256: m.sha256,
        width: m.width,
        height: m.height,
      };
    },
    async heartbeat(l) {
      return (
        (await scalar(
          sql`select world_inference.heartbeat(${l.id},${l.leaseToken}) as value`,
        )) === true
      );
    },
    async dispatch(l) {
      return Boolean(
        await scalar(
          config.dispatchMode === "sam-only"
            ? sql`select world_inference.dispatch_sam_test(${l.id},${l.leaseToken}) as value`
            : sql`select world_inference.dispatch(${l.id},${l.leaseToken}) as value`,
        ),
      );
    },
    async finish(l, outcome, cost, result: InferenceResult | null, error) {
      // The driver serializes JSONB parameters; do not pre-stringify the object.
      return (
        (await scalar(
          config.dispatchMode === "sam-only"
            ? sql`select world_inference.finish_sam_test(${l.id},${l.leaseToken},${outcome},${cost},${result === null ? null : sql.json(result)}::jsonb,${error}) as value`
            : sql`select world_inference.finish(${l.id},${l.leaseToken},${outcome},${cost},${result === null ? null : sql.json(result)}::jsonb,${error}) as value`,
        )) === true
      );
    },
  };
  return {
    store,
    close: () => sql.end({ timeout: 5 }),
    async cleanupOnce() {
      await ensureWorker();
      await sql`select world_inference.sweep()`;
      const raw = await scalar(
        sql`select world_inference.claim_cleanup() as value`,
      );
      if (!raw) return false;
      const c = Cleanup.parse(raw);
      // Storage API remove is idempotent. Never delete storage.objects rows.
      const { error } = await storage.remove([c.path]);
      const acknowledged = await scalar(
        sql`select world_inference.finish_cleanup(${c.asset_id},${c.lease_token},${!error}) as value`,
      );
      if (error || acknowledged !== true)
        throw Error("Cleanup did not complete; retain durable retry state");
      return true;
    },
  };
}
