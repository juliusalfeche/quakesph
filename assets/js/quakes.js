// Turns raw data from USGS / EMSC into one clean list. Pure functions, easy to test.

import { MAG_CLASSES, TRUSTED_LINK_HOSTS } from './config.js';
import { haversineKm, safeUrl, titleCase } from './utils.js';

export function classifyMag(mag) {
    return MAG_CLASSES.find((c) => mag >= c.min) ?? MAG_CLASSES[MAG_CLASSES.length - 1];
}

const num = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value));

function build(source, id, mag, lat, lon, depth, time, place, url) {
    mag = num(mag); lat = num(lat); lon = num(lon); time = num(time); depth = Math.abs(num(depth));
    if (![mag, lat, lon, time].every(Number.isFinite)) return null;   // skip broken records
    return {
        id: `${source}:${id ?? `${time}:${lat}:${lon}`}`,
        source, mag, lat, lon, time,
        depth: Number.isFinite(depth) ? depth : null,
        place: place || 'Unknown location',
        url: url ? safeUrl(url, TRUSTED_LINK_HOSTS) : null
    };
}

export function normalizeUsgs(json) {
    const features = Array.isArray(json?.features) ? json.features : [];
    return features.map((f) => {
        const [lon, lat, depth] = f?.geometry?.coordinates ?? [];
        const p = f?.properties ?? {};
        return build('USGS', f?.id, p.mag, lat, lon, depth, p.time, p.place, p.url);
    }).filter(Boolean);
}

export function normalizeEmsc(json) {
    const features = Array.isArray(json?.features) ? json.features : [];
    return features.map((f) => {
        const [lon, lat, depth] = f?.geometry?.coordinates ?? [];
        const p = f?.properties ?? {};
        const region = p.flynn_region ? titleCase(p.flynn_region) : '';
        return build('EMSC', f?.id ?? p.unid, p.mag, lat, lon, depth ?? p.depth, Date.parse(p.time), region, null);
    }).filter(Boolean);
}

// Same quake reported by two agencies: within 90 s and 60 km. We keep the USGS copy.
export function mergeSources(usgs, emsc) {
    const merged = [...usgs];
    for (const q of emsc) {
        const duplicate = usgs.some((u) =>
            Math.abs(u.time - q.time) <= 90_000 && haversineKm(u.lat, u.lon, q.lat, q.lon) <= 60);
        if (!duplicate) merged.push(q);
    }
    return merged.sort((a, b) => b.time - a.time);   // newest first
}

export function filterByMag(quakes, minMag) {
    return quakes.filter((q) => q.mag >= minMag);
}

export function summarize(quakes) {
    const counts = Object.fromEntries(MAG_CLASSES.map((c) => [c.key, 0]));
    let strongest = null;
    for (const q of quakes) {
        counts[classifyMag(q.mag).key] += 1;
        if (!strongest || q.mag > strongest.mag) strongest = q;
    }
    return { count: quakes.length, latest: quakes[0] ?? null, strongest, counts };
}
