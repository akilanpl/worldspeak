import { fail, ok, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { id } = await params;
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return fail("NOT_FOUND", "conversations.not_found", 404);
  return ok(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { id } = await params;
  // Cascades to messages and their favorites via composite FKs.
  const { error, count } = await supabase
    .from("conversations")
    .delete({ count: "exact" })
    .eq("owner_id", owner)
    .eq("id", id);
  if (error) return fail("INVALID_INPUT", "conversations.delete_failed", 500);
  if ((count ?? 0) === 0) return fail("NOT_FOUND", "conversations.not_found", 404);
  return ok({ deleted: id });
}
