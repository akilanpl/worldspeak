import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import VideoCapturePanel from "./VideoCapturePanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderCapture() {
  const onClip = vi.fn();
  const onFixtureModeChange = vi.fn();
  render(<VideoCapturePanel locale="en" onClip={onClip} fixtureMode={false} onFixtureModeChange={onFixtureModeChange} />);
  return { onClip, onFixtureModeChange };
}

function stubUrls() {
  const create = vi.fn(() => "blob:mock");
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  return { create, revoke };
}

/** Real <video> elements with canned metadata; React can mount them safely. */
function fakeProbeVideo(duration: number) {
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tag: string, ...rest: unknown[]) => {
    const el = (realCreate as (...a: unknown[]) => Element)(tag, ...rest);
    if (tag === "video" && el instanceof HTMLVideoElement) {
      Object.defineProperties(el, {
        videoWidth: { value: 640, configurable: true },
        videoHeight: { value: 360, configurable: true },
        duration: { value: duration, configurable: true },
      });
      let src = "";
      Object.defineProperty(el, "src", {
        get: () => src,
        set: (v: string) => {
          src = v;
          queueMicrotask(() => {
            const handler = el.onloadedmetadata;
            if (typeof handler === "function") handler.call(el, new Event("loadedmetadata"));
          });
        },
        configurable: true,
      });
    }
    return el;
  }) as typeof document.createElement);
}

function oversized(mime: string, bytes: number): File {
  const file = new File(["x"], "clip.mp4", { type: mime });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("VideoCapturePanel", () => {
  it("reports unsupported browsers with an upload fallback and no clip", async () => {
    const { onClip } = renderCapture();
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot record video/i);
    expect(onClip).not.toHaveBeenCalled();
  });

  it("reports camera permission denial", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    Object.defineProperty(window.navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    renderCapture();
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/denied/i);
  });

  it("rejects invalid types and oversized files", async () => {
    renderCapture();
    const input = screen.getByLabelText(/upload clip/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/mp4 or webm/i);
    fireEvent.change(input, { target: { files: [oversized("video/mp4", 51 * 1024 * 1024)] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/50 mb/i);
  });

  it("rejects over-long uploads and accepts valid ones", async () => {
    stubUrls();
    fakeProbeVideo(60);
    const { onClip } = renderCapture();
    const input = screen.getByLabelText(/upload clip/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "long.mp4", { type: "video/mp4" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/too long/i);
    expect(onClip).not.toHaveBeenCalled();
  });

  it("previews a valid upload and revokes its URL on remove", async () => {
    const { revoke } = stubUrls();
    fakeProbeVideo(5);
    const { onClip } = renderCapture();
    const input = screen.getByLabelText(/upload clip/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "ok.mp4", { type: "video/mp4" })] } });
    await vi.waitFor(() => expect(onClip).toHaveBeenCalledTimes(1));
    expect(onClip.mock.calls[0]?.[0]).toMatchObject({ source: "upload", durationMs: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /retry \/ remove/i }));
    expect(onClip).toHaveBeenLastCalledWith(null);
    expect(revoke).toHaveBeenCalledWith("blob:mock");
  });
});
