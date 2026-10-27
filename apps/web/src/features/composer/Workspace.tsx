"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Composition, Locale } from "@worldspeak/contracts";
import {
  approveUtterance,
  createEmptyComposition,
  reduce,
} from "@worldspeak/communication";
import { CATALOG_VERSION, ESSENTIAL_TILES } from "@worldspeak/catalog";
import { BrowserSpeaker, SpeechGateway, pickVoice, type VoiceInfo } from "@/lib/speech";
import { uiString, type UiLang } from "@/lib/ui-strings";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export interface Prefs {
  textScale: "default" | "large" | "xlarge";
  highContrast: boolean;
  reduceMotion: boolean;
  speechRate: number;
  voiceName: string | null;
  uiLang: UiLang;
}

const DEFAULT_PREFS: Prefs = {
  textScale: "default",
  highContrast: false,
  reduceMotion: false,
  speechRate: 1,
  voiceName: null,
  uiLang: "en",
};

const PREFS_KEY = "worldspeak-prefs-v1";
const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...parsed, voiceName: parsed.voiceName ?? null };
  } catch {
    return DEFAULT_PREFS;
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `00000000-0000-4000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`;
}

export interface WorkspaceProps {
  /** Test seam: inject a gateway backed by a fake synthesizer. */
  gatewayFactory?: (listVoices: () => VoiceInfo[]) => SpeechGateway;
  /** Replay entry: an approved composition to start from (never auto-spoken). */
  initial?: Composition | undefined;
}

/**
 * Essentials → composer → preview → Speak/Stop.
 * No prop, effect, timer, or background event invokes speech — only the
 * Speak button's click handler calls `gateway.speakApproved`.
 */
export default function Workspace({ gatewayFactory, initial }: WorkspaceProps) {
  const [comp, setComp] = useState<Composition>(() => initial ?? createEmptyComposition(PLACEHOLDER_ID));
  const [account, setAccount] = useState<"unknown" | "guest" | "ready">("unknown");
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const gatewayRef = useRef<SpeechGateway | null>(null);
  const listVoicesRef = useRef<() => VoiceInfo[]>(() => []);

  const t = useCallback((key: Parameters<typeof uiString>[0]) => uiString(key, prefs.uiLang), [prefs.uiLang]);

  // Client-only setup: preferences, voices, gateway. Never speaks here.
  // State starts at defaults (matching SSR) and syncs once after hydration;
  // this avoids a hydration mismatch when stored preferences differ.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration sync, then event-driven
    setPrefs(loadPrefs());
    const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    const refresh = () => setVoices(synth ? BrowserSpeaker.voicesOf(synth) : []);
    refresh();
    synth?.addEventListener("voiceschanged", refresh);
    const listVoices = () => listVoicesRef.current();
    if (isSupabaseConfigured()) {
      createClient()
        .auth.getSession()
        .then(({ data }) => setAccount(data.session ? "ready" : "guest"))
        .catch(() => setAccount("guest"));
    } else {
      setAccount("guest");
    }
    gatewayRef.current = gatewayFactory
      ? gatewayFactory(listVoices)
      : new SpeechGateway(
          synth ? new BrowserSpeaker(synth) : { speakText: () => {}, cancel: () => {} },
          listVoices,
        );
    const onHidden = () => {
      if (document.visibilityState === "hidden") gatewayRef.current?.stop();
    };
    document.addEventListener("visibilitychange", onHidden);
    setHydrated(true);
    return () => {
      synth?.removeEventListener("voiceschanged", refresh);
      document.removeEventListener("visibilitychange", onHidden);
      gatewayRef.current?.stop();
      gatewayRef.current = null;
    };
  }, [gatewayFactory]);

  // Keep the gateway's voice list current without reading refs during render.
  useEffect(() => {
    listVoicesRef.current = () => voices;
  });

  // Persist identity-free display/voice preferences locally. Never speaks.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable — preferences simply do not persist */
    }
    const root = document.documentElement;
    root.dataset.scale = prefs.textScale;
    root.dataset.contrast = prefs.highContrast ? "high" : "default";
    root.dataset.motion = prefs.reduceMotion ? "reduce" : "default";
  }, [prefs, hydrated]);

  const preview = useMemo(() => {
    try {
      return { ok: true as const, utterance: approveUtterance(comp) };
    } catch {
      return { ok: false as const };
    }
  }, [comp]);

  const update = useCallback(
    (fn: (c: Composition) => Composition, tileId: string | null) => {
      setComp(fn);
      setSelectedTile(tileId);
      setNotice(null);
    },
    [],
  );

  const onSpeak = useCallback(() => {
    const gateway = gatewayRef.current;
    if (!gateway) return;
    if (!preview.ok) {
      setNotice(t("stalePreview"));
      return;
    }
    const result = gateway.speakApproved({
      utterance: preview.utterance,
      current: comp,
      voiceName: prefs.voiceName,
      rate: prefs.speechRate,
      gestureNonce: newId(),
      nowMs: Date.now(),
    });
    if (result.status === "spoken") setNotice(t("spoken"));
    else if (result.status === "stale" || result.status === "duplicate") setNotice(t("stalePreview"));
    else setNotice(result.reason);
  }, [comp, prefs.voiceName, prefs.speechRate, preview, t]);

  const onStop = useCallback(() => {
    gatewayRef.current?.stop();
    setNotice(t("stopped"));
  }, [t]);

  const onTestVoice = useCallback(() => {
    const gateway = gatewayRef.current;
    if (!gateway) return;
    const voice = prefs.voiceName
      ? voices.find((v) => v.name === prefs.voiceName) ?? pickVoice(voices, comp.locale)
      : pickVoice(voices, comp.locale);
    if (!voice) {
      setNotice("No voice available for this language on this device. Set up a voice first.");
      return;
    }
    const sample = comp.locale === "ta" ? "எனக்கு தண்ணீர் வேண்டும்." : "I want water.";
    gateway.testVoice(voice.name, sample, voice.lang, prefs.speechRate);
  }, [comp.locale, prefs.speechRate, prefs.voiceName, voices]);

  const matchedVoice = prefs.voiceName ? voices.find((v) => v.name === prefs.voiceName) ?? null : pickVoice(voices, comp.locale);

  /** Explicit saves only: speaking never depends on these, and they never auto-run. */
  const onSave = useCallback(
    async (kind: "history" | "favorite") => {
      if (!preview.ok) {
        setNotice(t("stalePreview"));
        return;
      }
      const snapshot = {
        kind: "communication" as const,
        text: preview.utterance.exactText,
        locale: preview.utterance.locale,
        intent: comp.intent,
        origin: (preview.utterance.source === "template" ? "template" : "user_text") as "template" | "user_text",
        revision: preview.utterance.revision,
        text_hash: preview.utterance.textHash,
        template_version: preview.utterance.templateVersion,
        client_event_id: newId(),
      };
      try {
        if (kind === "favorite") {
          const res = await fetch("/api/v1/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              snapshot,
              conversation_title: snapshot.text.slice(0, 60),
              language: snapshot.locale,
            }),
          });
          setNotice(res.ok ? "Saved to favorites." : "Favorite failed.");
          return;
        }
        const conv = await fetch("/api/v1/conversations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: snapshot.text.slice(0, 60), language: snapshot.locale }),
        });
        if (!conv.ok) {
          setNotice("Save failed.");
          return;
        }
        const convBody = (await conv.json()) as { data: { id: string } };
        const msg = await fetch(`/api/v1/conversations/${convBody.data.id}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        setNotice(msg.ok ? "Saved to history." : "Save failed.");
      } catch {
        setNotice("Save failed (offline or not signed in).");
      }
    },
    [comp.intent, preview, t],
  );

  return (
    <div className="workspace">
      <section className="panel" aria-labelledby="essentials-h">
        <h2 id="essentials-h">{t("essentials")}</h2>
        {(["needs", "help", "comfort", "social"] as const).map((cat) => (
          <div key={cat}>
            <h3 style={{ textTransform: "capitalize", margin: "0.75rem 0 0.375rem", fontSize: "1rem" }}>{cat}</h3>
            <ul className="tile-grid">
              {ESSENTIAL_TILES.filter((tile) => tile.category === cat).map((tile) => (
                <li key={tile.id}>
                  <button
                    type="button"
                    className="tile"
                    aria-pressed={selectedTile === tile.id}
                    onClick={() =>
                      update(
                        (c) => reduce(c, { type: "select-tile", id: tile.id, intent: tile.intent }, newId),
                        tile.id,
                      )
                    }
                  >
                    {prefs.uiLang === "ta" ? tile.label.ta : tile.label.en}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="panel composer" aria-labelledby="composer-h">
        <h2 id="composer-h">{t("composer")}</h2>
        {comp.intent.kind === "request-object" && (
          <div role="group" aria-label={t("action")}>
            <span className="status">{t("action")}: </span>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                aria-pressed={comp.intent.polarity === "want"}
                onClick={() => update((c) => reduce(c, { type: "set-polarity", polarity: "want" }, newId), null)}
              >
                {t("want")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                aria-pressed={comp.intent.polarity === "do-not-want"}
                onClick={() => update((c) => reduce(c, { type: "set-polarity", polarity: "do-not-want" }, newId), null)}
              >
                {t("doNotWant")}
              </button>
            </div>
          </div>
        )}
        <div className="btn-row" role="group" aria-label={t("language")}>
          {(["en", "ta"] as Locale[]).map((loc) => (
            <button
              key={loc}
              type="button"
              className="btn btn-secondary"
              aria-pressed={comp.locale === loc}
              onClick={() => update((c) => reduce(c, { type: "set-locale", locale: loc }, newId), null)}
            >
              {loc === "en" ? "English" : "தமிழ்"}
            </button>
          ))}
        </div>
        <div>
          <label className="field" htmlFor="own-sentence">{t("typeSentence")}</label>
          <textarea
            id="own-sentence"
            className="field"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={2}
            maxLength={280}
          />
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={typed.trim().length === 0}
              onClick={() =>
                update((c) => reduce(c, { type: "set-user-text", text: typed.trim(), locale: c.locale }, newId), null)
              }
            >
              {t("useSentence")}
            </button>
          </div>
        </div>
        <div className="preview" aria-live="polite">
          <p className="status">{t("previewLabel")}</p>
          {preview.ok ? (
            <>
              <p className="preview-sentence" lang={preview.utterance.locale}>{preview.utterance.exactText}</p>
              <p className="preview-meta">
                {comp.intent.kind} · {comp.locale} · rev {preview.utterance.revision} · {CATALOG_VERSION}
              </p>
              <ul className="chips" aria-label="selected meaning">
                <li>{comp.intent.kind}</li>
                {comp.intent.kind === "request-object" && <li>{comp.intent.polarity}</li>}
                {comp.intent.kind === "social" && <li>{comp.intent.act}</li>}
                {(comp.intent.kind === "request-object" || comp.intent.kind === "ask-location") && (
                  <li>{comp.intent.object.catalogId}</li>
                )}
              </ul>
            </>
          ) : (
            <p className="notice">{t("stalePreview")}</p>
          )}
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={onSpeak} disabled={!preview.ok}>
            {t("speak")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onStop}>
            {t("stop")}
          </button>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!preview.ok || account !== "ready"}
            onClick={() => void onSave("history")}
          >
            Save
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!preview.ok || account !== "ready"}
            onClick={() => void onSave("favorite")}
          >
            Favorite
          </button>
        </div>
        {account === "guest" && (
          <p className="status">
            <a href="/sign-in">Sign in</a> to save history and favorites. The board works fully without it.
          </p>
        )}
        {notice && (
          <p className="notice" role="status">{notice}</p>
        )}
      </section>

      <section className="panel" aria-labelledby="settings-h">
        <h2 id="settings-h">{t("settings")}</h2>
        <div className="btn-row" role="group" aria-label={t("language")}>
          {(["en", "ta"] as UiLang[]).map((lang) => (
            <button
              key={lang}
              type="button"
              className="btn btn-secondary"
              aria-pressed={prefs.uiLang === lang}
              onClick={() => setPrefs((p) => ({ ...p, uiLang: lang }))}
            >
              {lang === "en" ? "English UI" : "தமிழ் UI"}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="voice-select">{t("voice")}</label>
        <select
          id="voice-select"
          className="field"
          value={prefs.voiceName ?? ""}
          onChange={(e) => setPrefs((p) => ({ ...p, voiceName: e.target.value === "" ? null : e.target.value }))}
        >
          <option value="">{t("autoVoice")}</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang}){v.localService ? "" : " · network"}
            </option>
          ))}
        </select>
        {matchedVoice && comp.locale === "ta" && !matchedVoice.lang.toLowerCase().startsWith("ta") && (
          <p className="notice">Tamil voice unavailable — showing large Tamil text instead. No English voice will be substituted.</p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onTestVoice}>
            {t("testVoice")}
          </button>
        </div>
        <label className="field" htmlFor="rate-select">{t("rate")}</label>
        <select
          id="rate-select"
          className="field"
          value={String(prefs.speechRate)}
          onChange={(e) => setPrefs((p) => ({ ...p, speechRate: Number(e.target.value) }))}
        >
          {[0.5, 0.75, 1, 1.25, 1.5].map((r) => (
            <option key={r} value={r}>{r}×</option>
          ))}
        </select>
        <div className="btn-row" role="group" aria-label={t("textSize")}>
          {(["default", "large", "xlarge"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-secondary"
              aria-pressed={prefs.textScale === s}
              onClick={() => setPrefs((p) => ({ ...p, textScale: s }))}
            >
              {s === "default" ? "A" : s === "large" ? "A+" : "A++"}
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            aria-pressed={prefs.highContrast}
            onClick={() => setPrefs((p) => ({ ...p, highContrast: !p.highContrast }))}
          >
            {t("contrast")}: {prefs.highContrast ? t("on") : t("off")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            aria-pressed={prefs.reduceMotion}
            onClick={() => setPrefs((p) => ({ ...p, reduceMotion: !p.reduceMotion }))}
          >
            {t("motion")}: {prefs.reduceMotion ? t("on") : t("off")}
          </button>
        </div>
        <p className="status">catalog {CATALOG_VERSION} · Tamil {`review-pending`}</p>
      </section>
    </div>
  );
}
