"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Account settings: history consent, content/account deletion, sign-out. */
export default function SettingsPanel() {
  const [historyEnabled, setHistoryEnabled] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"content" | "account" | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/preferences", { cache: "no-store" }).then(
      async (res) => {
        if (!res.ok) return;
        const body = (await res.json()) as { data: { history_enabled: boolean } };
        setHistoryEnabled(body.data.history_enabled);
      },
      () => {},
    );
  }, []);

  async function toggleHistory(next: boolean) {
    const res = await fetch("/api/v1/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ history_enabled: next }),
    });
    if (!res.ok) {
      setNotice("Could not update history setting.");
      return;
    }
    setHistoryEnabled(next);
    setNotice(next ? "History saving is on." : "History saving is off. Favorites still save explicitly.");
  }

  async function wipeAccount() {
    const res = await fetch("/api/v1/account", { method: "DELETE" });
    const body = (await res.json()) as { data?: { authUserDeleted: boolean } };
    if (!res.ok) {
      setNotice("Deletion failed; nothing was hidden silently — try again.");
      return;
    }
    if (!body.data?.authUserDeleted) {
      setNotice("Your saved content was deleted. Sign-in record removal needs the cloud console step.");
    }
    await createClient().auth.signOut().catch(() => {});
    router.push("/");
  }

  async function deleteContent() {
    for (const id of await conversationIds()) {
      await fetch(`/api/v1/conversations/${id}`, { method: "DELETE" });
    }
    setConfirmDelete(null);
    setNotice("Saved content deleted.");
  }

  async function conversationIds(): Promise<string[]> {
    const res = await fetch("/api/v1/conversations", { cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as { data: { id: string }[] };
    return body.data.map((c) => c.id);
  }

  return (
    <section className="panel" aria-labelledby="settings-h">
      <h2 id="settings-h">Settings and privacy</h2>
      <h3>History</h3>
      <p className="status">
        When off, the board stays local and nothing is saved unless you explicitly press Save or Favorite.
      </p>
      <div className="btn-row" role="group" aria-label="History saving">
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={historyEnabled === true}
          disabled={historyEnabled === null}
          onClick={() => void toggleHistory(true)}
        >
          On
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={historyEnabled === false}
          disabled={historyEnabled === null}
          onClick={() => void toggleHistory(false)}
        >
          Off
        </button>
      </div>
      <h3>Delete</h3>
      {confirmDelete === null && (
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete("content")}>
            Delete my saved content
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete("account")}>
            Delete my account and content
          </button>
        </div>
      )}
      {confirmDelete === "content" && (
        <div className="notice" role="alert">
          <p>Permanently delete all conversations, messages, and favorites? This cannot be undone.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void deleteContent()}>
              Yes, delete content
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {confirmDelete === "account" && (
        <div className="notice" role="alert">
          <p>Permanently delete your account and all saved content? This cannot be undone.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void wipeAccount()}>
              Yes, delete account
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <h3>Session</h3>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            createClient()
              .auth.signOut()
              .then(() => {
                router.push("/");
              })
              .catch(() => setNotice("Sign-out failed."));
          }}
        >
          Sign out
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
