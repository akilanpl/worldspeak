import { nounFor } from "@worldspeak/catalog";
import type { NormalizedBox } from "../perception/types";
import type { ObjectTrack, VideoFixtureScene } from "./types";

/**
 * Deterministic synthetic tracking fixtures. Clearly labeled test data —
 * never live SAM output. All labels map to reviewed catalog nouns;
 * confidence is always null so the UI never shows fabricated certainty.
 *
 * Scene "crossing" (10 s, 4:3): the bottle slides left→right; the phone
 * appears at 2 s and vanishes at 5 s; the chair is static and overlaps both.
 */

function track(
  trackId: string,
  catalogId: string,
  points: { t: number; box: NormalizedBox; mask: { x: number; y: number }[] | null }[],
): ObjectTrack {
  return {
    trackId,
    labelEn: nounFor(catalogId, "en"),
    labelTa: nounFor(catalogId, "ta"),
    catalogId,
    points,
    origin: "fixture",
    confidence: null,
  };
}

const bottle = (x: number): { x: number; y: number }[] => [
  { x: x + 0.02, y: 0.34 },
  { x: x + 0.1, y: 0.34 },
  { x: x + 0.1, y: 0.44 },
  { x: x + 0.12, y: 0.5 },
  { x: x + 0.12, y: 0.9 },
  { x: x, y: 0.9 },
  { x: x, y: 0.5 },
  { x: x + 0.02, y: 0.44 },
];

export const VIDEO_FIXTURES: VideoFixtureScene[] = [
  {
    id: "crossing",
    titleEn: "Crossing (3 tracks, appear/vanish/overlap)",
    titleTa: "கடத்தல்",
    aspectW: 4,
    aspectH: 3,
    durationMs: 10_000,
    tracks: [
      track("crossing-water", "water", [
        { t: 0, box: { x1: 0.06, y1: 0.3, x2: 0.2, y2: 0.92 }, mask: bottle(0.06) },
        { t: 5, box: { x1: 0.4, y1: 0.3, x2: 0.54, y2: 0.92 }, mask: bottle(0.4) },
        { t: 10, box: { x1: 0.74, y1: 0.3, x2: 0.88, y2: 0.92 }, mask: bottle(0.74) },
      ]),
      // Box-only fallback, static, overlapping the bottle's mid path.
      track("crossing-chair", "chair", [
        { t: 0, box: { x1: 0.3, y1: 0.5, x2: 0.62, y2: 0.96 }, mask: null },
        { t: 10, box: { x1: 0.3, y1: 0.5, x2: 0.62, y2: 0.96 }, mask: null },
      ]),
      // Appears at 2 s on the chair, vanishes at 5 s.
      track("crossing-phone", "phone", [
        {
          t: 2,
          box: { x1: 0.4, y1: 0.6, x2: 0.54, y2: 0.74 },
          mask: [
            { x: 0.4, y: 0.6 },
            { x: 0.54, y: 0.6 },
            { x: 0.54, y: 0.74 },
            { x: 0.4, y: 0.74 },
          ],
        },
        {
          t: 5,
          box: { x1: 0.44, y1: 0.58, x2: 0.58, y2: 0.72 },
          mask: [
            { x: 0.44, y: 0.58 },
            { x: 0.58, y: 0.58 },
            { x: 0.58, y: 0.72 },
            { x: 0.44, y: 0.72 },
          ],
        },
      ]),
    ],
  },
  {
    id: "empty-motion",
    titleEn: "Empty motion (no tracks)",
    titleTa: "காலி அசைவு",
    aspectW: 16,
    aspectH: 9,
    durationMs: 6_000,
    tracks: [],
  },
];

export function getVideoFixture(id: string): VideoFixtureScene | undefined {
  return VIDEO_FIXTURES.find((s) => s.id === id);
}
