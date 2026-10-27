# WorldSpeak hosted setup and safe verification

Dedicated project: `cafkyowssdemzivhzxbb`, Mumbai (`ap-south-1`), Free plan. Creation was quoted at $0/month and authorized on 27 October 2026. Neither unrelated project was modified. API URL: https://cafkyowssdemzivhzxbb.supabase.co . No application deployment was provisioned.

## Schema

Seven reviewed migrations have been applied, in order. Migration 007 has explicit human approval and executed hosted evidence in `docs/evidence/hosted-inference.json`; do not reapply it. `docs/evidence/supabase-project.json` records canonical hosted versions, filenames and source hashes. Filenames were aligned with actual hosted migration versions so future CLI pushes do not replay earlier migrations. Do not relink or repair another project. Storage policies use platform-owned tables without ALTER/FORCE RLS on managed Storage objects; the local shim models the platform grants separately.

Generated types are in `packages/db/src/database.types.ts`; row aliases derive from them. `pnpm check:schema` verifies the approved SQL/type artifact snapshot offline. It is not a live schema query: regenerate with the connected Supabase type-generation capability after any real schema change and compare before updating the snapshot.

**Never run `pnpm test:db` on a hosted project.** It drops/recreates a scratch database and applies fake Auth/Storage platform tables. Its host/name guards now reject hosted hosts, connection URLs and non-scratch database names. Hosted tests use real Auth, Data API and Storage over HTTPS, never the shim.

## Local configuration

`.env.hosted.local` is ignored and owner-readable only. It contains the project URL, publishable key, local app URL, expected project ref and a server-only administrative key. Never paste keys in chat, commit the file or put an administrative key in a `NEXT_PUBLIC_` variable. Standard `pnpm build`/CI use the unconfigured guest path; `node scripts/run-hosted.mjs build` loads the protected configuration for a hosted-connected build. Then `node scripts/run-hosted.mjs start -H 127.0.0.1 -p 3101` serves it locally. Do not run two servers on that port or build while another developer is changing the application.

`node scripts/test-hosted.mjs --api` validates the isolated project and calls the local application. For an internal verification port, set `WORLDSPEAK_API_ORIGIN` while keeping the configured public application origin in request Origin headers. `--browser` additionally requires an environment that can launch Playwright; it disables trace capture and never logs credentials. Synthetic fixture accounts use `example.test` and are deleted after the run. Inspect cleanup counts in the evidence and verify zero residual objects through the project tools.

## Email and redirects

Email sign-up enabled; email confirmation remains required. Sign-in, confirmation tokens, recovery tokens, password updates, refresh and sign-out were exercised with real hosted Auth using official admin-generated disposable-user token fixtures. This does not establish public registration or inbox delivery. Public registration with reserved test addresses returned `email_address_invalid`, then `over_email_send_rate_limit`; stop retrying until a controlled inbox and SMTP/rate limits are ready. Do not turn off confirmation to make tests pass.

The local verification Site URL is `http://127.0.0.1:3101`. Callback entries prepared in Brave:

- `http://127.0.0.1:3101/auth/callback`
- `http://127.0.0.1:3101/auth/callback?next=/history`
- `http://127.0.0.1:3101/auth/callback?next=/reset-password`

The three exact saved entries and Site URL were independently verified in Brave after the human completed configuration. Use exact URLs, no wildcard. Add production URLs only after a hosting origin is selected.

## Google OAuth — configuration and verification

1. In a WorldSpeak Google Cloud project, complete the OAuth consent screen and add the chosen Google test user if the application is in Testing.
2. Create a Web application OAuth client. Authorized redirect URI: `https://cafkyowssdemzivhzxbb.supabase.co/auth/v1/callback`. Authorized local origin: `http://127.0.0.1:3101`.
3. Enter client ID and secret directly into this Supabase project's Google provider form and enable it. Keep nonce checks enabled and missing-email access disabled. No secrets in chat or Git.
4. Finish a real Google login through the application, verify PKCE callback/session, then sign out and confirm protected routes deny access. Record outcomes, never credential-bearing URLs or tokens.

Google was initially disabled; the human subsequently configured its client/provider. A fresh real application callback succeeded in Brave, independently corroborated by one hosted Google identity/session/provisioned profile and signed-in Save/Favorite/History. A foreign existing conversation returned NOT_FOUND. An earlier delayed flow expired and was not counted. See docs/evidence/google-oauth.json; remaining manual replay/search checks are open. [Supabase Google guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Erasure

Saved-data reset uses an atomic owner-derived RPC, retains a minimal default profile/preferences and explicitly retains the Auth identity. Full email-account identity removal requires a fresh password check and a server-only administrative client; the hosted API test proves wrong-password denial and successful Auth deletion/cascade. OAuth-only removal still needs a separately verified support/reauthentication path. Never delete Storage database rows to erase file bytes: use the Storage API.
