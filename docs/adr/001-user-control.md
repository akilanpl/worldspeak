# ADR 001 — User control: no speech without a fresh explicit gesture

Status: accepted (Phase 1 implements it).

## Context

Incorrect or unsolicited speech is the critical harm in an assistive
communication tool: the device must never say something the user did not
approve, in a language or polarity they did not choose.

## Decision

- The single speech gateway (`apps/web/src/lib/speech.ts`) exposes exactly
  one speaking entry point, `speakApproved`, which must be called
  synchronously inside the Speak button's trusted click handler.
- Speech is authorized by an in-memory permit bound to the exact
  (compositionId, revision, textHash). Any edit to locale, object, intent,
  text, template, or voice invalidates it.
- `speakApproved` cancels any queued speech first, refuses stale or
  duplicate gestures, and refuses to substitute a voice across languages.
- Tile clicks, locale/intent edits, restores, voice enumeration, and
  online/offline transitions only mutate state; they cannot invoke speech.
- Hidden tab, route exit, and Stop always cancel synthesis. Replay is a new
  preview plus a new Speak gesture.

## Consequences

Automated tests assert zero `speak` calls on every non-gesture path and
exactly one exact-text call per gesture. Audible behavior still needs a
human device check (see BLOCKERS.md).
