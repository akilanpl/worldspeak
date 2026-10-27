import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLocalImage, MAX_IMAGE_BYTES, validateDimensions, validateImageFile } from "./media";

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
    await expect(loadLocalImage(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "x.png", { type: "image/png" }))).rejects.toThrow(/decoded/);
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
    await expect(loadLocalImage(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "x.png", { type: "image/png" }))).rejects.toThrow(/4 million/);
    expect(revoke).toHaveBeenCalledWith("blob:large");
  });
});
