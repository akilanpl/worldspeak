# BLOCKERS — Phase 2

Missing human inputs (not test failures):

1. Native Tamil review of all catalog wording (`review-pending` — including
   the two Phase 2 corrections); fixtures are not release-quality translations.
2. Dedicated WorldSpeak Supabase project ref + OAuth configuration
   (checklist: `docs/supabase-setup.md`). No remote step may run without it.
3. Authenticated live verification (sign-up, Google OAuth, save/favorites/
   search/delete/replay against real GoTrue + hosted DB) — implemented but
   **not run**; no fakes stand in for it.
4. Audible English/Tamil speech + Stop on named desktop/phone, and
   text-resizing/Tamil-shaping/airplane-mode device confirmation — **not run**.
5. Final hackathon rules/repository/video check against participant rules.
6. Phase 3 approval.

No technical blocker in the local scope. Local Postgres runs in this sandbox
only via an escalated shell (shared-memory restriction) and a cloned system
template cluster when `initdb` cannot resolve the user; CI uses a postgres:15
service instead.
