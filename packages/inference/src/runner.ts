import type { InferenceResult, Operation } from "@worldspeak/contracts";
import { ProviderError, type ImageInput, type Provider } from "./providers";

export interface Lease {
  id: string;
  leaseToken: string;
  operation: Operation;
  concept: string | null;
}
export interface WorkerStore {
  claim(): Promise<Lease | null>;
  load(lease: Lease): Promise<ImageInput>;
  heartbeat(lease: Lease): Promise<boolean>;
  dispatch(lease: Lease): Promise<boolean>;
  finish(
    lease: Lease,
    outcome: "succeeded" | "failed" | "uncertain",
    cost: number | null,
    result: InferenceResult | null,
    error: string | null,
  ): Promise<boolean>;
}
/** One durable job, zero automatic paid retries. A failed commit never re-sends. */
export async function runOnce(
  store: WorkerStore,
  provider: Provider,
): Promise<"idle" | "finished" | "lost"> {
  const lease = await store.claim();
  if (!lease) return "idle";
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 30000);
  let beatBusy = false,
    dispatched = false;
  const heartbeat = setInterval(() => {
    if (beatBusy) return;
    beatBusy = true;
    void store
      .heartbeat(lease)
      .then((ok) => {
        if (!ok) controller.abort();
      })
      .catch(() => controller.abort())
      .finally(() => {
        beatBusy = false;
      });
  }, 10000);
  try {
    const image = await store.load(lease);
    const call = await provider.prepare(
      { operation: lease.operation, concept: lease.concept, image },
      controller.signal,
    );
    if (controller.signal.aborted) return "lost";
    // Dispatch marker commits before fetch. Crash in the following gap is
    // conservatively uncertain, even if no bytes actually left this process.
    if (!(await store.dispatch(lease))) {
      return (await store.finish(
        lease,
        "failed",
        0,
        null,
        "DISPATCH_NOT_AUTHORIZED",
      ))
        ? "finished"
        : "lost";
    }
    dispatched = true;
    const result = await call.send(controller.signal);
    return (await store.finish(
      lease,
      "succeeded",
      result.provenance.costMicroUsd,
      result,
      null,
    ))
      ? "finished"
      : "lost";
  } catch (e) {
    const known = e instanceof ProviderError ? e : null;
    const cost = known?.chargeMicroUsd ?? (dispatched ? null : 0);
    return (await store.finish(
      lease,
      cost === null ? "uncertain" : "failed",
      cost,
      null,
      known?.code ?? (dispatched ? "TIMEOUT_UNCERTAIN" : "MEDIA_UNAVAILABLE"),
    ))
      ? "finished"
      : "lost";
  } finally {
    clearTimeout(deadline);
    clearInterval(heartbeat);
    controller.abort();
  }
}
