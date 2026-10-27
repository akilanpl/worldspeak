import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import {
  DetectionSchema,
  InferenceResultSchema,
  TrackSchema,
  type Detection,
  type ModelTrack,
  type InferenceResult,
} from "../../packages/contracts/src/inference";
import { decodeRasterMask } from "../../apps/web/src/features/perception/rasterMask";
import {
  detectionRates,
  detectionScore,
  maskIou,
  normalizeLabel,
  temporalScore,
} from "./metrics";

export interface Dataset {
  version: string;
  provenance: string;
  license: string;
  description: string;
  scenes: {
    id: string;
    asset: string;
    inputSha256: string;
    model: string;
    expected: Detection[];
  }[];
  masks: { id: string; expected: unknown }[];
  tracks: { id: string; expected: ModelTrack[] }[];
}
export interface Candidate {
  version: string;
  datasetVersion: string;
  name: string;
  scenes: { id: string; result: InferenceResult }[];
  masks: { id: string; mask: unknown }[];
  tracks: { id: string; tracks: ModelTrack[] }[];
}
export function record(
  value: unknown,
  keys: string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Expected object");
  const r = value as Record<string, unknown>;
  if (Object.keys(r).sort().join("|") !== [...keys].sort().join("|"))
    throw Error(`Unexpected keys: expected ${keys.join(",")}`);
  return r;
}
function text(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 500 ||
    /\0/u.test(value)
  )
    throw Error("Invalid bounded text");
  return value;
}
function rows(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 100)
    throw Error("Invalid bounded array");
  return value;
}
function unique<T extends { id: string }>(values: T[]): T[] {
  if (new Set(values.map((x) => x.id)).size !== values.length)
    throw Error("Duplicate case ID");
  return values;
}
function trackList(value: unknown): ModelTrack[] {
  const list = rows(value).map((t) => TrackSchema.parse(t));
  if (
    list.length > 32 ||
    list.reduce((n, t) => n + t.points.length, 0) > 300 ||
    new Set(list.map((t) => t.trackId)).size !== list.length
  )
    throw Error("Invalid track identities");
  return list;
}
function raster(value: unknown): unknown {
  const r = record(value, [
    "objectId",
    "bounds",
    "width",
    "height",
    "rasterBase64",
  ]);
  text(r.objectId);
  if (!decodeRasterMask(r)) throw Error("Invalid mask raster");
  return r;
}
export function parseDataset(value: unknown): Dataset {
  const d = record(value, [
    "version",
    "provenance",
    "license",
    "description",
    "scenes",
    "masks",
    "tracks",
  ]);
  if (
    d.version !== "worldspeak-eval.v1" ||
    d.provenance !== "author-created-synthetic" ||
    d.license !== "CC0-1.0"
  )
    throw Error("Unsupported dataset version/provenance");
  const scenes = unique(
    rows(d.scenes).map((value) => {
      const s = record(value, [
        "id",
        "asset",
        "inputSha256",
        "model",
        "expected",
      ]);
      if (
        typeof s.asset !== "string" ||
        !/^images\/[a-z-]+\.png$/.test(s.asset)
      )
        throw Error("Invalid local scene asset");
      if (
        typeof s.inputSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(s.inputSha256) ||
        !["muse-spark-1.3", "sam-3.1"].includes(String(s.model))
      )
        throw Error("Invalid expected provenance");
      return {
        id: text(s.id),
        asset: text(s.asset),
        inputSha256: s.inputSha256,
        model: text(s.model),
        expected: DetectionSchema.array().max(32).parse(s.expected),
      };
    }),
  );
  const masks = unique(
    rows(d.masks).map((value) => {
      const m = record(value, ["id", "expected"]);
      return { id: text(m.id), expected: raster(m.expected) };
    }),
  );
  const tracks = unique(
    rows(d.tracks).map((value) => {
      const t = record(value, ["id", "expected"]);
      return { id: text(t.id), expected: trackList(t.expected) };
    }),
  );
  if (!scenes.length || !masks.length || !tracks.length)
    throw Error("Dataset sections must be nonempty");
  return {
    version: text(d.version),
    provenance: text(d.provenance),
    license: text(d.license),
    description: text(d.description),
    scenes,
    masks,
    tracks,
  };
}
export function parseCandidate(value: unknown, dataset: Dataset): Candidate {
  const c = record(value, [
    "version",
    "datasetVersion",
    "name",
    "scenes",
    "masks",
    "tracks",
  ]);
  if (
    c.version !== "worldspeak-predictions.v1" ||
    c.datasetVersion !== dataset.version
  )
    throw Error("Prediction/dataset version mismatch");
  const scenes = unique(
    rows(c.scenes).map((value) => {
      const s = record(value, ["id", "result"]),
        result = InferenceResultSchema.parse(s.result);
      // The transport schema only bounds encoded text; exercise the stricter pixel boundary too.
      const ids = new Set<string>();
      for (const mask of result.segmentationMasks) {
        raster(mask);
        if (
          ids.has(mask.objectId) ||
          !result.detections.some((d) => d.objectId === mask.objectId)
        )
          throw Error("Unmatched/duplicate segmentation identity");
        ids.add(mask.objectId);
      }
      return { id: text(s.id), result };
    }),
  );
  const masks = unique(
    rows(c.masks).map((value) => {
      const m = record(value, ["id", "mask"]);
      return { id: text(m.id), mask: raster(m.mask) };
    }),
  );
  const tracks = unique(
    rows(c.tracks).map((value) => {
      const t = record(value, ["id", "tracks"]);
      return { id: text(t.id), tracks: trackList(t.tracks) };
    }),
  );
  for (const section of ["scenes", "masks", "tracks"] as const) {
    const actual = { scenes, masks, tracks }[section].map((v) => v.id).sort();
    if (
      actual.join("\0") !==
      dataset[section]
        .map((v) => v.id)
        .sort()
        .join("\0")
    )
      throw Error(`Missing/extra ${section} case IDs`);
  }
  return {
    version: text(c.version),
    datasetVersion: text(c.datasetVersion),
    name: text(c.name),
    scenes,
    masks,
    tracks,
  };
}
export function loadJson(path: string): { value: unknown; sha256: string } {
  if (statSync(path).size > 10 * 1024 * 1024)
    throw Error("Input exceeds 10 MiB");
  const data = readFileSync(path);
  if (data.length > 10 * 1024 * 1024) throw Error("Input exceeds 10 MiB");
  return {
    value: JSON.parse(data.toString("utf8")) as unknown,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}
export function evaluate(
  dataset: Dataset,
  candidate: Candidate,
  source: "fixture" | "model",
) {
  const thresholds = [0.25, 0.5, 0.75].map((threshold) => {
    const perScene = dataset.scenes.map((scene) => {
      const actual = candidate.scenes.find((s) => s.id === scene.id)!.result
        .detections;
      return {
        id: scene.id,
        ...detectionScore(scene.expected, actual, threshold),
      };
    });
    const tp = perScene.reduce((sum, s) => sum + s.tp, 0),
      fp = perScene.reduce((sum, s) => sum + s.fp, 0),
      fn = perScene.reduce((sum, s) => sum + s.fn, 0);
    const overlaps = perScene.flatMap((s) => s.matches.map((m) => m.iou));
    return {
      threshold,
      tp,
      fp,
      fn,
      ...detectionRates(tp, fp, fn),
      meanMatchedBoxIou: overlaps.length
        ? overlaps.reduce((a, b) => a + b, 0) / overlaps.length
        : null,
      perScene,
    };
  });
  const labels = [
    ...new Set(
      dataset.scenes
        .flatMap((s) => s.expected.map((d) => normalizeLabel(d.label)))
        .concat(
          candidate.scenes.flatMap((s) =>
            s.result.detections.map((d) => normalizeLabel(d.label)),
          ),
        ),
    ),
  ].sort();
  const perLabel = labels.map((label) => {
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const s of dataset.scenes) {
      const a = candidate.scenes.find((c) => c.id === s.id)!.result.detections;
      const result = detectionScore(
        s.expected.filter((d) => normalizeLabel(d.label) === label),
        a.filter((d) => normalizeLabel(d.label) === label),
        0.5,
      );
      tp += result.tp;
      fp += result.fp;
      fn += result.fn;
    }
    return { label, tp, fp, fn, ...detectionRates(tp, fp, fn) };
  });
  const masks = dataset.masks.map((m) => ({
    id: m.id,
    iou: maskIou(m.expected, candidate.masks.find((c) => c.id === m.id)!.mask),
  }));
  const temporal = dataset.tracks.map((t) => ({
    id: t.id,
    ...temporalScore(
      t.expected,
      candidate.tracks.find((c) => c.id === t.id)!.tracks,
    ),
  }));
  const sum = (
    key:
      | "expectedPoints"
      | "predictedPoints"
      | "matchedPoints"
      | "adjacentPairs"
      | "preservedPairs"
      | "identitySwitches",
  ) => temporal.reduce((n, t) => n + t[key], 0);
  const provenanceMismatches = dataset.scenes
    .filter((s) => {
      const p = candidate.scenes.find((c) => c.id === s.id)!.result.provenance;
      return (
        p.source !== source ||
        p.inputSha256 !== s.inputSha256 ||
        p.model !== s.model
      );
    })
    .map((s) => s.id);
  const maskMean = masks.reduce((a, b) => a + b.iou, 0) / masks.length;
  const temporalPoints = sum("expectedPoints"),
    predictedPoints = sum("predictedPoints"),
    matchedPoints = sum("matchedPoints"),
    adjacentPairs = sum("adjacentPairs");
  const temporalSummary = {
    pointRecall: temporalPoints ? matchedPoints / temporalPoints : null,
    pointPrecision: predictedPoints ? matchedPoints / predictedPoints : null,
    continuity: adjacentPairs ? sum("preservedPairs") / adjacentPairs : null,
    identitySwitches: sum("identitySwitches"),
  };
  return {
    detections: thresholds,
    perLabel,
    masks: { meanIou: maskMean, cases: masks },
    temporal: { ...temporalSummary, cases: temporal },
    provenanceMismatches,
  };
}
export function qualityFailures(
  metrics: ReturnType<typeof evaluate>,
): string[] {
  const failures: string[] = [];
  const detection = metrics.detections.find((d) => d.threshold === 0.5)!;
  const gate = (name: string, value: number | null, min: number) => {
    if (value === null || value < min)
      failures.push(`${name}: ${value} < ${min}`);
  };
  gate("detection precision@0.5", detection.precision, 0.7);
  gate("detection recall@0.5", detection.recall, 0.7);
  gate("mean matched box IoU@0.5", detection.meanMatchedBoxIou, 0.8);
  gate("mean mask IoU", metrics.masks.meanIou, 0.6);
  gate("temporal point recall", metrics.temporal.pointRecall, 0.8);
  gate("temporal point precision", metrics.temporal.pointPrecision, 0.8);
  gate("temporal continuity", metrics.temporal.continuity, 0.7);
  if (metrics.temporal.identitySwitches)
    failures.push("Temporal identity switches detected");
  if (metrics.provenanceMismatches.length)
    failures.push(
      `Provenance mismatches: ${metrics.provenanceMismatches.join(", ")}`,
    );
  return failures;
}
