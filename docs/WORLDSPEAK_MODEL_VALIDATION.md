# WorldSpeak model validation — 3 November 2026

Baseline inspected: `0ab6b457bcc61d502ec0e38f714882225ba7753a`. This audit made no provider calls, media-bearing preflights or billing mutations. Source existence and fixtures do not establish live-model success.

| Capability | Executable boundary / evidence | Honest acceptance |
|---|---|---|
| Muse Spark 1.3 Standard | `packages/inference/src/providers.ts`; `docs/ai-workflow-validation.md` | One historical generation: chair confidence 0.99, box (0.247,0.139)–(0.746,0.868). Original app persistence failed. JSONB repair and reconstructed browser integration subsequently passed; no new real end-to-end request. |
| SAM 3.1 | Same provider, worker SAM authorization, perception raster renderer | Implemented and synthetic-fixture tested. Zero genuine generations established; ticket issuance requires fresh explicit approval. |
| Video | `apps/web/src/features/video/`; synthetic track conformance | Local uploaded/recorded video uses manual frame/region selection. No genuine model-assisted tracking acceptance. |
| Personal pictograms | `apps/web/src/features/pictograms/` | User-selected local images and exact wording, page-memory-only. Not Muse Image. |
| Muse Image / Voice Transcribe | No provider/model reference found by source search in apps/packages/tooling | Not implemented/validated in this baseline. Do not claim provider-shaped UI as an integration. |
| Meta open-weight inference / LoRA | Evaluation README explicitly states no specialization/training; no training runner found | No actual inference, training checkpoint or before/after experiment. Separate model/provenance adapter, licensed dataset and compute are needed. |

## Evaluation already shipped

`tooling/evaluation/reports/synthetic-v1/report.md` records the intentionally imperfect **synthetic** candidate: detection precision/recall 75% at IoU 0.5; matched box IoU 90.48%; mask IoU 66.67%; temporal recall 85.71%, precision 100%, continuity 75%, zero ID switches; invalid rejection 21/21, valid acceptance 7/7, communication invariants 11/11. The integrating engineer freshly reran `node tooling/evaluation/run.mjs` (exit 0; evaluator suite 8 tests) this turn. The generated local artifacts remain under `tooling/evaluation/reports/synthetic-v1/`. These values describe synthetic conformance, never real-model accuracy. Dataset hash `4c8ca6325be30fa2714f9d9d16e9abec76ebf25d3f6a319458f68a1761fabc40` and candidate hash are in that report; use its documented runner to regenerate against the exact release.

## Financial/provenance boundary

Historical Spark computed charge $0.00440175, internal integer ledger 4,402 micro-USD. Provider-side billing attribution remains open. Previously observed SAM still price $0.0025 is dated evidence, not a current price quote. Before requesting authorization, recheck official pricing/entitlement/balance, exact normalized fixture/hash/privacy and promotional-credit terms. Never reset the historic first-smoke tombstone or consumed permits. The SAM-only reviewed mechanism may authorize only the separately approved one still/concept with no retry; this audit does not issue that approval.

Representative real-world data, human ground truth, confidence calibration, real mask/track quality, latency and model cost comparisons remain unmeasured. Real-model evaluation requires approved model output; a synthetic source flag must never be relabeled as genuine evidence.
