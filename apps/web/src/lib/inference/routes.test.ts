// @vitest-environment node
import { beforeEach, it, expect, vi } from "vitest";
import type { Authed } from "@/lib/api/route";
import { NextResponse } from "next/server";
const f = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/route", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/route")>();
  return { ...actual, requireOwner: f.auth };
});
import { POST } from "@/app/api/v1/jobs/route";
import { GET, DELETE } from "@/app/api/v1/jobs/[id]/route";
const id = "a8c6ef0e-766b-4c1a-809d-b7e7b038ae8d";
const key = "451d72f6-ea1b-4699-89ef-8c2aa7b34590";
const ctx = {
  owner: "server-verified",
  supabase: { rpc: f.rpc },
} as unknown as Authed;
const request = (body: unknown) =>
  new Request("http://localhost/api/v1/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  f.auth.mockResolvedValue({ ok: true, ctx });
  process.env.WORLDSPEAK_INFERENCE_API_ENABLED = "true";
  process.env.INFERENCE_DATABASE_URL = "synthetic-unused";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-unused";
});
it("unauthenticated requests cannot admit or inspect jobs", async () => {
  f.auth.mockResolvedValue({
    ok: false,
    res: NextResponse.json({ ok: false }, { status: 401 }),
  });
  expect((await POST(request({}))).status).toBe(401);
  expect(
    (
      await GET(new Request("http://localhost"), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(401);
  expect(f.rpc).not.toHaveBeenCalled();
});
it("strict request rejects owner spoofing, unknown operations and URL inputs before RPC", async () => {
  for (const body of [
    { operation: "scene", assetId: id, idempotencyKey: key, ownerId: "spoof" },
    { operation: "track", assetId: id, idempotencyKey: key },
    { operation: "scene", imageUrl: "http://localhost", idempotencyKey: key },
  ])
    expect((await POST(request(body))).status).toBe(400);
  expect(f.rpc).not.toHaveBeenCalled();
});
it("admission returns durable 202 and forwards only bounded canonical fields", async () => {
  f.rpc.mockResolvedValue({ data: id, error: null });
  const r = await POST(
    request({
      operation: "segment",
      assetId: id,
      idempotencyKey: key,
      concept: "chair",
    }),
  );
  expect(r.status).toBe(202);
  expect(f.rpc).toHaveBeenCalledExactlyOnceWith("submit_inference_job", {
    p_asset: id,
    p_operation: "segment",
    p_key: key,
    p_concept: "chair",
  });
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect((await r.json()).data).toEqual({ jobId: id, pollAfterMs: 1000 });
});
it("budget/idempotency errors have actionable status without raw SQL", async () => {
  for (const [message, status] of [
    ["BUDGET_EXCEEDED", 402],
    ["IDEMPOTENCY_CONFLICT", 409],
    ["RATE_LIMITED", 429],
    ["CONSENT_REQUIRED", 409],
  ] as const) {
    f.rpc.mockResolvedValue({ data: null, error: { message } });
    const r = await POST(
      request({ operation: "scene", assetId: id, idempotencyKey: key }),
    );
    expect(r.status).toBe(status);
    expect(JSON.stringify(await r.json())).not.toContain("postgres");
  }
});
it("foreign/missing job returns opaque 404 and cancellation never submits", async () => {
  f.rpc.mockResolvedValueOnce({ data: null, error: null });
  expect(
    (
      await GET(new Request("http://localhost"), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(404);
  f.rpc.mockResolvedValueOnce({ data: true, error: null });
  const r = await DELETE(
    new Request("http://localhost", { method: "DELETE" }),
    { params: Promise.resolve({ id }) },
  );
  expect((await r.json()).data).toEqual({
    cancelRequested: true,
    billingMayStillApply: true,
  });
  expect(f.rpc.mock.calls.map((c) => c[0])).toEqual([
    "inference_job_status",
    "cancel_inference_job",
  ]);
});
it("stored malformed model result fails closed before reaching adapters", async () => {
  f.rpc.mockResolvedValue({
    data: { id, result: { detections: "bad" } },
    error: null,
  });
  expect(
    (
      await GET(new Request("http://localhost"), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(503);
});
it("disabled API never creates a reservation", async () => {
  process.env.WORLDSPEAK_INFERENCE_API_ENABLED = "false";
  expect(
    (
      await POST(
        request({ operation: "scene", assetId: id, idempotencyKey: key }),
      )
    ).status,
  ).toBe(503);
  expect(f.rpc).not.toHaveBeenCalled();
});
