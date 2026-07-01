// DD-Pocket Service Worker
const CACHE_NAME = "dd-pocket-v2";

// Aset statis yang di-cache saat install
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
];

// Install: cache shell assets
self.addEventListener("install", (event) => {
  self.skipWaiting(); // langsung aktifkan SW baru
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// Activate: hapus cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: strategi hybrid
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ✅ Next.js static files (hashed) — Cache First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // ✅ Static assets (images, fonts, icons) — Cache First
  if (url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // ✅ API calls to Supabase — Network Only, no cache
  if (url.hostname.includes("supabase")) {
    event.respondWith(fetch(request));
    return;
  }

  // ✅ Semua request lain (HTML, dll) — Network First, fallback ke cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache response for offline fallback
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || new Response("Offline", { status: 503 });
        });
      })
  );
});
