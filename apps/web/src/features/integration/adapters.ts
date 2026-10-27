import { decodeRasterMask, MAX_MASKS, MAX_TOTAL_MASK_PIXELS } from "../perception/rasterMask";
import type { Detection, ModelTrack } from "@worldspeak/contracts";
import { isValidTrack } from "../video/tracks";
import type { ObjectTrack } from "../video/types";
import { isNormalizedBox, type NormalizedBox, type PerceivedObject } from "../perception/types";

/**
 * Adapter boundary for real model results.
 *
 * When the Muse Spark detection endpoint and the SAM 3.1 tracking service
 * land, their payloads enter the frontend ONLY through these converters.
 * Invalid payloads are rejected (null + counted), never rendered partially,
 * and the interaction model (selection → intent → approve → composer) does
 * not change. Unknown catalog IDs are preserved as labels with a null
 * catalogId so the handoff degrades them to exact user text.
 */

export type { Detection, ModelTrack };

function isLabel(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 120;
}

function isConfidence(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
}

function isMask(value: unknown): value is { x: number; y: number }[] | null {
  if (value === null) return true;
  if (!Array.isArray(value) || value.length < 3) return false;
  return value.every(
    (p) =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Record<string, unknown>)["x"] === "number" &&
      typeof (p as Record<string, unknown>)["y"] === "number" &&
      ((p as { x: number; y: number }).x >= 0) &&
      ((p as { x: number; y: number }).x <= 1) &&
      ((p as { x: number; y: number }).y >= 0) &&
      ((p as { x: number; y: number }).y <= 1),
  );
}

/** Still-image detection → PerceivedObject; null when the payload is invalid. */
export function toPerceivedObject(detection: Detection, id: string): PerceivedObject | null {
  if (typeof detection !== "object" || detection === null) return null;
  if (!isLabel(detection.label)) return null;
  if (detection.catalogId !== null && typeof detection.catalogId !== "string") return null;
  if (!isNormalizedBox(detection.box)) return null;
  if (!isMask(detection.mask)) return null;
  if (!isConfidence(detection.confidence)) return null;
  const box = detection.box as NormalizedBox;
  return {
    id,
    labelEn: detection.label,
    // Model labels ship in English; Tamil stays null (review-pending) until
    // the catalog maps them — the UI then shows the English label.
    labelTa: null,
    catalogId: detection.catalogId,
    box,
    mask: detection.mask,
    confidence: detection.confidence,
    origin: "model",
  };
}

/** Tracking result → ObjectTrack; null when the payload fails strict validation. */
export function toObjectTrack(track: ModelTrack): ObjectTrack | null {
  if (typeof track !== "object" || track === null) return null;
  if (typeof track.trackId !== "string" || track.trackId.length === 0) return null;
  if (!isLabel(track.label)) return null;
  if (track.catalogId !== null && typeof track.catalogId !== "string") return null;
  if (!Array.isArray(track.points)) return null;
  if (!isConfidence(track.confidence)) return null;
  const candidate: ObjectTrack = {
    trackId: track.trackId,
    labelEn: track.label,
    labelTa: null,
    catalogId: track.catalogId,
    points: track.points as ObjectTrack["points"],
    origin: "model",
    confidence: track.confidence,
  };
  // Points (ascending time, in-frame boxes) are validated by the same gate
  // the player trusts — see docs/video-ui-handoff.md.
  return isValidTrack(candidate) ? candidate : null;
}

export interface AdaptedBatch<T> {
  accepted: T[];
  /** Count of rejected payloads (logged by the caller, never rendered). */
  rejected: number;
}

/** Batch entry points for model result lists; failures are counted, not thrown. */
export function adaptDetectionList(
  detections: unknown,
  makeId: () => string,
): AdaptedBatch<PerceivedObject> {
  if (!Array.isArray(detections)) return { accepted: [], rejected: 0 };
  const accepted: PerceivedObject[] = [];
  let rejected = 0;
  for (const d of detections) {
    const obj = toPerceivedObject(d as Detection, makeId());
    if (obj) accepted.push(obj);
    else rejected += 1;
  }
  return { accepted, rejected };
}

export function adaptTrackList(tracks: unknown): AdaptedBatch<ObjectTrack> {
  if (!Array.isArray(tracks)) return { accepted: [], rejected: 0 };
  const accepted: ObjectTrack[] = [];
  let rejected = 0;
  for (const t of tracks) {
    const track = toObjectTrack(t as ModelTrack);
    if (track) accepted.push(track);
    else rejected += 1;
  }
  return { accepted, rejected };
}

/** SAM masks join only by the provider's stable record ID, never label/order/box.
 * Fail the complete mask batch closed on ambiguity or malformed data. Scene
 * detections keep the existing adapter and optional objectId compatibility.
 */
export function adaptSegmentationList(
  detections: unknown,
  masks: unknown,
  makeId: () => string,
): AdaptedBatch<PerceivedObject> {
  const invalid = () => ({ accepted: [], rejected: 1 });
  if (!Array.isArray(detections) || !Array.isArray(masks) ||
      detections.length > MAX_MASKS || masks.length !== detections.length) return invalid();
  const byId = new Map<string, unknown>();
  for (const mask of masks) {
    if (!mask || typeof mask !== "object" || typeof mask.objectId !== "string" ||
        !mask.objectId || mask.objectId.length > 160 || byId.has(mask.objectId)) return invalid();
    byId.set(mask.objectId, mask);
  }
  const seen = new Set<string>();
  const accepted: PerceivedObject[] = [];
  let pixels = 0;
  for (const detection of detections) {
    const object = toPerceivedObject(detection as Detection, makeId());
    if (!object || !detection || typeof detection.objectId !== "string" ||
        !detection.objectId || detection.objectId.length > 160 || seen.has(detection.objectId) || !byId.has(detection.objectId)) return invalid();
    seen.add(detection.objectId);
    const mask = decodeRasterMask(byId.get(detection.objectId));
    if (!mask || (pixels += mask.pixels.length) > MAX_TOTAL_MASK_PIXELS) return invalid();
    accepted.push({ ...object, rasterMask: mask });
  }
  return { accepted, rejected: 0 };
}
