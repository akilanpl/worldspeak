// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseProviderResponse, type ProviderInput } from "@worldspeak/inference";
import { adaptSegmentationList } from "./adapters";
import { boxToPercent } from "../perception/geometry";

// Official grammar conformance fixture, not a real SAM receipt or chair mask.
const wire = "<0f>7<|box;x1=0;y1=0;x2=4;y2=4;w=5;h=5;c=0.8|><|mask;x=0;y=0;c=0.8;data=5,5,!!!!!(QO(0lu8?|>";
const bytes = new Uint8Array([1, 2, 3]);
const input: ProviderInput = { operation: "segment", concept: "chair", image: {
  bytes, width: 5, height: 5, sha256: createHash("sha256").update(bytes).digest("hex") } };
const response = (text: string) => ({ id: "synthetic-sam-overlay-test", model: "sam-3.1", status: "completed",
  output: [{ type: "message", content: [{ type: "output_text", text }] }] });
describe("synthetic SAM parser → browser adapter boundary (zero network)", () => {
  it("preserves raster, geometry and fixture provenance without inventing polygons or catalog intent", async () => {
    const result = await parseProviderResponse(response(wire), input, "fixture");
    expect(result.provenance).toMatchObject({ source: "fixture", model: "sam-3.1", responseId: "synthetic-sam-overlay-test", costMicroUsd: 2500 });
    const batch = adaptSegmentationList(result.detections, result.segmentationMasks, () => "synthetic-object");
    expect(batch.rejected).toBe(0);
    expect(batch.accepted[0]).toMatchObject({ labelEn: "chair", catalogId: null, mask: null, box: { x1: 0, y1: 0, x2: 1, y2: 1 } });
    expect(boxToPercent(batch.accepted[0]!.box)).toEqual({ left: "0%", top: "0%", width: "100%", height: "100%" });
    const mask = result.segmentationMasks[0]!;
    const raster = Buffer.from(mask.rasterBase64, "base64");
    expect(raster.length).toBe(mask.width * mask.height);
    expect([...raster].every(p => p === 0 || p === 1)).toBe(true);
    // Adapter origin describes geometry source; callers must retain provenance.
    // The live status hook rejects source:fixture rather than claiming inference.
    expect(result.detections[0]!.mask).toBeNull();
    expect([...batch.accepted[0]!.rasterMask!.pixels]).toEqual([...raster]);
  });
  it.each([wire.replace("data=5,5", "data=6,5"), wire.replace("x2=4", "x2=99"), wire.replace("(QO(0lu8?", "invalid")])("rejects malformed SAM before geometry reaches the browser", async text => {
    await expect(parseProviderResponse(response(text), input, "fixture")).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT", chargeMicroUsd: 2500 });
  });
});
