const CACHE_NAME = "quakesph-v7";

const STATIC_ASSETS = [
    "./",
    "index.html",
    "style.css",
    "main.js",
    "logo.png",
    "cover.png",
    "192.png",
    "512.png",
    "manifest.json",
    "plates.json"
];

// Service Worker Lifecycle Events
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                }))
            )
    );
});

// Fetch Handling: Cache First, falling back to Network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

// Communication: Allow manual skipWaiting
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});