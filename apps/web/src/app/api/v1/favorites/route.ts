import type { FavoriteRow, MessageRow } from "@worldspeak/db";
import { FavoriteCreateSchema } from "@/lib/api/validation";
import { fail, ok, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOwner();
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
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_INPUT", "favorites.bad_json", 400);
  }
  const parsed = FavoriteCreateSchema.safeParse(body);
  if (!parsed.success) return fail("INVALID_INPUT", "favorites.invalid", 400);

  // Explicit-save shortcut: persist the current preview as a message first.
  // Favorites are explicit saves even when general history is off.
  let messageId = parsed.data.message_id ?? null;
  if (parsed.data.snapshot) {
    const snap = parsed.data.snapshot;
    const convTitle = parsed.data.conversation_title || snap.text.slice(0, 60);
    const conv = await supabase
      .from("conversations")
      .insert({ owner_id: owner, title: convTitle, language: snap.locale })
      .select("id")
      .single();
    if (conv.error || !conv.data) return fail("INVALID_INPUT", "favorites.snapshot_failed", 500);
    const msg = await supabase
      .from("messages")
      .insert({
        owner_id: owner,
        conversation_id: (conv.data as { id: string }).id,
        kind: snap.kind,
        text: snap.text,
        locale: snap.locale,
        intent: snap.intent ?? null,
        origin: snap.origin,
        revision: snap.revision,
        text_hash: snap.text_hash,
        template_version: snap.template_version,
        client_event_id: snap.client_event_id,
      })
      .select("id")
      .single();
    if (msg.error) {
      if ((msg.error as { code?: string }).code === "23505") {
        const existing = await supabase
          .from("messages")
          .select("id")
          .eq("owner_id", owner)
          .eq("client_event_id", snap.client_event_id)
          .maybeSingle();
        if (!existing.error && existing.data) {
          messageId = (existing.data as MessageRow).id;
        } else {
          return fail("INVALID_INPUT", "favorites.snapshot_failed", 500);
        }
      } else {
        return fail("INVALID_INPUT", "favorites.snapshot_failed", 500);
      }
    } else {
      messageId = (msg.data as MessageRow).id;
    }
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
