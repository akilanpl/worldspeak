"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Composition } from "@worldspeak/contracts";
import Workspace from "@/features/composer/Workspace";
import type { SpeechGateway, VoiceInfo } from "@/lib/speech";
import { decodeHandoff, handoffToComposition, type HandoffPayload } from "./handoff";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `00000000-0000-4000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`;
}

function provenanceNotice(payload: HandoffPayload): { en: string; ta: string } {
  const where = payload.source === "perception" ? "camera" : "video";
  const kind =
    payload.provenance === "fixture" ? "demo fixture — not a real model" : "model detection";
  return {
    en: `From ${where} (${kind}): ${payload.objectLabel} — review the sentence below, then Speak.`,
    ta: `${where === "camera" ? "கேமரா" : "வீடியோ"} (${kind}): ${payload.objectLabel} — கீழே சரிபார்த்து, பின் பேசுக.`,
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
export default function ComposerEntry({
  serverInitial,
  gatewayFactory,
}: {
  serverInitial?: Composition | undefined;
  /** Test seam: inject a gateway backed by a fake synthesizer. */
  gatewayFactory?: ((listVoices: () => VoiceInfo[]) => SpeechGateway) | undefined;
}) {
  const params = useSearchParams();
  const [entry] = useState<EntryState>(() => {
    if (serverInitial) return { initial: serverInitial, notice: null, invalid: false };
    const payload = decodeHandoff(params.get("handoff"));
    if (params.get("handoff") !== null && !payload) {
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
          That camera/video link was invalid or tampered with — starting with an empty board.
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
