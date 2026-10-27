import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import VideoFlow from "./VideoFlow";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 300,
    toJSON: () => {},
  });
});

describe("VideoFlow", () => {
  it("completes fixture → track → intent → approve with zero speech", async () => {
    const speak = vi.fn();
    Object.defineProperty(window, "speechSynthesis", { value: { speak, cancel: vi.fn() }, configurable: true });

    render(<VideoFlow />);
    // Crossing scene is preselected; continue to tracks.
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeDisabled();
    // Jump the synthetic clock into the phone window, then select it.
    fireEvent.click(screen.getAllByRole("button", { name: /jump to appearance/i })[2]!);
    const phone = await screen.findByRole("button", { name: /phone \(track/i });
    fireEvent.click(phone);
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(await screen.findByText("I want phone.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve for composer/i }));
    expect(screen.getByTestId("video-approve-notice")).toHaveTextContent(/no speech here/i);
    expect(speak).not.toHaveBeenCalled();
  });

  it("handles the empty timeline with recovery and no crash", async () => {
    render(<VideoFlow />);
    fireEvent.click(screen.getByRole("button", { name: /empty motion/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(await screen.findByText(/no object tracks/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /use synthetic fixtures/i })).toBeInTheDocument();
  });
});
