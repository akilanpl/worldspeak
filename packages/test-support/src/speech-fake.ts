/**
 * Minimal fake of the browser SpeechSynthesis surface used by the gateway.
 * Records every speak call so tests can assert zero calls outside a fresh
 * Speak gesture and exactly one exact-text call per gesture.
 */

export interface FakeVoice {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface SpokenCall {
  text: string;
  lang: string;
  voiceName: string | null;
  rate: number;
}

export interface FakeUtteranceInit {
  text: string;
  lang: string;
  voiceName?: string | null;
  rate?: number;
}

export class FakeSpeechSynthesis {
  calls: SpokenCall[] = [];
  cancelled = 0;
  pending: FakeUtteranceInit[] = [];
  voices: FakeVoice[] = [
    { name: "Test English", lang: "en-US", localService: true, default: true },
    { name: "Test Tamil", lang: "ta-IN", localService: true, default: false },
  ];
  listeners: Record<string, Array<() => void>> = {};

  speak(init: FakeUtteranceInit): void {
    this.pending.push(init);
    this.calls.push({
      text: init.text,
      lang: init.lang,
      voiceName: init.voiceName ?? null,
      rate: init.rate ?? 1,
    });
  }

  cancel(): void {
    this.cancelled += 1;
    this.pending = [];
  }

  getVoices(): FakeVoice[] {
    return [...this.voices];
  }

  addEventListener(event: string, cb: () => void): void {
    (this.listeners[event] ??= []).push(cb);
  }

  removeEventListener(event: string, cb: () => void): void {
    this.listeners[event] = (this.listeners[event] ?? []).filter((f) => f !== cb);
  }

  emit(event: "voiceschanged"): void {
    for (const cb of this.listeners[event] ?? []) cb();
  }
}
