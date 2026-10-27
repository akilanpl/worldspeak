# AGENTS.md — WorldSpeak (Phase 1 slice)

Read this file, `docs/handoff/STATE.md`, `NEXT.md`, `BLOCKERS.md`, and the
architecture freeze before editing (local ../docs/WORLDSPEAK-PHASE-0.md; public summary docs/architecture.md). Inspect `git status` before edits.

## Scope (Phase 2: local Supabase foundation + frozen Phase 1 slice)

- Phase 1 slice unchanged: essential tile → explicit intent/language →
  exact-text preview → fresh Speak action → Stop, static offline board.
  Communication engine and speech-approval invariants are frozen; Tamil data
  fixes keep `review-pending` status.
- Phase 2 adds: local SQL migrations + RLS, email/Google auth code paths,
  profiles/preferences, saved history/favorites/search/delete, guest access
  without sign-in. Cloud continuation was explicitly authorized for dedicated project
  cafkyowssdemzivhzxbb only; do not change unrelated projects. No model, media-capture, deployment, or training.
- Edit only this `worldspeak/` root. Do not modify siblings or global CLI
  configuration. Never use `outputs/` as the repository. Never touch an
  existing unrelated Supabase project.

## Invariants (must never break)

1. **No auto-speech.** Browser speech synthesis is invoked only inside the
   fresh Speak button's trusted event handler, with the current composition
   revision/hash and a selected voice. No effect, model completion, restored
   preference, tile click, language/voice change, offline/online event, or
   voice-ready event may invoke speech.
2. **Deterministic rendering.** Only reviewed catalog templates render into the
   structured communication path. Unknown catalog IDs reject; missing slots
   fail explicitly. The optional provider realization interface exists for
   later phases but no fake result may be labeled live, and provider text is
   never authoritative.
3. **Ownership is server-derived.** Clients never supply owner IDs. (Enforced
   in Phase 2 SQL; Phase 1 keeps private history out entirely.)
4. **No paid calls in CI.** Tests use fakes and fixtures only. Never consume
   provider credit by default, and never inspect credential values.

## Conventions

- Strict TypeScript, exact optional properties, no unchecked index gaps.
- Pure domain engine: `packages/communication` has no browser globals or I/O.
- Tamil wording is `review-pending` until a human/native review is recorded;
  development fixtures are not release-quality translations.
- Evidence-required reporting: every completion report lists commands with
  exit codes, what was verified vs mocked vs not run, and remaining risks.
  Never invent test results or claim unsupported functionality.

## Commands (from this root)

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check:secrets
```
