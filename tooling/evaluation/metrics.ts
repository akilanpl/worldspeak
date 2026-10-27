import {
  NormalizedBoxSchema,
  TrackSchema,
  type Detection,
  type ModelTrack,
} from "../../packages/contracts/src/inference";
import { decodeRasterMask } from "../../apps/web/src/features/perception/rasterMask";

export type Box = Detection["box"];
export function normalizeLabel(label: string): string {
  // Deliberately lexical: no inferred catalog meaning, translation or synonyms.
  return label.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}
export function boxIou(a: Box, b: Box): number {
  NormalizedBoxSchema.parse(a);
  NormalizedBoxSchema.parse(b);
  const intersection =
    Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) *
    Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const area = (p: Box) => (p.x2 - p.x1) * (p.y2 - p.y1);
  return intersection / (area(a) + area(b) - intersection);
}
export function maskIou(a: unknown, b: unknown): number {
  const left = decodeRasterMask(a),
    right = decodeRasterMask(b);
  if (!left || !right) throw Error("Invalid binary raster mask");
  // Scores only identical sampling grids: never fabricate pixels by resizing.
  if (
    left.width !== right.width ||
    left.height !== right.height ||
    ["x1", "x2", "y1", "y2"].some(
      (k) => left.bounds[k as keyof Box] !== right.bounds[k as keyof Box],
    )
  )
    throw Error("Mask grids differ");
  let intersection = 0,
    union = 0;
  for (let i = 0; i < left.pixels.length; i++) {
    if (left.pixels[i] || right.pixels[i]) union++;
    if (left.pixels[i] && right.pixels[i]) intersection++;
  }
  return union === 0 ? 1 : intersection / union;
}
export function detectionScore(
  expected: Detection[],
  actual: Detection[],
  threshold: number,
) {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1)
    throw Error("Invalid IoU threshold");
  const pairs: { e: number; a: number; iou: number }[] = [];
  expected.forEach((e, ei) =>
    actual.forEach((a, ai) => {
      if (normalizeLabel(e.label) === normalizeLabel(a.label)) {
        const iou = boxIou(e.box, a.box);
        if (iou >= threshold) pairs.push({ e: ei, a: ai, iou });
      }
    }),
  );
  // Deterministic greedy one-to-one matching, descending IoU, stable index ties.
  pairs.sort((a, b) => b.iou - a.iou || a.e - b.e || a.a - b.a);
  const es = new Set<number>(),
    as = new Set<number>(),
    matches: typeof pairs = [];
  for (const pair of pairs)
    if (!es.has(pair.e) && !as.has(pair.a)) {
      es.add(pair.e);
      as.add(pair.a);
      matches.push(pair);
    }
  return {
    tp: matches.length,
    fp: actual.length - matches.length,
    fn: expected.length - matches.length,
    matches,
  };
}
export function detectionRates(tp: number, fp: number, fn: number) {
  return {
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
  };
}
export function temporalScore(
  expected: ModelTrack[],
  actual: ModelTrack[],
  threshold = 0.5,
) {
  expected.forEach((t) => TrackSchema.parse(t));
  actual.forEach((t) => TrackSchema.parse(t));
  if (
    new Set(expected.map((t) => t.trackId)).size !== expected.length ||
    new Set(actual.map((t) => t.trackId)).size !== actual.length
  )
    throw Error("Duplicate track ID");
  let expectedPoints = 0,
    matchedPoints = 0,
    adjacentPairs = 0,
    preservedPairs = 0,
    iouSum = 0,
    identitySwitches = 0,
    predictedPoints = 0;
  actual.forEach((t) => {
    predictedPoints += t.points.length;
  });
  // Per exact timestamp, match objects one-to-one before measuring identity.
  const assignment = new Map<string, { track: string; iou: number }>();
  const times = [
    ...new Set(expected.flatMap((t) => t.points.map((p) => p.t))),
  ].sort((a, b) => a - b);
  for (const time of times) {
    const truth = expected.flatMap((t) =>
      t.points.filter((p) => p.t === time).map((p) => ({ t, p })),
    );
    const prediction = actual.flatMap((t) =>
      t.points.filter((p) => p.t === time).map((p) => ({ t, p })),
    );
    const detections = (rows: typeof truth): Detection[] =>
      rows.map(({ t, p }) => ({
        label: t.label,
        catalogId: t.catalogId,
        confidence: t.confidence,
        box: p.box,
        mask: null,
      }));
    for (const m of detectionScore(
      detections(truth),
      detections(prediction),
      threshold,
    ).matches) {
      const e = truth[m.e]!,
        a = prediction[m.a]!;
      assignment.set(`${e.t.trackId}\0${time}`, {
        track: a.t.trackId,
        iou: m.iou,
      });
    }
  }
  for (const t of expected) {
    for (let i = 0; i < t.points.length; i++) {
      expectedPoints++;
      const current = assignment.get(`${t.trackId}\0${t.points[i]!.t}`);
      if (current) {
        matchedPoints++;
        iouSum += current.iou;
      }
      if (i > 0) {
        adjacentPairs++;
        const previous = assignment.get(`${t.trackId}\0${t.points[i - 1]!.t}`);
        if (current && previous) {
          if (current.track === previous.track) preservedPairs++;
          else identitySwitches++;
        }
      }
    }
  }
  return {
    expectedPoints,
    predictedPoints,
    matchedPoints,
    adjacentPairs,
    preservedPairs,
    identitySwitches,
    pointRecall: expectedPoints ? matchedPoints / expectedPoints : null,
    pointPrecision: predictedPoints ? matchedPoints / predictedPoints : null,
    continuity: adjacentPairs ? preservedPairs / adjacentPairs : null,
    meanBoxIou: matchedPoints ? iouSum / matchedPoints : null,
  };
}
