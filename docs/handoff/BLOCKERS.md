# BLOCKERS — Phase 2

- **Credential-related:** The human reports Google client/provider configuration complete. The application has initiated a real Google email/profile OAuth redirect; callback/session verification is in progress and not yet claimed complete. No key belongs in chat/Git.
- **Credential-related / technical:** public registration, inbox confirmation/recovery need a controlled inbox and appropriate mail configuration. Reserved synthetic signup returned email_address_invalid; repeated suite attempts later returned over_email_send_rate_limit. No confirmation bypass or paid SMTP signup was performed. Default SMTP is restricted; see official source in setup/security docs.
- **Technical environment:** local Chromium dies at MachPortRendezvousServer bootstrap permission checks before assertions. Current remote CI outcome is tracked separately. Real signed-in browser UX still needs execution in an allowed environment.
- **Physical-device dependent:** audible English/Tamil/Stop, actual offline phone behavior, shaping/zoom/contrast; independent native Tamil reviewer. Automated rendering is not native-language approval.
- **Credential-related:** accepted participant guide/final rules not available from the public pages checked; human must verify them.
- **Technical:** Exact callback allowlist entries and Site URL were independently verified in Brave after the human completed configuration. Interactive callback completion still needs evidence. Do not claim OAuth setup complete.
- **Billing-related:** none for the created Free Supabase project ($0 creation quote). No application hosting target or SMTP/GPU purchase is approved; do not create billable resources.

Phase 3 remains gated, not an unfinished implementation task in this phase.
