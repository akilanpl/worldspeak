# Release acceptance — 28 October 2026

Application source: `4e9db78eb225f086533a830b2da66df41622c1a5`.
Environment: local optimized Next.js production build, http://127.0.0.1:3137, macOS Brave plus a dedicated in-app browser. Browser viewport checks are emulation, not phone hardware. No real authenticated session was used in this sprint.

| Test | Status | Actually observed / boundary | Remaining human action |
|---|---|---|---|
| Frozen installation, production build | PASS | pnpm 10.18.0 frozen install and Next build exit 0 | Verify public artifact separately |
| Schema artifact + secret checks | PASS | Offline schema guard exit 0; 311 indexed and 589 historical blobs clean | No hosted schema changes made |
| Nine local HTTP routes | PASS | Board/camera/video/offline/SW/manifest 200; private guest APIs 503 because local Auth is unconfigured | Production must return 401, not 503 |
| Essential Water English/Tamil | PASS | Correct exact previews; separate fresh Speak actions; no speaking status from selection/language switch | Native linguistic review |
| Native speech/Stop state | PASS | Brave audio-playing signal; dedicated browser `Speaking the exact preview.` then `Speech stopped.`; Vani ta-IN available | Human must hear exact English/Tamil output and verify prompt interruption; audible quality BLOCKED |
| Real local video | PASS | Original synthetic manual-region.webm decoded 2s; froze frame, confirmed region, entered exact words, approved into composer; manual/no-inference provenance visible | Real camera/recording/orientation on named phone |
| Local pictogram | PASS | Approved synthetic chair image + human wording; preview/approval, composer provenance and explicit Speak/Stop; page departure clears gallery to 0 | Phone file-picker acceptance |
| Privacy of handoff | PASS | URL carries random session handoff identifier, no entered sentence; pictogram passes text only | Browser-history inspection on deployed origin |
| Phone-size layout | PASS | 390×844 browser emulation: document width = scrollWidth = 390 on board and pictograms | Named physical phone test remains BLOCKED |
| Large text/contrast/focus | PASS | A++ and high contrast at 390px; keyboard Water→Food focus has solid outline | OS 200% zoom/high contrast and assistive-tech human test |
| Cached offline reload with origin stopped | PASS | Observed Offline ready; stopped only this sprint's Next process (exit 130); curl failed with HTTP 000/exit 7; browser reload of static board still rendered Water and Tamil exact preview | Named phone airplane-mode/reconnection remains BLOCKED |
| Camera allow/deny | BLOCKED | Camera shell HTTP 200 only; no device capture or permission granted here | Named phone: explicit allow then deny in separate runs, synthetic target only |
| Real hosted Auth + history | BLOCKED | Earlier Google/OAuth evidence preserved; this sprint uses guest local build, not mock session acceptance | Production callback allowlist; disposable sign-in/save/favorite/search/replay/delete/preferences/logout |
| Inbox/native Tamil/device | BLOCKED | Historical gaps remain open | Owner inbox confirmation/recovery; independent Tamil reviewer; named phone/OS/browser |
| SAM/live models | BLOCKED | Synthetic renderer tests and historical Spark receipt only | Separate explicit authorization; no tickets/limits enabled here |

Source CI reused: https://github.com/akilanpl/worldspeak/actions/runs/40533861782 (green at the exact release SHA). No application changes in this documentation refresh; no repeated full database/E2E suite is claimed. No Meta generation, token-count, hosted migration, media upload to Meta, ticket issuance or spending-limit modification occurred.

## Hosting receipt

Existing user-owned Vercel Hobby team verified. Dedicated `worldspeak-akilanpl` project created; Node 22, root `apps/web`, frozen monorepo install. Production build command runs the unchanged strict deployment preflight, typecheck, schema artifact check and full Next build. Public Supabase URL/key and exact proposed HTTPS origin plus `WORLDSPEAK_INFERENCE_API_ENABLED=false` are the only four configured names; no worker/Meta/database/service-role key is transferred. Account deletion is therefore not accepted.

Initial remote build stopped at `UNREVIEWED_PUBLIC_VARIABLE`. Turning off automatic system env exposure removed standard Vercel public variables, but Vercel still injected `NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG`. No public allowlist was weakened. Final hosting outcome must be appended after a successful observed deployment; failed deployment URLs are not a working demo.

Final hosting outcome: **BLOCKED**, no working public deployment. Project owner/team and Hobby plan were verified by Vercel CLI. The approved project-only Web Analytics disable returned `enabled:false`; Speed Insights interactive confirmation returned `Speed Insights is disabled`. No analytics/Speed Insights package, component or observability variable reference was found in apps, packages or lockfile. Automatic system environment exposure is false. Nevertheless the final deployment API still lists the platform-injected observability variable in both build and runtime environments; the strict gate stopped it. No values were printed or added to the app allowlist.

Failed final build: https://vercel.com/softwareengineerakilan-3959s-projects/worldspeak-akilanpl/6SXWE3GnjTYUbJ3F5Rr81SXsdMaL
Earlier failed build IDs: `dpl_DbdBLz7p17FHNDBfgC9z4JRNseNM`, `dpl_Fj3QxpqfcupD1dmqJ2TGXfxL36iJ`. Three bounded attempts, no automatic loop. Production HTTP/browser/Auth checks are BLOCKED, not passed by local evidence. Proposed alias is not advertised as a live product.

No hosting purchase, Pro trial, new integration, Auth change, hosted SQL, model call, media-bearing preflight, ticket or budget change occurred. The local demo server was stopped after the cached offline check; cleanup supervision was untouched. The original build command and application source are unchanged.
