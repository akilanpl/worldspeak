import type { NormalizedBox } from "../perception/types";
import { isTrackPoint, type ObjectTrack } from "./types";

/** Pure track math: keyframe interpolation, activity windows, validation. */

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

function lerpBox(a: NormalizedBox, b: NormalizedBox, f: number): NormalizedBox {
  return {
    x1: lerp(a.x1, b.x1, f),
    y1: lerp(a.y1, b.y1, f),
    x2: lerp(a.x2, b.x2, f),
    y2: lerp(a.y2, b.y2, f),
  };
}

/** Interpolated box at time t (seconds); null outside the track window. */
export function trackBoxAt(
  track: ObjectTrack,
  t: number,
): { box: NormalizedBox; mask: { x: number; y: number }[] | null } | null {
  const pts = track.points;
  if (pts.length === 0) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return null;
  if (t < first.t || t > last.t) return null;
  if (pts.length === 1) return { box: first.box, mask: first.mask };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const f = span <= 0 ? 0 : (t - a.t) / span;
      // Masks do not morph: hold the nearest keyframe's geometry,
      // with exact-midpoint ties resolving to the earlier keyframe.
      const mask = f <= 0.5 ? a.mask : b.mask;
      return { box: lerpBox(a.box, b.box, f), mask };
    }
  }
  return { box: last.box, mask: last.mask };
}

/** Tracks visible at time t, in stable order. */
export function activeTracksAt(tracks: ObjectTrack[], t: number): ObjectTrack[] {
  return tracks.filter((tr) => trackBoxAt(tr, t) !== null);
}

/** [first, last] keyframe times; null for empty tracks. */
export function trackWindow(track: ObjectTrack): { from: number; to: number } | null {
  const first = track.points[0];
  const last = track.points[track.points.length - 1];
  if (!first || !last) return null;
  return { from: first.t, to: last.t };
}

/** Structural validation for backend payloads (used by tests + adapter). */
export function isValidTrack(track: unknown): track is ObjectTrack {
  if (typeof track !== "object" || track === null) return false;
  const o = track as Record<string, unknown>;
  if (typeof o["trackId"] !== "string" || (o["trackId"] as string).length === 0) return false;
  if (typeof o["labelEn"] !== "string" || (o["labelEn"] as string).length === 0) return false;
  if (!Array.isArray(o["points"]) || (o["points"] as unknown[]).length === 0) return false;
  const points = o["points"] as unknown[];
  let prev = -Infinity;
  for (const p of points) {
    if (!isTrackPoint(p)) return false;
    if (p.t < prev) return false;
    prev = p.t;
    const b = p.box;
    if (b.x1 < 0 || b.y1 < 0 || b.x2 > 1 || b.y2 > 1 || b.x1 >= b.x2 || b.y1 >= b.y2) return false;
  }
  if (o["origin"] !== "fixture" && o["origin"] !== "model") return false;
  if (o["confidence"] !== null && (typeof o["confidence"] !== "number" || (o["confidence"] as number) < 0 || (o["confidence"] as number) > 1)) return false;
  return true;
}
