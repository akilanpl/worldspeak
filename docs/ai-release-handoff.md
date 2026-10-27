# AI release handoff — `integrate/worldspeak-ai-release` → `integrate/worldspeak-full-stack` → main

Stacked branch `integrate/worldspeak-ai-release` (merge of Sol's
`feat/meta-inference-core` at `2c28a7b` into the frontend consolidation at
`e06da84`). Clean auto-merge, no conflicts — disjoint file sets. Sol's
Phase 2 auth/session/RLS/CI work is byte-identical to `origin/main`;
the latest Phase 2 secret scanner is preserved untouched. Nothing was
pushed to main and PR #1 was not modified.

## What was wired

- `features/analysis/` (new): signed-in-only still-image analysis.
  - `session.ts` — eligibility via Supabase session (`ready`/`guest`); guests
    never see an upload option and keep the offline fixture path.
  - `imageBytes.ts` — data-URL → upload bytes with type/size guards.
  - `useAnalysisJob.ts` — upload (with prior explicit consent) → scene or
    segment job → bounded GET-only polling (1s, 2s, then 5s; ~20 polls max;
    pauses while hidden) → result validated against `InferenceResultSchema`
    with `provenance.source === "model"` enforced → existing
    `adaptDetectionList` (fixtures can never enter it). No automatic retry
    anywhere: failed submissions return to idle and need fresh consent +
    fresh idempotency key; cancel fires job DELETE + media DELETE and
    reports `canceled` immediately; stale polls are fenced by job identity.
  - `ConsentPanel.tsx` — one-upload consent copy (WorldSpeak + Meta
    recipients, 15-minute retention, no retraction after send, provider
    terms, per-upload approval); the `scene-v1` header is sent ONLY from
    its Send button after the checkbox.
  - `JobStatus.tsx` — queued/processing/succeeded/failed/canceled/uncertain/
    unavailable states; uncertain and failed never offer retry.
  - `AnalysisFlow.tsx` — consent → machine → explicit "Use these objects"
    confirmation emitting validated model `PerceivedObject[]`.
- `PerceptionFlow.tsx`: review step gains "Analyze with Meta" (signed-in +
  real photo only) and a guest sign-in hint; new `analysis` step; objects
  step shows a `model-results-notice` banner and "Refine with SAM
  segmentation" (segment job with the confirmed label) when model objects
  are present; approve resets model state. Fixture flows are unchanged.
- `VideoFlow.tsx`: real-clip notice now states video inference is disabled
  and the backend supports still images only. No video upload path exists.
- `features/integration/adapters.ts`: input types are now Sol's contract
  `Detection` / `ModelTrack` — the UI seam is typed end-to-end (fixture
  `PerceivedObject`/`ObjectTrack` construction is unchanged).
- `handoff.ts` + `ComposerEntry` + `page.tsx`: privacy transport.
  `handoffHref` stores the payload in sessionStorage under a random key and
  navigates to `/?handoff=<key>`; the composer resolves the key (legacy
  inline payloads still decode) and remounts per key, so consecutive
  handoffs swap state with no full reload and user-entered text never lands
  in browser history. Storage-unavailable falls back to the inline payload.
  Guest offline operation needs no network. Open-in-composer and journey
  nav links are Next `Link` (client navigation, `prefetch={false}` like
  Sol's Board link).

## Verification (this branch)

- Roadmap type gates: `pnpm lint` 0 errors, recursive `typecheck` clean,
  `next build` succeeds.
- Unit: 169/169 pass (37 files), incl. the full mocked image journey
  (capture bytes → consent gate → upload → job → validated detections →
  confirmation), every terminal state, no-retry proof, unmount/cancel
  fencing, guest gating, and the ComposerEntry no-speech gate.
- E2E (Chromium, production build): 26/26 — journey specs prove both
  fixture handoffs land exact sentences with zero `/api/` calls and zero
  speech until the Speak click; handoff keys (never user text) in history;
  reload-free handoff-to-handoff navigation; guests never see analysis;
  unknown-catalog degradation; shared nav; axe.
- `test:db` (incl. worker concurrent scenarios): environmentally blocked —
  the sandbox uid has no passwd entry so ephemeral Postgres cannot start;
  no server on 5432/54399. Zero diff vs `origin/main` under `supabase/`
  and `packages/db`; main carries passing release CI. CI must run it.
- `check:schema`: snapshot + pending-007 inventory match.
- `check:secrets` (latest scanner): run at the end; outcome recorded in the
  PR body.

## Smoke-test SQL review (proposal only — nothing executed, no approval)

The outline in `docs/meta-inference-smoke-test.md` is almost right; two
tightenings are recommended before any live run:

1. `update world_inference.generation_permits set remaining=1;` is
   unscoped: it arms BOTH operations for ANY funded identity and silently
   replenishes an already-consumed permit on re-run. Scope and guard it:
   `update ... set remaining=1 where operation in ('scene','segment') and
   remaining=0`, then assert exactly 2 rows changed — abort otherwise
   (a non-zero row means a prior dispatch or a repeated outline).
2. The designated-user budget insert has no spent/reserved guard (only the
   global one does). Add the same `raise exception` guard for the
   designated user's existing counters before setting the limit, so the
   $0.05 ceiling math is enforced rather than commented.

Permits are per-operation, not per-identity — the outline's safety rests
entirely on every other budget staying zero. Verify with
`select account,limit_micro,spent_micro,reserved_micro from
world_inference.budgets` immediately before enabling anything.

## Hosted requirements before the first real smoke (all still open)

- Apply reviewed migration 007 to the dedicated project
  `cafkywssdemzizhzxbb` ONLY (never the test shim/reset, never other
  projects); run live advisor/type/RLS/Storage verification; regenerate
  real hosted Database types and replace `packages/db/src/inference-rpc.ts`
  overlay; update the hosted snapshot.
- Provision the dedicated `worldspeak_inference_worker` login (no password
  in chat/Git), worker-only `META_MODEL_API_KEY`, and server-only Storage
  key through protected configuration; keep live markers/permits zero.
- Establish cleanup supervision (e.g. `pnpm --filter @worldspeak/worker
  once` on a documented cadence) and verify physical byte deletion.
- Obtain explicit consent for the exact sanitized still; confirm pricing,
  entitlement, and remaining credits (the $149.82 figure is stale).
- Then follow the two-call smoke outline exactly (one Spark scene, one SAM
  still, $0.05 ceiling, no retries, revoke + reconcile + cleanup after).

## Live-inference handoff

- `adaptSamVideoText` (pure SAM-temporal normalizer) is available in
  `packages/inference` but intentionally has no UI caller: real video
  inference stays disabled until a future slice adds format normalization,
  frame/timestamp mapping, and end-to-end tracking verification.
- Confidence renders only when the model supplies it; rejected geometry
  counts surface in the UI; `segmentationMasks` rasters remain exact and
  separate — no polygon is fabricated from boxes.
- Remaining manual gates from Phase 2/3 (native Tamil review, real-device
  camera/shaping/airplane-mode checks, audible Speak verification) are
  unchanged by this branch.
