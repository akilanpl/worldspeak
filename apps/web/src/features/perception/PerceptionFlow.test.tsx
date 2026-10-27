import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PerceptionFlow from "./PerceptionFlow";

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // @ts-expect-error cleanup stub
  delete window.speechSynthesis;
});

describe("PerceptionFlow", () => {
  it("completes fixture → select → intent → approve with zero speech", async () => {
    const speak = vi.fn();
    // @ts-expect-error jsdom speech stub for the no-speech assertion
    window.speechSynthesis = { speak, cancel: vi.fn() };

    render(<PerceptionFlow />);
    // Fixture scene is preselected (table); continue to objects.
    fireEvent.click(screen.getAllByRole("button", { name: /continue/i })[0]!);
    // Select water through the image region (layout settles async)…
    const water = await screen.findByRole("button", { name: /water.*fixture/i });
    fireEvent.click(water);
    // …and confirm through the list; continue to intent.
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("I want water.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve for composer/i }));
    expect(screen.getByTestId("approve-notice")).toHaveTextContent(/no speech here/i);
    expect(speak).not.toHaveBeenCalled();
  });

  it("handles the empty scene with recovery options and no crash", () => {
    render(<PerceptionFlow />);
    fireEvent.click(screen.getByRole("button", { name: /empty shelf/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /continue/i })[0]!);
    expect(screen.getByText(/no objects detected/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /use synthetic fixtures/i })).toBeInTheDocument();
  });

  it("moves focus to each step heading for keyboard users", () => {
    render(<PerceptionFlow />);
    fireEvent.click(screen.getAllByRole("button", { name: /continue/i })[0]!);
    const heading = screen.getByRole("heading", { name: /objects found/i });
    expect(document.activeElement).toBe(heading);
  });
});
