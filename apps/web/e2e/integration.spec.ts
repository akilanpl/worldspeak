import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Journey integration: perception/video → composer handoff.
 * Fixtures only — no camera, uploads, calls, or speech without a Speak click.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
});

async function speakCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { __speakCalls: unknown[] }).__speakCalls);
}

test("perception approve hands intent to the composer; speech stays gated", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("button", { name: /water.*fixture/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page).toHaveURL(/\?handoff=/);
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("handoff-provenance-notice")).toContainText(/demo fixture/i);
  // Arriving with an approved intent never speaks on its own.
  expect(await speakCalls(page)).toEqual([]);
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  const calls = await speakCalls(page);
  expect(calls).toHaveLength(1);
  expect(apiRequests).toEqual([]);
});

test("video approve hands a tracked object to the composer", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /jump to appearance/i }).nth(2).click();
  await page.getByRole("button", { name: /phone \(track/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page).toHaveURL(/\?handoff=/);
  await expect(page.getByText("I want phone.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
});

test("tampered handoff links degrade to an empty board, never a crash", async ({ page }) => {
  await page.goto("/?handoff=!!!tampered!!!");
  await expect(page.getByTestId("handoff-invalid-notice")).toBeVisible();
  await expect(page.getByText("I want water.", { exact: true })).toHaveCount(0);
});

test("handoff keys keep user text out of browser history", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("button", { name: /water.*fixture/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page).toHaveURL(/\?handoff=/);
  // Key transport: the URL carries an opaque key, never the approved sentence.
  const url = page.url();
  expect(url).toMatch(/handoff=ws-handoff-/);
  expect(url).not.toContain("water");
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
});

test("navigating between handoffs swaps state without a reload", async ({ page }) => {
  // Mark the tab once: any full reload wipes this marker.
  await page.goto("/perception");
  await page.evaluate(() => {
    (window as unknown as { __stayAlive: number }).__stayAlive = 1;
  });
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("button", { name: /water.*fixture/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  // Second, different handoff through the real journey (chair, same table scene).
  // The chair's overlay center sits under the overlapping phone region, so the
  // accessible list — the designed disambiguation path — selects it here.
  await page.getByRole("link", { name: /^camera$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("list", { name: /objects found/i }).getByRole("button", { name: "chair", exact: true }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page.getByText("I want chair.", { exact: true })).toBeVisible();
  await expect(page.getByText("I want water.", { exact: true })).toHaveCount(0);
  const marker = await page.evaluate(() => (window as unknown as { __stayAlive: number }).__stayAlive);
  expect(marker).toBe(1);
});

test("guests uploading real photos never see Meta analysis", async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.goto("/perception");
  await page.getByRole("button", { name: /use synthetic fixtures/i }).click();
  await page.getByLabel(/upload image/i).setInputFiles({ name: "t.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("heading", { name: /preview/i })).toBeVisible();
  expect(page.getByRole("button", { name: /analyze with meta/i })).toHaveCount(0);
  await expect(page.getByText(/sign in to analyze real photos/i)).toBeVisible();
});

test("unknown catalog objects degrade to exact user text", async ({ page }) => {
  const payload = {
    version: 1,
    intent: { kind: "request-object", object: { catalogId: "nope-not-real", selectedObjectId: null }, polarity: "want" },
    locale: "en",
    source: "video",
    objectLabel: "mystery thing",
    objectCatalogId: "nope-not-real",
    provenance: "fixture",
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  await page.goto(`/?handoff=${encoded}`);
  await expect(page.getByText("mystery thing", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
});

test("journey pages share coherent navigation", async ({ page }) => {
  for (const route of ["/", "/perception", "/video"]) {
    await page.goto(route);
    const nav = page.getByRole("navigation", { name: /primary/i });
    await expect(nav.getByRole("link", { name: /^board$/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^camera$/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^video$/i })).toBeVisible();
  }
  await page.goto("/");
  await page.getByRole("link", { name: /identify with camera/i }).click();
  await expect(page).toHaveURL(/\/perception/);
  await page.goto("/");
  await page.getByRole("link", { name: /track in a clip/i }).click();
  await expect(page).toHaveURL(/\/video/);
});

test("integration slice has no serious or critical axe findings", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
