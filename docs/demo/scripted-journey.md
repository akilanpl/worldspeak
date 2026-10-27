# WorldSpeak — repeatable scripted user journey

Preconditions: production build running locally, Chromium, speaker stubbed
(the demo build announces through the visible stub banner only).

1. Open `/`. Click **Water**. Check `I want water.` Press **Speak this
   sentence** once. (1 call, exact text.)
2. Press **தமிழ்**. Check `எனக்கு தண்ணீர் வேண்டும்.` Press **Speak**.
   (2nd call, Tamil text.)
3. Open `/offline`. If the status is not "Offline ready", reload once
   online first. Toggle the OS network off. Click **Water**, check the
   preview, speak. Toggle network back on.
4. Open `/perception`. **Continue** → fixture table. Select **chair** from
   the objects list. **Continue** → check `I want chair.` **Approve for
   composer**. Follow **Open in composer**. Check the provenance notice and
   the exact sentence. Do not press Speak yet.
5. Open `/video`. **Continue** → **Jump to appearance** (phone) → select
   the phone overlay → **Continue** → check `I want phone.` **Approve** →
   **Open in composer**. Check the sentence.
6. Correction path: in `/perception` objects, open a selected object's
   **Change label**, type `stool`, apply, continue — the preview reads the
   corrected word and stays silent.
7. Unknown object: open `/?handoff=` with the unknown-catalog payload from
   `e2e/evaluation.spec.ts` test 4. Check `mystery thing` renders and
   nothing speaks.
8. Trust path: attempt **Analyze with Meta** as a guest — the button is
   absent and the sign-in hint shows. Open `/perception` with no fixture —
   empty scenes explain themselves.
9. Close: state aloud that every detection shown was a labeled fixture and
   every voice was a local stub.

Timings: steps 1–2 ≈ 40s, 3 ≈ 20s, 4 ≈ 30s, 5 ≈ 30s, 6–8 ≈ 40s, 9 ≈ 20s.
