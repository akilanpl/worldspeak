import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLocalImage, MAX_IMAGE_BYTES, validateDimensions, validateImageFile, validateImageHeader } from "./media";

function pngHeader(width = 1, height = 1) {
  const bytes = new Uint8Array(33); bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer); view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12);
  view.setUint32(16, width); view.setUint32(20, height); return bytes;
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("bounded local pictogram media", () => {
  it("rejects empty, oversized and unsupported media", () => {
    for (const type of ["image/svg+xml", "image/gif", "text/html", "", "video/mp4"])
      expect(() => validateImageFile({ type, size: 12 })).toThrow(/PNG/);
    for (const size of [0, MAX_IMAGE_BYTES + 1])
      expect(() => validateImageFile({ type: "image/png", size })).toThrow(/2 MiB/);
    expect(() => validateImageFile({ type: "image/webp", size: MAX_IMAGE_BYTES })).not.toThrow();
  });
  it("rejects renamed non-raster content before creating a URL", async () => {
    const create = vi.fn(); vi.stubGlobal("URL", { createObjectURL: create });
    await expect(loadLocalImage(new File(["<svg></svg>"], "x.png", { type: "image/png" }))).rejects.toThrow(/header/);
    expect(create).not.toHaveBeenCalled();
  });
  it("checks PNG/JPEG/WebP dimensions before browser decoding", () => {
    expect(() => validateImageHeader(pngHeader(2001, 2000), "image/png")).toThrow(/4 million/);
    const jpeg = new Uint8Array([255,216,255,192,0,8,8,0,1,0,1,1,255,217]);
    expect(() => validateImageHeader(jpeg, "image/jpeg")).not.toThrow();
    new DataView(jpeg.buffer).setUint16(7, 65000);
    new DataView(jpeg.buffer).setUint16(9, 65000);
    expect(() => validateImageHeader(jpeg, "image/jpeg")).toThrow(/4 million/);
    const webp = new Uint8Array(30); const view = new DataView(webp.buffer);
    webp.set([82,73,70,70]); view.setUint32(4,22,true); webp.set([87,69,66,80,86,80,56,88],8); view.setUint32(16,10,true);
    expect(() => validateImageHeader(webp, "image/webp")).not.toThrow();
    webp[24] = 255; webp[25] = 255; webp[27] = 255; webp[28] = 255;
    expect(() => validateImageHeader(webp, "image/webp")).toThrow(/4 million/);
  });
  it("rejects animated PNG/WebP containers", () => {
    const animated = new Uint8Array(53); animated.set(pngHeader());
    new DataView(animated.buffer).setUint32(33,8); animated.set([97,99,84,76],37);
    expect(() => validateImageHeader(animated, "image/png")).toThrow(/Animated PNG/);
    const webp = new Uint8Array(30); const view = new DataView(webp.buffer);
    webp.set([82,73,70,70]); view.setUint32(4,22,true); webp.set([87,69,66,80,86,80,56,88],8); view.setUint32(16,10,true); webp[20] = 2;
    expect(() => validateImageHeader(webp, "image/webp")).toThrow(/Animated WebP/);
  });
  it("abort immediately clears an in-flight image and revokes its URL", async () => {
    const revoke = vi.fn(); const cleared = vi.fn(); let started!: () => void;
    const began = new Promise<void>((resolve) => { started = resolve; });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:pending"), revokeObjectURL: revoke });
    vi.stubGlobal("Image", class {
      onerror: (() => void) | null = null; onload: (() => void) | null = null;
      set src(value: string) { if (value) started(); else cleared(); }
    });
    const controller = new AbortController();
    const result = loadLocalImage(new File([pngHeader()], "x.png", { type: "image/png" }), controller.signal);
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await began; controller.abort(); await rejected;
    expect(cleared).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith("blob:pending");
  });
  it("aborts FileReader without beginning image decoding", async () => {
    const abort = vi.fn();
    vi.stubGlobal("FileReader", class {
      onload = null; onerror = null; onabort = null;
      readAsArrayBuffer() {} abort() { abort(); }
    });
    const create = vi.fn(); vi.stubGlobal("URL", { createObjectURL: create });
    const controller = new AbortController();
    const result = loadLocalImage(new File([pngHeader()], "x.png", { type: "image/png" }), controller.signal);
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
    controller.abort(); await rejected;
    expect(abort).toHaveBeenCalledOnce(); expect(create).not.toHaveBeenCalled();
  });
  it("bounds decoded dimensions and rejects invalid dimensions", () => {
    for (const [w, h] of [[0, 1], [1, -1], [Infinity, 1], [1.2, 2], [2001, 2000]])
      expect(() => validateDimensions(w!, h!)).toThrow();
    expect(() => validateDimensions(2000, 2000)).not.toThrow();
  });
  it("revokes corrupt local images and never accepts a decode failure", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:private"), revokeObjectURL: revoke });
    vi.stubGlobal("Image", class {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      set src(value: string) { if (value) queueMicrotask(() => this.onerror?.()); }
    });
    await expect(loadLocalImage(new File([pngHeader()], "x.png", { type: "image/png" }))).rejects.toThrow(/decoded/);
    expect(revoke).toHaveBeenCalledWith("blob:private");
  });
  it("rejects excessive decoded dimensions and releases the URL", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:large"), revokeObjectURL: revoke });
    vi.stubGlobal("Image", class {
      naturalWidth = 4000; naturalHeight = 4000;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      set src(value: string) { if (value) queueMicrotask(() => this.onload?.()); }
    });
    await expect(loadLocalImage(new File([pngHeader()], "x.png", { type: "image/png" }))).rejects.toThrow(/4 million/);
    expect(revoke).toHaveBeenCalledWith("blob:large");
  });
});
