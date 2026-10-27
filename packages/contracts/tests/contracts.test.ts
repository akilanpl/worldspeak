import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  parseComposition,
  parseIntent,
  parseStructuredIntent,
  parseUtterance,
} from "../src/index";

const ID = "00000000-0000-4000-8000-000000000001";

describe("intent contracts", () => {
  it("parses every intent kind", () => {
    expect(parseIntent({ kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" })).toMatchObject({ kind: "request-object" });
    expect(parseIntent({ kind: "ask-location", object: { catalogId: "toilet", selectedObjectId: null } })).toMatchObject({ kind: "ask-location" });
    expect(parseIntent({ kind: "request-help", object: null })).toMatchObject({ kind: "request-help" });
    expect(parseIntent({ kind: "social", act: "thank-you" })).toMatchObject({ kind: "social" });
    expect(parseIntent({ kind: "user-text", text: "hello", locale: "en" })).toMatchObject({ kind: "user-text" });
  });

  it("rejects unknown request keys", () => {
    expect(() =>
      parseIntent({ kind: "social", act: "yes", owner_id: "spoofed", mood: "happy" }),
    ).toThrow(ZodError);
    expect(() =>
      parseIntent({ kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want", priority: 1 }),
    ).toThrow(ZodError);
  });

  it("rejects invalid polarity, act, locale, and empty user text", () => {
    expect(() =>
      parseIntent({ kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "maybe" }),
    ).toThrow(ZodError);
    expect(() => parseIntent({ kind: "social", act: "maybe-later" })).toThrow(ZodError);
    expect(() => parseIntent({ kind: "user-text", text: "", locale: "en" })).toThrow(ZodError);
    expect(() => parseIntent({ kind: "user-text", text: "x", locale: "fr" })).toThrow(ZodError);
  });

  it("rejects structured intents carrying user-text", () => {
    expect(() => parseStructuredIntent({ kind: "user-text", text: "x", locale: "en" })).toThrow(ZodError);
  });

  it("rejects non-uuid ids and out-of-range revisions", () => {
    expect(() =>
      parseComposition({ id: "not-a-uuid", revision: 1, intent: { kind: "social", act: "yes" }, locale: "en", catalogVersion: "catalog.v1" }),
    ).toThrow(ZodError);
    expect(() =>
      parseComposition({ id: ID, revision: 0, intent: { kind: "social", act: "yes" }, locale: "en", catalogVersion: "catalog.v1" }),
    ).toThrow(ZodError);
  });

  it("validates utterances strictly", () => {
    const good = {
      compositionId: ID,
      revision: 2,
      exactText: "I want water.",
      textHash: "1234abcd",
      locale: "en",
      templateVersion: "templates.v1",
      source: "template",
    };
    expect(parseUtterance(good)).toMatchObject({ source: "template" });
    expect(() => parseUtterance({ ...good, textHash: "xyz" })).toThrow(ZodError);
    expect(() => parseUtterance({ ...good, exactText: "" })).toThrow(ZodError);
    expect(() => parseUtterance({ ...good, extra: true })).toThrow(ZodError);
  });
});
