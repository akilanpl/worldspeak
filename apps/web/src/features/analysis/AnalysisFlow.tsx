"use client";

import { useState } from "react";
import type { Locale, Operation } from "@worldspeak/contracts";
import type { CapturedImage, PerceivedObject } from "../perception/types";
import ConsentPanel from "./ConsentPanel";
import JobStatus from "./JobStatus";
import { dataUrlToBytes } from "./imageBytes";
import { useAnalysisJob } from "./useAnalysisJob";

/**
 * One confirmed still image → explicit consent → upload → scene/segment job
 * → validated model detections → explicit "use these" confirmation.
 *
 * Fixtures never enter this flow: it renders only for real captured or
 * uploaded photos, and only for signed-in owners. Nothing here speaks;
 * detected objects continue through the existing selection → intent →
 * composer handoff.
 */
export default function AnalysisFlow({
  locale,
  image,
  operation,
  concept,
  onDetections,
  onBack,
}: {
  locale: Locale;
  image: CapturedImage;
  operation: Operation;
  concept: string | null;
  onDetections: (objects: PerceivedObject[], model: string) => void;
  onBack: () => void;
}) {
  const ta = locale === "ta";
  const [consented, setConsented] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { outcome, submit, cancel, reset } = useAnalysisJob();

  function send() {
    setLocalError(null);
    if (operation === "segment" && (!concept || concept.length > 80)) {
      setLocalError(
        ta ? "பிரிவுக்கு உறுதி செய்யப்பட்ட ஒரு பெயர் தேவை." : "Segmentation needs one confirmed noun phrase.",
      );
      return;
    }
    let bytes: Uint8Array;
    let mime: string;
    try {
      ({ bytes, mime } = dataUrlToBytes(image.dataUrl));
    } catch (e) {
      setLocalError(
        ta
          ? "இந்தப் படத்தைப் பதிவேற்ற முடியாது."
          : e instanceof Error ? e.message : "This photo cannot be uploaded.",
      );
      return;
    }
    setConsented(true);
    submit(bytes, mime, operation, concept ?? undefined);
  }

  function startOver() {
    reset();
    setConsented(false);
    setLocalError(null);
  }

  if (!consented) {
    return (
      <>
        {localError && (
          <p className="notice" role="alert">
            {localError}
          </p>
        )}
        <ConsentPanel locale={locale} imageName={image.name} onSend={send} onBack={onBack} />
      </>
    );
  }

  return (
    <section className="panel" aria-labelledby="analysis-h">
      <h2 id="analysis-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>
        {ta ? "மாதிரி பகுப்பாய்வு" : "Model analysis"}
      </h2>
      {localError && (
        <p className="notice" role="alert">
          {localError}
        </p>
      )}
      <JobStatus locale={locale} outcome={outcome} onCancel={cancel} onStartOver={startOver} />
      {outcome.name === "succeeded" && (
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => onDetections(outcome.objects, outcome.model)}
          >
            {ta ? "இந்தப் பொருட்களைப் பயன்படுத்து" : "Use these objects"}
          </button>
        </div>
      )}
    </section>
  );
}
