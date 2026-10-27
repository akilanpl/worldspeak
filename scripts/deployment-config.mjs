#!/usr/bin/env node
/* eslint-disable no-console -- sanitized deployment validation diagnostics only */
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const WORLD_SPEAK_PROJECT = "cafkyowssdemzivhzxbb";
export const WORLD_SPEAK_URL = `https://${WORLD_SPEAK_PROJECT}.supabase.co`;
const PUBLIC_NAMES = new Set(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Pure, offline checks. Returns fixed codes only; never echoes env values. */
export function validateDeploymentConfig(env, mode) {
  const errors = [], warnings = [];
  if (!["demo", "production"].includes(mode)) errors.push("MODE_REQUIRED");
  let origin = null;
  try { origin = validateOrigin(env.NEXT_PUBLIC_APP_URL, mode); }
  catch { errors.push("APP_ORIGIN_INVALID"); }
  if (Object.keys(env).some(k => k.startsWith("NEXT_PUBLIC_") && env[k] && !PUBLIC_NAMES.has(k)))
    errors.push("UNREVIEWED_PUBLIC_VARIABLE");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const keys = [env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, env.NEXT_PUBLIC_SUPABASE_ANON_KEY].filter(Boolean);
  if ((url && url !== WORLD_SPEAK_URL) || (env.WORLDSPEAK_EXPECTED_PROJECT_REF && env.WORLDSPEAK_EXPECTED_PROJECT_REF !== WORLD_SPEAK_PROJECT))
    errors.push("WRONG_SUPABASE_PROJECT");
  if (mode === "production" && (!url || !keys.length)) errors.push("PRODUCTION_AUTH_REQUIRED");
  if (Boolean(url) !== Boolean(keys.length)) errors.push("INCOMPLETE_PUBLIC_AUTH_CONFIG");
  if (keys.some(key => !isPublicKey(key))) errors.push("PUBLIC_KEY_NOT_PUBLISHABLE_OR_ANON");
  if (env.WORLDSPEAK_INFERENCE_API_ENABLED !== undefined && env.WORLDSPEAK_INFERENCE_API_ENABLED !== "false")
    errors.push("INFERENCE_MUST_REMAIN_DISABLED");
  if (env.WORLDSPEAK_LIVE_INFERENCE_APPROVED) errors.push("LIVE_MARKER_FORBIDDEN");
  if (env.WORLDSPEAK_MOCK_AUTH_E2E) errors.push("MOCK_AUTH_FORBIDDEN");
  if (env.INFERENCE_DATABASE_URL || env.META_MODEL_API_KEY) errors.push("WORKER_CREDENTIAL_IN_WEB_ENV");
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") errors.push("TLS_VERIFICATION_DISABLED");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) warnings.push("ACCOUNT_DELETION_SERVER_KEY_ABSENT");
  if (!url && !keys.length) warnings.push("GUEST_ONLY_DEMO");
  return { ok: errors.length === 0, mode, origin, errors, warnings };
}

/** Only an exact supplied origin; demo exception is HTTP loopback only. */
export function validateOrigin(raw, mode) {
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw Error("origin");
  const local = LOOPBACK.has(url.hostname);
  if (mode === "demo" ? !(local && url.protocol === "http:") : !(mode === "production" && !local && url.protocol === "https:")) throw Error("origin");
  return url.origin;
}

function isPublicKey(key) {
  if (typeof key !== "string" || key.length > 8192) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return true;
  try {
    const parts = key.split(".");
    if (parts.length !== 3 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    // This detects accidental service-role exposure, not signature validity.
    return payload.role === "anon";
  } catch { return false; }
}

// Next.js auto-loads dotenv files; release checks cannot ignore hidden overrides.
// Detect file presence only. No credential file is opened or copied.
/** @param {string} root @param {(path:string) => boolean} [exists] */
export function hasDotenvOverrides(root, exists = existsSync) {
  const files = [".env", ".env.local", ".env.production", ".env.production.local", ".env.development", ".env.development.local", ".env.test", ".env.test.local"];
  return [root, join(root, "apps/web")].some(dir => files.some(file => exists(join(dir, file))));
}

export function configMain(args, env = process.env) {
  if (args.length !== 2 || args[0] !== "--mode") {
    console.error("deployment-config: use --mode demo|production; no env files are read");
    return 2;
  }
  const result = validateDeploymentConfig(env, args[1]);
  if (hasDotenvOverrides(fileURLToPath(new URL("../", import.meta.url)))) {
    result.errors.push("DOTENV_FILES_PRESENT"); result.ok = false;
  }
  // Deliberately omit origin and all input values from CLI output.
  console.log(JSON.stringify({ ok: result.ok, mode: ["demo", "production"].includes(result.mode) ? result.mode : "invalid", errors: result.errors, warnings: result.warnings }));
  return result.ok ? 0 : 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = configMain(process.argv.slice(2));
