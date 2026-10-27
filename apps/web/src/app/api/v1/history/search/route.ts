import { SearchQuerySchema, decodeCursor, encodeCursor, escapeLike } from "@/lib/api/validation";
import { fail, ok, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

/**
 * Owner-scoped substring search over the user's messages (title via
 * conversation join is intentionally out of scope: one table, one index).
 * NFC-normalized, LIKE metacharacters escaped, cursor pagination.
 */
export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const url = new URL(request.url);
  const parsed = SearchQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return fail("INVALID_INPUT", "search.invalid", 400);
  const like = `%${escapeLike(parsed.data.q)}%`;
  let query = supabase
    .from("messages")
    .select("id,conversation_id,text,locale,origin,created_at")
    .eq("owner_id", owner)
    .ilike("text", like)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(parsed.data.limit + 1);
  if (parsed.data.cursor) {
    let decoded: { createdAt: string; id: string };
    try {
      decoded = decodeCursor(parsed.data.cursor);
    } catch {
      return fail("INVALID_INPUT", "search.bad_cursor", 400);
    }
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
    );
  }
  const { data, error } = await query;
  if (error) return fail("INVALID_INPUT", "search.failed", 500);
  const rows = (data ?? []) as { id: string; created_at: string }[];
  const hasMore = rows.length > parsed.data.limit;
  const page = hasMore ? rows.slice(0, parsed.data.limit) : rows;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1]!.created_at, page[page.length - 1]!.id)
      : null;
  return ok({ rows: page, nextCursor });
}
