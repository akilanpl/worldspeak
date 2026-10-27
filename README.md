# WorldSpeak — private bilingual communication with an offline guest board

WorldSpeak turns a user-selected communication intent into an exact English/Tamil preview and speaks only after an explicit action. The essential board works without sign-in and, after preparation, offline. Phase 2 adds Supabase email/Google code paths, private profiles/accessibility preferences, history, favorites, search, replay and deletion.

**Phase 2 is partially verified, not fully accepted.** The real hosted backend passes 16 scenario groups; public email delivery, Google OAuth, signed-in browser UX and physical-device/native Tamil checks remain open. No camera/model/job/training feature is implemented. See [current state](docs/handoff/STATE.md), [evidence](docs/evidence/manifest.json), [security review](docs/security-review.md) and [remaining gates](docs/handoff/BLOCKERS.md).

## Local guest slice

Use the pinned package manager pnpm 10.18.0 and a compatible Node runtime (CI uses Node 22; original development machine used Node 25.9.0).

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check:secrets
pnpm check:schema
pnpm dev
```

The unconfigured app reports account features unavailable and never fakes a session. Prepare offline assets once online, then navigate to `/offline/index.html` with the network disabled. Tamil wording is `review-pending`; absent Tamil voices show text rather than silently substituting English.

## Hosted foundation

Dedicated WorldSpeak project: `cafkyowssdemzivhzxbb`, Mumbai, Free plan. No credentials are published. Follow [safe setup and testing](docs/supabase-setup.md); **never point `pnpm test:db` at a hosted database**. It is a destructive local scratch harness; hosted tests are separate. Actual generated types and migration lineage are in [project evidence](docs/evidence/supabase-project.json).

No production app deployment is claimed. Google client credentials and email delivery require external setup. Browser speech tests use spies; they are not proof of audible output or independent language review. [Build log](docs/build-log.md), [hackathon verification](docs/rules-verification.md), [MIT license](LICENSE).
