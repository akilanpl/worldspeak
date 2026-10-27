import { isNormalizedBox, type RasterMask } from "./types";

export const MAX_MASK_SIDE = 512;
export const MAX_MASK_PIXELS = MAX_MASK_SIDE * MAX_MASK_SIDE;
export const MAX_MASKS = 32;
// At most 1 MiB binary + 4 MiB canvas backing across a result set.
export const MAX_TOTAL_MASK_PIXELS = 1024 * 1024;
const MAX_BASE64 = 4 * Math.ceil(MAX_MASK_PIXELS / 3);

/** Validate before allocating or decoding; never accepts a data URL or URL. */
export function decodeRasterMask(value: unknown): RasterMask | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const { width, height, bounds, rasterBase64 } = raw;
  if (typeof width !== "number" || !Number.isInteger(width) || width < 1 || width > MAX_MASK_SIDE ||
      typeof height !== "number" || !Number.isInteger(height) || height < 1 || height > MAX_MASK_SIDE ||
      !isNormalizedBox(bounds) || typeof rasterBase64 !== "string" ||
      rasterBase64.length > MAX_BASE64 || rasterBase64.length !== 4 * Math.ceil(width * height / 3) ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(rasterBase64)) return null;
  try {
    const binary = atob(rasterBase64);
    // Canonical encoding also rejects nonzero padding bits ignored by atob.
    if (binary.length !== width * height || btoa(binary) !== rasterBase64) return null;
    const pixels = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      const byte = binary.charCodeAt(i);
      if (byte !== 0 && byte !== 1) return null;
      pixels[i] = byte;
    }
    return { pixels, width, height, bounds };
  } catch { return null; }
}

/** Defensive renderer boundary, including callers outside the API adapter. */
export function isRasterMask(value: unknown): value is RasterMask {
  if (!value || typeof value !== "object") return false;
  const raw = value as RasterMask;
  return Number.isInteger(raw.width) && raw.width >= 1 && raw.width <= MAX_MASK_SIDE &&
    Number.isInteger(raw.height) && raw.height >= 1 && raw.height <= MAX_MASK_SIDE &&
    isNormalizedBox(raw.bounds) && raw.pixels instanceof Uint8Array &&
    raw.pixels.length === raw.width * raw.height && raw.pixels.every(p => p === 0 || p === 1);
}
