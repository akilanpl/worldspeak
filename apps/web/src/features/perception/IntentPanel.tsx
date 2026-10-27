"use client";

import { useMemo, useState } from "react";
import type { Intent, Locale } from "@worldspeak/contracts";
import { renderComposition } from "@worldspeak/communication";
import { CATALOG_VERSION } from "@worldspeak/catalog";
import { pstr } from "./strings";
import type { PerceivedObject } from "./types";

export interface ApprovedSnapshot {
  intent: Intent;
  locale: Locale;
}

export interface IntentPanelProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  object: PerceivedObject;
  onBack: () => void;
  /**
   * Handoff for integration: the approved intent + locale, ready to become a
   * Phase 1 Composition (reducer `select-tile`/`set-user-text`) whose preview
   * the existing speech gateway speaks only on a fresh Speak gesture.
   * This panel never speaks.
   */
  onApprove: (snapshot: ApprovedSnapshot) => void;
}

type ObjectAction = "want" | "do-not-want" | "where" | "help";
type SocialAct = "yes" | "no" | "thank-you" | "please-wait";

/**
 * Explicit intent interface over a confirmed object. Mirrors the Phase 1
 * action palette and exact-text preview; unknown names stay user-confirmed
 * text and are never auto-translated.
 */
export default function IntentPanel({ locale, onLocaleChange, object, onBack, onApprove }: IntentPanelProps) {
  const hasCatalog = object.catalogId !== null;
  const [objectAction, setObjectAction] = useState<ObjectAction>("want");
  const [socialAct, setSocialAct] = useState<SocialAct | null>(null);
  const [ownText, setOwnText] = useState(object.labelEn);
  const [ownTouched, setOwnTouched] = useState(!hasCatalog);

  const intent: Intent = useMemo(() => {
    if (socialAct !== null) return { kind: "social", act: socialAct };
    if (!hasCatalog || ownTouched) {
      return { kind: "user-text", text: ownText.trim() === "" ? object.labelEn : ownText, locale };
    }
    const ref = { catalogId: object.catalogId ?? "", selectedObjectId: null };
    switch (objectAction) {
      case "want":
      case "do-not-want":
        return { kind: "request-object", object: ref, polarity: objectAction };
      case "where":
        return { kind: "ask-location", object: ref };
      case "help":
        return { kind: "request-help", object: ref };
    }
  }, [socialAct, hasCatalog, ownTouched, ownText, object, objectAction, locale]);

  const preview = useMemo(() => {
    try {
      return { ok: true as const, text: renderComposition({ intent, locale }).text };
    } catch {
      return { ok: false as const };
    }
  }, [intent, locale]);

  const chips: string[] = [intent.kind];
  if (intent.kind === "request-object") chips.push(intent.polarity);
  if (intent.kind === "social") chips.push(intent.act);
  if (intent.kind === "request-object" || intent.kind === "ask-location") chips.push(intent.object.catalogId);
  if (intent.kind === "request-help" && intent.object) chips.push(intent.object.catalogId);

  return (
    <section className="panel" aria-labelledby="intent-h">
      <h2 id="intent-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>{pstr("perceptionTitle", locale)}</h2>
      <p className="status" role="status">
        {pstr("selectedObject", locale)}: {locale === "ta" && object.labelTa ? object.labelTa : object.labelEn}
      </p>

      {hasCatalog && !ownTouched && (
        <div className="btn-row" role="group" aria-label={pstr("continueAction", locale)}>
          {(
            [
              ["want", pstr("iWant", locale)],
              ["do-not-want", pstr("iDoNotWant", locale)],
              ["where", pstr("whereIs", locale)],
              ["help", pstr("helpWith", locale)],
            ] as [ObjectAction, string][]
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              className="btn btn-secondary"
              aria-pressed={socialAct === null && objectAction === action}
              onClick={() => {
                setSocialAct(null);
                setObjectAction(action);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="btn-row" role="group" aria-label="social">
        {(
          [
            ["yes", "Yes"],
            ["no", "No"],
            ["thank-you", "Thank you"],
            ["please-wait", "Please wait"],
          ] as [SocialAct, string][]
        ).map(([act, label]) => (
          <button
            key={act}
            type="button"
            className="btn btn-secondary"
            aria-pressed={socialAct === act}
            onClick={() => setSocialAct(socialAct === act ? null : act)}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="field" htmlFor="intent-own">
          {pstr("useOwnWords", locale)}
        </label>
        <textarea
          id="intent-own"
          className="field"
          rows={2}
          maxLength={280}
          value={ownText}
          onChange={(e) => {
            setOwnText(e.target.value);
            setOwnTouched(true);
            setSocialAct(null);
          }}
        />
        {hasCatalog && ownTouched && (
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOwnTouched(false);
                setOwnText(object.labelEn);
              }}
            >
              {pstr("back", locale)}
            </button>
          </div>
        )}
      </div>

      <div className="btn-row" role="group" aria-label={pstr("sentenceLabel", locale)}>
        {(["en", "ta"] as Locale[]).map((loc) => (
          <button
            key={loc}
            type="button"
            className="btn btn-secondary"
            aria-pressed={locale === loc}
            onClick={() => onLocaleChange(loc)}
          >
            {loc === "en" ? "English" : "தமிழ்"}
          </button>
        ))}
      </div>

      <div className="preview" aria-live="polite">
        <p className="status">{pstr("sentenceLabel", locale)}</p>
        {preview.ok ? (
          <p className="preview-sentence" lang={locale}>
            {preview.text}
          </p>
        ) : (
          <p className="notice">{pstr("noObjects", locale)}</p>
        )}
        <ul className="chips" aria-label="selected meaning">
          {chips.map((c) => (
            <li key={c}>{c}</li>
          ))}
          <li>{CATALOG_VERSION}</li>
        </ul>
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {pstr("back", locale)}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!preview.ok}
          onClick={() => {
            // Fresh approval snapshot for the Phase 1 composer; the gateway
            // speaks only inside a later, separate Speak gesture.
            onApprove({ intent, locale });
          }}
        >
          {pstr("approveForComposer", locale)}
        </button>
      </div>
    </section>
  );
}
