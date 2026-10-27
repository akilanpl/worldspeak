import { expect, test } from "@playwright/test";

/**
 * Reduced-motion evaluation: with the OS setting emulated, transitions and
 * animations compute to zero while the journey keeps working.
 */
test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
});

test("motion is honored and the journey still completes", async ({ page }) => {
  await page.goto("/");
  const motion = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector(".btn") as Element);
    const root = getComputedStyle(document.documentElement);
    return { btnTransition: s.transitionDuration, rootMotion: root.getPropertyValue("--motion").trim() };
  });
  expect(motion.btnTransition === "0s" || motion.btnTransition === "0s, 0s").toBe(true);
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("list", { name: /objects found/i }).getByRole("button", { name: "chair", exact: true }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want chair.", { exact: true })).toBeVisible();
});
