import { requireOwner, ok, fail } from "@/lib/api/route";
import {
  inferenceClient,
  inferenceConfigured,
  inferenceError,
  assetResponse,
  markMediaReady,
  createInferenceStorage,
} from "@/lib/inference/server";
import { readImage, normalizeImage } from "@/lib/inference/image";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return auth.res;
  if (!inferenceConfigured())
    return fail("PROVIDER_UNAVAILABLE", "inference.disabled", 503);
  if (request.headers.get("x-worldspeak-consent") !== "scene-v1")
    return fail("CONSENT_REQUIRED", "inference.approve_upload", 422);
  let image: Awaited<ReturnType<typeof normalizeImage>>;
  try {
    image = await normalizeImage(await readImage(request));
  } catch {
    return fail("UNSUPPORTED_MEDIA", "inference.png_jpeg_webp_only", 415);
  }
  const client = inferenceClient(auth.ctx);
  const { data, error } = await client.rpc("create_inference_media", {
    p_sha256: image.sha256,
    p_width: image.width,
    p_height: image.height,
    p_bytes: image.bytes.length,
    p_notice: "scene-v1",
  });
  if (error) return inferenceError(error);
  const parsedAsset = assetResponse.safeParse(data);
  if (!parsedAsset.success)
    return fail(
      "PROVIDER_UNAVAILABLE",
      "inference.invalid_media_admission",
      503,
    );
  const asset = parsedAsset.data;
  try {
    const storage = await createInferenceStorage();
    // No signed upload URL that can outlive revocation. Non-upsert exact path.
    const upload = await storage.upload(asset.path, image.bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error || !(await markMediaReady(asset.id)))
      throw Error("Upload incomplete");
    return ok(
      {
        assetId: asset.id,
        expiresAt: asset.expiresAt,
        sha256: image.sha256,
        width: image.width,
        height: image.height,
      },
      201,
    );
  } catch {
    await client.rpc("revoke_inference_media", { p_id: asset.id });
    return fail(
      "PROVIDER_UNAVAILABLE",
      "inference.upload_failed_cleanup_queued",
      503,
    );
  }
}
