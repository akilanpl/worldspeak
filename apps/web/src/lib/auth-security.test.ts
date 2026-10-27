import { describe, expect, it } from "vitest";
import { isSameOriginMutation, safeAuthNext } from "./auth-security";

describe("auth boundaries", () => {
  it("accepts only exact approved callback paths", () => {
    expect(safeAuthNext("/reset-password")).toBe("/reset-password");
    for (const raw of ["//evil.test", "/\\evil.test", "/%2f%2fevil.test", "https://evil.test", "/history?next=evil", "/\nevil", null]) {
      expect(safeAuthNext(raw)).toBe("/history");
    }
  });
  it("denies missing/foreign origins and cross-site mutations", () => {
    const req = (headers: Record<string,string>) => new Request("https://worldspeak.test/api/v1/account", { method: "DELETE", headers });
    expect(isSameOriginMutation(req({}))).toBe(false);
    expect(isSameOriginMutation(req({ origin: "https://evil.test" }))).toBe(false);
    expect(isSameOriginMutation(req({ origin: "https://worldspeak.test", "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginMutation(req({ origin: "https://worldspeak.test" }))).toBe(true);
    expect(isSameOriginMutation(new Request("https://worldspeak.test/"))).toBe(true);
  });
});
