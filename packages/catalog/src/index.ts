import { z } from "zod";
import { IntentSchema, LocaleSchema } from "@worldspeak/contracts";
import objectsEn from "../data/objects.en.json";
import templatesEn from "../data/templates.en.json";
import templatesTa from "../data/templates.ta.json";
import essentials from "../data/essentials.json";

/**
 * Reviewed bilingual catalog. Single source of truth for objects, templates,
 * and essential tiles. Tamil content is `review-pending` until native review.
 */

export const CATALOG_VERSION = "catalog.v1";
export const OBJECTS_VERSION = "objects.v1";
export const TEMPLATES_VERSION = "templates.v2";
export const ESSENTIALS_VERSION = "essentials.v1";
export const REVIEW_STATUS = "review-pending" as const;

const CatalogObjectSchema = z
  .object({ id: z.string().min(1).max(80), en: z.string().min(1).max(80), ta: z.string().min(1).max(80) })
  .strict();

const TemplateSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: z.enum(["request-object", "ask-location", "request-help", "social"]),
    polarity: z.enum(["want", "do-not-want"]).nullable(),
    act: z.enum(["yes", "no", "thank-you", "please-wait"]).nullable(),
    objectSlot: z.enum(["required", "none"]),
    text: z.string().min(1).max(500),
  })
  .strict();

const TileSchema = z
  .object({
    id: z.string().min(1).max(80),
    category: z.enum(["needs", "help", "comfort", "social"]),
    label: z.object({ en: z.string().min(1).max(80), ta: z.string().min(1).max(80) }).strict(),
    intent: IntentSchema,
  })
  .strict();

export type CatalogObject = z.infer<typeof CatalogObjectSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type EssentialTile = z.infer<typeof TileSchema>;

function mustVersion(doc: { version: string }, expected: string, name: string): void {
  if (doc.version !== expected) {
    throw new Error(`${name} version mismatch: expected ${expected}, got ${doc.version}`);
  }
}

mustVersion(objectsEn as { version: string }, OBJECTS_VERSION, "objects.en");
mustVersion(templatesEn as { version: string }, TEMPLATES_VERSION, "templates.en");
mustVersion(templatesTa as { version: string }, TEMPLATES_VERSION, "templates.ta");
mustVersion(essentials as { version: string }, ESSENTIALS_VERSION, "essentials");

export const OBJECTS: CatalogObject[] = z.array(CatalogObjectSchema).parse(
  (objectsEn as { objects: unknown }).objects,
);

const TEMPLATES_EN = z.array(TemplateSchema).parse((templatesEn as { templates: unknown }).templates);
const TEMPLATES_TA = z.array(TemplateSchema).parse((templatesTa as { templates: unknown }).templates);

export const TEMPLATES: Record<z.infer<typeof LocaleSchema>, Template[]> = {
  en: TEMPLATES_EN,
  ta: TEMPLATES_TA,
};

export const ESSENTIAL_TILES: EssentialTile[] = z.array(TileSchema).parse(
  (essentials as { tiles: unknown }).tiles,
);

const objectById = new Map(OBJECTS.map((o) => [o.id, o]));

export function getObject(catalogId: string): CatalogObject | undefined {
  return objectById.get(catalogId);
}

export function nounFor(catalogId: string, locale: z.infer<typeof LocaleSchema>): string {
  const obj = objectById.get(catalogId);
  if (!obj) throw new Error(`Unknown catalog object: ${catalogId}`);
  return locale === "ta" ? obj.ta : obj.en;
}
