import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile evaluation: the same guest journey at a 390px touch viewport.
 * Asserts reflow (no horizontal scroll), 44px nav targets, visible focus,
 * announced selection, and a working end-to-end fixture journey.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
});

async function speakCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { __speakCalls: unknown[] }).__speakCalls);
}

test("8a. mobile pages reflow without horizontal scrolling", async ({ page }) => {
  for (const route of ["/", "/perception", "/video"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    }));
    expect(overflow.scrollW, route).toBeLessThanOrEqual(overflow.innerW);
  }
});

test("8b. primary nav links offer 44px touch targets", async ({ page }) => {
  await page.goto("/");
  const shorts = await page.getByRole("navigation", { name: /primary/i }).getByRole("link").evaluateAll((links) =>
    links
      .map((a) => {
        const r = a.getBoundingClientRect();
        return { name: a.textContent?.trim(), h: Math.round(r.height) };
      })
      .filter((l) => l.h < 44),
  );
  expect(shorts).toEqual([]);
});

test("8c. mobile fixture journey completes end to end", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("list", { name: /objects found/i }).getByRole("button", { name: "water", exact: true }).click();
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
});

test("8d. keyboard focus on overlay regions is visible", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  // Real keyboard path: Tab from the top until an overlay region takes focus.
  // Programmatic focus() intentionally does not match :focus-visible.
  await page.keyboard.press("Tab");
  let focused = false;
  for (let i = 0; i < 60; i++) {
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    if (label.includes("Use synthetic fixtures")) {
      focused = true;
      break;
    }
    await page.keyboard.press("Tab");
  }
  expect(focused).toBe(true);
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(parseFloat(outline.width)).toBeGreaterThan(0);
  expect(outline.style).not.toBe("none");
});

test("mobile slice has no serious or critical axe findings", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
