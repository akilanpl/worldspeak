import { z } from "zod";
import { IdSchema, LocaleSchema } from "./common";
import { IntentSchema } from "./intent";

/**
 * Composition is the editable draft; ApprovedUtterance is the immutable
 * snapshot a fresh Speak gesture authorizes (architecture section E).
 * Any edit to locale, object, intent, text, template, or voice increments
 * revision and invalidates pending speech permits.
 */

export const CompositionSchema = z
  .object({
    id: IdSchema,
    revision: z.number().int().min(1),
    intent: IntentSchema,
    locale: LocaleSchema,
    catalogVersion: z.string().min(1).max(32),
  })
  .strict();
export type Composition = z.infer<typeof CompositionSchema>;

export const TextHashSchema = z.string().regex(/^[0-9a-f]{8}$/);

export const ApprovedUtteranceSchema = z
  .object({
    compositionId: IdSchema,
    revision: z.number().int().min(1),
    exactText: z.string().min(1).max(1000),
    textHash: TextHashSchema,
    locale: LocaleSchema,
    templateVersion: z.string().min(1).max(32).nullable(),
    source: z.enum(["template", "user-text"]),
  })
  .strict();
export type ApprovedUtterance = z.infer<typeof ApprovedUtteranceSchema>;

export function parseComposition(input: unknown): Composition {
  return CompositionSchema.parse(input);
}

export function parseUtterance(input: unknown): ApprovedUtterance {
  return ApprovedUtteranceSchema.parse(input);
}
