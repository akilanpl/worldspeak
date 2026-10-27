#!/usr/bin/env node
/* eslint-disable no-console -- CLI scan script reports to stdout/stderr */
/**
 * Fails if tracked files look like they contain secrets or credentials.
 * Placeholders in .env.example and the word "REDACTED" are allowed.
 */
import { execSync } from "node:child_process";

const ALLOWLIST = new Set([".env.example"]);
// The scanner's own pattern definitions trivially match themselves.
const SKIP_CONTENT = new Set(["scripts/check-secrets.mjs"]);

const PATTERNS = [
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bAKIA[0-9A-Z]{16}/,
  /service_role/i,
  /supabase.*(secret|service)/i,
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];

function trackedFiles() {
  const out = execSync("git ls-files", { encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

let failures = 0;
for (const file of trackedFiles()) {
  if (file === "pnpm-lock.yaml") continue;
  if (/(^|\/)\.env(\.|$)/.test(file) && file !== ".env.example") {
    console.error(`secret-scan: unexpected env file tracked: ${file}`);
    failures += 1;
    continue;
  }
  let text;
  try {
    text = execSync(`git show :${JSON.stringify(file)}`, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch {
    continue;
  }
  if (SKIP_CONTENT.has(file)) continue;
  for (const pattern of PATTERNS) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (line.includes(".env.example") || line.includes("REDACTED")) return;
      if (pattern.test(line) && !ALLOWLIST.has(file)) {
        console.error(`secret-scan: ${file}:${i + 1}: matches ${pattern}`);
        failures += 1;
      }
    });
  }
}

if (failures > 0) {
  console.error(`secret-scan: FAILED with ${failures} finding(s)`);
  process.exit(1);
}
console.log("secret-scan: ok — no secrets detected in tracked files");
