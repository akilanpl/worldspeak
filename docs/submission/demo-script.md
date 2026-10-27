# Three-minute demonstration script and recording plan

> Total budget: 180 seconds. Every on-screen "AI result" is a labeled reconstructed mock (see evidence matrix). Narrator must speak the honesty lines verbatim. No live Meta call occurs during the demo.

## Script

### 0:00–0:20 — Problem and promise (20s)

> "Nonspeaking people need exact words, not guesses. WorldSpeak turns what you look at into words you approve — Meta AI sees the object, you confirm the meaning, and it speaks only when you press Speak. Nothing here is a live AI call: I will label every reconstructed result."

Show: guest board with 26 bilingual tiles; switch English/Tamil once.

### 0:20–0:55 — See: Meta scene understanding (35s)

> "Our one real Muse Spark 1.3 call succeeded — sanitized chair, confidence 0.99 — but saving it exposed a JSONB encoding defect we have since repaired and regression-tested. What you are about to see is not footage of that original call. It is a mock replay of its sanitized geometry with synthetic IDs, and it is captioned as such throughout."

Show (mock Chromium run, captioned RECONSTRUCTED MOCK — NOT ORIGINAL FOOTAGE): upload synthetic test PNG → Analyze → unchecked consent, zero requests → approve/send → Spark-labeled chair box appears → explicitly select it. State that geometry/confidence are assertions replayed from the sanitized historical receipt, not a new measurement, and that the response ID on screen is synthetic.

### 0:55–1:30 — Confirm and mean: catalog + deterministic preview (35s)

> "A selected object never establishes a desire. I confirm 'chair' against our reviewed catalog — the provider's catalogId stays null — choose 'I want', and the preview is rendered by a pure deterministic engine, never by model text."

Show: Correct the label → Apply label → "I want" → exact English preview → approve into composer. No speech yet; press Speak. Switch to Tamil; verify no speech until a fresh Speak. Caption: Tamil review-pending; automation speech stubbed.

### 1:30–2:05 — Trust: budgets, consent, privacy (35s)

> "Every analysis runs behind consent, atomic micro-dollar budgets, and leases. Transient images are private and cleaned up; revoked content is never published. A wrong owner, wrong image hash, or canceled consent fails closed."

Show (screen capture of code/evidence, or simple slides): budget reservation flow; `docs/evidence/hosted-inference.json` checks (13 hosted RLS groups, zero fixtures remaining); cleanup supervision receipt.

### 2:05–2:40 — Status honesty: SAM and limits (35s)

> "Segmentation display is implemented: our renderer paints validated pixel masks with stable object association, tested with synthetic fixtures down to exact canvas pixels. But no live SAM 3.1 call has been authorized yet — every mask pixel you just saw is synthetic. One real still-image call, capped at $0.0025, remains a separately gated decision."

Show: rendered synthetic pixel mask on canvas (captioned SYNTHETIC FIXTURE — NOT A REAL SAM RESULT) alongside its box; SAM-only acceptance proposal header; limitations slide.

### 2:40–3:00 — Close (20s)

> "WorldSpeak: Meta AI to see, deterministic engineering to mean exactly what you said, and your gesture to speak. Private by design, honest by evidence."

Show: title card with repository URL https://github.com/akilanpl/worldspeak and track/theme.

## Recording checklist

- [ ] 1920×1080 capture, system audio + voiceover mic tested; captions burned in for Tamil segments.
- [ ] RECONSTRUCTED MOCK watermark on every fixture-driven screen; honesty lines spoken verbatim.
- [ ] Mock-auth Chromium journey runs green locally first (`WORLDSPEAK_MOCK_AUTH_E2E=1`, filtered to `--grep "reconstructed Spark chair"`, run separately from the closed-cloud-gate guest suite per `docs/ai-workflow-validation.md` on main); fallback: stills of the same captioned screens.
- [ ] No API keys, tokens, user data, or real Google identity visible; use synthetic fixtures only.
- [ ] Consent/budget slides reference exact figures: 4402 micro-USD historical Spark ledger; 2,500 micro-USD proposed SAM cap.
- [ ] Tamil segments labeled review-pending; no claim of native-speaker approval or audible quality.
- [ ] Final cut ≤ 3:00 (aim 2:55); export 1080p MP4; keep raw project for re-cut.
- [ ] Human verifies participant guide's video limit/format before upload (guide still ungated).
