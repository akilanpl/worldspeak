import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const localClip = fileURLToPath(new URL("./fixtures/manual-region.webm", import.meta.url));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const calls = (page: Page) => page.evaluate(() => (window as unknown as {__speakCalls:{text:string}[]}).__speakCalls);

/** Integration regression: all three sources share a composer, never its prior speech approval. */
test("manual video, pictogram and camera drafts stay distinct and need fresh Speak", async ({page}) => {
  await page.addInitScript({path:fileURLToPath(new URL("./stub-speech.js", import.meta.url))});
  const apiRequests: string[] = [];
  page.on("request", request => {if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());});
  await page.goto("/video");
  await page.evaluate(() => Object.defineProperty(window,"__multimodalTabMarker",{value:1}));
  const keys: string[] = [];
  async function approveAndSpeak(text: string, provenance: string, previous: number) {
    await page.getByRole("button",{name:/approve for composer/i}).click();
    await page.getByRole("link",{name:"Open in composer"}).click();
    await expect(page.getByText(text,{exact:true})).toBeVisible();
    await expect(page.getByTestId("handoff-provenance-notice")).toContainText(provenance);
    keys.push(new URL(page.url()).searchParams.get("handoff")!);
    expect(keys.at(-1)).toMatch(/^ws-handoff-/);
    expect(new Set(keys).size).toBe(keys.length);
    expect(await calls(page)).toHaveLength(previous);
    await page.getByRole("button",{name:/speak this sentence/i}).click();
    expect((await calls(page)).map(call => call.text)).toHaveLength(previous + 1);
    expect((await calls(page)).at(-1)?.text).toBe(text);
  }

  await page.getByRole("button",{name:"Use local video"}).click();
  await page.getByLabel("Upload clip",{exact:true}).setInputFiles(localClip);
  await expect(page.getByRole("heading",{name:"Clip preview"})).toBeVisible();
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await expect(page.getByRole("button",{name:"Select current frame"})).toBeEnabled();
  await page.getByRole("button",{name:"Select current frame"}).click();
  await page.getByRole("button",{name:"Confirm region",exact:true}).click();
  await page.getByLabel("My object or exact words").fill("My video words");
  await page.getByRole("button",{name:"Confirm object and choose intent"}).click();
  await expect(page.getByRole("heading",{name:"See and choose (prototype)"})).toBeFocused();
  await approveAndSpeak("My video words","manual human selection",0);

  await page.getByRole("link",{name:"Pictograms",exact:true}).click();
  await page.getByLabel("Local image").setInputFiles({name:"local.png",mimeType:"image/png",buffer:png});
  await page.getByLabel("My exact meaning or words").fill("My pictogram words");
  await page.getByLabel("Image description for accessibility").fill("Local communication symbol");
  await page.getByRole("button",{name:"Create pictogram",exact:true}).click();
  await page.getByRole("button",{name:/Use pictogram:/}).click();
  await approveAndSpeak("My pictogram words","personalized pictogram",1);
  await expect(page.getByTestId("handoff-provenance-notice").locator('[lang="ta"]')).not.toContainText("வீடியோ");
  await expect(page.getByText("My video words",{exact:true})).toHaveCount(0);

  await page.getByRole("link",{name:"Camera",exact:true}).click();
  await page.getByRole("button",{name:"Continue",exact:true}).first().click();
  await page.getByRole("button",{name:/water.*fixture/i}).click();
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await approveAndSpeak("I want water.","demo fixture",2);
  await expect(page.getByText("My pictogram words",{exact:true})).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as {__multimodalTabMarker:number}).__multimodalTabMarker)).toBe(1);
  expect(apiRequests).toEqual([]);
});
