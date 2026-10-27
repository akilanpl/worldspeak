import { decodeCursor, encodeCursor } from "@/lib/api/validation";
import { fail, ok, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

/** Recent saves for the owner, cursor-paginated (no query term). */
export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 30), 1), 30);
  const cursor = url.searchParams.get("cursor");
  let query = supabase
    .from("messages")
    .select("id,conversation_id,text,locale,origin,created_at")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    try {
      const decoded = decodeCursor(cursor);
      query = query.or(
        `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
      );
    } catch {
      return fail("INVALID_INPUT", "search.bad_cursor", 400);
    }
  }
  const { data, error } = await query;
  if (error) return fail("INVALID_INPUT", "search.failed", 500);
  const rows = (data ?? []) as { id: string; created_at: string }[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1]!.created_at, page[page.length - 1]!.id)
      : null;
  return ok({ rows: page, nextCursor });
}
