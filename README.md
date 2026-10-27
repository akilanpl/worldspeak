# WorldSpeak — Phase 1: local offline communication slice

WorldSpeak is an accessible bilingual (English/Tamil) communication board:
essential tile → explicit intent/language → exact-text preview → fresh Speak
action → Stop, with a static offline board that works in airplane mode.

Phase 1 is intentionally local-only: no accounts, no cloud, no model calls,
no camera capture. See [docs/handoff/STATE.md](docs/handoff/STATE.md) for
current status and [AGENTS.md](AGENTS.md) for working rules.

## Quick start

Requires Node ≥ 20.9 and pnpm 10.18.0.

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Run the app:

```bash
pnpm dev
# open http://localhost:3000 in a browser
```

Offline board: first load the app once (this prepares the cache), then open
`http://localhost:3000/offline/index.html` with the network disabled.

## Layout

- `apps/web` — Next.js App Router UI, speech gateway, service worker.
- `packages/contracts` — runtime-validated Intent/Composition/Utterance types.
- `packages/communication` — pure deterministic renderer, reducer, speech-permit rules.
- `packages/catalog` — reviewed bilingual objects, templates, essential tiles.
- `packages/test-support` — fake speech synthesis and test factories.
- `scripts/` — offline-board generator and secret scanner.
- `docs/` — build log, sources, ADRs, handoff state, evidence manifest.

## Status and limits

- Tamil wording is `review-pending` until native-speaker review (see
  [docs/handoff/BLOCKERS.md](docs/handoff/BLOCKERS.md)).
- Speech uses the device's built-in voices; if no Tamil voice exists, the app
  shows large Tamil text and never substitutes an English voice silently.
- Later phases (accounts, cloud sync, model assistance, camera, training) have
  not started. Phase 2 begins only after human approval.
