import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, verifiedOwnerId } from "@/lib/supabase/server";
import { apiError } from "./validation";

/** Envelope: { ok: true, requestId, data }. Errors use the contract shape. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, requestId: crypto.randomUUID(), data }, { status });
}

export function fail(
  code: Parameters<typeof apiError>[1],
  messageKey: string,
  status: number,
) {
  return NextResponse.json(apiError(crypto.randomUUID(), code, messageKey), { status });
}

export interface Authed {
  owner: string;
  // Loosely typed: generated DB types arrive at the cloud gate (packages/db).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}

/**
 * Single auth boundary for mutations and reads. Owner comes only from the
 * verified server session — client JSON can never supply it.
 */
export async function requireOwner(): Promise<{ ok: true; ctx: Authed } | { ok: false; res: NextResponse }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, res: fail("PROVIDER_UNAVAILABLE", "supabase.not_configured", 503) };
  }
  const owner = await verifiedOwnerId().catch(() => null);
  if (!owner) return { ok: false, res: fail("UNAUTHENTICATED", "auth.required", 401) };
  try {
    const supabase = await createClient();
    return { ok: true, ctx: { owner, supabase } };
  } catch {
    return { ok: false, res: fail("PROVIDER_UNAVAILABLE", "supabase.not_configured", 503) };
  }
}
