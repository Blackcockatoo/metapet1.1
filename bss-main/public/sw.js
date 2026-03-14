// Bump this version any time you want to force-expire all cached assets.
const CACHE_NAME = "meta-pet-shell-v2";
const PRECACHE_URLS = ["/", "/manifest.json", "/icon.svg"];

// /_next/ chunks use content-addressed filenames in production builds, but
// in development Turbopack reuses the same filename with new content. We
// therefore use a network-first strategy for all /_next/ paths so that code
// changes are always reflected immediately.
const isNextChunk = (url) => url.pathname.startsWith("/_next/");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete every cache that isn't the current version.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // --- Network-first for Next.js JS/CSS chunks ---
  // Always fetch fresh; fall back to cache only when offline.
  if (isNextChunk(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // --- Cache-first for everything else (shell, icons, manifest) ---
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    }),
  );
});
