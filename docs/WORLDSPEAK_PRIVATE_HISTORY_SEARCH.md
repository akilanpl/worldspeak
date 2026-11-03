# Private history search transport — 3 November 2026

The normal History panel now sends search text and opaque pagination cursor as JSON in `POST /api/v1/history/search`, never as a first-party request URL query. Recent-history GET remains text-free. Server POST uses the existing16KiB streaming body bound, exact-origin/verified-session boundary, strict100-character query schema, cursor validation, LIKE escaping and server-derived owner predicate. Response envelope, pagination and private/no-store behavior are unchanged.

GET search remains deprecated compatibility for existing clients/test tooling; callers using it still disclose their query to the first-party URL path. New clients must use POST. Historical URL logs are not removed by this patch.

Scope limitation: server-side Supabase `.ilike` remains the existing PostgREST query transport. This change prevents search text in first-party/Vercel request URLs; it does **not** claim to eliminate private text from all downstream provider logging. Fully eliminating downstream URL filters requires a separately reviewed database RPC/forward migration or equivalent transport design, not an unapproved hosted change. Request bodies must never be recorded by application telemetry.

Tests cover initial and paginated component requests (exact URL/body/method), actual same-origin/session boundary, owner-derived query, malformed/oversized bodies, owner spoofing, invalid cursors, unchanged response/cache contract and legacy GET behavior. No hosted mutation or log deletion was performed.
