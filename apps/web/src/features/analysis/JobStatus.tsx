"use client";

import type { Locale } from "@worldspeak/contracts";
import type { AnalysisOutcome } from "./useAnalysisJob";

/**
 * Honest job-state display. Queued/leased/dispatching read as one
 * "processing" state; every terminal state names itself. Uncertain and
 * failed states never offer an automatic retry — only an explicit start
 * over, which requires fresh consent and a fresh idempotency key.
 */
export default function JobStatus({
  locale,
  outcome,
  onCancel,
  onStartOver,
}: {
  locale: Locale;
  outcome: AnalysisOutcome;
  onCancel: () => void;
  onStartOver: () => void;
}) {
  const ta = locale === "ta";
  const t = (en: string, tamil: string) => (ta ? tamil : en);
  if (outcome.name === "idle") return null;
  if (outcome.name === "uploading") {
    return (
      <p className="status" role="status">
        {t("Uploading your photo…", "புகைப்படம் பதிவேறுகிறது…")}
      </p>
    );
  }
  if (outcome.name === "queued" || outcome.name === "processing") {
    return (
      <div className="panel" role="status" aria-live="polite">
        <p className="status">
          {outcome.name === "queued"
            ? t("Queued for analysis…", "பகுப்பாய்வு வரிசையில்…")
            : t("Model is analyzing…", "மாதிரி பகுப்பாய்கிறது…")}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t("Cancel analysis", "பகுப்பாய்வை நிறுத்து")}
          </button>
        </div>
      </div>
    );
  }
  if (outcome.name === "succeeded") {
    return (
      <p className="status" role="status">
        {t(
          `Model found ${outcome.objects.length} object${outcome.objects.length === 1 ? "" : "s"} (${outcome.model}). Select one below — fixtures are never mixed in.`,
          `மாதிரி ${outcome.objects.length} பொருட்களைக் கண்டது (${outcome.model}). கீழே தேர்ந்தெடுக்கவும்.`,
        )}{" "}
        {outcome.rejected > 0 &&
          t(
            `${outcome.rejected} result${outcome.rejected === 1 ? " was" : "s were"} discarded as invalid geometry.`,
            `${outcome.rejected} முடிவுகள் தவறான வடிவியல் என நிராகரிக்கப்பட்டன.`,
          )}
      </p>
    );
  }
  if (outcome.name === "canceled") {
    return (
      <div className="panel" role="status">
        <p className="status">
          {t("Analysis canceled. The upload was revoked.", "பகுப்பாய்வு நிறுத்தப்பட்டது. பதிவேற்றம் நீக்கப்பட்டது.")}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onStartOver}>
            {t("Start over", "மீண்டும் தொடங்கு")}
          </button>
        </div>
      </div>
    );
  }
  if (outcome.name === "uncertain") {
    return (
      <div className="panel" role="alert">
        <p className="status">
          {t("Uncertain outcome: ", "நிச்சயமற்ற முடிவு: ") + outcome.detail}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onStartOver}>
            {t("Start over", "மீண்டும் தொடங்கு")}
          </button>
        </div>
      </div>
    );
  }
  if (outcome.name === "unavailable") {
    return (
      <div className="panel" role="alert">
        <p className="status">{outcome.detail}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onStartOver}>
            {t("Back to photo", "புகைப்படத்திற்குத் திரும்பு")}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="panel" role="alert">
      <p className="status">
        {t("Analysis failed", "பகுப்பாய்வு தோல்வி")} ({outcome.code}): {outcome.detail}
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onStartOver}>
          {t("Start over", "மீண்டும் தொடங்கு")}
        </button>
      </div>
    </div>
  );
}
