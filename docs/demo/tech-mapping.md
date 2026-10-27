# Feature → Meta-technology mapping (implemented evidence only)

Every row below names a shipped, tested seam. Nothing here claims a live
model result — fixtures are fixtures, stubs are stubs.

| WorldSpeak feature | Meta technology | Evidence in repo |
| --- | --- | --- |
| Still-image object detection (UI ready, backend pending) | Meta Muse Spark (`muse-spark-1.3`, stills) | `packages/contracts/src/inference.ts`, `features/analysis/*`, consent + job UI |
| Video-adjacent tracking contract (disabled in UI) | SAM 3.1 stills + `adaptSamVideoText` normalizer | `packages/inference/src/tracks.ts`, `docs/video-ui-handoff.md` |
| Secure per-user inference spend | App-scoped budgets, leases, reservations, cleanup | `supabase/migrations/*007*`, `apps/worker/*`, RLS isolation tests |
| Deterministic bilingual rendering | Frozen template engine (EN/TA catalogs) | `packages/communication/*`, catalog JSON, parity tests |
| Gesture-gated speech | `SpeechGateway.speakApproved` permits | `apps/web/src/lib/speech.ts`, no-speech regression tests |

Do not present the fixture scenes, the stub voice, or the disabled video
path as Meta outputs. The honest demo line is: "The product works
end-to-end on fixtures today; these are the exact seams live models plug
into, each with a validation contract."
