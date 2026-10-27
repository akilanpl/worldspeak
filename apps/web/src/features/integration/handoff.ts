import { CATALOG_VERSION, getObject } from "@worldspeak/catalog";
import { parseIntent, type Composition, type Intent, type Locale } from "@worldspeak/contracts";

/**
 * Typed perception/video → composer handoff.
 *
 * An approved intent travels as a URL-safe payload (`?handoff=`), decoded
 * client-side so guest offline use never needs a server roundtrip. Decoding
 * is total: anything malformed, versioned wrong, or structurally invalid
 * yields null and the composer starts empty with a notice. Speech is never
 * part of the handoff — the composer requires a fresh Speak gesture.
 */

export type HandoffSource = "perception" | "video";
export type HandoffProvenance = "fixture" | "model";

export interface HandoffPayload {
  version: 1;
  intent: Intent;
  locale: Locale;
  source: HandoffSource;
  /** Display label captured at approve time (shown in the provenance notice). */
  objectLabel: string;
  /** Reviewed catalog noun when the label maps to one; null stays user text. */
  objectCatalogId: string | null;
  /** Never claim a synthetic detection came from a real model. */
  provenance: HandoffProvenance;
}

export interface HandoffMeta {
  source: HandoffSource;
  objectLabel: string;
  objectCatalogId: string | null;
  provenance: HandoffProvenance;
}

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ta";
}

function isHandoffMeta(value: object): value is HandoffMeta {
  const r = value as Record<string, unknown>;
  return (
    (r["source"] === "perception" || r["source"] === "video") &&
    typeof r["objectLabel"] === "string" &&
    (r["objectLabel"] as string).length > 0 &&
    (r["objectLabel"] as string).length <= 120 &&
    (typeof r["objectCatalogId"] === "string" || r["objectCatalogId"] === null) &&
    (r["provenance"] === "fixture" || r["provenance"] === "model")
  );
}

/** Build a handoff payload from an approved intent snapshot + selection context. */
export function snapshotToPayload(
  snapshot: { intent: Intent; locale: Locale },
  meta: HandoffMeta,
): HandoffPayload {
  return {
    version: 1,
    intent: snapshot.intent,
    locale: snapshot.locale,
    source: meta.source,
    objectLabel: meta.objectLabel,
    objectCatalogId: meta.objectCatalogId,
    provenance: meta.provenance,
  };
}

/**
 * URL-safe encoding for the `?handoff=` parameter. Uses only TextEncoder +
 * btoa: the Buffer polyfill some browser bundles ship does not support the
 * base64url encoding, and relying on it breaks approval in production.
 */
export function encodeHandoff(payload: HandoffPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Total decode: valid payload or null (composer starts empty + notice). */
export function decodeHandoff(raw: string | null | undefined): HandoffPayload | null {
  if (!raw) return null;
  try {
    let padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4 !== 0) padded += "=";
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed !== "object" || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (o["version"] !== 1) return null;
    if (!isLocale(o["locale"])) return null;
    if (!isHandoffMeta(o)) return null;
    const intent = parseIntent(o["intent"]);
    return {
      version: 1,
      intent,
      locale: o["locale"],
      source: o["source"],
      objectLabel: o["objectLabel"],
      objectCatalogId: o["objectCatalogId"],
      provenance: o["provenance"],
    };
  } catch {
    return null;
  }
}

/**
 * Convert a handoff payload into a fresh composer Composition.
 *
 * The composition gets a NEW id and revision 1, so a stale speech permit
 * bound to (compositionId, revision, textHash) can never transfer across the
 * handoff — Speak always needs a fresh gesture on the new draft.
 *
 * Unknown catalog IDs degrade to exact user text (the approved label is
 * preserved visibly) instead of failing render.
 */
export function handoffToComposition(payload: HandoffPayload, newId: () => string): Composition {
  const fallbackText = payload.objectLabel.slice(0, 280) || "…";
  let intent: Intent;
  try {
    intent = parseIntent(payload.intent);
  } catch {
    intent = { kind: "user-text", text: fallbackText, locale: payload.locale };
  }
  intent = degradeUnknownCatalog(intent, fallbackText, payload.locale);
  return {
    id: newId(),
    revision: 1,
    intent,
    locale: payload.locale,
    catalogVersion: CATALOG_VERSION,
  };
}

function degradeUnknownCatalog(intent: Intent, fallbackText: string, locale: HandoffPayload["locale"]): Intent {
  const known = (id: string | null) => id === null || getObject(id) !== undefined;
  switch (intent.kind) {
    case "request-object":
    case "ask-location":
      if (known(intent.object.catalogId)) return intent;
      return { kind: "user-text", text: fallbackText, locale };
    case "request-help":
      if (intent.object === null || known(intent.object.catalogId)) return intent;
      return { kind: "request-help", object: null };
    case "social":
    case "user-text":
      return intent;
  }
}
