> Current integrated status: Sharp0.35.5 in web/worker and Zod4.6.6 in all six workspace pins. The validated Zod follow-up is documented in WORLDSPEAK_ZOD_SECURITY_VALIDATION.md; zero high/critical findings remain, two moderate tooling findings remain. The staged analysis below records discovery order and is superseded where noted.

# WorldSpeak dependency triage — 3 November 2026

Evidence: `outputs/master-gates/dependency-audit.json` (operator output directory). Initial `pnpm audit --json`: four high findings and two moderate dependency paths; no critical findings. This is a real registry advisory report, not a product completeness score.

## Sharp — three high advisories

The direct web dependency was pinned to 0.34.5. Official advisories cover upstream libvips, libheif and librsvg vulnerabilities:

- [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj), fixed in sharp >=0.35.0.
- [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), fixed >=0.35.4.
- [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), fixed >=0.35.5.

The [official 0.35.5 package manifest](https://github.com/lovell/sharp/blob/v0.35.5/package.json) requires Node >=20.9.0, compatible with the release Node22 runtime. The web manifest now pins exactly 0.35.5; no semver wildcard or unrelated upgrade. This version already existed transitively under Next.js in the lockfile.

Exposure: `apps/web/src/lib/inference/image.ts` calls sharp metadata before rejecting non-JPEG/PNG/WebP decoded formats. Authenticated media input is bounded to5MB/16million pixels and output to512px/1MiB, but these bounds and the post-decode allowlist do not establish immunity to native decoder vulnerabilities. Do not dismiss advisories solely because SVG/AVIF are rejected after metadata parsing. Inference admission remains disabled; decoding exposure is a separate boundary.

Executed validation after web update: frozen installation exit0; resolved sharp0.35.5; image normalization and synthetic provider tests **20 passed in2files**. Tests cover metadata stripping, orientation/dimension bounds, PNG output, hashing, invalid/SVG rejection, oversized streaming input and provider parsing. No media was sent to a provider.

The worker also declared sharp0.34.5, even though no worker src import was found. The first post-web-upgrade audit still reported three sharp advisories due to that retained dependency. With explicit parent coordination, its pin was also upgraded to exactly0.35.5 and the frozen install/image+provider tests were rerun successfully. Final audit: **one high (Zod), two moderate (Minimatch), zero sharp advisories**. No other dependency was upgraded. Audit exit1 is expected because these three findings remain open.

## Zod — original high finding, repaired by validated follow-up

[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) identifies memory exhaustion during oversized collection validation and reports fixed version4.6.6. WorldSpeak pins3.23.8 across several packages. No blind major upgrade was performed: Zod3→4 changes API and inference behavior and requires a focused migration with contract/provider/database/browser regression evidence.

Current controls: API `readJson` streams at most16KiB before JSON parsing, inference responses use a bounded streaming reader, detection/track/mask arrays have maximums, and model outputs are untrusted. These reduce exposure but do not patch the library; `.max()` is not proof of early short-circuit validation. Repeated malicious authenticated requests remain a reliability consideration. Keep this finding OPEN until a reviewed upgrade or validated early collection-size guard is tested.

## Minimatch — two moderate tooling paths

[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) covers glob-pattern amplification; fixed >=11.0.1. Reported paths are root ESLint and eslint-plugin-import. Source inspection identifies tooling use, not a public runtime glob API; trusted repository patterns reduce practical exposure. Do not suppress the advisory or force a potentially incompatible minimatch major override. Resolve through a reviewed lint-toolchain update, preserving existing lint behavior.

No audit finding was muted. Frozen installation retained existing ignored-build-script notices and existing ESLint peer-range warnings; neither was hidden or treated as a passed security check. No deployment, model call, hosted mutation or spending change was performed by this dependency task.
