import { expect, test } from "@playwright/test";

test("rejected callback shows fixed guidance without echoing provider input", async ({ page }) => {
  const marker = "synthetic-private-description-must-not-echo";
  await page.goto(`/auth/callback?error_description=${marker}&next=https%3A%2F%2Funtrusted.test`);
  await expect(page).toHaveURL(/\/sign-in\?reason=(?:auth_unavailable|callback_missing_code)$/);
  await expect(page.getByText(/^(?:Sign-in returned without a confirmation code\.|Sign-in is not configured\.)/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(marker, { useInnerText: true });
  expect(new URL(page.url()).searchParams.has("error_description")).toBe(false);

  await page.goto(`/sign-in?reason=${marker}`);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(marker, { useInnerText: true });
});
