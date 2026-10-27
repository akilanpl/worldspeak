import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  truncateSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { conformance, communicationInvariants } from "./conformance";
import {
  evaluate,
  loadJson,
  parseCandidate,
  parseDataset,
  qualityFailures,
} from "./evaluate";
import {
  boxIou,
  detectionRates,
  detectionScore,
  maskIou,
  normalizeLabel,
  temporalScore,
} from "./metrics";
import datasetJson from "./fixtures/dataset.v1.json";
import baselineJson from "./fixtures/baseline.v1.json";

const dataset = parseDataset(datasetJson),
  baseline = parseCandidate(baselineJson, dataset);
afterEach(() => vi.unstubAllGlobals());
it("calculates analytical geometry, canonical labels and one-to-one detection counts", () => {
  expect(normalizeLabel("  ＣＨＡＩＲ \t Seat ")).toBe("chair seat");
  expect(normalizeLabel("chair")).not.toBe(normalizeLabel("seat"));
  const a = { x1: 0, y1: 0, x2: 0.5, y2: 1 },
    b = { x1: 0.25, y1: 0, x2: 0.75, y2: 1 };
  expect(boxIou(a, a)).toBe(1);
  expect(boxIou(a, b)).toBeCloseTo(1 / 3);
  expect(boxIou(a, { x1: 0.5, y1: 0, x2: 1, y2: 1 })).toBe(0);
  expect(() => boxIou({ ...a, x2: 0 }, b)).toThrow();
  const truth = dataset.scenes[0]!.expected,
    actual = baseline.scenes[0]!.result.detections;
  expect(detectionScore(truth, actual, 0.5)).toMatchObject({
    tp: 2,
    fp: 1,
    fn: 0,
  });
  expect(detectionRates(0, 0, 0)).toEqual({ precision: null, recall: null });
  expect(() => detectionScore(truth, actual, 0)).toThrow();
});
it("calculates masks only on valid identical binary grids, including empty masks", () => {
  expect(
    maskIou(dataset.masks[0]!.expected, baseline.masks[0]!.mask),
  ).toBeCloseTo(1 / 3);
  expect(maskIou(dataset.masks[1]!.expected, baseline.masks[1]!.mask)).toBe(1);
  expect(() => maskIou({}, baseline.masks[0]!.mask)).toThrow();
  expect(() =>
    maskIou(
      {
        ...baselineJson.masks[0]!.mask,
        bounds: { x1: 0, y1: 0, x2: 0.5, y2: 1 },
      },
      baseline.masks[0]!.mask,
    ),
  ).toThrow("grids");
});
it("penalizes missing samples and identity switches without interpolating tracks", () => {
  const truth = dataset.tracks[0]!.expected,
    actual = baseline.tracks[0]!.tracks;
  expect(temporalScore(truth, actual)).toMatchObject({
    pointRecall: 2 / 3,
    pointPrecision: 1,
    continuity: 0.5,
    identitySwitches: 0,
  });
  const first = truth[0]!;
  const split = [
    { ...first, trackId: "a", points: [first.points[0]!] },
    { ...first, trackId: "b", points: first.points.slice(1) },
  ];
  expect(temporalScore(truth, split)).toMatchObject({
    pointRecall: 1,
    continuity: 0.5,
    identitySwitches: 1,
  });
  const shifted = [
    { ...first, points: first.points.map((p) => ({ ...p, t: p.t + 0.00001 })) },
  ];
  expect(temporalScore(truth, shifted).pointRecall).toBe(0);
  expect(temporalScore([], [])).toMatchObject({
    pointRecall: null,
    continuity: null,
  });
  expect(() => temporalScore(truth, [first, first])).toThrow("Duplicate");
});
it("validates dataset/candidate identity, bounded masks and immutable versions", () => {
  expect(() =>
    parseCandidate({ ...baselineJson, datasetVersion: "other" }, dataset),
  ).toThrow();
  expect(() =>
    parseCandidate(
      { ...baselineJson, scenes: baselineJson.scenes.slice(1) },
      dataset,
    ),
  ).toThrow();
  expect(() =>
    parseCandidate(
      {
        ...baselineJson,
        scenes: [...baselineJson.scenes, baselineJson.scenes[0]],
      },
      dataset,
    ),
  ).toThrow();
  expect(() => parseDataset({ ...datasetJson, provenance: "model" })).toThrow();
  expect(() => parseDataset({ ...datasetJson, scenes: [] })).toThrow();
  expect(() =>
    parseCandidate(
      {
        ...baselineJson,
        masks: [
          {
            id: "partial-mask",
            mask: { ...baselineJson.masks[0]!.mask, rasterBase64: "AgABAA==" },
          },
          baselineJson.masks[1],
        ],
      },
      dataset,
    ),
  ).toThrow();
  const unordered = structuredClone(baselineJson);
  unordered.tracks[0]!.tracks[0]!.points.reverse();
  expect(() => parseCandidate(unordered, dataset)).toThrow();
});
it("rejects oversized JSON before parsing and invalid JSON without leaking state", () => {
  const dir = mkdtempSync(join(tmpdir(), "worldspeak-eval-input-"));
  try {
    const path = join(dir, "input.json");
    writeFileSync(path, "{}");
    truncateSync(path, 10 * 1024 * 1024 + 1);
    expect(() => loadJson(path)).toThrow("10 MiB");
    writeFileSync(path, "invalid JSON");
    expect(() => loadJson(path)).toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("reports exact synthetic baseline and fails degraded metrics or provenance", () => {
  const metrics = evaluate(dataset, baseline, "fixture"),
    atHalf = metrics.detections.find((d) => d.threshold === 0.5)!;
  expect(atHalf).toMatchObject({
    tp: 3,
    fp: 1,
    fn: 1,
    precision: 0.75,
    recall: 0.75,
  });
  expect(atHalf.meanMatchedBoxIou).toBeCloseTo(19 / 21);
  expect(metrics.masks.meanIou).toBeCloseTo(2 / 3);
  expect(metrics.temporal.pointRecall).toBeCloseTo(6 / 7);
  expect(metrics.temporal.continuity).toBe(0.75);
  expect(qualityFailures(metrics)).toEqual([]);
  expect(qualityFailures(evaluate(dataset, baseline, "model"))).toContain(
    "Provenance mismatches: two-objects, partial-overlap, empty-scene",
  );
  const empty = structuredClone(baseline);
  empty.scenes.forEach((s) => {
    s.result.detections = [];
  });
  expect(
    qualityFailures(evaluate(dataset, empty, "fixture")).length,
  ).toBeGreaterThan(0);
});
it("evaluates actual parser contracts and deterministic communication with network and speech unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw Error("Network disabled in evaluation");
    }),
  );
  vi.stubGlobal("speechSynthesis", undefined);
  const checks = await conformance();
  expect(checks.invalidOutputs).toBe(21);
  expect(checks.validOutputs).toBe(7);
  expect(checks.invalidRejectionRate).toBe(1);
  expect(checks.validAcceptanceRate).toBe(1);
  expect(checks.cases.filter((c) => !c.passed)).toEqual([]);
  expect(communicationInvariants().passRate).toBe(1);
  expect(fetch).not.toHaveBeenCalled();
});
it.skipIf(process.env.WORLDSPEAK_EVAL_RUN !== "1")(
  "writes deterministic machine/readable reports and enforces candidate quality gates",
  async () => {
    const out = process.env.WORLDSPEAK_EVAL_OUT!,
      source = process.env.WORLDSPEAK_EVAL_SOURCE;
    if (source !== "fixture" && source !== "model")
      throw Error("Explicit source must be fixture or model");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw Error("Network disabled in evaluation");
      }),
    );
    const input = loadJson(process.env.WORLDSPEAK_EVAL_PREDICTIONS!);
    const data = loadJson(
      fileURLToPath(new URL("fixtures/dataset.v1.json", import.meta.url)),
    );
    const wire = loadJson(
      fileURLToPath(new URL("fixtures/wire.v1.json", import.meta.url)),
    );
    const dataset = parseDataset(data.value),
      candidate = parseCandidate(input.value, dataset);
    for (const scene of dataset.scenes) {
      const path = fileURLToPath(
        new URL(`fixtures/${scene.asset}`, import.meta.url),
      );
      const hash = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      expect(hash, `Scene asset integrity: ${scene.id}`).toBe(
        scene.inputSha256,
      );
    }
    const sourceFiles = [
      "metrics.ts",
      "evaluate.ts",
      "conformance.ts",
      "evaluation.test.ts",
      "run.mjs",
      "vitest.config.mts",
    ];
    const evaluatorSha256 = createHash("sha256")
      .update(
        Buffer.concat(
          sourceFiles.map((p) =>
            readFileSync(fileURLToPath(new URL(p, import.meta.url))),
          ),
        ),
      )
      .digest("hex");
    const contractFiles = [
      "packages/contracts/src/inference.ts",
      "packages/inference/src/providers.ts",
      "packages/inference/src/tracks.ts",
      "apps/web/src/features/perception/rasterMask.ts",
      "packages/communication/src/render.ts",
      "packages/communication/src/approval.ts",
      "packages/communication/src/reducer.ts",
    ];
    const contractsSha256 = createHash("sha256")
      .update(
        Buffer.concat(
          contractFiles.map((p) =>
            readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url))),
          ),
        ),
      )
      .digest("hex");
    const metrics = evaluate(dataset, candidate, source),
      contracts = await conformance(),
      communication = communicationInvariants();
    const failures = qualityFailures(metrics);
    if (
      contracts.invalidRejectionRate !== 1 ||
      contracts.validAcceptanceRate !== 1 ||
      contracts.cases.some((c) => !c.passed)
    )
      failures.push("Contract conformance regression");
    if (communication.passRate !== 1)
      failures.push("Deterministic communication invariant regression");
    const report = {
      reportVersion: "worldspeak-evaluation-report.v1",
      datasetVersion: dataset.version,
      evaluatorSha256,
      contractsSha256,
      lockfileSha256: createHash("sha256")
        .update(
          readFileSync(
            fileURLToPath(new URL("../../pnpm-lock.yaml", import.meta.url)),
          ),
        )
        .digest("hex"),
      datasetSha256: data.sha256,
      wireSha256: wire.sha256,
      candidateSha256: input.sha256,
      candidateName: candidate.name,
      expectedProvenanceSource: source,
      evidence:
        source === "fixture"
          ? "Synthetic fixture replay; no model performance claim"
          : "User-supplied model outputs; runner did not invoke or verify a model run",
      metrics,
      contracts,
      communication,
      passed: failures.length === 0,
      failures,
    };
    mkdirSync(out, { recursive: true });
    writeFileSync(
      join(out, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    const d = metrics.detections.find((d) => d.threshold === 0.5)!;
    const percent = (v: number | null) =>
      v === null ? "undefined" : `${(v * 100).toFixed(2)}%`;
    writeFileSync(
      join(out, "report.md"),
      [
        "# WorldSpeak local evaluation",
        "",
        report.evidence,
        "",
        `Candidate: ${candidate.name.replace(/[\r\n]/g, " ")}`,
        `Dataset: ${dataset.version} (${data.sha256})`,
        `Candidate SHA-256: ${input.sha256}`,
        "",
        "| Metric | Value |",
        "| --- | ---: |",
        `| Detection precision @ IoU 0.5 | ${percent(d.precision)} |`,
        `| Detection recall @ IoU 0.5 | ${percent(d.recall)} |`,
        `| Mean matched box IoU | ${percent(d.meanMatchedBoxIou)} |`,
        `| Mean mask IoU | ${percent(metrics.masks.meanIou)} |`,
        `| Temporal point recall | ${percent(metrics.temporal.pointRecall)} |`,
        `| Temporal point precision | ${percent(metrics.temporal.pointPrecision)} |`,
        `| Track continuity | ${percent(metrics.temporal.continuity)} |`,
        `| Identity switches | ${metrics.temporal.identitySwitches} |`,
        `| Invalid output rejection | ${contracts.rejectedInvalid}/${contracts.invalidOutputs} |`,
        `| Valid output acceptance | ${contracts.acceptedValid}/${contracts.validOutputs} |`,
        `| Provenance mismatches | ${metrics.provenanceMismatches.length} |`,
        `| Communication invariants | ${communication.passed}/${communication.total} |`,
        "",
        `Result: ${report.passed ? "PASS" : "FAIL"}`,
        ...failures.map((f) => `- ${f}`),
        "",
        "Threshold sweep, categories, individual cases and fixture hashes: see report.json.",
        "These tiny synthetic cases establish metric/conformance behavior. They do not measure real-world accuracy, accessibility, speech output or fine-tuning.",
        "",
      ].join("\n"),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(failures, `Evaluation failed; reports: ${out}`).toEqual([]);
  },
);
