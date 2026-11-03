# WorldSpeak feature acceptance matrix

Evidence date: **3 November 2026**. Verified main baseline `a5619178c89b0ff5b7516272ea850d291b2d4870`; [main CI 41598627645](https://github.com/akilanpl/worldspeak/actions/runs/41598627645) and [offline CI 41598627577](https://github.com/akilanpl/worldspeak/actions/runs/41598627577) passed. The deliberately preserved deployed application source is `7030dbfe365618e048f4a6a7f6b7b4b5f8e41668` ([PR 19 main CI 41592840401](https://github.com/akilanpl/worldspeak/actions/runs/41592840401)); newer main adds only the offline research scaffold. Canonical live origin: [https://worldspeak-akilanpl.vercel.app](https://worldspeak-akilanpl.vercel.app).

Portable receipts: [production/metadata/Auth configuration](evidence/production-readiness-2026-11-03.json), [hosted read-only database reconciliation](evidence/hosted-reconciliation-2026-11-03.json). Original receipt hashes are preserved; no secret values, account identities or private messages are included.

| Capability/source | Status | Executed evidence / remaining boundary |
|---|---|---|
| Deterministic bilingual board, communication engine | PASS automated + observed guest UI |321 tests/49 files; exact preview in native Brave. Native Tamil/human audio still blocked. |
| Fresh Speak/Stop, voice and callback fencing | PASS automated |Revision/hash/locale checks and stale native-event regressions. Audible interruption needs listener. |
| Production availability/public-private split | PASS observed HTTP |9/9 production routes; 200 public, 401 anonymous protected APIs. |
| Supabase database/worker | PASS local; hosted read-only |62 scratchDBgroups, hosted nine-migration/privilege/accounting receipt; no paid dispatch. |
| Production Auth configuration | PASS observed configuration |Exact Site URL/two production callbacks among 5 entries. Owner Google selection returned to Sign In; no data changed. Session/inbox acceptance failed or remains unverified; cause unproven. |
| Private history search | PASS component/API/CI |POST body keeps text out of first-party URL; owner/CSRF/16 KiB body tests. Downstream PostgREST filter logging remains a limitation. |
| Video/pictograms | PASS implementation + prior browser observation |Manual frozen-frame regions; memory-only local images. No automatic tracking or Muse Image. |
| Offline board | PASS prior browser/cache + production assets |Origin-stopped local reload succeeded; physical phone/reconnect still blocked. |
| Synthetic evaluation | PASS synthetic |8 evaluator tests; fixture metrics are not real-model accuracy. |
| Offline research scaffold | PASS non-model execution |6 Python tests; 52 catalogexamples, 30/10/12 grouped splits, three external arm evaluators. No inference/training. |
| Spark | Historical real result only |One chair generation; original persistence failed, later repaired/reconstructed tests. |
| SAM/Image/Voice/automatic model tracking | BLOCKED approval/integration |No fresh paid authorization or actual runtime acceptance. |
| Accessibility/native Tamil/physical devices | BLOCKED human/resource |Viewport emulation and automation do not establish physical acceptance. |
| Guest demo capture | PASS reviewed candidate |122.72-second silent captioned capture; [receipt](evidence/guest-demo-2026-11-03.json), [capture CI](https://github.com/akilanpl/worldspeak/actions/runs/41607185098). Not native audio/device evidence. |
| Final video/submission | BLOCKED owner approval/publication |Candidate exists; public video URL is null, final portal asset approval and submission receipt absent. |

Recorded baseline browser CI evidence: **52 passed +1 conditionally skipped** in the default run; the skipped reconstructed Spark chair runs separately under mock-enabled configuration and **1 passed** there. Do not report 53 tests passed in the default run. No real provider call occurred.
