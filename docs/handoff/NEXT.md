# NEXT — finish Phase 2 acceptance

Do not begin Phase 3.

1. Google login and hosted session passed. Complete remaining manual signed-in search/replay/delete/preferences and sign-out checks. Use disposable records; preserve the real Google identity.
2. Verify saved callback allowlist entries, use a controlled authorized inbox or approved SMTP configuration, and demonstrate public sign-up → delivered confirmation → login and delivered recovery → password change. Preserve confirmation and rate limits; no retries while service-limited.
3. Run signed-in browser save/favorite/search/replay/delete and preferences UI against the hosted project in an environment that can launch Chromium. Current Google Save/Favorite/History and foreign read checks are real; implementation CI passed 9 browser tests. These do not stand in for every remaining manual hosted UX check. Verify no automatic speech on replay.
4. Confirm independent native Tamil wording and audible English/Tamil/Stop, zoom/contrast/offline on named physical devices.
5. Check actual participant rules; record current release CI, secret audit and any unresolved warnings.

Acceptance remains incomplete until these gates have evidence. After acceptance, use `PHASE-3.md` as the next bounded task; it is a plan only.

## 27 October 2026 — bounded Phase 3 authorization

The human explicitly authorized non-paid inference-core engineering on isolated `feat/meta-inference-core` despite the Phase 2 manual gaps above. This supersedes the earlier no-Phase-3 instruction only for this bounded task. Phase 2 is still not accepted. No paid call or hosted migration is authorized by this note. See `docs/meta-inference-handoff.md` and the prepared, unapproved two-call smoke protocol.
