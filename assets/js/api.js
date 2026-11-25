// Talks to the two seismic networks. Never throws because one source is down.

import { FETCH_TIMEOUT_MS, PERIODS, PH_BOUNDS } from './config.js';
import { mergeSources, normalizeEmsc, normalizeUsgs } from './quakes.js';

const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const EMSC_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query';

const stamp = (ms) => new Date(ms).toISOString().slice(0, 19);   // 2026-11-17T12:00:00

async function getJson(url, signal) {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), FETCH_TIMEOUT_MS);
    const cancel = () => timeout.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    try {
        const response = await fetch(url, { signal: timeout.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
    }
}

export function buildUrls(periodKey, minMag, now = Date.now()) {
    const end = now;
    const start = end - (PERIODS[periodKey] ?? PERIODS.day).ms;
    const { south, west, north, east } = PH_BOUNDS;

    const usgs = new URLSearchParams({
        format: 'geojson', orderby: 'time', starttime: stamp(start), endtime: stamp(end),
        minlatitude: south, maxlatitude: north, minlongitude: west, maxlongitude: east
    });
    if (minMag > 0) usgs.set('minmagnitude', minMag);

    // EMSC only fills in the small quakes (below M4); USGS covers the rest.
    let emsc = null;
    if (minMag < 4) {
        emsc = new URLSearchParams({
            format: 'json', limit: 1000, starttime: stamp(start), endtime: stamp(end),
            minlat: south, maxlat: north, minlon: west, maxlon: east,
            minmag: Math.max(minMag, 0), maxmag: 3.9
        });
    }
    return {
        usgs: `${USGS_URL}?${usgs}`,
        emsc: emsc ? `${EMSC_URL}?${emsc}` : null
    };
}

// Returns { quakes, failed: ['USGS', ...] }. Throws only if the request was cancelled.
export async function fetchQuakes({ period, minMag, signal }) {
    const urls = buildUrls(period, minMag);
    const jobs = [
        { name: 'USGS', run: () => getJson(urls.usgs, signal).then(normalizeUsgs) },
        urls.emsc && { name: 'EMSC', run: () => getJson(urls.emsc, signal).then(normalizeEmsc) }
    ].filter(Boolean);

    const results = await Promise.allSettled(jobs.map((j) => j.run()));
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    const failed = [];
    const lists = { USGS: [], EMSC: [] };
    results.forEach((result, i) => {
        if (result.status === 'fulfilled') lists[jobs[i].name] = result.value;
        else failed.push(jobs[i].name);
    });
    return { quakes: mergeSources(lists.USGS, lists.EMSC), failed, total: jobs.length };
}
