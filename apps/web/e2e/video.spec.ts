import { fileURLToPath } from "node:url";
const localClip = fileURLToPath(new URL("./fixtures/manual-region.webm", import.meta.url));
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Video prototype: synthetic tracking fixtures only — no camera, uploads, calls, or speech. */
test("fixture flow completes to an approved intent with zero backend calls", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/")) apiRequests.push(req.url());
  });
  await page.goto("/video");
  await expect(page.getByRole("heading", { name: /clip tracking/i })).toBeVisible();
  // Crossing scene is preselected; continue to tracks.
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByRole("heading", { name: /tracks/i })).toBeVisible();
  // Seek into the phone window, select it through the overlay, continue.
  await page.getByRole("button", { name: /jump to appearance/i }).nth(2).click();
  await page.getByRole("button", { name: /phone \(track/i }).click();
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want phone.", { exact: true })).toBeVisible();
  // Approve hands off to the composer — this page never speaks.
  await page.getByRole("button", { name: /approve for composer/i }).click();
  await expect(page.getByTestId("video-approve-notice")).toContainText(/no speech here/i);
  expect(apiRequests).toEqual([]);
});

test("keyboard-only selection path works end to end", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /^continue$/i }).focus();
  await page.keyboard.press("Enter");
  const jump = page.getByRole("button", { name: /jump to appearance/i }).nth(2);
  await jump.focus();
  await page.keyboard.press("Enter");
  // Jump seeks and selects: the overlay region reports pressed.
  const phone = page.getByRole("button", { name: /phone \(track/i });
  expect(await phone.getAttribute("aria-pressed")).toBe("true");
  await expect(page.getByText(/selected/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText("I want phone.", { exact: true })).toBeVisible();
});

test("empty timeline explains itself and offers a way back", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /empty motion/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText(/no object tracks/i).first()).toBeVisible();
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByRole("button", { name: /use synthetic fixtures/i })).toBeVisible();
});

test("video slice has no serious or critical axe findings", async ({ page }) => {
  await page.goto("/video");
  await page.getByRole("button", { name: /^continue$/i }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("actual local WebM frame → manual region → exact words → composer requires fresh Speak", async ({page}) => {
  const uploads: string[] = [];
  page.on("request", request => {if (request.method() !== "GET" || /\/api\//.test(request.url())) uploads.push(request.url());});
  await page.addInitScript({path:fileURLToPath(new URL("./stub-speech.js",import.meta.url))});
  await page.addInitScript(() => {
    const revoked: string[] = [];
    Object.defineProperty(window,"__revokedVideoUrls",{value:revoked});
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = url => {revoked.push(url); revoke(url);};
  });
  await page.goto("/video");
  await page.getByRole("button",{name:"Use local video"}).click();
  await page.getByLabel("Upload clip",{exact:true}).setInputFiles(localClip);
  await expect(page.getByRole("heading",{name:"Clip preview"})).toBeVisible();
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  const video=page.getByLabel("Local video playback");
  await expect(page.getByRole("button",{name:"Select current frame"})).toBeEnabled();
  await page.getByLabel("Seek time (seconds)").fill("0.5");
  await page.getByRole("button",{name:"Seek to time"}).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(.5,2);
  await page.getByRole("button",{name:"Select current frame"}).click();
  await expect(page.getByRole("heading",{name:"Selected frame at 0.500 seconds"})).toBeVisible();
  // Actual decode evidence: the yellow object is present in the captured pixels.
  const pixel = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext("2d")!.getImageData(80,45,1,1).data));
  expect(pixel[0]).toBeGreaterThan(180); expect(pixel[1]).toBeGreaterThan(150); expect(pixel[2]).toBeLessThan(80);
  const axe = await new AxeBuilder({page}).analyze();
  expect(axe.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  await page.getByLabel("Left",{exact:true}).fill("25");
  await page.getByLabel("Top",{exact:true}).fill("22");
  await page.getByLabel("Right",{exact:true}).fill("62");
  await page.getByLabel("Bottom",{exact:true}).fill("72");
  await page.getByRole("button",{name:"Confirm region",exact:true}).click();
  await page.getByLabel("My object or exact words").fill("My yellow cup");
  await page.getByRole("button",{name:"Confirm object and choose intent"}).click();
  await expect(page.getByText("My yellow cup",{exact:true}).last()).toBeVisible();
  await page.getByRole("button",{name:"Back",exact:true}).click();
  await expect(page.getByText("Manual region confirmed.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Confirm object and choose intent"}).click();
  await page.getByRole("button",{name:/approve for composer/i}).click();
  expect(await page.evaluate(() => (window as unknown as {__revokedVideoUrls:string[]}).__revokedVideoUrls.length)).toBe(1);
  await page.getByRole("link",{name:"Open in composer"}).click();
  await expect(page.getByTestId("handoff-provenance-notice")).toContainText("manual human selection");
  expect(await page.evaluate(() => (window as unknown as {__speakCalls: {text:string}[]}).__speakCalls)).toEqual([]);
  await page.getByRole("button",{name:/speak this sentence/i}).click();
  expect(await page.evaluate(() => (window as unknown as {__speakCalls: {text:string}[]}).__speakCalls.map(call => call.text))).toEqual(["My yellow cup"]);
  expect(uploads).toEqual([]);
});

test("invalid local video can be retried with real media", async ({page}) => {
  await page.goto("/video");await page.getByRole("button",{name:"Use local video"}).click();
  await page.getByLabel("Upload clip",{exact:true}).setInputFiles({name:"broken.webm",mimeType:"video/webm",buffer:Buffer.from("not a video")});
  await expect(page.getByTestId("video-capture-error")).toContainText("Could not read");
  await page.getByLabel("Upload clip",{exact:true}).setInputFiles(localClip);
  await expect(page.getByRole("heading",{name:"Clip preview"})).toBeVisible();
  await page.getByRole("button",{name:"Retake"}).click();
  await expect(page.getByRole("button",{name:"Upload clip",exact:true})).toBeVisible();
});

test.describe("synthetic browser camera recording", () => {
  test.use({launchOptions:{args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]}});
  test("records actual browser media without microphone audio and stops all camera tracks", async ({page,context}) => {
    await context.grantPermissions(["camera"]);
    await page.addInitScript({path:fileURLToPath(new URL("./stub-speech.js",import.meta.url))});
    await page.addInitScript(() => {
      const streams: MediaStream[] = [];
      Object.defineProperty(window,"__videoTestStreams",{value:streams});
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async constraints => {
        const stream = await getUserMedia(constraints); streams.push(stream); return stream;
      };
    });
    const apiRequests: string[] = [];
    page.on("request",request => {if (/\/api\//.test(request.url())) apiRequests.push(request.url());});
    await page.goto("/video");
    await page.getByRole("button",{name:"Use local video"}).click();
    expect(await page.evaluate(() => (window as unknown as {__videoTestStreams:MediaStream[]}).__videoTestStreams.length)).toBe(0);
    await page.getByRole("button",{name:"Open camera",exact:true}).click();
    await expect(page.getByLabel("Camera preview")).toBeVisible();
    await page.getByRole("button",{name:"Record (10s)",exact:true}).click();
    // Allow actual MediaRecorder chunks, rather than substituting fake blob bytes.
    await page.waitForTimeout(650);
    await page.getByRole("button",{name:/stop recording/i}).click();
    await expect(page.getByRole("heading",{name:"Clip preview"})).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as {__videoTestStreams:MediaStream[]}).__videoTestStreams.every(stream => stream.getAudioTracks().length === 0 && stream.getTracks().every(track => track.readyState === "ended")))).toBe(true);
    await page.getByRole("button",{name:"Continue",exact:true}).click();
    await expect(page.getByRole("button",{name:"Select current frame"})).toBeEnabled();
    await page.getByRole("button",{name:"Select current frame"}).click();
    await expect(page.getByRole("img",{name:/frozen local video frame/i})).toBeVisible();
    await page.getByRole("button",{name:"Confirm region",exact:true}).click();
    await page.getByLabel("Reviewed catalog object").selectOption("water");
    await page.getByRole("button",{name:"Confirm object and choose intent"}).click();
    await expect(page.getByText("I want water.",{exact:true})).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as {__speakCalls:unknown[]}).__speakCalls)).toEqual([]);
    expect(apiRequests).toEqual([]);
  });
});
