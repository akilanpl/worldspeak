# Public architecture reference

WorldSpeak separates perception, user intent, deterministic realization and speech authorization. A selected object never establishes a desire. The current release implements only the essential communication board and private account/persistence foundation. It contains no camera/model/job/training integration.

Next.js App Router/React/strict TypeScript serve the UI and authenticated API routes. Supabase Auth supplies email/password and prepared Google PKCE code paths. PostgreSQL uses owner-only RLS, immutable owner IDs and composite owner/parent foreign keys. Private Storage policies require the caller's UUID as the first folder segment. User-facing server clients preserve JWT/RLS; an isolated administrative client is used only for verified Auth identity removal and synthetic test setup/cleanup.

The communication engine is pure and typed. English/Tamil templates and object catalog produce an exact preview. Structured negation remains explicit, user-authored text is not rewritten, and history replay preserves exact saved text across catalog changes. Speech occurs only after a fresh user action; voice/intent/language changes, restored preferences, offline recovery and replay never automatically speak. Tamil remains review-pending; missing Tamil voices do not silently use English.

The offline board is static public content prepared once online. Auth, API and private content are not precached. Profiles/preferences, conversations/messages, favorites and consent are private. Data-reset RPCs derive their target from auth.uid() and accept no owner parameter. Password reauthentication is required before the separate administrative Auth identity deletion path. OAuth-only deletion requires an equivalent verified reauthentication/support path before it can be claimed complete.

Seven current migrations and actual generated database types are recorded in `docs/evidence/supabase-project.json`; canonical migration filenames match hosted versions. The local database shim is solely for scratch testing and must never be run on managed Supabase. Hosted evidence uses real Auth sessions, JWT-backed Data API and Storage. Administrative confirmation/recovery token fixtures prove protocol handling, not delivery through a person's inbox.

Future Phase 3 is gated by Phase 2 acceptance: durable jobs with owner/consent checks, atomic budget reservations, leases and uncertain-call handling, private transient uploads and cleanup, followed by explicitly budgeted Spark/SAM adapter verification. No inference or media capture is authorized merely by this document. See `docs/handoff/PHASE-3.md`.

The detailed local Phase 0 freeze remains in `../docs/WORLDSPEAK-PHASE-0.md`; it is retained locally rather than publishing account/budget context. This public reference records the product/security boundaries without that private planning context.
