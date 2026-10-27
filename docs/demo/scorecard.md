# Technical judging scorecard (self-assessed, evidence-linked)

| Criterion | Score /5 | Evidence |
| --- | --- | --- |
| Working end-to-end slice | 5 | Guest offline compose→speak, camera→intent→composer, video→intent→composer, all green in CI-style gates |
| Accessibility | 4 | Keyboard-only paths, focus-visible, live-region announcements, 44px targets, axe clean desktop+mobile; Tamil shaping still needs native review |
| Mobile readiness | 4 | 390px + 320px reflow clean, touch journey green; OS-zoom+large-text combo and real-device camera untested |
| Bilingual correctness | 4 | Deterministic EN/TA templates with parity tests; per-noun Tamil sandhi pending native review |
| Privacy and consent honesty | 5 | Explicit consent per upload, sessionStorage handoffs, 503/401 honesty, fixture banners, no silent calls |
| Real-AI integration readiness | 3 | Contracts, adapters, worker, budgets specified and unit-tested; no live Spark/SAM call has completed yet |
| Demo repeatability | 5 | Scripted journey + recording sequence + recovery plan, all fixture-driven |

Overall: a complete, honest, demonstrable slice with clearly marked
boundaries. The single biggest remaining risk is the untested live-model
path (credits, latency, mask quality), owned by Sol's deployment track.
