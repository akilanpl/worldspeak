# Deployment receipt — current attempt, 3 November 2026

No verified working public HTTPS URL. Main `0ab6b457bcc61d502ec0e38f714882225ba7753a` remains last green source. Existing Vercel Hobby project worldspeak-akilanpl belongs to the user; no new account/plan purchase. CLI authentication refreshed with explicit human approval.

Bounded diagnostic builds were dispatched to the existing project, with the strictgate still following diagnostic output. Final diagnostic dpl_3DRWTBWp2a52SxJ1qaVrqFoEbyGk stopped at that gate. One intermediate diagnostic-only syntax failure was corrected after local syntax/fixture checks; no diagnostic remains in source or remote buildcommand. Historical failure: platform-injected NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG. Observed schema is analytics+speedInsights objects containing six strings,277bytes total; six canonical endpoint comparisons and a relative-path safety check all failed. Rawvalues not printed. No safe exemption was established. No wildcard, suppression or security-gate weakening applied.

Current local optimized server http://127.0.0.1:3137 passes strict demo preflight and9HTTPchecks. Environment explicitly WORLDSPEAK_INFERENCE_API_ENABLED=false; live marker unset; no provider/worker/service-role credentials injected. Guest-only demo has no production Auth acceptance. No Supabase settings changed.

Recovery: approve current Vercel CLI device flow; inspect exact project-only env/config and disabled analytics state; implement only demonstrably safe bounded compatibility with regression tests; run full gate and CI, deploy exact tested artifact, verify canonical HTTPS and9production routes, then request exact Auth callback changes. Rollback must use prior known-green artifact, never SQL rollback or permit resets.

## Superseding compatibility resolution

A final redacted path diagnostic established each platform string is a relative same-origin route:16-character ASCII public routing ID, one slash and a documented fixed script/event suffix. Official SDK makeAbsolute behavior explains the earlier canonical-prefix mismatch. The reviewed preflight now accepts ONLY the exact compact six-field schema, bounded to512bytes, with strict character/length/identity/credential checks and duplicate-key rejection.59 focused tests pass;316 full tests plus typecheck/build/lint/schema pass on the integrated candidate. No live public URL is claimed before actual deployment receipt.
