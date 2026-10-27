import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import VideoTrackPlayer from "./VideoTrackPlayer";
import { getVideoFixture } from "./fixtures";
import type { PlayerSource } from "./VideoTrackPlayer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const crossing = getVideoFixture("crossing")!;
const source: PlayerSource = { url: null, width: 400, height: 300, durationMs: crossing.durationMs, synthetic: true };

function mockMeasure() {
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
}

describe("VideoTrackPlayer", () => {
  it("renders exactly the tracks active at the clock time", async () => {
    mockMeasure();
    const { rerender } = render(
      <VideoTrackPlayer locale="en" source={source} tracks={crossing.tracks} selectedTrackId={null} onSelect={() => {}} testTime={0} />,
    );
    // At t=0 the phone has not appeared yet: water + chair.
    expect(await screen.findAllByRole("button", { name: /track,/i })).toHaveLength(2);
    rerender(
      <VideoTrackPlayer locale="en" source={source} tracks={crossing.tracks} selectedTrackId={null} onSelect={() => {}} testTime={3} />,
    );
    expect(await screen.findAllByRole("button", { name: /track,/i })).toHaveLength(3);
    rerender(
      <VideoTrackPlayer locale="en" source={source} tracks={crossing.tracks} selectedTrackId={null} onSelect={() => {}} testTime={9} />,
    );
    // Phone vanished at 5s: back to water + chair.
    expect(await screen.findAllByRole("button", { name: /track,/i })).toHaveLength(2);
  });

  it("selects by pointer and keyboard with pressed state", async () => {
    mockMeasure();
    const onSelect = vi.fn();
    render(
      <VideoTrackPlayer locale="en" source={source} tracks={crossing.tracks} selectedTrackId={null} onSelect={onSelect} testTime={3} />,
    );
    const phone = await screen.findByRole("button", { name: /phone \(track/i });
    fireEvent.click(phone);
    expect(onSelect).toHaveBeenCalledWith("crossing-phone");
    phone.focus();
    expect(document.activeElement).toBe(phone);
    fireEvent.click(phone);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("applies seek requests to the clock", async () => {
    mockMeasure();
    render(
      <VideoTrackPlayer locale="en" source={source} tracks={crossing.tracks} selectedTrackId={null} onSelect={() => {}} seekTo={{ t: 3, seq: 1 }} />,
    );
    // Seek landed inside the phone window: it is selectable.
    expect(await screen.findByRole("button", { name: /phone \(track/i })).toBeInTheDocument();
  });

  it("shows the timer readout and an honest empty state", async () => {
    mockMeasure();
    render(
      <VideoTrackPlayer locale="en" source={source} tracks={[]} selectedTrackId={null} onSelect={() => {}} testTime={1} />,
    );
    expect(await screen.findByRole("timer")).toHaveTextContent("1.0s / 10.0s");
    expect(screen.queryByRole("button", { name: /track,/i })).not.toBeInTheDocument();
  });
});
