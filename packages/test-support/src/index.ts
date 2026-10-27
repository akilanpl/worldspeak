import type { Composition } from "@worldspeak/contracts";
import { createEmptyComposition } from "@worldspeak/communication";
import { ESSENTIAL_TILES } from "@worldspeak/catalog";

let counter = 0;

export function nextId(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

export function emptyComposition(): Composition {
  return createEmptyComposition(nextId());
}

export function tileComposition(tileId: string, locale: "en" | "ta" = "en"): Composition {
  const tile = ESSENTIAL_TILES.find((t) => t.id === tileId);
  if (!tile) throw new Error(`Unknown fixture tile: ${tileId}`);
  const base = emptyComposition();
  return { ...base, intent: tile.intent, locale, revision: base.revision + 1 };
}

export * from "./speech-fake";
