import type { ConversationRow } from "@worldspeak/db";
import { ConversationCreateSchema } from "@/lib/api/validation";
import { fail, ok, readJson, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,language,created_at,updated_at")
    .eq("owner_id", owner)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) return fail("INVALID_INPUT", "conversations.read_failed", 500);
  return ok(data as ConversationRow[]);
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return fail("INVALID_INPUT", "conversations.bad_json", 400);
  }
  const parsed = ConversationCreateSchema.safeParse(body ?? {});
  if (!parsed.success) return fail("INVALID_INPUT", "conversations.invalid", 400);
  const { data, error } = await supabase
    .from("conversations")
    .insert({ owner_id: owner, title: parsed.data.title, language: parsed.data.language })
    .select()
    .single();
  if (error) return fail("INVALID_INPUT", "conversations.create_failed", 500);
  return ok(data as ConversationRow, 201);
}
