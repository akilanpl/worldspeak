# WorldSpeak production deployment receipt

Evidence date: **3 November 2026**. Verified main baseline `a5619178c89b0ff5b7516272ea850d291b2d4870`; [main CI 41598627645](https://github.com/akilanpl/worldspeak/actions/runs/41598627645) and [offline CI 41598627577](https://github.com/akilanpl/worldspeak/actions/runs/41598627577) passed. The deliberately preserved deployed application source is `7030dbfe365618e048f4a6a7f6b7b4b5f8e41668` ([PR 19 main CI 41592840401](https://github.com/akilanpl/worldspeak/actions/runs/41592840401)); newer main adds only the offline research scaffold. Canonical live origin: [https://worldspeak-akilanpl.vercel.app](https://worldspeak-akilanpl.vercel.app).

Portable receipts: [production/metadata/Auth configuration](evidence/production-readiness-2026-11-03.json), [hosted read-only database reconciliation](evidence/hosted-reconciliation-2026-11-03.json). Original receipt hashes are preserved; no secret values, account identities or private messages are included.

**Verified canonical HTTPS URL:** https://worldspeak-akilanpl.vercel.app

Platform: existing user-owned Vercel Hobby project `worldspeak-akilanpl`; full Next.js Node 22 server runtime, pnpm workspace root `apps/web`, frozen lockfile install and unchanged strict deployment preflight. No paid plan/service or new legal acceptance.

Recorded READY production deployment `dpl_EN1zrmXPq9inVYT4G4RUsx1chPAK`, source `7030dbf`. Nine-route production smoke passed: board/camera/video/offline/manifest/service-worker 200; guest preferences/job status 401. Native Brave loaded the canonical board and exact preview. Immutable URL remains Vercel-login protected; use the canonical alias for judges.

App-supplied environment names only: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `WORLDSPEAK_INFERENCE_API_ENABLED=false`. Live marker unset. No model/worker/database/service-role secrets were supplied. Vercel system metadata is separate and accepted only by reviewed exact routing schema, never a wildcard.

Canonical HTML and 10 same-origin Next scripts showed none of the listed feedback/toolbar/analytics markers. This does not prove absence of every possible telemetry request. Project-only analytics/Speed Insights disabling and metadata compatibility do not establish real authenticated acceptance.

Owner-saved Supabase Site URL matches canonical origin. Two exact production callbacks (`/auth/callback?next=/history`, `/auth/callback?next=/reset-password`) were independently observed among 5 allowlist entries; local entries retained, no wildcard. Google provider callback remains the project Supabase callback. Owner Google selection was attempted, but Brave History still returned to Sign In; no disposable data was changed. The session/data journey did not pass and its cause is unproven. Safe callback diagnostics accompany this release; they do not establish a login repair. Inbox and OAuth-only account deletion remain unaccepted.

Rollback must use the last known toolbar-clean artifact `dpl_EN1zrmXPq9inVYT4G4RUsx1chPAK` and preserve database migrations, accounting and cleanup supervision. Earlier artifact `dpl_73Rt` is not a safe default because feedback injection was observed; no rollback exercise is claimed. The completed guest capture and post-capture deployment check still identify this same preserved artifact/source. The recorder does not itself change the deployed application.

A **122.72-second silent, captioned guest demo candidate** completed in [capture CI 41607185098](https://github.com/akilanpl/worldspeak/actions/runs/41607185098). Its storyboard and hashes were reviewed; [portable receipt](evidence/guest-demo-2026-11-03.json) records source `7030dbf`, no observed forbidden requests and no public video URL. It is not yet an approved final portal asset; publication and final submission require owner approval. Silent footage does not establish native audio, Tamil pronunciation or physical-device acceptance.

Superseding anonymous product review at **2026-11-03 08:42:39 UTC** repeated the production smoke: **9/9 passed**. `/history`, `/favorites` and `/settings` each returned **307 to sign-in** with private/no-cache/no-store headers. No cookies, Authorization, mutation or model call was sent. This verifies anonymous protection, not the pending real Google session journey. The portable production receipt includes the full sanitized result and original hash.
