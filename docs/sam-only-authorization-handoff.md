# Independent SAM-only authorization — pending hosted approval

27 October 2026 (IST). Migration 008 is implemented and tested only in disposable local PostgreSQL. No hosted migration, ticket issuance, budget change, marker enablement, media transmission or Meta request occurred. Nothing in this document authorizes execution.

Migration: `supabase/migrations/20261027110517_worldspeak_008_sam_only_authorization.sql`. SHA-256: `a1246064dca1907225f2df17f98f748652966dd15b66a7a02cceb615d408d271`. The pending inventory explicitly says applied:false; hosted database types and approved migration 007 evidence remain unchanged. CLI created the migration with `supabase migration new worldspeak_008_sam_only_authorization` (CLI 2.75.0; local/global configuration was not modified). Local catalog/permission tests supply verification; no hosted Supabase advisor was run for this pending schema.

## Scope and state machine

Two private RLS-denied tables implement a permanent singleton authorization and append-only admitted/dispatched/revoked/closed events. UPDATE, DELETE and TRUNCATE reject, even for an ordinary table owner; no Auth/job cascade erases them. Operator-only issuance requires an explicit fresh approval reference, price 2500, pricing version meta-standard-sam-image-2500-v1, expiry within 30 minutes and the exact sanitized-chair SHA below. It rejects reruns forever, including after cancellation or identity deletion.

Bound operation: Standard sam-3.1, segment, chair, 512×512 PNG, 25,949 bytes, SHA-256 a27313c7b3732ec3a3dea8df1f920c9c105884068705093608676ee248e4f8cc. Rehash, inspect and obtain fresh consent immediately before any future issuance. Do not substitute a real-user image. App normalization must preserve that exact digest; stop on any mismatch.

Issuance requires the existing first-smoke tombstone; consumed scene/disabled unconsumed segment permits; the exact retained reserve25000/settle4402 receipt pair; global spent4402; no unknown jobs/receipts, nonzero limits/reservations or unfinished cleanup. It preserves historical counters/receipts and temporarily gives only global/designated accounts their own existing spent+2500 limit. Every other account stays unfunded. No historical authorization or permit is updated.

The published submit_inference_job contract stays unchanged. Once a SAM ticket exists, legacy admission cannot consume its headroom: only its owner, exact operation/concept and consented ready media hash/size can admit one immutable assigned job. Same-key duplicate requests return that job; another key or changed input cannot create another job/reservation. Canceling/failed preparation does not grant another admission.

Worker mode sam-only uses dedicated claim_sam_test / dispatch_sam_test / finish_sam_test. The old worker claim cannot obtain new-ticket jobs, old dispatch cannot consume their authorization, and generic finish cannot bypass provenance fencing. Renamed legacy helpers have no worker/user grants. Successful finalization requires durable dispatch and an object result with source:model, model:sam-3.1 and the exact image hash. Responses are still validated by provider/application schemas; no JSON-string schema fallback is introduced.

All transitions lock the global budget before ticket/job rows. Dispatch consumption and the job marker commit before provider.send. Limits become literal zero at dispatch, closure, expiry or operator deactivation; spent/reserved are never reset. One expired pre-dispatch lease terminates with zero charge, not a second attempt. A post-dispatch timeout retains the reservation and a permanent consumed event; operator reconciliation records actual usage without resend. Actual overruns are recorded rather than clamped. Cancellation/revocation suppresses results and queues cleanup; it does not promise upstream termination or refund. Auth deletion immediately revokes the ticket and zeros unused limits; existing triggers preserve accounting and cleanup outbox.

## Worker integration

No new frontend request fields or credentials are required. The new server-only worker marker is WORLDSPEAK_LIVE_INFERENCE_APPROVED=sam-only-smoke-v2. It is **unset** throughout this engineering task. The existing cleanup-only entry point remains generation-free. makeStore accepts dispatchMode:sam-only only inside worker code; its least-privilege login check additionally rejects authorization/deactivation grants or access to either new private table. Existing restricted DB/TLS/Storage/Meta credentials stay outside Git. Do not start the live worker merely to validate configuration.

The existing first marker two-call-smoke-v1 cannot run ticket jobs. After a ticket exists, both legacy admission and legacy claim remain fail-closed even after expiry/closure; any later live test requires another reviewed design, not editing this singleton.

## Local executable verification

Use only a named local scratch database:

```
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=<local-user> PGDATABASE=worldspeak_phase2_sam_authorization pnpm test:db
```

The suite runs existing RLS12, original authorization10, inference17 and JSONB-driver5 groups, then 12 independent SAM groups. It covers wrong pricing/hash/expiry/history/headroom; private privileges; immutable tickets/events; exact owner/operation/concept/media and idempotency; cancellation; abandoned lease/no retry; durable dispatch and generic finish bypass denial; malformed provenance/model/hash/JSON-string rejection; uncertain holds/reconciliation; unclamped actual overruns; operator deactivation; Auth cascade; expiry auto-deactivation; concurrent same-key admissions/competing keys/claims/dispatch; real restricted-login production store and JobViewSchema object round-trip. Before/after snapshots prove historical permits, tombstone and receipt pair unchanged.

Production cleanup runs against a bounded local Storage HTTP double and an actual synthetic tempfile. Independent filesystem reads prove bytes absent; the lease-fenced cleanup receipt is done, media deleted, and dispatch count unchanged. This is **local simulation**, not a hosted Storage deletion receipt. All external HTTP is forbidden; only the exact fake Storage deletion is intercepted. Provider response IDs are explicitly synthetic. No inference success is claimed.

## Separate approvals required — do not execute these templates now

First request: “May I apply only reviewed migration 008 with SHA-256 a1246064dca1907225f2df17f98f748652966dd15b66a7a02cceb615d408d271 to cafkyowssdemzivhzxbb, then perform non-paid privilege/schema checks? This creates empty authorization tables/functions only. No ticket issuance, live marker, spending limit, Meta request or billable infrastructure is authorized.” Regenerate actual hosted types/evidence only after successful separately approved application; stop on unexpected schema/error.

Second request, only after hosted migration/security checks and fresh balance/entitlement/pricing/image/terms verification: “May I issue one independent SAM-only approval for the exact synthetic chair SHA, designated owner, model sam-3.1, concept chair, no preflight, one generation, zero retries and maximum planned $0.0025? This enables only the new ticket and marker; the consumed first-smoke record and old permits remain unchanged. Cleanup and billing reconciliation follow immediately.” An approval for migration alone is not approval for inference.

After that separate approval, the operator-only SQL template is authorize_sam_test(<owner>,<unique-human-approval-ref>,<exact-sha>,2500,'meta-standard-sam-image-2500-v1',<expiry<=30min>). Browser/worker/service clients cannot issue it. Never call authorize_first_smoke, edit permits or delete an authorization/event. For immediate deactivation call world_inference.deactivate_sam_test() using the authorized operator connection; unset the marker, keep cleanup supervision, inspect actual receipts and verify fresh authenticated cache-busted Storage absence plus listing agreement. Deactivation cannot erase an uncertain charge or consumed dispatch.

Pricing independently rechecked 27 October 2026: [official Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits) lists $2.50 per 1,000 still images, same streaming/non-streaming. The argument/version is a human assertion that must be reconfirmed immediately before approval; code does not infer current pricing, credits, entitlement or promotional data-use consent from this snapshot. Preserve the promotional-credit notice and do not promise provider-wide zero retention from store:false.
