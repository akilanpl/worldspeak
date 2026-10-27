# Local perception and tracking evaluation

This is an offline, deterministic evaluation foundation for Stage 05. It replays
**synthetic fixtures**, exercises the real WorldSpeak parsers/contracts, and scores
locally supplied prediction files. It does not train, invoke or download a model,
use credentials, upload media, or speak. The recorded baseline is deliberately
imperfect fixture data, **not measured Meta performance or a specialized model**.

## Run

From the repository root, with Node 22 and the repository's pinned pnpm:

```sh
pnpm install --frozen-lockfile
node tooling/evaluation/run.mjs
pnpm exec tsc --noEmit -p tooling/evaluation/tsconfig.json
```

The runner uses the already-installed Vitest runtime; it never installs anything.
It runs the metric tests, real parser conformance and communication invariants,
then writes `tooling/evaluation/reports/local/report.json` and `report.md`.
The JSON includes dataset, wire-fixture, candidate, evaluator, contract-source and
lockfile SHA-256 values; no date, random ID, wall time or mutable remote state is
included. Repeating a run with the same sources/inputs gives identical reports.
Default local reports are ignored by Git. The versioned report in
`reports/synthetic-v1/` is a synthetic conformance reference.

```sh
node tooling/evaluation/run.mjs \
  --predictions /absolute/path/candidate.json \
  --out /absolute/path/candidate-report \
  --source fixture
```

Exit 0 means every test, contract check and quality gate passed. Exit 1 means
invalid input, a regression or failed quality gates. Invalid/duplicate CLI flags
exit 2. The runner writes two report files in the output directory; existing files
with those names are replaced. A failure marker is written before evaluation so
invalid JSON, missing inputs or a crashed test cannot leave a stale PASS report.
Detailed validation errors remain in the command diagnostics. A failing analytical
unit test also invalidates the report even if the scoring test itself passed.
Input/output path collisions reject before replacing any candidate bytes.

The independent `local-model-evaluation` workflow runs this command and strict
TypeScript checking, and uploads reports even on failure. It has read-only GitHub
permissions and no provider secrets/services. The existing application CI is
unchanged. The harness is intentionally outside the root Vitest discovery glob;
use this command or its dedicated workflow to execute it.

## Fixture provenance and scope

`fixtures/dataset.v1.json` contains three author-created, 100×100 PNG shape scenes,
two 2×2 binary mask cases, and two numerical trajectory cases. Scene PNGs are
committed, SHA-256 checked against annotations on every run, and depict colored
rectangles with exact integer pixel boundaries. Empty scenes test hallucinations.
These shape images are useful for adapter/evaluator plumbing; they do not stand
in for everyday objects, representative users, video clips or a held-out dataset.
The trajectory names are synthetic identifiers; no video tracking run occurred.

`fixtures/baseline.v1.json` is authored prediction data with one duplicated object,
one omitted object, partial box/mask overlap and a missing temporal sample. Its
source remains `fixture` and accounted cost is zero. It was never a provider run.

`fixtures/wire.v1.json` versions scene JSON, SAM segmentation, video grammar and
binary-raster adversarial cases. The 5×5 SAM grammar is the sanitized synthetic
conformance example already in `packages/inference/tests/providers.test.ts` and
`tracks.test.ts` (also described there as the public parser README example).
The runner uses the real `parseProviderResponse`, `adaptSamVideoText`, contract
schemas and `decodeRasterMask`, rather than an evaluator imitation. Invalid cases
include extra inferred intent, invalid JSON, bad geometry/confidence, empty labels,
excess objects, wrong model/usage, malformed or huge masks, wrong source dimensions,
wrong/duplicate video frames, nonbinary rasters and noncanonical base64.

The new numeric geometry, PNGs and fixture annotations are dedicated under
CC0-1.0. Reused SAM conformance grammar retains its upstream attribution above.
Regenerate the author-created assets/fixtures with:

```sh
node tooling/evaluation/fixtures/generate.mjs
```

A fixture/annotation semantic change requires a new version and reviewed baseline;
do not silently regenerate an accepted benchmark to make a regression pass.
PNG compression bytes can depend on the Node/zlib version: treat committed PNG
bytes and their committed hashes as authoritative; regeneration is a development
operation, not a prerequisite for evaluation.

## Prediction format and model comparisons

Copy `baseline.v1.json` as the schema example. Every file must have exactly:

- `version: "worldspeak-predictions.v1"`, `datasetVersion`, and a bounded `name`.
- `scenes`: each dataset scene ID paired with a full `InferenceResultSchema`
  `result`. Only detections and provenance are scored in this section.
- `masks`: each mask case ID paired with `mask` (object ID, normalized bounds,
  width, height, canonical row-major binary `rasterBase64`).
- `tracks`: each trajectory case ID paired with a `TrackSchema[]` `tracks` value.

Missing/extra/duplicate case IDs, unknown fields, wrong versions, malformed
contracts, duplicate track identities, more than 32 tracks/300 total track points
per case, invalid/unassociated scene segmentation masks and invalid raster bytes
reject before scoring. Only regular files are accepted; reads remain bounded even if a file grows during evaluation. Files are capped at 10 MiB and each section at 100 cases.
Metric cost is bounded; it does not allocate an image-sized canvas.

To score outputs obtained elsewhere from an **actually authorized model run**,
use `--source model`. Every scene's source, model name and exact PNG input SHA-256
must match the expected provenance. The runner does not verify that an externally
provided response ID is genuine, and reports that limitation. Never change fixture
provenance to `model` merely to obtain a passing report. `--source model` against
the shipped baseline correctly fails. Retain raw outputs and run authorization
outside this public synthetic dataset; never commit private participant media.

Run candidate A and B into different output directories. Compare their numeric
metrics, per-label scores and IoU sweep in `report.json` only when dataset/wire
hashes and evaluator/contract/lockfile hashes match. Changing parser or evaluator
code changes the measurement apparatus; rerun both candidates. Current production
contracts admit only the named Meta models. An open-weight experiment needs its
own truthful provenance contract/adapter before comparison; do not relabel it as
Meta. No specialization/training has occurred here.

## Metric definitions and edge cases

| Metric                            | Definition                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Label normalization               | Unicode NFKC, trim, collapse whitespace, lowercase. No synonyms, catalog mapping or translation.                                                                                                                                                                                                                     |
| Box IoU                           | Intersection area divided by union area of finite, positive-area normalized boxes. Touching edges score 0.                                                                                                                                                                                                           |
| Detection matching                | Same normalized label; descending IoU greedy **one-to-one** matching with stable expected/predicted index tie breaks. This is explicitly not optimal assignment or COCO AP.                                                                                                                                          |
| Detection precision / recall      | Micro TP/(TP+FP) and TP/(TP+FN), after matching independently per scene. Duplicate predictions count as FP; omissions as FN. No denominator is `null`, never an invented 100%.                                                                                                                                       |
| Threshold / category analysis     | Independent detection matches at IoU 0.25, 0.5 and 0.75; normalized-label categories at 0.5. Confidence is not calibrated or thresholded.                                                                                                                                                                            |
| Mean matched box IoU              | Arithmetic mean over detection matches at each threshold. Unmatched errors are represented by precision/recall, not hidden in this mean. No matches yields `null`.                                                                                                                                                   |
| Mask IoU                          | Decode and validate canonical base64 to exact binary row-major pixels using the production renderer boundary, then intersection foreground pixels / union foreground pixels. Both empty masks score 1; only one empty scores 0.                                                                                      |
| Mask sampling                     | Width, height and all normalized bounds must be identical. Differing grids fail rather than silently resizing, aligning or fabricating geometry. Mean is macro over mask cases, including the explicit empty case.                                                                                                   |
| Temporal point recall / precision | At each exact annotated timestamp, label/box-match objects one-to-one at IoU 0.5; matched points / expected points and matched / all predicted points. Extra timestamps/predictions lower precision. No interpolation, tolerance or inferred presence.                                                               |
| Continuity                        | Fraction of adjacent expected annotated point pairs whose two matched predictions keep the same candidate track ID. Missing endpoints lower continuity. Adjacent refers to annotation order, not guaranteed video-frame adjacency.                                                                                   |
| Identity switches                 | Adjacent expected observations both match but their candidate track IDs differ. Identity names need not equal ground-truth names. Matching is unique per timestamp across objects, including same-label objects.                                                                                                     |
| Invalid-output rejection          | Actual rejected invalid wire/raster fixtures divided by expected-invalid fixtures. Valid-output acceptance is reported separately to prevent an always-rejecting parser looking correct. Per-case semantic checks also gate a valid parsed video result's expected times/gap splitting.                              |
| Provenance mismatches             | Scene count with wrong expected source, input SHA-256 or model. Structural adapter/model enums are also validated by production schemas.                                                                                                                                                                             |
| Communication invariants          | Exact text/whitespace, exact Tamil text preservation (no translation), locale mismatch/unknown catalog rejection, structural polarity, fresh/current revision permits, text/locale tamper rejection and strict result/fixture shapes. These pure-engine checks do not prove browser speech gestures or device audio. |

Undefined precision/recall/continuity values remain `null` in JSON and appear as
`undefined` in the readable report. They fail a required aggregate quality gate.
A single-point track has no continuity denominator. Predicted tracks can fragment
or swap IDs and still have good spatial recall; continuity/switch counts expose it.
For floats, candidate samples must use the same normalized source-time calculation
as annotations. Variable frame-rate/time-alignment policy needs a future dataset.

The reviewed synthetic regression floors in `qualityFailures` are: detection
precision and recall ≥0.70 at IoU 0.5, matched box IoU ≥0.80, mean mask IoU ≥0.60,
temporal recall/precision ≥0.80, continuity ≥0.70, zero identity switches and zero
provenance mismatches. Wire invalid rejection, valid acceptance and communication
invariants must all be 1.0. These are **synthetic conformance gates**, not release
claims or chosen operating thresholds for a future model.

## Next evaluation work

Acquire consented or publicly permitted representative still/video data, record
rights and annotation quality, freeze train/validation/test splits, double-review
labels/masks/identity and time alignment, then add independently admitted model
outputs. Add confidence calibration, optimal-assignment/AP metrics and statistical
uncertainty only with representative data and explicit definitions. Never tune
on this tiny conformance suite and claim generalization or fine-tuning evidence.
