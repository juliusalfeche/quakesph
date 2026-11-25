// Everything that touches Leaflet lives here. Keys: no API keys, no accounts.

import { MAP_LIMITS, MAP_VIEW, PH_BOUNDS } from './config.js';
import { classifyMag } from './quakes.js';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

// Free map tiles that need no API key. Each map style = one or more tile layers.
const BASEMAPS = {
    dark: {
        attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, NGA, USGS',
        layers: [
            { url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 16, zIndex: 1 },
            { url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 16, zIndex: 2 }
        ]
    },
    satellite: {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        layers: [
            { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 17, zIndex: 1 },
            { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 16, zIndex: 2 }
        ]
    },
    streets: {
        attribution: OSM_CREDIT,
        layers: [
            { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxNativeZoom: 19, zIndex: 1 }
        ]
    }
};

const radiusFor = (mag) => Math.min(26, Math.max(4, 2.5 + mag * 1.8));
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Returns a small controller object, or null if Leaflet itself did not load.
export function createQuakeMap(container, { onTileTrouble = () => {} } = {}) {
    if (typeof window.L === 'undefined') return null;
    const L = window.L;

    const map = L.map(container, {
        minZoom: 4, maxZoom: 18, zoomSnap: 0.5,
        maxBounds: MAP_LIMITS, maxBoundsViscosity: 0.8,
        preferCanvas: true, attributionControl: false
    });
    L.control.attribution({ prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' }).addTo(map);
    map.fitBounds(MAP_VIEW);
    window.addEventListener('load', () => map.invalidateSize());   // in case the page was still laying out

    // Plate lines sit under the quake circles.
    map.createPane('platesPane').style.zIndex = '390';

    const quakeLayer = L.layerGroup().addTo(map);
    const markers = new Map();          // quake id -> circle marker
    let pulse = null;                   // blinking ring on the latest quake
    let tileLayers = [];
    let tileErrors = 0;
    let platesLayer = null;
    let platesWanted = false;
    let platesRequested = false;
    let userLayer = L.layerGroup().addTo(map);
    let pendingOpen = null;

    // Dashed outline of the area we ask the seismic networks about.
    L.rectangle([[PH_BOUNDS.south, PH_BOUNDS.west], [PH_BOUNDS.north, PH_BOUNDS.east]], {
        pane: 'platesPane', color: '#ffffff', weight: 1, opacity: 0.25, dashArray: '4 8', fill: false, interactive: false
    }).addTo(map);

    function setBasemap(key) {
        const def = BASEMAPS[key] ?? BASEMAPS.dark;
        tileLayers.forEach((layer) => map.removeLayer(layer));
        tileErrors = 0;
        tileLayers = def.layers.map((spec, index) => {
            const layer = L.tileLayer(spec.url, {
                maxNativeZoom: spec.maxNativeZoom, maxZoom: 18, zIndex: spec.zIndex,
                attribution: index === 0 ? def.attribution : ''
            });
            if (index === 0) {   // only the main layer decides whether "tiles are failing"
                layer.on('tileerror', () => {
                    tileErrors += 1;
                    if (tileErrors === 6) onTileTrouble();
                });
            }
            return layer.addTo(map);
        });
    }

    async function ensurePlates(url) {
        if (platesRequested) return;
        platesRequested = true;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            platesLayer = L.geoJSON(await response.json(), {
                pane: 'platesPane', interactive: false,
                style: { color: '#d32f2f', weight: 1.6, opacity: 0.75 }
            });
            if (platesWanted) platesLayer.addTo(map);
        } catch (error) {
            platesRequested = false;   // allow another try next time it is switched on
            console.warn('Plate boundaries could not be loaded:', error);
        }
    }

    function setPlates(visible, url) {
        platesWanted = visible;
        if (visible && !platesLayer) ensurePlates(url);
        else if (platesLayer) visible ? platesLayer.addTo(map) : map.removeLayer(platesLayer);
    }

    function render(quakes, { latestId, popupFor }) {
        quakeLayer.clearLayers();
        markers.clear();
        if (pulse) { map.removeLayer(pulse); pulse = null; }

        // Weakest first, so the strongest quakes are drawn on top.
        [...quakes].sort((a, b) => a.mag - b.mag).forEach((q) => {
            const color = classifyMag(q.mag).color;
            const marker = L.circleMarker([q.lat, q.lon], {
                radius: radiusFor(q.mag), color, weight: 1.5, opacity: 0.95, fillColor: color, fillOpacity: 0.45
            });
            marker.bindPopup(() => popupFor(q), { className: 'quake-popup', maxWidth: 260, autoPanPadding: [16, 16] });
            marker.addTo(quakeLayer);
            markers.set(q.id, marker);
        });

        const latest = quakes.find((q) => q.id === latestId);
        if (latest) {
            pulse = L.marker([latest.lat, latest.lon], {
                interactive: false, keyboard: false, zIndexOffset: 1000,
                icon: L.divIcon({ className: `pulse pulse--${classifyMag(latest.mag).key}`, html: '<span></span>', iconSize: [34, 34] })
            }).addTo(map);
        }
    }

    function focusQuake(id) {
        const marker = markers.get(id);
        if (!marker) return;
        const target = marker.getLatLng();
        const zoom = Math.max(map.getZoom(), 8);
        const alreadyThere = map.getZoom() >= zoom && map.getCenter().distanceTo(target) < 500;

        if (pendingOpen) map.off('moveend', pendingOpen);
        if (alreadyThere) { marker.openPopup(); return; }
        pendingOpen = () => { pendingOpen = null; marker.openPopup(); };
        map.once('moveend', pendingOpen);
        if (prefersReducedMotion()) map.setView(target, zoom, { animate: false });
        else map.flyTo(target, zoom, { duration: 1.1 });
    }

    function clearUser() { userLayer.clearLayers(); }

    function showUser(lat, lon, quake, { fit = false } = {}) {
        clearUser();
        L.marker([lat, lon], {
            interactive: false, keyboard: false,
            icon: L.divIcon({ className: 'me', html: '<span></span>', iconSize: [20, 20] })
        }).addTo(userLayer);
        if (!quake) return;
        L.polyline([[lat, lon], [quake.lat, quake.lon]], {
            color: '#ffffff', weight: 1.5, opacity: 0.7, dashArray: '6 8', interactive: false
        }).addTo(userLayer);
        if (fit) map.fitBounds([[lat, lon], [quake.lat, quake.lon]], { padding: [60, 60], maxZoom: 9 });
    }

    function resetView() {
        map.closePopup();
        map.invalidateSize();
        if (prefersReducedMotion()) map.fitBounds(MAP_VIEW, { animate: false });
        else map.fitBounds(MAP_VIEW);
    }

    return { setBasemap, setPlates, render, focusQuake, showUser, clearUser, resetView };
}
