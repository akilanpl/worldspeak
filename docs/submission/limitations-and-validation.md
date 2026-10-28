# Known limitations and validation checklist

> Read this before quoting any submission document externally. "Verified" = corroborated by repo evidence or a live official source. Everything else is a plan, proposal, or open gate.

## Verified facts (safe to claim)

- [x] One real Standard Muse Spark 1.3 generation succeeded: sanitized chair, confidence 0.99, box (0.247, 0.139)–(0.746, 0.868); ledger 4402 micro-USD ($0.00440175). Source: `docs/ai-workflow-validation.md` (main, via PR #7).
- [x] The historical Spark result failed application persistence (JSONB double-encoding); repaired via `sql.json(object)` in PR #6 with real-driver regression tests. Historical receipt preserved unchanged.
- [x] Provider request shape targets `https://api.meta.ai/v1` with `muse-spark-1.3` / `sam-3.1` model IDs corroborated live on https://dev.meta.ai/docs/pricing-rate-limits (27 Oct 2026).
- [x] SAM per-still price $0.0025 (official $2.50/1k) corroborated live on the same pricing page.
- [x] Guest board, auth, RLS isolation, Google OAuth session, hosted inference-core RLS checks (13 groups, zero fixtures/objects remaining). Sources: `docs/evidence/*`, `docs/handoff/STATE.md`.
- [x] SAM pixel-mask rendering implemented and tested with synthetic fixtures only (stable ID association, bounded decode, exact-pixel browser assertions). Source: `docs/pixel-mask-renderer.md` (main, via PR #9). No live SAM inference is claimed by these tests.
- [x] Public Meta and Cerebral Valley event pages confirm November 4, 2026 at 9 PM ET (November 5 at 07:30 IST); accepted participant rules still need owner review.

## Explicitly unverified (never claim)

- [ ] Live SAM 3.1 output or entitlement. No SAM call has ever been dispatched; rendered masks exist only for synthetic fixtures (`docs/pixel-mask-renderer.md`).
- [ ] Hosted provider billing reconciliation (internal ledger only).
- [ ] Inbox email delivery; remaining manual signed-in UX (search/replay/delete/preferences); OAuth-only deletion reauthentication.
- [ ] Native Tamil approval; audible speech quality; physical-device camera/permissions/orientation/contrast/offline behavior.
- [ ] Final official rules, judging weights, repository/video/asset requirements — the participant guide is still an ungated human check.

## Fixture-boundary checklist (for demo and submission text)

- [ ] Every automated "AI result" screen labeled reconstructed mock with synthetic IDs.
- [ ] No genuine response ID invented anywhere.
- [ ] No video tracking, mask polygon, billing, or delivery claim beyond evidence.
- [ ] Tamil labeled review-pending; speech labeled stubbed in automation.

## Pre-submission validation commands (no paid calls)

```sh
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm check:schema && pnpm build && pnpm check:secrets
```

Local DB harness only against disposable scratch Postgres (never hosted). Mock-auth Chromium journey only with the explicit synthetic env in `docs/ai-workflow-validation.md`.
