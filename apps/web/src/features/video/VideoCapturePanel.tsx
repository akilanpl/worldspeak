"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import type { VideoClip } from "./types";

import { MAX_RECORD_SECONDS, MAX_UPLOAD_SECONDS, probeVideo, validateVideoFile } from "./media";
export { MAX_VIDEO_BYTES, MAX_RECORD_SECONDS, MAX_UPLOAD_SECONDS, ACCEPTED_VIDEO_TYPES } from "./media";
const RECORDER_MIMES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];

export type VideoCaptureError =
  | "denied"
  | "unavailable"
  | "unsupported"
  | "invalid-type"
  | "too-large"
  | "too-long"
  | "load-failed"
  | null;

export interface VideoCapturePanelProps {
  locale: Locale;
  onClip: (clip: VideoClip | null) => void;
  fixtureMode: boolean;
  onFixtureModeChange: (on: boolean) => void;
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of RECORDER_MIMES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export default function VideoCapturePanel({ locale, onClip, fixtureMode, onFixtureModeChange }: VideoCapturePanelProps) {
  const ta = locale === "ta";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  // Delivered clip URLs belong to VideoFlow, never to this capture component.
  const [error, setError] = useState<VideoCaptureError>(null);
  const [busy, setBusy] = useState(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }, []);
  const cancel = useCallback(() => {
    generation.current++;
    pending.current?.abort();
    pending.current = null;
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state === "recording") recorder.stop();
    }
    recorderRef.current = null;
    stopTracks();
  }, [stopTracks]);
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") { cancel(); setRecording(false); setBusy(false); } };
    document.addEventListener("visibilitychange", hidden);
    return () => { document.removeEventListener("visibilitychange", hidden); cancel(); };
  }, [cancel]);
  function clearAll() {
    cancel(); setRecording(false); setBusy(false); setError(null);
    if (fileRef.current) fileRef.current.value = "";
    onClip(null);
  }
  async function openCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError("unsupported"); return; }
    const request = ++generation.current;
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
      if (generation.current !== request) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream; setLive(true);
    } catch { if (generation.current === request) setError("denied"); }
    finally { if (generation.current === request) setBusy(false); }
  }
  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play()?.catch(() => {});
    }
  }, [live]);
  async function acceptBlob(blob: Blob, mimeType: string, source: VideoClip["source"], name: string | null, recordedSeconds?: number) {
    pending.current?.abort();
    generation.current++;
    const failure = validateVideoFile(blob);
    if (failure) { setBusy(false); setError(failure); return; }
    const controller = new AbortController(); pending.current = controller;
    const request = ++generation.current;
    const url = URL.createObjectURL(blob);
    let transferred = false;
    setBusy(true); setError(null);
    try {
      const meta = await probeVideo(url, controller.signal, recordedSeconds);
      if (generation.current !== request) return;
      stopTracks();
      transferred = true;
      onClip({url, ...meta, source, mimeType, name});
    } catch (e) {
      if (generation.current === request) setError(e instanceof Error && e.message === "too-long" ? "too-long" : "load-failed");
    } finally {
      if (!transferred) URL.revokeObjectURL(url);
      if (generation.current === request) { pending.current = null; setBusy(false); }
    }
  }
  function startRecording() {
    const stream = streamRef.current;
    const mimeType = pickMimeType();
    if (!stream || !mimeType) { setError("unsupported"); return; }
    const chunks: Blob[] = [];
    let bytes = 0;
    const started = performance.now();
    try {
      const recorder = new MediaRecorder(stream, {mimeType, videoBitsPerSecond: 2_500_000});
      recorderRef.current = recorder;
      recorder.ondataavailable = e => {
        bytes += e.data.size;
        if (bytes > 50 * 1024 * 1024) { cancel(); setRecording(false); setError("too-large"); return; }
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => { cancel(); setRecording(false); setError("load-failed"); };
      recorder.onstop = () => {
        if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
        setRecording(false); stopTracks();
        void acceptBlob(new Blob(chunks, {type: mimeType}), mimeType, "camera", null, Math.min(MAX_RECORD_SECONDS, (performance.now() - started) / 1000));
      };
      recorder.start(250); setRecording(true);
      stopTimerRef.current = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, MAX_RECORD_SECONDS * 1000);
    } catch { setError("unsupported"); }
  }
  function stopRecording() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }
  async function handleFile(file: File) { await acceptBlob(file, file.type, "upload", file.name); }

  const messages: Record<Exclude<VideoCaptureError, null>, string> = {
    denied: ta ? "கேமரா அனுமதி மறுக்கப்பட்டது. கோப்பைப் பதிவேற்றலாம்." : "Camera access was denied. You can upload a clip instead — nothing is sent anywhere.",
    unavailable: ta ? "கேமரா இல்லை. கோப்பைப் பதிவேற்றவும்." : "No camera is available. Upload a clip instead.",
    unsupported: ta ? "இந்த உலாவி வீடியோ பதிவை ஆதரிக்கவில்லை." : "This browser cannot record video. Upload a clip instead.",
    "invalid-type": ta ? "MP4 அல்லது WebM கோப்பைத் தேர்ந்தெடுக்கவும்." : "Choose an MP4 or WebM file.",
    "too-large": ta ? "கோப்பு மிகப் பெரியது (50 MB வரம்பு)." : "That file is too large (50 MB limit).",
    "too-long": ta ? `கிளிப் மிக நீளம் (${MAX_UPLOAD_SECONDS} வினாடி வரம்பு).` : `That clip is too long (${MAX_UPLOAD_SECONDS} second limit).`,
    "load-failed": ta ? "கோப்பைப் படிக்க முடியவில்லை." : "Could not read that file.",
  };

  return (
    <section className="panel" aria-labelledby="video-capture-h">
      <h2 id="video-capture-h">{ta ? "குறுகிய கிளிப் (முன்மாதிரி)" : "Short clip (prototype)"}</h2>
      <p className="status">
        {ta
          ? "செயற்கை கண்காணிப்பு மாதிரிகள். நேரடி AI இல்லை, பதிவேற்றம் இல்லை, பேச்சு இல்லை."
          : "Local manual video selection or clearly labeled synthetic demos. No live AI, no network uploads, no speech."}
      </p>
      <div className="btn-row" role="group" aria-label={ta ? "மாதிரிகள்" : "Video source"}>
        <button type="button" className="btn btn-secondary" aria-pressed={!fixtureMode} onClick={() => {clearAll(); onFixtureModeChange(false);}}>Use local video</button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={fixtureMode}
          onClick={() => {
            clearAll();
            onFixtureModeChange(true);
          }}
        >
          {ta ? "மாதிரி காட்சிகள்" : "Use synthetic fixtures"}
        </button>
      </div>

      {!fixtureMode && (
        <>
          {live && (
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={ta ? "கேமரா முன்னோட்டம்" : "Camera preview"}
              style={{ width: "100%", borderRadius: 12, background: "#000" }}
            />
          )}
          <div className="btn-row">
            {!live && (
              <button type="button" className="btn" disabled={busy} onClick={() => void openCamera()}>
                {ta ? "கேமராவைத் திற" : "Open camera"}
              </button>
            )}
            {live && !recording && (
              <>
                <button type="button" className="btn" onClick={startRecording}>
                  {ta ? `பதிவு (${MAX_RECORD_SECONDS} வினா.)` : `Record (${MAX_RECORD_SECONDS}s)`}
                </button>
                <button type="button" className="btn btn-secondary" onClick={clearAll}>
                  {ta ? "மூடு" : "Close camera"}
                </button>
              </>
            )}
            {recording && (
              <button type="button" className="btn" onClick={stopRecording} aria-live="polite">
                {ta ? "நிறுத்து…" : "Stop recording…"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || recording}
              onClick={() => fileRef.current?.click()}
            >
              {ta ? "கோப்பைப் பதிவேற்று" : "Upload clip"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm"
              hidden
              aria-label={ta ? "கோப்பைப் பதிவேற்று" : "Upload clip"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
          {busy && <button type="button" className="btn btn-secondary" onClick={clearAll}>Cancel clip loading</button>}
          {error && (
            <p className="notice" role="alert">
              {messages[error]}
            </p>
          )}
        </>
      )}
    </section>
  );
}
