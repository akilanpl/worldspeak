# Meta inference core — integration handoff

Branch `feat/meta-inference-core`, isolated from latest main `80dcee4`. No Muse checkout, integration branch or PR was edited. This is executable backend engineering authorized on 27 October 2026; Phase 2's manual gaps remain in `docs/handoff/BLOCKERS.md`. **No paid Meta call, hosted migration, worker deployment or real inference success is claimed.**

## Merge order and current limits

Merge this branch into Muse's `integrate/worldspeak-full-stack` through human coordination after review. It does not contain/cherry-pick Muse UI code. Shared additive merge points are `packages/contracts/src/index.ts`, `packages/db/src/index.ts`, web/package.json, lockfile, CI, schema guard and handoff docs. Re-resolve lockfile with pinned pnpm 10.18.0, keep both features, then run the full combined tests. Do not overwrite main or other worktrees.

Read source contracts in `packages/contracts/src/inference.ts`. Routes support **one still image**, operations `scene` and `segment`. Video admission/inference is deliberately unsupported. `adaptSamVideoText` is a pure, tested normalizer for a future genuine SAM temporal response; it is not a live tracking implementation. WebM from the current recorder cannot be sent to SAM; a future worker must normalize to accepted MP4/MOV and explicitly record frame/timestamp mapping. No independent-still tracking substitute.

## Exact application API

All responses use existing `{ok:true,requestId,data}` or `{ok:false,requestId,error:{code,messageKey,retryAfterMs}}`. Every route uses `requireOwner` (verified server session + configured-origin CSRF), private/no-store, and server-derived ownership. No owner/model/cost/lease/URL parameters are accepted. Guest essential communication remains entirely local.

1. `POST /api/v1/media`: raw `image/png`, `image/jpeg` or `image/webp` body, at most 5,000,000 bytes; header `X-WorldSpeak-Consent: scene-v1` **only after a fresh explicit Send approval**. Consent notice must explain upload to WorldSpeak and Meta for this request, transient local retention, provider terms, and inability to retract processing already sent. No silent camera upload. Animated images/SVG/PDF/URL inputs rejected. Decoder limits 16 million source pixels, applies orientation, strips metadata, resizes within 512×512 and re-encodes PNG ≤1 MiB. Returns 201 `data:{assetId,expiresAt,sha256,width,height}`. Display normalized orientation/geometry when overlaying (letterbox or compute contain rect); do not overlay against a differently cropped image.
2. `POST /api/v1/jobs`: JSON `{operation:"scene",assetId,idempotencyKey}` or `{operation:"segment",assetId,idempotencyKey,concept:"chair"}`. UUID idempotency key stays identical on network retry of the **same submission**. SAM concept is one explicitly selected/confirmed noun phrase, max 80 characters. It is never an inferred communication intent. Returns 202 `data:{jobId,pollAfterMs:1000}`. Same owner/operation/key/payload returns the same job without reserving again; changed payload returns 409. New key is never an automatic retry of uncertain work.
3. `GET /api/v1/jobs/:id`: `data:{id,operation,status,cancelRequested,result,errorCode,reservedMicroUsd,chargedMicroUsd,billingState,createdAt,expiresAt}`. Status is `queued|leased|dispatching|succeeded|failed|canceled|uncertain`; billing state `reserved|settled|uncertain`. Result is null unless publication is allowed and validated. Foreign/missing jobs return identical 404. Poll 1s, 2s, then 5s while visible; GET never dispatches. Expired results are inaccessible; uncertain metadata remains available for reconciliation.
4. `DELETE /api/v1/jobs/:id`: `data:{cancelRequested:true,billingMayStillApply:true}`. Cancellation fences publication. In-flight abort cannot promise a refund. For privacy cancellation, also call the media DELETE; job cancellation alone leaves the image until its 15-minute expiry.
5. `DELETE /api/v1/media/:id`: `data:{revoked:true,cleanupQueued:true}`. Immediately revokes dispatch/read eligibility, cancels related jobs, suppresses results and queues byte deletion. Physical deletion requires a running cleanup worker; never describe queued deletion as immediate byte erasure.

HTTP errors: 400 strict invalid input, 401 login required, 402 budget exhausted, 409 conflicting idempotency/expired consent, 415 unsupported image, 429 active-job/media bound, 503 disabled/unavailable. Job-level `TIMEOUT_UNCERTAIN`/`USAGE_MISSING`/`PROVIDER_HTTP_*` require operator review, never a retry button that sends automatically. Invalid model output with known usage settles the conservative charge and shows no result. `MEDIA_EXPIRED`, `INPUT_TOKEN_CAP`, `TOKEN_PREFLIGHT_FAILED`, `LIVE_NOT_APPROVED` and `DISPATCH_NOT_AUTHORIZED` should offer specific corrective guidance; no raw provider errors or user media in logs.

## Frontend adapter contract — unchanged

A successful result is:

```ts
{
 detections: Array<{
   label: string; catalogId: string | null;
   box: {x1:number;y1:number;x2:number;y2:number};
   mask: Array<{x:number;y:number}> | null; confidence:number|null;
 }>;
 tracks: Array<{
   trackId:string;label:string;catalogId:string|null;confidence:number|null;
   points:Array<{t:number;box:{x1:number;y1:number;x2:number;y2:number};mask:Array<{x:number;y:number}>|null}>;
 }>;
 provenance:{source:"model"|"fixture";model:"muse-spark-1.3"|"sam-3.1";
   adapterVersion:"meta-v1";responseId:string;inputSha256:string;
   inputTokens:number|null;outputTokens:number|null;costMicroUsd:number};
 segmentationMasks:Array<{objectId:string;bounds:{x1:number;y1:number;x2:number;y2:number};
   width:number;height:number;rasterBase64:string}>;
}
```

All box/point coordinates are finite [0,1], boxes strictly nonempty. SAM inclusive pixel endpoints become half-open before normalization. Masks are strictly decoded with official `@meta-sam/parser@0.1.0`. Exact row-major 0/1 rasters remain separate from frontend polygons, with normalized source bounds; **no rectangular polygon is fabricated from a box**. Existing UI can use optional box fallback (`mask:null`) and a later exact-raster overlay. `tracks` is currently empty for still jobs. Unknown labels have `catalogId:null`; the model cannot mint reviewed catalog IDs or Tamil wording.

On model success: require `result.provenance.source === "model"`, then pass `result.detections` to Muse's existing `adaptDetectionList` and `result.tracks` to `adaptTrackList`. Preserve their rejected counts; show an actionable error for rejected geometry. Fixtures must retain the fixture banner and must not enter adapters that unconditionally stamp `origin:"model"`. Object selection/confirmation → explicit intent → deterministic exact preview → fresh trusted Speak remains unchanged. No inference code imports the speech gateway or changes the pure communication engine.

`adaptSamVideoText` normalizes actual SAM temporal records by response/object ID, uses explicit source frame index / normalized FPS, sorts backward-order responses, and splits missing-frame gaps into distinct visibility spans so the UI cannot interpolate an object through absence. It bounds dimensions, frames (300), objects (16), visibility spans (32) and aggregate decoded mask area (8,388,608 pixels). It intentionally exposes optional polygons as null. Real video transport, format normalization, audio stripping and end-to-end tracking verification remain a future slice.

## Migration and credentials

`supabase/migrations/20261027040029_worldspeak_007_inference_core.sql` was created with CLI 2.81.0 and tested from an empty isolated local database, after all six released migrations. It is **UNAPPLIED to hosted Supabase**. The original generated hosted types and six-migration evidence remain unchanged. `packages/db/src/inference-rpc.ts` is an explicit forward SQL/RPC contract overlay, not falsely described as hosted codegen. The schema guard checks both the immutable hosted snapshot and the separately labeled pending artifacts.

After integration review, apply only 007 to dedicated project `cafkyowssdemzivhzxbb`; inspect managed-platform compatibility/advisors, regenerate real hosted Database types, replace the overlay and update the hosted snapshot with actual versions/hashes. Never apply test shim/reset to hosted infrastructure or change existing published migrations. No unrelated project.

New public tables: owner-scoped `inference_media`, `inference_jobs`. Clients get RLS-protected limited reads, no direct writes or lease/result/money mutation. Narrow fixed-search_path definer RPCs are the necessary admission privilege boundary. New private `world_inference` schema: lifetime budget counters, opaque-job credit receipts, generation permits and durable cleanup. No anon/authenticated access. Global budget lock serializes admission/settlement before user/job/media locks; conservative low-throughput design. One active/uncertain job per user; at most two leased/dispatching jobs globally; three live assets per user and sixteen undeleted assets globally. New private `world-inference` Storage bucket has no client Storage policies; server performs bounded upload, worker uses Storage API removal.

Provision a dedicated DB login inheriting the NOLOGIN `worldspeak_inference_worker` role after review. Give it only that role's private function execution, never broad table/admin rights. The migration supplies no password. `world_inference.reconcile(job_id,actual_micro)` remains operator-only and must use a verified billing outcome; it never resubmits. Auth deletion settles pre-send work at zero and dispatched unknown work conservatively at full reservation, retains necessary cleanup paths, removes per-user budget identifier, and preserves global money-only receipts.

Protected environment, outside Git:

- Web/server: existing Supabase URL/publishable key, server-only `SUPABASE_SERVICE_ROLE_KEY`, `INFERENCE_DATABASE_URL`, `WORLDSPEAK_INFERENCE_API_ENABLED=true` only for controlled testing.
- Worker: dedicated `INFERENCE_DATABASE_URL`, Supabase URL and server-only Storage administrative key; `META_MODEL_API_KEY` only on the worker; `WORLDSPEAK_LIVE_INFERENCE_APPROVED` unset by default.
- Live generation additionally requires explicit human approval, exact approval marker `two-call-smoke-v1`, the private one-shot `authorize_first_smoke` operator action after approval. No billable request by default. Never put any secret in NEXT_PUBLIC variables or copy Muse's environment into this branch.

Run one supervised unit of work with `pnpm --filter @worldspeak/worker once`. Default behavior performs sweep/one cleanup only. With live approval, it also claims at most one inference job. Scheduler/supervisor deployment is intentionally not provisioned. Before enabling uploads, run cleanup supervision at a documented cadence, e.g. one invocation every 5 seconds with bounded concurrency. Lease 45s, heartbeat 10s, worker deadline 30s. Pre-send leases may recover at most three times; **zero automatic post-dispatch retries**. Dispatch marker/permit consumption commits before ANY Meta HTTP, including token counting. Preparation is pure; no provider media transfer occurs before dispatch authorization. Any lost/unknown outcome retains its reservation until operator reconciliation. Duplicate finalizations and stale tokens cannot alter money/results.

Cleanup is an independent durable outbox created before upload. Revocation waits 60s beyond bounded 20s server upload transport, then idempotently removes bytes through Storage API. Successful tombstones are checked again daily for late writes; do not purge tombstones while uploads can still complete. Failed deletions retry at 5-minute intervals, max 10 consecutive failures, then retain a `blocked` row for manual cleanup. Alert on blocked rows, expired cleanup leases and uncertain jobs. Account deletion cannot cascade the outbox away. Logical expiry/read denial does not depend on physical byte deletion succeeding. Raw TTL 15m; derived results expire after 24h; idempotency/money/cleanup tombstones persist for operational safety.

## Verification and remaining work

Run pinned lockfile install, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, `pnpm check:schema`, `pnpm build`, `pnpm check:secrets`. Local DB command uses only a named scratch DB: `PGHOST=127.0.0.1 PGPORT=5432 PGUSER=<local-role> PGDATABASE=worldspeak_phase2_inference_20261027 pnpm test:db`. It resets that scratch DB. CI uses its disposable PostgreSQL service. Unit/provider fixtures are synthetic; no external model or hosted Storage call is part of these tests.

Remaining: merge UI and test adapters end-to-end; explicit upload/Meta-processing consent copy; hosted migration/advisors/types/RLS/Storage verification; provision least-privilege worker credentials and cleanup supervision; approved two-call smoke in `docs/meta-inference-smoke-test.md`; confirm reported credit balance without exposing account details. Real temporal tracking and calibrated model quality are not claimed. Phase 2 inbox, remaining manual UX, OAuth-only deletion, native Tamil/device and participant-rule gates remain open.

### Release hardening

Session-storage denial uses a bounded 10-minute tab-memory fallback, never inline query content. Expired/reloaded drafts fail closed with a notice; legacy inline payloads are not accepted by the composer. Upload/admission continuations are fenced across cancellation/reset/unmount, and acknowledgement loss remains uncertain. The reviewed, unapplied 007 now includes a permanent smoke authorization tombstone and owner-bound permits. Only operator `authorize_first_smoke(uuid)` can prepare the first bounded test after separate approval; workers cannot authorize, rearm or expand budgets. Do not run it for hosted readiness. Preserve zeros and disabled live markers.
