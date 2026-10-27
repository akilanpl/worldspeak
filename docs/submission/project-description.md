# WorldSpeak — submission-ready project description

> Status: draft for the Meta hackathon submission portal. Do not paste externally until the participant guide is checked against [limitations-and-validation.md](limitations-and-validation.md) and Sol confirms the target release branch.

## One-line pitch

WorldSpeak turns what a nonspeaking person looks at into exact words they approve — a private bilingual (English/Tamil) communication board where Meta AI sees the object, the user confirms the meaning, and speech happens only on an explicit gesture.

## Problem

Nonspeaking people and their caregivers need a fast, trustworthy way to express needs ("water", "help", "rest") across languages. Generic captioning apps guess intent, speak automatically, and send private images to opaque pipelines. A wrong guess spoken aloud in Tamil or English is worse than silence: it misrepresents the person.

## Solution

WorldSpeak combines on-device determinism with Meta inference under a strict consent protocol:

1. **See (Meta):** Muse Spark 1.3 scene understanding lists visible physical objects with normalized boxes; SAM 3.1 segments the selected object (SAM integration implemented, verification pending — see evidence matrix).
2. **Confirm (human):** the user explicitly selects the object and confirms the catalog label. A selected object never establishes a desire.
3. **Mean (deterministic):** a pure typed engine renders the exact bilingual preview from a reviewed catalog. Model text is never spoken and never rewrites user text.
4. **Speak (explicit):** speech synthesis fires only on a fresh Speak gesture. Replay, language change, and restored preferences never auto-speak.

## Who it serves

Nonspeaking users, caregivers, and bilingual (English/Tamil) households — starting with 26 essential needs/help/comfort/social tiles, with Tamil wording marked review-pending until a native reviewer approves it.

## What works today

- Offline-capable guest board: 26 bilingual tiles, exact preview, speech-gated composer.
- Private accounts: Supabase Auth (email/password plus verified Google OAuth), owner-only RLS data, private history/favorites/search/replay/deletion.
- Meta inference core (merged into main via the inference-core release, PR #6 JSONB fix, and PR #7 Spark/SAM validation): durable jobs, atomic integer-microUSD budget reservations, leases, consent-scoped transient uploads, and a server-only Spark/SAM provider adapter. One real Spark 1.3 generation succeeded historically (sanitized chair, confidence 0.99); the JSONB persistence defect that blocked its application is repaired and regression-tested.

## Built with Meta

- **Muse Spark 1.3** via the Meta Model API Responses endpoint (`https://api.meta.ai/v1`): scene understanding with strict JSON-schema structured output.
- **SAM 3.1** via the same API: still-image segmentation with one-bit mask encoding; parser and grammar verified against the official SAM docs with synthetic fixtures (no live SAM call claimed).
- **Muse Code** (agentic coding agent): used to implement the audited inference core, budget/lease machinery, and evidence discipline.

## Links for judges

- Repository: https://github.com/akilanpl/worldspeak
- Evidence matrix: `docs/submission/meta-technology-evidence.md`
- Demo script: `docs/submission/demo-script.md`
- Architecture: `docs/submission/architecture-summary.md`
- Validation boundaries: `docs/submission/limitations-and-validation.md`
