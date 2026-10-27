// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { validateDeploymentConfig, validateOrigin, hasDotenvOverrides, WORLD_SPEAK_URL } from "../../../../../scripts/deployment-config.mjs";
import { smokeDeployment } from "../../../../../scripts/deployment-smoke.mjs";

function credentialOrigin(password: string) {
  const url = new URL("https://worldspeak.example");
  url.username = "synthetic-user"; url.password = password;
  return url.toString();
}
const publicKey = "sb_publishable_" + "synthetic".repeat(3);
const production = () => ({ NEXT_PUBLIC_APP_URL: "https://worldspeak.example", NEXT_PUBLIC_SUPABASE_URL: WORLD_SPEAK_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, WORLDSPEAK_INFERENCE_API_ENABLED: "false" });

describe("offline production configuration gate", () => {
  it("accepts exact production project and no worker capabilities, with missing admin key warning", () => {
    expect(validateDeploymentConfig(production(), "production")).toMatchObject({ ok: true, warnings: ["ACCOUNT_DELETION_SERVER_KEY_ABSENT"] });
  });
  it("allows only an explicitly selected loopback guest demo", () => {
    expect(validateDeploymentConfig({ NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3129" }, "demo")).toMatchObject({ ok: true, warnings: ["ACCOUNT_DELETION_SERVER_KEY_ABSENT", "GUEST_ONLY_DEMO"] });
    expect(validateDeploymentConfig({ NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3129" }, undefined).ok).toBe(false);
  });
  it.each(["http://worldspeak.example", "https://worldspeak.example/path", "https://worldspeak.example/?token=private", "https://worldspeak.example/#fragment", credentialOrigin("synthetic-private"), "https://localhost", "https://127.0.0.1"])("rejects unsafe production origin %s", origin => {
    expect(validateDeploymentConfig({ ...production(), NEXT_PUBLIC_APP_URL: origin }, "production").errors).toContain("APP_ORIGIN_INVALID");
  });
  it.each(["http://192.168.1.2:3000", "https://worldspeak.example", "http://localhost.evil.example:3000"])("does not turn demo mode into a remote HTTP exception %s", origin => {
    expect(() => validateOrigin(origin, "demo")).toThrow();
  });
  it("requires complete Auth config in production and exact dedicated project", () => {
    expect(validateDeploymentConfig({ NEXT_PUBLIC_APP_URL: "https://worldspeak.example" }, "production").errors).toContain("PRODUCTION_AUTH_REQUIRED");
    expect(validateDeploymentConfig({ ...production(), NEXT_PUBLIC_SUPABASE_URL: "https://unrelated.supabase.co" }, "production").errors).toContain("WRONG_SUPABASE_PROJECT");
  });
  it.each([
    { NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "not-a-real-secret" },
    { NEXT_PUBLIC_NEW_UNREVIEWED_SETTING: "not-a-real-secret" },
    { INFERENCE_DATABASE_URL: "not-a-real-connection" },
    { META_MODEL_API_KEY: "not-a-real-key" },
    { WORLDSPEAK_LIVE_INFERENCE_APPROVED: "not-live" },
    { WORLDSPEAK_MOCK_AUTH_E2E: "1" },
    { WORLDSPEAK_INFERENCE_API_ENABLED: "true" },
    { WORLDSPEAK_INFERENCE_API_ENABLED: "0" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  ])("fails closed on unsafe environment keys", patch => {
    expect(validateDeploymentConfig({ ...production(), ...patch }, "production").ok).toBe(false);
  });
  it("rejects a service-role JWT under a public key name while allowing legacy anon shape", () => {
    const jwt = (role: string) => [Buffer.from('{}').toString("base64url"), Buffer.from(JSON.stringify({ role })).toString("base64url"), "synthetic"].join(".");
    expect(validateDeploymentConfig({ ...production(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt("service_role") }, "production").errors).toContain("PUBLIC_KEY_NOT_PUBLISHABLE_OR_ANON");
    expect(validateDeploymentConfig({ ...production(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt("anon") }, "production").ok).toBe(true);
  });
  it("detects hidden Next dotenv overrides by presence only", () => {
    const checked: string[] = [];
    expect(hasDotenvOverrides("/synthetic/root", path => { checked.push(path); return path.endsWith("apps/web/.env.production.local"); })).toBe(true);
    expect(checked).toContain("/synthetic/root/apps/web/.env.production.local");
    expect(hasDotenvOverrides("/synthetic/root", () => false)).toBe(false);
  });
  it("CLI emits fixed codes rather than credential-bearing values", () => {
    const marker = "private-value-must-not-be-emitted";
    const child = spawnSync(process.execPath, ["scripts/deployment-config.mjs", "--mode", "production"], {
      env: { NODE_ENV: "test", NEXT_PUBLIC_APP_URL: credentialOrigin(marker), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: marker }, encoding: "utf8" });
    expect(child.status).toBe(2);
    expect(child.stdout + child.stderr).not.toContain(marker);
    expect(child.stdout).toContain("APP_ORIGIN_INVALID");
  });
});

function response(path: string, privateStatus = 503): Response {
  if (path.startsWith("/api/")) return Response.json({ ok: false, error: { code: privateStatus === 401 ? "UNAUTHENTICATED" : "PROVIDER_UNAVAILABLE" } }, { status: privateStatus, headers: { "cache-control": "private, no-store" } });
  if (path === "/offline/board.v1.json") return Response.json({ cacheVersion: "synthetic-v1", assets: ["/offline/index.html", "/offline/board.js", "/offline/board.css", "/offline/board.v1.json"] });
  if (path === "/manifest.webmanifest") return new Response(JSON.stringify({ name: "WorldSpeak", start_url: "/" }), { headers: { "content-type": "application/manifest+json" } });
  if (path === "/sw.js") return new Response("/* synthetic service worker */", { headers: { "content-type": "application/javascript" } });
  return new Response("<html>WorldSpeak synthetic shell</html>", { headers: { "content-type": "text/html" } });
}
describe("read-only exact-origin deployment smoke", () => {
  it("checks the functional guest boundary without sending media, cookies, auth or mutations", async () => {
    const http = vi.fn(async (url: string, options: RequestInit) => {
      expect(options).toMatchObject({ method: "GET", credentials: "omit", redirect: "error", cache: "no-store" });
      expect(options.headers).toBeUndefined();
      expect(options.body).toBeUndefined();
      expect(new URL(url).origin).toBe("http://127.0.0.1:3129");
      return response(new URL(url).pathname);
    });
    const report = await smokeDeployment("http://127.0.0.1:3129", "demo", http);
    expect(report.ok).toBe(true);
    expect(report.checks).toHaveLength(9);
    expect(http).toHaveBeenCalledTimes(9);
  });
  it("production does not accept unconfigured Auth as a passing boundary", async () => {
    const http = vi.fn(async (url: string) => response(new URL(url).pathname));
    await expect(smokeDeployment("https://worldspeak.example", "production", http)).rejects.toThrow("SMOKE_GUEST_BOUNDARY");
  });
  it("network failure stops immediately without automatic retries", async () => {
    const http = vi.fn().mockRejectedValue(Error("sensitive-network-detail"));
    await expect(smokeDeployment("http://127.0.0.1:3129", "demo", http)).rejects.toThrow("SMOKE_NETWORK_board");
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("rejects oversized streamed responses and stops before another route", async () => {
    const http = vi.fn(async () => new Response(new Uint8Array(1024 * 1024 + 1), { headers: { "content-type": "text/html" } }));
    await expect(smokeDeployment("http://127.0.0.1:3129", "demo", http)).rejects.toThrow("BODY_LIMIT");
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("rejects leaked private data and unexpected offline cache entries", async () => {
    for (const kind of ["private", "cache"] as const) {
      const http = vi.fn(async (url: string) => {
        const path = new URL(url).pathname;
        if (kind === "private" && path.startsWith("/api/")) return Response.json({ ok: true, data: { syntheticPrivate: true } });
        if (kind === "cache" && path === "/offline/board.v1.json") return Response.json({ cacheVersion: "synthetic-v1", assets: ["/api/v1/preferences"] });
        return response(path);
      });
      await expect(smokeDeployment("http://127.0.0.1:3129", "demo", http)).rejects.toThrow();
    }
  });
});
