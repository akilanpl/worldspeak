# WorldSpeak local evaluation

Synthetic fixture replay; no model performance claim

Candidate: synthetic-imperfect-baseline
Dataset: worldspeak-eval.v1 (4c8ca6325be30fa2714f9d9d16e9abec76ebf25d3f6a319458f68a1761fabc40)
Candidate SHA-256: a1e5c45d3d7d961eb3ababa302fc7776324fa4a0df34dc1ce1f3b574ce7384ae

| Metric | Value |
| --- | ---: |
| Detection precision @ IoU 0.5 | 75.00% |
| Detection recall @ IoU 0.5 | 75.00% |
| Mean matched box IoU | 90.48% |
| Mean mask IoU | 66.67% |
| Temporal point recall | 85.71% |
| Temporal point precision | 100.00% |
| Track continuity | 75.00% |
| Identity switches | 0 |
| Invalid output rejection | 21/21 |
| Valid output acceptance | 7/7 |
| Provenance mismatches | 0 |
| Communication invariants | 11/11 |

Result: PASS

Threshold sweep, categories, individual cases and fixture hashes: see report.json.
These tiny synthetic cases establish metric/conformance behavior. They do not measure real-world accuracy, accessibility, speech output or fine-tuning.
