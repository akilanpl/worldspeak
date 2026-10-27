import type { FavoriteRow } from "@worldspeak/db";
import { FavoriteCreateSchema } from "@/lib/api/validation";
import { fail, ok, readJson, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { data, error } = await supabase
    .from("favorites")
    .select("id,created_at,message_id,messages(id,text,locale,origin,created_at)")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return fail("INVALID_INPUT", "favorites.read_failed", 500);
  return ok(data);
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return fail("INVALID_INPUT", "favorites.bad_json", 400);
  }
  const parsed = FavoriteCreateSchema.safeParse(body);
  if (!parsed.success) return fail("INVALID_INPUT", "favorites.invalid", 400);

  // Explicit-save shortcut: persist the current preview as a message first.
  // Favorites are explicit saves even when general history is off.
  const messageId = parsed.data.message_id ?? null;
  if (parsed.data.snapshot) {
    const result = await supabase.rpc("save_favorite_snapshot", { snapshot: parsed.data.snapshot, conversation_title: parsed.data.conversation_title });
    if (result.error) return fail("INVALID_INPUT", "favorites.snapshot_failed", 400);
    return ok(result.data, 201);
  }
  if (!messageId) return fail("INVALID_INPUT", "favorites.invalid", 400);
  const fav = await supabase
    .from("favorites")
    .insert({ owner_id: owner, message_id: messageId })
    .select()
    .single();
  if (!fav.error) return ok(fav.data as FavoriteRow, 201);
  if ((fav.error as { code?: string }).code === "23505") {
    const existing = await supabase
      .from("favorites")
      .select("*")
      .eq("owner_id", owner)
      .eq("message_id", messageId)
      .maybeSingle();
    if (!existing.error && existing.data) return ok(existing.data as FavoriteRow);
  }
  return fail("NOT_FOUND", "messages.not_found", 404);
}
