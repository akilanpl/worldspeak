import { describe, expect, it } from "vitest";
import { activeTracksAt, isValidTrack, trackBoxAt, trackWindow } from "./tracks";
import { VIDEO_FIXTURES } from "./fixtures";

const crossing = VIDEO_FIXTURES.find((s) => s.id === "crossing")!;
const water = crossing.tracks.find((t) => t.trackId === "crossing-water")!;
const phone = crossing.tracks.find((t) => t.trackId === "crossing-phone")!;

describe("track math", () => {
  it("clamps outside the track window and holds single points", () => {
    expect(trackBoxAt(water, -1)).toBeNull();
    expect(trackBoxAt(water, 11)).toBeNull();
    const at0 = trackBoxAt(water, 0);
    expect(at0?.box).toEqual({ x1: 0.06, y1: 0.3, x2: 0.2, y2: 0.92 });
    expect(trackBoxAt(water, 10)?.box.x1).toBeCloseTo(0.74);
  });

  it("interpolates linearly between keyframes", () => {
    const mid = trackBoxAt(water, 2.5);
    // Halfway between t=0 (x1 0.06) and t=5 (x1 0.40).
    expect(mid?.box.x1).toBeCloseTo(0.23);
    // Masks hold the nearest keyframe: no morphing. Exact midpoints
    // resolve ties to the earlier keyframe (see tracks.ts).
    expect(mid?.mask).toEqual(trackBoxAt(water, 0)?.mask);
    const late = trackBoxAt(water, 8);
    expect(late?.box.x1).toBeCloseTo(0.6);
    expect(late?.mask).toEqual(trackBoxAt(water, 10)?.mask);
  });

  it("models appearance and disappearance windows", () => {
    expect(trackBoxAt(phone, 1.999)).toBeNull();
    expect(trackBoxAt(phone, 2)).not.toBeNull();
    expect(trackBoxAt(phone, 5)).not.toBeNull();
    expect(trackBoxAt(phone, 5.001)).toBeNull();
    expect(trackWindow(phone)).toEqual({ from: 2, to: 5 });
    expect(trackWindow({ ...phone, points: [] })).toBeNull();
  });

  it("lists active tracks in stable order", () => {
    expect(activeTracksAt(crossing.tracks, 0).map((t) => t.trackId)).toEqual([
      "crossing-water",
      "crossing-chair",
    ]);
    // At t=3 the bottle overlaps the chair and the phone sits on the chair.
    expect(activeTracksAt(crossing.tracks, 3).map((t) => t.trackId)).toEqual([
      "crossing-water",
      "crossing-chair",
      "crossing-phone",
    ]);
    expect(activeTracksAt(crossing.tracks, 9).map((t) => t.trackId)).toEqual([
      "crossing-water",
      "crossing-chair",
    ]);
  });

  it("validates backend-shaped payloads strictly", () => {
    expect(isValidTrack(water)).toBe(true);
    expect(isValidTrack({ ...water, points: [] })).toBe(false);
    expect(isValidTrack({ ...water, points: [...water.points].reverse() })).toBe(false);
    expect(isValidTrack({ ...water, confidence: 0.9, origin: "model" })).toBe(true);
    expect(isValidTrack({ ...water, confidence: 1.5, origin: "model" })).toBe(false);
    expect(isValidTrack({ ...water, origin: "live" })).toBe(false);
    expect(isValidTrack(null)).toBe(false);
  });
});
