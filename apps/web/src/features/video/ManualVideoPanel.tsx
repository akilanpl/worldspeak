"use client";
import { useEffect, useRef, useState } from "react";
import { OBJECTS } from "@worldspeak/catalog";
import type { VideoClip } from "./types";
import { pointInFrame, regionFromPoints, validFrameTime, type ManualVideoSelection } from "./manual";

/** One frozen human annotation, never an automatic temporal track or model result. */
export default function ManualVideoPanel({clip, onContinue}: {clip: VideoClip; onContinue: (selection: ManualVideoSelection) => void}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    const hidden = () => {if (document.visibilityState === "hidden") video?.pause();};
    document.addEventListener("visibilitychange", hidden);
    return () => {document.removeEventListener("visibilitychange", hidden); video?.pause(); video?.removeAttribute("src"); video?.load();};
  }, []);
  const [frame, setFrame] = useState<{url: string; time: number; width: number; height: number} | null>(null);
  const [ready, setReady] = useState(false);
  const [seek, setSeek] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [corner, setCorner] = useState<{x: number; y: number} | null>(null);
  const [coords, setCoords] = useState([10, 10, 90, 90]);
  const [regionConfirmed, setRegionConfirmed] = useState(false);
  const [catalogId, setCatalogId] = useState("");
  const [words, setWords] = useState("");
  const box = regionFromPoints({x: (coords[0] ?? 0)/100, y:(coords[1] ?? 0)/100}, {x: (coords[2] ?? 0)/100, y:(coords[3] ?? 0)/100});
  const catalog = OBJECTS.find(o => o.id === catalogId);
  function capture() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.seeking || video.readyState < 2 || !validFrameTime(video.currentTime, clip.durationMs)) return;
    video.pause();
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) { setError("Frame preview is unavailable in this browser."); return; }
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setFrame({url: canvas.toDataURL("image/jpeg", .85), time: video.currentTime, width: canvas.width, height: canvas.height});
      setRegionConfirmed(false); setCorner(null); setError(null);
    } catch { setError("Could not decode this frame. Try another time or clip."); }
  }
  return <section aria-labelledby="manual-video-heading">
    <h2 id="manual-video-heading" data-step-heading tabIndex={-1}>Choose a frame and object</h2>
    <p>Local video · manual human selection · no model inference or automatic tracking. Media stays in this page until you leave. Nothing speaks here.</p>
    <video ref={videoRef} src={clip.url} controls playsInline preload="auto" aria-label="Local video playback"
      style={{width: "100%", maxHeight: 480, background: "#101418"}}
      onLoadedData={() => setReady(true)} onSeeking={() => setReady(false)} onSeeked={() => setReady(true)}
      onError={() => {setReady(false); setError("Could not decode this clip. Go back and try an MP4 or WebM file.");}} />
    <div className="btn-row">
      <label>Seek time (seconds)<input type="number" min={0} max={clip.durationMs / 1000} step="0.001" value={seek} onChange={e => setSeek(e.currentTarget.valueAsNumber)} /></label>
      <button className="btn btn-secondary" type="button" disabled={!validFrameTime(seek, clip.durationMs)} onClick={() => {
        const video = videoRef.current;
        if (video) { video.pause(); video.currentTime = seek; }
      }}>Seek to time</button>
      <button className="btn" type="button" disabled={!ready} onClick={capture}>Select current frame</button>
    </div>
    <canvas ref={canvasRef} hidden />
    {error && <p role="alert">{error}</p>}
    {frame && <>
      <h3>Selected frame at {frame.time.toFixed(3)} seconds</h3>
      <p id="region-instructions">Tap two opposite corners of the object, or enter region edges as percentages below and confirm. This region belongs only to this frozen frame; seeking does not move it.</p>
      <div role="group" aria-label="Frozen frame region selection" aria-describedby="region-instructions"
        onClick={event => {
          const point = pointInFrame(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          if (!point) return;
          if (!corner) { setCorner(point); setRegionConfirmed(false); }
          else {
            const region = regionFromPoints(corner, point);
            setCorner(null);
            if (region) {setCoords([region.x1*100, region.y1*100, region.x2*100, region.y2*100]); setRegionConfirmed(true);}
            else setError("Choose two different corners with a visible region between them.");
          }
        }}
        style={{position: "relative", width: "100%", maxWidth: 960, aspectRatio: `${frame.width}/${frame.height}`, cursor: "crosshair"}}>
        {/* A bounded data URL generated from the user's local video, never remote content. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frame.url} alt={`Frozen local video frame at ${frame.time.toFixed(3)} seconds`} style={{display: "block", width: "100%", height: "100%"}} />
        {box && <div aria-hidden="true" style={{position:"absolute", pointerEvents:"none", left:`${box.x1*100}%`,top:`${box.y1*100}%`,width:`${(box.x2-box.x1)*100}%`,height:`${(box.y2-box.y1)*100}%`,border:"3px solid #fff",outline:"2px solid #0f766e",boxSizing:"border-box"}} />}
      </div>
      <p role="status">{corner ? "First corner selected. Choose the opposite corner." : regionConfirmed ? "Manual region confirmed." : "Confirm the region before continuing."}</p>
      <fieldset><legend>Manual region edges (%)</legend>
        {["Left", "Top", "Right", "Bottom"].map((name,index) => <label key={name}>{name}<input type="number" min={0} max={100} step={.1} value={Number.isFinite(coords[index]) ? coords[index] : ""} onChange={e => {
          const value = e.currentTarget.valueAsNumber;
          setCoords(old => old.map((n,i) => i === index ? value : n)); setRegionConfirmed(false); setCorner(null);
        }} /></label>)}
      </fieldset>
      <button className="btn btn-secondary" type="button" disabled={!box} onClick={() => {setRegionConfirmed(true);setCorner(null);}}>Confirm region</button>
      <p><label>Reviewed catalog object<select value={catalogId} onChange={e => setCatalogId(e.currentTarget.value)}><option value="">Use my exact words</option>{OBJECTS.map(o => <option key={o.id} value={o.id}>{o.en}</option>)}</select></label></p>
      {!catalog && <p><label>My object or exact words<input maxLength={120} value={words} onChange={e => setWords(e.currentTarget.value)} /></label></p>}
      <p>Confirming an object does not decide what you want. Choose your intent and review the exact sentence next. Custom words are never translated.</p>
      <button className="btn" type="button" disabled={!box || !regionConfirmed || (!catalog && !words.trim())} onClick={() => {
        if (!box || !regionConfirmed || (!catalog && !words.trim())) return;
        videoRef.current?.pause();
        onContinue({origin:"manual",time:frame.time,box,labelEn:catalog?.en ?? words,labelTa:catalog?.ta ?? null,catalogId:catalog?.id ?? null});
      }}>Confirm object and choose intent</button>
    </>}
  </section>;
}
