"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import IntentPanel, { type ApprovedSnapshot } from "../perception/IntentPanel";
import { activeTracksAt, trackBoxAt } from "./tracks";
import ManualVideoPanel from "./ManualVideoPanel";
import type { ManualVideoSelection } from "./manual";
import TrackList from "./TrackList";
import VideoCapturePanel from "./VideoCapturePanel";
import VideoTrackPlayer from "./VideoTrackPlayer";
import { getVideoFixture, VIDEO_FIXTURES } from "./fixtures";
import Link from "next/link";
import type { VideoClip, VideoStep } from "./types";
import type { PerceivedObject } from "../perception/types";
import { handoffHref, snapshotToPayload } from "../integration/handoff";

/**
 * Real local clip → frozen manual region → intent → approved handoff.
 * Synthetic demo tracks remain separate. No uploads, model calls or speech.
 */
export default function VideoFlow() {
  const [manual, setManual] = useState<ManualVideoSelection | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const ta = locale === "ta";
  const [step, setStep] = useState<VideoStep>("capture");
  const [clip, setClip] = useState<VideoClip | null>(null);
  const [fixtureMode, setFixtureMode] = useState(true);
  const [fixtureId, setFixtureId] = useState("crossing");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [seekTo, setSeekTo] = useState<{ t: number; seq: number } | null>(null);
  const [seekSeq, setSeekSeq] = useState(0);
  const [approved, setApproved] = useState<ApprovedSnapshot | null>(null);
  const [approvedHref, setApprovedHref] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Clock value frozen when the user continues to intent — render reads
  // state, never the live clock ref.
  const [intentTime, setIntentTime] = useState(0);
  const timeRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The retained frozen-frame panel is hidden while intent is active.
    // Focus must follow the visible step, not the first marker in DOM order.
    const target = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-step-heading]") ?? [])
      .find(heading => !heading.closest("[hidden]")) ?? headingRef.current;
    target?.focus({ preventScroll: true });
  }, [step, locale]);

  const fixture = getVideoFixture(fixtureId);
  const tracks = fixtureMode ? (fixture?.tracks ?? []) : [];
  const source = clip
    ? { url: clip.url, width: clip.width || 640, height: clip.height || 360, durationMs: clip.durationMs, synthetic: false as const }
    : fixture
      ? { url: null, width: fixture.aspectW * 100, height: fixture.aspectH * 100, durationMs: fixture.durationMs, synthetic: true as const }
      : null;

  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);

  function startTracks() {
    setManual(null);
    setNotice(null);
    setSelectedTrackId(null);
    if (fixtureMode) {
      setStep("tracks");
      return;
    }
    setStep("tracks");
  }

  const selectedTrack = tracks.find((t) => t.trackId === selectedTrackId) ?? null;

  function selectedObject(t: number): PerceivedObject | null {
    if (!selectedTrack) return null;
    const state = trackBoxAt(selectedTrack, t) ?? trackBoxAt(selectedTrack, selectedTrack.points[0]?.t ?? 0);
    if (!state) return null;
    return {
      id: selectedTrack.trackId,
      labelEn: selectedTrack.labelEn,
      labelTa: selectedTrack.labelTa,
      catalogId: selectedTrack.catalogId,
      box: state.box,
      mask: state.mask,
      confidence: selectedTrack.confidence,
      origin: selectedTrack.origin,
    };
  }

  const intentObject = step === "intent" ? (fixtureMode ? selectedObject(intentTime) : manual) : null;

  return (
    <div ref={rootRef}>
      <h1 ref={headingRef} tabIndex={-1} style={{ outline: "none" }} data-step-heading={step === "capture" ? "" : undefined}>
        {ta ? "கிளிப் கண்காணிப்பு (முன்மாதிரி)" : "Clip tracking (prototype)"}
      </h1>

      {step === "capture" && (
        <>
          <VideoCapturePanel
            locale={locale}
            onClip={(c) => {
              setClip(c);
              setManual(null);
              if (c) setStep("review");
            }}
            fixtureMode={fixtureMode}
            onFixtureModeChange={setFixtureMode}
          />
          {fixtureMode && (
            <section className="panel" aria-labelledby="vscene-h" style={{ marginTop: "1rem" }}>
              <h2 id="vscene-h">{ta ? "மாதிரி காட்சி" : "Fixture scene"}</h2>
              <div className="btn-row" role="group" aria-label="fixture scene">
                {VIDEO_FIXTURES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="btn btn-secondary"
                    aria-pressed={fixtureId === s.id}
                    onClick={() => setFixtureId(s.id)}
                  >
                    {ta ? s.titleTa : s.titleEn}
                  </button>
                ))}
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setClip(null);
                    startTracks();
                  }}
                >
                  {ta ? "தொடர்" : "Continue"}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {step === "review" && clip && (
        <section className="panel" aria-labelledby="vreview-h">
          <h2 id="vreview-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>
            {ta ? "கிளிப் முன்னோட்டம்" : "Clip preview"}
          </h2>
          <video src={clip.url} controls playsInline style={{ width: "100%", borderRadius: 12 }} />
          <p className="status">
            {(clip.durationMs / 1000).toFixed(1)}s · {clip.mimeType ?? "video"} · {clip.name ?? (ta ? "பதிவு" : "recording")}
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setClip(null);
                setStep("capture");
              }}
            >
              {ta ? "மீண்டும் எடு" : "Retake"}
            </button>
            <button type="button" className="btn" onClick={startTracks}>
              {ta ? "தொடர்" : "Continue"}
            </button>
          </div>
        </section>
      )}

      {clip && !fixtureMode && (step === "tracks" || step === "intent") && (
        <div hidden={step !== "tracks"}>
          <ManualVideoPanel clip={clip} onContinue={selection => {setManual(selection);setStep("intent");}} />
          <button type="button" className="btn btn-secondary" onClick={() => setStep("review")}>Back to clip preview</button>
        </div>
      )}

      {step === "tracks" && source && fixtureMode && (
        <section className="panel" aria-labelledby="vtracks-h">
          <h2 id="vtracks-h" data-step-heading tabIndex={-1} style={{ outline: "none" }}>
            {ta ? `பாதைகள் (${activeTracksAt(tracks, 0).length})` : `Tracks (${tracks.length})`}
          </h2>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <VideoTrackPlayer
            locale={locale}
            source={source}
            tracks={tracks}
            selectedTrackId={selectedTrackId}
            onSelect={setSelectedTrackId}
            onTimeChange={(t) => {
              timeRef.current = t;
            }}
            seekTo={seekTo}
          />
          <TrackList
            locale={locale}
            tracks={tracks}
            selectedTrackId={selectedTrackId}
            onSelect={setSelectedTrackId}
            onSeek={(t) => {
              const seq = seekSeq + 1;
              setSeekSeq(seq);
              setSeekTo({ t, seq });
            }}
          />
          {selectedTrack && (
            <p className="status" role="status">
              {ta ? "தேர்ந்தது" : "Selected"}:{" "}
              {ta && selectedTrack.labelTa ? selectedTrack.labelTa : selectedTrack.labelEn}
              {selectedTrack.confidence !== null
                ? ` — ${Math.round(selectedTrack.confidence * 100)}%`
                : ta
                  ? " — மாதிரியில் நம்பிக்கை இல்லை"
                  : " — no confidence in fixture mode"}
            </p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(clip ? "review" : "capture")}
            >
              {ta ? "பின்" : "Back"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selectedTrack}
              onClick={() => {
                setIntentTime(timeRef.current);
                setStep("intent");
              }}
            >
              {ta ? "தொடர்" : "Continue"}
            </button>
          </div>
        </section>
      )}

      {step === "intent" && intentObject && (
        <IntentPanel
          locale={locale}
          onLocaleChange={setLocale}
          object={intentObject}
          onBack={() => setStep("tracks")}
          onApprove={(snapshot) => {
            if (intentObject) {
              const payload = snapshotToPayload(snapshot, {
                source: "video",
                objectLabel:
                  snapshot.locale === "ta" && intentObject.labelTa
                    ? intentObject.labelTa
                    : intentObject.labelEn,
                objectCatalogId: intentObject.catalogId,
                provenance: intentObject.origin,
              });
              setApprovedHref(handoffHref(payload));
            } else {
              setApprovedHref(null);
            }
            setApproved(snapshot);
            setStep("capture");
            setClip(null);
            setSelectedTrackId(null);
          }}
        />
      )}

      {approved && step === "capture" && (
        <div className="notice" role="status" data-testid="video-approve-notice">
          <p>
            {ta ? "அமைப்புக்கு அனுப்பத் தயார். இங்கு பேச்சு இல்லை." : "Approved for the composer — no speech here."}{" "}
            {approved.intent.kind} · {approved.locale}
          </p>
          <div className="btn-row">
            {approvedHref && (
              <Link className="btn" href={approvedHref} prefetch={false} style={{ textDecoration: "none" }}>
                {ta ? "அமைப்பில் திற" : "Open in composer"}
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
              {ta ? "மீண்டும் தொடங்கு" : "Start over"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
