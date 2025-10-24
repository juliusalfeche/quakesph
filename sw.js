const CACHE_NAME = "quakesph-v5";
const STATIC_ASSETS = [
  "/quakesph/",
  "/quakesph/index.html",
  "/quakesph/style.css",
  "/quakesph/main.js",
  "/quakesph/logo.svg",
  "/quakesph/cover.png",
  "/quakesph/192.png",
  "/quakesph/512.png",
  "/quakesph/manifest.json",
  "/quakesph/plates.json"
];

// INSTALL: Precache core app files
self.addEventListener("install", (event) => {
  console.log("[sw.js] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[sw.js] Install failed:", err))
  );
});

// ACTIVATE: Remove old caches and claim clients
self.addEventListener("activate", (event) => {
  console.log("[sw.js] Activating...");
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.map((key) =>
          key !== CACHE_NAME ? caches.delete(key) : null
        ))
      )
      .then(() => self.clients.claim())
      .then(() => console.log("[sw.js] Active and controlling clients."))
  );
});

// FETCH: Network-first for all files, fallback to cache when offline
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // HTML navigation safety fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(request, response.clone())
          );
          return response;
        })
        .catch(() => caches.match("/quakesph/index.html"))
    );
    return;
  }

  // Network-first for all requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// MESSAGE: Skip waiting for immediate activation
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    console.log("[sw.js] skipWaiting received, activating update...");
    self.skipWaiting();
  }
});

// CONTROLLERCHANGE: Log activation
self.addEventListener("controllerchange", () => {
  console.log("[sw.js] Controller changed — new version active.");
});

console.log("[sw.js] Service Worker ready for QuakesPH (Network-first mode)");
