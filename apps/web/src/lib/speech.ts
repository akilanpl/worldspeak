import type { ApprovedUtterance, Composition, Locale } from "@worldspeak/contracts";
import { approveUtterance, issuePermit } from "@worldspeak/communication";

/**
 * Client-only speech gateway. The ONLY place `speechSynthesis.speak` may be
 * reached from is `speakApproved`, called synchronously inside the Speak
 * button's trusted click handler. Everything else (tile selection, locale or
 * voice edits, restore, network events, voice enumeration) only mutates
 * state and can never produce audio.
 */

export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  isDefault: boolean;
}

export interface Speaker {
  speakText(opts: { text: string; lang: string; voiceName: string; rate: number }): void;
  cancel(): void;
}

export class BrowserSpeaker implements Speaker {
  constructor(private synth: SpeechSynthesis) {}
  speakText(opts: { text: string; lang: string; voiceName: string; rate: number }): void {
    const utter = new SpeechSynthesisUtterance(opts.text);
    utter.lang = opts.lang;
    const voice = this.synth.getVoices().find((v) => v.name === opts.voiceName) ?? null;
    if (voice) utter.voice = voice;
    utter.rate = opts.rate;
    this.synth.speak(utter);
  }
  cancel(): void {
    this.synth.cancel();
  }
  static voicesOf(synth: SpeechSynthesis): VoiceInfo[] {
    return synth.getVoices().map((v) => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      isDefault: v.default,
    }));
  }
}

export type SpeakResult =
  | { status: "spoken"; text: string }
  | { status: "stale" }
  | { status: "duplicate" }
  | { status: "no-voice"; reason: string };

/** Locale match, never a silent cross-language fallback. */
export function pickVoice(voices: VoiceInfo[], locale: Locale): VoiceInfo | null {
  const wanted = locale.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(wanted)) ?? null;
}

export function voiceMatches(voice: VoiceInfo, locale: Locale): boolean {
  return voice.lang.toLowerCase().startsWith(locale.toLowerCase());
}

export class SpeechGateway {
  private usedNonces = new Set<string>();
  private speaking = false;

  constructor(
    private speaker: Speaker,
    private listVoices: () => VoiceInfo[],
  ) {}

  voices(): VoiceInfo[] {
    return this.listVoices();
  }

  /**
   * Must be called synchronously in the Speak button's click handler.
   * `utterance` is the exact preview the user approved; `current` is the
   * composition it was approved from. Any mismatch refuses to speak.
   */
  speakApproved(args: {
    utterance: ApprovedUtterance;
    current: Composition;
    voiceName: string | null;
    rate: number;
    gestureNonce: string;
    nowMs: number;
  }): SpeakResult {
    if (this.usedNonces.has(args.gestureNonce)) return { status: "duplicate" };
    this.usedNonces.add(args.gestureNonce);

    const expected = approveUtterance(args.current);
    const permit = issuePermit(args.utterance, args.gestureNonce, args.nowMs);
    const current =
      permit.compositionId === expected.compositionId &&
      permit.revision === expected.revision &&
      permit.textHash === expected.textHash &&
      args.utterance.exactText === expected.exactText &&
      args.utterance.locale === expected.locale;
    if (!current) return { status: "stale" };

    const voice = (args.voiceName ? this.listVoices().find((v) => v.name === args.voiceName) : pickVoice(this.listVoices(), args.current.locale)) ?? null;
    if (!voice) return { status: "no-voice", reason: "No voice available for this language yet. Set up a voice, then press Speak again." };
    if (!voiceMatches(voice, args.current.locale)) {
      return { status: "no-voice", reason: "The selected voice does not match the sentence language. Choose a matching voice." };
    }

    // Fresh gesture: drop anything queued, then speak exactly the preview.
    this.speaker.cancel();
    this.speaker.speakText({ text: args.utterance.exactText, lang: voice.lang, voiceName: voice.name, rate: args.rate });
    this.speaking = true;
    return { status: "spoken", text: args.utterance.exactText };
  }

  /** Voice preview. Also requires its own click — never auto-plays. */
  testVoice(voiceName: string, sampleText: string, lang: string, rate: number): boolean {
    const voice = this.listVoices().find((v) => v.name === voiceName);
    if (!voice) return false;
    this.speaker.cancel();
    this.speaker.speakText({ text: sampleText, lang, voiceName: voice.name, rate });
    return true;
  }

  stop(): void {
    this.speaker.cancel();
    this.speaking = false;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}
