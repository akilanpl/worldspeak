import type { ProfileRow } from "@worldspeak/db";
import { ProfilePatchSchema } from "@/lib/api/validation";
import { fail, ok, readJson, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { data, error } = await supabase.from("profiles").select("*").eq("owner_id", owner).maybeSingle();
  if (error) return fail("INVALID_INPUT", "profile.read_failed", 500);
  if (!data) {
    // Provisioning trigger should have created this; backfill defensively.
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({ owner_id: owner })
      .select()
      .single();
    if (insertError) return fail("INVALID_INPUT", "profile.read_failed", 500);
    return ok(created as ProfileRow);
  }
  return ok(data as ProfileRow);
}

export async function PATCH(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return fail("INVALID_INPUT", "profile.bad_json", 400);
  }
  const parsed = ProfilePatchSchema.safeParse(body);
  if (!parsed.success) return fail("INVALID_INPUT", "profile.invalid", 400);
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.display_name })
    .eq("owner_id", owner)
    .select()
    .single();
  if (error) return fail("NOT_FOUND", "profile.not_found", 404);
  return ok(data as ProfileRow);
}
