// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ owner: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ verifiedOwnerId: f.owner, createClient: f.client }));
import { GET, POST } from "./route";
let query: Record<string, ReturnType<typeof vi.fn>>;
const request = (body: unknown, origin = "https://worldspeak.test") => new Request("https://worldspeak.test/api/v1/history/search", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://worldspeak.test");
  f.owner.mockResolvedValue("verified-owner");
  query = {};
  for (const k of ["select", "eq", "ilike", "order", "limit", "or"]) query[k] = vi.fn(() => query);
  query["then"] = vi.fn((resolve) => resolve({ data: [], error: null }));
  f.client.mockResolvedValue({ from: vi.fn(() => query) });
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
it("POST preserves envelope, verified-owner predicate and escaped substring semantics", async () => {
  const res = await POST(request({ q: "a%_", limit: 30 }));
  expect(res.status).toBe(200);
  expect(query["eq"]).toHaveBeenCalledWith("owner_id", "verified-owner");
  expect(query["ilike"]).toHaveBeenCalledWith("text", "%a\\%\\_%");
  expect((await res.json()).data).toEqual({ rows: [], nextCursor: null });
  expect(res.headers.get("cache-control")).toBe("private, no-store");
});
it("POST rejects unauthenticated and cross-origin requests before reading/querying private data", async () => {
  expect((await POST(request({ q: "private" }, "https://foreign.test"))).status).toBe(403);
  expect(f.owner).not.toHaveBeenCalled();
  f.owner.mockResolvedValue(null);
  expect((await POST(request({ q: "private" }))).status).toBe(401);
  expect(f.client).not.toHaveBeenCalled();
});
it("POST rejects oversized/malformed bodies, owner spoofing and invalid cursors before querying", async () => {
  for (const body of [{ q: "x".repeat(17000) }, { q: "private", owner_id: "foreign" }, { q: "private", cursor: "bad" }]) {
    expect((await POST(request(body))).status).toBe(400);
  }
  const malformed = new Request("https://worldspeak.test/api/v1/history/search", { method: "POST", headers: { origin: "https://worldspeak.test" }, body: "{" });
  expect((await POST(malformed)).status).toBe(400);
  expect(query["then"]).not.toHaveBeenCalled();
});
it("deprecated GET compatibility preserves owner-scoped response", async () => {
  const res = await GET(new Request("https://worldspeak.test/api/v1/history/search?q=old-client"));
  expect(res.status).toBe(200);
  expect(query["eq"]).toHaveBeenCalledWith("owner_id", "verified-owner");
});
