import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  ConversationCreateSchema,
  FavoriteCreateSchema,
  MessageCreateSchema,
  PreferencesPatchSchema,
  ProfilePatchSchema,
  SearchQuerySchema,
  decodeCursor,
  encodeCursor,
  escapeLike,
  toCode,
} from "@/lib/api/validation";

describe("api validation", () => {
  it("rejects unknown keys and out-of-range values", () => {
    expect(() => ProfilePatchSchema.parse({ display_name: "A", owner_id: "spoof" })).toThrow(ZodError);
    expect(() => ProfilePatchSchema.parse({ display_name: "x".repeat(81) })).toThrow(ZodError);
    expect(() => PreferencesPatchSchema.parse({})).toThrow(ZodError);
    expect(() => PreferencesPatchSchema.parse({ target_size: 20 })).toThrow(ZodError);
    expect(() => PreferencesPatchSchema.parse({ history_enabled: true, admin: true })).toThrow(ZodError);
    expect(() => MessageCreateSchema.parse({
      text: "", locale: "en", origin: "template", text_hash: "zzzzzzzz",
      client_event_id: "00000000-0000-4000-8000-000000000001",
    })).toThrow(ZodError);
    expect(() => ConversationCreateSchema.parse({ title: "x".repeat(101) })).toThrow(ZodError);
  });

  it("requires exactly one of message_id or snapshot for favorites", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(() => FavoriteCreateSchema.parse({})).toThrow(ZodError);
    expect(() => FavoriteCreateSchema.parse({ message_id: id, snapshot: {
      text: "Hi", locale: "en", origin: "template", text_hash: "1234abcd", client_event_id: id,
    } })).toThrow(ZodError);
  });

  it("bounds search queries", () => {
    expect(() => SearchQuerySchema.parse({ q: "" })).toThrow(ZodError);
    expect(() => SearchQuerySchema.parse({ q: "x".repeat(101) })).toThrow(ZodError);
    expect(SearchQuerySchema.parse({ q: "water" }).limit).toBe(30);
  });

  it("escapes LIKE metacharacters and normalizes", () => {
    expect(escapeLike("100%_x\\y")).toBe("100\\%\\_x\\\\y");
    expect(escapeLike("தண்ணீர்")).toBe("தண்ணீர்".normalize("NFC"));
  });

  it("round-trips opaque cursors and rejects forged ones", () => {
    const c = encodeCursor("2026-10-27T00:00:00Z", "00000000-0000-4000-8000-000000000001");
    expect(decodeCursor(c)).toEqual({
      createdAt: "2026-10-27T00:00:00Z",
      id: "00000000-0000-4000-8000-000000000001",
    });
    expect(() => decodeCursor("!!!")).toThrow();
    expect(() => decodeCursor(encodeCursor("x", "not-a-uuid"))).toThrow();
  });

  it("maps storage errors without leaking internals or oracles", () => {
    expect(toCode({ code: "23503" })).toBe("NOT_FOUND");
    expect(toCode({ code: "42501" })).toBe("NOT_FOUND");
    expect(toCode({ code: "23505" })).toBe("INVALID_INPUT");
    expect(toCode(new Error("boom"))).toBe("INVALID_INPUT");
  });
});
