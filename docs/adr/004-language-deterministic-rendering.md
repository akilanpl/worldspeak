# ADR 004 — Deterministic bilingual rendering from reviewed templates

Status: accepted (Phase 1 implements it).

## Context

Model-proposed wording can silently flip negation, add assumptions, or
mistranslate. The structured communication path must therefore never depend
on free-form generation.

## Decision

- All structured intents render through `packages/communication` using only
  reviewed templates in `packages/catalog` (versions `templates.v1`,
  `objects.v1`, `essentials.v1`, `catalog.v1`).
- Negation is structural: `want` and `do-not-want` select different
  templates, so a polarity flip is a different validated sentence, never an
  edited string.
- Unknown catalog IDs and missing slots throw; nothing is guessed. Tamil
  inflected noun forms live in the catalog, not in concatenation rules.
- User-typed sentences bypass templates entirely: they are preserved
  exactly, tagged `user-text`, and never translated or rewritten.
- The optional provider realization interface exists for later phases but
  always rejects in Phase 1; no fake result may be labeled live, and provider
  text can never become authoritative without passing this renderer.

## Consequences

All 26 essential tiles render in both languages from the same tables. Tamil
wording is `review-pending` until native review; fixtures are not
release-quality translations. The static offline board embeds a generated
projection of the same tables, with parity tests pinning equality.
