import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("core slice has no serious or critical axe findings", async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
  await page.goto("/");
  // Exercise the composed state too, so the preview path is scanned.
  await page.getByRole("button", { name: "Water", exact: true }).click();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
