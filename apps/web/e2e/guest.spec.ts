import { expect, test } from "@playwright/test";

/**
 * Guest access (no Supabase project configured in this environment):
 * the essential board works with zero redirects, and auth-gated pages are
 * honest about the closed cloud gate instead of faking sessions.
 */
test("guest uses the board with no redirect and no backend calls", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });
  await page.goto("/");
  await expect(page).not.toHaveURL(/sign-in/);
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  // Save controls exist but stay disabled for guests; the hint explains why.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Favorite", exact: true })).toBeDisabled();
  await expect(page.getByText(/works fully without it/)).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test("sign-in page reports the closed cloud gate honestly", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByTestId("auth-not-configured")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("saved pages report the closed gate without redirect loops", async ({ page }) => {
  for (const path of ["/history", "/favorites", "/settings"]) {
    await page.goto(path);
    await expect(page.getByTestId("auth-not-configured")).toBeVisible();
  }
});
