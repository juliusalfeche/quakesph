const PH_BOUNDS_ARRAY = [[4, 116], [21, 135]];
const REFRESH_INTERVAL = 60000;
const MIN_ZOOM_FOR_PLATES = 4;

let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let quakeData = [];
let activeMarker = null;
let currentBase = null;
let lastController = null;
let userLocationAttempted = false;
let lineToLatestQuake = null;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`/quakesph/sw.js?version=${Date.now()}`).then(reg => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller)
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
            });
        });
    });
}

const formatQuakeTime = ts => {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = String(h % 12 || 12).padStart(2, '0');
    return `${day} ${month} ${year} ${h}:${m} ${ampm}`;
};

const fadeMarker = (marker, show = true, duration = 400) => {
    const el = marker.getElement?.();
    if (!el) return;
    el.style.transition = `opacity ${duration}ms ease-in-out`;
    el.style.opacity = show ? 0.8 : 0;
};

const fadeInMarkers = (markers, delay = 100) =>
    markers.forEach((m, i) => setTimeout(() => fadeMarker(m, true), i * delay));

const toRad = deg => (deg * Math.PI) / 180;

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
            (e.ctrlKey && e.key.toLowerCase() === 'u') ||
            e.key === 'F12') e.preventDefault();
    });

    if (typeof L === 'undefined') {
        document.getElementById('em-refresh-status').textContent = 'Map library failed to load.';
        return;
    }

    const PH_BOUNDS = L.latLngBounds(PH_BOUNDS_ARRAY);

    // --- Map Configuration & Initialization ---
    const baseLayers = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        google_hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'),
        carto_light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'),
        carto_dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')
    };

    const magConfig = [
        { min: 4, max: 4.9, color: isDark ? '#27AE60' : '#2ECC71' },
        { min: 5, max: 5.9, color: isDark ? '#F39C12' : '#F1C40F' },
        { min: 6, max: 6.9, color: isDark ? '#D35400' : '#E67E22' },
        { min: 7, max: 10, color: isDark ? '#E74C3C' : '#C0392B' }
    ];

    const getMagColor = mag =>
        magConfig.find(c => mag >= c.min && mag <= c.max)?.color || '#999';

    const updateLegendColors = () => {
        const legendItems = document.querySelectorAll('.em-legend-item');
        legendItems.forEach(item => {
            const min = parseFloat(item.dataset.min);
            const max = parseFloat(item.dataset.max);
            const match = magConfig.find(c => c.min === min && c.max === max);
            if (match) {
                item.querySelector('.em-legend-color').style.background = match.color;
            }
        });
    };

    currentBase = isDark ? baseLayers.carto_dark : baseLayers.carto_light;
    const map = L.map('em-map', { layers: [currentBase], attributionControl: false }).fitBounds(PH_BOUNDS);
    const quakeLayer = L.layerGroup().addTo(map);

    // PH Bounds Rectangle
    const phBoundsRect = L.rectangle(PH_BOUNDS, { color: 'gray', weight: 1, dashArray: '5,5', fillOpacity: 0.1 });
    let phBoundsLayer = null;

    const showPHBounds = () => { if (!phBoundsLayer) phBoundsLayer = phBoundsRect.addTo(map); };
    const hidePHBounds = () => { if (phBoundsLayer) { map.removeLayer(phBoundsLayer); phBoundsLayer = null; } };

    // Plate Boundaries Layer
    const plateBoundariesURL = '/quakesph/plates.json';
    let plateBoundaries = null, plateData = null;

    const showPlateBoundaries = () => {
        if (plateData && !plateBoundaries) {
            plateBoundaries = L.geoJSON(plateData, { style: { color: 'red', weight: 0.5, opacity: 0.8 } }).addTo(map);
        } else if (!plateData) {
            fetch(plateBoundariesURL)
                .then(r => r.json())
                .then(data => { plateData = data; if (map.getZoom() >= MIN_ZOOM_FOR_PLATES && !plateBoundaries) showPlateBoundaries(); })
                .catch(console.error);
        }
    };

    const hidePlateBoundaries = () => { if (plateBoundaries) { map.removeLayer(plateBoundaries); plateBoundaries = null; } };

    map.on('zoomend', () => {
        if (map.getZoom() >= MIN_ZOOM_FOR_PLATES) { showPlateBoundaries(); showPHBounds(); }
        else { hidePlateBoundaries(); hidePHBounds(); }
    });

    // --- Data Rendering ---
    const renderTable = () => {
        const tbody = document.querySelector('#em-table tbody');
        tbody.innerHTML = '';
        quakeData.forEach(eq => {
            const tr = document.createElement('tr');
            tr.className = 'quake-row';
            const color = getMagColor(eq.mag);
            tr.innerHTML = `
                <td>${formatQuakeTime(eq.time)}</td>
                <td style="color:${color};font-weight:600;">${eq.mag.toFixed(1)}</td>
                <td>${eq.depth.toFixed(1)} km</td>
                <td><a href="${eq.url}" target="_blank" rel="noopener">${eq.place}</a></td>`;
            tr.onclick = () => {
                const marker = eq.marker;
                const others = quakeData.map(q => q.marker).filter(m => m !== marker);
                others.forEach(m => fadeMarker(m, false));
                if (activeMarker && activeMarker !== marker) activeMarker.closePopup();
                marker.bringToFront();
                fadeMarker(marker, true);
                map.flyTo(eq.latlng, Math.max(map.getZoom(), 6.5), { animate: true, duration: 2 });
                map.once('moveend', () => { marker.openPopup(); activeMarker = marker; setTimeout(() => fadeInMarkers(others, 50), 3000); });
                document.getElementById('em-header').scrollIntoView({ behavior: 'smooth' });
            };
            tbody.appendChild(tr);
        });
    };

    const updateLegend = () => {
        document.querySelectorAll('.em-legend-item').forEach(i => {
            const min = +i.dataset.min, max = +i.dataset.max;
            i.classList.toggle('active', quakeData.some(q => q.mag >= min && q.mag <= max));
        });
    };

    // --- User Location Logic ---
    const userMarker = L.marker([0, 0], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="width:16px;height:16px;border-radius:50%;background:#007bff;border:2px solid white;box-shadow:0 0 6px #007bff;"></div>'
        })
    });
    
    const statusEl = document.getElementById('nearest-status');

    const findNearestQuakeAndInjectDistance = (userLatLng) => {
        if (!quakeData.length) {
            statusEl.innerHTML = '<i>No recent quakes found.</i>';
            if (lineToLatestQuake) { map.removeLayer(lineToLatestQuake); lineToLatestQuake = null; }
            return;
        }
    
        const latestQuake = quakeData[0];
        const distanceKm = getDistanceKm(userLatLng.lat, userLatLng.lng, latestQuake.latlng[0], latestQuake.latlng[1]).toFixed(0);
        const magColor = getMagColor(latestQuake.mag);
        const formattedMag = latestQuake.mag.toFixed(1);
    
        statusEl.innerHTML = `Latest <i><span style="color:${magColor};font-weight:600;">Magnitude ${formattedMag}</span> ⟷ <span class="blinking-text" style="color:#007bff;font-weight:600;">${distanceKm} km</span></i> Away`;
    
        if (lineToLatestQuake) map.removeLayer(lineToLatestQuake);
    
        lineToLatestQuake = L.polyline([userLatLng, latestQuake.latlng], {
            color: 'gray',
            weight: 2, 
            dashArray: '5, 5'  
        }).addTo(map);
    
        lineToLatestQuake.getElement()?.classList.add('animated-path');
    };

    const locateUser = () => {
        if (userLocationAttempted) return;
        userLocationAttempted = true; 

        if (!navigator.geolocation) {
            statusEl.textContent = 'Geolocation not supported.';
            return;
        }

        statusEl.innerHTML = '';

        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            const userLatLng = { lat: latitude, lng: longitude };
            userMarker.setLatLng(userLatLng).addTo(map);
            
            findNearestQuakeAndInjectDistance(userLatLng);
            
        }, err => {
            statusEl.innerHTML = '<i>To see how far away the quake is, allow location access in your browser settings.</i>';
            console.warn('User denied geolocation or error:', err.message);
        });
    };

    // --- Main Data Fetching ---
    const loadEarthquakes = async () => {
        if (lastController) lastController.abort();
        const controller = new AbortController();
        lastController = controller;

        const [minMag, maxMag] = document.getElementById('em-mag-filter').value.split('-').map(Number);
        const timeFilter = document.getElementById('em-time-filter').value;
        const end = new Date(), start = new Date();

        if (timeFilter === 'hour') start.setHours(start.getHours() - 1);
        else if (timeFilter === 'day') start.setDate(start.getDate() - 1);
        else if (timeFilter === 'week') start.setDate(start.getDate() - 7);
        else start.setMonth(start.getMonth() - 1);

        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start.toISOString()}&endtime=${end.toISOString()}&minlatitude=4&maxlatitude=21&minlongitude=116&maxlongitude=135&minmagnitude=0`;

        document.getElementById('em-quake-count').innerHTML = '';

        try {
            const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
            const data = await response.json();
            quakeLayer.clearLayers();

            if (lineToLatestQuake) { map.removeLayer(lineToLatestQuake); lineToLatestQuake = null; }
            document.querySelectorAll('.blinking-marker').forEach(el => el.classList.remove('blinking-marker'));

            quakeData = (data.features || []).filter(f => {
                const [lon, lat] = f.geometry.coordinates;
                return f.properties.mag >= minMag && f.properties.mag <= maxMag && PH_BOUNDS.contains([lat, lon]);
            }).map(f => {
                const p = f.properties;
                const [lon, lat, depth] = f.geometry.coordinates;
                const latlng = [lat, lon];

                const initialPopupContent = `
                    <a href="${p.url}" target="_blank" rel="noopener"><b>${p.place}</b></a><br>
                    <b>Magnitude:</b> ${p.mag.toFixed(1)}<br>
                    <b>Depth:</b> ${depth.toFixed(1)} km<br>
                    <b>Time:</b> ${formatQuakeTime(p.time)}
                `;

                const marker = L.circleMarker(latlng, {
                    radius: 2 + p.mag,
                    stroke: true,
                    color: getMagColor(p.mag),
                    weight: 1,
                    fillColor: getMagColor(p.mag),
                    fillOpacity: 0.6,
                    opacity: 0
                }).bindPopup(initialPopupContent).addTo(quakeLayer);

                return { id: f.id, time: p.time, mag: p.mag, place: p.place, depth, url: p.url, latlng, marker };
            });

            quakeData.sort((a, b) => b.time - a.time);

            quakeData.forEach(q => { const el = q.marker.getElement?.(); if (el) { el.classList.remove('blinking-marker'); el.style.opacity = 0; } });

            if (quakeData.length) {
                const latestMarker = quakeData[0].marker;
                map.flyTo(latestMarker.getLatLng(), Math.max(map.getZoom(), 6.5), { animate: true, duration: 2 });
                map.once('moveend', () => {
                    quakeData.forEach(q => { const el = q.marker.getElement?.(); if (el) { el.style.transition = 'opacity 400ms ease-in-out'; el.style.opacity = 0.8; } });
                    latestMarker.openPopup();
                    activeMarker = latestMarker;
                    latestMarker.getElement?.().classList.add('blinking-marker');

                    if (!userLocationAttempted) {
                        locateUser();
                    } else if (userMarker.getLatLng()?.lat) {
                        findNearestQuakeAndInjectDistance(userMarker.getLatLng());
                    }
                });
            } else if (!userLocationAttempted) {
                locateUser();
            }

            renderTable();
            updateLegend();
            updateLegendColors();
            
            const quakeCountEl = document.getElementById('em-quake-count');
            const timePeriodMap = {
                'hour': 'Last Hour',
                'day': 'Last Day',
                'week': 'Last Week',
                'month': 'Last Month'
            };
            const timeSuffix = timePeriodMap[timeFilter] ? ` ${timePeriodMap[timeFilter]}` : '';

            if (quakeData.length === 0) {
                quakeCountEl.textContent = 'No Quakes Found' + timeSuffix;
            } else {
                quakeCountEl.textContent = `${quakeData.length} Quake${quakeData.length !== 1 ? 's' : ''} Found` + timeSuffix;
            }
            
            document.getElementById('em-refresh-status').textContent = '';
        } catch (err) {
            if (err.name !== 'AbortError') document.getElementById('em-refresh-status').textContent = 'Failed to load data';
        }
    };

    // --- Event Listeners ---
    document.querySelectorAll('.em-legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const filter = document.getElementById('em-mag-filter');
            filter.value = filter.value === `${item.dataset.min}-${item.dataset.max}` ? '0-10' : `${item.dataset.min}-${item.dataset.max}`;
            loadEarthquakes();
        });
        item.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key)) item.click(); });
    });

    document.getElementById('em-mag-filter').addEventListener('change', loadEarthquakes);
    document.getElementById('em-time-filter').addEventListener('change', loadEarthquakes);
    document.getElementById('em-basemap').addEventListener('change', e => {
        map.removeLayer(currentBase);
        currentBase = e.target.value === 'google_hybrid' ? baseLayers.google_hybrid :
            e.target.value === 'osm' ? baseLayers.osm :
            (isDark ? baseLayers.carto_dark : baseLayers.carto_light);
        map.addLayer(currentBase);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        isDark = e.matches;
        if (document.getElementById('em-basemap').value === 'auto') {
            map.removeLayer(currentBase);
            currentBase = isDark ? baseLayers.carto_dark : baseLayers.carto_light;
            map.addLayer(currentBase);
        }

        magConfig[0].color = isDark ? '#27AE60' : '#2ECC71';
        magConfig[1].color = isDark ? '#F39C12' : '#F1C40F';
        magConfig[2].color = isDark ? '#D35400' : '#E67E22';
        magConfig[3].color = isDark ? '#E74C3C' : '#C0392B';

        updateLegendColors();
        loadEarthquakes();
    });

    // --- Initial Setup ---
    document.getElementById('current-year').textContent = new Date().getFullYear();
    updateLegendColors();
    
    loadEarthquakes();
    setInterval(loadEarthquakes, REFRESH_INTERVAL);
});