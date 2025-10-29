const CACHE_NAME = "quakesph-v6";
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

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});