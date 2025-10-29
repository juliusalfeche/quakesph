const CACHE_NAME = "quakesph-v6";
const STATIC_ASSETS = [
    "./",
    "index.html",
    "style.css",
    "main.js",
    "logo.svg",
    "cover.png",
    "192.png",
    "512.png",
    "manifest.json",
    "plates.json"
];

// Installation: Cache static assets and immediately take control
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activation: Clean up old caches
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

// Fetch: Cache First, falling back to Network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

// Message: Allow clients to manually skip waiting (for updates)
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});