import { SearchQuerySchema, decodeCursor, encodeCursor, escapeLike } from "@/lib/api/validation";
import { fail, ok, readJson, requireOwner } from "@/lib/api/route";

export const dynamic = "force-dynamic";

/**
 * Owner-scoped substring search over the user's messages (title via
 * conversation join is intentionally out of scope: one table, one index).
 * NFC-normalized, LIKE metacharacters escaped, cursor pagination.
 */
/** @deprecated Compatibility only. First-party clients use POST to keep text out of URLs. */
export async function GET(request: Request) { return search(request, false); }

export async function POST(request: Request) { return search(request, true); }

async function search(request: Request, bodySearch: boolean) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { owner, supabase } = auth.ctx;
  const url = new URL(request.url);
  let raw: unknown;
  try { raw = bodySearch ? await readJson(request) : {
    q: url.searchParams.get("q") ?? "",
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  }; } catch { return fail("INVALID_INPUT", "search.invalid", 400); }
  const parsed = SearchQuerySchema.safeParse(raw);
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
