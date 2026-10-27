# Sprint 2 — verified continuation and approval boundaries

27 October 2026 (IST). This handoff records executable work; no completion percentages are inferred. The final release SHA/CI are supplied in the release report because a document cannot contain its own eventual merge SHA.

## Integrated engineering

| Work | Evidence | Boundary |
| --- | --- | --- |
| PR #9 pixel masks | c698e6d; CI 40494638446 | 219 unit tests at that head; exact canvas RGBA, composited screenshot transparency/pixels and fitted geometry at 1200/390px; synthetic only |
| PR #10 deployment/reflow | 2db3594; CI 40495181266 | Combined 249 units, 45 unconfigured Chromium tests plus separate mock-auth journey; actual nine-route local production HTTP smoke; no public/device acceptance |
| PR #11 independent SAM authorization | 5e00931; CI 40495837101 | Combined 249 units; local DB RLS12 + original authorization10 + inference17 + driver5 + new SAM12 groups; same 45+1 browser tests |

PRs merged normally after diff/security review and green CI. Superseded CI runs and the genuine C 200% overflow failure remain in history; the narrow grid fix was tested without clipping or weakening the assertion. A parent and a separate read-only engineering reviewer checked the new authorization capability fences. No external human security approval is implied.

## Model and schema truth

One real Standard Muse Spark generation succeeded historically on the sanitized procedural chair; persistence failed then. PR #6 repaired Postgres.js JSONB double encoding. Subsequent driver/owner-RPC and reconstructed mock-network browser tests validate the repaired pipeline; they are not a new paid-provider success. Actual SAM inference remains unverified. Rendered binary masks and receipt IDs in automation are synthetic.

Migration 007 is hosted only in cafkyowssdemzivhzxbb. Migration 008 is committed and local-tested, **unapplied and unarmed**. Do not run supabase db push or an indiscriminate migration runner. Only separately reviewed/approved exact SQL may be applied.

008: supabase/migrations/20261027110517_worldspeak_008_sam_only_authorization.sql

SHA-256: a1246064dca1907225f2df17f98f748652966dd15b66a7a02cceb615d408d271

It creates no authorization ticket. Issuance/marker enablement require a second, separate approval after hosted verification and fresh consent/price/balance/entitlement/terms checks. Proposed scope: exactly one Standard sam-3.1 still-image generation, chair, 2500 micro-USD ($0.0025), zero preflight/retries. Never invoke authorize_first_smoke, change old permits, delete tombstones/events, or reset accounting. [Exact state machine, review evidence and approval templates](../sam-only-authorization-handoff.md).

The original ignored chair fixture in the stable release-review checkout is 512×512, 25,949 bytes; SHA a27313c7b3732ec3a3dea8df1f920c9c105884068705093608676ee248e4f8cc. Parent locally confirmed the current app normalization preserves those exact bytes/hash. Rehash and visually inspect again immediately before fresh consent; no substitution or real-user photo is allowed by this engineering task.

## Roadmap status 00–06

| Stage | Executed evidence | Still required |
| --- | --- | --- |
| 00 architecture | Typed boundaries, owner-derived access, deterministic language and speech approval recorded | Final official participant-rule verification |
| 01 essential communication | Bilingual guest board, exact previews, fresh Speak/Stop gateway and static offline assets under unit/Chromium tests | Audible named-device and native Tamil acceptance |
| 02 accounts/private data | Email/Google code, real historical Google session and hosted RLS/Auth/Storage evidence; current local regression suites | Inbox confirmation/recovery delivery; remaining manual history/search/replay/delete/preferences UX; OAuth-only deletion reauthentication |
| 03 inference core | Real Spark generation, repaired JSONB pipeline, strict provider/status validation, budgets/leases/cleanup; new local-tested SAM capability | Hosted 008 apply/security/types under separate approval; one separately approved real SAM call; provider billing attribution |
| 04 multimodal UX | Camera/video fixture UI and adapter/track validation; new pixel-mask renderer with stable identity, memory caps and mobile-width pixel tests | Genuine video model/track validation, Muse Voice Transcribe and Muse Image integration; actual camera/device acceptance |
| 05 evaluation/open weights | Reviewed incoming PR #14 supplies executable offline detection/mask/track/communication conformance metrics, bounded candidate reads and reproducible hashed reports. Its synthetic-conformance CI passed; main-integration status/CI is recorded in the release report. Our overlapping draft was not shipped. | Genuine Meta open-weight inference and reproducible fine-tuning experiment/GPU/data licensing and evaluation; none is claimed |
| 06 release/demo | Production config validator, local production HTTP smoke, public-only cache/large-text/browser regressions, rollback and device protocol; draft submission package | Public HTTPS hosting/redirect/session acceptance, actual devices/audio, final recording/submission and primary rules |

## Safe continuation

Reuse a clean isolated checkout, not Muse's active application workspace. Check status before edits. Preserve feature/preservation branches. Fetch and normally merge current main when necessary; no reset, stash, clean, rebase, force push or unrelated-project operation is needed.

```
pnpm install --frozen-lockfile
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3101 pnpm check:deployment --mode demo
pnpm lint
pnpm typecheck
pnpm test
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=<local-user> PGDATABASE=worldspeak_phase2_sprint2 pnpm test:db
pnpm check:schema
pnpm build
pnpm test:e2e
pnpm check:secrets
node scripts/check-secrets.mjs --history HEAD
```

The database harness destroys only a named disposable local database. Never supply a hosted URL/service/host. The unconfigured browser run deliberately skips the mock-auth test; run it separately with synthetic public config as documented in ai-workflow-validation.md, filtered to `--grep "reconstructed Spark chair"`. No real key belongs in that harness. Current macOS Chromium may fail before assertions at the Mach-port sandbox boundary; preserve that failure and use actual green CI, not an invented local pass. Browser speech is stubbed.

For a local production demo, validate configuration first, then start Next on an unused loopback port and run `node scripts/deployment-smoke.mjs --base-url http://127.0.0.1:<port> --mode demo`. The command is GET-only, bounded and redirect-free. Stop only the server you created. [Production environment separation, HTTPS/OAuth checks, rollback and named-device English/Tamil Speak/Stop protocol](../deployment-readiness.md).

No hosting was provisioned. Keep inference API false and live marker unset; web deployment must not inherit worker DB/Meta credentials. Service-role keys remain server-only and never NEXT_PUBLIC. Existing cleanup supervision uses the stable worldspeak-release-review checkout and depends on the Mac being awake/logged in/online. Do not move/archive/edit that active checkout during integration.

## Submission ownership and evidence

Muse owns PR #8 / docs/submission. Parent reviewed it without editing its files concurrently and posted factual corrections on GitHub. Only merge a corrected reviewed head with green CI; do not publish its current claims externally merely because tests pass. Required distinctions include previous conditional-but-undispatched SAM approval, separate next-call approval, rounded ledger versus token estimate, correct engineering attribution, synthetic SAM masks versus reconstructed Spark geometry, promotional data-use/retention limits, and Indie Developer track already chosen.

Read-only protected hosted aggregates are recorded separately in docs/evidence/sprint-2-protected-state.json. The historical 4402-micro global spend, first authorization tombstone and consumed/disabled old permits are preserved. No Meta request/preflight, hosted migration, ticket issuance, spending change, billable resource or real-user image was part of this sprint.


## Incoming roadmap PRs and local workspace exclusions

PR #12 (local personal pictograms) and PR #13 (manual video frame communication) were independently reviewed with green individual CI; they are not automatically accepted merely for that reason. Requested fixes are recorded on GitHub: source-specific Tamil pictogram provenance and visible video intent-heading focus. The initial video playback teardown concern was withdrawn after consulting HTML's document-removal pause algorithm; do not preserve it as a false release blocker. Shared handoff changes should be integrated once and both features must pass the combined suite. No model-generated pictogram or SAM tracking claim is established by these local features.

PR #14 is the existing Muse evaluation harness; reuse it instead of shipping a duplicate. After its reviewed head passes both application and synthetic-conformance CI and merges, run `node tooling/evaluation/run.mjs` and inspect its explicitly synthetic report. Reported precision/recall/IoU are conformance metrics on authored fixtures, never evidence of real Meta model accuracy or training. Use only designated sanitized local candidate inputs.

An unshipped overlapping evaluation prototype was preserved locally at 0fd82bc69ae1e415302ef6c2779b8ad70d1feb40 on feat/offline-output-evaluation, work/worldspeak-output-evaluation. It has no PR/push, is not lint-clean/release-validated and must not be merged. It is recovery material, not a missing release dependency. All release code stays on the reviewed public PRs.
