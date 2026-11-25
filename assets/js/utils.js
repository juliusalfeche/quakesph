// Small pure helper functions (no page access), so they are easy to test.

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lon1, lat2, lon2) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function titleCase(text) {
    return String(text)
        .toLowerCase()
        .replace(/(^|[\s\-(/])([a-z])/g, (_, before, letter) => before + letter.toUpperCase());
}

// "17 Nov 2026, 9:17 PM" in Philippine Time, whatever the viewer's timezone is.
export function formatTimePHT(ms) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    }).formatToParts(new Date(ms));
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} ${get('dayPeriod').toUpperCase()}`;
}

export function timeAgo(ms, nowMs = Date.now()) {
    const seconds = Math.max(0, Math.round((nowMs - ms) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
}

// Returns the URL only if it is https and on an allowed host, otherwise null.
export function safeUrl(value, allowedHosts) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return null;
        return allowedHosts.includes(url.hostname) ? url.href : null;
    } catch {
        return null;
    }
}

// "2025" in the first year, then "2025–2026", "2025–2027", ...
export function copyrightYears(startYear, now = new Date()) {
    const year = now.getFullYear();
    return year > startYear ? `${startYear}\u2013${year}` : String(startYear);
}

// "9:21:05 PM" in Philippine Time.
export function formatClockPHT(ms) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    }).format(new Date(ms)).replace(/\u202f/g, ' ');
}
