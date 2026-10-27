# Phase 2 security and compatibility review — 27 October 2026

Scope: WorldSpeak only. Baseline `aa58466` was audited and fast-forward published before fixes. All historical blobs (including lockfile/env example/scanner source) were independently scanned; the only initial content flags were the two reserved synthetic test addresses. No secret values were printed.

Corrected findings:

- Managed Storage ownership: removed ALTER/FORCE RLS and platform grant manipulation from migration 003 before its first hosted execution. Supabase owns the table; application policies enforce owner-folder access. Local shim supplies platform grants/RLS separately. Real Storage tests verify anonymous/foreign reads, foreign writes/deletes and updates fail.
- Trigger RPC exposure and extension placement: revoked direct trigger-function execution and moved pg_trgm to `extensions`; added the composite foreign-key index. Live advisors no longer report these issues.
- Account erasure: replaced the partially failing table-by-table deletion with atomic owner-derived RPC erasure. Full email-account removal requires actual password reauthentication and a server-only administrative client, then Auth deletion cascades data; wrong password preserves the identity. Data reset is explicitly distinct from identity deletion. OAuth-only identity removal remains an open reauthentication/support gate.
- Session refresh: forward refreshed cookies into the current request and the response. Protected routes use verified `getUser()`; no client-supplied session/owner authorizes a request.
- Callback redirect: exact path allowlist rejects network-path, backslash, encoded-separator and query-string tricks. PKCE remains the SSR SDK default.
- CSRF/cache/body limits: authenticated mutations require the configured application Origin and reject cross-site fetches. Private APIs/proxy responses use private/no-store. JSON bodies are streamed under a 16 KiB bound before parse; schemas reject extra owner keys. Invalid cursor timestamps are rejected before PostgREST filter construction, and recent pagination is bounded.
- Persistence: actual generated database types replace row placeholders and untyped Supabase clients; preference hydration/persistence is connected; recent pagination forwards its cursor. Atomic favorite snapshots cannot leave orphan conversations on failure. Replay uses the exact saved sentence, so a later catalog correction cannot silently rewrite history.
- Destructive local harness: reject hosted hosts, connection URLs/services and non-scratch DB names; remove system-cluster copying. Never apply the shim or local reset to the hosted project.
- Secrets: scanner now reads all indexed/historical blobs without lockfile/env/scanner content exemptions and suppresses values in diagnostics. Actual local secrets stay in ignored, chmod-600 `.env.hosted.local`; administrative keys are never a NEXT_PUBLIC variable. Public client assets are checked separately for the actual administrative key.

Advisor disposition: the intentional `public.erase_my_saved_data(boolean)` definer RPC remains an authenticated-execution warning. It accepts no user ID, fixes search_path, checks auth.uid(), only touches that owner's rows, is not executable by anon/PUBLIC, and is covered by hosted isolation tests. This privilege boundary is required to erase append-only consent/reset provisioned data atomically. It is documented rather than hidden. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Performance notices for unused indexes are informational on the new small database; keep required search/owner indexes until representative usage justifies removal. [Unused-index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Auth has native service rate limits; JSON and search bounds protect Phase 2 app inputs. No paid inference endpoint exists. An application-wide abuse/rate-limit system is a Phase 3 prerequisite before opening costly model routes, not a claim of this phase.

Limitations: public email delivery, Google OAuth, genuine elapsed-time access-token expiry, live signed-in browser UX, native Tamil review and audible/device checks are not inferred from lower-level tests. No medical advice, model integration, deployment or fine-tuning was added.
