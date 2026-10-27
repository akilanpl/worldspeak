# Technical architecture summary

## One paragraph

WorldSpeak is a Next.js App Router + React/strict-TypeScript application on Supabase (Postgres with owner-only RLS, Auth, private Storage), organized as a pnpm monorepo (`apps/web`, `apps/worker`, `packages/*`). Perception (Meta inference) is isolated behind a server-only provider adapter and a durable job pipeline; user intent flows through a pure deterministic communication engine into an exact bilingual preview; speech fires only under a fresh user authorization. Phase 1–2 (board, accounts, private data) are built and partially verified; the Meta inference core exists on Sol's integration branches with one historical real Spark result.

## Layers

- **Client (`apps/web`):** board/composer/settings UI, analysis flow (consent panel → job status → overlay → catalog confirmation → intent → preview), tab-local composer handoff, client-only speech gateway. No secrets in the bundle; inference key is worker-only.
- **Server routes (`apps/web/src/app/api/v1`):** authenticated jobs, messages, favorites, search, delete; contract-validated (Zod strict, unknown keys rejected); RLS denials map to NOT_FOUND (no cross-user oracle).
- **Worker (`apps/worker`):** durable job admission with idempotency keys, atomic integer-microUSD reservations, lease fencing with SKIP LOCKED claim, uncertain-call handling without auto-retry, consent-scoped transient uploads, and cleanup outbox with local supervision. Structured results persist via typed `sql.json()` JSONB parameters (the repaired defect class).
- **Provider adapter (`packages/inference`):** server-only Meta Model API client. Scene → `muse-spark-1.3` with safety-constrained prompt and strict `json_schema` structured output; segment → `sam-3.1` with `mask_encoding:one_bit` and dimension-match guards. Envelope validation (single message lane, `output_text` only, usage caps, model-operation binding) rejects anything unexpected before parsing.
- **Communication engine (`packages/communication`):** pure renderer + immutable reducer + speech authorization bound to (compositionId, revision, textHash). Catalog templates (`packages/catalog`) are reviewed; user text is exact and untranslated; negation is structural.
- **Data (`supabase/migrations`, `packages/db`):** forward-only migrations; generated database types; owner-only RLS with immutable owner IDs and composite owner/parent FKs; private Storage with UUID-first-folder policies.

## Key technical decisions

- Determinism boundary: model output proposes geometry/labels only; all user-visible language comes from the reviewed catalog and pure engine.
- Speech permit bound to content hash and revision — replay, language change, and restore never auto-speak.
- No generic retries: empty validated matches are legitimate empty results; uncertain sends reconcile, never resubmit.
- Append-only authorization thinking: spent permits are tombstoned, never rearmed; a future SAM test needs the new ticket mechanism (designed, not built).
- Offline-first guest slice: static board generated from the same catalog with parity tests; auth/API/private content never precached.

## Verification posture

Pinned toolchain (pnpm 10.18.0, Node ≥ 20.9, Next 16.4.3, vitest, Playwright, axe); secret scanner; offline-approved-artifact schema-drift check; local destructive PostgreSQL harness (never hosted); 16 hosted Auth/Data/Storage scenario groups; real Google OAuth session verified; CI run https://github.com/akilanpl/worldspeak/actions/runs/40443225544 . Full boundary list: [limitations-and-validation.md](limitations-and-validation.md).
