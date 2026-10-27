"use client";

import type { Locale } from "@worldspeak/contracts";
import { getObject } from "@worldspeak/catalog";
import MaskOverlay from "./MaskOverlay";
import ObjectList from "./ObjectList";
import { pstr } from "./strings";
import type { CapturedImage, PerceivedObject } from "./types";

export interface SelectionPanelProps {
  locale: Locale;
  image: CapturedImage | null;
  fixtureAspect: { w: number; h: number } | null;
  objects: PerceivedObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCorrectLabel: (id: string, labelEn: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Object confirmation step: visual regions + equivalent list, label
 * correction, and confidence shown only when model data supplied it.
 */
export default function SelectionPanel({
  locale,
  image,
  fixtureAspect,
  objects,
  selectedId,
  onSelect,
  onCorrectLabel,
  onBack,
  onContinue,
}: SelectionPanelProps) {
  const selected = objects.find((o) => o.id === selectedId) ?? null;
  const naturalWidth = image?.width ?? fixtureAspect?.w ?? 4;
  const naturalHeight = image?.height ?? fixtureAspect?.h ?? 3;

  return (
    <section className="panel" aria-labelledby="objects-h">
      <h2 id="objects-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>
        {pstr("objectsFound", locale)}
        {objects.length > 0 ? ` (${objects.length})` : ""}
      </h2>
      {objects.length === 0 ? (
        <p className="notice" role="status">
          {pstr("noObjects", locale)}{" "}
          <a href="/">{locale === "ta" ? "அத்தியாவசிய பலகை" : "essential board"}</a>
        </p>
      ) : (
        <p className="status">{pstr("chooseOne", locale)}</p>
      )}
      <MaskOverlay
        locale={locale}
        showEmptyState={false}
        imageUrl={image?.dataUrl ?? null}
        imageAlt={pstr("previewLabel", locale)}
        naturalWidth={naturalWidth}
        naturalHeight={naturalHeight}
        objects={objects}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      {selected && (
        <p className="status" role="status">
          {pstr("selectedObject", locale)}: {locale === "ta" && selected.labelTa ? selected.labelTa : selected.labelEn}
          {selected.confidence !== null
            ? ` — ${Math.round(selected.confidence * 100)}%`
            : ` — ${pstr("confidenceUnavailable", locale)}`}
          {selected.mask === null ? " (box)" : ""}
          {getObject(selected.catalogId ?? "") ? "" : " (unlisted)"}
        </p>
      )}
      {objects.length > 0 && (
        <ObjectList
          locale={locale}
          objects={objects}
          selectedId={selectedId}
          onSelect={onSelect}
          onCorrectLabel={onCorrectLabel}
        />
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {pstr("back", locale)}
        </button>
        <button type="button" className="btn" disabled={!selected} onClick={onContinue}>
          {pstr("continueAction", locale)}
        </button>
      </div>
    </section>
  );
}
