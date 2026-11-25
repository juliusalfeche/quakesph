// QuakesPH: wires the data, the map and the page together.

import { DEFAULTS, LIST_PAGE_SIZE, PERIODS, REFRESH_MS, START_YEAR } from './config.js';
import { fetchQuakes } from './api.js';
import { filterByMag, summarize } from './quakes.js';
import { createQuakeMap } from './map.js';
import * as ui from './ui.js';
import { copyrightYears, formatClockPHT, haversineKm } from './utils.js';

const PLATES_URL = 'assets/data/plates-ph.json';
const PREFS_KEY = 'quakesph:prefs';
const MAG_OPTIONS = ['0', '4', '5', '6', '7'];
const BASEMAP_OPTIONS = ['dark', 'satellite', 'streets'];

const $ = (id) => document.getElementById(id);

// ---------- remembered settings (stays on this device) ----------
function loadPrefs() {
    try {
        const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
        return {
            period: saved.period in PERIODS ? saved.period : DEFAULTS.period,
            minMag: MAG_OPTIONS.includes(saved.minMag) ? saved.minMag : DEFAULTS.minMag,
            basemap: BASEMAP_OPTIONS.includes(saved.basemap) ? saved.basemap : DEFAULTS.basemap,
            plates: typeof saved.plates === 'boolean' ? saved.plates : DEFAULTS.plates
        };
    } catch {
        return { ...DEFAULTS };
    }
}

function savePrefs() {
    try {
        const { period, minMag, basemap, plates } = state;
        localStorage.setItem(PREFS_KEY, JSON.stringify({ period, minMag, basemap, plates }));
    } catch { /* storage can be blocked; the app still works */ }
}

// ---------- state ----------
const state = {
    ...loadPrefs(),
    quakes: [],
    shown: LIST_PAGE_SIZE,
    user: null,            // { lat, lon } only lives in memory, never saved or sent anywhere
    controller: null,
    lastLoad: 0,
    signature: ''
};

let map = null;

// ---------- drawing ----------
function updateDistance() {
    const latest = state.quakes[0];
    if (!state.user) return;
    if (!latest) {
        ui.setDistance('No recent quakes to measure from.');
        map?.clearUser();
        return;
    }
    const km = Math.round(haversineKm(state.user.lat, state.user.lon, latest.lat, latest.lon));
    ui.setDistance(`The latest quake (M${latest.mag.toFixed(1)}) was ${km.toLocaleString('en-US')} km from you.`);
}

function render({ redrawMap = true } = {}) {
    const summary = summarize(state.quakes);
    ui.renderStats(summary, PERIODS[state.period].label);
    ui.renderLegend(summary.counts);
    ui.renderList(state.quakes, state.shown);
    if (redrawMap) {
        map?.render(state.quakes, { latestId: summary.latest?.id, popupFor: ui.buildPopup });
        if (state.user) map?.showUser(state.user.lat, state.user.lon, summary.latest);
    }
    updateDistance();
}

// ---------- loading data ----------
async function load({ background = false } = {}) {
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;

    if (!background) {
        ui.setStatus('Loading earthquakes\u2026', 'loading');
        ui.setBusy(true);
    }

    try {
        const { quakes, failed, total } = await fetchQuakes({
            period: state.period, minMag: Number(state.minMag), signal: controller.signal
        });
        if (controller !== state.controller) return;

        if (failed.length === total) {
            // Nothing could be reached. Keep whatever is already on screen.
            ui.setStatus('Could not reach the seismic networks. Check your connection and try again.', 'error');
            ui.setUpdated('Offline?');
            return;
        }

        state.quakes = filterByMag(quakes, Number(state.minMag));
        state.lastLoad = Date.now();
        const signature = state.quakes.map((q) => q.id).join('|');
        const changed = signature !== state.signature;
        state.signature = signature;

        ui.setStatus('', 'info');
        ui.setNotice(failed.length ? `${failed.join(' and ')} could not be reached, so some quakes may be missing.` : '');
        ui.setUpdated(`Updated ${formatClockPHT(state.lastLoad)} PHT`);
        render({ redrawMap: changed || !background });
    } catch (error) {
        if (error?.name === 'AbortError') return;
        console.error(error);
        ui.setStatus('Something went wrong while loading quakes.', 'error');
    } finally {
        if (controller === state.controller) ui.setBusy(false);
    }
}

// ---------- controls ----------
function syncForm() {
    document.querySelector(`input[name="period"][value="${state.period}"]`).checked = true;
    document.querySelector(`input[name="mag"][value="${state.minMag}"]`).checked = true;
    document.querySelector(`input[name="basemap"][value="${state.basemap}"]`).checked = true;
    $('plates').checked = state.plates;
}

function onFilterChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.name === 'period') state.period = input.value;
    else if (input.name === 'mag') state.minMag = input.value;
    else if (input.name === 'basemap') { state.basemap = input.value; ui.setMapNotice(''); map?.setBasemap(state.basemap); }
    else if (input.name === 'plates') { state.plates = input.checked; map?.setPlates(state.plates, PLATES_URL); }

    savePrefs();
    if (input.name === 'period' || input.name === 'mag') {
        state.shown = LIST_PAGE_SIZE;
        load();
    }
}

function locate() {
    const button = $('locate');
    if (!('geolocation' in navigator)) {
        ui.setDistance('Your browser cannot share its location.');
        return;
    }
    button.disabled = true;
    ui.setDistance('Finding your location\u2026');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.user = { lat: position.coords.latitude, lon: position.coords.longitude };
            button.disabled = false;
            button.querySelector('span').textContent = 'Update my location';
            const latest = state.quakes[0] ?? null;
            map?.showUser(state.user.lat, state.user.lon, latest, { fit: true });
            updateDistance();
        },
        (error) => {
            button.disabled = false;
            ui.setDistance(error.code === 1
                ? 'Location permission was blocked. Allow it in your browser\u2019s site settings to see distances.'
                : 'Could not get your location. Please try again.');
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
}

// ---------- start ----------
function start() {
    ui.applyMagnitudeColors();
    $('copyright-years').textContent = copyrightYears(START_YEAR);
    syncForm();

    map = createQuakeMap($('map'), { onTileTrouble: () => ui.setMapNotice('Map tiles are not loading. Check your connection or try another map style.') });
    if (map) {
        map.setBasemap(state.basemap);
        map.setPlates(state.plates, PLATES_URL);
    } else {
        ui.showMapFallback();
    }

    $('controls').addEventListener('change', onFilterChange);
    $('filters').addEventListener('submit', (event) => event.preventDefault());
    $('locate').addEventListener('click', locate);
    $('reset-view').addEventListener('click', () => map?.resetView());
    $('retry').addEventListener('click', () => load());
    $('more').addEventListener('click', () => { state.shown += LIST_PAGE_SIZE; render({ redrawMap: false }); });
    $('quake-list').addEventListener('click', (event) => {
        const row = event.target.closest('.quake__main');
        if (!row) return;
        map?.focusQuake(row.dataset.id);
        $('map').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    });

    // Refresh every minute, but not while the tab is hidden.
    setInterval(() => { if (!document.hidden) load({ background: true }); }, REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Date.now() - state.lastLoad > REFRESH_MS) load({ background: true });
    });

    load();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline mode unavailable:', error));
    }
}

start();
