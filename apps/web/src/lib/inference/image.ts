import sharp from "sharp";
import { createHash } from "node:crypto";
/** Decode allowlisted raster formats, reject animation, normalize orientation,
 * strip metadata and re-encode PNG. No URLs, SVG, PDF or remote fetch. */
export async function normalizeImage(bytes: Uint8Array) {
  const m = await sharp(bytes, {
    limitInputPixels: 16000000,
    animated: false,
  }).metadata();
  if (
    !m.format ||
    !["jpeg", "png", "webp"].includes(m.format) ||
    (m.pages ?? 1) !== 1
  )
    throw Error("UNSUPPORTED_MEDIA");
  const { data, info } = await sharp(bytes, { limitInputPixels: 16000000 })
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  if (data.length > 1048576) throw Error("IMAGE_TOO_LARGE");
  return {
    bytes: data,
    width: info.width,
    height: info.height,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}
export async function readImage(request: Request): Promise<Uint8Array> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(
      request.headers.get("content-type") ?? "",
    )
  )
    throw Error("UNSUPPORTED_MEDIA");
  const reader = request.body?.getReader();
  if (!reader) throw Error("EMPTY_IMAGE");
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 15000);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5000000) throw Error("IMAGE_TOO_LARGE");
      chunks.push(value);
    }
    if (timedOut) throw Error("IMAGE_TIMEOUT");
    if (size === 0) throw Error("EMPTY_IMAGE");
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(deadline);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
