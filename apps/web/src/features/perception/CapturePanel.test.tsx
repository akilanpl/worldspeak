import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CapturePanel from "./CapturePanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderCapture() {
  const onImage = vi.fn();
  render(<CapturePanel locale="en" onImage={onImage} fixtureMode={false} onFixtureModeChange={() => {}} />);
  return { onImage };
}

describe("CapturePanel", () => {
  it("reports camera permission denial and never produces an image", () => {
    const denied = new DOMException("denied", "NotAllowedError");
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(denied) },
    });
    const { onImage } = renderCapture();
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    return vi.waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/denied/i);
      expect(onImage).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /upload image/i })).toBeInTheDocument();
    });
  });

  it("reports unavailable hardware when getUserMedia is missing", () => {
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
    renderCapture();
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    return vi.waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/no camera/i);
    });
  });

  it("rejects non-image files and oversized images", async () => {
    renderCapture();
    const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;
    const bad = new File(["x"], "note.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [bad] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/not an image/i);

    const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
  });

  it("accepts a valid upload and clears it on retake", async () => {
    class MockImage {
      onload: (() => void) | null = null;
      naturalWidth = 640;
      naturalHeight = 480;
      set src(_: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);
    const { onImage } = renderCapture();
    const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await vi.waitFor(() => expect(onImage).toHaveBeenCalledTimes(1));
    expect(onImage.mock.calls[0]?.[0]).toMatchObject({ width: 640, height: 480, source: "upload" });
    fireEvent.click(screen.getByRole("button", { name: /retake/i }));
    expect(onImage).toHaveBeenCalledWith(null);
  });
});
