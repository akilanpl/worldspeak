import { describe, expect, it } from "vitest";
import { parseIntent } from "../../contracts/src/index";
import {
  CATALOG_VERSION,
  ESSENTIAL_TILES,
  ESSENTIALS_VERSION,
  OBJECTS,
  REVIEW_STATUS,
  getObject,
} from "../src/index";

describe("catalog", () => {
  it("exposes versioned, review-pending markers", () => {
    expect(CATALOG_VERSION).toBe("catalog.v1");
    expect(ESSENTIALS_VERSION).toBe("essentials.v1");
    expect(REVIEW_STATUS).toBe("review-pending");
  });

  it("has at least 24 essential tiles across all categories", () => {
    expect(ESSENTIAL_TILES.length).toBeGreaterThanOrEqual(24);
    const cats = new Set(ESSENTIAL_TILES.map((t) => t.category));
    expect(cats).toEqual(new Set(["needs", "help", "comfort", "social"]));
  });

  it("includes every required tile intent", () => {
    const kinds = ESSENTIAL_TILES.map((t) => t.intent.kind);
    for (const k of ["request-object", "ask-location", "request-help", "social"]) {
      expect(kinds).toContain(k);
    }
    const texts = ESSENTIAL_TILES.map((t) => t.id);
    for (const id of ["water-want", "food-want", "toilet-where", "rest-want", "help-me", "social-yes", "social-no", "social-thanks", "social-wait"]) {
      expect(texts).toContain(id);
    }
    // polarity coverage: at least one do-not-want tile
    expect(ESSENTIAL_TILES.some((t) => t.intent.kind === "request-object" && t.intent.polarity === "do-not-want")).toBe(true);
  });

  it("every tile intent parses and references a known object", () => {
    for (const tile of ESSENTIAL_TILES) {
      const intent = parseIntent(tile.intent);
      const ref =
        intent.kind === "request-object" || intent.kind === "ask-location"
          ? intent.object
          : intent.kind === "request-help"
            ? intent.object
            : null;
      if (ref) expect(getObject(ref.catalogId)).toBeDefined();
    }
  });

  it("tile ids are unique and objects are unique", () => {
    expect(new Set(ESSENTIAL_TILES.map((t) => t.id)).size).toBe(ESSENTIAL_TILES.length);
    expect(new Set(OBJECTS.map((o) => o.id)).size).toBe(OBJECTS.length);
    expect(OBJECTS.length).toBeGreaterThanOrEqual(10);
  });
});
