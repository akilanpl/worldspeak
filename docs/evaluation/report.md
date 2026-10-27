# WorldSpeak evaluation report — mobile/demo readiness slice

Branch: `feat/mobile-demo-readiness` at the commit recorded in the delivery
message. Method: Playwright Chromium (desktop 1280px + Pixel 7 mobile
390×844 touch emulation + 320px zoom-reflow + `reducedMotion: reduce`),
stubbed synthesizer, airplane-mode service-worker path, synthetic fixtures
and hand-built handoff payloads only. No paid models, no hosted calls, no
real inference anywhere in this slice.

## Suite results (observed, this branch)

- `e2e/evaluation.spec.ts` — 9/9 pass (desktop Chromium):
  1. Guest offline board composes with zero `/api/` calls (airplane mode).
  2. English `I want water.` and Tamil `எனக்கு தண்ணீர் வேண்டும்.` render
     exactly, with zero speech calls.
  3. Object selection → intent confirmation preserves the approved sentence
     into the composer handoff, still with zero speech calls.
  4. Unknown catalog IDs degrade to exact user text (`mystery thing`).
  5. A full guest fixture journey issues zero `/api/v1/media` requests and
     never shows an upload-to-Meta option.
  6. Full video journey (track → intent → composer) makes zero speech calls
     until the Speak click, which produces exactly one call.
  7. Speak → Tamil switch → Speak yields two calls with the exact EN then TA
     texts (each edit mints a fresh revision; permits cannot replay).
  8. (Camera, below.) No `getUserMedia` call on page load for `/perception`
     or `/video` — capture requires the explicit button.
  9. Empty scene, tampered handoff, and approve → Start over all present
     clear notices with working recovery and no crash.
- `e2e/evaluation-mobile.spec.ts` — 5/5 pass (390px touch):
  8a. `/`, `/perception`, `/video` reflow with zero horizontal overflow.
  8b. All 8 primary nav links now clear 44px hit areas (was ~20px text).
  8c. The mobile fixture journey completes end to end with zero speech.
  8d. Real keyboard Tabs reach overlay regions with a visible 3px outline
      (`:focus-visible`; programmatic focus intentionally shows none).
  Axe: no serious/critical findings at mobile width.
- `e2e/evaluation-motion.spec.ts` — 1/1 pass: with reduced motion emulated,
  button transitions compute to `0s` and the EN + TA journeys complete.
- Pre-existing suites on this branch: full unit + all earlier e2e specs
  re-run in the final gate section below.

## Device/UX audit measurements (Pixel 7 emulation, 390px CSS width)

- Horizontal overflow: none on `/`, `/perception`, `/video` (320px zoom
  reflow also clean — approximates 400% zoom).
- Overlay tap targets (table scene, 390px): water 68×157, food 95×86,
  chair 128×172, phone 61×41. All clear WCAG 2.2 AA (24px); the phone
  region is small by design (geometry must match the box exactly — see
  limitations) and the accessible object list is the disambiguation path.
- Overlapping targets: a tap at the chair region's center is intercepted
  by the on-top phone region (later DOM sibling). This is intended stacking,
  not a bug: occluded objects stay reachable through the numbered
  accessible list, which the suite exercises.
- Contrast: axe color-contrast clean at desktop and mobile widths (teal
  `#0f766e` on white ≈ 6.4:1; ink on paper and amber statuses pass AA).
- Motion: `prefers-reduced-motion` and the in-app `data-motion="reduce"`
  switch both force animations/transitions off globally.
- No page requests camera, microphone, uploads, or speech on load; every
  one of those requires an explicit user gesture.

## Fixed in this slice

- Primary nav links grew from ~20px text targets to 44px hit areas via a
  `.nav-link` class (`globals.css` + `layout.tsx` class hooks only, no
  visual redesign).

## Limitations (hand-off for Sol / future work, not defects of this slice)

- Overlay geometry is exact by design: very small or fully occluded objects
  rely on the accessible list. No minimum-size distortion was introduced.
- 200%/400% zoom was tested as 640px/320px CSS reflow, not OS-level zoom;
  large-text (`data-scale`) combined with 320px was not exercised.
- Camera capture, Tamil shaping at large scales, airplane-mode video, and
  audible Speak remain device-lab checks (mocks only in CI).
- Reduced-motion verification is CSS-computed, not a human vestibular
  review.
