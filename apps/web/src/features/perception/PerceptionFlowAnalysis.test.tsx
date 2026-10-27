import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PerceptionFlow from "./PerceptionFlow";

const ctrl = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: ctrl.session } }) },
  }),
}));

afterEach(() => {
  cleanup();
  ctrl.session = null;
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

const tinyPng = new File(
  [Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))],
  "t.png",
  { type: "image/png" },
);

async function uploadPhoto() {
  class MockImage {
    onload: (() => void) | null = null;
    naturalWidth = 640;
    naturalHeight = 480;
    set src(_: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", MockImage);
  render(<PerceptionFlow />);
  // Leave fixture mode: real photos only.
  fireEvent.click(screen.getByRole("button", { name: /use synthetic fixtures/i }));
  const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [tinyPng] } });
  await screen.findByRole("heading", { name: /preview/i });
}

describe("PerceptionFlow Meta entry", () => {
  it("offers Meta analysis to signed-in owners on real photos", async () => {
    ctrl.session = { user: "owner-1" };
    await uploadPhoto();
    expect(await screen.findByRole("button", { name: /analyze with meta/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign in to analyze real photos/i)).not.toBeInTheDocument();
  });

  it("keeps guests on fixtures with an explicit sign-in hint", async () => {
    ctrl.session = null;
    await uploadPhoto();
    expect(await screen.findByText(/sign in to analyze real photos/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /analyze with meta/i })).not.toBeInTheDocument();
  });
});
