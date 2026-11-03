import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const f = vi.hoisted(() => ({ oauth: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: f.push }) }));
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOAuth: f.oauth } }) }));
import AuthPanel from "./AuthPanel";
import SignInPage from "@/app/(auth)/sign-in/page";
beforeEach(() => { vi.clearAllMocks(); f.oauth.mockResolvedValue({ error: null }); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
it("known callback categories show static actionable guidance", async () => {
  render(await SignInPage({ searchParams: Promise.resolve({ reason: "callback_exchange_failed" }) }));
  expect(screen.getByRole("status").textContent).toContain("same browser and tab");
  expect(f.oauth).not.toHaveBeenCalled();
});
it.each(["private-account-private-code", ["callback_exchange_failed", "private-account"]])("unknown or repeated reason is never echoed: %j", async (reason) => {
  const { container } = render(await SignInPage({ searchParams: Promise.resolve({ reason }) }));
  expect(container.textContent).not.toContain("private-account");
  expect(screen.queryByRole("status")).toBeNull();
});
it("Google returned errors show only static text and do not retry or navigate", async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://worldspeak.test");
  f.oauth.mockResolvedValue({ error: { message: "private-account private-code" } });
  render(<AuthPanel mode="sign-in" />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(await screen.findByText("Google sign-in could not start. Please try one new sign-in in this browser.")).toBeTruthy();
  expect(document.body.textContent).not.toContain("private-account");
  expect(f.oauth).toHaveBeenCalledExactlyOnceWith({ provider: "google", options: { redirectTo: "https://worldspeak.test/auth/callback?next=/history" } });
  expect(f.push).not.toHaveBeenCalled();
});
