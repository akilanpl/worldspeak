import { describe, expect, it } from "vitest";
import { approveUtterance, createEmptyComposition, isPermitCurrent, issuePermit, reduce } from "../src/index";
import type { Composition } from "../../contracts/src/index";

const ID = "00000000-0000-4000-8000-000000000001";
const ID2 = "00000000-0000-4000-8000-000000000002";

function base(): Composition {
  return createEmptyComposition(ID);
}

describe("reducer + speech approval", () => {
  it("bumps revision on every real change", () => {
    const c0 = base();
    const c1 = reduce(c0, { type: "select-tile", id: "water-want", intent: { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" } }, () => ID2);
    expect(c1.revision).toBe(c0.revision + 1);
    const c2 = reduce(c1, { type: "set-locale", locale: "ta" }, () => ID2);
    expect(c2.revision).toBe(c1.revision + 1);
    const c3 = reduce(c2, { type: "set-polarity", polarity: "do-not-want" }, () => ID2);
    expect(c3.revision).toBe(c2.revision + 1);
    expect(c3.intent).toMatchObject({ polarity: "do-not-want" });
  });

  it("ignores no-op edits without bumping revision", () => {
    const c0 = base();
    expect(reduce(c0, { type: "set-locale", locale: "en" }, () => ID2).revision).toBe(c0.revision);
    const c1 = reduce(c0, { type: "set-polarity", polarity: "want" }, () => ID2);
    expect(c1.revision).toBe(c0.revision); // social intent has no polarity
  });

  it("polarity flip changes the approved sentence", () => {
    const c0 = reduce(base(), { type: "select-tile", id: "w", intent: { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" } }, () => ID2);
    const c1 = reduce(c0, { type: "set-polarity", polarity: "do-not-want" }, () => ID2);
    expect(approveUtterance(c0).exactText).toBe("I want water.");
    expect(approveUtterance(c1).exactText).toBe("I do not want water.");
  });

  it("a permit is current only for its exact revision and hash", () => {
    const c0 = reduce(base(), { type: "select-tile", id: "w", intent: { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" } }, () => ID2);
    const u0 = approveUtterance(c0);
    const permit = issuePermit(u0, "nonce-1", 1000);
    expect(isPermitCurrent(permit, u0)).toBe(true);

    // Stale after any edit (locale change here).
    const c1 = reduce(c0, { type: "set-locale", locale: "ta" }, () => ID2);
    expect(isPermitCurrent(permit, approveUtterance(c1))).toBe(false);

    // Same revision but different text must not pass.
    const tampered = { ...u0, exactText: "I want everything.", textHash: u0.textHash };
    expect(isPermitCurrent(permit, tampered)).toBe(false);
  });
});
