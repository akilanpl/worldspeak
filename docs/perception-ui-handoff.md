# Perception UI handoff — `feat/perception-ui` → main

Branch: `feat/perception-ui` (based on published `main` at `aa58466`).
Worktree: `worldspeak-perception/` (sibling of the main checkout; main's
uncommitted Phase 2 work was never touched).
Scope: **new files only** under `apps/web/src/features/perception/`,
`apps/web/src/app/perception/`, `apps/web/e2e/perception.spec.ts`, and this
document. No Supabase, auth, migration, catalog, engine, config, or
dependency changes. Frozen `packages/communication` and `SpeechGateway`
semantics reused read-only.

## What was built

- `types.ts` — `NormalizedBox`, `PerceivedObject` (`origin: fixture|model`,
  `confidence: null` unless model-supplied), `FixtureScene`, `CapturedImage`,
  `PerceptionStep`, `isNormalizedBox`.
- `geometry.ts` — pure contain-fit (`computeFittedRect`), normalized→pixel
  (`boxToPixels`), normalized→percent (`boxToPercent`, no float dust),
  `pointInBox`. DPR-independent by construction (vector + % positioning).
- `fixtures.ts` — three deterministic synthetic scenes (`table`, `shelf`,
  `empty`), all labels mapped to reviewed catalog nouns, all
  `confidence: null`. Explicitly test data, never inference.
- `CapturePanel.tsx` — camera open/capture (EXIF stripped by canvas
  re-encode, tracks stopped on capture/hide/unmount), PNG/JPEG ≤ 10 MB upload
  with type/size validation, preview + retake, permission-denied and
  no-camera states with upload fallback. Never uploads.
- `MaskOverlay.tsx` — reusable overlay: fitted-layer wrapper + % positioned
  keyboard-focusable region buttons + vector mask polygons; correct for any
  aspect ratio; occluded objects stay reachable via the list.
- `ObjectList.tsx` — equivalent list selection with disambiguation numbering,
  inline label correction, honest empty state.
- `SelectionPanel.tsx` — overlay + list + confidence shown only when
  non-null (fixtures show "unavailable"), label correction, back/continue
  gating, empty-state recovery.
- `IntentPanel.tsx` — want / do-not-want / where / help / social acts /
  own-words editing over the confirmed object; exact preview via the frozen
  engine (`renderComposition`); `onApprove({intent, locale})` handoff.
  **No speech engine here by design.**
- `PerceptionFlow.tsx` — capture → review → objects → intent → approved
  notice; focus moves to each step heading; reduced-motion respected.
- `strings.ts` — prototype UI copy (en + unreviewed ta; catalog nouns stay
  the reviewed source).
- `app/perception/page.tsx` — prototype screen with fixture banner.
- Tests: 34 unit/component (geometry, fixtures, overlay, list, selection,
  intent, capture permission/type/size, full-flow zero-speech, focus) +
  4 Playwright specs (fixture flow, keyboard path, empty scene, axe).

## Integration patch (for the main line, after Phase 2 closes)

Perception intentionally ends at `ApprovedSnapshot { intent, locale }`. The
integrator (not this branch) should:

1. In the composer (`Workspace`), accept an initial composition built from
   the snapshot, e.g. `reduce(empty, { type: "select-tile", ... })` for
   structured intents or `set-user-text` for user text — then require a fresh
   **Speak** click through the existing `SpeechGateway.speakApproved`. No
   gateway changes needed.
2. Optionally surface saved phrases: POST `ApprovedSnapshot`-derived message
   payloads to the existing history/favorites endpoints.
3. Add a nav link to `/perception` (deliberately not done here to avoid
   editing the shared layout Sol owns).
4. Keep the fixture banner until real SAM tracks replace `FIXTURE_SCENES`;
   confidence display already gates on non-null model data.

## Known limitations / follow-ups (not defects in this slice)

- Tamil UI copy here is unreviewed prototype text; catalog nouns unchanged.
- Per-noun Tamil sandhi (e.g. dative forms) is catalog data for native
  review — this branch asserts frozen engine output and changes no templates.
- `MaskOverlay` measures with `ResizeObserver` + image load; zero-size
  containers (hidden tabs) simply render no regions until laid out.
- Camera capture needs a real device + permission grant (unit-tested with
  mocks); no audible/device checks run in CI (fakes only).
- Phase 3 backend (upload admission, SAM still, tracking) is explicitly out
  of scope; real photos currently resolve to the documented empty state.
