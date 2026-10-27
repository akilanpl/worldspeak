import type { Composition, Intent, Locale, StructuredIntent } from "@worldspeak/contracts";
import { TEMPLATES, TEMPLATES_VERSION, getObject, nounFor } from "@worldspeak/catalog";

/**
 * Deterministic renderer. Only reviewed catalog templates may render.
 * - Unknown catalog IDs reject (throw).
 * - Missing slots fail explicitly (throw) — never guess.
 * - Polarity is structural: want/do-not-want select different templates,
 *   so negation can never flip silently.
 * - user-text is preserved exactly and never rewritten or translated.
 */

export class RenderError extends Error {
  readonly code: "UNKNOWN_OBJECT" | "NO_TEMPLATE" | "UNREVIEWED_SLOT";
  constructor(code: RenderError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface RenderedSentence {
  text: string;
  templateId: string | null;
  slots: Record<string, string>;
  source: "template" | "user-text";
}

/** FNV-1a 32-bit hex — deterministic integrity tag, not a security hash. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function findTemplate(intent: StructuredIntent, locale: Locale) {
  const pool = TEMPLATES[locale];
  return pool.find((t) => {
    if (t.kind !== intent.kind) return false;
    if (intent.kind === "request-object") return t.polarity === intent.polarity && t.objectSlot === "required";
    if (intent.kind === "social") return t.act === intent.act && t.objectSlot === "none";
    if (intent.kind === "ask-location") return t.objectSlot === "required";
    if (intent.kind === "request-help") {
      return intent.object === null ? t.objectSlot === "none" : t.objectSlot === "required";
    }
    return false;
  });
}

export function renderIntent(intent: StructuredIntent, locale: Locale): RenderedSentence {
  const template = findTemplate(intent, locale);
  if (!template) {
    throw new RenderError("NO_TEMPLATE", `No reviewed template for intent kind=${intent.kind} locale=${locale}`);
  }
  const slots: Record<string, string> = {};
  if (template.objectSlot === "required") {
    const ref =
      intent.kind === "request-object" || intent.kind === "ask-location"
        ? intent.object
        : intent.kind === "request-help"
          ? intent.object
          : null;
    if (!ref) throw new RenderError("UNREVIEWED_SLOT", `Template ${template.id} requires an object slot`);
    if (!getObject(ref.catalogId)) {
      throw new RenderError("UNKNOWN_OBJECT", `Unknown catalog object: ${ref.catalogId}`);
    }
    slots["object"] = nounFor(ref.catalogId, locale);
  }
  let text = template.text;
  for (const [k, v] of Object.entries(slots)) text = text.replace(`{${k}}`, v);
  if (text.includes("{") || text.includes("}")) {
    throw new RenderError("UNREVIEWED_SLOT", `Template ${template.id} has unfilled slots`);
  }
  return { text, templateId: template.id, slots, source: "template" };
}

export function renderComposition(comp: Pick<Composition, "intent" | "locale">): RenderedSentence {
  const { intent, locale } = comp;
  if (intent.kind === "user-text") {
    // Exact user text, explicit locale — never translated or rewritten.
    if (intent.locale !== locale) {
      throw new RenderError("UNREVIEWED_SLOT", "User text locale does not match composition locale");
    }
    return { text: intent.text, templateId: null, slots: {}, source: "user-text" };
  }
  const structured: StructuredIntent = intent;
  return renderIntent(structured, locale);
}

export function templateVersion(): string {
  return TEMPLATES_VERSION;
}

export type { Intent };
