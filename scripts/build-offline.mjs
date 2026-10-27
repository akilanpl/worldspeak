#!/usr/bin/env node
/* eslint-disable no-console -- CLI build script reports to stdout */
/**
 * Generates the static offline board from the single-source catalog JSON.
 * The embedded renderer is a generated projection of packages/communication
 * (same template tables, same slot-substitution rule); parity is enforced by
 * apps/web/src/lib/offline-parity.test.ts against board.expected.json.
 * Run via `pnpm build` before `next build`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "packages/catalog/data");
const outDir = join(root, "apps/web/public/offline");
const genDir = join(root, "apps/web/src/generated");

const objects = JSON.parse(readFileSync(join(dataDir, "objects.en.json"), "utf8")).objects;
const templatesEn = JSON.parse(readFileSync(join(dataDir, "templates.en.json"), "utf8"));
const templatesTa = JSON.parse(readFileSync(join(dataDir, "templates.ta.json"), "utf8"));
const essentials = JSON.parse(readFileSync(join(dataDir, "essentials.json"), "utf8"));

function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const fingerprint = fnv(JSON.stringify([objects, templatesEn, templatesTa, essentials]));
const cacheVersion = `v1-${fingerprint}`;
const assets = ["/offline/index.html", "/offline/board.js", "/offline/board.css", "/offline/board.v1.json"];

const DATA = { objects, templates: { en: templatesEn.templates, ta: templatesTa.templates }, tiles: essentials.tiles };

const boardJs = `/*! WorldSpeak offline board — generated from catalog ${essentials.version}; do not edit by hand. */
"use strict";
const DATA = ${JSON.stringify(DATA)};
const state = { tileId: null, locale: "en", polarity: null, customText: null, voiceName: "", rate: 1, notice: "" };

function noun(id, locale) {
  const o = DATA.objects.find((x) => x.id === id);
  if (!o) throw new Error("Unknown object " + id);
  return locale === "ta" ? o.ta : o.en;
}
function findTemplate(intent, locale) {
  return DATA.templates[locale].find((tm) => {
    if (tm.kind !== intent.kind) return false;
    if (intent.kind === "request-object") return tm.polarity === intent.polarity;
    if (intent.kind === "social") return tm.act === intent.act;
    if (intent.kind === "ask-location") return tm.objectSlot === "required";
    if (intent.kind === "request-help") return intent.object === null ? tm.objectSlot === "none" : tm.objectSlot === "required";
    return false;
  }) || null;
}
function renderCurrent() {
  const tile = DATA.tiles.find((x) => x.id === state.tileId);
  if (state.customText) return { text: state.customText, meta: "user-text · " + state.locale };
  if (!tile) return null;
  const intent = tile.intent.kind === "request-object" && state.polarity
    ? { kind: "request-object", object: tile.intent.object, polarity: state.polarity }
    : tile.intent;
  const tm = findTemplate(intent, state.locale);
  if (!tm) return { text: "", meta: "no template", error: true };
  let text = tm.text;
  if (tm.objectSlot === "required") text = text.split("{object}").join(noun(intent.object.catalogId, state.locale));
  const chips = [intent.kind];
  if (intent.kind === "request-object") chips.push(intent.polarity);
  if (intent.kind === "social") chips.push(intent.act);
  if (intent.object) chips.push(intent.object.catalogId);
  return { text, meta: chips.join(" · ") + " · " + state.locale };
}
function pickVoice(voices, locale) {
  return voices.find((v) => (v.lang || "").toLowerCase().indexOf(locale) === 0) || null;
}
function refreshVoices() {
  const sel = document.getElementById("voice");
  if (!sel || !window.speechSynthesis) return;
  sel.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "";
  auto.textContent = "Automatic (match language)";
  sel.appendChild(auto);
  for (const v of window.speechSynthesis.getVoices()) {
    const o = document.createElement("option");
    o.value = v.name;
    o.textContent = v.name + " (" + v.lang + ")";
    if (state.voiceName === v.name) o.selected = true;
    sel.appendChild(o);
  }
}
if (window.speechSynthesis && !window.__wsVoices) {
  window.__wsVoices = true;
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}
function speakCurrent() {
  // ONLY invoked from the Speak button click handler with current state.
  try {
    const r = renderCurrent();
    if (!r || !r.text || r.error) { setNotice("Review the preview, then press Speak again."); return; }
    const synth = window.speechSynthesis;
    if (!synth) { setNotice("Speech is unavailable on this device — the large text above is the message."); return; }
    const voices = synth.getVoices();
    const chosen = (state.voiceName && voices.find((v) => v.name === state.voiceName)) || pickVoice(voices, state.locale);
    if (!chosen || (chosen.lang || "").toLowerCase().indexOf(state.locale) !== 0) {
      setNotice("No matching voice for this language. Showing large text instead — no other voice will be substituted.");
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(r.text);
    u.lang = chosen.lang; u.voice = chosen; u.rate = state.rate;
    synth.speak(u);
    setNotice(state.locale === "ta" ? "முன்னோட்டம் பேசப்படுகிறது." : "Speaking the exact preview.");
  } catch (e) { setNotice("Speech failed. The text above remains the message."); }
}
function setNotice(msg) { state.notice = msg; render(); }
function el(tag, attrs, text) {
  const n = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) { if (k === "onclick") n.addEventListener("click", attrs[k]); else n.setAttribute(k, attrs[k]); }
  if (text != null) n.textContent = text;
  return n;
}
function render() {
  const root = document.getElementById("board");
  root.innerHTML = "";
  const cats = ["needs", "help", "comfort", "social"];
  for (const cat of cats) {
    root.appendChild(el("h2", null, cat));
    const ul = el("ul", { class: "tile-grid" });
    for (const tile of DATA.tiles.filter((x) => x.category === cat)) {
      const li = document.createElement("li");
      const b = el("button", { type: "button", class: "tile" });
      if (state.tileId === tile.id && !state.customText) b.setAttribute("aria-pressed", "true");
      else b.setAttribute("aria-pressed", "false");
      b.textContent = tile.label[state.locale] || tile.label.en;
      b.addEventListener("click", () => { state.tileId = tile.id; state.customText = null; state.polarity = null; state.notice = ""; render(); });
      li.appendChild(b); ul.appendChild(li);
    }
    root.appendChild(ul);
  }
  const tile = DATA.tiles.find((x) => x.id === state.tileId);
  if (tile && tile.intent.kind === "request-object") {
    const row = el("div", { class: "btn-row" });
    for (const p of ["want", "do-not-want"]) {
      const b = el("button", { type: "button", class: "btn btn-secondary" }, p === "want" ? "I want" : "I do not want");
      b.setAttribute("aria-pressed", (state.polarity || tile.intent.polarity) === p ? "true" : "false");
      b.addEventListener("click", () => { state.polarity = p; state.customText = null; state.notice = ""; render(); });
      row.appendChild(b);
    }
    root.appendChild(row);
  }
  const locRow = el("div", { class: "btn-row" });
  for (const loc of ["en", "ta"]) {
    const b = el("button", { type: "button", class: "btn btn-secondary" }, loc === "en" ? "English" : "தமிழ்");
    b.setAttribute("aria-pressed", state.locale === loc ? "true" : "false");
    b.addEventListener("click", () => { state.locale = loc; state.customText = null; state.notice = ""; document.documentElement.lang = loc; render(); });
    locRow.appendChild(b);
  }
  root.appendChild(locRow);
  const vRow = el("div", { class: "btn-row" });
  const sel = document.createElement("select");
  sel.setAttribute("id", "voice");
  sel.setAttribute("aria-label", "Voice");
  sel.addEventListener("change", () => { state.voiceName = sel.value || ""; });
  vRow.appendChild(sel);
  const tb = el("button", { type: "button", class: "btn btn-secondary" }, "Test voice");
  tb.addEventListener("click", () => {
    // Own click gesture — previews the selected voice, never the composition.
    const synth = window.speechSynthesis;
    if (!synth) { setNotice("Speech is unavailable on this device."); return; }
    const voices = synth.getVoices();
    const chosen = (state.voiceName && voices.find((v) => v.name === state.voiceName)) || pickVoice(voices, state.locale);
    if (!chosen || (chosen.lang || "").toLowerCase().indexOf(state.locale) !== 0) {
      setNotice("No matching voice for this language. Showing large text instead.");
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(state.locale === "ta" ? "எனக்கு தண்ணீர் வேண்டும்." : "I want water.");
    u.lang = chosen.lang; u.voice = chosen;
    synth.speak(u);
  });
  vRow.appendChild(tb);
  root.appendChild(vRow);
  refreshVoices();
  const ta = el("textarea", { id: "own", class: "field", rows: "2", maxlength: "280" });
  ta.setAttribute("aria-label", "Type your own exact sentence");
  root.appendChild(ta);
  const useBtn = el("button", { type: "button", class: "btn btn-secondary" }, "Use this sentence");
  useBtn.addEventListener("click", () => {
    const v = ta.value.trim();
    if (!v) return;
    state.customText = v; state.tileId = null; state.notice = ""; render();
  });
  root.appendChild(useBtn);
  const prev = el("div", { class: "preview" });
  const r = renderCurrent();
  prev.appendChild(el("p", { class: "status" }, "Exact sentence to speak:"));
  if (r && r.text && !r.error) {
    const s = el("p", { class: "preview-sentence" }, r.text);
    s.setAttribute("lang", state.locale);
    prev.appendChild(s);
    prev.appendChild(el("p", { class: "preview-meta" }, r.meta));
  } else {
    prev.appendChild(el("p", { class: "notice" }, "Choose a tile or type a sentence to preview it here."));
  }
  const speakBtn = el("button", { type: "button", class: "btn" }, state.locale === "ta" ? "இந்த வாக்கியத்தைப் பேசுக" : "Speak this sentence");
  speakBtn.addEventListener("click", () => speakCurrent());
  const stopBtn = el("button", { type: "button", class: "btn btn-secondary" }, state.locale === "ta" ? "நிறுத்து" : "Stop");
  stopBtn.addEventListener("click", () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); setNotice("Stopped."); });
  const row2 = el("div", { class: "btn-row" });
  row2.appendChild(speakBtn); row2.appendChild(stopBtn);
  prev.appendChild(row2);
  if (state.notice) prev.appendChild(el("p", { class: "notice", role: "status" }, state.notice));
  root.appendChild(prev);
  const hidden = () => { if (document.visibilityState === "hidden" && window.speechSynthesis) window.speechSynthesis.cancel(); };
  document.removeEventListener("visibilitychange", window.__wsHidden || (() => {}));
  window.__wsHidden = hidden;
  document.addEventListener("visibilitychange", hidden);
}
document.addEventListener("DOMContentLoaded", render);
`;

const boardCss = `/* Generated offline board styles — mirrors app tokens. */
:root{--bg:#f6f1e7;--surface:#fffdf8;--ink:#1b2740;--ink-soft:#3c4763;--teal:#0f766e;--teal-dark:#0b5a55;--amber:#b45309;--line:#d8cfbc;--radius:12px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Tamil","Latha","Nirmala UI",sans-serif;line-height:1.5}
:focus-visible{outline:3px solid var(--teal);outline-offset:2px;border-radius:4px}
main{max-width:60rem;margin:0 auto;padding:1rem}
.tile-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(7.5rem,1fr));gap:.5rem;list-style:none;margin:0;padding:0}
.tile{min-height:3rem;padding:.75rem .5rem;font-size:1rem;font-weight:600;background:var(--surface);color:var(--ink);border:2px solid var(--line);border-radius:var(--radius);cursor:pointer}
.tile[aria-pressed="true"]{border-color:var(--teal);background:#e6f4f1}
.preview{border:2px solid var(--teal);border-radius:var(--radius);padding:1rem;margin:.75rem 0;background:#fff}
.preview-sentence{font-size:clamp(1.5rem,4vw,2rem);font-weight:700;margin:0}
.preview-meta,.status{color:var(--ink-soft)}
.btn{min-height:3rem;padding:.75rem 1.25rem;font-size:1.0625rem;font-weight:700;border-radius:var(--radius);border:2px solid var(--teal);background:var(--teal);color:#fff;cursor:pointer;margin:.25rem .25rem .25rem 0}
.btn-secondary{background:var(--surface);color:var(--ink)}
.btn-row{margin:.5rem 0}
.notice{border-left:6px solid var(--amber);padding:.5rem .75rem;margin:.5rem 0;background:#fdf3e3;border-radius:0 8px 8px 0}
textarea.field{font:inherit;width:100%;min-height:4.5rem;border:2px solid var(--line);border-radius:8px;padding:.5rem}
`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0f766e">
<title>WorldSpeak — offline board</title>
<link rel="stylesheet" href="/offline/board.css">
</head>
<body>
<main>
<h1>WorldSpeak — offline board</h1>
<p class="status">No sign-in, no network, no cloud. Speech uses this device's voices only.</p>
<div id="board"><p class="status">Loading board… (enable JavaScript; no network needed after first visit.)</p></div>
<noscript><p>WorldSpeak offline board needs JavaScript for tile selection and speech. Tiles and sentences are listed in the app when online.</p></noscript>
</main>
<script src="/offline/board.js"></script>
</body>
</html>
`;

// Expected renderings for the parity test (React engine vs generated board).
const expected = {};
for (const tile of essentials.tiles) {
  const find = (locale) => {
    const pool = locale === "ta" ? templatesTa.templates : templatesEn.templates;
    const tm = pool.find((x) => {
      if (x.kind !== tile.intent.kind) return false;
      if (tile.intent.kind === "request-object") return x.polarity === tile.intent.polarity;
      if (tile.intent.kind === "social") return x.act === tile.intent.act;
      if (tile.intent.kind === "ask-location") return x.objectSlot === "required";
      if (tile.intent.kind === "request-help")
        return tile.intent.object === null ? x.objectSlot === "none" : x.objectSlot === "required";
      return false;
    });
    let text = tm.text;
    if (tm.objectSlot === "required") {
      const obj = objects.find((o) => o.id === tile.intent.object.catalogId);
      text = text.split("{object}").join(locale === "ta" ? obj.ta : obj.en);
    }
    return text;
  };
  expected[tile.id] = { en: find("en"), ta: find("ta") };
}

mkdirSync(outDir, { recursive: true });
mkdirSync(genDir, { recursive: true });
writeFileSync(join(outDir, "board.js"), boardJs);
writeFileSync(join(outDir, "board.css"), boardCss);
writeFileSync(join(outDir, "index.html"), indexHtml);
writeFileSync(join(outDir, "board.v1.json"), JSON.stringify({ cacheVersion, assets }, null, 2) + "\n");
writeFileSync(join(genDir, "board.expected.json"), JSON.stringify({ cacheVersion, expected }, null, 2) + "\n");
console.log(`offline board generated: cacheVersion=${cacheVersion} tiles=${essentials.tiles.length}`);
