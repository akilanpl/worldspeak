/**
 * Perception feature types. Synthetic fixtures are always marked and never
 * presented as live inference; confidence is shown only when supplied by
 * actual model data (fixtures carry `confidence: null`).
 */

export interface NormalizedBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ObjectOrigin = "fixture" | "model";

export interface PerceivedObject {
  /** Stable within one detection set; never reused across requests. */
  id: string;
  labelEn: string;
  labelTa: string | null;
  /** Reviewed catalog noun when the label maps to one; null stays user text. */
  catalogId: string | null;
  box: NormalizedBox;
  /** Normalized polygon points; null means box-only fallback (no mask badge). */
  mask: { x: number; y: number }[] | null;
  /** Null unless supplied by actual model data — never synthesized. */
  confidence: number | null;
  origin: ObjectOrigin;
}

export interface FixtureScene {
  id: string;
  titleEn: string;
  titleTa: string;
  aspectW: number;
  aspectH: number;
  objects: PerceivedObject[];
}

export type CaptureSource = "camera" | "upload" | "fixture";

export interface CapturedImage {
  dataUrl: string;
  width: number;
  height: number;
  source: CaptureSource;
  name: string | null;
}

export type PerceptionStep =
  | "capture"
  | "review"
  | "analysis"
  | "objects"
  | "intent";

export function isNormalizedBox(box: unknown): box is NormalizedBox {
  if (typeof box !== "object" || box === null) return false;
  const b = box as Record<string, unknown>;
  return (
    typeof b["x1"] === "number" &&
    typeof b["y1"] === "number" &&
    typeof b["x2"] === "number" &&
    typeof b["y2"] === "number" &&
    b["x1"] >= 0 &&
    b["y1"] >= 0 &&
    b["x2"] <= 1 &&
    b["y2"] <= 1 &&
    (b["x1"] as number) < (b["x2"] as number) &&
    (b["y1"] as number) < (b["y2"] as number)
  );
}
