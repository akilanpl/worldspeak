import { describe, expect, it } from "vitest";
import { FakeSpeechSynthesis } from "@worldspeak/test-support";
import { approveUtterance, reduce } from "@worldspeak/communication";
import type { Composition } from "@worldspeak/contracts";
import { SpeechGateway, pickVoice, type Speaker, type VoiceInfo } from "@/lib/speech";
import { emptyComposition } from "@worldspeak/test-support";

const EN_VOICE: VoiceInfo = { name: "Test English", lang: "en-US", localService: true, isDefault: true };
const TA_VOICE: VoiceInfo = { name: "Test Tamil", lang: "ta-IN", localService: true, isDefault: false };

function setup(voices: VoiceInfo[] = [EN_VOICE, TA_VOICE]) {
  const fake = new FakeSpeechSynthesis();
  fake.voices = voices.map((v) => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.isDefault }));
  const speaker: Speaker = {
    speakText: (o) => fake.speak({ text: o.text, lang: o.lang, voiceName: o.voiceName, rate: o.rate }),
    cancel: () => fake.cancel(),
  };
  const gateway = new SpeechGateway(speaker, () => voices);
  return { fake, gateway };
}

function waterWant(base: Composition): Composition {
  return reduce(
    base,
    { type: "select-tile", id: "water-want", intent: { kind: "request-object", object: { catalogId: "water", selectedObjectId: null }, polarity: "want" } },
    () => "00000000-0000-4000-8000-000000000099",
  );
}

describe("speech gateway", () => {
  it("stays silent through construction, failed attempts, stop, and duplicates", () => {
    const { fake, gateway } = setup();
    expect(fake.calls).toHaveLength(0);
    gateway.stop();
    expect(fake.calls).toHaveLength(0);
    expect(fake.cancelled).toBe(1);
  });

  it("speaks exactly the current preview once per fresh gesture", () => {
    const { fake, gateway } = setup();
    const comp = waterWant(emptyComposition());
    const utterance = approveUtterance(comp);
    const result = gateway.speakApproved({
      utterance,
      current: comp,
      voiceName: null,
      rate: 1,
      gestureNonce: "gesture-1",
      nowMs: 1000,
    });
    expect(result).toMatchObject({ status: "spoken", text: "I want water." });
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]).toMatchObject({ text: "I want water.", lang: "en-US" });
  });

  it("refuses stale utterances after locale, text, or intent edits", () => {
    const { fake, gateway } = setup();
    const comp = waterWant(emptyComposition());
    const old = approveUtterance(comp);
    const edited = reduce(comp, { type: "set-locale", locale: "ta" }, () => "00000000-0000-4000-8000-000000000098");
    const result = gateway.speakApproved({
      utterance: old,
      current: edited,
      voiceName: null,
      rate: 1,
      gestureNonce: "gesture-2",
      nowMs: 1001,
    });
    expect(result).toMatchObject({ status: "stale" });
    expect(fake.calls).toHaveLength(0);
  });

  it("blocks double invocation of the same gesture and cancels before re-speak", () => {
    const { fake, gateway } = setup();
    const comp = waterWant(emptyComposition());
    const utterance = approveUtterance(comp);
    const args = { utterance, current: comp, voiceName: null as string | null, rate: 1, gestureNonce: "gesture-3", nowMs: 1002 };
    expect(gateway.speakApproved(args).status).toBe("spoken");
    expect(gateway.speakApproved(args).status).toBe("duplicate");
    expect(fake.calls).toHaveLength(1);
    expect(fake.cancelled).toBe(1); // previous queue cancelled before the single speak
  });

  it("never selects an English voice for Tamil silently", () => {
    const { fake, gateway } = setup([EN_VOICE]); // Tamil voice missing on this device
    expect(pickVoice([EN_VOICE], "ta")).toBeNull();
    const comp = reduce(waterWant(emptyComposition()), { type: "set-locale", locale: "ta" }, () => "00000000-0000-4000-8000-000000000097");
    const result = gateway.speakApproved({
      utterance: approveUtterance(comp),
      current: comp,
      voiceName: null,
      rate: 1,
      gestureNonce: "gesture-4",
      nowMs: 1003,
    });
    expect(result.status).toBe("no-voice");
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects a mismatched selected voice instead of cross-language speaking", () => {
    const { fake, gateway } = setup();
    const comp = reduce(waterWant(emptyComposition()), { type: "set-locale", locale: "ta" }, () => "00000000-0000-4000-8000-000000000096");
    const result = gateway.speakApproved({
      utterance: approveUtterance(comp),
      current: comp,
      voiceName: "Test English",
      rate: 1,
      gestureNonce: "gesture-5",
      nowMs: 1004,
    });
    expect(result.status).toBe("no-voice");
    expect(fake.calls).toHaveLength(0);
  });
});
