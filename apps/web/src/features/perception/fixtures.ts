import { nounFor } from "@worldspeak/catalog";
import type { FixtureScene, PerceivedObject } from "./types";

/**
 * Deterministic synthetic segmentation fixtures for interface development.
 * Clearly labeled test data — never live SAM inference. All labels map to
 * reviewed catalog nouns; confidence is always null so the UI never shows
 * fabricated certainty.
 */

function obj(
  id: string,
  catalogId: string,
  box: PerceivedObject["box"],
  mask: PerceivedObject["mask"],
): PerceivedObject {
  return {
    id,
    labelEn: nounFor(catalogId, "en"),
    labelTa: nounFor(catalogId, "ta"),
    catalogId,
    box,
    mask,
    confidence: null,
    origin: "fixture",
  };
}

const bottleMask = [
  { x: 0.1, y: 0.32 },
  { x: 0.2, y: 0.32 },
  { x: 0.2, y: 0.4 },
  { x: 0.24, y: 0.45 },
  { x: 0.24, y: 0.9 },
  { x: 0.06, y: 0.9 },
  { x: 0.06, y: 0.45 },
  { x: 0.1, y: 0.4 },
];

const bowlMask = [
  { x: 0.38, y: 0.62 },
  { x: 0.46, y: 0.58 },
  { x: 0.54, y: 0.58 },
  { x: 0.6, y: 0.64 },
  { x: 0.58, y: 0.78 },
  { x: 0.5, y: 0.9 },
  { x: 0.42, y: 0.9 },
  { x: 0.36, y: 0.76 },
];

const phoneMask = [
  { x: 0.68, y: 0.63 },
  { x: 0.82, y: 0.63 },
  { x: 0.82, y: 0.77 },
  { x: 0.68, y: 0.77 },
];

const medicineMask = [
  { x: 0.1, y: 0.4 },
  { x: 0.28, y: 0.4 },
  { x: 0.28, y: 0.83 },
  { x: 0.1, y: 0.83 },
];

const blanketMask = [
  { x: 0.38, y: 0.5 },
  { x: 0.66, y: 0.48 },
  { x: 0.64, y: 0.9 },
  { x: 0.4, y: 0.9 },
];

const fanMask = [
  { x: 0.66, y: 0.18 },
  { x: 0.9, y: 0.18 },
  { x: 0.93, y: 0.6 },
  { x: 0.88, y: 0.68 },
  { x: 0.68, y: 0.68 },
  { x: 0.62, y: 0.55 },
];

export const FIXTURE_SCENES: FixtureScene[] = [
  {
    id: "table",
    titleEn: "Table (4 objects, overlapping)",
    titleTa: "மேசை",
    aspectW: 4,
    aspectH: 3,
    objects: [
      obj("table-water", "water", { x1: 0.06, y1: 0.3, x2: 0.26, y2: 0.92 }, bottleMask),
      obj("table-food", "food", { x1: 0.34, y1: 0.58, x2: 0.62, y2: 0.92 }, bowlMask),
      // Box-only fallback (no mask) overlapping the bowl.
      obj("table-chair", "chair", { x1: 0.56, y1: 0.28, x2: 0.94, y2: 0.96 }, null),
      // Small mask overlapping the chair.
      obj("table-phone", "phone", { x1: 0.66, y1: 0.62, x2: 0.84, y2: 0.78 }, phoneMask),
    ],
  },
  {
    id: "shelf",
    titleEn: "Shelf (3 objects, overlapping)",
    titleTa: "அலமாரி",
    aspectW: 16,
    aspectH: 9,
    objects: [
      obj("shelf-medicine", "medicine", { x1: 0.08, y1: 0.35, x2: 0.3, y2: 0.85 }, medicineMask),
      obj("shelf-blanket", "blanket", { x1: 0.36, y1: 0.45, x2: 0.68, y2: 0.92 }, blanketMask),
      obj("shelf-fan", "fan", { x1: 0.6, y1: 0.15, x2: 0.95, y2: 0.7 }, fanMask),
    ],
  },
  {
    id: "empty",
    titleEn: "Empty shelf (no objects)",
    titleTa: "காலி அலமாரி",
    aspectW: 4,
    aspectH: 3,
    objects: [],
  },
];

export function getFixtureScene(id: string): FixtureScene | undefined {
  return FIXTURE_SCENES.find((s) => s.id === id);
}
