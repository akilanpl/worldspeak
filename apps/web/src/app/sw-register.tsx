"use client";

import { useEffect } from "react";

/** Registers the versioned offline service worker. Never triggers speech. */
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline preparation simply stays unavailable */
    });
  }, []);
  return null;
}
