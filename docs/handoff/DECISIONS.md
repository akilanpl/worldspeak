# DECISIONS — Phase 1

- Speech permit bound to (compositionId, revision, textHash); stale and
  duplicate gestures refused; no cross-language voice substitution
  (see `docs/adr/001-user-control.md`).
- Rendering only from reviewed catalog templates; negation structural;
  user text exact and untranslated
  (see `docs/adr/004-language-deterministic-rendering.md`).
- Catalog JSON under `packages/catalog/data/` (layout detail, no contract
  impact).
- Offline board embeds a generated projection of the renderer/catalog with
  parity tests, rather than importing TypeScript sources into static HTML.
- System font stack (with Tamil coverage) instead of downloaded font files:
  fully offline, no licensing download needed.
- No deviations from the no-model, no-cloud, no-auth Phase 1 limits.

# DECISIONS — Phase 2 (new)

- Tamil corrections (still `review-pending`): request-help.object template
  now dative (`X-க்கு உதவுங்கள்`); stale-preview string uses polite `-ங்கள்`.
  Engine semantics untouched; parity expectations regenerate from the catalog.
- Local migrations numbered 001–004 (core, ownership/RLS, storage, search);
  architecture jobs step deferred to Phase 3. Platform surface
  (`auth.users`, `auth.uid()`, roles, storage schema) emulated by
  `supabase/tests/setup-shim.sql`, never applied to a real project.
- `@worldspeak/db` types are hand-maintained mirrors of 001; replaced by
  `supabase gen types` at the cloud gate (CI must then fail on drift).
- Storage buckets/policies ship and are RLS-tested at SQL level; the app
  performs no uploads in Phase 2 (no media paths exist yet).
- RLS denials map to NOT_FOUND in API responses (no cross-user oracle).
- Authenticated live flows implemented but unverified; guest board and
  honest not-configured states verified by e2e instead of faked sessions.
