"use client";

import { useState } from "react";
import type { Locale } from "@worldspeak/contracts";

/**
 * Fresh explicit upload + Meta-processing consent. The `scene-v1` header is
 * sent ONLY from the Send button below, after the checkbox. No silent camera
 * upload: this panel appears solely for a user-confirmed still image.
 */
export default function ConsentPanel({
  locale,
  imageName,
  onSend,
  onBack,
}: {
  locale: Locale;
  imageName: string | null;
  onSend: () => void;
  onBack: () => void;
}) {
  const ta = locale === "ta";
  const [understood, setUnderstood] = useState(false);
  return (
    <section className="panel" aria-labelledby="consent-h">
      <h2 id="consent-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>
        {ta ? "அனுமதி: மாதிரி பகுப்பாய்வு" : "Consent: model analysis"}
      </h2>
      <p className="status">
        {ta
          ? "இந்தப் புகைப்படம் WorldSpeak-க்கும் Meta-வுக்கும் பகுப்பாய்வுக்காக அனுப்பப்படும்."
          : "This photo will be uploaded to WorldSpeak and Meta for analysis."}{" "}
        {ta ? `கோப்பு: ${imageName ?? "பதிவு"}` : `File: ${imageName ?? "capture"}`}
      </p>
      <ul className="status">
        <li>
          {ta
            ? "படம் தற்காலிகமாக மட்டும் வைக்கப்படும் (15 நிமிடம்), பின் நீக்கப்படும்."
            : "The image is kept transiently (15 minutes), then deleted."}
        </li>
        <li>
          {ta
            ? "அனுப்பிய பிறகு செயலாக்கத்தைத் திரும்பப் பெற முடியாது."
            : "Processing already sent cannot be retracted."}
        </li>
        <li>
          {ta
            ? "வழங்குநர் விதிகள் பொருந்தும்; முடிவுகள் மாதிரி என்று குறிக்கப்படும், நேரடி உண்மை அல்ல."
            : "Provider terms apply; results are labeled as model output, never ground truth."}
        </li>
        <li>
          {ta
            ? "இது ஒரு முறை அனுமதி — ஒவ்வொரு அனுப்பலுக்கும் மீண்டும் கேட்கப்படும்."
            : "This approval covers one upload only — every send asks again."}
        </li>
      </ul>
      <label className="field">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
        />{" "}
        {ta
          ? "மேலே உள்ளதைப் புரிந்துகொண்டேன், இந்த ஒரு புகைப்படத்தை அனுப்ப ஒப்புக்கொள்கிறேன்."
          : "I understand the above and approve sending this one photo."}
      </label>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {ta ? "பின்" : "Back"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!understood}
          onClick={onSend}
          data-testid="consent-send"
        >
          {ta ? "பகுப்பாய்வுக்கு அனுப்பு" : "Send for analysis"}
        </button>
      </div>
    </section>
  );
}
