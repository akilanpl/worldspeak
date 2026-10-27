import type { MessageRow } from "@worldspeak/db";
import { MessageCreateSchema } from "@/lib/api/validation";
import { fail, ok, requireOwner } from "@/lib/api/route";
import { toCode } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

function codeOf(err: unknown) {
  return toCode(err);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { id } = await params;
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,language,created_at,updated_at")
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return fail("NOT_FOUND", "conversations.not_found", 404);
  const messages = await supabase
    .from("messages")
    .select("*")
    .eq("owner_id", owner)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (messages.error) return fail("INVALID_INPUT", "messages.read_failed", 500);
  return ok({ conversation: data, messages: messages.data as MessageRow[] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_INPUT", "messages.bad_json", 400);
  }
  const parsed = MessageCreateSchema.safeParse(body);
  if (!parsed.success) return fail("INVALID_INPUT", "messages.invalid", 400);
  const row = {
    owner_id: owner,
    conversation_id: id,
    kind: parsed.data.kind,
    text: parsed.data.text,
    locale: parsed.data.locale,
    intent: parsed.data.intent ?? null,
    origin: parsed.data.origin,
    revision: parsed.data.revision,
    text_hash: parsed.data.text_hash,
    template_version: parsed.data.template_version,
    client_event_id: parsed.data.client_event_id,
  };
  const inserted = await supabase.from("messages").insert(row).select().single();
  if (!inserted.error) return ok(inserted.data as MessageRow, 201);
  if ((inserted.error as { code?: string }).code === "23505") {
    // Idempotent replay: same (owner, client_event_id) returns the stored row.
    const existing = await supabase
      .from("messages")
      .select("*")
      .eq("owner_id", owner)
      .eq("client_event_id", parsed.data.client_event_id)
      .maybeSingle();
    if (!existing.error && existing.data) return ok(existing.data as MessageRow);
  }
  const code = codeOf(inserted.error);
  const key = code === "NOT_FOUND" ? "conversations.not_found" : "messages.create_failed";
  return fail(code, key, code === "NOT_FOUND" ? 404 : 400);
}
