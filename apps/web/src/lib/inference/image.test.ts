// @vitest-environment node
import { it, expect } from "vitest";
import sharp from "sharp";
import { normalizeImage, readImage } from "./image";
it("normalizes orientation, bounds dimensions, strips metadata, hashes exact bytes", async () => {
  const original = await sharp({
    create: { width: 1000, height: 800, channels: 3, background: "#fff" },
  })
    .jpeg()
    .withMetadata({
      exif: { IFD0: { Copyright: "synthetic private metadata" } },
    })
    .toBuffer();
  const r = await normalizeImage(original);
  expect(r.width).toBe(512);
  expect(r.height).toBe(410);
  const m = await sharp(r.bytes).metadata();
  expect(m.exif).toBeUndefined();
  expect(m.format).toBe("png");
  expect(r.sha256).toHaveLength(64);
});
it("rejects SVG and unrecognized bytes", async () => {
  await expect(
    normalizeImage(Buffer.from('<svg width="1" height="1"></svg>')),
  ).rejects.toThrow();
  await expect(normalizeImage(new Uint8Array([1, 2]))).rejects.toThrow();
});
it("rejects oversized streaming input and wrong content type", async () => {
  await expect(
    readImage(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: new Uint8Array(5000001),
      }),
    ),
  ).rejects.toThrow();
  await expect(
    readImage(new Request("http://localhost", { method: "POST", body: "no" })),
  ).rejects.toThrow();
});
