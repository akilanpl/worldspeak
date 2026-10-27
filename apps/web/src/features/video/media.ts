export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_RECORD_SECONDS = 10;
export const MAX_UPLOAD_SECONDS = 30;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];
export type MediaFailure = "invalid-type" | "too-large" | "too-long" | "load-failed";
export function validateVideoFile(file: Blob): MediaFailure | null {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type.split(";")[0] ?? "")) return "invalid-type";
  if (file.size > MAX_VIDEO_BYTES) return "too-large";
  return file.size > 0 ? null : "load-failed";
}
export function validVideoMetadata(width: number, height: number, seconds: number): MediaFailure | null {
  if (![width, height, seconds].every(Number.isFinite) || width <= 0 || height <= 0 || width * height > 33_177_600 || seconds <= 0) return "load-failed";
  return seconds > MAX_UPLOAD_SECONDS ? "too-long" : null;
}
/** One bounded metadata probe; decoder resources are detached on all paths. Caller owns URL. */
export function probeVideo(url: string, signal: AbortSignal, recordedSeconds?: number): Promise<{width: number; height: number; durationMs: number}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const done = (error?: Error) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      if (error) reject(error);
    };
    const abort = () => done(new Error("cancelled"));
    const timer = setTimeout(() => done(new Error("load-failed")), 10000);
    video.onloadedmetadata = () => {
      const seconds = Number.isFinite(video.duration) ? video.duration : recordedSeconds ?? video.duration;
      const failure = validVideoMetadata(video.videoWidth, video.videoHeight, seconds);
      if (failure) { done(new Error(failure)); return; }
      const result = {width: video.videoWidth, height: video.videoHeight, durationMs: seconds * 1000};
      done(); resolve(result);
    };
    video.onerror = () => done(new Error("load-failed"));
    signal.addEventListener("abort", abort, {once: true});
    if (signal.aborted) { abort(); return; }
    video.preload = "metadata";
    video.src = url;
  });
}
