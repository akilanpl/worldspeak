"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@worldspeak/contracts";
import { pstr } from "./strings";
import type { CapturedImage } from "./types";

/** Client-side image validation: type allowlist + 10 MB cap, never uploaded. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"];

export type CaptureError = "denied" | "unavailable" | "invalid-type" | "too-large" | "load-failed" | null;

export interface CapturePanelProps {
  locale: Locale;
  onImage: (image: CapturedImage | null) => void;
  fixtureMode: boolean;
  onFixtureModeChange: (on: boolean) => void;
}

function errorMessage(error: Exclude<CaptureError, null>, locale: Locale): string {
  switch (error) {
    case "denied":
      return pstr("permissionDenied", locale);
    case "unavailable":
      return pstr("cameraUnavailable", locale);
    case "invalid-type":
      return pstr("invalidType", locale);
    case "too-large":
      return pstr("tooLarge", locale);
    case "load-failed":
      return pstr("loadFailed", locale);
  }
}

/**
 * Camera capture + image upload. Frames stay local until an explicit future
 * Send step; this panel only produces a local preview (or clears it).
 */
export default function CapturePanel({ locale, onImage, fixtureMode, onFixtureModeChange }: CapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [live, setLive] = useState(false);
  const [preview, setPreview] = useState<CapturedImage | null>(null);
  const [error, setError] = useState<CaptureError>(null);
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

  // Always release the camera on unmount / hide / route exit.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") stopTracks();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      stopTracks();
    };
  }, [stopTracks]);

  async function openCamera() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("unavailable");
      return;
    }
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
      // Attach on next paint so the <video> exists while live.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            const started = videoRef.current.play() as unknown as Promise<void> | undefined;
            if (started && typeof started.catch === "function") void started.catch(() => {});
          } catch {
            /* autoplay with sound off may still reject; preview continues */
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

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError("load-failed");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("load-failed");
      return;
    }
    ctx.drawImage(video, 0, 0);
    // Canvas re-encode strips EXIF/metadata; stills stay on device.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopTracks();
    const image = { dataUrl, width: canvas.width, height: canvas.height, source: "camera" as const, name: null };
    setPreview(image);
    onImage(image);
  }

  function clearAll() {
    stopTracks();
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    onImage(null);
  }

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("invalid-type");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("too-large");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const size = await imageSize(dataUrl);
      const image = { dataUrl, width: size.width, height: size.height, source: "upload" as const, name: file.name };
      stopTracks();
      setPreview(image);
      onImage(image);
    } catch {
      setError("load-failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="capture-h">
      <h2 id="capture-h">{pstr("photoInput", locale)}</h2>
      <p className="status">{pstr("fixtureBanner", locale)}</p>
      <div className="btn-row" role="group" aria-label={pstr("useFixtures", locale)}>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={fixtureMode}
          onClick={() => {
            clearAll();
            onFixtureModeChange(!fixtureMode);
          }}
        >
          {pstr("useFixtures", locale)}
        </button>
      </div>

      {!fixtureMode && (
        <>
          {live && (
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={pstr("previewLabel", locale)}
              style={{ width: "100%", borderRadius: 12, background: "#000" }}
            />
          )}
          {preview && !live && (
            <img
              src={preview.dataUrl}
              alt={pstr("previewLabel", locale)}
              width={preview.width}
              height={preview.height}
              style={{ width: "100%", height: "auto", borderRadius: 12 }}
            />
          )}
          <div className="btn-row">
            {!live && !preview && (
              <button type="button" className="btn" disabled={busy} onClick={() => void openCamera()}>
                {pstr("openCamera", locale)}
              </button>
            )}
            {live && (
              <>
                <button type="button" className="btn" onClick={capturePhoto}>
                  {pstr("capturePhoto", locale)}
                </button>
                <button type="button" className="btn btn-secondary" onClick={clearAll}>
                  {pstr("closeCamera", locale)}
                </button>
              </>
            )}
            {preview && !live && (
              <button type="button" className="btn btn-secondary" onClick={clearAll}>
                {pstr("retake", locale)}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {pstr("uploadImage", locale)}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              aria-label={pstr("uploadImage", locale)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>
          {error && (
            <p className="notice" role="alert">
              {errorMessage(error, locale)}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("decode failed"));
    img.src = dataUrl;
  });
}
