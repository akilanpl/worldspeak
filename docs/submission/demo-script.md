# Demonstration script — 180-second target, portal limit unverified

> Total budget: 180 seconds. Every on-screen "AI result" is a labeled reconstructed mock (see evidence matrix). Narrator must speak the honesty lines verbatim. No live Meta call occurs during the demo.

## Script

### 0:00–0:20 — Problem and promise (20s)

> "Nonspeaking people need exact words, not guesses. WorldSpeak turns what you look at into words you approve — Meta AI sees the object, you confirm the meaning, and it speaks only when you press Speak. Nothing here is a live AI call: I will label every reconstructed result."

Show: guest board with 26 bilingual tiles; switch English/Tamil once.

### 0:20–0:50 — Essential bilingual communication (30s)

> "Choose Water, review the exact English sentence, and press Speak. Stop is always available. Changing to Tamil produces a new preview and requires a fresh Speak. Tamil wording and native pronunciation are still awaiting independent review."

Show the actual board, English/Tamil preview and explicit Speak/Stop. If no audible voice is verified, caption that limitation rather than dubbing fake application speech.

### 0:50–1:20 — Local manual video (30s)

> "This is a real local clip with manual human selection, not automatic AI tracking. I pause, choose the frame and region, enter my meaning, approve the preview and open the composer. Selecting the object never chooses my intent or speaks."

Use `apps/web/e2e/fixtures/manual-region.webm`; show the manual provenance text and fresh Speak. Never capture a personal room or real user.

### 1:20–1:45 — Personal pictogram (25s)

> "I choose a synthetic local image and assign my exact words. The image stays in page memory. I approve those words into the composer; speech still needs my gesture."

Show local creation, approval and deletion/leave cleanup. No Muse Image claim.

### 1:45–2:15 — Honest Meta evidence (30s)

> "One real Muse Spark Standard call identified this synthetic chair at 0.99 confidence. Its original application save failed because of JSONB double encoding; that defect is now repaired and regression-tested. This receipt is historical evidence. The mask shown next is a synthetic SAM fixture, not a live SAM result. No real SAM generation has completed."

Show sanitized receipt/evidence and explicitly captioned synthetic mask. Do not enable live inference or rely on mock-auth footage without a persistent mock watermark.

### 2:15–2:40 — Privacy and offline (25s)

> "Private data is owner-scoped. Media needs consent and durable cleanup. Budgets, leases and one-shot permits fence inference, which is disabled in this release. The prepared essential board works offline. Evaluation is synthetic, not model accuracy."

Show only a genuinely observed offline board or label the footage as a reproducible test. Preserve the historical 4,402-micro-USD ledger.

### 2:40–3:00 — Close (20s)

> "WorldSpeak keeps the person in control: visual context, explicit meaning, exact bilingual words, and a gesture to speak."

Show the actual verified deployment URL if available and repository, track/theme. Keep missing device/native checks on the limitations card.

## Recording checklist

- [ ] 1920×1080 capture, system audio + voiceover mic tested; captions burned in for Tamil segments.
- [ ] RECONSTRUCTED MOCK watermark on every fixture-driven screen; honesty lines spoken verbatim.
- [ ] Mock-auth Chromium journey runs green locally first (`WORLDSPEAK_MOCK_AUTH_E2E=1`, filtered to `--grep "reconstructed Spark chair"`, run separately from the closed-cloud-gate guest suite per `docs/ai-workflow-validation.md` on main); fallback: stills of the same captioned screens.
- [ ] No API keys, tokens, user data, or real Google identity visible; use synthetic fixtures only.
- [ ] Consent/budget slides reference exact figures: 4402 micro-USD historical Spark ledger; 2,500 micro-USD proposed SAM cap.
- [ ] Tamil segments labeled review-pending; no claim of native-speaker approval or audible quality.
- [ ] Final cut ≤ 3:00 (aim 2:55); export 1080p MP4; keep raw project for re-cut.
- [ ] Human verifies participant guide's video limit/format before upload (guide still ungated).
