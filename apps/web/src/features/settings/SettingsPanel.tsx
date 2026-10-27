"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Account settings: history consent, content/account deletion, sign-out. */
export default function SettingsPanel() {
  const [historyEnabled, setHistoryEnabled] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"content" | "account" | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
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
    const res = await fetch("/api/v1/account?scope=data", { method: "DELETE", headers: { "x-worldspeak-confirm": "erase" } });
    const body = (await res.json()) as { data?: { authUserDeleted: boolean } };
    if (!res.ok) {
      setNotice("Data reset failed. No partial reset was applied; try again.");
      return;
    }
    if (!body.data?.authUserDeleted) {
      setNotice("Saved content and consent records deleted; profile and preferences reset. Your sign-in identity remains. Full account removal requires a separate verified support step.");
    }
    setHistoryEnabled(false);
    setConfirmDelete(null);
  }

  async function deleteContent() {
    const res = await fetch("/api/v1/account?scope=content", { method: "DELETE", headers: { "x-worldspeak-confirm": "erase" } });
    if (!res.ok) { setNotice("Content deletion failed. Please retry."); return; }
    setConfirmDelete(null);
    setNotice("Saved content deleted.");
  }

  async function deleteIdentity() {
    const res = await fetch("/api/v1/account?scope=identity", {
      method: "DELETE", headers: { "content-type": "application/json", "x-worldspeak-confirm": "erase" },
      body: JSON.stringify({ password: deletePassword }),
    });
    setDeletePassword("");
    if (!res.ok) { setNotice("Account removal was not completed. Check your password; OAuth-only accounts or an unavailable deletion service require a verified support step. No preliminary data wipe was performed."); return; }
    await createClient().auth.signOut().catch(() => {});
    router.push("/");
    router.refresh();
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
            Delete saved data and reset settings
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
          <p>Permanently delete saved content and consent records, and reset your profile and settings? Your sign-in identity remains. This cannot be undone.</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void wipeAccount()}>
              Yes, delete data and reset settings
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <h3>Session</h3>
      <details>
        <summary>Remove sign-in identity and all saved data</summary>
        <p>This is permanent. Enter your existing email-account password to reauthenticate. OAuth-only accounts require a verified support step.</p>
        <label htmlFor="delete-password">Current password for permanent account removal</label>
        <input id="delete-password" className="field" type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
        <button type="button" className="btn btn-secondary" disabled={deletePassword.length < 8} onClick={() => void deleteIdentity()}>Permanently remove my account and data</button>
      </details>
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
