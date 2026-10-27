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
