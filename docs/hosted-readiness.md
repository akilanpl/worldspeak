# Hosted inference readiness — 27 October 2026

Only project **cafkyowssdemzivhzxbb** was used. No billable resources, upgrade, model request, smoke authorization, permit or spending allowance was enabled. Phase 2 manual acceptance remains incomplete.

## Migration receipt

The human approved only migration 007 from e1290de9546a0a9a7ab37ff267a37874ca31f31e after CI 40456974054 passed. The SQL SHA-256 was checked before application and is unchanged: `1e8420ca5316ea2f1df898dca447d5b8410acdc2a7b45897fe5e4c95b76e6be2`.

Supabase accepted `worldspeak_007_inference_core` as actual version **20261027060440**. The canonical local filename now uses that version to prevent replay; migrations 001–006 are unchanged. Do not apply 007 again or use the local test shim on hosted infrastructure. Actual hosted Database types replaced the forward RPC overlay; the hosted artifact snapshot records all seven source hashes and the generated types hash. `check:schema` verifies those artifacts offline, not live database drift.

## Executed hosted verification

Two disposable hosted Auth users supplied real JWTs for 13 assertions: owner media read, foreign/anonymous denial, no direct ownership mutation, no lease-token access, owner/foreign job status, raw client Storage denial, foreign deletion/revocation denial, own consent revocation and metadata cascade on Auth deletion. The job fixture was directly inserted already canceled and settled, with no submission, monetary reservation, dispatch or model call. It was removed by the account cascade. Both disposable accounts and media/job metadata are gone. Real Google identity/data were untouched.

Both exact synthetic 8×8 PNGs are unavailable through fresh cache-busted authenticated Storage requests and independent listings. The first immediate download after removal unexpectedly returned bytes, so cleanup stopped. The human explicitly approved bounded recovery of those exact fixtures only. Expired leases were reacquired normally; the already-absent first object was not deleted again, and only the remaining second object was removed. Both current lease tokens acknowledged completion. No active lease was overridden; no `storage.objects` SQL deletion occurred. Both records are `done`, attempts zero, leases cleared, and daily recheck tombstones retained. No due, pending or blocked work remains. Fresh absence is evidence for these fixtures, not a promise of instantaneous global CDN invalidation.

One metadata inspection accidentally emitted disposable fixture passwords in local tool output. Both affected accounts were deleted and their cascades verified; the credential fixture file is removed. No project key, worker password, real-user password, access token or private user content was emitted. Never print full fixture-user objects.

## Restricted worker and supervision

The explicitly authorized `worldspeak_inference_login` has LOGIN/INHERIT and only `worldspeak_inference_worker` membership. It has no superuser, database creation, role management, replication or RLS bypass; no budget/profile table access and no permission to authorize smoke. Actual connection, membership and runtime worker-capability checks passed. The password was generated on the Mac and only a locally computed SCRAM verifier was sent for role setup. No plaintext password was printed or placed in command arguments/history.

The session-pooler host/port were read from WorldSpeak's signed-in Brave Connect panel. TLS chain verification initially rejected the connection; the trusted project CA was obtained from the dashboard's official certificate link, then verification passed with `NODE_EXTRA_CA_CERTS`. Verification was never disabled. The URI is in the requested ignored owner-only `.env.worker.local`, mode 600. Keep all protected environment/CA files outside Git.

`apps/worker/src/cleanup.ts` is a separate cleanup-only entry point with no provider construction or inference dispatch. `scripts/run-cleanup.mjs` accepts two owner-only local environment-file paths, strips any live marker and model key, and invokes that entry point. A manual restricted run passed idle. The human registered local LaunchAgent `com.worldspeak.cleanup` without sudo after sandbox bootstrap error 5. Independently observed seven recurring idle runs, last exit code 0 and empty error log. StartInterval **5 seconds** is intentional: at most one cleanup item per invocation, single-instance launchd service, no generation path. Deletion itself was verified through the control-plane lease protocol; these idle runs do not falsely claim the restricted worker deleted the fixtures.

This supervisor depends on the Mac being awake, logged in, online, with this release checkout, installed dependencies and protected files retained. Do not archive/move the checkout while it is registered. It is not a deployed always-on hosted worker or a production uptime/alerting guarantee. Review logs, blocked rows, expired leases and uncertain jobs operationally. A future hosted target requires separate resource/cost review.

## Security advisor disposition

No security ERROR. Five RLS-without-policy INFO notices correspond to private deny-all tables with no client grants; six authenticated-definer WARNs are reviewed narrow owner-derived functions with fixed search paths. Leaked-password protection is disabled and requires Pro or above; no upgrade is authorized. Seven unused-index performance INFOs are retained for expected workloads on the new/low-traffic database. See exact notices and remediation links in `evidence/hosted-inference.json`.

[Private-table policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [definer RPC notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection plan limitation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Generation remains separately gated

Hosted limits, reservations and spend sum to **zero**; permits and smoke authorization records are **zero**. No call to `authorize_first_smoke` was made on hosted infrastructure. The first-smoke tombstone and exact designated-owner/operation accounting are tested only in isolated synthetic local databases. Free credits are not authorization to send media or run generation. Follow `meta-inference-smoke-test.md` only after separate approval of the exact sanitized still, provider/promotional data-use terms and maximum combined $0.05. Current provider entitlement and genuine Spark/SAM inference remain unverified.

Existing inbox delivery, remaining hosted manual UX, OAuth-only reauthenticated deletion, native Tamil/device/audible speech/offline and participant-rule gaps stay open in `handoff/BLOCKERS.md`.
