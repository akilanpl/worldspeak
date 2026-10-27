# WorldSpeak build log (Phase 1)

All times IST. Author: Muse Code implementation engineer.

## 2026-10-27 — Phase 1 scaffold and local slice

- Scaffolded `worldspeak/` pnpm workspace (`apps/web`, `packages/contracts`,
  `packages/communication`, `packages/catalog`, `packages/test-support`),
  strict TypeScript, ESLint, Vitest, Playwright, secret scanner, CI workflow.
- Implemented runtime-validated Intent/Composition/ApprovedUtterance
  contracts (Zod strict; unknown keys rejected).
- Implemented pure deterministic renderer + immutable reducer + speech
  authorization (`render.ts`, `reducer.ts`, `approval.ts`); provider
  realization stub always rejects — no model path exists in Phase 1.
- Seeded 26 essential bilingual tiles (needs/help/comfort/social) incl.
  water, food, toilet, rest, help, yes, no, thank you, please wait; Tamil
  `review-pending` throughout.
- Built essentials/composer/settings UI, client-only speech gateway, static
  offline board + versioned service worker generated from the same catalog.
- Added domain, component, Playwright (flow/keyboard/axe/offline), and
  offline-parity tests. No audible/model tests in CI (fakes only).
- Gate results (27 Oct 2026, ~07:25 IST, dev machine Node 25.9.0):
  `pnpm lint` exit 0; `pnpm typecheck` exit 0; `pnpm test` 34/34 exit 0;
  `pnpm build` (offline board `v1-e382dba8`, 26 tiles; Next 16.4.3 static
  `/` + `/offline`) exit 0; `pnpm test:e2e` 6/6 Chromium exit 0
  (flow/keyboard/axe-zero-serious-or-critical/prepared-offline, zero
  `/api` requests offline); `pnpm check:secrets` exit 0. E2E needed
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright` (user cache dir blocked in
  this sandbox) plus one escalated shell for browser launch.
- Deviations: catalog JSON lives under `packages/catalog/data/` (layout
  detail); offline board embeds a generated projection of the renderer with
  parity tests rather than importing TS into static HTML; system font stack
  instead of self-hosted files (fully offline, no download needed).
- Limitations: Tamil unreviewed; audible speech + real-device checks not run;
  no auth/cloud/model/capture/training (by design, later phases).

## 2026-10-27 — Phase 2: local Supabase foundation

- Corrected two clearly erroneous Tamil strings (request-help.object dative;
  stale-preview politeness); `review-pending` preserved everywhere.
- Added local migrations 001 core (profiles, preferences, consent,
  conversations, messages, favorites + provisioning trigger), 002
  ownership/RLS (revoked anon, narrow grants, forced RLS, immutable owner),
  003 private storage buckets/policies, 004 trigram search indexes.
- Added `pnpm test:db` harness (ephemeral local Postgres or PGHOST service):
  shim + migrations from empty state, 10/10 two-user + anonymous isolation
  scenarios PASS. No remote project touched.
- Implemented Supabase Auth code paths (email/password, Google PKCE,
  callback with local-only redirect, recovery), profiles/preferences/history/
  favorites/search/delete/account API routes with contract error envelopes,
  owner-only server derivation, and idempotent message/favorite writes.
- Added private history/favorites/settings pages, replay-into-composer
  (`?load=`, no auto-speak), Save/Favorite on the board (disabled for
  guests), and honest not-configured states. Guest board unchanged and
  redirect-free.
- Gate results: lint 0; typecheck 0; vitest 40/40; test:db 10/10 scenarios;
  build 0 (all routes); e2e 9/9 Chromium; secrets 0. Authenticated live
  flows implemented but not run (cloud gate). Local Postgres needed one
  escalated shell (sandbox shm) — recorded, not hidden.
- Deviations: `@worldspeak/db` types hand-written pending `gen types`;
  storage policies RLS-tested at SQL level with no app uploads yet.

## 2026-10-27T08:41+05:30 — Phase 2 hosted blocker resolution (Sol)

- Audited all four baseline commits and published exact aa58466 by normal fast-forward; no history rewrite or discarded Muse work.
- Created dedicated Free Supabase worldspeak, cafkyowssdemzivhzxbb, Mumbai, after organization choice and $0 cost quote. Applied reviewed core/ownership/private Storage/search plus hardening and atomic favorite migrations. Canonical local filenames now match hosted migration versions; source hashes/types snapshot recorded. Unrelated projects unchanged.
- Fixed platform Storage compatibility, exposed trigger execution, extension placement, missing FK index, request/response refresh cookies, callback allowlist, configured-origin CSRF, private caching, bounded JSON/cursors, generated database typing, persistent preferences, exact replay, atomic favorite/data reset and password-verified identity deletion. Removed destructive hosted-test advice and system-cluster copying; added local reset guards.
- Tamil help now says help *me regarding the object*, without guessed suffix concatenation; labels/status reviewed and review-pending retained. Exact typed whitespace is retained in React/static board. No medical advice or model capability added.
- Executed pinned lockfile install, lint/typecheck, 43/43 unit tests, 12/12 local DB scenario groups, 16/16 hosted Auth/Data API/Storage/Next API groups, unconfigured/configured production builds and approved artifact check. Actual client static assets/admin-key check and final secret audit are release gates recorded in manifest.
- Hosted tests used real tokens/JWTs and administrative synthetic token fixtures; public signup to reserved domains failed (email_address_invalid, then email rate limit). Inbox delivery and Google OAuth not claimed. Wrong-password account deletion denial and correct-password full Auth/data cascade were exercised. Synthetic users/objects/conversations checked to zero.
- Local E2E attempted: Chromium failed its macOS Mach port bootstrap before any of nine assertions. Historical Muse 9/9 is retained as baseline evidence only. Current browser verification is delegated to the repository's existing CI workflow, not a new agent or paid service.
- Browser: email provider/confirmation inspected in Brave; local Site URL entered; Google credentials empty. Exact callback allowlist prepared, but persistence not yet independently verified. Human Google/controlled-inbox/device/rules steps remain.
- No Meta application model calls, Phase 3 implementation, GPU, paid service or production hosting. Current handoff deliberately keeps Phase 2 acceptance incomplete.

## 2026-10-27 — release CI and real Google follow-up

- Implementation commit 146a4f5 passed GitHub CI: 43 unit tests, 12 DB scenario groups, 9 browser tests, lint/types/build/schema/secret gates. Run: https://github.com/akilanpl/worldspeak/actions/runs/40443225544 . Local browser bootstrap remains blocked.
- Human configured Google; saved callback allowlist/Site URL independently checked in Brave. First delayed flow expired; fresh flow completed to History with a real hosted identity/session/profile. Signed-in exact synthetic Save/Favorite and History passed; foreign existing conversation read returned NOT_FOUND. No tokens/account details retained.
- Removed the disposable cross-user account, exact synthetic marker messages and their empty conversations. Hosted aggregate verified zero synthetic users/storage objects/marker messages/test conversations; real Google identity retained. Remaining manual UX and inbox/native/device/rules gates remain explicit; Phase 3 not started.
- Google sign-out then returned to the guest board; hosted session count fell to zero with identity retained. Visiting History redirected to /sign-in?next=/history. No speech was triggered.

## 2026-10-27 — isolated non-paid inference core

- Created `feat/meta-inference-core` from verified latest main 80dcee4 in dedicated sibling worktree. Muse branches/worktrees unchanged.
- Added forward migration 007 for owner-scoped jobs/media, private global/user micro-USD budgets and receipts, one-shot dispatch permits, lease fencing, uncertain holds/reconciliation and independent cleanup surviving Auth deletion. Tested locally only; not applied to hosted Supabase.
- Added authenticated still upload/job APIs, normalization/metadata stripping, server-only Standard Spark and SAM Responses adapters, official SAM parser and strict geometry/output/usage validation. Video normalization is pure and synthetic-tested; no real video inference claimed. No speech/communication-engine changes.
- Added non-paid provider, API, image and failure/concurrency tests; final commands/counts recorded in inference-core evidence. Prepared explicit $0.05, two-generation smoke proposal; no paid Meta calls. All Phase 2 manual gates remain visible.

## 2026-10-27 — final consolidation review

- Independently inspected PR #1/#2, commit heads, passing workflows, empty review threads and repository review rules. Corrected the verified project reference to cafkyowssdemzivhzxbb in release documentation and PR metadata.
- PR #1 privacy correction f340541 passed CI 40455155409 and was normally merged first as 3d5c045313115c7a118e14d9d5d09296d004107e. PR #2 retargeted to main before the final corrective push. No preservation branch deleted or force-pushed.
- Removed URL payload fallback, added bounded 10-minute tab-memory fallback for blocked sessionStorage, rejected legacy inline links and resolved stored drafts only after hydration. Browser regression proves private own words stay out of URLs/requests and disappear safely on reload without Storage.
- Fenced upload/admission/poll continuations across cancel/reset/unmount. Cancellation reports request/acknowledgement only; late IDs trigger cleanup rather than submission/publication. Lost acknowledgements are uncertain. Consent distinguishes logical expiry, scheduled physical deletion and 24-hour derived result retention.
- Hardened unapplied migration 007: permanent first-smoke authorization, designated-owner permits, scoped atomic activation/consumption, no rearming after identity/history deletion, no worker funding permission and no accounting resets. Synthetic local smoke-authorization tests cover reruns, scope and counter failures and concurrent activation. No hosted migration or paid generation is implied by release merge.
- Read-only hosted check confirms dedicated WorldSpeak project healthy with exactly migrations 001–006. Existing intentional data-erasure RPC warning remains; leaked-password protection is disabled (plan review required). Hosted 007/credentials/cleanup-byte checks await explicit human approval.

## 2026-10-27 — approved hosted 007 and cleanup verification

- Applied only exact approved 007 (SQL SHA-256 1e8420ca5316ea2f1df898dca447d5b8410acdc2a7b45897fe5e4c95b76e6be2) to cafkyowssdemzivhzxbb; actual receipt version 20261027060440. Renamed only its canonical filename, regenerated hosted types, removed the forward RPC overlay and updated the artifact snapshot.
- Passed 13 hosted JWT/Data API/Storage assertions with disposable synthetic users and an already-terminal job fixture; no job admission/reservation/dispatch. Accounts/metadata removed; both exact synthetic files independently confirmed absent using fresh cache-busted authenticated reads plus listings. Initial immediate-read contradiction caused a stop; explicit human-approved bounded lease recovery completed both records, retaining daily recheck tombstones.
- Created explicitly authorized restricted LOGIN with only worker membership, generated password locally, verified owner-only ignored URI and actual TLS/capability boundaries. Used dashboard-verified session pooler and trusted project CA; no TLS bypass.
- Added provider-free cleanup entry point and sanitized owner-only environment launcher. Reject unacknowledged cleanup completion. Human registered the local LaunchAgent after sandbox bootstrap failure; seven recurring idle runs, last exit 0, empty errors independently verified. Five-second cadence, one item/run; Mac/session availability limitation remains.
- Security advisors: no ERROR, five private deny-all INFOs, six reviewed owner-derived definer WARNs and one Free-plan leaked-password-protection WARN. Seven unused-index performance INFOs. No plan upgrade, unrelated project or billable resource changes.
- Hosted budgets/reservations/spend, permits and smoke authorizations remain zero. Meta balance privately reconfirmed; no model request. Free-credit product-improvement notice recorded; genuine inference and the $0.05 two-call smoke remain separately gated. Phase 2 manual gaps preserved.
- A metadata inspection exposed only disposable fixture passwords in local tool output; affected accounts were deleted and cascades verified. No project/worker/real-user credentials or tokens emitted. Fixture credential file removed.

## 2026-10-27 — JSONB result persistence repair

- Reproduced the real-smoke defect with pinned Postgres.js 3.4.9 against an isolated local PostgreSQL scratch database: a manually stringified JSONB parameter is serialized again and stored as a JSON string. The new production-store regression failed before the fix (`string !== object`).
- Replaced only the worker finish boundary's manual stringify with `sql.json(result)`, retaining SQL NULL for absent results. No response-schema relaxation, migration or historical-result rewrite.
- Added five real-driver database regression groups using a disposable least-privilege local login and the actual `makeStore().store.finish` implementation. They cover exact nested detection/box/mask/provenance/usage round trips, owner RPC `JobViewSchema`, failed/null results, cancellation and wrong/expired/finalized leases. HTTP is forbidden in this suite; no provider or hosted call is involved.
- The first smoke remains a historical partial result: Spark provider success, durable contract failure, SAM unexecuted. Hosted billing, consumed/disabled permits and the permanent authorization tombstone were not changed or reset by this repair. Another live inference run is not authorized.
- Initial repair CI passed with one retry in the unchanged guest evaluation: its final `toHaveCount(0)` assertion was not awaited and raced test teardown. Added the missing await without changing the assertion or application behavior; final CI must verify the complete suite on that head.

## 27 October 2026 — non-paid Spark workflow / SAM readiness

From ecb6223, isolated test/spark-sam-workflow. Reconstructed sanitized chair geometry (0.247,0.139)–(0.746,0.868), confidence .99, explicitly synthetic receipt IDs. Extended real-driver local owner RPC test, component consent/status/overlay/catalog-confirmation/bilingual intent coverage, mock-auth Chromium composer/Speak regression and synthetic SAM parser→adapter geometry/mask tests. Bind returned model to requested operation. No hosted/Meta calls, no permits/accounting/tombstone changes. Historical Spark application failure is preserved; real SAM and pixel-mask display remain unverified. See ai-workflow-validation.md and sam-only-acceptance-proposal.md for reproducible commands, deployment proposal and acceptance boundaries. Gate results are recorded in the focused PR and CI; do not treat this entry as proof of a live provider test.

Browser gate correction: first CI run passed the new mock-auth chair journey and 40 other tests, but two existing tests correctly rejected applying a configured build to their closed-cloud-gate assertions. CI now runs the original unconfigured suite, then rebuilds with synthetic public settings for only the new mock-auth test. No guest assertion is weakened or skipped to conceal that configuration conflict.
