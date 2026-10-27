"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import CapturePanel from "./CapturePanel";
import IntentPanel, { type ApprovedSnapshot } from "./IntentPanel";
import SelectionPanel from "./SelectionPanel";
import { FIXTURE_SCENES } from "./fixtures";
import { pstr } from "./strings";
import type { CapturedImage, PerceptionStep, PerceivedObject } from "./types";
import { getObject } from "@worldspeak/catalog";
import Link from "next/link";
import { handoffHref, snapshotToPayload } from "../integration/handoff";

/**
 * Camera-to-communication frontend flow (fixture-driven until the Phase 3
 * backend lands): capture → review → objects → intent → approved handoff.
 * Nothing here uploads, calls a model, or speaks.
 */
export default function PerceptionFlow() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<PerceptionStep>("capture");
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [fixtureMode, setFixtureMode] = useState(true);
  const [sceneId, setSceneId] = useState("table");
  const [objects, setObjects] = useState<PerceivedObject[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApprovedSnapshot | null>(null);
  const [approvedHref, setApprovedHref] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Move focus to the current step heading on change (keyboard users).
  // The h1 carries the marker on the capture step; each later step marks
  // its own heading. Exactly one marker is rendered at a time.
  useEffect(() => {
    const target =
      rootRef.current?.querySelector<HTMLElement>("[data-step-heading]") ?? headingRef.current;
    target?.focus({ preventScroll: true });
  }, [step, locale]);

  function startDetection() {
    setNotice(null);
    setSelectedId(null);
    if (fixtureMode) {
      const scene = FIXTURE_SCENES.find((s) => s.id === sceneId);
      setObjects(scene ? scene.objects.map((o) => ({ ...o })) : []);
    } else {
      // No segmentation backend in this slice: real photos wait for Phase 3.
      setObjects([]);
      setNotice(
        locale === "ta"
          ? "இந்தப் புகைப்படத்திற்கான கண்டறிதல் இன்னும் இல்லை. மாதிரிகளை முயற்சிக்கவும்."
          : "Detection for real photos arrives with the Phase 3 backend. Try synthetic fixtures meanwhile — nothing is uploaded.",
      );
    }
    setStep("objects");
  }

  function correctLabel(id: string, labelEn: string) {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const match = getObject(labelEn.trim().toLowerCase().replace(/\s+/g, "-"));
        return {
          ...o,
          labelEn: labelEn.trim(),
          labelTa: null,
          catalogId: match ? match.id : null,
        };
      }),
    );
  }

  const scene = FIXTURE_SCENES.find((s) => s.id === sceneId);
  const selected = objects.find((o) => o.id === selectedId) ?? null;
  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={rootRef}>
      <h1 ref={headingRef} tabIndex={-1} style={{ outline: "none" }} data-step-heading={step === "capture" ? "" : undefined}>
        {pstr("perceptionTitle", locale)}
      </h1>

      {step === "capture" && (
        <>
          <CapturePanel
            locale={locale}
            onImage={(img) => {
              setImage(img);
              if (img) setStep("review");
            }}
            fixtureMode={fixtureMode}
            onFixtureModeChange={setFixtureMode}
          />
          {fixtureMode && (
            <section className="panel" aria-labelledby="scene-h" style={{ marginTop: "1rem" }}>
              <h2 id="scene-h">{pstr("useFixtures", locale)}</h2>
              <div className="btn-row" role="group" aria-label="fixture scene">
                {FIXTURE_SCENES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="btn btn-secondary"
                    aria-pressed={sceneId === s.id}
                    onClick={() => setSceneId(s.id)}
                  >
                    {locale === "ta" ? s.titleTa : s.titleEn}
                  </button>
                ))}
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setImage(null);
                    startDetection();
                  }}
                >
                  {pstr("continueAction", locale)}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {step === "review" && image && (
        <section className="panel" aria-labelledby="review-h">
          <h2 id="review-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>{pstr("previewLabel", locale)}</h2>
          <img
            src={image.dataUrl}
            alt={pstr("previewLabel", locale)}
            width={image.width}
            height={image.height}
            style={{ width: "100%", height: "auto", borderRadius: 12 }}
          />
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setImage(null);
                setStep("capture");
              }}
            >
              {pstr("retake", locale)}
            </button>
            <button type="button" className="btn" onClick={startDetection}>
              {pstr("continueAction", locale)}
            </button>
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </section>
      )}

      {step === "objects" && (
        <SelectionPanel
          locale={locale}
          image={image}
          fixtureAspect={image ? null : scene ? { w: scene.aspectW, h: scene.aspectH } : null}
          objects={objects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCorrectLabel={correctLabel}
          onBack={() => setStep(image ? "review" : "capture")}
          onContinue={() => setStep("intent")}
        />
      )}

      {step === "intent" && selected && (
        <IntentPanel
          locale={locale}
          onLocaleChange={setLocale}
          object={selected}
          onBack={() => setStep("objects")}
          onApprove={(snapshot) => {
            if (selected) {
              const payload = snapshotToPayload(snapshot, {
                source: "perception",
                objectLabel:
                  snapshot.locale === "ta" && selected.labelTa ? selected.labelTa : selected.labelEn,
                objectCatalogId: selected.catalogId,
                provenance: selected.origin,
              });
              setApprovedHref(handoffHref(payload));
            } else {
              setApprovedHref(null);
            }
            setApproved(snapshot);
            setStep("capture");
            setImage(null);
            setObjects([]);
            setSelectedId(null);
          }}
        />
      )}

      {approved && step === "capture" && (
        <div className="notice" role="status" data-testid="approve-notice">
          <p>
            {locale === "ta" ? "அமைப்புக்கு அனுப்பத் தயார். இங்கு பேச்சு இல்லை." : "Approved for the composer — no speech here."}{" "}
            {approved.intent.kind} · {approved.locale}
          </p>
          <div className="btn-row">
            {approvedHref && (
              <Link prefetch={false} className="btn" href={approvedHref} style={{ textDecoration: "none" }}>
                {locale === "ta" ? "அமைப்பில் திற" : "Open in composer"}
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setApproved(null);
                setApprovedHref(null);
              }}
            >
              {locale === "ta" ? "மீண்டும் தொடங்கு" : "Start over"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
