const CACHE_NAME = "micro_routine_v21"

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js",
  "./icon_192.png",
  "./icon_512.png",
  "./icon_192_maskable.png",
  "./icon_512_maskable.png",
  "./ChestOpenerStretch.mp4",
  "./WallPushUps.mp4"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k === CACHE_NAME) return null
          return caches.delete(k)
        })
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached

      return fetch(req)
        .then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          return resp
        })
        .catch(() => caches.match("./index.html"))
    })
  )
})