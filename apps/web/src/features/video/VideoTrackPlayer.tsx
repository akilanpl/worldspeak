"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import { boxToPercent, computeFittedRect } from "../perception/geometry";
import { activeTracksAt, trackBoxAt } from "./tracks";
import type { ObjectTrack } from "./types";

export interface PlayerSource {
  /** Real file clip. */
  url: string | null;
  width: number;
  height: number;
  durationMs: number;
  synthetic: boolean;
}

export interface VideoTrackPlayerProps {
  locale: Locale;
  source: PlayerSource;
  tracks: ObjectTrack[];
  selectedTrackId: string | null;
  onSelect: (trackId: string) => void;
  /** Test seam: deterministic clock instead of video/rAF time. */
  testTime?: number;
  /** Seek request consumed once per sequence number. */
  seekTo?: { t: number; seq: number } | null;
  /** Throttled clock readout for selection timestamps. */
  onTimeChange?: (t: number) => void;
}

/**
 * Video player with synchronized object-track overlays. Regions render from
 * `activeTracksAt(tracks, now)` every frame tick, so appearance, movement,
 * overlap, and disappearance stay aligned with playback. Keyboard users get
 * the same tracks through TrackList; pointer users tap regions directly.
 */
export default function VideoTrackPlayer({
  locale,
  source,
  tracks,
  selectedTrackId,
  onSelect,
  testTime,
  seekTo,
  onTimeChange,
}: VideoTrackPlayerProps) {
  const ta = locale === "ta";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [container, setContainer] = useState<{ width: number; height: number } | null>(null);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  // Consumed-seek guard: read and written only inside the seek effect below.
  const appliedSeekRef = useRef<number | null>(null);

  const durationS = Math.max(0, source.durationMs / 1000);
  const clock = testTime ?? now;

  // Measure the stage; overlays align to the fitted media rect.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainer({ width: rect.width, height: rect.height });
    };
    const frame = requestAnimationFrame(measure);
    if (typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(frame);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [source.url, source.width, source.height]);

  // Synthetic fixtures advance on a fixed 10 Hz step — deterministic and
  // independent of wall-clock anchoring. The interval stops itself at the
  // end of the timeline by depending on the frozen clock value.
  const ended = source.synthetic && testTime === undefined && now >= durationS;
  useEffect(() => {
    if (testTime !== undefined || !playing || !source.synthetic || ended) return;
    const id = window.setInterval(() => {
      setNow((n) => Math.min(n + 0.1, durationS));
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, testTime, durationS, source.synthetic, ended]);

  // Real clips: mirror the media element each frame while playing.
  useEffect(() => {
    if (testTime !== undefined || !playing || source.synthetic) return;
    const tick = () => {
      const v = videoRef.current;
      if (v) setNow(Math.min(Math.max(v.currentTime, 0), durationS));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, testTime, durationS, source.synthetic]);

  // Report the clock (playback, seek, or synthetic step) to the parent so
  // selection timestamps stay aligned with what the user sees.
  useEffect(() => {
    onTimeChange?.(clock);
  }, [clock, onTimeChange]);

  // Seek requests: jump real video or the synthetic clock.
  useEffect(() => {
    if (!seekTo || appliedSeekRef.current === seekTo.seq) return;
    appliedSeekRef.current = seekTo.seq;
    const t = Math.min(Math.max(seekTo.t, 0), durationS);
    const v = videoRef.current;
    if (v && !source.synthetic) {
      try {
        v.currentTime = t;
      } catch {
        /* seek unsupported */
      }
    }
    setNow(t);
  }, [seekTo, durationS, source.synthetic]);

  const fitted = container
    ? computeFittedRect(container.width, container.height, source.width, source.height)
    : null;
  const active = activeTracksAt(tracks, clock);

  const isActive = playing && !ended;
  function togglePlay() {
    if (source.synthetic) {
      if (clock >= durationS) {
        setNow(0);
        setPlaying(true);
        return;
      }
      setPlaying((p) => !p);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <div>
      <div
        ref={containerRef}
        data-testid="video-stage"
        style={{ position: "relative", width: "100%", aspectRatio: `${source.width} / ${source.height}`, background: "#101418", borderRadius: 12, overflow: "hidden" }}
      >
        {source.url ? (
          <video
            ref={videoRef}
            src={source.url}
            playsInline
            aria-label={ta ? "கிளிப்" : "Clip"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onSeeked={(e) => setNow(e.currentTarget.currentTime)}
          />
        ) : (
          <svg
            viewBox={`0 0 ${source.width} ${source.height}`}
            role="img"
            aria-label={ta ? "செயற்கை காட்சி" : "Synthetic scene (fixture)"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            preserveAspectRatio="none"
          >
            <rect x={0} y={0} width={source.width} height={source.height} fill="#2a3340" />
            <rect x={source.width * 0.08} y={source.height * 0.72} width={source.width * 0.84} height={source.height * 0.2} fill="#3a4656" rx={8} />
            <circle cx={source.width * 0.85} cy={source.height * 0.18} r={source.height * 0.08} fill="#465364" />
          </svg>
        )}
        {fitted && (
          <div
            data-testid="track-layer"
            style={{ position: "absolute", left: fitted.x, top: fitted.y, width: fitted.width, height: fitted.height }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {active.map((tr) => {
                const state = trackBoxAt(tr, clock);
                const pts = state?.mask?.map((p) => `${p.x * 100},${p.y * 100}`).join(" ") ?? null;
                if (!pts) return null;
                const selected = tr.trackId === selectedTrackId;
                return (
                  <polygon
                    key={tr.trackId}
                    points={pts}
                    fill={selected ? "rgba(15,118,110,0.45)" : "rgba(15,118,110,0.25)"}
                    stroke={selected ? "#ffffff" : "#0f766e"}
                    strokeWidth={selected ? 1.2 : 0.6}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            {active.map((tr) => {
              const state = trackBoxAt(tr, clock);
              const pct = state ? boxToPercent(state.box) : null;
              if (!pct) return null;
              const selected = tr.trackId === selectedTrackId;
              return (
                <button
                  key={tr.trackId}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${tr.labelEn} (${ta ? "பாதை" : "track"}, ${clock.toFixed(1)}s)${selected ? ` — ${ta ? "தேர்ந்தது" : "selected"}` : ""}`}
                  onClick={() => onSelect(tr.trackId)}
                  style={{
                    position: "absolute",
                    left: pct.left,
                    top: pct.top,
                    width: pct.width,
                    height: pct.height,
                    background: selected ? "rgba(255,255,255,0.12)" : "transparent",
                    border: selected ? "3px solid #ffffff" : "2px dashed rgba(255,255,255,0.85)",
                    borderRadius: 8,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      <div className="btn-row" role="group" aria-label={ta ? "இயக்கம்" : "playback"}>
        <button type="button" className="btn btn-secondary" onClick={togglePlay} aria-pressed={isActive}>
          {isActive ? (ta ? "இடைநிறுத்து" : "Pause") : ta ? "இயக்கு" : "Play"}
        </button>
        <span className="status" role="timer" aria-label={ta ? "நேரம்" : "time"}>
          {clock.toFixed(1)}s / {durationS.toFixed(1)}s ·{" "}
          {ta ? `${active.length} பாதைகள்` : `${active.length} track${active.length === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}
