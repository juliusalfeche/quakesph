const PH_BOUNDS_ARRAY = [
    [4, 116],
    [21, 135]
];
const REFRESH_INTERVAL = 60000;
const MIN_ZOOM_FOR_PLATES = 4;

let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let quakeData = [];
let activeMarker = null;
let currentBase = null;
let lastController = null;
let userLocationAttempted = false;
let lineToLatestQuake = null;

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/quakesph/sw.js?version=' + Date.now()).then(reg => {
        if (reg.waiting) reg.waiting.postMessage({
            type: 'SKIP_WAITING'
        });
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller)
                    newWorker.postMessage({
                        type: 'SKIP_WAITING'
                    });
            });
        });
    });
}

// --- Utility Functions ---

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

const formatQuakeTime = ts => {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', {
        month: 'long'
    });
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

const toTitleCase = (str) => {
    if (!str) return str;
    const minorWords = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|per|the|to|v|vs|with|via|km|mi)$/i;
    return str.toLowerCase().split(' ').map((word, index, array) => {
        if (word.match(minorWords) && index !== 0 && index !== array.length - 1) {
            return word;
        }
        return word.split('-').map((w) => {
            if (w.length > 0) {
                w = w.charAt(0).toUpperCase() + w.slice(1);
            }
            return w;
        }).join('-');
    }).join(' ');
};

// --- Core Logic & Map Initialization ---
document.addEventListener('DOMContentLoaded', () => {

    // Prevent common dev tool opening shortcuts
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

    const baseLayers = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        google_hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'),
        carto_light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'),
        carto_dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')
    };

    const magConfig = [{
            min: 0,
            max: 3.9,
            color: isDark ? '#3498DB' : '#5DADE2'
        },
        {
            min: 4,
            max: 4.9,
            color: isDark ? '#27AE60' : '#2ECC71'
        },
        {
            min: 5,
            max: 5.9,
            color: isDark ? '#F39C12' : '#F1C40F'
        },
        {
            min: 6,
            max: 6.9,
            color: isDark ? '#D35400' : '#E67E22'
        },
        {
            min: 7,
            max: 10,
            color: isDark ? '#E74C3C' : '#C0392B'
        }
    ];

    const getMagColor = mag =>
        magConfig.find(c => mag >= c.min && mag <= c.max)?.color || '#999';

    const updateMagConfigColors = (dark) => {
        magConfig[0].color = dark ? '#3498DB' : '#5DADE2';
        magConfig[1].color = dark ? '#27AE60' : '#2ECC71';
        magConfig[2].color = dark ? '#F39C12' : '#F1C40F';
        magConfig[3].color = dark ? '#D35400' : '#E67E22';
        magConfig[4].color = dark ? '#E74C3C' : '#C0392B';
    };

    currentBase = isDark ? baseLayers.carto_dark : baseLayers.carto_light;
    const map = L.map('em-map', {
        layers: [currentBase],
        attributionControl: false
    }).fitBounds(PH_BOUNDS);
    const quakeLayer = L.layerGroup().addTo(map);
    const statusEl = document.getElementById('nearest-status');

    // --- Boundary Layers and User Marker ---

    const PH_BOUNDS_RECT = L.rectangle(PH_BOUNDS, {
        color: 'gray',
        weight: 1,
        dashArray: '5,5',
        fillOpacity: 0.1
    });
    let phBoundsLayer = null;
    const showPHBounds = () => {
        if (!phBoundsLayer) phBoundsLayer = PH_BOUNDS_RECT.addTo(map);
    };
    const hidePHBounds = () => {
        if (phBoundsLayer) {
            map.removeLayer(phBoundsLayer);
            phBoundsLayer = null;
        }
    };

    const plateBoundariesURL = '/quakesph/plates.json';
    let plateBoundaries = null,
        plateData = null;

    const showPlateBoundaries = () => {
        if (plateData && !plateBoundaries) {
            plateBoundaries = L.geoJSON(plateData, {
                style: {
                    color: 'red',
                    weight: 0.5,
                    opacity: 0.8
                }
            }).addTo(map);
        } else if (!plateData) {
            fetch(plateBoundariesURL)
                .then(r => r.json())
                .then(data => {
                    plateData = data;
                    if (map.getZoom() >= MIN_ZOOM_FOR_PLATES && !plateBoundaries) showPlateBoundaries();
                })
                .catch(console.error);
        }
    };
    const hidePlateBoundaries = () => {
        if (plateBoundaries) {
            map.removeLayer(plateBoundaries);
            plateBoundaries = null;
        }
    };

    map.on('zoomend', () => {
        if (map.getZoom() >= MIN_ZOOM_FOR_PLATES) {
            showPlateBoundaries();
            showPHBounds();
        } else {
            hidePlateBoundaries();
            hidePHBounds();
        }
    });

    const userMarker = L.marker([0, 0], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="width:16px;height:16px;border-radius:50%;background:#007bff;border:2px solid white;box-shadow:0 0 6px #007bff;"></div>'
        })
    });

    // --- DOM Update Functions ---

    const updateLegendColors = () => {
        document.querySelectorAll('.em-legend-item').forEach(item => {
            const min = parseFloat(item.dataset.min);
            const max = parseFloat(item.dataset.max);
            const match = magConfig.find(c => c.min === min && c.max === max);
            if (match) {
                item.querySelector('.em-legend-color').style.background = match.color;
            }
        });
    };

    const updateLegend = () => {
        document.querySelectorAll('.em-legend-item').forEach(i => {
            const min = +i.dataset.min,
                max = +i.dataset.max;
            i.classList.toggle('active', quakeData.some(q => q.mag >= min && q.mag <= max));
        });
    };

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
                <td>
                    ${eq.url ? 
                        `<a href="${eq.url}" target="_blank" rel="noopener">${eq.place}</a>` : 
                        `${eq.place}`
                    }
                </td>`;
            tr.onclick = () => {
                const marker = eq.marker;
                const others = quakeData.map(q => q.marker).filter(m => m !== marker);
                others.forEach(m => fadeMarker(m, false));
                if (activeMarker && activeMarker !== marker) activeMarker.closePopup();
                marker.bringToFront();
                fadeMarker(marker, true);
                map.flyTo(eq.latlng, Math.max(map.getZoom(), 6.5), {
                    animate: true,
                    duration: 2
                });
                map.once('moveend', () => {
                    marker.openPopup();
                    activeMarker = marker;
                    setTimeout(() => fadeInMarkers(others, 50), 3000);
                });
                document.getElementById('em-header').scrollIntoView({
                    behavior: 'smooth'
                });
            };
            tbody.appendChild(tr);
        });
    };

    // --- Location and Distance Logic ---

    const findNearestQuakeAndInjectDistance = (userLatLng) => {
        if (!quakeData.length) {
            statusEl.innerHTML = '<i>No recent quakes found.</i>';
            if (lineToLatestQuake) {
                map.removeLayer(lineToLatestQuake);
                lineToLatestQuake = null;
            }
            return;
        }

        const latestQuake = quakeData[0];
        const distanceKm = getDistanceKm(userLatLng.lat, userLatLng.lng, latestQuake.latlng[0], latestQuake.latlng[1]).toFixed(0);
        const magColor = getMagColor(latestQuake.mag);
        const formattedMag = latestQuake.mag.toFixed(1);

        statusEl.innerHTML = `<i>Latest <span style="color:${magColor};font-weight:600;">Magnitude ${formattedMag}</span> ⟷ <span class="blinking-text" style="color:#007bff;font-weight:600;">${distanceKm} km</span> Away</i>`;

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
            const userLatLng = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
            userMarker.setLatLng(userLatLng).addTo(map);
            const markerElement = userMarker.getElement();
            if (markerElement) {
                markerElement.setAttribute('aria-label', 'Your current location');
            }
            findNearestQuakeAndInjectDistance(userLatLng);
        }, err => {
            statusEl.innerHTML = '<i>To see the quake distance, allow location access in settings.</i>';
            console.warn('User denied geolocation or error:', err.message);
        });
    };

    // --- Data Fetch and Processing ---

    const isDuplicate = (f, seenQuakes) => {
        let timeMs = typeof f.properties.time === 'string' ? new Date(f.properties.time).getTime() : f.properties.time;
        f.properties.time = timeMs;
        const [lon, lat] = f.geometry.coordinates;

        for (let seen of seenQuakes) {
            const timeDiff = Math.abs(seen.time - timeMs);
            const latDiff = Math.abs(seen.lat - lat);
            const lonDiff = Math.abs(seen.lon - lon);

            if (timeDiff < 60000 && latDiff < 0.1 && lonDiff < 0.1) {
                return true;
            }
        }
        seenQuakes.push({
            time: timeMs,
            lat,
            lon
        });
        return false;
    };

    const loadEarthquakes = async () => {
        if (lastController) lastController.abort();
        const controller = new AbortController();
        lastController = controller;

        const [minMag, maxMag] = document.getElementById('em-mag-filter').value.split('-').map(Number);
        const timeFilter = document.getElementById('em-time-filter').value;
        const end = new Date(),
            start = new Date();

        if (timeFilter === 'hour') start.setHours(start.getHours() - 1);
        else if (timeFilter === 'day') start.setDate(start.getDate() - 1);
        else if (timeFilter === 'week') start.setDate(start.getDate() - 7);
        else start.setMonth(start.getMonth() - 1);

        const startTime = start.toISOString();
        const endTime = end.toISOString();
        const minLat = PH_BOUNDS_ARRAY[0][0];
        const maxLat = PH_BOUNDS_ARRAY[1][0];
        const minLon = PH_BOUNDS_ARRAY[0][1];
        const maxLon = PH_BOUNDS_ARRAY[1][1];

        const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&endtime=${endTime}&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}&minmagnitude=0`;
        const portalUrl = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1000&starttime=${startTime}&endtime=${endTime}&minlat=${minLat}&maxlat=${maxLat}&minlon=${minLon}&maxlon=${maxLon}&minmag=0&maxmag=3.9`;

        document.getElementById('em-quake-count').innerHTML = 'Loading...';

        try {
            const promises = [
                fetch(usgsUrl, {
                    signal: controller.signal,
                    cache: 'no-cache'
                }).then(r => r.json().then(d => ({
                    source: 'USGS',
                    data: d
                }))),
                minMag < 4 ? fetch(portalUrl, {
                    signal: controller.signal,
                    cache: 'no-cache'
                }).then(r => r.json().then(d => ({
                    source: 'EMSC',
                    data: d
                }))) : Promise.resolve(null)
            ];

            const results = await Promise.allSettled(promises);
            let combinedFeatures = [];

            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value && res.value.data && res.value.data.features) {
                    const {
                        source,
                        data
                    } = res.value;
                    data.features.forEach(f => f.properties.agency = source);
                    combinedFeatures = combinedFeatures.concat(data.features);
                }
            });

            quakeLayer.clearLayers();
            if (lineToLatestQuake) {
                map.removeLayer(lineToLatestQuake);
                lineToLatestQuake = null;
            }
            document.querySelectorAll('.blinking-marker').forEach(el => el.classList.remove('blinking-marker'));

            const seenQuakes = [];

            quakeData = combinedFeatures
                .filter(f => {
                    if (!f.geometry || !f.geometry.coordinates) return false;
                    const [lon, lat] = f.geometry.coordinates;
                    const mag = parseFloat(f.properties.mag);

                    if (!PH_BOUNDS.contains([lat, lon])) return false;
                    if (mag < minMag || mag > maxMag) return false;

                    return !isDuplicate(f, seenQuakes);
                })
                .map(f => {
                    const p = f.properties;
                    const [lon, lat, depthVal] = f.geometry.coordinates;

                    const depth = Math.abs(depthVal || p.depth || 0);
                    const latlng = [lat, lon];

                    let placeName = p.place || p.flynn_region || "Unknown Location";

                    // Apply title case if the string is all upper case or if it's from EMSC 
                    if (placeName === placeName.toUpperCase() || p.agency === 'EMSC') {
                        placeName = toTitleCase(placeName);
                    }

                    let linkUrl = (p.agency === 'USGS') ? p.url : '';

                    const initialPopupContent = `
                        ${linkUrl ? 
                            `<a href="${linkUrl}" target="_blank" rel="noopener"><b>${placeName}</b></a>` : 
                            `<b>${placeName}</b>`
                        }<br>
                        <b>Magnitude:</b> ${p.mag.toFixed(1)}<br>
                        <b>Depth:</b> ${parseFloat(depth).toFixed(1)} km<br>
                        <b>Time:</b> ${formatQuakeTime(p.time)}<br>
                        <b>Source:</b> ${p.agency || 'Unknown'}</span>
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

                    return {
                        id: f.id,
                        time: p.time,
                        mag: p.mag,
                        place: placeName,
                        depth: parseFloat(depth),
                        url: linkUrl,
                        latlng,
                        marker
                    };
                });

            quakeData.sort((a, b) => b.time - a.time);

            // Set initial opacity to 0 for fade-in effect
            quakeData.forEach(q => {
                const el = q.marker.getElement?.();
                if (el) {
                    el.classList.remove('blinking-marker');
                    el.style.opacity = 0;
                }
            });

            if (quakeData.length) {
                const latestMarker = quakeData[0].marker;
                map.flyTo(latestMarker.getLatLng(), Math.max(map.getZoom(), 6.5), {
                    animate: true,
                    duration: 2
                });
                map.once('moveend', () => {
                    // Fade in all markers
                    quakeData.forEach(q => {
                        const el = q.marker.getElement?.();
                        if (el) {
                            el.style.transition = 'opacity 400ms ease-in-out';
                            el.style.opacity = 0.8;
                        }
                    });
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

            const quakeCountEl = document.getElementById('em-quake-count');
            const timePeriodMap = {
                'hour': 'Last Hour',
                'day': 'Last Day',
                'week': 'Last Week',
                'month': 'Last Month'
            };
            const timeSuffix = timePeriodMap[timeFilter] ? ` ${timePeriodMap[timeFilter]}` : '';

            quakeCountEl.textContent = quakeData.length === 0 ?
                'No Quakes Found' + timeSuffix :
                `${quakeData.length} Quake${quakeData.length !== 1 ? 's' : ''} Found` + timeSuffix;

            document.getElementById('em-refresh-status').textContent = '';
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                document.getElementById('em-refresh-status').textContent = 'Failed to load data';
            }
        }
    };

    // --- Event Listeners and Initial Load ---

    document.querySelectorAll('.em-legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const filter = document.getElementById('em-mag-filter');
            const range = `${item.dataset.min}-${item.dataset.max}`;
            filter.value = filter.value === range ? '0-10' : range;
            loadEarthquakes();
        });
        item.addEventListener('keydown', e => {
            if (['Enter', ' '].includes(e.key)) item.click();
        });
    });

    document.getElementById('em-mag-filter').addEventListener('change', loadEarthquakes);
    document.getElementById('em-time-filter').addEventListener('change', loadEarthquakes);
    document.getElementById('em-basemap').addEventListener('change', e => {
        map.removeLayer(currentBase);
        const selectedValue = e.target.value;
        currentBase = baseLayers[selectedValue] || (isDark ? baseLayers.carto_dark : baseLayers.carto_light);
        map.addLayer(currentBase);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        isDark = e.matches;

        // Update base map if 'auto' is selected
        if (document.getElementById('em-basemap').value === 'auto') {
            map.removeLayer(currentBase);
            currentBase = isDark ? baseLayers.carto_dark : baseLayers.carto_light;
            map.addLayer(currentBase);
        }

        // Update magnitude colors
        updateMagConfigColors(isDark);
        updateLegendColors();
        loadEarthquakes();
    });

    document.getElementById('current-year').textContent = new Date().getFullYear();
    updateLegendColors();

    loadEarthquakes();
    setInterval(loadEarthquakes, REFRESH_INTERVAL);
});