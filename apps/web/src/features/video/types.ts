import type { NormalizedBox } from "../perception/types";

/**
 * Typed object-track representation for the video interface. Coordinates are
 * normalized [0,1] like the still-image path; frame time is seconds from the
 * clip start. Synthetic fixtures are always marked; confidence is shown only
 * when supplied by real model data.
 */

export interface TrackPoint {
  /** Seconds from clip start. Points must be sorted ascending. */
  t: number;
  box: NormalizedBox;
  /** Optional segmentation geometry at this keyframe (no morphing). */
  mask: { x: number; y: number }[] | null;
}

export interface ObjectTrack {
  /** Stable within one clip; never reused across requests. */
  trackId: string;
  labelEn: string;
  labelTa: string | null;
  /** Reviewed catalog noun when the label maps to one; null stays user text. */
  catalogId: string | null;
  points: TrackPoint[];
  origin: "fixture" | "model";
  /** Null unless supplied by actual model data — never synthesized. */
  confidence: number | null;
}

export type VideoSource = "camera" | "upload" | "fixture";

export interface VideoClip {
  /** Object URL (camera/upload) or "" for synthetic timelines. */
  url: string;
  width: number;
  height: number;
  durationMs: number;
  source: VideoSource;
  mimeType: string | null;
  name: string | null;
}

export interface VideoFixtureScene {
  id: string;
  titleEn: string;
  titleTa: string;
  aspectW: number;
  aspectH: number;
  durationMs: number;
  tracks: ObjectTrack[];
}

export type VideoStep = "capture" | "review" | "tracks" | "intent";

export function isTrackPoint(p: unknown): p is TrackPoint {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o["t"] === "number" &&
    Number.isFinite(o["t"] as number) &&
    (o["t"] as number) >= 0 &&
    typeof o["box"] === "object" &&
    o["box"] !== null
  );
}
