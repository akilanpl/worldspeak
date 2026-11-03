// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ configured: vi.fn(), client: vi.fn(), exchange: vi.fn(), redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }) }));
vi.mock("next/navigation", () => ({ redirect: f.redirect }));
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: f.configured }));
vi.mock("@/lib/supabase/server", () => ({ createClient: f.client }));
import { GET } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  f.configured.mockReturnValue(true);
  f.client.mockResolvedValue({ auth: { exchangeCodeForSession: f.exchange } });
  f.exchange.mockResolvedValue({ error: null });
});
it("missing code emits only a static category, never provider query descriptions", async () => {
  await expect(GET(new Request("https://worldspeak.test/auth/callback?error_description=private-account"))).rejects.toThrow("REDIRECT:/sign-in?reason=callback_missing_code");
  expect(f.client).not.toHaveBeenCalled();
});
it("unconfigured auth remains fail-closed before any exchange", async () => {
  f.configured.mockReturnValue(false);
  await expect(GET(new Request("https://worldspeak.test/auth/callback?code=private-code"))).rejects.toThrow("REDIRECT:/sign-in?reason=auth_unavailable");
  expect(f.client).not.toHaveBeenCalled();
});
it.each(["returned", "thrown"])("%s exchange failure emits no raw error or callback code", async (kind) => {
  if (kind === "returned") f.exchange.mockResolvedValue({ error: { message: "private-account private-code" } });
  else f.exchange.mockRejectedValue(new Error("private-account private-code"));
  await expect(GET(new Request("https://worldspeak.test/auth/callback?code=private-code&next=https://evil.test"))).rejects.toThrow("REDIRECT:/sign-in?reason=callback_exchange_failed");
  expect(f.redirect).toHaveBeenCalledExactlyOnceWith("/sign-in?reason=callback_exchange_failed");
  expect(f.exchange).toHaveBeenCalledTimes(1);
});
it.each([["/favorites", "/favorites"], ["https://evil.test", "/history"]])("successful exchange preserves exact safe destination %s", async (next, expected) => {
  await expect(GET(new Request(`https://worldspeak.test/auth/callback?code=private-code&next=${encodeURIComponent(next)}`))).rejects.toThrow(`REDIRECT:${expected}`);
  expect(f.exchange).toHaveBeenCalledExactlyOnceWith("private-code");
});
