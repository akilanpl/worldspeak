/* eslint-disable no-console -- bounded recording receipts contain no user data */
import { chromium } from "playwright";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Deliberately no CLI URL, credential, retry or auth options.
const ORIGIN = "https://worldspeak-akilanpl.vercel.app";
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = new URL("../../demo-artifacts/", import.meta.url);
await mkdir(output, { recursive: true });
const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const started = Date.now();
const shots = [], violations = [], requests = [];
let browser, context, page, video;
const manifest = {
  recorderSourceSha: sourceSha, operatorVerifiedApplicationSourceSha: "7030dbfe365618e048f4a6a7f6b7b4b5f8e41668",
  operatorVerifiedDeploymentId: "dpl_EN1zrmXPq9inVYT4G4RUsx1chPAK", origin: ORIGIN, startedAt: new Date().toISOString(),
  status: "FAILED", shots, requests, violations,
  disclosures: ["Actual public guest browser footage; no mocked results or speech stubs.",
    "Playwright WebM is silent: CI voice availability and audible quality are not accepted.",
    "Local synthetic media; video regions and pictogram meanings are manually assigned.",
    "One historical Spark generation succeeded, original persistence failed and was repaired; no real SAM generation."],
};
await writeFile(new URL("manifest.json", output), JSON.stringify(manifest, null, 2) + "\n");
function check(value, message) { if (!value) throw new Error(message); }
async function caption(text, seconds = 9) {
  await page.evaluate((text) => {
    let box = document.getElementById("worldspeak-recording-caption");
    if (!box) {
      box = document.createElement("aside"); box.id = "worldspeak-recording-caption";
      Object.assign(box.style, { position: "fixed", bottom: "0", left: "0", right: "0", zIndex: "2147483647", padding: "14px 22px", background: "#101827", color: "white", font: "20px/1.4 sans-serif", pointerEvents: "none", borderTop: "3px solid #82ddcc" });
      document.body.append(box);
    }
    box.textContent = text;
  }, text);
  shots.push({ elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(2)), caption: text });
  await page.waitForTimeout(seconds * 1000); // Editorial dwell only; never a provider retry.
}
async function go(path) {
  const response = await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" });
  check(response?.status() === 200, `Public page failed: ${path}`);
  await page.getByRole("heading", { name: "WorldSpeak", exact: true }).waitFor();
}
async function gestureSpeakStop() {
  await page.getByRole("button", { name: "Speak this sentence", exact: true }).click();
  await page.waitForTimeout(1000);
  // Record the real app outcome, including a genuine missing-voice warning.
  const outcome = await page.locator('[role="status"]').allTextContents();
  shots.push({ elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(2)), speechUiOutcome: outcome });
  await page.getByRole("button", { name: "Stop", exact: true }).click();
}
async function approveToComposer(text, provenance) {
  await page.getByRole("button", { name: /Approve for composer/i }).click();
  await page.getByRole("link", { name: "Open in composer", exact: true }).click();
  await page.getByText(text, { exact: true }).waitFor();
  check((await page.getByTestId("handoff-provenance-notice").innerText()).includes(provenance), "Manual provenance missing");
}
const deadline = setTimeout(() => { void browser?.close(); }, 170_000);
try {
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: fileURLToPath(output), size: { width: 1280, height: 900 } }, serviceWorkers: "allow" });
  // Abort forbidden requests; never fulfill/mimic API responses or model output.
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const allowed = url.origin === ORIGIN && ["GET", "HEAD"].includes(request.method()) && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/");
    if (!allowed) { violations.push({ origin: url.origin, path: url.pathname, method: request.method() }); await route.abort("blockedbyclient"); return; }
    await route.continue();
  });
  context.on("request", (r) => { const u = new URL(r.url()); if (["http:", "https:"].includes(u.protocol)) requests.push({ origin: u.origin, path: u.pathname, method: r.method() }); });
  page = await context.newPage(); video = page.video();
  await go("/");
  const nextScript = page.locator('script[src*="/_next/"]').first();
  manifest.observedAsset = await nextScript.getAttribute("src");
  await caption("WorldSpeak — exact English/Tamil communication, with the person in control. Actual public guest application; no live AI calls.", 10);
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await page.getByText("I want water.", { exact: true }).waitFor();
  await caption("1. Choose a need, review the exact words, then deliberately Speak. Recording is silent; CI device voices/audio quality remain unverified.", 10);
  await gestureSpeakStop();
  await page.getByRole("button", { name: "தமிழ்", exact: true }).click();
  await page.getByText("எனக்கு தண்ணீர் வேண்டும்.", { exact: true }).waitFor();
  await caption("2. Tamil creates a new preview and requires fresh Speak. Tamil wording/native pronunciation remain review-pending; no silent language substitution.", 10);
  await gestureSpeakStop();
  // The user's language preference persists across routes. Deliberately return
  // to English before using the following English-labelled manual controls.
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByText("I want water.", { exact: true }).waitFor();
  await go("/video");
  await page.getByRole("button", { name: "Use local video", exact: true }).click();
  await page.getByLabel("Upload clip", { exact: true }).setInputFiles(root + "apps/web/e2e/fixtures/manual-region.webm");
  await page.getByRole("heading", { name: "Clip preview", exact: true }).waitFor();
  await caption("3. A genuine local 2-second synthetic clip. This is manual human selection, not automatic AI object tracking. Nothing is uploaded.", 9);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Select current frame", exact: true }).click();
  await page.getByRole("button", { name: "Confirm region", exact: true }).click();
  await page.getByLabel("My object or exact words", { exact: true }).fill("Please bring my cup.");
  await page.getByRole("button", { name: "Confirm object and choose intent", exact: true }).click();
  await caption("4. Confirm the region, supply meaning, review the sentence. Selecting an object does not decide what someone wants to say.", 9);
  await approveToComposer("Please bring my cup.", "manual human selection");
  await caption("5. The composer preserves manual provenance and exact words. Approval and speech are separate actions.", 9);
  await gestureSpeakStop();
  await go("/pictograms");
  const image = root + "tooling/evaluation/fixtures/images/two-objects.png";
  const bytes = await readFile(image);
  manifest.pictogramFixtureSha256 = createHash("sha256").update(bytes).digest("hex");
  await page.getByLabel("Local image", { exact: true }).setInputFiles(image);
  await page.getByLabel("My exact meaning or words", { exact: true }).fill("Please help me find this.");
  await page.getByLabel("Image description for accessibility", { exact: true }).fill("Original synthetic shapes, not a personal photograph");
  await page.getByRole("button", { name: "Create pictogram", exact: true }).click();
  await page.getByRole("button", { name: "Use pictogram: Please help me find this.", exact: true }).waitFor();
  await caption("6. Personal pictograms use a local image and the user's meaning. This original MIT-repository synthetic fixture is not Muse Image output.", 9);
  await page.getByRole("button", { name: "Use pictogram: Please help me find this.", exact: true }).click();
  await approveToComposer("Please help me find this.", "personalized pictogram");
  await caption("7. Exact pictogram wording reaches the composer; the image stays in page memory. Fresh Speak remains mandatory.", 9);
  await gestureSpeakStop();
  await go("/offline");
  await page.getByText("Offline ready — the board works without internet.", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole("link", { name: "Open offline board", exact: true }).click();
  await page.getByRole("heading", { name: "WorldSpeak — offline board", exact: true }).waitFor();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Water", exact: true }).click();
  await page.getByRole("button", { name: "தமிழ்", exact: true }).click();
  await page.getByText("எனக்கு தண்ணீர் வேண்டும்.", { exact: true }).waitFor();
  await caption("8. Prepared essential communication after this browser context disconnects. This is browser offline validation, not a physical-phone airplane-mode test.", 10);
  await context.setOffline(false);
  await caption("Meta evidence: one historical real Spark generation succeeded; its original app save failed and was later repaired. SAM masks remain synthetic; no real SAM generation.", 10);
  await caption("WorldSpeak • Build for Your World • github.com/akilanpl/worldspeak • Native/device acceptance remains open. No model, auth or media POST was made.", 10);
  check(violations.length === 0, "Forbidden network attempt detected; inspect manifest");
  check(requests.every(r => r.origin === ORIGIN && ["GET", "HEAD"].includes(r.method) && !r.path.startsWith("/api/") && !r.path.startsWith("/auth/")), "Observed network scope exceeded guest read-only recording");
  check((Date.now() - started) < 170_000, "Recording exceeded bounded duration");
  manifest.status = "RECORDED_GUEST_JOURNEY";
} catch (error) {
  manifest.failure = error instanceof Error ? error.message.slice(0, 300) : "Recorder failed";
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await context?.close(); await browser?.close();
  if (video) {
    const path = await video.path();
    const target = fileURLToPath(new URL("worldspeak-guest-demo.webm", output));
    await rename(path, target); manifest.videoBytes = (await stat(target)).size;
    manifest.video = "worldspeak-guest-demo.webm";
  }
  manifest.elapsedSeconds = Number(((Date.now() - started) / 1000).toFixed(2));
  await writeFile(new URL("manifest.json", output), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(new URL("shot-list.md", output), "# Actual recorded shot captions\n\n" + shots.filter(s => s.caption).map(s => `${s.elapsedSeconds}s — ${s.caption}`).join("\n\n") + "\n");
  console.log(JSON.stringify({ status: manifest.status, elapsedSeconds: manifest.elapsedSeconds, videoBytes: manifest.videoBytes ?? 0, violations: violations.length }));
}
