export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export const MAX_PICTOGRAMS = 8;
export const MAX_PIXELS = 4_000_000;

export function validateImageFile(file: Pick<File, "type" | "size">): void {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPEG or WebP image. SVG and animated GIF are not supported.");
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES)
    throw new Error("Choose an image between 1 byte and 2 MiB.");
}

export function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > MAX_PIXELS)
    throw new Error("Choose an image with at most 4 million pixels.");
}

/** Bounded container scan rejects oversized/animated images before browser decoding. */
export function validateImageHeader(bytes: Uint8Array, type: string): void {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const bad = () => { throw new Error("Choose a valid PNG, JPEG or WebP image; its header is invalid."); };
  if (type === "image/png") {
    if (bytes.length < 33 || ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) || ascii(12, 16) !== "IHDR") return bad();
    validateDimensions(data.getUint32(16), data.getUint32(20));
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = data.getUint32(offset);
      if (size > bytes.length - offset - 12) return bad();
      if (ascii(offset + 4, offset + 8) === "acTL") throw new Error("Animated PNG is not supported. Choose a static image.");
      offset += size + 12;
    }
    return;
  }
  if (type === "image/jpeg") {
    if (bytes[0] !== 255 || bytes[1] !== 216) return bad();
    let found = false;
    for (let offset = 2; offset + 1 < bytes.length;) {
      if (bytes[offset++] !== 255) return bad();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker !== undefined && marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) return bad();
      const size = data.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) return bad();
      if (marker !== undefined && [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (size < 8) return bad();
        validateDimensions(data.getUint16(offset + 5), data.getUint16(offset + 3)); found = true;
      }
      offset += size;
    }
    if (!found) return bad();
    return;
  }
  if (type === "image/webp") {
    if (bytes.length < 20 || ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WEBP" || data.getUint32(4, true) + 8 !== bytes.length) return bad();
    let found = false;
    const u24 = (offset: number) => bytes[offset]! + bytes[offset + 1]! * 256 + bytes[offset + 2]! * 65536;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const kind = ascii(offset, offset + 4), size = data.getUint32(offset + 4, true), start = offset + 8;
      if (size > bytes.length - start) return bad();
      if (kind === "ANIM" || kind === "ANMF") throw new Error("Animated WebP is not supported. Choose a static image.");
      if (kind === "VP8X") {
        if (size < 10) return bad();
        if (bytes[start]! & 2) throw new Error("Animated WebP is not supported. Choose a static image.");
        validateDimensions(u24(start + 4) + 1, u24(start + 7) + 1); found = true;
      } else if (kind === "VP8 ") {
        if (size < 10 || bytes[start + 3] !== 157 || bytes[start + 4] !== 1 || bytes[start + 5] !== 42) return bad();
        validateDimensions(data.getUint16(start + 6, true) & 16383, data.getUint16(start + 8, true) & 16383); found = true;
      } else if (kind === "VP8L") {
        if (size < 5 || bytes[start] !== 47) return bad();
        const bits = data.getUint32(start + 1, true);
        validateDimensions((bits & 16383) + 1, ((bits >>> 14) & 16383) + 1); found = true;
      }
      offset = start + size + (size % 2);
    }
    if (!found) return bad();
    return;
  }
  return bad();
}

const aborted = () => new DOMException("Image reading canceled.", "AbortError");
function readBytes(file: File, signal?: AbortSignal): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(aborted()); return; }
    const reader = new FileReader();
    const cleanup = () => { signal?.removeEventListener("abort", cancel); reader.onload = null; reader.onerror = null; reader.onabort = null; };
    const cancel = () => { cleanup(); reader.abort(); reject(aborted()); };
    reader.onload = () => { const result = reader.result as ArrayBuffer; cleanup(); resolve(new Uint8Array(result)); };
    reader.onerror = () => { cleanup(); reject(new Error("Unable to read image header.")); };
    reader.onabort = () => { cleanup(); reject(aborted()); };
    signal?.addEventListener("abort", cancel, { once: true });
    reader.readAsArrayBuffer(file);
  });
}

/** Caller owns successful URL. Aborting immediately stops reads/decodes and revokes it. */
export async function loadLocalImage(file: File, signal?: AbortSignal): Promise<string> {
  validateImageFile(file);
  const bytes = await readBytes(file, signal);
  if (signal?.aborted) throw aborted();
  validateImageHeader(bytes, file.type);
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => finish(new Error("Image decoding timed out. Try another image.")), 10_000);
      const cancel = () => finish(aborted());
      function finish(error?: Error) {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
        image.onload = null; image.onerror = null; image.src = "";
        if (error) reject(error); else resolve();
      }
      image.onload = () => {
        try { validateDimensions(image.naturalWidth, image.naturalHeight); finish(); }
        catch (error) { finish(error instanceof Error ? error : new Error("Invalid image.")); }
      };
      image.onerror = () => finish(new Error("This image could not be decoded. Try another image."));
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel(); else image.src = url;
    });
    return url;
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
