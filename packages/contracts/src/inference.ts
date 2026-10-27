import { z } from "zod";

const unit = z.number().finite().min(0).max(1);
export const NormalizedBoxSchema = z
  .object({ x1: unit, y1: unit, x2: unit, y2: unit })
  .strict()
  .refine((b) => b.x1 < b.x2 && b.y1 < b.y2, "empty box");
const polygon = z
  .array(z.object({ x: unit, y: unit }).strict())
  .min(3)
  .max(4096)
  .nullable();
export const DetectionSchema = z
  .object({
    // Stable SAM record identity; absent for legacy/scene detections.
    objectId: z.string().min(1).max(160).optional(),
    label: z.string().trim().min(1).max(120),
    catalogId: z.string().max(120).nullable(),
    box: NormalizedBoxSchema,
    mask: polygon,
    confidence: unit.nullable(),
  })
  .strict();
export const TrackSchema = z
  .object({
    trackId: z.string().min(1).max(160),
    label: z.string().min(1).max(120),
    catalogId: z.string().max(120).nullable(),
    confidence: unit.nullable(),
    points: z
      .array(
        z
          .object({
            t: z.number().finite().nonnegative(),
            box: NormalizedBoxSchema,
            mask: polygon,
          })
          .strict(),
      )
      .min(1)
      .max(300),
  })
  .strict()
  .refine(
    (t) => t.points.every((p, i) => i === 0 || p.t > t.points[i - 1]!.t),
    "unordered times",
  );
export type Detection = z.infer<typeof DetectionSchema>;
export type ModelTrack = z.infer<typeof TrackSchema>;
export const OperationSchema = z.enum(["scene", "segment"]);
export type Operation = z.infer<typeof OperationSchema>;
export const JobRequestSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("scene"),
      assetId: z.string().uuid(),
      idempotencyKey: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("segment"),
      assetId: z.string().uuid(),
      idempotencyKey: z.string().uuid(),
      concept: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .regex(/^[\p{L}\p{N} '-]+$/u, "one noun phrase only"),
    })
    .strict(),
]);
export type JobRequest = z.infer<typeof JobRequestSchema>;
export const JobStatusSchema = z.enum([
  "queued",
  "leased",
  "dispatching",
  "succeeded",
  "failed",
  "canceled",
  "uncertain",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;
export const ProvenanceSchema = z
  .object({
    source: z.enum(["model", "fixture"]),
    model: z.enum(["muse-spark-1.3", "sam-3.1"]),
    adapterVersion: z.literal("meta-v1"),
    responseId: z.string().min(1).max(200),
    inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    costMicroUsd: z.number().int().nonnegative().safe(),
  })
  .strict();
export const InferenceResultSchema = z
  .object({
    detections: z.array(DetectionSchema).max(32),
    tracks: z.array(TrackSchema).max(32),
    provenance: ProvenanceSchema,
    // Pixel masks are kept separately; polygons are never invented from boxes.
    segmentationMasks: z
      .array(
        z
          .object({
            objectId: z.string(),
            bounds: NormalizedBoxSchema,
            width: z.number().int().positive().max(512),
            height: z.number().int().positive().max(512),
            rasterBase64: z.string().max(350000),
          })
          .strict(),
      )
      .max(32),
  })
  .strict();
export type InferenceResult = z.infer<typeof InferenceResultSchema>;
export const JobViewSchema = z
  .object({
    id: z.string().uuid(),
    operation: OperationSchema,
    status: JobStatusSchema,
    cancelRequested: z.boolean(),
    result: InferenceResultSchema.nullable(),
    errorCode: z.string().nullable(),
    reservedMicroUsd: z.number().int().nonnegative().safe(),
    chargedMicroUsd: z.number().int().nonnegative().safe().nullable(),
    billingState: z.enum(["reserved", "settled", "uncertain"]),
    expiresAt: z.string(),
    createdAt: z.string(),
  })
  .strict();
export type JobView = z.infer<typeof JobViewSchema>;
