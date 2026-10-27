# Outstanding limitations and required real-model validation

Product limitations (safe to demo, must be disclosed):

- All detections shown are labeled synthetic fixtures; the voice is a local
  stub. Real video tracking is disabled by design in this slice.
- Tamil copy outside the reviewed catalog (UI strings, consent text,
  notices) is unreviewed prototype text — native review pending.
- 200%/400% zoom was verified as CSS reflow (640px/320px), not OS zoom;
  large-text mode combined with 320px was not exercised.
- Camera capture, Tamil shaping at large scales, airplane-mode video, and
  audible Speak need a real-device lab (mocks only in CI).

Required real-model validation (Sol's deployment track):

- One authorized Spark scene call + one SAM still call against the $0.05
  ceiling, with reservation→charge reconciliation and cleanup verified.
- Mask fidelity review: exact polygons rendered, no fabrication; rejected
  geometry counted and surfaced.
- Latency and cost measurement for the polling UX (1s/2s/5s backoff).
- Hosted RLS re-verification after migration 007, regenerated Database
  types replacing the overlay, and worker credential rotation proof.
- Privacy review of retained bytes (15-minute expiry) against provider
  terms before any user photo beyond the designated test identity.
