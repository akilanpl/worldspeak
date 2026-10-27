import type { Locale } from "@worldspeak/contracts";

/** UI chrome strings for this slice, complete in English and Tamil. */

export const UI_LANGS = ["en", "ta"] as const;
export type UiLang = (typeof UI_LANGS)[number];

const STRINGS = {
  title: { en: "WorldSpeak", ta: "உலகப்பேச்சு" },
  tagline: {
    en: "Point, preview, then speak — your words, your control.",
    ta: "சுட்டிக்காட்டி, முன்னோட்டமிட்டு, பின் பேசுங்கள்.",
  },
  essentials: { en: "Essential phrases", ta: "அத்தியாவசிய சொற்றொடர்கள்" },
  composer: { en: "Composer and preview", ta: "அமைப்பு மற்றும் முன்னோட்டம்" },
  settings: { en: "Settings and voice", ta: "அமைப்புகள் மற்றும் குரல்" },
  previewLabel: { en: "Exact sentence to speak:", ta: "பேச வேண்டிய சரியான வாக்கியம்:" },
  speak: { en: "Speak this sentence", ta: "இந்த வாக்கியத்தைப் பேசுக" },
  stop: { en: "Stop", ta: "நிறுத்து" },
  action: { en: "Action", ta: "செயல்" },
  want: { en: "I want", ta: "எனக்கு வேண்டும்" },
  doNotWant: { en: "I do not want", ta: "எனக்கு வேண்டாம்" },
  language: { en: "Sentence language", ta: "வாக்கிய மொழி" },
  voice: { en: "Voice", ta: "குரல்" },
  autoVoice: { en: "Automatic (match language)", ta: "தானியங்கி (மொழிக்கு ஏற்ப)" },
  testVoice: { en: "Test voice", ta: "குரலைச் சோதி" },
  rate: { en: "Speech rate", ta: "பேச்சு வேகம்" },
  typeSentence: { en: "Or type your own exact sentence:", ta: "அல்லது உங்கள் வாக்கியத்தைத் தட்டச்சு செய்க:" },
  useSentence: { en: "Use this sentence", ta: "இந்த வாக்கியத்தைப் பயன்படுத்துக" },
  textSize: { en: "Text size", ta: "எழுத்து அளவு" },
  contrast: { en: "High contrast", ta: "உயர் மாறுபாடு" },
  motion: { en: "Reduce motion", ta: "அசைவைக் குறை" },
  on: { en: "On", ta: "ஆன்" },
  off: { en: "Off", ta: "ஆஃப்" },
  offlineTitle: { en: "Offline board", ta: "ஆஃப்லைன் பலகை" },
  offlineReady: { en: "Offline ready — the board works without internet.", ta: "ஆஃப்லைன் தயார்." },
  offlinePreparing: {
    en: "Preparing offline board… keep this page open once while online.",
    ta: "ஆஃப்லைன் பலகை தயாராகிறது…",
  },
  openOffline: { en: "Open offline board", ta: "ஆஃப்லைன் பலகையைத் திற" },
  spoken: { en: "Speaking the exact preview.", ta: "முன்னோட்டம் பேசப்படுகிறது." },
  stopped: { en: "Speech stopped.", ta: "பேச்சு நிறுத்தப்பட்டது." },
  stalePreview: { en: "Preview changed — review it, then press Speak again.", ta: "முன்னோட்டம் மாறியது — மீண்டும் பேசுக." },
  futureTitle: { en: "Coming in later phases", ta: "பின்னர் வரும்" },
  futureBody: {
    en: "Sign-in, saved history, camera, and assisted wording are not part of this local slice. The essential board below works fully offline.",
    ta: "இந்தப் பதிப்பில் உள்நுழைவு, வரலாறு, கேமரா இல்லை. கீழே உள்ள பலகை ஆஃப்லைனில் வேலை செய்யும்.",
  },
} satisfies Record<string, Record<Locale, string>>;

export type UiKey = keyof typeof STRINGS;

export function uiString(key: UiKey, lang: UiLang): string {
  return STRINGS[key][lang];
}
