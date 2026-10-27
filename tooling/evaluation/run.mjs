#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help") {
    process.stdout.write(
      "Offline synthetic conformance / candidate evaluation\nnode tooling/evaluation/run.mjs [--predictions PATH] [--out DIRECTORY] [--source fixture|model]\nReports include a failure marker if validation cannot complete; exit 1 means regression or invalid input.\n",
    );
    process.exit(0);
  }
  if (
    !["--predictions", "--out", "--source"].includes(arg) ||
    !args[i + 1] ||
    args[i + 1].startsWith("--") ||
    options[arg]
  ) {
    process.stderr.write("Invalid or duplicate argument. Use --help.\n");
    process.exit(2);
  }
  options[arg] = args[++i];
}
if (
  options["--source"] &&
  !["fixture", "model"].includes(options["--source"])
) {
  process.stderr.write("Invalid --source\n");
  process.exit(2);
}
const out = resolve(
  options["--out"] ?? resolve(root, "tooling/evaluation/reports/local"),
);
const predictions = resolve(
  options["--predictions"] ??
    resolve(root, "tooling/evaluation/fixtures/baseline.v1.json"),
);
if (
  ["report.json", "report.md"].some((name) => {
    const target = resolve(out, name);
    return (
      target === predictions ||
      (existsSync(target) &&
        existsSync(predictions) &&
        realpathSync(target) === realpathSync(predictions))
    );
  })
) {
  process.stderr.write(
    "Prediction input must differ from output report paths.\n",
  );
  process.exit(2);
}
// A failed input/load/test must never leave a stale PASS from an earlier run.
mkdirSync(out, { recursive: true });
writeFileSync(
  resolve(out, "report.json"),
  JSON.stringify(
    {
      reportVersion: "worldspeak-evaluation-report.v1",
      passed: false,
      failures: ["Evaluation did not complete; inspect command diagnostics"],
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  resolve(out, "report.md"),
  "# WorldSpeak local evaluation\n\nFAIL: Evaluation did not complete; inspect command diagnostics.\n",
);
const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/vitest/vitest.mjs"),
    "run",
    "--config",
    resolve(root, "tooling/evaluation/vitest.config.mts"),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      WORLDSPEAK_EVAL_PREDICTIONS: predictions,
      WORLDSPEAK_EVAL_OUT: out,
      WORLDSPEAK_EVAL_SOURCE: options["--source"] ?? "fixture",
      WORLDSPEAK_EVAL_RUN: "1",
    },
  },
);
if (result.error) process.stderr.write(result.error.message + "\n");
process.exit(result.status ?? 1);
