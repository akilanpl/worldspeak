"use client";

import { useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import { pstr } from "./strings";
import type { PerceivedObject } from "./types";

export interface ObjectListProps {
  locale: Locale;
  objects: PerceivedObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCorrectLabel: (id: string, labelEn: string) => void;
}

/**
 * Accessible list alternative to image-region selection. Same options, same
 * order; ambiguous same-label objects are numbered. Labels can be corrected
 * here when detection got the name wrong.
 */
export default function ObjectList({ locale, objects, selectedId, onSelect, onCorrectLabel }: ObjectListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const counts = new Map<string, number>();
  const numbered = objects.map((o) => {
    const n = (counts.get(o.labelEn) ?? 0) + 1;
    counts.set(o.labelEn, n);
    const total = objects.filter((x) => x.labelEn === o.labelEn).length;
    return { object: o, suffix: total > 1 ? ` ${n}` : "" };
  });

  if (objects.length === 0) {
    return (
      <p className="status" role="status">
        {pstr("noObjects", locale)}
      </p>
    );
  }

  return (
    <div>
      {objects.some((o) => numbered.find((n) => n.object.id === o.id)?.suffix) && (
        <p className="status" role="status">
          {pstr("ambiguousObjects", locale)}
        </p>
      )}
      <ul className="tile-grid" aria-label={pstr("objectsFound", locale)}>
        {numbered.map(({ object: o, suffix }) => {
          const selected = o.id === selectedId;
          return (
            <li key={o.id}>
              <button
                type="button"
                className="tile"
                aria-pressed={selected}
                onClick={() => onSelect(o.id)}
              >
                {(locale === "ta" && o.labelTa ? o.labelTa : o.labelEn) + suffix}
              </button>
              {selected &&
                (editingId === o.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.trim()) onCorrectLabel(o.id, draft.trim());
                      setEditingId(null);
                    }}
                  >
                    <label className="field" htmlFor={`label-${o.id}`}>
                      {pstr("changeLabel", locale)}
                    </label>
                    <input
                      id={`label-${o.id}`}
                      className="field"
                      value={draft}
                      maxLength={80}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <div className="btn-row">
                      <button type="submit" className="btn btn-secondary">
                        {pstr("applyLabel", locale)}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setDraft(o.labelEn);
                        setEditingId(o.id);
                      }}
                    >
                      {pstr("changeLabel", locale)}
                    </button>
                  </div>
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
