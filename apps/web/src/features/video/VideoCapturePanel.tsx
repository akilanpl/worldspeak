"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import type { VideoClip } from "./types";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_RECORD_SECONDS = 10;
export const MAX_UPLOAD_SECONDS = 30;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];

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

/**
 * Short-clip capture (MediaRecorder) and upload with strict client-side
 * validation. Nothing uploads automatically; the panel only yields a local
 * preview clip (or clears it).
 */
export default function VideoCapturePanel({ locale, onClip, fixtureMode, onFixtureModeChange }: VideoCapturePanelProps) {
  const ta = locale === "ta";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<VideoClip | null>(null);
  // Mirror of the live object URL for unmount cleanup (state is stale in the
  // mount-only effect below, so the ref is the source of truth on exit).
  const urlRef = useRef<string | null>(null);
  const [error, setError] = useState<VideoCaptureError>(null);
  const [busy, setBusy] = useState(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* already stopped */
      }
    });
    streamRef.current = null;
    setLive(false);
  }, []);

  const revokeClip = useCallback((c: VideoClip | null) => {
    if (c && c.url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(c.url);
      } catch {
        /* already revoked */
      }
    }
  }, []);

  // Release camera, timers, and object URLs on hide/unmount/route exit.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        try {
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        } catch {
          /* already stopped */
        }
        stopTracks();
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        /* already stopped */
      }
      stopTracks();
      if (urlRef.current) {
        try {
          URL.revokeObjectURL(urlRef.current);
        } catch {
          /* already revoked */
        }
        urlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount resource cleanup only
  }, []);

  function clearAll() {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    try {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    } catch {
      /* already stopped */
    }
    recorderRef.current = null;
    setRecording(false);
    stopTracks();
    setClip((prev) => {
      revokeClip(prev);
      return null;
    });
    urlRef.current = null;
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    onClip(null);
  }

  async function openCamera() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("unsupported");
      return;
    }
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setLive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            const started = videoRef.current.play() as unknown as Promise<void> | undefined;
            if (started && typeof started.catch === "function") void started.catch(() => {});
          } catch {
            /* preview continues */
          }
        }
      });
    } catch (e) {
      if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
        setError("denied");
      } else if (e instanceof DOMException && (e.name === "NotFoundError" || e.name === "OverconstrainedError")) {
        setError("unavailable");
      } else {
        setError("load-failed");
      }
    } finally {
      setBusy(false);
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setError("unsupported");
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("unsupported");
      return;
    }
    setError(null);
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      finishBlob(blob, mimeType, "camera");
    };
    recorderRef.current = recorder;
    recorder.start(250);
    setRecording(true);
    stopTimerRef.current = window.setTimeout(() => {
      try {
        if (recorder.state === "recording") recorder.stop();
      } catch {
        /* already stopped */
      }
    }, MAX_RECORD_SECONDS * 1000);
  }

  function stopRecording() {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    try {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    } catch {
      setError("load-failed");
      return;
    }
    setRecording(false);
    stopTracks();
  }

  function finishBlob(blob: Blob, mimeType: string, source: VideoClip["source"], name: string | null = null) {
    if (blob.size === 0) {
      setError("load-failed");
      return;
    }
    const url = URL.createObjectURL(blob);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const durationMs = Number.isFinite(probe.duration) ? Math.round(probe.duration * 1000) : 0;
      const next: VideoClip = {
        url,
        width: probe.videoWidth,
        height: probe.videoHeight,
        durationMs,
        source,
        mimeType,
        name,
      };
      setClip(next);
      urlRef.current = next.url;
      onClip(next);
      try {
        URL.revokeObjectURL(probe.src);
      } catch {
        /* noop */
      }
    };
    probe.onerror = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
      setError("load-failed");
    };
    probe.src = url;
  }

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError("invalid-type");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("too-large");
      return;
    }
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const meta = await probeVideo(url);
      if (!Number.isFinite(meta.durationMs) || meta.durationMs <= 0) throw new Error("bad duration");
      if (meta.durationMs > MAX_UPLOAD_SECONDS * 1000) {
        URL.revokeObjectURL(url);
        setError("too-long");
        return;
      }
      stopTracks();
      const next: VideoClip = {
        url,
        width: meta.width,
        height: meta.height,
        durationMs: meta.durationMs,
        source: "upload",
        mimeType: file.type,
        name: file.name,
      };
      setClip(next);
      urlRef.current = next.url;
      onClip(next);
    } catch {
      setError("load-failed");
    } finally {
      setBusy(false);
    }
  }

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
          : "Synthetic tracking fixtures. No live AI, no uploads, no speech."}
      </p>
      <div className="btn-row" role="group" aria-label={ta ? "மாதிரிகள்" : "fixtures"}>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={fixtureMode}
          onClick={() => {
            clearAll();
            onFixtureModeChange(!fixtureMode);
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
          {clip && !live && !recording && (
            <video
              src={clip.url}
              controls
              playsInline
              aria-label={ta ? "கிளிப் முன்னோட்டம்" : "Clip preview"}
              style={{ width: "100%", borderRadius: 12 }}
            />
          )}
          <div className="btn-row">
            {!live && !clip && (
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
            {clip && !live && !recording && (
              <button type="button" className="btn btn-secondary" onClick={clearAll}>
                {ta ? "மீண்டும் எடு / நீக்கு" : "Retry / remove"}
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
              }}
            />
          </div>
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

function probeVideo(url: string): Promise<{ width: number; height: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () =>
      resolve({
        width: probe.videoWidth,
        height: probe.videoHeight,
        durationMs: Math.round(probe.duration * 1000),
      });
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    probe.src = url;
  });
}
