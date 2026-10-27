/* SUKOT MESSENGER — minimal service worker (PWA installability + offline shell) */
const CACHE_NAME = "sukot-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle navigations (app shell); never touch API / socket / static dev assets
  if (req.method !== "GET" || req.mode !== "navigate") return;
  if (url.pathname.startsWith("/api") || url.pathname.includes("socket.io")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("/", fresh.clone()).catch(() => undefined);
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("/")) || Response.error();
      }
    })()
  );
});
