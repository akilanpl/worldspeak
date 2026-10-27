# Submission blockers and recommendations for Sol

> Docs-branch proposal only — no code changes, no authorization to spend, merge only with Sol's coordination.

## Blockers (must resolve before submission)

1. **Final participant guide unchecked.** Public pages still pointed at pre-event rules on 27 Oct. Without the guide, repository publicity, video limits, asset originality, AI-disclosure, and judging weights cannot be confirmed. *Action:* human opens the accepted-participant guide and diffs it against `docs/rules-verification.md`; update the submission docs the same day.
2. **Submission target branch undefined.** This package lives on `docs/meta-hackathon-submission` (based on `main`, which has no inference code). The demo and evidence only make sense against the release that contains the inference core. *Action:* Sol designates the release branch/commit; rebase this docs package onto it before the PR merges.
3. **No live SAM evidence.** A segmentation story with zero SAM calls is the weakest judging point. *Action:* approve or decline the one-still SAM proposal (`docs/sam-only-acceptance-proposal.md`, exactly 2,500 micro-USD cap) as a bounded human decision; if declined, the demo script already covers the honest fallback — do not weaken the honesty lines to compensate.
4. **Remaining Phase 2 manual gates** (inbox delivery, signed-in replay/search/delete/preferences, native Tamil, devices). Any submission screenshot implying these must be labeled or cut. *Action:* keep the demo on the mock-auth journey; do not substitute guessed screens.

## Recommendations

- **Deadline arithmetic:** third-party guides report submissions due 9:00 PM ET 4 Nov 2026 (02:00 UTC 5 Nov; 07:30 IST 5 Nov). Confirm against the participant guide and set an internal freeze ≥24h earlier (suggest end of 3 Nov IST) for video export and portal upload.
- **Track choice:** Indie vs Startup changes prize table and expectations; decide explicitly and align the project description's "who it serves" paragraph.
- **Credits:** confirm the $150 Model API credit grant landed before any paid SAM decision; reconcile the historical 4402 micro-USD receipt separately from internal ledger.
- **Video:** record the script's honesty lines verbatim; keep raw project files for re-cut if the guide imposes format limits.
- **No-go guardrails (unchanged):** no new paid calls from this branch; no API keys in chat/Git; no rewriting of the historical Spark receipt; no claiming fixture results as live; no merging without Sol.
