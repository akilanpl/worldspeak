"use client";

import { useState, useSyncExternalStore } from "react";
import type { Composition } from "@worldspeak/contracts";
import Workspace from "@/features/composer/Workspace";
import type { SpeechGateway, VoiceInfo } from "@/lib/speech";
import {
  handoffToComposition,
  readStoredHandoff,
  type HandoffPayload,
} from "./handoff";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `00000000-0000-4000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`;
}

function provenanceNotice(payload: HandoffPayload): { en: string; ta: string } {
  const where = payload.source === "perception" ? "camera" : payload.source === "pictogram" ? "personalized pictogram" : "video";
  // Pictogram wording has no reviewed Tamil translation: retain an honest
  // English source label rather than mislabeling it as video.
  const whereTa = payload.source === "perception" ? "கேமரா" : payload.source === "video" ? "வீடியோ" : "personalized pictogram";
  const kind =
    payload.provenance === "fixture" ? "demo fixture — not a real model" : payload.provenance === "manual" ? "manual human selection — no model inference" : "model detection";
  return {
    en: `From ${where} (${kind}): ${payload.objectLabel} — review the sentence below, then Speak.`,
    ta: `${whereTa} (${kind}): ${payload.objectLabel} — கீழே சரிபார்த்து, பின் பேசுக.`,
  };
}

interface EntryState {
  initial: Composition | undefined;
  notice: { en: string; ta: string } | null;
  invalid: boolean;
}

/**
 * Board entry: saved-message replay (server) takes precedence, then the
 * `?handoff=` payload from camera/video, then an empty board. Handoff
 * failures degrade to an empty board with a notice — never a crash, and
 * never speech: Workspace only speaks on an explicit Speak click.
 */
function ComposerDraft({
  serverInitial,
  handoffKey,
  gatewayFactory,
}: {
  serverInitial?: Composition | undefined;
  /**
   * Session-storage handoff key from `?handoff=`. The parent keys this
   * component by the key, so navigating between handoffs remounts with
   * fresh state and no full reload. Legacy inline payload links are rejected.
   */
  handoffKey?: string | null | undefined;
  /** Test seam: inject a gateway backed by a fake synthesizer. */
  gatewayFactory?: ((listVoices: () => VoiceInfo[]) => SpeechGateway) | undefined;
}) {
  // Resolved once per mount; the parent remounts per handoff key so each
  // navigation starts from a fresh validated payload — never merged state.
  const [entry] = useState<EntryState>(() => {
    if (serverInitial) return { initial: serverInitial, notice: null, invalid: false };
    const raw = handoffKey ?? null;
    const payload = readStoredHandoff(raw);
    if (raw !== null && !payload) {
      return { initial: undefined, notice: null, invalid: true };
    }
    if (!payload) return { initial: undefined, notice: null, invalid: false };
    return {
      initial: handoffToComposition(payload, newId),
      notice: provenanceNotice(payload),
      invalid: false,
    };
  });
  return (
    <>
      {entry.invalid && (
        <p className="notice" role="alert" data-testid="handoff-invalid-notice">
          That communication draft is unavailable or expired. Only tab-local draft keys are accepted. Return to the previous screen or enter your words here.
        </p>
      )}
      {entry.notice && (
        <p className="notice" role="status" data-testid="handoff-provenance-notice">
          <span lang="en">{entry.notice.en}</span> <span lang="ta">{entry.notice.ta}</span>
        </p>
      )}
      <Workspace initial={entry.initial} {...(gatewayFactory ? { gatewayFactory } : {})} />
    </>
  );
}

const subscribeClient = () => () => {};
/** Resolve private drafts only after hydration; server HTML never reads Storage. */
export default function ComposerEntry(props: Parameters<typeof ComposerDraft>[0]) {
  const client = useSyncExternalStore(subscribeClient, () => true, () => false);
  if (!client) return <p role="status">Loading communication board…</p>;
  return <ComposerDraft {...props} />;
}
