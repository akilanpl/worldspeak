# NEXT — finish Phase 2 acceptance

Do not begin Phase 3.

1. Complete the human Google Cloud consent/client setup, enter credentials directly into WorldSpeak's Google provider, and perform a real PKCE browser login/sign-out.
2. Verify saved callback allowlist entries, use a controlled authorized inbox or approved SMTP configuration, and demonstrate public sign-up → delivered confirmation → login and delivered recovery → password change. Preserve confirmation and rate limits; no retries while service-limited.
3. Run signed-in browser save/favorite/search/replay/delete and preferences UI against the hosted project in an environment that can launch Chromium. Current backend evidence is real, but cannot stand in for browser UX. Verify no automatic speech on replay.
4. Confirm independent native Tamil wording and audible English/Tamil/Stop, zoom/contrast/offline on named physical devices.
5. Check actual participant rules; record current release CI, secret audit and any unresolved warnings.

Acceptance remains incomplete until these gates have evidence. After acceptance, use `PHASE-3.md` as the next bounded task; it is a plan only.
