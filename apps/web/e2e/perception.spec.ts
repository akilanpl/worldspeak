import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Perception prototype: fixtures only — no camera, uploads, calls, or speech. */
test("fixture flow completes to an approved intent with zero backend calls", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });
  await page.goto("/perception");
  await expect(page.getByRole("heading", { name: /see and choose/i })).toBeVisible();
  // Table scene is preselected; continue to objects.
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await expect(page.getByRole("heading", { name: /objects found/i })).toBeVisible();
  // Select water through the image region, confirm, continue.
  await page.getByRole("button", { name: /water.*fixture/i }).click();
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  // Approve hands off to the composer — this page never speaks.
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await expect(page.getByTestId("approve-notice")).toContainText(/no speech here/i);
  expect(apiRequests).toEqual([]);
});

test("keyboard-only selection path works end to end", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().focus();
  await page.keyboard.press("Enter");
  const water = page.getByRole("button", { name: /water.*fixture/i });
  await water.focus();
  expect(await water.getAttribute("aria-pressed")).toBe("false");
  await page.keyboard.press("Enter");
  expect(await water.getAttribute("aria-pressed")).toBe("true");
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
});

test("empty scene explains itself and offers a way back", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /empty shelf/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await expect(page.getByText(/no objects detected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByRole("button", { name: /use synthetic fixtures/i })).toBeVisible();
});

test("perception slice has no serious or critical axe findings", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
