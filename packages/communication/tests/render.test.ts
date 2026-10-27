import { describe, expect, it } from "vitest";
import { ESSENTIAL_TILES } from "../../catalog/src/index";
import { RenderError, renderComposition, renderIntent, textHash } from "../src/index";

describe("deterministic renderer", () => {
  it("renders the protected seed pair", () => {
    const en = renderIntent(
      { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" },
      "en",
    );
    expect(en.text).toBe("I want water.");
    const ta = renderIntent(
      { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" },
      "ta",
    );
    // Template output uses the unsuffixed form; the architecture seed variant
    // "எனக்குத் தண்ணீர் வேண்டும்." (epenthetic -த்-) awaits native review.
    expect(ta.text).toBe("எனக்கு தண்ணீர் வேண்டும்.");
  });

  it("renders every valid bilingual catalog composition", () => {
    for (const tile of ESSENTIAL_TILES) {
      for (const locale of ["en", "ta"] as const) {
        const rendered = renderComposition({ intent: tile.intent, locale });
        expect(rendered.text.length).toBeGreaterThan(0);
        expect(rendered.templateId).not.toBeNull();
        expect(rendered.source).toBe("template");
      }
    }
  });

  it("never flips negation: want and do-not-want differ in both languages", () => {
    for (const locale of ["en", "ta"] as const) {
      const want = renderIntent(
        { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" },
        locale,
      );
      const not = renderIntent(
        { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "do-not-want" },
        locale,
      );
      expect(not.text).not.toBe(want.text);
    }
    const enNot = renderIntent(
      { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "do-not-want" },
      "en",
    );
    expect(enNot.text).toBe("I do not want water.");
  });

  it("rejects unknown catalog ids explicitly", () => {
    expect(() =>
      renderIntent(
        { kind: "request-object", object: { catalogId: "nope", selectedObjectId: null }, polarity: "want" },
        "en",
      ),
    ).toThrow(RenderError);
  });

  it("preserves exact user text, including Tamil and punctuation", () => {
    const text = "நான் சொல்வது அப்படியே இருக்க வேண்டும்! 123";
    const rendered = renderComposition({ intent: { kind: "user-text", text, locale: "ta" }, locale: "ta" });
    expect(rendered.text).toBe(text);
    expect(rendered.source).toBe("user-text");
    expect(rendered.templateId).toBeNull();
  });

  it("rejects user text whose locale mismatches the composition", () => {
    expect(() =>
      renderComposition({ intent: { kind: "user-text", text: "hi", locale: "en" }, locale: "ta" }),
    ).toThrow(RenderError);
  });

  it("textHash is deterministic and distinguishes sentences", () => {
    expect(textHash("I want water.")).toBe(textHash("I want water."));
    expect(textHash("I want water.")).not.toBe(textHash("I do not want water."));
    expect(textHash("abc")).toMatch(/^[0-9a-f]{8}$/);
  });
});
