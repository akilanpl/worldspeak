import { fail, ok, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const { id } = await params;
  // Deleting a message removes its favorites via composite FK cascade.
  const { error, count } = await supabase
    .from("messages")
    .delete({ count: "exact" })
    .eq("owner_id", owner)
    .eq("id", id);
  if (error) return fail("INVALID_INPUT", "messages.delete_failed", 500);
  if ((count ?? 0) === 0) return fail("NOT_FOUND", "messages.not_found", 404);
  return ok({ deleted: id });
}
