import { describe, expect, it } from "vitest";
import { dataUrlToBytes } from "./imageBytes";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("dataUrlToBytes", () => {
  it("decodes PNG data URLs to bytes", () => {
    const { bytes, mime } = dataUrlToBytes(tinyPng);
    expect(mime).toBe("image/png");
    expect(bytes.length).toBeGreaterThan(0);
    // PNG magic
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("rejects non-image, empty, and oversized inputs", () => {
    expect(() => dataUrlToBytes("not-a-url")).toThrow();
    expect(() => dataUrlToBytes("data:image/png;base64,")).toThrow();
    expect(() => dataUrlToBytes("data:image/gif;base64,AAAA")).toThrow(/unsupported/);
    const big = `data:image/png;base64,${"A".repeat(7_000_000)}`;
    expect(() => dataUrlToBytes(big)).toThrow(/5 MB/);
  });
});
