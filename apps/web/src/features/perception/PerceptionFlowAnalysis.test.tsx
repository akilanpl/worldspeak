import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PerceptionFlow from "./PerceptionFlow";

const ctrl = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: ctrl.session } }) },
  }),
}));

afterEach(() => {
  cleanup();
  ctrl.session = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 300,
    toJSON: () => {},
  });
});

const tinyPng = new File(
  [Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))],
  "t.png",
  { type: "image/png" },
);

async function uploadPhoto() {
  class MockImage {
    onload: (() => void) | null = null;
    naturalWidth = 640;
    naturalHeight = 480;
    set src(_: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", MockImage);
  render(<PerceptionFlow />);
  // Leave fixture mode: real photos only.
  fireEvent.click(screen.getByRole("button", { name: /use synthetic fixtures/i }));
  const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [tinyPng] } });
  await screen.findByRole("heading", { name: /preview/i });
}

describe("PerceptionFlow Meta entry", () => {
  it("offers Meta analysis to signed-in owners on real photos", async () => {
    ctrl.session = { user: "owner-1" };
    await uploadPhoto();
    expect(await screen.findByRole("button", { name: /analyze with meta/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign in to analyze real photos/i)).not.toBeInTheDocument();
  });

  it("keeps guests on fixtures with an explicit sign-in hint", async () => {
    ctrl.session = null;
    await uploadPhoto();
    expect(await screen.findByText(/sign in to analyze real photos/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /analyze with meta/i })).not.toBeInTheDocument();
  });
});

// Reconstructed transport fixture using the sanitized historical chair geometry.
// source:model exercises the live-result UI branch only. This is NOT a new
// provider receipt: the response ID is explicitly synthetic; fetch is mocked.
const assetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function chairStatus() {
  return { data: {
    id: jobId, operation: "scene", status: "succeeded", cancelRequested: false,
    errorCode: null, reservedMicroUsd: 25000, chargedMicroUsd: 4402,
    billingState: "settled", createdAt: "2026-10-27T00:00:00Z", expiresAt: "2026-10-28T00:00:00Z",
    result: { detections: [{ label: "chair", catalogId: null, confidence: 0.99,
      box: { x1: 0.247, y1: 0.139, x2: 0.746, y2: 0.868 }, mask: null }],
      tracks: [], segmentationMasks: [], provenance: { source: "model", model: "muse-spark-1.3",
        adapterVersion: "meta-v1", responseId: "synthetic-reconstruction-not-provider-evidence",
        inputSha256: "a".repeat(64), inputTokens: 424, outputTokens: 911, costMicroUsd: 4402 } }
  } };
}

it("reconstructed chair status → validated overlay → confirmed catalog → bilingual intent, without speech", async () => {
  ctrl.session = { user: "synthetic-owner" };
  const http = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return Response.json({ ok: true });
    if (url === "/api/v1/media") {
      expect(init?.headers).toMatchObject({ "x-worldspeak-consent": "scene-v1" });
      return Response.json({ data: { assetId } });
    }
    if (url === "/api/v1/jobs") {
      expect(JSON.parse(init?.body as string)).toMatchObject({ operation: "scene", assetId });
      return Response.json({ data: { jobId } });
    }
    expect(url).toBe(`/api/v1/jobs/${jobId}`);
    return Response.json(chairStatus());
  });
  vi.stubGlobal("fetch", http);
  const speak = vi.fn();
  vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn(), getVoices: () => [] });
  await uploadPhoto();
  fireEvent.click(await screen.findByRole("button", { name: /analyze with meta/i }));
  expect(http).not.toHaveBeenCalled();
  expect(screen.getByTestId("consent-send")).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(http).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("consent-send"));
  fireEvent.click(await screen.findByRole("button", { name: /use these objects/i }));
  expect(screen.getByTestId("model-results-notice")).toHaveTextContent("muse-spark-1.3");
  const region = await within(await screen.findByTestId("mask-layer")).findByRole("button", { name: "chair" });
  expect(region).toHaveAttribute("aria-pressed", "false");
  expect(parseFloat(region.style.left)).toBeCloseTo(24.7);
  expect(parseFloat(region.style.top)).toBeCloseTo(13.9);
  expect(parseFloat(region.style.width)).toBeCloseTo(49.9);
  expect(parseFloat(region.style.height)).toBeCloseTo(72.9);
  expect(screen.getByRole("button", { name: /^continue$/i })).toBeDisabled();
  fireEvent.click(region);
  // Provider labels never establish catalog identity or intent. User explicitly
  // confirms this label against the catalog before choosing a sentence intent.
  fireEvent.click(screen.getByRole("button", { name: /correct the label/i }));
  fireEvent.click(screen.getByRole("button", { name: /apply label/i }));
  fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
  fireEvent.click(screen.getByRole("button", { name: "I want" }));
  expect(screen.getByText("I want chair.", { exact: true })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "தமிழ்" }));
  expect(screen.getByText("எனக்கு நாற்காலி வேண்டும்.", { exact: true })).toBeInTheDocument();
  expect(speak).not.toHaveBeenCalled();
  expect(http.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
});
