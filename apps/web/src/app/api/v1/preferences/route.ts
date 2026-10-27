import type { Database, AccessibilityPreferencesRow } from "@worldspeak/db";
import { PreferencesPatchSchema } from "@/lib/api/validation";
import { fail, ok, readJson, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { data, error } = await supabase
    .from("accessibility_preferences")
    .select("*")
    .eq("owner_id", owner)
    .maybeSingle();
  if (error || !data) return fail("NOT_FOUND", "preferences.not_found", 404);
  return ok(data as AccessibilityPreferencesRow);
}

export async function PATCH(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return fail("INVALID_INPUT", "preferences.bad_json", 400);
  }
  const parsed = PreferencesPatchSchema.safeParse(body);
  if (!parsed.success) return fail("INVALID_INPUT", "preferences.invalid", 400);
  const current = await supabase
    .from("accessibility_preferences")
    .select("revision")
    .eq("owner_id", owner)
    .maybeSingle();
  if (current.error || !current.data) return fail("NOT_FOUND", "preferences.not_found", 404);
  const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined)) as Database["public"]["Tables"]["accessibility_preferences"]["Update"];
  const { data, error } = await supabase
    .from("accessibility_preferences")
    .update({ ...patch, revision: current.data.revision + 1 })
    .eq("owner_id", owner)
    .select()
    .single();
  if (error) return fail("NOT_FOUND", "preferences.not_found", 404);
  return ok(data as AccessibilityPreferencesRow);
}
