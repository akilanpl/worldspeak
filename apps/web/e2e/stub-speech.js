/* Playwright stub: deterministic speechSynthesis spy. Loaded via addInitScript. */
window.__speakCalls = [];
window.__cancelCalls = 0;
window.SpeechSynthesisUtterance = function (text) {
  this.text = text || "";
  this.lang = "";
  this.voice = null;
  this.rate = 1;
};
Object.defineProperty(window, "speechSynthesis", {
  value: {
    _voices: [
      { name: "Stub English", lang: "en-US", localService: true, default: true },
      { name: "Stub Tamil", lang: "ta-IN", localService: true, default: false },
    ],
    getVoices() {
      return this._voices;
    },
    speak(u) {
      window.__speakCalls.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.name : null, rate: u.rate });
    },
    cancel() {
      window.__cancelCalls += 1;
    },
    addEventListener() {},
    removeEventListener() {},
  },
  configurable: true,
});
