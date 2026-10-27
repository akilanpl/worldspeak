# NEXT — single next task

**Phase 2: local Supabase ownership/auth/history slice**, beginning with
local SQL migrations and two-user RLS tests — only after human approval of
this Phase 1 handoff.

Prerequisites: Phase 1 acceptance recorded in `docs/evidence/manifest.json`;
a human-designated isolated WorldSpeak Supabase project ref for any remote
step (remote OAuth/project setup is a separately coordinated human step and
must not run inside the implementation task).

Acceptance criteria: local migrations apply from empty state; anonymous
denied; user A cannot read/create/update/delete/link user B's rows or
storage; spoofed owner IDs rejected; history/favorites/search/replay/delete
have isolated two-user coverage; no model calls required.
