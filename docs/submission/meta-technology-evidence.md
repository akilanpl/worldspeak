# Meta technology integration and evidence matrix

> Audit date: 27 October 2026. Auditor scope: docs-only; provider code inspected read-only on Sol's `test/spark-sam-workflow` branch. No Meta generation calls were made for this audit. "Verified" means corroborated by repository evidence or a live official source cited below.

## Official sources checked (live, 27 Oct 2026)

- Meta Model API docs hub: https://dev.meta.ai/docs/overview — confirms Responses API, structured output, image understanding, media segmentation, SAM, and pricing sections exist as documented product surface.
- Pricing and rate limits: https://dev.meta.ai/docs/pricing-rate-limits — lists `muse-spark-1.3` (plus 1.2/1.1 and contributor tiers) as served models; SAM 3.1 billed per image/frame; segmentation at $2.50 per 1,000 images, streaming and non-streaming priced the same.
- Hackathon context (third-party guides, not official rules): $1M pool; build window 26 Oct–4 Nov 2026; project submissions due 9:00 PM ET 4 Nov 2026; $150 in Model API credits per accepted applicant; "Use of Meta AI Tooling" reported as a scored category. Final official rules/participant guide remain ungated by the human — see [recommendations-for-sol.md](recommendations-for-sol.md).

## Integration matrix

| Meta technology | How WorldSpeak uses it | Implementation location (Sol's branches) | Evidence | Status |
|---|---|---|---|---|
| Muse Spark 1.3 (`muse-spark-1.3`) | Scene understanding: lists visible physical objects with normalized 0–1 boxes under a strict JSON schema; safety-constrained prompt (objects only, no intent/identity/inference) | `packages/inference/src/providers.ts` `buildRequest` (scene branch) | `docs/ai-workflow-validation.md`: one real Standard generation succeeded — sanitized chair, confidence 0.99, box (0.247, 0.139)–(0.746, 0.868); historical charge $0.00440175 / ledger 4402 micro-USD | **Verified real result** (single historical call; application persistence failed at the time) |
| Model ID + endpoint correctness | Request targets `https://api.meta.ai/v1` Responses-style payload (`model`, `store:false`, `stream:false`, `text.format.json_schema strict`) | Same file; envelope parser requires `status:"completed"`, single message lane, `output_text` only, usage caps | `packages/inference/tests/providers.test.ts` (synthetic); model ID `muse-spark-1.3` corroborated live on the official pricing page | **Verified against official docs** |
| JSONB result persistence | Historical failure: Postgres.js double-encoded an already-stringified JSONB parameter, so the real Spark result never completed the app workflow | Fix commit `385e0fe` (`apps/worker/src/store.ts` → `sql.json(object)`), PR #6 | `apps/worker/tests/result-persistence.ts`: real-driver round trips (nested detection/box/mask/provenance/usage, owner RPC `JobViewSchema`, failed/null results, cancellation, lease races) | **Repaired and regression-tested**; historical result preserved as-is, never rewritten |
| SAM 3.1 (`sam-3.1`) | Still-image segmentation: concept prompt, `mask_encoding:"one_bit"`, `include_confidence`, dimension-match guard, binary raster decode | `packages/inference/src/providers.ts` (segment branch) + `@meta-sam/parser` | `packages/web/.../sam-pipeline.test.ts`, `PerceptionFlowAnalysis.test.tsx`: synthetic parser→adapter geometry/mask tests only | **Unverified** — no live SAM call has ever been dispatched; proposal in `docs/sam-only-acceptance-proposal.md` is unapproved |
| SAM pixel-mask rendering | Frontend retains decoded masks in `segmentationMasks`, but `adaptDetectionList`/`MaskOverlay` expose clickable boxes with `mask:null` | Analysis/perception UI on Sol's branches | `docs/sam-only-acceptance-proposal.md` acceptance-limit section | **Not implemented** — a box-selection demo can pass; a rendered-mask demo is blocked |
| Muse Code | Agentic implementation of inference core, budgets/leases, evidence discipline | Commit history across Sol's branches | `docs/build-log.md`, CI runs (e.g. https://github.com/akilanpl/worldspeak/actions/runs/40443225544) | **Verified in use** |
| Spend control | Atomic integer-microUSD reservations; operation-bound permits (`scene`→Spark, `segment`→SAM); status result provenance bound to requested operation; no automatic retries | `packages/inference/src/budget.ts`, worker admission/dispatch | Historical Spark receipt 4402 micro-USD reconciled in ledger; proposed SAM cap exactly 2,500 micro-USD ($0.0025/still, matches official $2.50/1k) | **Verified design**; provider-side billing reconciliation still open |

## Fixture-only features (never present as live)

- Every automated "Spark/SAM result" shown in component, browser, and database suites uses explicitly synthetic response IDs and reconstructed sanitized geometry (`source:model` appears only under intercepted networking to exercise the production branch; parser/DB fixtures use `source:fixture`). No genuine response ID is invented.
- Browser speech is stubbed; Tamil wording is `review-pending`; video tracking, mask-polygon rendering, and hosted billing attribution do not exist.

## Audit notes

- Provider hardening is real: media allowlist (PNG ≤512px, ≤1 MiB, SHA-256 verified), concept allowlist regex, usage-cap rejection, wrong-model rejection, dimension-mismatch rejection, no-retry/uncertain-send semantics.
- The first-smoke authorization (`authorize_first_smoke`) is permanently tombstoned; current operation-keyed permits cannot authorize another live test without the new append-only mechanism designed (not implemented) in the SAM-only proposal.
