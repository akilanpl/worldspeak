import type { Locale } from "@worldspeak/contracts";

/**
 * Perception-prototype UI strings. Tamil here is unreviewed prototype copy
 * (the reviewed catalog nouns come from `@worldspeak/catalog` instead).
 */
const STRINGS = {
  perceptionTitle: { en: "See and choose (prototype)", ta: "பார்த்துத் தேர்வு (முன்மாதிரி)" },
  fixtureBanner: {
    en: "Prototype with synthetic fixtures. No live AI, no uploads, no speech.",
    ta: "செயற்கை மாதிரிகளுடன் முன்மாதிரி. நேரடி AI இல்லை, பதிவேற்றம் இல்லை.",
  },
  openCamera: { en: "Open camera", ta: "கேமராவைத் திற" },
  closeCamera: { en: "Close camera", ta: "கேமராவை மூடு" },
  capturePhoto: { en: "Capture photo", ta: "புகைப்படம் எடு" },
  retake: { en: "Retake", ta: "மீண்டும் எடு" },
  uploadImage: { en: "Upload image", ta: "படத்தைப் பதிவேற்று" },
  useFixtures: { en: "Use synthetic fixtures", ta: "மாதிரிகளைப் பயன்படுத்து" },
  permissionDenied: {
    en: "Camera access was denied. You can upload an image instead — nothing is sent anywhere.",
    ta: "கேமரா அனுமதி மறுக்கப்பட்டது. படத்தைப் பதிவேற்றலாம்.",
  },
  cameraUnavailable: {
    en: "No camera is available on this device. Upload an image instead.",
    ta: "இந்தச் சாதனத்தில் கேமரா இல்லை. படத்தைப் பதிவேற்றவும்.",
  },
  invalidType: { en: "That file is not an image. Choose a PNG or JPEG photo.", ta: "படக் கோப்பைத் தேர்ந்தெடுக்கவும்." },
  tooLarge: { en: "That image is too large (10 MB limit).", ta: "படம் மிகப் பெரியது (10 MB வரம்பு)." },
  loadFailed: { en: "Could not read that image. Try another file.", ta: "படத்தைப் படிக்க முடியவில்லை." },
  previewLabel: { en: "Photo preview", ta: "புகைப்பட முன்னோட்டம்" },
  photoInput: { en: "Take or upload a photo", ta: "புகைப்படம் எடு அல்லது பதிவேற்று" },
  objectsFound: { en: "Objects found", ta: "கண்ட பொருட்கள்" },
  noObjects: {
    en: "No objects detected. Retake the photo, upload another image, or continue with the essential board.",
    ta: "பொருட்கள் எதுவும் கண்டறியப்படவில்லை.",
  },
  ambiguousObjects: {
    en: "Several similar objects were found. Choose exactly one from the list.",
    ta: "பல பொருட்கள் கண்டறியப்பட்டன. ஒன்றைத் தேர்ந்தெடுக்கவும்.",
  },
  chooseOne: { en: "Choose one object to continue.", ta: "தொடர ஒரு பொருளைத் தேர்ந்தெடுக்கவும்." },
  selectedObject: { en: "Selected", ta: "தேர்ந்தது" },
  changeLabel: { en: "Correct the label", ta: "பெயரைத் திருத்து" },
  applyLabel: { en: "Apply label", ta: "பெயரைப் பயன்படுத்து" },
  confidenceUnavailable: { en: "Confidence is unavailable in fixture mode.", ta: "" },
  back: { en: "Back", ta: "பின்" },
  continueAction: { en: "Continue", ta: "தொடர்" },
  iWant: { en: "I want", ta: "எனக்கு வேண்டும்" },
  iDoNotWant: { en: "I do not want", ta: "எனக்கு வேண்டாம்" },
  whereIs: { en: "Where is it?", ta: "அது எங்கே?" },
  helpWith: { en: "Help me with it", ta: "இதற்கு உதவுங்கள்" },
  useOwnWords: { en: "Use my own words", ta: "என் வார்த்தைகள்" },
  approveForComposer: {
    en: "Approve for composer (no speech here)",
    ta: "அமைப்புக்கு ஒப்புதல் (இங்கு பேச்சு இல்லை)",
  },
  sentenceLabel: { en: "Your exact sentence:", ta: "உங்கள் சரியான வாக்கியம்:" },
} satisfies Record<string, Record<Locale, string>>;

export type PerceptionStringKey = keyof typeof STRINGS;

export function pstr(key: PerceptionStringKey, locale: Locale): string {
  return STRINGS[key][locale];
}
