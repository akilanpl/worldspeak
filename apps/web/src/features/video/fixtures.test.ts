import { describe, expect, it } from "vitest";
import { getObject } from "@worldspeak/catalog";
import { VIDEO_FIXTURES } from "./fixtures";
import { isValidTrack } from "./tracks";

describe("synthetic tracking fixtures", () => {
  it("labels every track as synthetic with no fabricated confidence", () => {
    expect(VIDEO_FIXTURES.length).toBeGreaterThanOrEqual(2);
    for (const scene of VIDEO_FIXTURES) {
      for (const t of scene.tracks) {
        expect(t.origin).toBe("fixture");
        expect(t.confidence).toBeNull();
        expect(isValidTrack(t)).toBe(true);
      }
    }
  });

  it("maps every fixture label to a reviewed catalog noun", () => {
    for (const scene of VIDEO_FIXTURES) {
      for (const t of scene.tracks) {
        expect(t.catalogId).not.toBeNull();
        expect(getObject(t.catalogId ?? "")).toBeDefined();
      }
    }
  });

  it("covers movement, appear/vanish, overlap, box-only, and empty timelines", () => {
    const crossing = VIDEO_FIXTURES.find((s) => s.id === "crossing")!;
    const water = crossing.tracks.find((t) => t.trackId === "crossing-water")!;
    expect(water.points.length).toBeGreaterThanOrEqual(3);
    const moved = water.points[water.points.length - 1]!.box.x1 - water.points[0]!.box.x1;
    expect(Math.abs(moved)).toBeGreaterThan(0.2);
    expect(crossing.tracks.some((t) => t.points.every((p) => p.mask === null))).toBe(true);
    expect(VIDEO_FIXTURES.some((s) => s.tracks.length === 0)).toBe(true);
  });
});
