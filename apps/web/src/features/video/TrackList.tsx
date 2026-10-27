"use client";

import type { Locale } from "@worldspeak/contracts";
import { trackWindow } from "./tracks";
import type { ObjectTrack } from "./types";

export interface TrackListProps {
  locale: Locale;
  tracks: ObjectTrack[];
  selectedTrackId: string | null;
  onSelect: (trackId: string) => void;
  /** Jump playback to a track's first appearance. */
  onSeek: (t: number) => void;
}

/**
 * Keyboard-accessible track list: same tracks as the overlay, with time
 * windows and first-appearance seek. Confidence shown only when model data
 * supplied it.
 */
export default function TrackList({ locale, tracks, selectedTrackId, onSelect, onSeek }: TrackListProps) {
  const ta = locale === "ta";
  if (tracks.length === 0) {
    return (
      <p className="status" role="status">
        {ta ? "பாதைகள் எதுவும் கண்டறியப்படவில்லை." : "No object tracks detected."}{" "}
        {ta ? "வேறு கிளிப்பை முயற்சிக்கவும்." : "Try another clip or a synthetic fixture."}
      </p>
    );
  }
  return (
    <ul className="tile-grid" aria-label={ta ? "பொருள் பாதைகள்" : "Object tracks"}>
      {tracks.map((tr) => {
        const window = trackWindow(tr);
        const selected = tr.trackId === selectedTrackId;
        return (
          <li key={tr.trackId}>
            <button type="button" className="tile" aria-pressed={selected} onClick={() => onSelect(tr.trackId)}>
              {(ta && tr.labelTa ? tr.labelTa : tr.labelEn) + (window ? ` (${window.from.toFixed(1)}–${window.to.toFixed(1)}s)` : "")}
            </button>
            <p className="status">
              {tr.confidence !== null ? (
                <>{ta ? "நம்பிக்கை" : "Confidence"}: {Math.round(tr.confidence * 100)}%</>
              ) : (
                <>{ta ? "மாதிரியில் நம்பிக்கை இல்லை" : "No confidence in fixture mode"}</>
              )}{" "}
              ·{" "}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: "2.5rem", padding: "0.25rem 0.75rem", fontSize: "0.9rem" }}
                onClick={() => {
                  if (window) onSeek(window.from);
                  onSelect(tr.trackId);
                }}
              >
                {ta ? "தோன்றும் இடத்திற்குச் செல்" : "Jump to appearance"}
              </button>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
