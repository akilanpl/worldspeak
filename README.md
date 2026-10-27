# WorldSpeak — private bilingual communication with an offline guest board

WorldSpeak turns a user-selected communication intent into an exact English/Tamil preview and speaks only after an explicit action. The essential board works without sign-in and, after preparation, offline. Phase 2 adds Supabase email/Google code paths, private profiles/accessibility preferences, history, favorites, search, replay and deletion.

**Current release:** the camera/composer UI, durable Spark/SAM provider pipeline, typed JSONB persistence, bounded pixel-mask renderer and deployment checks are merged. One real Muse Spark scene generation succeeded; historical persistence failed and was subsequently repaired. Real SAM inference is still unverified. Automated model/browser demonstrations use explicitly synthetic or reconstructed data.

Migration 007 is hosted in the dedicated project; migration 008 (independent SAM-only authorization) is **local-tested and pending separate hosted approval**. Generation remains disabled. Phase 2 manual acceptance, physical devices/native Tamil, provider billing attribution, public deployment, open-weight inference/fine-tuning and final participant rules remain open. See [sprint continuation handoff](docs/handoff/SPRINT-2.md), [mask renderer](docs/pixel-mask-renderer.md), [SAM authorization](docs/sam-only-authorization-handoff.md), [deployment checks](docs/deployment-readiness.md) and [historical workflow validation](docs/ai-workflow-validation.md).

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

No public production deployment is claimed. A real Google callback/session was previously verified; remaining hosted/manual UX and email inbox delivery require acceptance. Browser speech tests use spies; they are not proof of audible output or independent language review. [Build log](docs/build-log.md), [hackathon verification](docs/rules-verification.md), [MIT license](LICENSE).

## Isolated Phase 3 inference core

Non-paid backend implementation is on `feat/meta-inference-core`: durable owner-scoped jobs, atomic micro-USD reservations, fenced dispatch/uncertain outcomes, consent-scoped transient media and durable cleanup, typed Standard Spark/SAM adapters. Hosted migration and paid inference are **not verified**. Phase 2 manual gaps remain open. See [integration handoff](docs/meta-inference-handoff.md) and [unapproved two-call smoke proposal](docs/meta-inference-smoke-test.md). Fixtures are not real inference; no speech is triggered by model output.
