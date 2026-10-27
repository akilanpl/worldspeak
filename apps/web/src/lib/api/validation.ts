import { z } from "zod";
import type { ErrorCode } from "@worldspeak/contracts";

/**
 * API input validation (architecture §D). Unknown keys rejected; bounds match
 * the SQL constraints so violations fail fast with INVALID_INPUT before any
 * database round-trip. Owner identity is never accepted from the client.
 */

export const LocaleSchema = z.enum(["en", "ta"]);

const UuidSchema = z.string().uuid();

export const ProfilePatchSchema = z
  .object({ display_name: z.string().max(80) })
  .strict();

export const PreferencesPatchSchema = z
  .object({
    ui_locale: LocaleSchema.optional(),
    communication_locale: LocaleSchema.optional(),
    text_scale: z.number().min(1).max(2).optional(),
    high_contrast: z.boolean().optional(),
    reduce_motion: z.boolean().optional(),
    target_size: z.number().int().min(48).max(96).optional(),
    speech_rate: z.number().min(0.5).max(1.5).optional(),
    voice_uri: z.string().max(500).nullable().optional(),
    history_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((o: Record<string, unknown>) => Object.keys(o).length > 0, { message: "empty patch" });

export const ConversationCreateSchema = z
  .object({
    title: z.string().max(100).default(""),
    language: LocaleSchema.default("en"),
    client_event_id: UuidSchema.optional(),
  })
  .strict();

export const MessageCreateSchema = z
  .object({
    kind: z.enum(["communication", "partner"]).default("communication"),
    text: z.string().min(1).max(1000),
    locale: LocaleSchema,
    intent: z.unknown().optional(),
    origin: z.enum(["template", "user_text", "partner_transcript"]),
    revision: z.number().int().min(1).default(1),
    text_hash: z.string().regex(/^[0-9a-f]{8}$/),
    template_version: z.string().min(1).max(32).nullable().default(null),
    client_event_id: UuidSchema,
  })
  .strict();

export const FavoriteCreateSchema = z
  .object({
    message_id: UuidSchema.optional(),
    // Explicit-save shortcut: persist the current preview + favorite atomically.
    snapshot: MessageCreateSchema.optional(),
    conversation_title: z.string().max(100).default(""),
    language: LocaleSchema.default("en"),
  })
  .strict()
  .refine(
    (o: { message_id?: string | undefined; snapshot?: unknown }) =>
      Boolean(o.message_id) !== Boolean(o.snapshot),
    {
    message: "exactly one of message_id or snapshot",
  });

export const SearchQuerySchema = z
  .object({
    q: z.string().min(1).max(100),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(30).default(30),
  })
  .strict();

/** Escape LIKE metacharacters; NFC-normalize to match stored text. */
export function escapeLike(raw: string): string {
  return raw.normalize("NFC").replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Opaque cursor: base64url of {created_at, id}. */
export function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: string; id: string } {
  const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
  const schema = z.object({ createdAt: z.string(), id: UuidSchema }).strict();
  return schema.parse(parsed);
}

export interface ApiError {
  ok: false;
  requestId: string;
  error: { code: ErrorCode; messageKey: string; retryAfterMs: number | null };
}

export function apiError(requestId: string, code: ErrorCode, messageKey: string): ApiError {
  return { ok: false, requestId, error: { code, messageKey, retryAfterMs: null } };
}

/** Map Postgres/storage errors to contract codes without leaking internals. */
export function toCode(err: unknown): ErrorCode {
  const code = (err as { code?: string } | null)?.code;
  if (code === "23505") return "INVALID_INPUT"; // idempotent conflict
  if (code === "23503") return "NOT_FOUND"; // cross-owner link reads as missing
  if (code === "23514" || code === "P0001") return "INVALID_INPUT";
  if (code === "42501") return "NOT_FOUND"; // RLS denial reads as missing (no oracle)
  return "INVALID_INPUT";
}
