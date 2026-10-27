interface SpokenCall {
  text: string;
  lang: string;
  voice: string | null;
  rate: number;
}

declare global {
  interface Window {
    __speakCalls: SpokenCall[];
    __cancelCalls: number;
  }
}

export {};
