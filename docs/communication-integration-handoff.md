# Communication integration handoff — `feat/communication-integration` → main

Branch: `feat/communication-integration` (based on `feat/video-interaction`
at `ac513bb`, which contains the perception + video frontends).
Worktree: `worldspeak-integration/` (sibling checkout; `worldspeak/`,
`worldspeak-perception/`, and `worldspeak-video/` were never modified).
Scope: **new files** under `apps/web/src/features/integration/` and
`apps/web/e2e/integration.spec.ts`, plus narrow additive edits to
`apps/web/src/app/page.tsx` (entry wiring + journey copy),
`apps/web/src/app/layout.tsx` (two nav links),
`apps/web/src/features/perception/PerceptionFlow.tsx` and
`apps/web/src/features/video/VideoFlow.tsx` (approve → composer link),
and `apps/web/src/features/video/VideoCapturePanel.tsx` (unmount URL
revocation). No Supabase, migration, auth, catalog, engine, or config edits.
No API calls, no paid inference, no new speech engine.

## What was built

- `features/integration/handoff.ts` — typed `?handoff=` payload
  (`version`, `intent`, `locale`, `source`, `objectLabel`,
  `objectCatalogId`, `provenance: fixture|model`), base64url encode, total
  decode (anything invalid → null → empty board + notice), and
  `handoffToComposition` (fresh id + revision 1 per handoff so stale speech
  permits can never transfer; unknown catalog IDs degrade to exact user
  text instead of failing render).
- `features/integration/adapters.ts` — the ONLY entry points for real model
  results: `toPerceivedObject` (Muse Spark detections) and `toObjectTrack`
  (SAM 3.1 tracks, validated by the player's own `isValidTrack`), plus
  counting batch helpers. Invalid payloads are rejected, never partially
  rendered; unknown catalog IDs are preserved as labels for downstream
  degradation. Nothing calls these yet — fixtures still drive the UI.
- `features/integration/ComposerEntry.tsx` — board entry used by `/`:
  saved-message replay (server) wins, then `?handoff=` (client-decoded, so
  guest offline handoffs never need a roundtrip), then an empty board.
  Shows provenance ("From camera/video (demo fixture — not a real model)")
  or an invalid-link notice. Forwards the test-only gateway factory.
- Journey: `/` copy now offers Board / Camera / Video starts; primary nav
  links all three routes on every page; both flows show "Open in composer"
  (deep link with the approved intent) + "Start over" (dismiss, no speech)
  after approval. Back buttons and cancellation paths are unchanged.
- Resource review: perception capture stops camera tracks on hide/unmount;
  video capture now also revokes its preview object URL on unmount
  (previously leaked on route exit) — covered by a unit test.

## Verification (this branch)

- Unit: 111/111 pass (25 files), incl. 15 handoff/adapter/entry tests and a
  new unmount-revocation test.
- Typecheck (recursive), repo lint (0 errors), `next build` with `/`,
  `/perception`, `/video` prerendered.
- Playwright (Chromium): full suite incl. 6 new journey specs — perception
  and video approve → composer with zero `/api/` calls and zero speech
  until the Speak click (stubbed synthesizer asserts exactly one call with
  the exact approved text), tampered-link degradation, unknown-catalog
  user-text fallback, shared nav, axe.
- `check:secrets` still flags `apps/web/src/lib/supabase/server.ts:41`:
  cause is the **name** `SUPABASE_SERVICE_ROLE_KEY` (matches
  `/service_role/i` and `/supabase.*(secret|service)/i`) read from the
  environment — no key material exists in the repo. Pre-existing on the
  base branches; left for Sol, no secret to rotate.

## Invariants Sol must preserve

1. `Workspace` speaks ONLY inside the Speak button's `gateway.speakApproved`
   call; `initial` compositions (replay or handoff) must never auto-speak.
2. Speech permits bind (compositionId, revision, textHash) — every handoff
   mints a fresh id/revision, so re-approving or navigating cannot replay
   an old permit (the gateway returns stale/duplicate instead of speaking).
3. `?handoff=` decode stays total: any widening (new version, new source)
   must keep rejecting unknown input to an empty board + notice.
4. Layout primary nav must keep Board/Camera/Video reachable; route paths
   `/perception` and `/video` are deep-linked from approved notices.

## Remaining real-inference adapters (not in this slice)

- Muse Spark endpoint → `toPerceivedObject`/`adaptDetectionList`
  (wire where `startDetection`/`startTracks` currently load fixtures;
  confidence renders automatically when non-null).
- SAM 3.1 service → `toObjectTrack`/`adaptTrackList` per the contract in
  `docs/video-ui-handoff.md`; batch `rejected` counts should surface as a
  "some tracks unavailable" notice rather than silent drops (UI string TBD).
- Authenticated save of handoff-derived compositions via the existing
  history/favorites endpoints (guest flow stays local-only).
- Real-device checks still open: camera grants, Tamil shaping at large
  text scales, airplane-mode journey, audible Speak verification.

## Release privacy correction

Navigation now carries opaque tab-local keys only. Blocked sessionStorage falls back to bounded, expiring in-memory storage and Next client navigation; it never writes payloads into URL/query/history or a server. Reload/new-tab without storage fails closed with an explicit unavailable-draft notice. Incoming inline payload links are no longer resolved by the composer. E2E uses a dedicated configurable loopback port and refuses to reuse another developer's server.
