import postgres from "postgres";
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
}) {
  const sql = postgres(config.databaseUrl, {
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
  const store: WorkerStore = {
    async claim() {
      const raw = await scalar(sql`select world_inference.claim() as value`);
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
          sql`select world_inference.dispatch(${l.id},${l.leaseToken}) as value`,
        ),
      );
    },
    async finish(l, outcome, cost, result: InferenceResult | null, error) {
      return (
        (await scalar(
          sql`select world_inference.finish(${l.id},${l.leaseToken},${outcome},${cost},${result ? JSON.stringify(result) : null}::jsonb,${error}) as value`,
        )) === true
      );
    },
  };
  return {
    store,
    close: () => sql.end({ timeout: 5 }),
    async cleanupOnce() {
      await sql`select world_inference.sweep()`;
      const raw = await scalar(
        sql`select world_inference.claim_cleanup() as value`,
      );
      if (!raw) return false;
      const c = Cleanup.parse(raw);
      // Storage API remove is idempotent. Never delete storage.objects rows.
      const { error } = await storage.remove([c.path]);
      await sql`select world_inference.finish_cleanup(${c.asset_id},${c.lease_token},${!error})`;
      return true;
    },
  };
}
