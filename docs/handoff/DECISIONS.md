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
