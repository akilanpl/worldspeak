import { expect, test } from "@playwright/test";
import { smokeDeployment } from "../../../scripts/deployment-smoke.mjs";

/** Deployment/device approximations only: real audio, hardware and hosted
 * sessions remain manual acceptance. No Meta or hosted requests are made. */
test("large text preserves bilingual guest composition and reflow", async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "தமிழ்", exact: true }).first().click();
  await expect(page.getByText("எனக்கு தண்ணீர் வேண்டும்.", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth, viewport: window.innerWidth,
    // Geometry-only failure evidence; no user text or form values.
    elements: [...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 12).map(el => ({ tag: el.tagName, className: el.className.toString(), right: Math.round(el.getBoundingClientRect().right) })),
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: unknown[] }).__speakCalls)).toEqual([]);
});

test("prepared service-worker caches contain public offline assets only", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.caches?.match("/offline/index.html").then(Boolean), null, { timeout: 30000 });
  const cachedPaths = await page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.startsWith("worldspeak-offline-"));
    const paths: string[] = [];
    for (const name of names) for (const req of await (await caches.open(name)).keys()) paths.push(new URL(req.url).pathname);
    return paths;
  });
  expect(cachedPaths).toContain("/offline/index.html");
  expect(cachedPaths.every(path => path.startsWith("/offline/"))).toBe(true);
  expect(cachedPaths.some(path => /^\/(?:api|auth|history|favorites|settings)(?:\/|$)/.test(path))).toBe(false);
});

test("read-only deployment smoke validates the running production server", async ({ baseURL }) => {
  expect(baseURL).toBeDefined();
  const report = await smokeDeployment(baseURL!, "demo");
  expect(report.ok).toBe(true);
  expect(report.checks).toHaveLength(9);
});
