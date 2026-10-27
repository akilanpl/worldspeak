"use client";

import { useEffect, useState } from "react";

/**
 * Honest offline-preparation status: ready only after cache verification.
 * Rechecks a few times because the service worker installs asynchronously
 * after the first online visit; never claims readiness early.
 */
export default function OfflineStatus() {
  const [status, setStatus] = useState<"checking" | "ready" | "not-ready">("checking");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function checkOnce(): Promise<boolean> {
      try {
        if (!("caches" in window)) return false;
        const match = await window.caches.match("/offline/index.html");
        return Boolean(match);
      } catch {
        return false;
      }
    }
    async function poll() {
      while (!cancelled && attempts < 6) {
        attempts += 1;
        if (await checkOnce()) {
          if (!cancelled) setStatus("ready");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) setStatus("not-ready");
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") return <p className="status">Checking offline preparation…</p>;
  if (status === "ready")
    return <p className="status" data-testid="offline-status">Offline ready — the board works without internet.</p>;
  return (
    <p className="status" data-testid="offline-status">
      Offline not prepared yet — keep this page open once while online, then airplane mode works.
    </p>
  );
}
