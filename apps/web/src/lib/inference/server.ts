import "server-only";
import postgres from "postgres";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InferenceDatabase } from "@worldspeak/db";
import { JobViewSchema } from "@worldspeak/contracts";
import type { Authed } from "@/lib/api/route";
import { fail } from "@/lib/api/route";
export const inferenceClient = (ctx: Authed) =>
  ctx.supabase as unknown as SupabaseClient<InferenceDatabase>;
export const assetResponse = z.object({
  id: z.string().uuid(),
  path: z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.png$/),
  expiresAt: z.string(),
});
export const parseJob = JobViewSchema.parse;
export function inferenceError(error: unknown) {
  const message = (error as { message?: string } | null)?.message ?? "";
  if (message.includes("BUDGET_EXCEEDED"))
    return fail("BUDGET_EXCEEDED", "inference.budget_exceeded", 402);
  if (message.includes("RATE_LIMITED"))
    return fail("RATE_LIMITED", "inference.one_active_job", 429);
  if (message.includes("IDEMPOTENCY_CONFLICT"))
    return fail("INVALID_INPUT", "inference.idempotency_conflict", 409);
  if (message.includes("CONSENT_REQUIRED"))
    return fail("CONSENT_REQUIRED", "inference.consent_or_media_expired", 409);
  return fail("PROVIDER_UNAVAILABLE", "inference.unavailable", 503);
}
export function inferenceConfigured() {
  return (
    process.env.WORLDSPEAK_INFERENCE_API_ENABLED === "true" &&
    Boolean(process.env.INFERENCE_DATABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
export async function markMediaReady(id: string): Promise<boolean> {
  const url = process.env.INFERENCE_DATABASE_URL;
  if (!url) return false;
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const rows = await sql`select world_inference.media_ready(${id}) as ready`;
    return rows[0]?.ready === true;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createInferenceStorage(): Promise<
  ReturnType<SupabaseClient["storage"]["from"]>
> {
  const { createClient } = await import("@supabase/supabase-js");
  const { supabaseUrl } = await import("@/lib/supabase/env");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY,
    url = supabaseUrl();
  if (!key || !url) throw Error("Unavailable");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
    },
  }).storage.from("world-inference");
}
