"use client";

import { useEffect, useState } from "react";

interface Fav {
  id: string;
  created_at: string;
  messages: { id: string; text: string; locale: string; origin: string; created_at: string } | null;
}

/** Favorites: stable arrangement, open in composer, unfavorite. Never speaks. */
export default function FavoritesPanel() {
  const [items, setItems] = useState<Fav[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/favorites", { cache: "no-store" }).then(
      async (res) => {
        if (!res.ok) {
          setNotice("Could not load favorites.");
          return;
        }
        const body = (await res.json()) as { data: Fav[] };
        setItems(body.data);
      },
      () => setNotice("Could not load favorites."),
    );
  }, []);

  async function unfavorite(id: string) {
    const res = await fetch(`/api/v1/favorites/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setNotice("Unfavorite failed.");
      return;
    }
    setItems((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <section className="panel" aria-labelledby="favorites-h">
      <h2 id="favorites-h">Favorites</h2>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <ul className="tile-grid">
        {items.map((f) => (
          <li key={f.id} className="preview" style={{ margin: 0 }}>
            <p className="preview-sentence" lang={f.messages?.locale ?? "en"} style={{ fontSize: "1.25rem" }}>
              {f.messages?.text ?? "(removed)"}
            </p>
            {f.messages && (
              <div className="btn-row">
                <a className="btn btn-secondary" href={`/?load=${f.messages.id}`} style={{ textDecoration: "none" }}>
                  Open in composer
                </a>
                <button type="button" className="btn btn-secondary" onClick={() => void unfavorite(f.id)}>
                  Unfavorite
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="status">No favorites yet. Use Favorite on the board.</p>}
    </section>
  );
}
