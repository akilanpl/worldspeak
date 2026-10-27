# Sources and verification dates (Phase 1)

Checked 27 October 2026 (IST); URLs are documentation, not runtime calls.

- Next.js installation and system requirements (Node ≥ 20.9, App Router,
  manual `next/react/react-dom` install): [installation](https://nextjs.org/docs/app/getting-started/installation).
- Browser speech synthesis interface and voice enumeration:
  [MDN SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).
- WCAG 2.2 targets for the accessibility gate:
  [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- Next.js PWA/offline guidance (adapted: only static board precached, never
  API/auth): [progressive web apps](https://nextjs.org/docs/app/guides/progressive-web-apps).
- Architecture freeze `docs/WORLDSPEAK-PHASE-0.md` v1.0 (27 Oct 2026) and
  `docs/MUSE-CODE-PHASE-1.md` — the technical contract and execution spec.
- Phase 1 makes no Meta Model API calls and changes no Supabase resources;
  provider/registry/pricing links from the architecture remain verification
  gates for later phases, not claims of Phase 1 operation.

Package versions pinned at scaffold (27 Oct 2026, verified against the npm
registry): Node 25.9.0 (dev machine; CI uses Node 22, both satisfy ≥ 20.9),
pnpm 10.18.0, next 16.4.3, react 19.3.1, react-dom 19.3.1, typescript 5.9.3,
zod 3.23.8, vitest 5.0.5, jsdom 30.1.3, @testing-library/react 16.3.3,
@testing-library/jest-dom 7.0.1, playwright 1.64.1, @axe-core/playwright
4.14.0, eslint 10.13.0, eslint-config-next 16.4.3, typescript-eslint 8.72.1.
