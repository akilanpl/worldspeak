import { expect, test, type Page } from "@playwright/test";

/**
 * WorldSpeak independent evaluation suite (desktop correctness).
 * Every test uses approved fixtures/mocks only: the static offline board,
 * synthetic perception scenes, hand-built handoff payloads, and a stubbed
 * synthesizer. No paid models, no hosted services, no real inference.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: "apps/web/e2e/stub-speech.js" });
});

async function speakCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { __speakCalls: unknown[] }).__speakCalls);
}

test("1. guest offline communication works with zero backend calls", async ({ page, context }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });
  await page.goto("/");
  await page.waitForFunction(() => window.caches?.match("/offline/index.html").then(Boolean), null, {
    timeout: 30000,
  });
  await page.goto("/offline");
  await expect(page.getByTestId("offline-status")).toContainText("Offline ready");
  await context.setOffline(true);
  await page.goto("/offline/index.html");
  await expect(page.getByRole("heading", { name: /offline board/i })).toBeVisible();
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  expect(await speakCalls(page)).toHaveLength(1);
  expect(apiRequests).toEqual([]);
});

test("2. English and Tamil render exact sentences with no speech", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "தமிழ்", exact: true }).first().click();
  await expect(page.getByText("எனக்கு தண்ணீர் வேண்டும்.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
});

test("3. object selection and intent confirmation preserve user intent", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("list", { name: /objects found/i }).getByRole("button", { name: "water", exact: true }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await expect(page.getByTestId("approve-notice")).toContainText(/no speech here/i);
  expect(await speakCalls(page)).toEqual([]);
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page).toHaveURL(/\?handoff=/);
  await expect(page.getByText("I want water.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
});

test("4. unknown objects degrade to exact user text", async ({ page }) => {
  const payload = {
    version: 1,
    intent: { kind: "request-object", object: { catalogId: "not-a-real-thing", selectedObjectId: null }, polarity: "want" },
    locale: "en",
    source: "perception",
    objectLabel: "mystery thing",
    objectCatalogId: "not-a-real-thing",
    provenance: "fixture",
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  await page.goto(`/?handoff=${encoded}`);
  await expect(page.getByText("mystery thing", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
});

test("5. guests never trigger uploads: fixture journeys make zero media calls", async ({ page }) => {
  const uploads: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/v1/media")) uploads.push(req.url());
  });
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("list", { name: /objects found/i }).getByRole("button", { name: "chair", exact: true }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  expect(uploads).toEqual([]);
  expect(page.getByRole("button", { name: /analyze with meta/i })).toHaveCount(0);
});

test("6. no speech before an explicit Speak action", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /jump to appearance/i }).nth(2).click();
  await page.getByRole("button", { name: /phone \(track/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await page.getByRole("link", { name: /open in composer/i }).click();
  await expect(page.getByText("I want phone.", { exact: true })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  const calls = await speakCalls(page);
  expect(calls).toHaveLength(1);
});

test("7. edits mint fresh revisions: each new sentence speaks once spoken", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  expect(await speakCalls(page)).toHaveLength(1);
  await page.getByRole("button", { name: "தமிழ்", exact: true }).first().click();
  await expect(page.getByText("எனக்கு தண்ணீர் வேண்டும்.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /speak this sentence/i }).click();
  const calls = (await speakCalls(page)) as { text: string }[];
  expect(calls).toHaveLength(2);
  expect(calls[0]?.text).toBe("I want water.");
  expect(calls[1]?.text).toBe("எனக்கு தண்ணீர் வேண்டும்.");
});

test("camera is never requested without an explicit capture gesture", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __camCalls: number }).__camCalls = 0;
    const orig = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async (...args: Parameters<MediaDevices["getUserMedia"]>) => {
        (window as unknown as { __camCalls: number }).__camCalls += 1;
        if (orig) return orig(...args);
        throw new DOMException("denied", "NotAllowedError");
      };
    }
  });
  await page.goto("/perception");
  await page.goto("/video");
  const calls = await page.evaluate(() => (window as unknown as { __camCalls: number }).__camCalls ?? 0);
  expect(calls).toBe(0);
});

test("9. errors and cancellation present clearly with recovery", async ({ page }) => {
  await page.goto("/perception");
  await page.getByRole("button", { name: /empty shelf/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await expect(page.getByText(/no objects detected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByRole("button", { name: /use synthetic fixtures/i })).toBeVisible();
  await page.goto("/?handoff=!!!tampered!!!");
  await expect(page.getByTestId("handoff-invalid-notice")).toBeVisible();
  await page.goto("/perception");
  await page.getByRole("button", { name: /^continue$/i }).first().click();
  await page.getByRole("list", { name: /objects found/i }).getByRole("button", { name: "water", exact: true }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await expect(page.getByTestId("approve-notice")).toBeVisible();
  await page.getByRole("button", { name: /start over/i }).click();
  await expect(page.getByTestId("approve-notice")).toHaveCount(0);
});
