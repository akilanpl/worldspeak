import { z } from "zod";
import { requireOwner, ok, fail } from "@/lib/api/route";
import {
  inferenceClient,
  inferenceError,
  parseJob,
} from "@/lib/inference/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("INVALID_INPUT", "request.invalid_id", 400);
  const { data, error } = await inferenceClient(auth.ctx).rpc(
    "inference_job_status",
    { p_id: id },
  );
  if (error) return inferenceError(error);
  if (!data) return fail("NOT_FOUND", "jobs.not_found", 404);
  try {
    return ok(parseJob(data));
  } catch {
    return fail("INVALID_MODEL_OUTPUT", "inference.invalid_stored_result", 503);
  }
}
export async function DELETE(request: Request, context: Context) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("INVALID_INPUT", "request.invalid_id", 400);
  const { data, error } = await inferenceClient(auth.ctx).rpc(
    "cancel_inference_job",
    { p_id: id },
  );
  if (error) return inferenceError(error);
  if (!data) return fail("NOT_FOUND", "jobs.not_found", 404);
  return ok({ cancelRequested: true, billingMayStillApply: true });
}
