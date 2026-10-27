"use client";

import { useCallback, useEffect, useState } from "react";

interface Item {
  id: string;
  text: string;
  locale: string;
  origin: string;
  conversation_id: string;
  created_at: string;
}

/** Owner history: exact saved sentences, search, replay, delete. Never auto-speaks. */
export default function HistoryPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const load = useCallback(async (query: string, cur: string | null, append: boolean) => {
    setNotice(null);
    const params = new URLSearchParams({ q: query || " ", limit: "30" });
    if (cur) params.set("cursor", cur);
    // Empty query lists recent saves; the API requires q, so use a space
    // wildcard path via conversations listing instead.
    const res = await fetch(query ? `/api/v1/history/search?${params}` : "/api/v1/history/recent", {
      cache: "no-store",
    });
    if (!res.ok) {
      setNotice("Could not load history.");
      return;
    }
    const body = (await res.json()) as { data: { rows: Item[]; nextCursor: string | null } };
    setItems((prev) => (append ? [...prev, ...body.data.rows] : body.data.rows));
    setCursor(body.data.nextCursor);
  }, []);

  useEffect(() => {
    // Initial fetch on mount; all later loads are event-driven.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch, then events only
    void load("", null, false);
  }, [load]);

  async function remove(id: string) {
    const res = await fetch(`/api/v1/messages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setNotice("Delete failed.");
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <section className="panel" aria-labelledby="history-h">
      <h2 id="history-h">History</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(q.trim(), null, false);
        }}
      >
        <label className="field" htmlFor="history-q">Search your saved sentences</label>
        <input
          id="history-q"
          className="field"
          type="search"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="btn-row">
          <button type="submit" className="btn btn-secondary">Search</button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setQ("");
              void load("", null, false);
            }}
          >
            Show recent
          </button>
        </div>
      </form>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <ul className="tile-grid">
        {items.map((m) => (
          <li key={m.id} className="preview" style={{ margin: 0 }}>
            <p className="preview-sentence" lang={m.locale} style={{ fontSize: "1.25rem" }}>
              {m.text}
            </p>
            <p className="preview-meta">
              {m.locale} · {m.origin} · {new Date(m.created_at).toLocaleString()}
            </p>
            <div className="btn-row">
              <a className="btn btn-secondary" href={`/?load=${m.id}`} style={{ textDecoration: "none" }}>
                Open in composer
              </a>
              <button type="button" className="btn btn-secondary" onClick={() => void remove(m.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="status">Nothing saved yet. Use Save on the board.</p>}
      {cursor && (
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => void load(q.trim(), cursor, true)}>
            More
          </button>
        </div>
      )}
    </section>
  );
}
