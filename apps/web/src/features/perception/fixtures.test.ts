import { describe, expect, it } from "vitest";
import { getObject } from "@worldspeak/catalog";
import { FIXTURE_SCENES } from "./fixtures";
import { isNormalizedBox } from "./types";

describe("synthetic fixtures", () => {
  it("labels every fixture as synthetic with no fabricated confidence", () => {
    expect(FIXTURE_SCENES.length).toBeGreaterThanOrEqual(2);
    for (const scene of FIXTURE_SCENES) {
      for (const o of scene.objects) {
        expect(o.origin).toBe("fixture");
        expect(o.confidence).toBeNull();
      }
    }
  });

  it("keeps every box normalized and every mask point in range", () => {
    for (const scene of FIXTURE_SCENES) {
      for (const o of scene.objects) {
        expect(isNormalizedBox(o.box)).toBe(true);
        for (const p of o.mask ?? []) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(1);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("maps every fixture label to a reviewed catalog noun", () => {
    for (const scene of FIXTURE_SCENES) {
      for (const o of scene.objects) {
        expect(o.catalogId).not.toBeNull();
        expect(getObject(o.catalogId ?? "")).toBeDefined();
      }
    }
  });

  it("covers overlap, box-only fallback, and the empty case", () => {
    const table = FIXTURE_SCENES.find((s) => s.id === "table");
    expect(table).toBeDefined();
    const boxes = (table?.objects ?? []).map((o) => o.box);
    const overlaps = (a: (typeof boxes)[number], b: (typeof boxes)[number]) =>
      a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
    let pairs = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a && b && overlaps(a, b)) pairs += 1;
      }
    }
    expect(pairs).toBeGreaterThanOrEqual(2);
    expect(table?.objects.some((o) => o.mask === null)).toBe(true);
    expect(FIXTURE_SCENES.some((s) => s.objects.length === 0)).toBe(true);
  });
});
