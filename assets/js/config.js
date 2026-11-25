// All the settings in one place. Change things here, not deep inside the code.

export const START_YEAR = 2025;           // first year, for the copyright line
export const REFRESH_MS = 60_000;         // auto-refresh every minute
export const FETCH_TIMEOUT_MS = 15_000;   // give up on a slow data source after 15 s
export const LIST_PAGE_SIZE = 50;         // quakes shown before "Show more"

// Area we ask the seismic networks about (degrees).
export const PH_BOUNDS = { south: 4, west: 116, north: 21, east: 135 };

// Where the map starts, and how far people can pan.
export const MAP_VIEW = [[4.2, 116.5], [21.2, 127.2]];
export const MAP_LIMITS = [[-2, 108], [28, 145]];

export const PERIODS = {
    hour: { label: 'Last hour', ms: 60 * 60 * 1000 },
    day: { label: 'Last day', ms: 24 * 60 * 60 * 1000 },
    week: { label: 'Last week', ms: 7 * 24 * 60 * 60 * 1000 },
    month: { label: 'Last month', ms: 30 * 24 * 60 * 60 * 1000 }
};

// Magnitude classes. "min" is inclusive, so 4.0 counts as Light.
export const MAG_CLASSES = [
    { key: 'major', label: 'Major', min: 7, color: '#e040fb' },
    { key: 'strong', label: 'Strong', min: 6, color: '#ff5252' },
    { key: 'moderate', label: 'Moderate', min: 5, color: '#ff9800' },
    { key: 'light', label: 'Light', min: 4, color: '#ffd54f' },
    { key: 'minor', label: 'Minor', min: -Infinity, color: '#5dade2' }
];

// Only links to these hosts are ever shown (protects against bad data).
export const TRUSTED_LINK_HOSTS = ['earthquake.usgs.gov'];

export const DEFAULTS = { period: 'day', minMag: '0', basemap: 'dark', plates: true };
