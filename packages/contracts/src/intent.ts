import { z } from "zod";
import { IdSchema, LocaleSchema } from "./common";

/**
 * Intent discriminated union (architecture section D).
 * Unknown request keys are rejected via `.strict()` on every object.
 */

const CatalogIdSchema = z.string().min(1).max(80);

export const ObjectRefSchema = z
  .object({
    catalogId: CatalogIdSchema,
    selectedObjectId: IdSchema.nullable(),
  })
  .strict();
export type ObjectRef = z.infer<typeof ObjectRefSchema>;

export const RequestObjectIntentSchema = z
  .object({
    kind: z.literal("request-object"),
    object: ObjectRefSchema,
    polarity: z.enum(["want", "do-not-want"]),
  })
  .strict();

export const AskLocationIntentSchema = z
  .object({
    kind: z.literal("ask-location"),
    object: ObjectRefSchema,
  })
  .strict();

export const RequestHelpIntentSchema = z
  .object({
    kind: z.literal("request-help"),
    object: ObjectRefSchema.nullable(),
  })
  .strict();

export const SocialIntentSchema = z
  .object({
    kind: z.literal("social"),
    act: z.enum(["yes", "no", "thank-you", "please-wait"]),
  })
  .strict();

export const UserTextIntentSchema = z
  .object({
    kind: z.literal("user-text"),
    text: z.string().min(1).max(280),
    locale: LocaleSchema,
  })
  .strict();

export const IntentSchema = z.discriminatedUnion("kind", [
  RequestObjectIntentSchema,
  AskLocationIntentSchema,
  RequestHelpIntentSchema,
  SocialIntentSchema,
  UserTextIntentSchema,
]);
export type Intent = z.infer<typeof IntentSchema>;

export const StructuredIntentSchema = z.discriminatedUnion("kind", [
  RequestObjectIntentSchema,
  AskLocationIntentSchema,
  RequestHelpIntentSchema,
  SocialIntentSchema,
]);
export type StructuredIntent = z.infer<typeof StructuredIntentSchema>;

/** Throwing parse helpers — callers surface INVALID_INPUT on ZodError. */
export function parseIntent(input: unknown): Intent {
  return IntentSchema.parse(input);
}

export function parseStructuredIntent(input: unknown): StructuredIntent {
  return StructuredIntentSchema.parse(input);
}
