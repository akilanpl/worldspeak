import { JobRequestSchema } from "@worldspeak/contracts";
import { requireOwner, ok, readJson, fail } from "@/lib/api/route";
import {
  inferenceClient,
  inferenceError,
  inferenceConfigured,
} from "@/lib/inference/server";
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  if (!inferenceConfigured())
    return fail("PROVIDER_UNAVAILABLE", "inference.disabled", 503);
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch {
    return fail("INVALID_INPUT", "request.invalid_json", 400);
  }
  const parsed = JobRequestSchema.safeParse(raw);
  if (!parsed.success)
    return fail("INVALID_INPUT", "inference.invalid_job", 400);
  const p = parsed.data;
  const { data, error } = await inferenceClient(auth.ctx).rpc(
    "submit_inference_job",
    {
      p_asset: p.assetId,
      p_operation: p.operation,
      p_key: p.idempotencyKey,
      p_concept: p.operation === "segment" ? p.concept : null,
    },
  );
  if (error) return inferenceError(error);
  return ok({ jobId: data, pollAfterMs: 1000 }, 202);
}
