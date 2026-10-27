import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
  await page.goto("/");
});

async function speakCalls(page: Page) {
  return page.evaluate(() => window.__speakCalls);
}

test("tile selection previews exact text without speaking", async ({ page }) => {
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toHaveLength(0);
});

test("language and intent edits stay silent; Speak speaks once; Stop cancels", async ({ page }) => {
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await page.getByRole("button", { name: "தமிழ்", exact: true }).first().click();
  await expect(page.getByText("எனக்கு தண்ணீர் வேண்டும்.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toHaveLength(0);

  await page.getByRole("button", { name: /Speak this sentence/ }).click();
  expect(await speakCalls(page)).toEqual([
    { text: "எனக்கு தண்ணீர் வேண்டும்.", lang: "ta-IN", voice: "Stub Tamil", rate: 1 },
  ]);

  await page.getByRole("button", { name: /Stop/ }).click();
  expect(await page.evaluate(() => window.__cancelCalls)).toBeGreaterThanOrEqual(1);
});

test("typed sentence is preserved exactly and spoken exactly", async ({ page }) => {
  await page.getByLabel(/type your own/i).fill("Keep every word — exactly!");
  await page.getByRole("button", { name: /Use this sentence/ }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "Keep every word — exactly!" })).toBeVisible();
  await page.getByRole("button", { name: /Speak this sentence/ }).click();
  expect(await speakCalls(page)).toEqual([
    { text: "Keep every word — exactly!", lang: "en-US", voice: "Stub English", rate: 1 },
  ]);
});

test("keyboard-only path completes composition, preview, Speak, and Stop", async ({ page }) => {
  const food = page.getByRole("button", { name: "Food", exact: true });
  await food.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("I want food.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toHaveLength(0);

  const speak = page.getByRole("button", { name: /Speak this sentence/ });
  await speak.focus();
  await page.keyboard.press("Enter");
  expect(await speakCalls(page)).toHaveLength(1);

  const stop = page.getByRole("button", { name: /Stop/ });
  await stop.focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.__cancelCalls)).toBeGreaterThanOrEqual(1);
});
