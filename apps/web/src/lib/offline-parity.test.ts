import { describe, expect, it } from "vitest";
import expectedDoc from "@/generated/board.expected.json";
import { ESSENTIAL_TILES } from "@worldspeak/catalog";
import { renderComposition } from "@worldspeak/communication";

/**
 * The static offline board is a generated projection of the same catalog.
 * This test pins parity: every tile must render identically in the React
 * engine and the generated offline expectations.
 */
describe("offline board parity", () => {
  it("covers every essential tile in both languages", () => {
    const expected = (expectedDoc as { expected: Record<string, { en: string; ta: string }> }).expected;
    expect(Object.keys(expected).sort()).toEqual(ESSENTIAL_TILES.map((t) => t.id).sort());
    for (const tile of ESSENTIAL_TILES) {
      for (const locale of ["en", "ta"] as const) {
        const rendered = renderComposition({ intent: tile.intent, locale });
        expect(rendered.text, `${tile.id}/${locale}`).toBe(expected[tile.id]?.[locale]);
      }
    }
  });
});
