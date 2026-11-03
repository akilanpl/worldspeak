# Zod security upgrade validation — 3 November 2026

Six explicit workspace pins move from3.23.8 to exact4.6.6, closing [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). The [official migration guide](https://zod.dev/v4/changelog) was reviewed. Existing strict schemas, normalized geometry, ownership fields and wire response shapes require no source changes and were not weakened. All imports use the patched root API, not the legacy `zod/v3` compatibility export.

A regression exercises100,000 invalid array elements against a32-item maximum: rejection produces one size issue and invokes zero element validators. This verifies early rejection without using timing as a proxy. It is a local synthetic security test, not a provider benchmark.

Executed in isolated `fix/zod-security` checkout:

- Frozen pnpm10.18.0 install: exit0.
- Workspace typecheck: exit0.
- Original unit suite:283/283 in46files passed.
- Final suite including security regression:284/284 in47files passed, including image/provider/contract/component tests.
- Full local database suite against `worldspeak_phase2_zod`:62 scenario groups passed, including real-driver structured JSONB/owner-scoped JobViewSchema roundtrip, cancellation, lease fencing, legacy grants, SAM accounting and concurrent authorization. Scratch database dropped afterward; no hosted database touched.
- Production build, lint, schema artifact guard and diff check: exit0. Lint retains three existing image warnings.
- Registry audit:zero high/critical, two moderate tooling-only Minimatch paths remain. Audit exits1 because those advisories are not muted.

No Meta call, hosted mutation, deployment, paid resource or generation authorization occurred. Browser E2E remains an integration/main-CI gate; no fresh browser result is claimed by this isolated patch.
