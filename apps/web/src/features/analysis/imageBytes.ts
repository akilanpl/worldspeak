/** Client-side data-URL → upload bytes. No network, no EXIF surprises beyond
 * what the capture panel already normalized (camera frames are canvas
 * re-encodes; uploads keep their bytes and the server strips metadata). */

export const MAX_UPLOAD_BYTES = 5_000_000;

export interface ImageBytes {
  bytes: Uint8Array;
  mime: string;
}

export function dataUrlToBytes(dataUrl: string): ImageBytes {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) throw new Error("not a data URL");
  const head = dataUrl.slice(5, comma);
  const [mime = ""] = head.split(";", 1);
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp") {
    throw new Error(`unsupported image type: ${mime || "unknown"}`);
  }
  const b64 = dataUrl.slice(comma + 1);
  if (!b64) throw new Error("empty image");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (bytes.length === 0) throw new Error("empty image");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error("image exceeds the 5 MB upload limit");
  return { bytes, mime };
}
