import { describe, expect, it } from "vitest";
import { boxToPercent, boxToPixels, computeFittedRect, pointInBox } from "./geometry";

describe("overlay geometry", () => {
  it("fits landscape image into square container with letterboxing", () => {
    const fitted = computeFittedRect(400, 400, 800, 400);
    expect(fitted).toEqual({ x: 0, y: 100, width: 400, height: 200 });
  });

  it("fits portrait image into wide container with pillarboxing", () => {
    const fitted = computeFittedRect(800, 400, 400, 800);
    expect(fitted).toEqual({ x: 300, y: 0, width: 200, height: 400 });
  });

  it("is exact when aspects match", () => {
    expect(computeFittedRect(300, 200, 600, 400)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });

  it("rejects degenerate dimensions", () => {
    expect(computeFittedRect(0, 100, 100, 100)).toBeNull();
    expect(computeFittedRect(100, 100, 0, 100)).toBeNull();
    expect(computeFittedRect(NaN, 100, 100, 100)).toBeNull();
  });

  it("maps normalized boxes to pixels inside the fitted rect", () => {
    const fitted = { x: 0, y: 100, width: 400, height: 200 };
    const px = boxToPixels({ x1: 0.25, y1: 0.25, x2: 0.75, y2: 0.75 }, fitted);
    expect(px).toEqual({ left: 100, top: 150, width: 200, height: 100 });
  });

  it("maps normalized boxes to percentages independent of pixel size", () => {
    expect(boxToPercent({ x1: 0.1, y1: 0.2, x2: 0.5, y2: 0.8 })).toEqual({
      left: "10%",
      top: "20%",
      width: "40%",
      height: "60%",
    });
  });

  it("rejects out-of-range and inverted boxes", () => {
    const fitted = { x: 0, y: 0, width: 100, height: 100 };
    expect(boxToPixels({ x1: -0.1, y1: 0, x2: 0.5, y2: 0.5 }, fitted)).toBeNull();
    expect(boxToPixels({ x1: 0.6, y1: 0, x2: 0.5, y2: 0.5 }, fitted)).toBeNull();
    expect(boxToPercent({ x1: 0, y1: 0, x2: 1.1, y2: 1 })).toBeNull();
  });

  it("tests point-in-box on edges inclusively", () => {
    const box = { x1: 0.2, y1: 0.3, x2: 0.6, y2: 0.7 };
    expect(pointInBox(0.2, 0.3, box)).toBe(true);
    expect(pointInBox(0.6, 0.7, box)).toBe(true);
    expect(pointInBox(0.61, 0.5, box)).toBe(false);
  });
});
