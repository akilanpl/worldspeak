# BLOCKERS — Phase 2

- **Technical:** real Google callback/session, Save/Favorite/History and foreign read isolation passed. Remaining manual search/replay/delete/preferences UX must be completed; intermittent Brave page inspection prevented claiming them. No key belongs in chat/Git.
- **Credential-related / technical:** public registration, inbox confirmation/recovery need a controlled inbox and appropriate mail configuration. Reserved synthetic signup returned email_address_invalid; repeated suite attempts later returned over_email_send_rate_limit. No confirmation bypass or paid SMTP signup was performed. Default SMTP is restricted; see official source in setup/security docs.
- **Technical environment:** local Chromium dies at MachPortRendezvousServer bootstrap permission checks before assertions. Current implementation GitHub CI passed all 9 browser tests. This does not replace remaining hosted manual UX checks.
- **Physical-device dependent:** audible English/Tamil/Stop, actual offline phone behavior, shaping/zoom/contrast; independent native Tamil reviewer. Automated rendering is not native-language approval.
- **Credential-related:** accepted participant guide/final rules not available from the public pages checked; human must verify them.
- **Technical:** Exact callback allowlist entries and Site URL were independently verified in Brave after the human completed configuration. Fresh callback and hosted Google session are verified in google-oauth.json.
- **Billing-related:** none for the created Free Supabase project ($0 creation quote). No application hosting target or SMTP/GPU purchase is approved; do not create billable resources.

Phase 3 remains gated, not an unfinished implementation task in this phase.

- **Technical:** OAuth-only identity deletion still requires a verified reauthentication/support path; password-account deletion is tested.

## 27 October 2026 — bounded Phase 3 authorization

The human explicitly authorized non-paid inference-core engineering on isolated `feat/meta-inference-core` despite the Phase 2 manual gaps above. This supersedes the earlier no-Phase-3 instruction only for this bounded task. Phase 2 is still not accepted. No paid call or hosted migration is authorized by this note. See `docs/meta-inference-handoff.md` and the prepared, unapproved two-call smoke protocol.

## Hosted readiness review — 27 October 2026

Dedicated project identity and six applied migration versions reconfirmed read-only. Migration 007 remains unapplied pending explicit human approval. Security advisors still flag the intentional owner-derived saved-data definer RPC and now also report leaked-password protection disabled. Review plan availability before changing that Auth setting; do not upgrade or buy a plan implicitly. Worker credentials, cleanup supervision and actual new-bucket byte deletion remain unverified. No Meta generation was performed.

Leaked-password protection requires Supabase Pro or above per [official password security documentation](https://supabase.com/docs/guides/auth/password-security). No upgrade is approved; this Free-plan limitation is recorded rather than silently purchasing a plan.
