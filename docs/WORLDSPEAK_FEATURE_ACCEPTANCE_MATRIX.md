# WorldSpeak feature acceptance matrix

Evidence date: **3 November 2026**. Verified deployed runtime baseline `3e4f92135023dbff006b1f6d44f6cd85a4414a3c`; [main CI 41609632027](https://github.com/akilanpl/worldspeak/actions/runs/41609632027) passed. READY deployment `dpl_mXE4dDrNSERQGC6N91N9kSmLdDz4` serves the canonical [WorldSpeak URL](https://worldspeak-akilanpl.vercel.app). Later documentation-only commits do not change this runtime baseline. The reviewed guest recording retains historical application source `7030dbfe365618e048f4a6a7f6b7b4b5f8e41668` and is not relabeled as the new deployment.

Portable receipts: [final deployment/smoke](evidence/final-deployment-2026-11-03.json), [production/metadata/Auth configuration](evidence/production-readiness-2026-11-03.json), [hosted read-only database reconciliation](evidence/hosted-reconciliation-2026-11-03.json). Original receipt hashes are preserved; no secret values, account identities or private messages are included.

| Capability/source | Status | Executed evidence / remaining boundary |
|---|---|---|
| Deterministic bilingual board, communication engine | PASS automated + observed guest UI |331 tests/51 files in the Auth diagnostic candidate; earlier exact preview in native Brave. Native Tamil/human audio still blocked. |
| Fresh Speak/Stop, voice and callback fencing | PASS automated |Revision/hash/locale checks and stale native-event regressions. Audible interruption needs listener. |
| Production availability/public-private split | PASS observed HTTP |9/9 production routes; 200 public, 401 anonymous protected APIs. |
| Supabase database/worker | PASS local; hosted read-only |62 scratchDBgroups, hosted nine-migration/privilege/accounting receipt; no paid dispatch. |
| Production Auth configuration | PASS observed configuration |Exact Site URL/two production callbacks among 5 entries. Owner Google selection returned to Sign In; no data changed. Session/inbox acceptance failed or remains unverified; cause unproven. |
| Auth callback rejection diagnostics | PASS deployed anonymous probe |Missing-code307 and fixed guidance 200; no OAuth success or session acceptance implied. |
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

Verified runtime main CI evidence: **331 tests in 51 files**, **62 local database scenario groups**, and **53 browser tests passed +1 conditionally skipped** in the default run. The reconstructed Spark chair ran separately under mock-enabled configuration and **1 passed** there. These are synthetic/mock tests; no real provider call occurred.
