import type { Composition, Intent, Locale } from "@worldspeak/contracts";
import { parseComposition } from "@worldspeak/contracts";
import { CATALOG_VERSION } from "@worldspeak/catalog";

/**
 * Immutable composition reducer. Every action returns a validated new
 * composition with revision+1. Any change invalidates speech permits issued
 * for an earlier revision (checked by the speech gateway).
 */

export type Action =
  | { type: "select-tile"; id: string; intent: Intent }
  | { type: "set-polarity"; polarity: "want" | "do-not-want" }
  | { type: "set-locale"; locale: Locale }
  | { type: "set-user-text"; text: string; locale: Locale }
  | { type: "reset" };

export function createEmptyComposition(id: string): Composition {
  return parseComposition({
    id,
    revision: 1,
    intent: { kind: "social", act: "please-wait" },
    locale: "en",
    catalogVersion: CATALOG_VERSION,
  });
}

function next(base: Composition, patch: Partial<Composition>): Composition {
  return parseComposition({ ...base, ...patch, revision: base.revision + 1 });
}

export function reduce(base: Composition, action: Action, newId: () => string): Composition {
  switch (action.type) {
    case "select-tile":
      return next(base, { intent: action.intent });
    case "set-polarity": {
      const intent = base.intent;
      if (intent.kind !== "request-object") return base;
      if (intent.polarity === action.polarity) return base;
      return next(base, { intent: { ...intent, polarity: action.polarity } });
    }
    case "set-locale":
      if (base.locale === action.locale) return base;
      return next(base, { locale: action.locale });
    case "set-user-text":
      return next(base, { intent: { kind: "user-text", text: action.text, locale: action.locale } });
    case "reset":
      return createEmptyComposition(newId());
  }
}
