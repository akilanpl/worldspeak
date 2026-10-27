# Two-call Meta smoke — prepared, NOT approved or executed

Human must explicitly approve the exact two generation requests below and a **$0.05 total ceiling** before any live worker approval marker, budget or generation permit is enabled. This document is a proposal, not authorization. No live calls were made during core implementation.

## Cost and hard admission controls

Verified official Standard prices on 27 October 2026: Spark input $1.25/M tokens, output $4.25/M tokens; SAM still segmentation $0.0025/image. [Official pricing](https://dev.meta.ai/docs/pricing-rate-limits).

Use one small sanitized still, ≤512×512 normalized PNG, ≤1 MiB, showing a common object such as a chair with no people, readable private text or identifying surroundings. Spark expected estimate, assuming 2,000 input and 512 output tokens: **$0.004676**. SAM exactly one image: **$0.0025**. Estimated combined: **$0.007176**; estimate is not an observed bill.

Spark uses one authoritative non-generation `POST /v1/responses/input_tokens` preflight (no automatic retry); exact same input/schema, accept ≤10,000 counted input tokens. Output cap 2,048 includes reasoning. Conservative upper bound at these rates: ceil(10,000×1.25 + 2,048×4.25) = **21,204 micro-USD ($0.021204)**. Reserve **25,000 micro-USD** for Spark and **2,500** for SAM: **27,500 micro-USD ($0.0275)** total reservations, below the requested $0.05 ceiling. Accounting rounds up; cache discounts are ignored conservatively. Actual invoicing must be reconciled independently. No web/search/tools, Contributor model, video, Files upload or other generation operation.

## Before approval

1. Merge/test combined UI in an isolated environment. Apply reviewed migration 007 to dedicated WorldSpeak project only; run live RLS/Storage/advisor/type checks. Preserve Phase 2 manual gaps.
2. Supply worker-only Standard `META_MODEL_API_KEY`, restricted DB login and server-only Storage key through protected local/deployment configuration, never chat/Git. Recheck current pricing, account entitlement and remaining credits; user-reported $149.82 is stale/unverified.
3. Establish cleanup supervision and verify a disposable asset can be physically deleted. Obtain explicit consent for the exact sanitized still; app normalization strips metadata. `store:false` disables response persistence; **it is not a claim of provider-wide zero retention**. Review current provider terms before transmission.
4. Keep live marker unset, budgets zero and permits zero until explicit human approval.

## Bounded execution after explicit approval only

Operator calls the private, operator-only `world_inference.authorize_first_smoke(designated_auth_user_uuid)` exactly once after explicit approval. This reviewed migration-007 function locks the global budget, rejects any previous authorization/dispatch/credit receipt or existing job, requires pristine global/designated counters, verifies every other account has zero limit/spend/reservation, and asserts exactly the two expected operations are unarmed. It atomically installs a permanent authorization tombstone, binds both one-shot permits to that one owner and sets only global/designated limits to 50,000 micro-USD. It never resets counters. Worker/web/user roles cannot execute it. Dispatch requires the same owner and records `consumed_at` atomically. Repeating setup cannot rearm consumed permits, including after Auth/job deletion. Do not bypass it with direct table updates.

Enable API only on loopback/approved staging origin and set worker approval marker `WORLDSPEAK_LIVE_INFERENCE_APPROVED=two-call-smoke-v1`. Upload the still after explicit Send, create one `scene` job with a new UUID key, and run the worker once. Only after a validated scene success, explicitly confirm the noun and submit one `segment` job using the same sanitized still, fresh per-upload consent and one new UUID key. The UI creates a new transient asset for SAM after revoking the scene asset; verify matching normalized SHA-256 and retain both IDs for cleanup; run worker once. Poll GET routes only; no model calls from polling. Source output must be `model`, never a fixture. No Speak action is part of this smoke.

At most **one Spark generation and one SAM still generation**. The durable dispatch marker and one-shot permit commit before even the token-count transmission. A crash during counting is conservatively uncertain and never resubmitted. The separate Spark token-count endpoint generates/stores no response; its media transmission is included in consent. Do not run any generation if preflight is unavailable/over cap. Stop after any uncertain response, malformed result, exhausted credit, unexpected pricing/usage, cancellation or privacy issue. Do not run SAM after a failed/uncertain scene. Zero automatic paid retries; leave conservative reservation held for reconciliation. Abort cannot promise an upstream billing reversal.

Immediately unset live marker/disable API, leave permits exhausted/zero, revoke both temporary assets, run cleanup and verify bytes absent through Storage API. Keep ordinary cleanup enabled. Review actual provider receipts against the $0.05 ceiling before any further approval. Budget/permit limits constrain application admissions, not an independently verified provider-side billing guarantee.

## Evidence to retain, without content/secrets

Commit SHA, model/adapter/pricing versions, exactly one response ID per generation, token/frame usage, reserved/computed micro-USD, elapsed duration, result validation and geometry checks, SQL budget/receipt reconciliation, cleanup proof and fixture-vs-model distinction. Never retain raw images, base64 payloads, private labels/account identifiers, authorization headers or credential-bearing URLs in logs/Git. Record failure honestly; preparation does not establish real model integration.

Official specifications: [Responses](https://dev.meta.ai/docs/protocols/responses), [schemas/token-count body](https://dev.meta.ai/docs/api-reference/responses/schemas), [image understanding](https://dev.meta.ai/docs/image-understanding), [structured output](https://dev.meta.ai/docs/structured-output), [SAM requests](https://dev.meta.ai/docs/sam/segmenting), [SAM grammar](https://dev.meta.ai/docs/sam/reading-segmentation), [official parser](https://dev.meta.ai/docs/sam/client-libraries). Retrieved 27 October 2026; request shapes still require live entitlement/schema confirmation during the approved smoke.

Reviewed operator invocation, only after approval and successful hosted migration/security checks:

```sql
select world_inference.authorize_first_smoke('<DESIGNATED_AUTH_USER_UUID>'::uuid);
```

This invocation is not part of migrations, deployment, CI or worker startup. It must not be run during hosted readiness preparation, which keeps budgets/permits zero and Meta generation disabled. The authorization tombstone survives account deletion. Any subsequent test window requires separately reviewed authorization design and explicit human approval; do not delete the tombstone or reset counters to manufacture headroom.
