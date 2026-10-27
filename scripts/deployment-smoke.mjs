#!/usr/bin/env node
/* eslint-disable no-console -- emits sanitized named HTTP checks only */
import { pathToFileURL } from "node:url";
import { validateOrigin } from "./deployment-config.mjs";

const MAX_BODY = 1024 * 1024;
const ROUTES = [
  ["board", "/", "text/html"],
  ["camera-shell", "/perception", "text/html"],
  ["video-shell", "/video", "text/html"],
  ["offline-board", "/offline/index.html", "text/html"],
  ["offline-manifest", "/offline/board.v1.json", "application/json"],
  ["service-worker", "/sw.js", "javascript"],
  ["install-manifest", "/manifest.webmanifest", "application/manifest+json"],
  ["guest-private-preferences", "/api/v1/preferences", "application/json"],
  ["guest-job-status", "/api/v1/jobs/00000000-0000-4000-8000-000000000000", "application/json"],
];
async function boundedText(response) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) { await response.body?.cancel(); throw Error("BODY_LIMIT"); }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = []; let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > MAX_BODY) { await reader.cancel(); throw Error("BODY_LIMIT"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
/** Explicit exact target, GET only, no cookies/Authorization, no retry/redirect.
 * Network failures stop immediately; response bodies/headers are never returned.
 * @param {string} baseUrl
 * @param {"demo"|"production"} mode
 * @param {(url: string, init: RequestInit) => Promise<Response>} [fetchImpl]
 */
export async function smokeDeployment(baseUrl, mode, fetchImpl = fetch) {
  const origin = validateOrigin(baseUrl, mode), checks = [];
  for (const [name, path, type] of ROUTES) {
    const start = performance.now();
    let response;
    try { response = await fetchImpl(origin + path, { method: "GET", redirect: "error", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(10000) }); }
    catch { throw Error(`SMOKE_NETWORK_${name}`); }
    const body = await boundedText(response);
    if (!response.headers.get("content-type")?.includes(type)) throw Error(`SMOKE_CONTENT_TYPE_${name}`);
    if (path.startsWith("/api/")) {
      const allowed = mode === "production" ? [401] : [401, 503];
      if (!allowed.includes(response.status) || !/private/.test(response.headers.get("cache-control") ?? "") || !/no-store/.test(response.headers.get("cache-control") ?? ""))
        throw Error(`SMOKE_GUEST_BOUNDARY_${name}`);
      let error;
      try { error = JSON.parse(body); } catch { throw Error(`SMOKE_JSON_${name}`); }
      if (error.ok !== false || !["UNAUTHENTICATED", "PROVIDER_UNAVAILABLE"].includes(error.error?.code) || "data" in error)
        throw Error(`SMOKE_PRIVATE_BODY_${name}`);
    } else {
      if (response.status !== 200) throw Error(`SMOKE_STATUS_${name}`);
      if (type === "text/html" && !body.includes("WorldSpeak")) throw Error(`SMOKE_CONTENT_${name}`);
      if (name === "offline-manifest") {
        let manifest;
        try { manifest = JSON.parse(body); } catch { throw Error("SMOKE_OFFLINE_MANIFEST"); }
        const expected = ["/offline/index.html", "/offline/board.js", "/offline/board.css", "/offline/board.v1.json"];
        if (typeof manifest.cacheVersion !== "string" || !Array.isArray(manifest.assets) || JSON.stringify([...manifest.assets].sort()) !== JSON.stringify(expected.sort())) throw Error("SMOKE_OFFLINE_MANIFEST");
      }
      if (name === "install-manifest") {
        let manifest;
        try { manifest = JSON.parse(body); } catch { throw Error("SMOKE_INSTALL_MANIFEST"); }
        if (manifest.name !== "WorldSpeak" || manifest.start_url !== "/") throw Error("SMOKE_INSTALL_MANIFEST");
      }
    }
    checks.push({ name, status: response.status, elapsedMs: Math.round(performance.now() - start) });
  }
  return { ok: true, mode, checks };
}
export async function smokeMain(args) {
  if (args.length !== 4 || args[0] !== "--base-url" || args[2] !== "--mode") {
    console.error("deployment-smoke: use --base-url <exact-origin> --mode demo|production"); return 2;
  }
  try { console.log(JSON.stringify(await smokeDeployment(args[1], args[3]))); return 0; }
  catch (error) {
    const message = error instanceof Error && /^(?:SMOKE_[A-Za-z_-]+|BODY_LIMIT)$/.test(error.message) ? error.message : "SMOKE_BLOCKED";
    console.error(message); return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await smokeMain(process.argv.slice(2));
