import type { ApprovedUtterance, Composition } from "@worldspeak/contracts";
import { renderComposition, templateVersion, textHash } from "./render";

/**
 * Speech authorization rules shared by the React gateway and the static
 * offline board. A permit is valid only for the exact
 * (compositionId, revision, textHash) it was issued for.
 */

export interface SpeechPermit {
  compositionId: string;
  revision: number;
  textHash: string;
  locale: string;
  issuedAtMs: number;
  gestureNonce: string;
}

export function approveUtterance(comp: Composition): ApprovedUtterance {
  const rendered = renderComposition(comp);
  return {
    compositionId: comp.id,
    revision: comp.revision,
    exactText: rendered.text,
    textHash: textHash(rendered.text),
    locale: comp.locale,
    templateVersion: rendered.templateId ? templateVersion() : null,
    source: rendered.source,
  };
}

export function issuePermit(utterance: ApprovedUtterance, gestureNonce: string, nowMs: number): SpeechPermit {
  return {
    compositionId: utterance.compositionId,
    revision: utterance.revision,
    textHash: utterance.textHash,
    locale: utterance.locale,
    issuedAtMs: nowMs,
    gestureNonce,
  };
}

/**
 * The gateway must call this inside the trusted Speak handler.
 * Recomputes the hash from the presented text so same-hash tampering
 * with different text (or locale) cannot validate.
 */
export function isPermitCurrent(permit: SpeechPermit, current: ApprovedUtterance): boolean {
  return (
    permit.compositionId === current.compositionId &&
    permit.revision === current.revision &&
    permit.textHash === current.textHash &&
    permit.locale === current.locale &&
    textHash(current.exactText) === permit.textHash
  );
}
