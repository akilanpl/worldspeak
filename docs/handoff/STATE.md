# STATE — WorldSpeak Phase 1 (local slice)

Architecture: WORLDSPEAK-PHASE-0 v1.0. Package/runtime revisions: Node
25.9.0 (dev) / 22 (CI), pnpm 10.18.0, next 16.4.3, react 19.3.1,
typescript 5.9.3. Schema migration head: none (no database in Phase 1).
Flags: offline board `worldspeak-offline-v1-<catalog hash>` (generated);
Tamil `review-pending`; no provider calls; no cloud resources.

## Tested capabilities (all passing 27 Oct 2026, ~07:25 IST)

- `pnpm test` (vitest): 34/34 — contracts, catalog, renderer, reducer/approval,
  speech gateway, component, offline parity.
- `pnpm test:e2e` (Playwright/Chromium): 6/6 — tile→preview→Speak→Stop flow,
  keyboard-only path, axe (zero serious/critical), prepared-offline board with
  network disabled and zero `/api` requests.
- `pnpm lint` exit 0, `pnpm typecheck` exit 0, `pnpm build` exit 0
  (offline board cache `v1-e382dba8`), `pnpm check:secrets` exit 0.

Full record: `docs/evidence/manifest.json`. No failures to record.

## Current errors

None known at handoff except the explicitly listed human follow-ups in
NEXT.md/BLOCKERS.md.
