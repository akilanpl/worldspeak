# AI workflow validation and minimal demo

27 October 2026 (IST). Baseline ecb62232b7d224d3f6b90022edd7bcaf491eaebf. This work makes no Meta request, media-bearing preflight, hosted database change or budget/permit change.

## Evidence boundaries

The first real Standard Muse Spark generation succeeded: sanitized chair, confidence 0.99, normalized box (0.247, 0.139)–(0.746, 0.868). Historical result persistence failed because Postgres.js double encoded an already stringified JSONB parameter. The real attempt therefore did not complete the application workflow; SAM was never called. PR #6 subsequently repaired storage with sql.json(object), preserving strict JobViewSchema. Do not rewrite the historical result or claim a successful end-to-end paid test. Historical calculated Spark charge: $0.00440175, conservative ledger 4402 micro-USD; provider billing attribution still requires reconciliation.

New tests reconstruct that public sanitized geometry with explicitly synthetic response IDs. Browser wire fixtures use source:model only to exercise the production model branch under intercepted networking; they are NOT real provider evidence. Provider-parser/local database fixtures use source:fixture. No genuine response ID is invented. Auth in the browser is simulated; actual owner/foreign RPC isolation is exercised independently in local PostgreSQL with the real driver, not a hosted session.

Coverage chain: production worker finish → JSONB object → authenticated owner RPC → JobViewSchema (local database suite); mock upload/admission/status → strict validation → adapter → exact overlay geometry → explicit object selection → user-confirmed catalog label → explicit intent → deterministic English/Tamil preview (component suite); same network-to-overlay journey → opaque tab-local composer handoff → fresh Speak and language-change/no-auto-speech assertions (Chromium). Existing hook and route tests cover late responses, cancellation, no paid retries, guest/disabled rejection, empty/error states and cleanup requests. Physical hosted cleanup is not reverified by mocked DELETE acknowledgements.

Small production hardening: bind status result provenance model to its requested operation (scene=muse-spark-1.3, segment=sam-3.1), rejecting mismatches without weakening the schema.

## Reproduce safely

Run pnpm install --frozen-lockfile, pnpm test, pnpm typecheck, pnpm lint, pnpm check:schema, pnpm build and pnpm check:secrets. For disposable local PostgreSQL only, use PGHOST=127.0.0.1 PGPORT=5432 PGUSER=<local-user> PGDATABASE=worldspeak_phase2_ai_validation pnpm test:db. Never point this destructive scratch harness at hosted Supabase.

For the mock authenticated browser journey, build/run pnpm test:e2e with WORLDSPEAK_MOCK_AUTH_E2E=1, NEXT_PUBLIC_SUPABASE_URL=https://worldspeak-e2e.supabase.co and NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-public-browser-test-key. CI supplies these **only** to the E2E build/run step. Browser cookie reads are simulated, not sent as a credential to the Next server. All non-loopback browser requests are aborted and inference routes are fulfilled locally. No production auth bypass or fixture UI mode is added. Without this explicit test configuration, that single browser test reports skipped; existing guest/browser tests still run. Do not use real keys in this mock harness.

## Honest three-minute demonstration

1. State: real Spark generation succeeded, persistence failed historically, JSONB repaired; all displayed automated results below are reconstructed mocks. Real SAM remains unverified.
2. In the mock Chromium run, upload synthetic test PNG → Analyze → show unchecked consent and zero requests → approve/send → display Spark-labeled reconstructed chair box → explicitly select it. Confidence/geometry are assertions, not a new measurement.
3. Confirm chair against the reviewed catalog via Correct the label → Apply label (provider catalogId remains null). Choose I want. Show exact English preview. Approve → composer. No speech yet; press Speak. Change Tamil; verify no speech until fresh Speak. Tamil remains review-pending and synthesized speech is stubbed in automation.
4. Show local database/driver result and SAM grammar fixture tests. Describe mask rendering and fresh-authorization blockers rather than presenting a synthetic SAM mask as live inference.

## Deployment proposal — nothing provisioned

Simplest no-cost demo now: an existing local machine, loopback Node.js production server after pnpm build, Meta admission/live marker disabled, essential guest board available. This is a local demo, not a public deployment. A full hosted Next.js application needs a Node.js-capable host because server routes/Auth are required; static export cannot supply the complete application. [Official Next.js deployment options](https://nextjs.org/docs/app/getting-started/deploying) confirm Node server support for all features. Reuse an existing approved HTTPS host only after verifying its actual free quota/terms; no hosting service is selected or provisioned here.

Public build config: NEXT_PUBLIC_APP_URL and dedicated project's NEXT_PUBLIC_SUPABASE_URL plus publishable/anon key. Server-only: account-deletion SUPABASE_SERVICE_ROLE_KEY where enabled; never NEXT_PUBLIC. Worker-only, outside web bundle: restricted INFERENCE_DATABASE_URL, TLS CA config, server-only Storage key, META_MODEL_API_KEY only for a future authorized worker. Keep WORLDSPEAK_INFERENCE_API_ENABLED=false and live-generation marker unset. Existing Mac cleanup supervisor requires awake/logged-in/networked Mac; it is not always-on hosting. Verify allowed origins, OAuth redirect allowlist and exact HTTPS URL after deployment approval; do not copy local test auth or credentials.

## Remaining acceptance gaps

Real SAM entitlement/output and fresh append-only authorization mechanism; SAM pixel-mask rendering (boxes currently shown); hosted billing attribution; fresh hosted cleanup/device verification; inbox confirmation/recovery delivery; remaining signed-in history/preferences/search/replay/delete manual checks; OAuth-only deletion reauthentication; independent native Tamil wording, physical audible English/Tamil/Stop, phone camera permissions/orientation, zoom/shaping/contrast and offline speech/board on named devices; final participant rules. Automated Chromium speech stubs do not prove audio or native language quality. See sam-only-acceptance-proposal.md and existing Phase 2 BLOCKERS. No new assignment to Muse.
