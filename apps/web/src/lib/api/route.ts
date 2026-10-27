import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@worldspeak/db";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, verifiedOwnerId } from "@/lib/supabase/server";
import { apiError } from "./validation";
import { isSameOriginMutation } from "@/lib/auth-security";

/** Envelope: { ok: true, requestId, data }. Errors use the contract shape. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, requestId: crypto.randomUUID(), data }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function fail(
  code: Parameters<typeof apiError>[1],
  messageKey: string,
  status: number,
) {
  return NextResponse.json(apiError(crypto.randomUUID(), code, messageKey), { status, headers: { "Cache-Control": "private, no-store" } });
}

export interface Authed {
  owner: string;
  supabase: SupabaseClient<Database>;
}

/**
 * Single auth boundary for mutations and reads. Owner comes only from the
 * verified server session — client JSON can never supply it.
 */
export async function requireOwner(request: Request): Promise<{ ok: true; ctx: Authed } | { ok: false; res: NextResponse }> {
  if (!isSameOriginMutation(request)) {
    return { ok: false, res: fail("INVALID_INPUT", "request.origin_denied", 403) };
  }
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

/** Bound streaming JSON before parsing; never log request payloads. */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("Missing JSON body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new Error("JSON too large"); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}
