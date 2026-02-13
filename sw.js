const CACHE_VERSION = "v30";
const SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const MEDIA_CACHE = `media-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon_192.png",
  "./icon_512.png",
  "./icon_192_maskable.png",
  "./icon_512_maskable.png",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, MEDIA_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((resp) => {
      if (resp && resp.ok) cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => null);
  return cached || networkPromise || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone());
  return resp;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) return; // ignore cross-origin by default

  // HTML/documents: stale-while-revalidate for freshness + speed
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE).catch(() => caches.match("./index.html")));
    return;
  }

  // Media: cache-first (videos are large, stable assets)
  if (req.destination === "video") {
    event.respondWith(cacheFirst(req, MEDIA_CACHE));
    return;
  }

  // Icons, CSS, JS: stale-while-revalidate
  if (["image", "style", "script"].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
    return;
  }

  // fallback
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => caches.match("./index.html")))
  );
});
