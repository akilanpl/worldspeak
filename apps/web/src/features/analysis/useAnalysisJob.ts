"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  InferenceResultSchema,
  type Detection,
  type JobStatus,
  type JobView,
  type Operation,
} from "@worldspeak/contracts";
import { adaptDetectionList } from "../integration/adapters";
import type { PerceivedObject } from "../perception/types";

/**
 * Still-image Meta analysis: upload (with prior explicit consent) → scene
 * or segment job → bounded GET-only polling → validated model detections.
 *
 * Billable safety, by construction:
 * - `submit` runs only from an explicit user gesture (the consent panel).
 * - Polling uses GET only and never dispatches or resubmits.
 * - There is no automatic retry anywhere. A failed submission returns to
 *   idle and requires a fresh consent + fresh idempotency key.
 * - Cancellation fires job DELETE + media DELETE and reports `canceled`
 *   without waiting for the server roundtrip.
 */

export type AnalysisOutcome =
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "queued"; jobId: string; assetId: string; operation: Operation }
  | { name: "processing"; jobId: string; assetId: string; operation: Operation }
  | {
      name: "succeeded";
      jobId: string;
      assetId: string;
      operation: Operation;
      objects: PerceivedObject[];
      rejected: number;
      model: string;
    }
  | { name: "failed"; code: string; detail: string }
  | { name: "canceled" }
  | { name: "uncertain"; detail: string }
  | { name: "unavailable"; detail: string };

const POLL_DELAYS = [1000, 2000, 5000];
const MAX_POLLS = 20;
const MAX_POLL_ERRORS = 3;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `00000000-0000-4000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`;
}

async function readProblem(res: Response): Promise<{ code: string; status: number }> {
  let code = "request failed";
  try {
    const body = (await res.json()) as { ok?: boolean; error?: { code?: string } };
    if (typeof body?.error?.code === "string" && body.error.code) code = body.error.code;
  } catch {
    /* non-JSON error body */
  }
  return { code, status: res.status };
}

export interface AnalysisApi {
  outcome: AnalysisOutcome;
  submit: (bytes: Uint8Array, mime: string, operation: Operation, concept?: string) => void;
  cancel: () => void;
  reset: () => void;
}

export function useAnalysisJob(): AnalysisApi {
  const [outcome, setOutcome] = useState<AnalysisOutcome>({ name: "idle" });
  const liveRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const stateRef = useRef<AnalysisOutcome>({ name: "idle" });
  // Stale in-flight polls (e.g. resolved after cancel/reset/submit) must
  // never overwrite newer state. The check reads the single-writer state
  // mirror: only the poll that owns the current job id may continue.
  const isCurrentJob = useCallback((jobId: string) => {
    const current = stateRef.current;
    return (
      (current.name === "queued" || current.name === "processing") && current.jobId === jobId
    );
  }, []);

  const set = useCallback((next: AnalysisOutcome) => {
    stateRef.current = next;
    if (liveRef.current) setOutcome(next);
  }, []);

  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fail = useCallback(
    (code: string, detail: string) => {
      clearTimer();
      set({ name: "failed", code, detail });
    },
    [clearTimer, set],
  );

  type PollArgs = [jobId: string, assetId: string, operation: Operation, pollIndex: number, errorStreak: number];
  // Latest-poll ref: the loop re-enters through this stable handle so the
  // callback itself never self-references (hooks rules) and no cross-callback
  // mutation is needed (immutability rule).
  const pollRef = useRef<(...args: PollArgs) => void>(() => {});
  const poll = useCallback(
    async (jobId: string, assetId: string, operation: Operation, pollIndex: number, errorStreak: number) => {
      if (!liveRef.current || !isCurrentJob(jobId)) return;
      if (document.visibilityState === "hidden") {
        // Pause while hidden; resume on the next visible tick — never poll blind.
        timerRef.current = window.setTimeout(() => {
          pollRef.current(jobId, assetId, operation, pollIndex, errorStreak);
        }, 2000);
        return;
      }
      let res: Response;
      try {
        res = await fetch(`/api/v1/jobs/${jobId}`, { method: "GET" });
      } catch {
        if (!isCurrentJob(jobId)) return;
        if (errorStreak + 1 >= MAX_POLL_ERRORS) {
          set({ name: "uncertain", detail: "Lost contact while checking the job. It may still complete — nothing was retried automatically." });
          return;
        }
        timerRef.current = window.setTimeout(() => {
          pollRef.current(jobId, assetId, operation, pollIndex, errorStreak + 1);
        }, 5000);
        return;
      }
      if (!res.ok) {
        const problem = await readProblem(res);
        fail(problem.code, `Checking the job failed (${res.status}). Nothing was retried automatically.`);
        return;
      }
      const body = (await res.json()) as { ok: boolean; data?: JobView };
      if (!isCurrentJob(jobId)) return;
      const view = body.data;
      if (!view) {
        fail("invalid response", "The job check returned an empty body.");
        return;
      }
      const status: JobStatus = view.status;
      if (status === "succeeded") {
        const parsed = InferenceResultSchema.safeParse(view.result);
        if (!parsed.success || parsed.data.provenance.source !== "model") {
          fail("invalid result", "The model returned a result this app cannot validate. It was discarded — no boxes or masks were shown.");
          return;
        }
        const { accepted, rejected } = adaptDetectionList(parsed.data.detections as Detection[], newId);
        set({
          name: "succeeded",
          jobId,
          assetId,
          operation,
          objects: accepted,
          rejected,
          model: parsed.data.provenance.model,
        });
        return;
      }
      if (status === "failed") {
        fail(view.errorCode ?? "job failed", "The analysis job failed. No charge beyond the reservation is expected; check the notice for the exact code.");
        return;
      }
      if (status === "uncertain") {
        clearTimer();
        set({
          name: "uncertain",
          detail: view.errorCode
            ? `The job reported ${view.errorCode} and its outcome could not be confirmed. It was not retried automatically.`
            : "The job outcome could not be confirmed. It may still complete — nothing was retried automatically.",
        });
        return;
      }
      if (status === "canceled" || view.cancelRequested) {
        if (status === "canceled") {
          clearTimer();
          set({ name: "canceled" });
          return;
        }
        // Cancel requested but the worker has not finished fencing yet.
        set({ name: "processing", jobId, assetId, operation });
      } else if (status === "queued") {
        set({ name: "queued", jobId, assetId, operation });
      } else {
        set({ name: "processing", jobId, assetId, operation });
      }
      if (pollIndex + 1 >= MAX_POLLS) {
        set({ name: "uncertain", detail: "The job is taking unusually long. It may still complete — check back later rather than resubmitting." });
        return;
      }
      const delay = POLL_DELAYS[Math.min(pollIndex, POLL_DELAYS.length - 1)]!;
      timerRef.current = window.setTimeout(() => {
        pollRef.current(jobId, assetId, operation, pollIndex + 1, 0);
      }, delay);
    },
    [clearTimer, fail, isCurrentJob, set],
  );

  // Keep the re-entry handle current. Ref writes happen here in an effect —
  // never during render — so the loop always resumes the latest closure.
  useEffect(() => {
    pollRef.current = poll;
  });

  const submit = useCallback(
    (bytes: Uint8Array, mime: string, operation: Operation, concept?: string) => {
      clearTimer();
      set({ name: "uploading" });
      const run = async () => {
        let assetId: string;
        try {
          const upload = await fetch("/api/v1/media", {
            method: "POST",
            headers: { "content-type": mime, "x-worldspeak-consent": "scene-v1" },
            body: bytes as BodyInit,
          });
          if (!upload.ok) {
            const problem = await readProblem(upload);
            if (upload.status === 503) {
              set({ name: "unavailable", detail: "Model analysis is currently disabled on this server. Your photo was not uploaded." });
              return;
            }
            if (upload.status === 401) {
              set({ name: "unavailable", detail: "Your sign-in expired. Sign in again, then send once more." });
              return;
            }
            fail(problem.code, "The upload was rejected. Your photo was not sent for analysis.");
            return;
          }
          const uploaded = (await upload.json()) as { ok: boolean; data?: { assetId?: string } };
          if (!uploaded.data?.assetId) {
            fail("invalid response", "The upload response was empty.");
            return;
          }
          assetId = uploaded.data.assetId;
        } catch {
          fail("network", "The upload could not reach the server. Nothing was sent — start over to try again with a fresh approval.");
          return;
        }
        try {
          const submitted = await fetch("/api/v1/jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(
              operation === "segment"
                ? { operation, assetId, idempotencyKey: newId(), concept }
                : { operation, assetId, idempotencyKey: newId() },
            ),
          });
          if (!submitted.ok) {
            const problem = await readProblem(submitted);
            await fetch(`/api/v1/media/${assetId}`, { method: "DELETE" }).catch(() => undefined);
            if (submitted.status === 503) {
              set({ name: "unavailable", detail: "Model analysis is currently disabled on this server." });
              return;
            }
            fail(problem.code, "The analysis job was not accepted. The uploaded photo was revoked.");
            return;
          }
          const admitted = (await submitted.json()) as { ok: boolean; data?: { jobId?: string } };
          if (!admitted.data?.jobId) {
            fail("invalid response", "The job admission response was empty.");
            return;
          }
          set({ name: "queued", jobId: admitted.data.jobId, assetId, operation });
          pollRef.current(admitted.data.jobId, assetId, operation, 0, 0);
        } catch {
          await fetch(`/api/v1/media/${assetId}`, { method: "DELETE" }).catch(() => undefined);
          fail("network", "The job request could not reach the server. The uploaded photo was revoked — start over with a fresh approval.");
        }
      };
      void run();
    },
    [clearTimer, fail, set],
  );

  const cancel = useCallback(() => {
    const current = stateRef.current;
    clearTimer();
    if (current.name === "queued" || current.name === "processing") {
      // Best-effort privacy: fence the job, then revoke the bytes. The UI
      // reports canceled immediately; the server fences publication.
      void fetch(`/api/v1/jobs/${current.jobId}`, { method: "DELETE" }).catch(() => undefined);
      void fetch(`/api/v1/media/${current.assetId}`, { method: "DELETE" }).catch(() => undefined);
    }
    set({ name: "canceled" });
  }, [clearTimer, set]);

  const reset = useCallback(() => {
    clearTimer();
    set({ name: "idle" });
  }, [clearTimer, set]);

  return { outcome, submit, cancel, reset };
}
