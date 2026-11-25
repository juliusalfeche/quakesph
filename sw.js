'use strict';

// Change this number whenever you publish an update, so installed copies refresh.
const CACHE_NAME = 'quakesph-v4';

// Relative paths, so it works under /quakesph/ on GitHub Pages and anywhere else.
const APP_FILES = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/style.css',
    './assets/js/main.js',
    './assets/js/config.js',
    './assets/js/utils.js',
    './assets/js/quakes.js',
    './assets/js/api.js',
    './assets/js/map.js',
    './assets/js/ui.js',
    './assets/data/plates-ph.json',
    './assets/icons/icon.svg',
    './assets/icons/logo-mark.svg',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/icons/apple-touch-icon.png',
    './assets/icons/favicon-32.png'
];

// The map library is pinned to one exact version, so it is safe to keep a copy.
// The page still checks it against its integrity hash every time it is used.
const LEAFLET = [
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_FILES);
        await Promise.allSettled(LEAFLET.map((url) => cache.add(url)));   // nice to have, not required
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    // Pinned map library: use the saved copy first.
    if (LEAFLET.includes(request.url)) {
        event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
        return;
    }

    // Our own files: newest version when online, saved copy when offline.
    // Everything else (earthquake data, map tiles) goes straight to the network.
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) =>
                    cached || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
                )
            )
    );
});
