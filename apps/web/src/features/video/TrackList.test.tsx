import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TrackList from "./TrackList";
import { getVideoFixture } from "./fixtures";

afterEach(() => cleanup());

const crossing = getVideoFixture("crossing")!;

describe("TrackList", () => {
  it("lists every track with its time window and seeks on demand", () => {
    const onSelect = vi.fn();
    const onSeek = vi.fn();
    render(
      <TrackList locale="en" tracks={crossing.tracks} selectedTrackId={null} onSelect={onSelect} onSeek={onSeek} />,
    );
    expect(screen.getByRole("button", { name: /water \(0\.0.*10\.0s\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /jump to appearance/i })[0]!);
    expect(onSeek).toHaveBeenCalledWith(0);
    expect(onSelect).toHaveBeenCalledWith("crossing-water");
  });

  it("hides confidence for fixtures and reports the empty case", () => {
    render(<TrackList locale="en" tracks={crossing.tracks} selectedTrackId={null} onSelect={() => {}} onSeek={() => {}} />);
    expect(screen.getAllByText(/no confidence in fixture mode/i)).toHaveLength(3);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    cleanup();
    render(<TrackList locale="en" tracks={[]} selectedTrackId={null} onSelect={() => {}} onSeek={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no object tracks/i);
  });
});
