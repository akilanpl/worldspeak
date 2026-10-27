# Video UI handoff — `feat/video-interaction` → main

Branch: `feat/video-interaction` (based on `feat/perception-ui` at `1a8bb9a`).
Worktree: `worldspeak-video/` (sibling of the main and perception checkouts;
neither tree was touched).
Scope: **new files only** under `apps/web/src/features/video/`,
`apps/web/src/app/video/`, `apps/web/e2e/video.spec.ts`, and this document.
No Supabase, auth, migration, catalog, engine, config, or dependency changes.
Frozen `packages/communication` and `SpeechGateway` semantics reused
read-only; the existing perception contracts (`PerceivedObject`,
`IntentPanel`, geometry) are reused, not duplicated. No live SAM, no uploads,
no speech engine in this slice.

## What was built

- `types.ts` — `TrackPoint { t, box, mask }`, `ObjectTrack { trackId,
  labelEn, labelTa, catalogId, points, origin: fixture|model, confidence }`,
  `VideoClip`, `VideoFixtureScene`, `VideoStep`, `isTrackPoint`.
- `tracks.ts` — pure track math: `trackBoxAt` (linear keyframe interpolation,
  null outside the window; masks hold the nearest keyframe with exact-midpoint
  ties resolving to the earlier keyframe), `activeTracksAt` (stable order),
  `trackWindow`, `isValidTrack` (strict backend-payload validation shared with
  the future adapter).
- `fixtures.ts` — two deterministic synthetic timelines, clearly labeled test
  data: `crossing` (10 s: sliding bottle, static chair, phone appearing 2–5 s
  overlapping the chair) and `empty-motion` (6 s, no tracks). All labels map
  to reviewed catalog nouns; all `confidence: null`.
- `VideoCapturePanel.tsx` — MediaRecorder capture (auto-stop at 10 s,
  mime fallback chain, camera/audio-off), MP4/WebM upload ≤ 50 MB with
  duration probe ≤ 30 s, preview + retry/remove, object-URL revocation and
  camera-track cleanup on hide/unmount, denied/unavailable/unsupported states
  with upload fallback. Never uploads.
- `VideoTrackPlayer.tsx` — player with synchronized overlays: regions render
  from `activeTracksAt(tracks, clock)` every tick, interpolation keeps
  movement aligned, appearance/disappearance follow track windows, % + vector
  overlays stay correct across aspect ratios and DPR. Synthetic fixtures tick
  on a fixed 10 Hz step; real clips mirror the media element. Keyboard users
  get the same tracks via `TrackList`.
- `TrackList.tsx` — accessible equivalent: every track with its time window,
  first-appearance seek, confidence shown only when model-supplied.
- `VideoFlow.tsx` — capture → review → tracks → intent → approved notice,
  reusing perception `IntentPanel` (same want/do-not-want/where/help/social
  acts, exact preview, `onApprove({intent, locale})`). Real clips honestly
  report that backend tracking is pending. **No speech here by design.**
- `app/video/page.tsx` — prototype screen with fixture banner.
- Tests: 21 unit/component (interpolation, windows, validation, overlay sync
  incl. appear/vanish/overlap, keyboard selection, seek, capture permission /
  type / size / duration, URL revocation, full-flow zero-speech, empty
  recovery) + Playwright specs (fixture flow, keyboard path, empty timeline,
  axe).

## Integration patch (for the main line, after Phase 2 closes)

Video ends at the same `ApprovedSnapshot { intent, locale }` as perception.
The integrator (not this branch) should:

1. Accept the snapshot in the composer exactly like the perception one
   (`select-tile` / `set-user-text` + a fresh **Speak** click through
   `SpeechGateway.speakApproved`). No gateway changes needed.
2. Optionally persist video-derived messages via the existing
   history/favorites endpoints.
3. Add a nav link to `/video` (deliberately not done here to avoid editing
   the shared layout).
4. Keep the fixture banner until real SAM tracks replace `VIDEO_FIXTURES`;
   confidence and timeline UI already gate on real data.

## Real SAM 3.1 backend contract (what the model side must satisfy)

When the backend lands, it must produce per clip an ordered payload the UI
can feed to `isValidTrack` + the existing player unchanged:

```ts
interface SamTrackPoint { t: number; box: NormalizedBox; mask: { x: number; y: number }[] | null; }
interface SamTrack {
  trackId: string;            // stable within one clip, never reused across clips
  label: string;              // mapped to a reviewed catalogId, or null → user text
  catalogId: string | null;
  points: SamTrackPoint[];    // ascending t, seconds from clip start
  confidence: number | null;  // null when the model declines to score
}
```

Rules: coordinates normalized [0,1] like the still path; boxes with
`x1 < x2`, `y1 < y2` inside the frame; masks optional per keyframe (the UI
never morphs them — hold-nearest is by design, so keyframe at ≤ 2 Hz is
enough for smooth boxes); tracks sorted by first appearance; disappearance =
end of points (the UI hides the track, no tombstones needed); empty result =
`tracks: []`, which the UI already renders honestly. Validation failures must
reject the payload, never render partial tracks.

## Known limitations / follow-ups (not defects in this slice)

- Real-clip tracking is pending: upload/record yields a preview with an
  honest "backend arrives in Phase 3" notice, no fake tracks.
- Tamil UI copy here is unreviewed prototype text; catalog nouns unchanged.
- Synthetic clock is a fixed 10 Hz step (deterministic, not wall-clock
  locked); real clips follow the media element's currentTime.
- Camera/microphone capture needs a real device + permission grant
  (unit-tested with mocks); no audible/device checks run in CI.
- Overlays assume the fitted contain rect; zero-size containers render no
  regions until laid out (same behavior as the still path).
