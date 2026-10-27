/* WorldSpeak offline service worker (Phase 1).
 * Precaches ONLY static public board assets + hashed build assets.
 * Never caches /api, auth, or private pages. No offline request queue.
 * No automatic upload after reconnect — reconnecting invokes nothing.
 */

const BOARD_MANIFEST_URL = "/offline/board.v1.json";
const CACHE_PREFIX = "worldspeak-offline-";

async function boardManifest() {
  const res = await fetch(BOARD_MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("board manifest unavailable");
  return res.json();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const manifest = await boardManifest();
      const cache = await caches.open(CACHE_PREFIX + manifest.cacheVersion);
      await cache.addAll(manifest.assets);
      await self.skipWaiting();
    })().catch(() => {
      /* first-ever offline visit without connectivity stays unprepared */
    }),
  );
});

async function currentCacheName() {
  try {
    const manifest = await boardManifest();
    return CACHE_PREFIX + manifest.cacheVersion;
  } catch {
    return null;
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = await currentCacheName();
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== keep) await caches.delete(key);
      }
      // Never replace an active board mid-composition: clients keep their
      // current cache until they reload.
      try {
        await self.clients.claim();
      } catch {
        /* clients API unavailable — caches still serve the board */
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API
  if (url.pathname === "/offline/board.v1.json") return; // always revalidate manifest

  const isOfflineAsset = url.pathname.startsWith("/offline/");
  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isOfflineAsset) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          const copy = res.clone();
          event.waitUntil(
            caches.open(CACHE_PREFIX + "runtime").then((cache) => cache.put(request, copy)).catch(() => {}),
          );
          return res;
        });
      }),
    );
    return;
  }

  if (isNavigation) {
    // Online pages load normally; offline navigations fall back to the board.
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline/index.html").then((hit) => hit || Response.error())),
    );
  }
});
