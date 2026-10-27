# Supabase cloud provisioning checklist (human step — Phase 2 gate)

The implementation task stops before this. Do NOT create or modify cloud
resources from the coding agent; the human performs each step below in the
Supabase dashboard against a NEW, isolated WorldSpeak project.

## 1. Create the project

- New project in the selected region; record the project ref. Never reuse an
  unrelated project (no unrelated-resource mutation).
- Note the anon key and (separately, server-only) service-role key. Keys live
  in local `.env.local` / hosting secrets — never in git.

## 2. Apply migrations

- From an empty database, apply in order:
  `202610270001_core.sql`, `202610270002_ownership_rls.sql`,
  `202610270003_storage.sql`, `202610270004_search.sql`.
- Regenerate TypeScript types (`supabase gen types`) and replace
  `packages/db/src/types.ts`; fail CI on drift afterwards.

## 3. Auth configuration

- Email: enable email provider, require confirmation; set Site URL and add
  redirect allowlist entries for `/auth/callback` on every environment URL.
- Google: create the OAuth client (Google console), enable the provider with
  PKCE, add the same callback allowlist. Validate `next` stays local (the
  callback already rejects non-local paths).
- Password recovery uses the dedicated `/reset-password` return route.

## 4. Verify

- Sign up → confirm → sign in works; Google sign-in works.
- Run `pnpm test:db` against the new project (scratch data only): all PASS.
- Confirm two-user isolation in the dashboard (user B sees none of user A's rows).
- Record opening/closing Model/API balances if any paid step ran (none expected).

## 5. Hand back to implementation

- Supply `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_APP_URL`; service-role key only if account-deletion via Auth
  admin is approved. Then authorize the authenticated-path verification task.
