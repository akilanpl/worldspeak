// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  buildRequest,
  MetaProvider,
  parseProviderResponse,
  ProviderError,
  type ProviderInput,
} from "../src/providers";
import { sparkCost } from "../src/budget";
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const image = {
  bytes,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  width: 5,
  height: 5,
};
const input: ProviderInput = { image, operation: "scene", concept: null };
export const scene = {
  id: "synthetic-response",
  model: "muse-spark-1.3",
  status: "completed",
  usage: { input_tokens: 200, output_tokens: 100 },
  output: [
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: JSON.stringify({
            detections: [
              {
                label: "chair",
                box: { x1: 0, y1: 0, x2: 1, y2: 1 },
                confidence: null,
              },
            ],
          }),
        },
      ],
    },
  ],
};
function sam(text: string) {
  return {
    id: "synthetic-sam",
    model: "sam-3.1",
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  };
}
const segment: ProviderInput = {
  ...input,
  operation: "segment",
  concept: "chair",
};
// Public parser README's 5x5 synthetic conformance mask; never captured/live data.
const maskLine =
  "<0f>7<|box;x1=0;y1=0;x2=4;y2=4;w=5;h=5;c=0.8|><|mask;x=0;y=0;c=0.8;data=5,5,!!!!!(QO(0lu8?|>";
describe("official-wire synthetic providers (no network)", () => {
  it("uses Standard model, stateless Responses schema, no tools or history", () => {
    const body = buildRequest(input);
    expect(body.model).toBe("muse-spark-1.3");
    expect(body.store).toBe(false);
    expect(body.stream).toBe(false);
    expect("text" in body && body.text.format.strict).toBe(true);
    expect(body).not.toHaveProperty("previous_response_id");
    expect(buildRequest(segment)).toMatchObject({
      model: "sam-3.1",
      metadata: { mask_encoding: "one_bit", include_confidence: "true" },
    });
  });
  it("never infers intent/catalog identity; preserves fixture provenance", async () => {
    const r = await parseProviderResponse(scene, input, "fixture");
    expect(r.detections[0]).toMatchObject({
      label: "chair",
      catalogId: null,
      mask: null,
      confidence: null,
    });
    expect(r).not.toHaveProperty("intent");
    expect(r.provenance.source).toBe("fixture");
    expect(r.provenance.costMicroUsd).toBe(675);
  });
  it("rounds micro USD up with integer arithmetic", () => {
    expect(sparkCost(1, 0)).toBe(2);
    expect(sparkCost(0, 1)).toBe(5);
    expect(() => sparkCost(1.2, 0)).toThrow();
  });
  it("decodes real SAM grammar into adapter boxes and exact separate raster", async () => {
    const r = await parseProviderResponse(sam(maskLine), segment, "fixture");
    expect(r.detections).toEqual([
      {
        label: "chair",
        catalogId: null,
        box: { x1: 0, y1: 0, x2: 1, y2: 1 },
        mask: null,
        confidence: 0.8,
      },
    ]);
    expect(
      Buffer.from(r.segmentationMasks[0]!.rasterBase64, "base64"),
    ).toHaveLength(25);
    expect(r.provenance.costMicroUsd).toBe(2500);
  });
  it("empty SAM matches are successful, never invented", async () => {
    expect(
      (await parseProviderResponse(sam(""), segment, "fixture")).detections,
    ).toEqual([]);
    expect(
      (
        await parseProviderResponse(
          { ...sam(""), output: [] },
          segment,
          "fixture",
        )
      ).detections,
    ).toEqual([]);
  });
  it.each([
    maskLine.replace("w=5", "w=6"),
    maskLine.replace("data=5,5", "data=99999999,99999999"),
    maskLine.replace("(QO(0lu8?", "broken"),
    maskLine.replace("<0f>", "<1f>"),
    maskLine + "junk",
  ])(
    "rejects malformed/out-of-frame masks with known SAM charge",
    async (text) => {
      await expect(
        parseProviderResponse(sam(text), segment),
      ).rejects.toMatchObject({
        code: "INVALID_MODEL_OUTPUT",
        chargeMicroUsd: 2500,
      });
    },
  );
  it("bad JSON, additional intent, invalid geometry reject with accounted usage", async () => {
    for (const text of [
      "not JSON",
      JSON.stringify({ detections: [], intent: "want" }),
      JSON.stringify({
        detections: [
          { label: "a", box: { x1: 1, y1: 0, x2: 0, y2: 1 }, confidence: 0.5 },
        ],
      }),
    ])
      await expect(
        parseProviderResponse(
          {
            ...scene,
            output: [
              { type: "message", content: [{ type: "output_text", text }] },
            ],
          },
          input,
        ),
      ).rejects.toMatchObject({
        code: "INVALID_MODEL_OUTPUT",
        chargeMicroUsd: 675,
      });
  });
  it("missing usage or wrong model is uncertain, never free", async () => {
    await expect(
      parseProviderResponse({ ...scene, usage: {} }, input),
    ).rejects.toMatchObject({ chargeMicroUsd: null });
    await expect(
      parseProviderResponse(
        { ...scene, model: "muse-spark-1.3-contributor" },
        input,
      ),
    ).rejects.toMatchObject({ chargeMicroUsd: null });
  });
  it("disabled provider performs no HTTP requests", async () => {
    const http = vi.fn();
    const p = new MetaProvider({
      apiKey: "synthetic",
      liveApproved: false,
      fetchImpl: http,
    });
    await expect(
      p.prepare(input, new AbortController().signal),
    ).rejects.toMatchObject({ code: "LIVE_NOT_APPROVED" });
    expect(http).not.toHaveBeenCalled();
  });
  it("authoritative token preflight precedes exactly one generation, output validates", async () => {
    const http = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ input_tokens: 500 }))
      .mockResolvedValueOnce(Response.json(scene));
    const p = new MetaProvider({
      apiKey: "synthetic",
      liveApproved: true,
      fetchImpl: http,
    });
    const c = await p.prepare(input, new AbortController().signal);
    expect(http).not.toHaveBeenCalled();
    await c.send(new AbortController().signal);
    expect(http).toHaveBeenCalledTimes(2);
    expect(http.mock.calls[0]![0]).toBe(
      "https://api.meta.ai/v1/responses/input_tokens",
    );
    expect(http.mock.calls[1]![1]).toMatchObject({ redirect: "error" });
    await expect(c.send(new AbortController().signal)).rejects.toMatchObject({
      code: "DUPLICATE_SEND",
    });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it("over-bound tokens prevent any generation", async () => {
    const http = vi
      .fn()
      .mockResolvedValue(Response.json({ input_tokens: 10001 }));
    const p = new MetaProvider({
      apiKey: "synthetic",
      liveApproved: true,
      fetchImpl: http,
    });
    const prepared = await p.prepare(input, new AbortController().signal);
    await expect(
      prepared.send(new AbortController().signal),
    ).rejects.toMatchObject({ code: "INPUT_TOKEN_CAP", chargeMicroUsd: 0 });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("network failure after dispatch is uncertain with zero retries", async () => {
    const http = vi.fn().mockRejectedValue(Error("synthetic disconnect"));
    const p = new MetaProvider({
      apiKey: "synthetic",
      liveApproved: true,
      fetchImpl: http,
    });
    const c = await p.prepare(segment, new AbortController().signal);
    await expect(c.send(new AbortController().signal)).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("image digest mismatch rejects before any send", () => {
    expect(() =>
      buildRequest({ ...input, image: { ...image, sha256: "0".repeat(64) } }),
    ).toThrow();
  });
});
