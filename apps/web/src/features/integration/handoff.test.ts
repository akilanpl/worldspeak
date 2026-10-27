import { describe, expect, it } from "vitest";
import {
  decodeHandoff,
  encodeHandoff,
  handoffToComposition,
  snapshotToPayload,
  type HandoffPayload,
} from "./handoff";

function payloadFor(kind: HandoffPayload["intent"]): HandoffPayload {
  return {
    version: 1,
    intent: kind,
    locale: "en",
    source: "perception",
    objectLabel: "water",
    objectCatalogId: "water",
    provenance: "fixture",
  };
}

describe("handoff encode/decode", () => {
  it("roundtrips every intent kind", () => {
    const intents: HandoffPayload["intent"][] = [
      { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" },
      { kind: "request-object", object: { catalogId: "chair", selectedObjectId: null }, polarity: "do-not-want" },
      { kind: "ask-location", object: { catalogId: "phone", selectedObjectId: null } },
      { kind: "request-help", object: { catalogId: "water", selectedObjectId: null } },
      { kind: "request-help", object: null },
      { kind: "social", act: "thank-you" },
      { kind: "user-text", text: "my own words", locale: "en" },
    ];
    for (const intent of intents) {
      const decoded = decodeHandoff(encodeHandoff(payloadFor(intent)));
      expect(decoded?.intent).toEqual(intent);
      expect(decoded?.source).toBe("perception");
      expect(decoded?.provenance).toBe("fixture");
    }
  });

  it("rejects tampered, versioned, and mistyped payloads", () => {
    expect(decodeHandoff(null)).toBeNull();
    expect(decodeHandoff("")).toBeNull();
    expect(decodeHandoff("!!!not-base64!!!")).toBeNull();
    const good = payloadFor({ kind: "social", act: "yes" });
    expect(decodeHandoff(encodeHandoff({ ...good, version: 2 as 1 }))).toBeNull();
    expect(decodeHandoff(encodeHandoff({ ...good, locale: "fr" as "en" }))).toBeNull();
    expect(decodeHandoff(encodeHandoff({ ...good, source: "camera" as "perception" }))).toBeNull();
    expect(decodeHandoff(encodeHandoff({ ...good, provenance: "live-ai" as "fixture" }))).toBeNull();
    expect(decodeHandoff(encodeHandoff({ ...good, objectLabel: "" }))).toBeNull();
    // structurally invalid intent
    const tampered = { ...good, intent: { kind: "request-object" } };
    expect(decodeHandoff(encodeHandoff(tampered as HandoffPayload))).toBeNull();
  });

  it("builds snapshot payloads with selection context", () => {
    const payload = snapshotToPayload(
      {
        intent: { kind: "ask-location", object: { catalogId: "phone", selectedObjectId: null } },
        locale: "en",
      },
      { source: "video", objectLabel: "phone", objectCatalogId: "phone", provenance: "fixture" },
    );
    expect(payload.source).toBe("video");
    expect(decodeHandoff(encodeHandoff(payload))).toEqual(payload);
  });
});

describe("handoffToComposition", () => {
  it("preserves intent and locale with a fresh id and revision", () => {
    let n = 0;
    const ids = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const comp = handoffToComposition(
        payloadFor({
          kind: "request-object",
          object: { catalogId: "water", selectedObjectId: null },
          polarity: "want",
        }),
        () => `id-${n++}`,
      );
      ids.add(comp.id);
      expect(comp.revision).toBe(1);
      expect(comp.locale).toBe("en");
      expect(comp.intent).toEqual({
        kind: "request-object",
        object: { catalogId: "water", selectedObjectId: null },
        polarity: "want",
      });
    }
    // Every handoff mints a new identity: stale speech permits cannot transfer.
    expect(ids.size).toBe(3);
  });

  it("degrades unknown catalog objects to exact user text", () => {
    const comp = handoffToComposition(
      {
        ...payloadFor({
          kind: "request-object",
          object: { catalogId: "nope-not-real", selectedObjectId: null },
          polarity: "want",
        }),
        objectLabel: "mystery thing",
      },
      () => "id-x",
    );
    expect(comp.intent).toEqual({ kind: "user-text", text: "mystery thing", locale: "en" });
  });

  it("drops unknown catalog refs from help intents but keeps the plea", () => {
    const comp = handoffToComposition(
      payloadFor({ kind: "request-help", object: { catalogId: "nope-not-real", selectedObjectId: null } }),
      () => "id-y",
    );
    expect(comp.intent).toEqual({ kind: "request-help", object: null });
  });
});
