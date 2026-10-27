import { describe, expect, it } from "vitest";
import { decodeRasterMask, isRasterMask, MAX_TOTAL_MASK_PIXELS } from "./rasterMask";
import { adaptSegmentationList } from "../integration/adapters";
const bounds = { x1: 0.25, y1: 0.125, x2: 0.75, y2: 0.625 };
const raw = { objectId: "7", width: 2, height: 2, bounds, rasterBase64: "AAEBAA==" };
const detection = { objectId: "7", label: "chair", catalogId: null, confidence: .9, box: bounds, mask: null };
describe("bounded binary SAM raster and stable association", () => {
  it("decodes row-major pixels and leaves empty masks transparent", () => {
    expect([...decodeRasterMask(raw)!.pixels]).toEqual([0, 1, 1, 0]);
    expect([...decodeRasterMask({ ...raw, rasterBase64: "AAAAAA==" })!.pixels]).toEqual([0, 0, 0, 0]);
  });
  it.each([
    { rasterBase64: "!!!!" }, { rasterBase64: "data:image/png;base64,AAEBAA==" },
    { rasterBase64: "AAEBAA== " }, { rasterBase64: "AAEBAA" }, { rasterBase64: "AAEBA===" },
    { rasterBase64: "AAEBAh==" }, { rasterBase64: "AAIBAA==" }, { rasterBase64: "AAAA" },
    { width: 0 }, { height: -1 }, { width: 1.5 }, { height: 513 }, { width: Infinity },
    { bounds: { ...bounds, x1: NaN } }, { bounds: { ...bounds, x2: 1.1 } },
    { bounds: { ...bounds, x2: .25 } }, { rasterBase64: "A".repeat(350000) },
  ])("rejects malformed data/dimensions/geometry before rendering", patch => {
    expect(decodeRasterMask({ ...raw, ...patch })).toBeNull();
  });
  it("defends the decoded renderer boundary", () => {
    expect(isRasterMask(decodeRasterMask(raw))).toBe(true);
    expect(isRasterMask({ ...decodeRasterMask(raw), pixels: new Uint8Array([0, 1, 2, 0]) })).toBe(false);
  });
  it("joins reordered, same-label overlapping detections by ID only", () => {
    const second = { ...raw, objectId: "9", rasterBase64: "AQAAAQ==" };
    const batch = adaptSegmentationList([{ ...detection, objectId: "9" }, detection], [raw, second], () => crypto.randomUUID());
    expect(batch.rejected).toBe(0);
    expect([...batch.accepted[0]!.rasterMask!.pixels]).toEqual([1, 0, 0, 1]);
    expect([...batch.accepted[1]!.rasterMask!.pixels]).toEqual([0, 1, 1, 0]);
    expect(batch.accepted[0]!.mask).toBeNull();
  });
  it.each([
    [[detection], []], [[{ ...detection, objectId: undefined }], [raw]],
    [[detection, detection], [raw, { ...raw, objectId: "9" }]],
    [[detection, { ...detection, objectId: "9" }], [raw, raw]],
    [[detection], [{ ...raw, objectId: "other" }]],
    [[detection], [{ ...raw, rasterBase64: "broken" }]],
    [Array(33).fill(detection), Array(33).fill(raw)],
  ])("rejects an ambiguous or malformed complete mask batch", (detections, masks) => {
    expect(adaptSegmentationList(detections, masks, () => "test")).toEqual({ accepted: [], rejected: 1 });
  });
  it("bounds aggregate decoded/canvas memory", () => {
    const mask = { ...raw, width: 512, height: 512, rasterBase64: btoa("\0".repeat(512 * 512)) };
    const masks = Array.from({ length: 5 }, (_, i) => ({ ...mask, objectId: String(i) }));
    const detections = masks.map(m => ({ ...detection, objectId: m.objectId }));
    expect(MAX_TOTAL_MASK_PIXELS).toBe(4 * 512 * 512);
    expect(adaptSegmentationList(detections, masks, () => "test").accepted).toEqual([]);
    expect(adaptSegmentationList(detections.slice(0, 4), masks.slice(0, 4), () => "test").accepted).toHaveLength(4);
  });
});
