# Accessibility acceptance — 3 November 2026

Baseline source: `0ab6b457bcc61d502ec0e38f714882225ba7753a`. **WCAG 2.2 AA conformance and physical accessibility are not certified.** No new device, screen-reader or human listening test was executed by this reviewer.

| Area | Current evidence | Status / next executable check |
|---|---|---|
| Exact words / gesture | Pure communication engine binds composition ID/revision/hash; gateway rejects stale/duplicate approvals and wrong-language voices; cancel precedes a new explicit utterance. | Source/automated coverage. Human hears exact English and Tamil; change draft and verify silence until a new Speak. |
| Stop/navigation | Gateway cancel; composer unmount/visibility cleanup calls Stop. Prior 28 October browser reported `Speech stopped.` | Real immediate audible interruption remains BLOCKED without a listener. |
| Missing voice | `pickVoice`/`voiceMatches` reject nonmatching language and return an actionable no-voice message. | Test actual unavailable Tamil voice; final-boundary voice disappearance is now fail-closed and regression-tested (see security report), not device-accepted. |
| Focus / labels | Skip navigation, named buttons/groups, visible focus, labels/status regions; automated axe specs inspect representative flows. | Prior 28 October browser Water→Food focus had solid outline. New local E2E cannot launch (Mach-port); no fresh screen-reader PASS. |
| Reflow / large text | Prior browser emulation 390×844: no horizontal overflow; A++ and high contrast worked. Existing CI contains 200% text/reflow regressions. | Not real phone or OS zoom acceptance. On final HTTPS app test 200% and 400%, portrait/landscape, labels and targets without clipped controls. |
| Offline essentials | Prior browser reload succeeded with only its local origin server stopped, including Tamil Water exact preview. | Named-phone airplane mode/reconnect and offline installed voices remain BLOCKED. Do not infer disconnected native audio from cached HTML. |
| Tamil | Text is Unicode and marked review-pending. Prior browser listed Vani ta-IN. | Independent competent Tamil review of request/negation/clarity/politeness and pronunciation remains BLOCKED. Voice enumeration is not a hearing test. |
| Camera/video | Local preview/manual frame-region flow exists; source includes bounded media and cleanup. | Named-device permission denial/allow, recording, orientation and frame selection remain BLOCKED. Never call manual selection automatic tracking. |
| Personal pictograms | Named local-image fields, explicit exact meaning and approval, page-memory retention; prior browser handoff/leave cleanup observed. | Real phone file picker and screen-reader image description remain BLOCKED. |
| Auth/history | No speech on replay is a mandatory source invariant and automated regression area. | Real signed-in search/replay/delete/preferences and session-expiration UI remain human/account gates. |

## Current automated evidence boundary

Integrating engineer reported 279 unit tests and 62 local DB groups passing this turn. These are not counts of accessibility tests. Browser E2E is currently **BLOCKED before assertions by Mach-port launch failure**, not passed or a demonstrated product regression. Older green CI and the explicitly dated Oct28 browser receipts remain reproducible historical evidence (`submission/release-acceptance.md`); no Nov3 physical-device result is invented.

## Human protocol (record PASS/FAIL/BLOCKED per step)

Record final deployed SHA/URL, device model, OS/browser/version, viewport/zoom, voice name/language and date—no account identifiers or media in screenshots. In keyboard/screen-reader mode choose Water, inspect preview, choose intent and English/Tamil without automatic speech; explicitly Speak, hear exact text, Stop mid-sentence. Change intent/language and require fresh approval. Test missing Tamil voice and speech error recovery, not an English fallback. Repeat at 200/400% zoom and reduced motion/high contrast. Use only synthetic media for permission/file/video/pictogram tests. Prepare offline, disconnect/reload, compose, reconnect and verify no queued uploads or speech. Native reviewer records wording corrections separately from device behavior.

Completion/error events are currently not fed back from native speech synthesis; the outstanding feedback gap and repaired voice-disappearance boundary are detailed in `WORLDSPEAK_SECURITY_AND_PRIVACY_REPORT.md`. Until repaired and executed on a real device, do not mark robust speech failure recovery complete.
