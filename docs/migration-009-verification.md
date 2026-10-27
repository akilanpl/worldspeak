# Migration 009 — retained legacy RPC grant

27 October 2026 (IST). Hosted project cafkyowssdemzivhzxbb was inspected read-only. Migration 008 is recorded there as version 20261027121700. Its exact source checksum remains a1246064dca1907225f2df17f98f748652966dd15b66a7a02cceb615d408d271; no 008 SQL or historical record is modified by this PR.

## Patch and privilege audit

CLI 2.75.0 generated `20261027124539_worldspeak_009_legacy_rpc_privilege.sql` with `supabase migration new worldspeak_009_legacy_rpc_privilege`. Its only executable statement is:

```sql
revoke execute on function public.submit_legacy_inference_job(uuid,text,uuid,text) from service_role;
```

SHA-256: `ad428c013dfb5b9a98707637f88025da1811e2a32d69a87436bc3529532395f0`.

The hosted alias currently has ACL `{postgres=X/postgres,service_role=X/postgres}`. The supported wrapper has `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`. Anonymous/worker direct access is denied on both; authenticated direct access is denied on the alias. The four private renamed claim/dispatch/finish/sweep helpers already deny service_role, anon, authenticated and worker execution, so no additional hosted grant change is proposed.

The supported SECURITY DEFINER wrapper, its body, owner, search_path and grants are unchanged. Its function owner can invoke the implementation internally after caller access is revoked. PostgreSQL documents [combined direct/inherited/PUBLIC privileges](https://www.postgresql.org/docs/17/sql-grant.html) and [definer execution](https://www.postgresql.org/docs/17/sql-createfunction.html). Actual database-role tests verify the behavior rather than relying only on source inspection.

## Executable regression

The local Supabase shim previously omitted service_role and the public-schema default function grant, hiding this hosted behavior. It now models that specific grant before migration replay; private world_inference functions do not receive it. This changes only the destructive disposable test harness, never hosted configuration.

`apps/worker/tests/legacy-privileges.ts` uses the real Postgres.js driver, rejects remote hosts/URLs, forbids HTTP and runs six groups:

1. Actual direct calls and effective EXECUTE checks deny service_role, an inheriting NOLOGIN role, anon, authenticated and worker. PUBLIC has no EXECUTE entry.
2. In a rollback-only local transaction, reconstruct the independently observed pre-009 grant: service and inheriting roles can reach the old body (UNAUTHENTICATED, not permission denied). Apply the exact 009 SQL and prove both now receive SQLSTATE 42501. Repeating the REVOKE does not rearm or mutate anything.
3. Supported wrapper access remains authenticated/service/inheriting-service only. Missing identity raises UNAUTHENTICATED; missing consent raises CONSENT_REQUIRED inside the legacy implementation, proving the owner-context internal call still works.
4. Audit and execute denied calls to all four other renamed helpers for service/inheriting-service/client/worker roles.
5. Owner-scoped media/status reads work; foreign media is invisible. A ready local asset cannot increase zero budget headroom through any supported caller.
6. An explicitly synthetic, rollback-only SAM ticket fixture makes the wrapper enforce owner/operation/concept/media scope; direct legacy access cannot bypass it. No operator issuance function or funded budget is introduced by the new tests.

Before/after snapshots preserve all protected rows (budgets, permits, first tombstone, receipts, cleanup, SAM authorization/events, jobs/media), RLS policies, table ownership/grants, function bodies and all non-target function grants. New synthetic fixture records roll back. The inherited test role is dropped. The suite runs before the existing SAM suite because that suite deliberately commits a disposable concurrency fixture.

## Verification evidence

Local commands on the PR head:

- Frozen pnpm 10.18.0 install: exit 0.
- Full database replay: original RLS12 + authorization10 + inference17 + driver5 + new legacy6 + SAM12 groups pass (62 total). Only named localhost scratch database worldspeak_phase2_migration009 was used.
- Application unit suite: 279 tests / 46 files pass.
- Typecheck, lint and production build: results recorded in the PR/CI. Lint retains three pre-existing image warnings.
- Schema artifact guard protects the unchanged 008 hash and the new pending 009 hash. The inventory note records the already-hosted 008 version; local filename/type reconciliation remains a separate task. Do not reapply 008 or run an indiscriminate hosted db push.
- Required application/evaluation CI and secret scan must pass before hosted approval. Browser tests use fixtures/synthetic camera/speech stubs and are not physical-device acceptance.

The first local run found a test-order dependency, not a production regression; the new suite was moved before the SAM concurrency suite. No existing assertion was weakened.

## Approval boundary

009 is **unapplied**. No hosted write, ticket issuance, live worker, model/preflight request, upload or spending-limit change occurred in this task. No historical receipt/permit or cleanup behavior is changed by the one-statement migration.

After the focused PR is reviewed and green, request: “May I apply only migration 009 with SHA-256 ad428c013dfb5b9a98707637f88025da1811e2a32d69a87436bc3529532395f0 to cafkyowssdemzivhzxbb through migration history, then perform read-only hosted ACL/RLS/accounting/admission verification? No tickets, funding, media, worker activation or Meta calls.” Stop on any unexpected schema/privilege/accounting change. This approval is separate from any later live SAM authorization.
