// @vitest-environment node
import { it, expect, vi } from "vitest";
import { runOnce, type WorkerStore } from "../src/runner";
import { ProviderError, type Provider } from "../src/providers";
import type { InferenceResult } from "@worldspeak/contracts";
const result: InferenceResult = {
  detections: [],
  tracks: [],
  segmentationMasks: [],
  provenance: {
    source: "fixture",
    model: "muse-spark-1.3",
    adapterVersion: "meta-v1",
    responseId: "fixture",
    inputSha256: "0".repeat(64),
    inputTokens: 0,
    outputTokens: 0,
    costMicroUsd: 100,
  },
};
function fixture() {
  const order: string[] = [];
  const send = vi.fn(async () => {
    order.push("send");
    return result;
  });
  const provider: Provider = { prepare: vi.fn(async () => ({ send })) };
  const store: WorkerStore = {
    claim: vi.fn(async () => ({
      id: "synthetic-job",
      leaseToken: "synthetic-token",
      operation: "scene" as const,
      concept: null,
    })),
    load: vi.fn(async () => ({
      bytes: new Uint8Array(),
      sha256: "",
      width: 1,
      height: 1,
    })),
    heartbeat: vi.fn(async () => true),
    dispatch: vi.fn(async () => {
      order.push("committed-dispatch");
      return true;
    }),
    finish: vi.fn(async () => true),
  };
  return { store, provider, send, order };
}
it("commits dispatch before send; settles verified synthetic output once", async () => {
  const f = fixture();
  expect(await runOnce(f.store, f.provider)).toBe("finished");
  expect(f.order).toEqual(["committed-dispatch", "send"]);
  expect(f.store.finish).toHaveBeenCalledWith(
    expect.anything(),
    "succeeded",
    100,
    result,
    null,
  );
});
it("revocation/stale lease at dispatch never sends", async () => {
  const f = fixture();
  f.store.dispatch = vi.fn(async () => false);
  f.store.finish = vi.fn(async () => false);
  expect(await runOnce(f.store, f.provider)).toBe("lost");
  expect(f.send).not.toHaveBeenCalled();
});
it("preflight failure releases reservation without a paid attempt", async () => {
  const f = fixture();
  f.provider.prepare = vi.fn(async () => {
    throw new ProviderError("INPUT_TOKEN_CAP", 0);
  });
  await runOnce(f.store, f.provider);
  expect(f.store.dispatch).not.toHaveBeenCalled();
  expect(f.send).not.toHaveBeenCalled();
  expect(f.store.finish).toHaveBeenCalledWith(
    expect.anything(),
    "failed",
    0,
    null,
    "INPUT_TOKEN_CAP",
  );
});
it("disconnect after dispatch holds reservation and never retries", async () => {
  const f = fixture();
  f.send.mockRejectedValue(Error("disconnect"));
  await runOnce(f.store, f.provider);
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(f.store.finish).toHaveBeenCalledWith(
    expect.anything(),
    "uncertain",
    null,
    null,
    "TIMEOUT_UNCERTAIN",
  );
});
it("known billed validation failure settles actual usage", async () => {
  const f = fixture();
  f.send.mockRejectedValue(new ProviderError("INVALID_MODEL_OUTPUT", 500));
  await runOnce(f.store, f.provider);
  expect(f.store.finish).toHaveBeenCalledWith(
    expect.anything(),
    "failed",
    500,
    null,
    "INVALID_MODEL_OUTPUT",
  );
});
it("late response under lost lease cannot publish or retry", async () => {
  const f = fixture();
  f.store.finish = vi.fn(async () => false);
  expect(await runOnce(f.store, f.provider)).toBe("lost");
  expect(f.send).toHaveBeenCalledTimes(1);
});
it("heartbeat cancellation aborts the upstream request; cancellation is not a refund", async () => {
  vi.useFakeTimers();
  try {
    const f = fixture();
    f.store.heartbeat = vi.fn(async () => false);
    f.provider.prepare = vi.fn(async () => ({
      send: async (signal: AbortSignal) =>
        new Promise<InferenceResult>((_, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new ProviderError("TIMEOUT_UNCERTAIN", null)),
            { once: true },
          ),
        ),
    }));
    const running = runOnce(f.store, f.provider);
    await vi.advanceTimersByTimeAsync(10001);
    await running;
    expect(f.store.finish).toHaveBeenCalledWith(
      expect.anything(),
      "uncertain",
      null,
      null,
      "TIMEOUT_UNCERTAIN",
    );
  } finally {
    vi.useRealTimers();
  }
});
