# STATE — WorldSpeak Phase 2 (local Supabase foundation)

Architecture: WORLDSPEAK-PHASE-0 v1.0. Package/runtime revisions: Node
25.9.0 (dev) / 22 (CI), pnpm 10.18.0, next 16.4.3, react 19.3.1,
typescript 5.9.3, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0,
PostgreSQL 15 (local harness) / 15 (CI service).
Schema migration head (local): 202610270004_search.sql. No remote project
linked, touched, or created. Flags: Tamil still `review-pending`; no
provider calls; no cloud resources.

## Tested capabilities (all passing 27 Oct 2026, IST)

- `pnpm test` (vitest): 40/40 — Phase 1 suites (contracts, catalog,
  renderer, reducer/approval, speech gateway, component, offline parity)
  plus API validation (schemas, LIKE escaping, cursor codec, error mapping).
- `pnpm test:db`: migrations apply from empty state; 10/10 RLS isolation
  scenarios PASS (provisioning, anonymous denied, owner reads, cross-user
  read/update/delete blocked, spoofed owner rejected, owner immutable,
  cross-owner links rejected, messages immutable/idempotent, favorites
  cascade, consent append-only, storage folder isolation).
- `pnpm test:e2e` (Playwright/Chromium): 9/9 — Phase 1 flow/keyboard/axe/
  offline plus guest board with zero redirects and zero `/api` requests,
  honest not-configured states on auth-gated pages.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0, `pnpm build` exit 0
  (all API routes + auth/private pages render; proxy registered),
  `pnpm check:secrets` exit 0.

## Current errors

None in the verified local scope. Authenticated live flows (sign-up,
Google OAuth, save/favorites/search/delete against real GoTrue + hosted
DB) are implemented but unverified — blocked at the cloud provisioning
gate, recorded as not-run in `docs/evidence/manifest.json`.
