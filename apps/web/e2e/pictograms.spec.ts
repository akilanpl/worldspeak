import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Public-domain synthetic 1x1 PNG; real browser decoding, no private media.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

test.beforeEach(async ({ page }) => { await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" }); });

test("local pictogram to exact composer words requires fresh Speak", async ({ page }) => {
  const uploads: string[] = [];
  page.on("request", (request) => { if (request.method() !== "GET") uploads.push(request.url()); });
  await page.goto("/pictograms");
  await page.getByLabel("Local image").setInputFiles({ name: "local.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("My exact meaning or words").fill("Please bring my own cup.");
  await page.getByLabel("Image description for accessibility").fill("My blue cup");
  await page.getByRole("button", { name: "Create pictogram", exact: true }).click();
  await expect(page.getByRole("img", { name: "My blue cup" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: /Use pictogram:/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: "Open in composer" }).click();
  await expect(page.getByText("Please bring my own cup.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("handoff-provenance-notice")).toContainText(/manual/i);
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: unknown[] }).__speakCalls)).toEqual([]);
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: unknown[] }).__speakCalls)).toHaveLength(1);
  expect(uploads).toEqual([]);
});

test("creation and deletion work offline while the page remains open", async ({ page, context }) => {
  await page.goto("/pictograms");
  await context.setOffline(true);
  await page.getByLabel("Local image").setInputFiles({ name: "offline.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("My exact meaning or words").fill("Offline words");
  await page.getByLabel("Image description for accessibility").fill("Offline dot");
  await page.getByRole("button", { name: "Create pictogram", exact: true }).click();
  await expect(page.getByRole("img", { name: "Offline dot" })).toBeVisible();
  await page.getByRole("button", { name: /Delete pictogram:/ }).click();
  await expect(page.getByRole("img")).toHaveCount(0);
});

test("corrupt images reject and a real image can be retried", async ({ page }) => {
  await page.goto("/pictograms");
  await page.getByLabel("Local image").setInputFiles({ name: "corrupt.png", mimeType: "image/png", buffer: Buffer.from("not png") });
  await page.getByLabel("My exact meaning or words").fill("Words");
  await page.getByLabel("Image description for accessibility").fill("Description");
  await page.getByRole("button", { name: "Create pictogram", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/valid|decoded/);
  await page.getByLabel("Local image").setInputFiles({ name: "good.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Create pictogram", exact: true }).click();
  await expect(page.getByRole("img", { name: "Description" })).toBeVisible();
});
