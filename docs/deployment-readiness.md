# Deployment and device acceptance — prepared, no hosted deployment

27 October 2026 (IST). This sprint adds executable safety checks and browser/HTTP acceptance. It does not select, purchase, provision or deploy to a hosting service. There is no newly verified public URL. Existing CI and local Node server evidence are distinct from public hosting, hosted sessions, native Tamil review and actual devices. No hosted settings, Meta calls, budgets, permits, migrations or cleanup supervisor are changed.

## Deployment gate

Use an existing approved Node.js-capable environment. The full app requires server routes and session validation; a static export cannot replace it. Keep the Node process behind an existing managed HTTPS reverse proxy in production, with request/body/time limits and no open debug port. Do not create a tunnel, buy a domain or register a service under this task. [Official Next.js self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting) recommends a reverse proxy and explains that NEXT_PUBLIC variables are fixed into the bundle at build time.

The preflight reads only its process environment, never dotenv file contents or credentials from disk. Because Next.js auto-loads dotenv overrides, it refuses release checkout root/apps/web dotenv files by file-presence checks; use an external secret manager/injected environment and a clean build checkout instead of silently validating different settings. It emits fixed diagnostic codes, never values. It is an operator/CI prerequisite; it does not silently mutate settings or infer that the remote worker is disabled.

```sh
node scripts/deployment-config.mjs --mode production
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm check:schema
pnpm build
pnpm check:secrets
pnpm --filter @worldspeak/web start
```

Supply protected configuration through the existing environment/secret manager **before both build and start**. Re-run the preflight before starting; validate the built artifact in staging, then promote exactly that artifact. Never reuse a build with different public settings.

| Setting | Scope / requirement |
| --- | --- |
| NEXT_PUBLIC_APP_URL | Exact approved HTTPS origin, no userinfo/path/query/fragment. Must match the actual public URL. |
| NEXT_PUBLIC_SUPABASE_URL | Exactly https://cafkyowssdemzivhzxbb.supabase.co. No alternate project. |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY | Public publishable key, or legacy JWT with anon role. Shape/role checks catch accidental secret exposure; they do not prove signature validity or entitlement. |
| SUPABASE_SERVICE_ROLE_KEY | Optional server-only account-deletion capability, never public. If absent, the gate warns and this feature is not accepted. Restrict to the existing server secret manager; never copy to browser build config or logs. |
| WORLDSPEAK_INFERENCE_API_ENABLED | Unset or exactly false. Typos and true fail this non-paid readiness gate. |
| WORLDSPEAK_LIVE_INFERENCE_APPROVED | Unset. No marker is enabled here. |
| META_MODEL_API_KEY / INFERENCE_DATABASE_URL | Must be absent from the web deployment environment. Keep the separately approved worker configuration outside the web bundle. |
| WORLDSPEAK_MOCK_AUTH_E2E | Unset outside the dedicated CI mock browser build. |
| NODE_TLS_REJECT_UNAUTHORIZED | Must never be 0. |

Only the four reviewed NEXT_PUBLIC names above are allowed. New public variables require explicit review; do not put service-role, database, OAuth secret or provider keys under any public name. The validator accepts an explicit `--mode demo` only for HTTP loopback (localhost/127.0.0.1/::1), with absent Auth configuration allowed as a clearly warned guest-only demo. It does not permit remote HTTP, alternate Supabase projects, live inference or mock Auth even in demo mode.

Reproducible guest demo without credentials:

```sh
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3137 node scripts/deployment-config.mjs --mode demo
pnpm build
pnpm --filter @worldspeak/web exec next start -H 127.0.0.1 -p 3137
# In a second terminal:
node scripts/deployment-smoke.mjs --base-url http://127.0.0.1:3137 --mode demo
```

Use a dedicated shell without inherited hosted/worker secrets. Do not unset or alter another developer's shell/services. The default root `dev`/start port is not changed.

## Functional HTTP smoke

The smoke runner accepts one explicit origin, performs nine sequential GETs, refuses redirects, omits cookies/Authorization, bounds each request to 10 seconds and each response to 1 MiB, and stops at the first error. No retries, crawl, POST, media or provider request occurs. It checks board/camera/video shells, static offline board, exact public cache manifest, service-worker/install-manifest availability and denied private preferences/job-status reads with private/no-store headers. Production requires 401 for anonymous API requests; the unconfigured loopback demo may return 503. A passing smoke does not prove a logged-in session, disabled upstream worker, actual physical Storage cleanup or provider billing state.

For an already deployed approved target only:

```sh
node scripts/deployment-smoke.mjs --base-url https://YOUR_APPROVED_ORIGIN --mode production
```

Replace the placeholder deliberately; never use credential-bearing URLs. The report contains check names, HTTP status and elapsed milliseconds, without response bodies, cookies or keys. HTTP redirects are failures; configure the canonical origin instead of following to another host.

CI runs this runner against its own local production server through `apps/web/e2e/deployment.spec.ts`. Tests use synthetic HTTP responses for failure injection (network, oversized body, cache leakage, public private-data response), and existing Chromium guest/mock authenticated journeys. The new browser checks cover 200% text bilingual composition (including a workspace grid intrinsic-minimum fix exposed by the first CI run) and service-worker caches containing only public offline assets. Existing mobile, reduced-motion, offline and speech-approval regressions remain required. Browser mocks are not hosted Auth or physical device evidence.

## HTTPS, OAuth and session acceptance — manual, not newly passed

After a host/origin is separately approved and actually deployed, record its TLS certificate, canonical URL, commit/artifact, platform free quota and exact configuration-key presence without values. Check Secure/HttpOnly/SameSite Auth cookies and private/no-store headers in browser tools without exporting cookies or HAR files. Use a private test session; never paste tokens. Perform real login, refresh, logout and protected-page rejection after logout. Test a second synthetic owner for private History isolation using the existing approved hosted test procedure, not anonymous smoke as a substitute.

For only cafkyowssdemzivhzxbb, the account operator must inspect Site URL and the exact redirect allowlist. Existing application flows request `/auth/callback?next=/history` and `/auth/callback?next=/reset-password` under NEXT_PUBLIC_APP_URL. Match the actual callback URLs according to Supabase configuration; avoid broad production wildcards. Google Cloud's OAuth redirect remains the Supabase provider callback `https://cafkyowssdemzivhzxbb.supabase.co/auth/v1/callback`, distinct from the application callback. Do not create a new OAuth client or change settings automatically. [Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls) explains Site URL and redirectTo matching. Inbox confirmation/recovery and OAuth-only account-deletion reauthentication remain existing gaps.

## Device and audible acceptance protocol

Use the synthetic local fixture/essential board; never upload real-user images. Record each row as PASS/FAIL/BLOCKED with observed result, date/time, release SHA, device model/OS/browser/version, viewport, zoom/text scale, voice name/language and network state. Do not record personal account details, scene photos or credentials. No physical device result is claimed by this document.

1. On a named phone and desktop, open the approved HTTPS app; ensure no permission prompt, upload, model request or speech on load. At 200% browser zoom/text scaling, navigate keyboard/touch, inspect no clipped controls/horizontal scroll, visible focus, 44px targets and readable Tamil shaping. Test OS reduced motion/high contrast where available; record actual behavior separately from emulation.
2. Water → explicit intent → English exact preview → select an English voice. Confirm silence until Speak. Press Speak once, hear exactly that preview; press Stop while speaking and verify prompt silence. Change intent and language; confirm no automatic speech. Repeat Tamil with an installed Tamil voice and an independent native reviewer. If Tamil voice is absent, verify the explicit unavailable state and mark audible Tamil BLOCKED, never substitute an English voice silently.
3. Approve the synthetic object journey → composer; verify object selection does not choose intent or speak. Return/history replay must show exact text and require fresh Speak. Review native Tamil wording separately; automated Unicode/text equality is not linguistic acceptance.
4. While online, wait for Offline ready. Disconnect network, reload `/offline/index.html`, choose Water and Tamil and preview. Test explicit Speak/Stop only with voices actually installed offline; distinguish offline board success from offline voice availability. Reconnect; verify no deferred media upload or inference request. Inspect cache entries for public offline assets only.
5. On a named phone, explicitly request camera and deny/allow permission in separate runs; check orientation, image review/retake and focus. Capture only a blank/synthetic illustration locally, with generation disabled. Verify no upload until explicit consent; do not approve a paid send. Do not infer real SAM acceptance from a fixture overlay.
6. Sign in with the authorized test account, save/favorite/search/replay/delete disposable text, change accessibility preferences, refresh and sign out. Preserve no-auto-speech and private History isolation. Remaining hosted manual checks stay open until observed; do not mark them passed from mock CI.

## Rollback and service-worker behavior

Record the prior known-green main SHA, immutable built artifact, environment-key inventory and approved origin before promotion. On regression, disable inference admission/live entry first (already disabled for this release), route traffic back to the prior artifact using the existing host's reversible release control, then run config/HTTP and guest browser gates. Do not reset the database, rollback/drop migrations, erase authorization tombstones/credit receipts, reset permits or run a destructive local shim on hosted Supabase.

Keep cleanup supervision running from its existing stable checkout; rolling back the web app must not archive/move that checkout or stop physical deletion. Service-worker cache versions derive from the static catalog fingerprint; an unchanged catalog may intentionally reuse the public board cache. After rollback, test online reload plus prepared offline mode. Do not clear user private data, use a global cache wipe or claim the worker hot-replaces an in-progress composition; active pages keep their current state until reload. A failed offline check requires a focused correction, not deletion of user records.

## Current status

No public deployment, new TLS/OAuth configuration, real-device test, audible Tamil approval or hosted session verification was performed by this sprint worker. No already-authorized public hosting target was found in repository evidence. The reproducible local server, CI/browser gates and read-only smoke are the available non-paid verification path. Any hosting purchase/provisioning, hosted configuration change, SAM authorization migration/application or model execution remains separately approval-gated.
