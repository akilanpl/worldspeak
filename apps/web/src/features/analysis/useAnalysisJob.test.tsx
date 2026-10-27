import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useAnalysisJob, type AnalysisApi } from "./useAnalysisJob";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ASSET = "a8c6ef0e-766b-4c1a-809d-b7e7b038ae8d";
const JOB = "451d72f6-ea1b-4699-89ef-8c82a7b34590";

function Harness({ onApi }: { onApi: (api: AnalysisApi) => void }) {
  const api = useAnalysisJob();
  onApi(api);
  return null;
}

function renderHook() {
  let api!: AnalysisApi;
  render(
    <Harness
      onApi={(a) => {
        api = a;
      }}
    />,
  );
  return () => api;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function modelResult() {
  return {
    detections: [
      {
        label: "chair",
        catalogId: "chair",
        box: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.8 },
        mask: null,
        confidence: 0.9,
      },
    ],
    tracks: [],
    provenance: {
      source: "model",
      model: "muse-spark-1.3",
      adapterVersion: "meta-v1",
      responseId: "resp-1",
      inputSha256: "a".repeat(64),
      inputTokens: 10,
      outputTokens: 5,
      costMicroUsd: 30,
    },
    segmentationMasks: [],
  };
}

function jobView(status: string, extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      id: JOB,
      operation: "scene",
      status,
      cancelRequested: false,
      result: null,
      errorCode: null,
      reservedMicroUsd: 25,
      chargedMicroUsd: null,
      billingState: "reserved",
      expiresAt: "t",
      createdAt: "t",
      ...extra,
    },
  };
}

const bytes = new Uint8Array([1, 2, 3]);

describe("useAnalysisJob", () => {
  it("runs upload → job → validated model detections with no extra requests", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(init === undefined ? { url } : { url, init });
      if (url === "/api/v1/media") {
        expect(init?.headers).toMatchObject({
          "x-worldspeak-consent": "scene-v1",
        });
        return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
      }
      if (url === "/api/v1/jobs") {
        const body = JSON.parse(init?.body as string) as {
          idempotencyKey: string;
        };
        expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
        return jsonResponse(
          { ok: true, data: { jobId: JOB, pollAfterMs: 1000 } },
          202,
        );
      }
      return jsonResponse(jobView("succeeded", { result: modelResult() }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const getApi = renderHook();
    getApi().submit(bytes, "image/png", "scene");
    await vi.waitFor(() => expect(getApi().outcome.name).toBe("succeeded"));
    const done = getApi().outcome;
    expect(done).toMatchObject({
      name: "succeeded",
      jobId: JOB,
      model: "muse-spark-1.3",
    });
    if (done.name === "succeeded") {
      expect(done.objects).toHaveLength(1);
      expect(done.objects[0]).toMatchObject({
        labelEn: "chair",
        origin: "model",
      });
      expect(done.rejected).toBe(0);
    }
    // Exactly: 1 upload + 1 submit + 1 poll. No retries, no dispatch from polling.
    expect(calls.map((c) => c.url)).toEqual([
      "/api/v1/media",
      "/api/v1/jobs",
      `/api/v1/jobs/${JOB}`,
    ]);
  });

  it("rejects non-model results instead of showing them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/v1/media")
          return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
        if (url === "/api/v1/jobs")
          return jsonResponse({ ok: true, data: { jobId: JOB } }, 202);
        const result = modelResult();
        (result.provenance as { source: string }).source = "fixture";
        return jsonResponse(jobView("succeeded", { result }));
      }),
    );
    const getApi = renderHook();
    getApi().submit(bytes, "image/png", "scene");
    await vi.waitFor(() => expect(getApi().outcome.name).toBe("failed"));
    expect(getApi().outcome).toMatchObject({
      name: "failed",
      code: "invalid result",
    });
  });

  it("surfaces failed, canceled, and uncertain terminal states", async () => {
    for (const [status, extra, expected] of [
      ["failed", { errorCode: "PROVIDER_HTTP_500" }, "failed"],
      ["canceled", {}, "canceled"],
      ["uncertain", {}, "uncertain"],
    ] as const) {
      cleanup();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (url === "/api/v1/media")
            return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
          if (url === "/api/v1/jobs")
            return jsonResponse({ ok: true, data: { jobId: JOB } }, 202);
          return jsonResponse(jobView(status, extra));
        }),
      );
      const getApi = renderHook();
      getApi().submit(bytes, "image/png", "scene");
      await vi.waitFor(() => expect(getApi().outcome.name).toBe(expected));
    }
  });

  it("reports disabled and signed-out states without uploading twice", async () => {
    for (const [code, match] of [
      [503, "unavailable"],
      [401, "unavailable"],
    ] as const) {
      cleanup();
      const fetchMock = vi.fn(async () => new Response("{}", { status: code }));
      vi.stubGlobal("fetch", fetchMock);
      const getApi = renderHook();
      getApi().submit(bytes, "image/png", "scene");
      await vi.waitFor(() => expect(getApi().outcome.name).toBe(match));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("cancel fences the job, requests cleanup and reports cancellation requested", async () => {
    const deleted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          deleted.push(url);
          return jsonResponse({ ok: true });
        }
        if (url === "/api/v1/media")
          return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
        if (url === "/api/v1/jobs")
          return jsonResponse({ ok: true, data: { jobId: JOB } }, 202);
        return jsonResponse(jobView("leased"));
      }),
    );
    const getApi = renderHook();
    getApi().submit(bytes, "image/png", "scene");
    await vi.waitFor(() => {
      const o = getApi().outcome;
      expect(o.name === "queued" || o.name === "processing").toBe(true);
    });
    getApi().cancel();
    await vi.waitFor(() =>
      expect(getApi().outcome).toMatchObject({ name: "cancel_requested" }),
    );
    await vi.waitFor(() => expect(deleted).toContain(`/api/v1/jobs/${JOB}`));
    expect(deleted).toContain(`/api/v1/media/${ASSET}`);
  });

  it("never auto-retries a failed submission", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);
    const getApi = renderHook();
    getApi().submit(bytes, "image/png", "scene");
    await vi.waitFor(() => expect(getApi().outcome.name).toBe("uncertain"));
    const attempts = fetchMock.mock.calls.length;
    await new Promise((r) => setTimeout(r, 300));
    // No background retry: the count is frozen and only a fresh user gesture resubmits.
    expect(fetchMock.mock.calls.length).toBe(attempts);
  });
});

it("cancel during upload prevents late admission and requests cleanup of late asset IDs", async () => {
  let finish!: (r: Response) => void;
  const pending = new Promise<Response>((r) => {
    finish = r;
  });
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url === "/api/v1/media") return pending;
      return jsonResponse({ ok: true });
    }),
  );
  const getApi = renderHook();
  getApi().submit(bytes, "image/png", "scene");
  getApi().cancel();
  finish(jsonResponse({ ok: true, data: { assetId: ASSET } }, 201));
  await vi.waitFor(() => expect(calls).toContain(`/api/v1/media/${ASSET}`));
  expect(calls).not.toContain("/api/v1/jobs");
  expect(getApi().outcome.name).toBe("cancel_requested");
});
it("cancel during admission fences late job IDs without polling or publishing", async () => {
  let finish!: (r: Response) => void;
  const pending = new Promise<Response>((r) => {
    finish = r;
  });
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? "GET" });
      if (init?.method === "DELETE") return jsonResponse({ ok: true });
      if (url === "/api/v1/media")
        return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
      return pending;
    }),
  );
  const getApi = renderHook();
  getApi().submit(bytes, "image/png", "scene");
  await vi.waitFor(() =>
    expect(calls.some((c) => c.url === "/api/v1/jobs")).toBe(true),
  );
  getApi().cancel();
  finish(jsonResponse({ ok: true, data: { jobId: JOB } }, 202));
  await vi.waitFor(() =>
    expect(calls).toContainEqual({
      url: `/api/v1/jobs/${JOB}`,
      method: "DELETE",
    }),
  );
  expect(calls.some((c) => c.method === "GET")).toBe(false);
  expect(getApi().outcome.name).toBe("cancel_requested");
});
it("unmount during upload cannot submit a job after the component is gone", async () => {
  let finish!: (r: Response) => void;
  const pending = new Promise<Response>((r) => {
    finish = r;
  });
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url === "/api/v1/media") return pending;
      return jsonResponse({ ok: true });
    }),
  );
  const getApi = renderHook();
  getApi().submit(bytes, "image/png", "scene");
  cleanup();
  finish(jsonResponse({ ok: true, data: { assetId: ASSET } }, 201));
  await vi.waitFor(() => expect(calls).toContain(`/api/v1/media/${ASSET}`));
  expect(calls).not.toContain("/api/v1/jobs");
});
it("admission acknowledgement loss is uncertain, never reported as nothing sent", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return jsonResponse({ ok: true });
      if (url === "/api/v1/media")
        return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
      throw Error("lost response");
    }),
  );
  const getApi = renderHook();
  getApi().submit(bytes, "image/png", "scene");
  await vi.waitFor(() => expect(getApi().outcome.name).toBe("uncertain"));
  expect(getApi().outcome).toMatchObject({
    detail: expect.stringContaining("a job may exist"),
  });
});
