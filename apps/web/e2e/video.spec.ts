import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Video prototype: synthetic tracking fixtures only — no camera, uploads, calls, or speech. */
test("fixture flow completes to an approved intent with zero backend calls", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });
  await page.goto("/video");
  await expect(page.getByRole("heading", { name: /clip tracking/i })).toBeVisible();
  // Crossing scene is preselected; continue to tracks.
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByRole("heading", { name: /tracks/i })).toBeVisible();
  // Seek into the phone window, select it through the overlay, continue.
  await page.getByRole("button", { name: /jump to appearance/i }).nth(2).click();
  await page.getByRole("button", { name: /phone \(track/i }).click();
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want phone.", { exact: true })).toBeVisible();
  // Approve hands off to the composer — this page never speaks.
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await expect(page.getByTestId("video-approve-notice")).toContainText(/no speech here/i);
  expect(apiRequests).toEqual([]);
});

test("keyboard-only selection path works end to end", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /^continue$/i }).focus();
  await page.keyboard.press("Enter");
  const jump = page.getByRole("button", { name: /jump to appearance/i }).nth(2);
  await jump.focus();
  await page.keyboard.press("Enter");
  // Jump seeks and selects: the overlay region reports pressed.
  const phone = page.getByRole("button", { name: /phone \(track/i });
  expect(await phone.getAttribute("aria-pressed")).toBe("true");
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want phone.", { exact: true })).toBeVisible();
});

test("empty timeline explains itself and offers a way back", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /empty motion/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText(/no object tracks/i).first()).toBeVisible();
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByRole("button", { name: /use synthetic fixtures/i })).toBeVisible();
});

test("video slice has no serious or critical axe findings", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /^continue$/i }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
