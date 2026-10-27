# Known limitations and validation checklist

> Read this before quoting any submission document externally. "Verified" = corroborated by repo evidence or a live official source. Everything else is a plan, proposal, or open gate.

## Verified facts (safe to claim)

- [x] One real Standard Muse Spark 1.3 generation succeeded: sanitized chair, confidence 0.99, box (0.247, 0.139)–(0.746, 0.868); ledger 4402 micro-USD ($0.00440175). Source: `docs/ai-workflow-validation.md` (Sol's branch).
- [x] The historical Spark result failed application persistence (JSONB double-encoding); repaired via `sql.json(object)` in PR #6 with real-driver regression tests. Historical receipt preserved unchanged.
- [x] Provider request shape targets `https://api.meta.ai/v1` with `muse-spark-1.3` / `sam-3.1` model IDs corroborated live on https://dev.meta.ai/docs/pricing-rate-limits (27 Oct 2026).
- [x] SAM per-still price $0.0025 (official $2.50/1k) corroborated live on the same pricing page.
- [x] Guest board, auth, RLS isolation, Google OAuth session, hosted inference-core RLS checks (13 groups, zero fixtures/objects remaining). Sources: `docs/evidence/*`, `docs/handoff/STATE.md`.
- [x] Submission scheduling facts below are third-party-reported, not official rules.

## Explicitly unverified (never claim)

- [ ] Live SAM 3.1 output, entitlement, or pixel-mask rendering. No SAM call has ever been dispatched.
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
