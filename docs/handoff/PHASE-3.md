> Current release status: non-paid Phase 3 consolidation and exact hosted migration 007 were subsequently authorized. See `../hosted-readiness.md` and `../evidence/hosted-inference.json`. Phase 2 manual gaps below remain open; this older phase record is not a prohibition on the later authorized work. No paid inference is authorized.

# Phase 3 handoff — gated plan, not authorization to start

Prerequisites: Phase 2 acceptance recorded, public email/OAuth and real browser flows proven, current CI green, existing security warning disposition accepted, credit balance checked, explicit Phase 3 instruction from the human. Read Phase 0 architecture and current migrations/types first. Use only dedicated project cafkyowssdemzivhzxbb.

Next vertical slice: durable inference job admission + atomic integer-microUSD budget reservations + leases/uncertain-call handling + consent-scoped transient image upload/cleanup. No camera frame loops or autonomous retries. Add user-scoped media/jobs tables, composite ownership constraints/RLS, private metadata and cleanup outbox through forward migrations; never recreate Auth/Storage platform tables. The existing private bucket policies are a baseline, not an implemented upload-consent/TTL system.

Implement/test locally with fake provider responses first. Verify duplicate idempotency keys cannot duplicate model calls, conflicting payloads reject, concurrent reservations cannot overspend, lost leases/uncertain upstream outcomes cannot resubmit, canceled/revoked content is not published, and cleanup survives restarts. Regenerate live types and update approved artifact snapshot after reviewed migrations.

Only after the human opens a bounded paid test window: one Spark 1.3 Standard scene-understanding request and one SAM 3.1 still segmentation request, using current official schemas and sanitized request IDs/usage. No speech from model output: object confirmation → explicit intent → deterministic exact preview → fresh Speak gesture remains mandatory. Finish the slice with test/evidence/build-log updates and another bounded handoff. Never claim video tracking or model integration from fakes.

## 27 October 2026 — bounded Phase 3 authorization

The human explicitly authorized non-paid inference-core engineering on isolated `feat/meta-inference-core` despite the Phase 2 manual gaps above. This supersedes the earlier no-Phase-3 instruction only for this bounded task. Phase 2 is still not accepted. No paid call or hosted migration is authorized by this note. See `docs/meta-inference-handoff.md` and the prepared, unapproved two-call smoke protocol.
