import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AnalysisFlow from "./AnalysisFlow";
import type { CapturedImage } from "../perception/types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const image: CapturedImage = { dataUrl: tinyPng, width: 1, height: 1, source: "upload", name: "t.png" };

const ASSET = "a8c6ef0e-766b-4c1a-809d-b7e7b038ae8d";
const JOB = "451d72f6-ea1b-4699-89ef-8c82a7b34590";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function successFetch() {
  return vi.fn(async (url: string) => {
    if (url === "/api/v1/media") return jsonResponse({ ok: true, data: { assetId: ASSET } }, 201);
    if (url === "/api/v1/jobs")
      return jsonResponse({ ok: true, data: { jobId: JOB, pollAfterMs: 1000 } }, 202);
    return jsonResponse({
      ok: true,
      data: {
        id: JOB,
        operation: "scene",
        status: "succeeded",
        cancelRequested: false,
        result: {
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
        },
        errorCode: null,
        reservedMicroUsd: 25,
        chargedMicroUsd: null,
        billingState: "reserved",
        expiresAt: "t",
        createdAt: "t",
      },
    });
  });
}

describe("AnalysisFlow", () => {
  it("runs consent → upload → job → validated detections → explicit confirmation", async () => {
    vi.stubGlobal("fetch", successFetch());
    const onDetections = vi.fn();
    render(
      <AnalysisFlow
        locale="en"
        image={image}
        operation="scene"
        concept={null}
        onDetections={onDetections}
        onBack={() => {}}
      />,
    );
    // Consent gates the send: no fetch before the checkbox + button.
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByTestId("consent-send"));
    // Validated model detections surface with an explicit confirmation step.
    const use = await screen.findByRole("button", { name: /use these objects/i });
    expect(screen.getByText(/muse-spark-1\.3/i)).toBeInTheDocument();
    expect(onDetections).not.toHaveBeenCalled();
    fireEvent.click(use);
    expect(onDetections).toHaveBeenCalledTimes(1);
    const [objects, model] = onDetections.mock.calls[0] as [object[], string];
    expect(model).toBe("muse-spark-1.3");
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({ labelEn: "chair", origin: "model" });
  });

  it("shows the segment concept requirement before any upload", () => {
    vi.stubGlobal("fetch", successFetch());
    render(
      <AnalysisFlow
        locale="en"
        image={image}
        operation="segment"
        concept={null}
        onDetections={() => {}}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByTestId("consent-send"));
    expect(screen.getByRole("alert")).toHaveTextContent(/confirmed noun/);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
