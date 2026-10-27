import sharp from "sharp";
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

// Mock-only production browser journey. The image is a synthetic blank PNG;
// detections reconstruct sanitized chair geometry, never a new provider receipt.
test("reconstructed Spark chair → mock status → overlay → intent → English/Tamil Speak", async ({ page }) => {
  test.skip(process.env.WORLDSPEAK_MOCK_AUTH_E2E !== "1", "Needs synthetic public build config; CI supplies it, never real credentials.");
  // This simulated browser session is not hosted Auth/RLS evidence. Cookie
  // reads are mocked in JS only; no credential is sent to the Next server.
  await page.addInitScript(() => {
    const enc = (s: string) => btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const token = `${enc(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${enc(JSON.stringify({ sub: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", exp: 4102444800, role: "authenticated" }))}.synthetic`;
    const session = { access_token: token, refresh_token: "synthetic-not-usable", expires_at: 4102444800,
      expires_in: 3600, token_type: "bearer", user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } };
    Object.defineProperty(document, "cookie", { configurable: true,
      get: () => `sb-worldspeak-e2e-auth-token=base64-${enc(JSON.stringify(session))}`, set: () => {} });
  });
  let segment = false;
  await page.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    const assetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    if (!url.pathname.startsWith("/api/v1/")) return route.continue();
    if (url.pathname === "/api/v1/preferences") return route.fulfill({ status: 401, json: { error: { code: "UNAUTHORIZED" } } });
    if (req.method() === "DELETE") return route.fulfill({ json: { ok: true } });
    if (url.pathname === "/api/v1/media") {
      expect(req.headers()["x-worldspeak-consent"]).toBe("scene-v1");
      return route.fulfill({ json: { data: { assetId } } });
    }
    if (url.pathname === "/api/v1/jobs") {
      const body = req.postDataJSON() as { operation: string; concept?: string };
      segment = body.operation === "segment";
      expect(body).toMatchObject(segment ? { operation: "segment", concept: "chair", assetId } : { operation: "scene", assetId });
      return route.fulfill({ json: { data: { jobId } } });
    }
    expect(url.pathname).toBe(`/api/v1/jobs/${jobId}`);
    return route.fulfill({ json: { data: {
      id: jobId, operation: segment ? "segment" : "scene", status: "succeeded", cancelRequested: false, errorCode: null,
      reservedMicroUsd: segment ? 2500 : 25000, chargedMicroUsd: segment ? 2500 : 4402, billingState: "settled",
      createdAt: "2026-10-27T00:00:00Z", expiresAt: "2026-10-28T00:00:00Z",
      result: { detections: [{ ...(segment ? { objectId: "7" } : {}), label: "chair", catalogId: null, confidence: 0.99, mask: null,
        box: segment ? { x1: .25, y1: .25, x2: .75, y2: .75 } : { x1: 0.247, y1: 0.139, x2: 0.746, y2: 0.868 } }], tracks: [],
        segmentationMasks: segment ? [{ objectId: "7", width: 4, height: 2,
          bounds: { x1: .25, y1: .25, x2: .75, y2: .75 }, rasterBase64: "AAABAQEBAAA=" }] : [],
        provenance: { source: "model", model: segment ? "sam-3.1" : "muse-spark-1.3", adapterVersion: "meta-v1",
          responseId: "synthetic-browser-reconstruction-not-real-receipt", inputSha256: "a".repeat(64),
          inputTokens: segment ? null : 424, outputTokens: segment ? null : 911, costMicroUsd: segment ? 2500 : 4402 } }
    } } });
  });
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
  const media: string[] = [];
  page.on("request", r => {
    if (new URL(r.url()).pathname.startsWith("/api/v1/")) media.push(r.url());
  });
  await page.goto("/perception");
  await page.getByRole("button", { name: /use synthetic fixtures/i }).click();
  await page.getByLabel(/upload image/i).setInputFiles({ name: "synthetic-pixel.png", mimeType: "image/png",
    buffer: await sharp({ create: { width: 8, height: 4, channels: 3, background: "#ffffff" } }).png().toBuffer() });
  await page.getByRole("button", { name: /analyze with meta/i }).click();
  expect(media).toEqual([]);
  await expect(page.getByTestId("consent-send")).toBeDisabled();
  await page.getByRole("checkbox").check();
  expect(media).toEqual([]);
  await page.getByTestId("consent-send").click();
  await page.getByRole("button", { name: /use these objects/i }).click();
  await expect(page.getByTestId("model-results-notice")).toContainText("muse-spark-1.3");
  const region = page.getByTestId("mask-layer").getByRole("button", { name: "chair", exact: true });
  expect(await region.evaluate(el => (el as HTMLElement).style.left)).toBe("24.7%");
  await region.click();
  // Fresh per-upload consent, one explicit SAM refinement. These masks are
  // synthetic transport fixtures, not real provider output or a chair outline.
  await page.getByRole("button", { name: /refine with SAM segmentation/i }).click();
  await expect(page.getByTestId("consent-send")).toBeDisabled();
  expect(media.filter(u => new URL(u).pathname === "/api/v1/media")).toHaveLength(1);
  await page.getByRole("checkbox").check();
  await page.getByTestId("consent-send").click();
  await page.getByRole("button", { name: /use these objects/i }).click();
  await expect(page.getByTestId("model-results-notice")).toContainText("sam-3.1");
  const canvas = page.getByTestId("raster-mask");
  await expect(canvas).toHaveAttribute("width", "4");
  await expect.poll(() => canvas.evaluate(el => Array.from((el as HTMLCanvasElement).getContext("2d")!.getImageData(0, 0, 4, 2).data)))
    .toEqual([0,0,0,0, 0,0,0,0, 15,118,110,255, 15,118,110,255, 15,118,110,255, 15,118,110,255, 0,0,0,0, 0,0,0,0]);
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => {
      const layer = (await page.getByTestId("mask-layer").boundingBox())!;
      const rect = (await canvas.boundingBox())!;
      return Math.abs(rect.width - layer.width * .5) + Math.abs(rect.height - layer.height * .5) +
        Math.abs(rect.x - layer.x - layer.width * .25) + Math.abs(rect.y - layer.y - layer.height * .25);
    }).toBeLessThan(2);
    // Check actual composited screenshot pixels, including transparent holes.
    await canvas.scrollIntoViewIfNeeded();
    const rect = (await canvas.boundingBox())!;
    const shot = await page.screenshot({ scale: "css" });
    const sample = async (fx: number, fy: number) => Array.from(await sharp(shot).extract({
      left: Math.floor(rect.x + rect.width * fx), top: Math.floor(rect.y + rect.height * fy), width: 1, height: 1,
    }).removeAlpha().raw().toBuffer());
    expect(await sample(.25, .25)).toEqual([255, 255, 255]);
    const colored = await sample(.75, .25);
    expect(colored[0]).toBeGreaterThanOrEqual(157); expect(colored[0]).toBeLessThanOrEqual(161);
    expect(colored[1]).toBeGreaterThanOrEqual(198); expect(colored[1]).toBeLessThanOrEqual(202);
    expect(colored[2]).toBeGreaterThanOrEqual(195); expect(colored[2]).toBeLessThanOrEqual(199);
  }
  // Pixel canvas is not a competing pointer or focus target. Existing region
  // buttons remain touch/click/keyboard accessible on narrow and wide layouts.
  const samRegion = page.getByTestId("mask-layer").getByRole("button");
  await samRegion.focus();
  await page.keyboard.press("Enter");
  await expect(samRegion).toHaveAttribute("aria-pressed", "true");
  await samRegion.click();
  await expect(samRegion).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveCSS("pointer-events", "none");
  await expect(canvas).toHaveCSS("opacity", "0.65");
  await page.getByRole("button", { name: /correct the label/i }).click();
  await page.getByRole("button", { name: /apply label/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: "I want", exact: true }).click();
  await expect(page.getByText("I want chair.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page.getByText("I want chair.", { exact: true })).toBeVisible();
  const spoken = () => page.evaluate(() => (window as unknown as { __speakCalls: { text: string }[] }).__speakCalls);
  expect(await spoken()).toEqual([]);
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  expect(await spoken()).toMatchObject([{ text: "I want chair." }]);
  await page.getByRole("button", { name: "தமிழ்", exact: true }).first().click();
  await expect(page.getByText("எனக்கு நாற்காலி வேண்டும்.", { exact: true })).toBeVisible();
  expect(await spoken()).toHaveLength(1);
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  expect(await spoken()).toMatchObject([{ text: "I want chair." }, { text: "எனக்கு நாற்காலி வேண்டும்." }]);
  expect(media.filter(u => new URL(u).pathname === "/api/v1/media")).toHaveLength(2);
  expect(media.filter(u => new URL(u).pathname === "/api/v1/jobs")).toHaveLength(2);
});
