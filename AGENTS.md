# AGENTS.md — WorldSpeak (Phase 1 slice)

Read this file, `docs/handoff/STATE.md`, `NEXT.md`, `BLOCKERS.md`, and the
architecture freeze before editing. Inspect `git status` before edits.

## Scope (Phase 1 only)

- Local, offline, accessible communication slice: essential tile → explicit
  intent/language → exact-text preview → fresh Speak action → Stop, plus a
  static offline board. No Supabase, model, media-capture, deployment, or
  training work in this slice.
- Edit only this `worldspeak/` root. Do not modify siblings or global CLI
  configuration. Never use `outputs/` as the repository.

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
