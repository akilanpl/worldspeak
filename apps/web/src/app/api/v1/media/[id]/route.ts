import { z } from "zod";
import { requireOwner, ok, fail } from "@/lib/api/route";
import { inferenceClient, inferenceError } from "@/lib/inference/server";
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("INVALID_INPUT", "request.invalid_id", 400);
  const { data, error } = await inferenceClient(auth.ctx).rpc(
    "revoke_inference_media",
    { p_id: id },
  );
  if (error) return inferenceError(error);
  if (!data) return fail("NOT_FOUND", "media.not_found", 404);
  return ok({ revoked: true, cleanupQueued: true });
}
