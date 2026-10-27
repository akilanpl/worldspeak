"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OBJECTS } from "@worldspeak/catalog";
import type { Locale } from "@worldspeak/contracts";
import IntentPanel from "../perception/IntentPanel";
import { handoffHref, snapshotToPayload } from "../integration/handoff";
import { loadLocalImage, MAX_PICTOGRAMS, MAX_TOTAL_BYTES } from "./media";

interface Pictogram { id: string; url: string; bytes: number; meaning: string; description: string; catalogId: string | null }

export default function PictogramBoard() {
  const [items, setItems] = useState<Pictogram[]>([]);
  const itemsRef = useRef<Pictogram[]>([]);
  const pending = useRef(0);
  const activeRead = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [meaning, setMeaning] = useState("");
  const [description, setDescription] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Pictogram | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [href, setHref] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [selected?.id]);
  useEffect(() => () => {
    pending.current++;
    activeRead.current?.abort();
    for (const item of itemsRef.current) URL.revokeObjectURL(item.url);
  }, []);

  async function create() {
    if (!file || !meaning.trim() || !description.trim() || busy) return;
    setError(null);
    setHref(null);
    if (itemsRef.current.length >= MAX_PICTOGRAMS || itemsRef.current.reduce((sum, item) => sum + item.bytes, 0) + file.size > MAX_TOTAL_BYTES) {
      setError("This board holds at most 8 images and 8 MiB. Delete an image first."); return;
    }
    const request = ++pending.current;
    activeRead.current?.abort();
    const controller = new AbortController();
    activeRead.current = controller;
    setBusy(true);
    try {
      const url = await loadLocalImage(file, controller.signal);
      if (pending.current !== request) { URL.revokeObjectURL(url); return; }
      const item: Pictogram = { id: crypto.randomUUID(), url, bytes: file.size, meaning, description, catalogId: catalogId || null };
      itemsRef.current = [...itemsRef.current, item];
      setItems(itemsRef.current);
      setFile(null); setMeaning(""); setDescription(""); setCatalogId("");
      formRef.current?.reset();
    } catch (cause) {
      if (pending.current === request) setError(cause instanceof Error ? cause.message : "Unable to read image.");
    } finally {
      if (pending.current === request) { setBusy(false); activeRead.current = null; }
    }
  }

  function remove(item: Pictogram) {
    URL.revokeObjectURL(item.url);
    itemsRef.current = itemsRef.current.filter((entry) => entry.id !== item.id);
    setItems(itemsRef.current);
    if (selected?.id === item.id) setSelected(null);
    setHref(null);
  }

  return <>
    <h1 ref={headingRef} tabIndex={-1}>Personal pictograms</h1>
    <p>Choose your own image and meaning. Images stay in memory on this page only; leaving or reloading deletes them. Nothing is uploaded or sent to a model.</p>
    <p>PNG, JPEG or WebP, up to 2 MiB and 4 million pixels each. Up to 8 images and 8 MiB total.</p>
    {selected ? <>
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob only, never an optimization upload */}
      <img src={selected.url} alt={selected.description} style={{ maxWidth: "100%", width: 240, maxHeight: 240, objectFit: "contain" }} />
      <p>Human-assigned meaning: {selected.meaning}. Custom words stay exact and are never translated. Choose your sentence language explicitly.</p>
      <IntentPanel key={selected.id} locale={locale} onLocaleChange={setLocale}
        object={{ labelEn: selected.meaning, labelTa: null, catalogId: selected.catalogId }}
        onBack={() => setSelected(null)} onApprove={(snapshot) => {
          setHref(handoffHref(snapshotToPayload(snapshot, { source: "pictogram", objectLabel: selected.meaning.slice(0, 120), objectCatalogId: selected.catalogId, provenance: "manual" })));
          setSelected(null);
        }} />
    </> : <>
      <form ref={formRef} className="panel" onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
          <legend>Create a pictogram</legend>
          <label className="field" htmlFor="pictogram-file">Local image</label>
          <input id="pictogram-file" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }} />
          <label className="field" htmlFor="pictogram-meaning">My exact meaning or words</label>
          <textarea id="pictogram-meaning" required maxLength={280} value={meaning} onChange={(event) => setMeaning(event.target.value)} />
          <label className="field" htmlFor="pictogram-description">Image description for accessibility</label>
          <input id="pictogram-description" required maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} />
          <label className="field" htmlFor="pictogram-concept">Optional catalog concept for sentence templates</label>
          <select id="pictogram-concept" value={catalogId} onChange={(event) => setCatalogId(event.target.value)}>
            <option value="">Use only my exact words</option>
            {OBJECTS.map((object) => <option key={object.id} value={object.id}>{object.en}</option>)}
          </select>
          <p>A catalog mapping enables reviewed sentence templates. Your own wording remains available. Tamil catalog wording is review-pending.</p>
          <button type="submit" className="btn" disabled={!file || !meaning.trim() || !description.trim()}>Create pictogram</button>
        </fieldset>
        {busy && <><p role="status">Reading local image…</p><button type="button" className="btn btn-secondary" onClick={() => { pending.current++; activeRead.current?.abort(); activeRead.current = null; setBusy(false); }}>Cancel reading</button></>}
        {error && <p role="alert" data-testid="pictogram-error">{error}</p>}
      </form>
      <section aria-label="My pictograms">
        <h2>My pictograms ({items.length})</h2>
        {items.length === 0 && <p>No pictograms yet.</p>}
        {items.map((item) => <article className="panel" key={item.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- bounded local blob */}
          <img src={item.url} alt={item.description} style={{ width: 160, height: 160, maxWidth: "100%", objectFit: "contain" }} />
          <p style={{ whiteSpace: "pre-wrap" }}>{item.meaning}</p>
          <div className="btn-row">
            <button type="button" className="btn" aria-label={`Use pictogram: ${item.meaning}`} onClick={() => { setSelected(item); setHref(null); }}>Use pictogram</button>
            <button type="button" className="btn btn-secondary" aria-label={`Delete pictogram: ${item.meaning}`} onClick={() => remove(item)}>Delete pictogram</button>
          </div>
        </article>)}
      </section>
    </>}
    {href && <div role="status" className="notice"><p>Meaning approved. Review it in the composer, then explicitly Speak. Only the approved text is passed; the image stays here.</p><Link className="btn" href={href} prefetch={false}>Open in composer</Link></div>}
    <p><Link href="/" prefetch={false}>Communication board</Link></p>
  </>;
}
