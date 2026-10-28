# Anticipated judge Q&A

## "Is the AI real or faked?"

One Muse Spark 1.3 generation was genuinely executed and succeeded (sanitized chair, confidence 0.99, full receipt retained). Everything automated beyond that — component overlays, browser journey, SAM geometry — replays that sanitized result with explicitly synthetic IDs. We label every reconstructed screen and never invent a genuine response ID. SAM 3.1 has no live call yet.

## "Why Spark for scene understanding and SAM for segmentation?"

Two different jobs: Spark returns open-vocabulary labeled boxes under a strict JSON schema (what is it, where); SAM returns a pixel mask for a user-chosen concept (exact shape). The pipeline binds each result's provenance model to its requested operation and rejects mismatches, so a Spark result can never masquerade as a SAM mask.

## "What stops the AI from speaking something wrong?"

Three independent gates: (1) a selected object never establishes desire — catalog label and intent are separate explicit user acts; (2) the preview is rendered by a pure deterministic engine from reviewed templates, never from model text; (3) speech requires a fresh Speak gesture bound to the exact content hash. Model text is untrusted data end to end.

## "How do you control API spend?"

Integer-microUSD atomic reservations at admission, per-operation caps, usage-cap rejection on response, no automatic retries (including on timeouts and uncertain sends), and tombstoned one-shot authorizations. Historical Spark ledger: 4402 micro-USD. Proposed single SAM still: exactly 2,500 micro-USD, matching the official $2.50/1,000-image price.

## "What about privacy of camera images?"

Transient uploads are consent-scoped, private (owner-only RLS, UUID-first-folder Storage policies), and deleted via a cleanup outbox with supervision receipts. `store:false` is set on every request. Hosted evidence shows zero fixtures, zero bucket objects remaining after verification.

## "What is actually new here versus an AAC board plus an API call?"

The consent-gated durable job pipeline (budgets, leases, uncertain-call fencing, revocation semantics) fused with a determinism boundary that makes model output structurally unable to alter user language — plus bilingual exact rendering with review-pending transparency instead of silent machine translation.

## "What remains before this is real for users?"

Live SAM verification under the unapproved one-still proposal (mask rendering itself is implemented and fixture-tested; the schema authorization mechanism is hosted but issuing a ticket and executing live inference remain separately unapproved); hosted billing reconciliation; inbox delivery; remaining manual signed-in UX; native Tamil review and physical-device checks; final participant-rules sign-off. Full list: [limitations-and-validation.md](limitations-and-validation.md).

## "Can we reproduce your claims?"

Yes for everything except spending money: pinned lockfile install, lint/typecheck/vitest/e2e/schema/secrets gates, disposable local Postgres harness, and the mock-auth Chromium journey are all documented in `docs/ai-workflow-validation.md`. Live-call evidence is preserved byte-for-byte, not re-runnable without fresh human-paid authorization.
