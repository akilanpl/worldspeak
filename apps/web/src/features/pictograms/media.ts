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

async function validateSignature(file: File): Promise<void> {
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error("Unable to read image header."));
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (!((file.type === "image/png" && png) || (file.type === "image/jpeg" && jpeg) || (file.type === "image/webp" && webp)))
    throw new Error("Choose a valid PNG, JPEG or WebP image; the image header does not match its format.");
}

/** Decode only a local blob URL; caller owns successful URL until deletion. */
export async function loadLocalImage(file: File): Promise<string> {
  validateImageFile(file);
  await validateSignature(file);
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => finish(new Error("Image decoding timed out. Try another image.")), 10_000);
      function finish(error?: Error) {
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        image.src = "";
        if (error) reject(error); else resolve();
      }
      image.onload = () => {
        try { validateDimensions(image.naturalWidth, image.naturalHeight); finish(); }
        catch (error) { finish(error instanceof Error ? error : new Error("Invalid image.")); }
      };
      image.onerror = () => finish(new Error("This image could not be decoded. Try another image."));
      image.src = url;
    });
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
