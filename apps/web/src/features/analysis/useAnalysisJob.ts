"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  InferenceResultSchema,
  JobViewSchema,
  type Operation,
} from "@worldspeak/contracts";
import { adaptDetectionList } from "../integration/adapters";
import type { PerceivedObject } from "../perception/types";

/** Consent-triggered submission only. GET polling never submits or retries.
 * Every asynchronous continuation is fenced by a run epoch, including uploads
 * and admission. Late IDs are used only to request cancellation/cleanup.
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
  | { name: "cancel_requested"; serverAcknowledged: boolean | null }
  | { name: "canceled" }
  | { name: "uncertain"; detail: string }
  | { name: "unavailable"; detail: string };
interface Resources {
  epoch: number;
  assetId: string | null;
  jobId: string | null;
}
const POLL_DELAYS = [1000, 2000, 5000];
const MAX_POLLS = 20;
const MAX_POLL_ERRORS = 3;
const newId = () => crypto.randomUUID();
async function readProblem(res: Response): Promise<string> {
  try {
    const b = (await res.json()) as { error?: { code?: unknown } };
    if (typeof b.error?.code === "string") return b.error.code;
  } catch {
    /* bounded generic error below */
  }
  return "request failed";
}
async function revoke(r: Resources): Promise<boolean> {
  const urls = [
    ...(r.jobId ? [`/api/v1/jobs/${r.jobId}`] : []),
    ...(r.assetId ? [`/api/v1/media/${r.assetId}`] : []),
  ];
  if (!urls.length) return false; // In-flight upload has not returned an ID yet.
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) return false;
      const body = (await response.json()) as { ok?: boolean };
      return body.ok === true;
    }),
  );
  return results.every((x) => x.status === "fulfilled" && x.value === true);
}
export interface AnalysisApi {
  outcome: AnalysisOutcome;
  submit: (
    bytes: Uint8Array,
    mime: string,
    operation: Operation,
    concept?: string,
  ) => void;
  cancel: () => void;
  reset: () => void;
}
export function useAnalysisJob(): AnalysisApi {
  const [outcome, setOutcome] = useState<AnalysisOutcome>({ name: "idle" });
  const stateRef = useRef<AnalysisOutcome>({ name: "idle" });
  const liveRef = useRef(true),
    epochRef = useRef(0);
  const resourcesRef = useRef<Resources>({
    epoch: 0,
    assetId: null,
    jobId: null,
  });
  const timerRef = useRef<number | null>(null);
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const set = useCallback((next: AnalysisOutcome) => {
    stateRef.current = next;
    if (liveRef.current) setOutcome(next);
  }, []);
  const active = useCallback(
    (epoch: number) => liveRef.current && epochRef.current === epoch,
    [],
  );
  const invalidate = useCallback(() => ++epochRef.current, []);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      invalidate();
      clearTimer();
      void revoke(resourcesRef.current); // Existing IDs only; no inference submission.
    };
  }, [clearTimer, invalidate]);
  type PollArgs = [
    r: Resources,
    operation: Operation,
    index: number,
    errors: number,
  ];
  const pollRef = useRef<(...args: PollArgs) => void>(() => {});
  const poll = useCallback(
    async (
      r: Resources,
      operation: Operation,
      index: number,
      errors: number,
    ) => {
      if (!active(r.epoch) || !r.jobId) return;
      const later = (delay: number, nextIndex = index, nextErrors = errors) => {
        timerRef.current = window.setTimeout(
          () => pollRef.current(r, operation, nextIndex, nextErrors),
          delay,
        );
      };
      if (document.visibilityState === "hidden") {
        later(2000);
        return;
      }
      let response: Response, body: unknown;
      try {
        response = await fetch(`/api/v1/jobs/${r.jobId}`, { method: "GET" });
        if (!active(r.epoch)) return;
        if (!response.ok) {
          const code = await readProblem(response);
          if (active(r.epoch))
            set({
              name: "uncertain",
              detail: `Could not confirm job status (${code}). No submission was retried.`,
            });
          return;
        }
        body = await response.json();
      } catch {
        if (!active(r.epoch)) return;
        if (errors + 1 >= MAX_POLL_ERRORS)
          set({
            name: "uncertain",
            detail:
              "Lost contact with the job. It may still run; no submission was retried.",
          });
        else later(5000, index, errors + 1);
        return;
      }
      if (!active(r.epoch)) return;
      const parsed = JobViewSchema.safeParse(
        (body as { data?: unknown } | null)?.data,
      );
      if (
        !parsed.success ||
        parsed.data.id !== r.jobId ||
        parsed.data.operation !== operation
      ) {
        set({
          name: "failed",
          code: "invalid response",
          detail:
            "The server result could not be validated. Nothing was retried.",
        });
        return;
      }
      const view = parsed.data;
      if (view.cancelRequested || view.status === "canceled") {
        set(
          view.status === "canceled"
            ? { name: "canceled" }
            : { name: "cancel_requested", serverAcknowledged: true },
        );
        return;
      }
      if (view.status === "succeeded") {
        const result = InferenceResultSchema.safeParse(view.result);
        if (!result.success || result.data.provenance.source !== "model") {
          set({
            name: "failed",
            code: "invalid result",
            detail: "Invalid or synthetic model output was discarded.",
          });
          return;
        }
        const batch = adaptDetectionList(result.data.detections, newId);
        set({
          name: "succeeded",
          jobId: r.jobId,
          assetId: r.assetId!,
          operation,
          objects: batch.accepted,
          rejected: batch.rejected,
          model: result.data.provenance.model,
        });
        return;
      }
      if (view.status === "failed") {
        set({
          name: "failed",
          code: view.errorCode ?? "job failed",
          detail:
            "Analysis failed. Processing or charges may already have occurred; check recorded usage before any new attempt.",
        });
        return;
      }
      if (view.status === "uncertain") {
        set({
          name: "uncertain",
          detail:
            "The upstream outcome is uncertain and its budget may remain reserved. Do not resubmit until it is reconciled.",
        });
        return;
      }
      set({
        name: view.status === "queued" ? "queued" : "processing",
        jobId: r.jobId,
        assetId: r.assetId!,
        operation,
      });
      if (index + 1 >= MAX_POLLS) {
        set({
          name: "uncertain",
          detail:
            "The job may still complete. Check its status later; no submission was retried.",
        });
        return;
      }
      later(POLL_DELAYS[Math.min(index, 2)]!, index + 1, 0);
    },
    [active, set],
  );
  useEffect(() => {
    pollRef.current = poll;
  });
  const submit = useCallback(
    (
      bytes: Uint8Array,
      mime: string,
      operation: Operation,
      concept?: string,
    ) => {
      if (["uploading", "queued", "processing"].includes(stateRef.current.name))
        return;
      clearTimer();
      const r: Resources = {
        epoch: ++epochRef.current,
        assetId: null,
        jobId: null,
      };
      resourcesRef.current = r;
      const key = newId();
      set({ name: "uploading" });
      const run = async () => {
        try {
          const upload = await fetch("/api/v1/media", {
            method: "POST",
            headers: {
              "content-type": mime,
              "x-worldspeak-consent": "scene-v1",
            },
            body: bytes as BodyInit,
          });
          if (!upload.ok) {
            const code = await readProblem(upload);
            if (active(r.epoch))
              set({
                name:
                  upload.status === 503 || upload.status === 401
                    ? "unavailable"
                    : "uncertain",
                detail: `Upload was not confirmed (${code}). No analysis job was submitted; media cleanup may still be pending.`,
              });
            return;
          }
          const uploaded = (await upload.json()) as {
            data?: { assetId?: unknown };
          };
          const id = uploaded.data?.assetId;
          if (typeof id !== "string" || !/^[-a-f0-9]{36}$/.test(id))
            throw Error("Invalid upload response");
          r.assetId = id;
          if (!active(r.epoch)) {
            await revoke(r);
            return;
          }
        } catch {
          if (active(r.epoch))
            set({
              name: "uncertain",
              detail:
                "Upload acknowledgement was lost. The photo may have reached the server and expire through cleanup. No analysis job was submitted.",
            });
          return;
        }
        try {
          const submitted = await fetch("/api/v1/jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(
              operation === "segment"
                ? {
                    operation,
                    assetId: r.assetId,
                    idempotencyKey: key,
                    concept,
                  }
                : { operation, assetId: r.assetId, idempotencyKey: key },
            ),
          });
          if (!submitted.ok) {
            const code = await readProblem(submitted);
            await revoke(r);
            if (active(r.epoch))
              set({
                name: "failed",
                code,
                detail:
                  "Admission was not confirmed. Cleanup was requested; physical deletion and any charges require verification.",
              });
            return;
          }
          const admitted = (await submitted.json()) as {
            data?: { jobId?: unknown };
          };
          const id = admitted.data?.jobId;
          if (typeof id !== "string" || !/^[-a-f0-9]{36}$/.test(id))
            throw Error("Invalid admission response");
          r.jobId = id;
          if (!active(r.epoch)) {
            await revoke(r);
            return;
          }
          set({ name: "queued", jobId: id, assetId: r.assetId!, operation });
          pollRef.current(r, operation, 0, 0);
        } catch {
          await revoke(r);
          if (active(r.epoch))
            set({
              name: "uncertain",
              detail:
                "Admission acknowledgement was lost: a job may exist. Cleanup was requested; no submission was retried. Reconcile before sending again.",
            });
        }
      };
      void run();
    },
    [active, clearTimer, set],
  );
  const cancel = useCallback(() => {
    clearTimer();
    const epoch = ++epochRef.current;
    set({ name: "cancel_requested", serverAcknowledged: null });
    void revoke(resourcesRef.current).then((ack) => {
      if (active(epoch))
        set({ name: "cancel_requested", serverAcknowledged: ack });
    });
  }, [active, clearTimer, set]);
  const reset = useCallback(() => {
    clearTimer();
    epochRef.current++;
    void revoke(resourcesRef.current);
    set({ name: "idle" });
  }, [clearTimer, set]);
  return { outcome, submit, cancel, reset };
}
