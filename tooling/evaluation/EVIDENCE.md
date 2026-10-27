# Validation evidence — 27 October 2026

Base: `b76a95f` from freshly fetched `origin/main`. This deliverable edits only
`tooling/evaluation/` and adds its independent workflow. No inference runtime,
shared contract, package manifest, lockfile, application feature or existing CI
workflow was edited.

Local environment: macOS, Node 25.9.0, pinned pnpm 10.18.0 invoked through
`npm_config_cache=/private/tmp/worldspeak-solb-npm npx --yes pnpm@10.18.0`.
The environment's unpinned fallback was pnpm 11.25.0 and rejected the lockfile
under its release-age policy. It was not used, configured or relaxed; the
repository-pinned installer completed successfully with the frozen lockfile.

Executed successfully (exit 0):

- `pnpm@10.18.0 install --frozen-lockfile`.
- `node tooling/evaluation/run.mjs --out tooling/evaluation/reports/synthetic-v1`:
  **8/8 tests**. Real local contract/parser execution on synthetic inputs:
  **21/21 invalid outputs rejected**, **7/7 valid outputs accepted**,
  **11/11 deterministic communication invariants**.
- Repeated the runner to a separate directory and compared `report.json` and
  `report.md` with `cmp`: both byte-identical (exit 0).
- `pnpm exec tsc --noEmit -p tooling/evaluation/tsconfig.json`: strict harness and
  imported production-source checking.
- `pnpm@10.18.0 typecheck`: all workspace package checks passed.
- `pnpm@10.18.0 test`: **219 tests in 41 files passed**. This is separate from
  the independent harness's 8 tests.
- `pnpm@10.18.0 build`: optimized Next production build passed.
- `NODE_PATH="$PWD/apps/web/node_modules" pnpm@10.18.0 lint`: no errors;
  three pre-existing image warnings in perception components. The explicit
  local module path is needed because the repository's Next Babel parser cannot
  resolve `next/babel` for root `.mjs` files in this installation. The same issue
  reproduces on unchanged `scripts/check-secrets.mjs`; no lint rules were disabled.
- `pnpm@10.18.0 check:secrets` and `git diff --check`.

Executed expected failures:

- `--source model` with the fixture baseline: exit **1**, three scene provenance
  mismatches, machine-readable failing report.
- Malformed JSON candidate reusing a previous passing output directory: exit
  **1**, report replaced with `passed: false`; no stale PASS.
- Candidate with every detection omitted: exit **1**, precision/recall/box-IoU
  quality failures recorded in JSON.
- Unknown CLI flag: exit **2**.
- The metric suite also checks invalid/oversized JSON, duplicate/missing case IDs,
  unsupported versions/provenance, invalid masks, unordered timestamps, identity
  switches, missing samples, exact-time alignment, bounds and empty denominators.

The numeric reference values in the versioned report are intentionally authored
fixture scores: detection precision/recall 0.75, matched box IoU 19/21, mean mask
IoU 2/3, temporal point recall 6/7 and continuity 0.75. They are not model runs.

No browser/device acceptance, live Meta model call, external candidate model run,
training, fine-tuning, dataset generalization claim or paid service was performed.
The pure communication checks verify engine consent/integrity conditions; they
are not a substitute for the existing browser Speak-gesture tests. Dedicated
GitHub workflow status is recorded on the pull request, independently of these
local results.
