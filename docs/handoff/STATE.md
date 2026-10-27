# STATE — Phase 2 hosted foundation

Date: 27 October 2026 (IST). Phase 2 is not fully accepted; Phase 3 has not started.

Baseline `aa58466d68c4e8ae14e20703167a110fafc9eb8f` was verified and normally fast-forward published to public `akilanpl/worldspeak`; later fixes are recorded in Git history. Dedicated Supabase `cafkyowssdemzivhzxbb`, Mumbai `ap-south-1`, Free plan, creation quote $0/month. No unrelated project was modified.

Six migrations applied; canonical names/hosted versions and checksums: `docs/evidence/supabase-project.json`. `packages/db/src/database.types.ts` is generated from this actual hosted database; aliases refine CHECK-constrained strings. Types/client operations are no longer `any`. `pnpm check:schema` is an offline approved-artifact check, not a live schema query.

Current executed checks: pnpm 10.18.0 frozen lockfile installation; lint/typecheck; 43 unit tests including a Tamil help regression; 12 local PostgreSQL scenarios from an empty scratch DB; 16 hosted Auth/Storage/Data API/Next API scenario groups; configured and unconfigured production builds. See `docs/evidence/hosted-phase2.json` for exact groups and limits. Hosted fixtures and objects were independently confirmed cleaned to zero.

Local Playwright browser launch is blocked by macOS Mach-port permissions: nine launches failed before assertions. Muse's earlier 9/9 result belongs to baseline code and is preserved separately; it is not claimed for current fixes. GitHub CI result must be recorded after publication.

Email provider and confirmation requirement inspected in Brave and hosted settings. Confirmation/recovery protocol tests use genuine hosted tokens from official administrative fixture generation. Public registration to reserved test addresses was rejected and then hit service email rate limits. Inbox delivery is not proven. Google was disabled with empty credentials; the human was given the exact client/callback setup. Site URL was set to http://127.0.0.1:3101; callback allowlist persistence still needs independent dashboard verification.

No Meta model calls, capture, worker/jobs, GPU, paid service or production application deployment. Protected local `.env.hosted.local` is ignored and mode 600; never log/copy its values. Runtime test server processes may need local-terminal cleanup if the sandbox cannot signal them; do not kill another developer's processes.
