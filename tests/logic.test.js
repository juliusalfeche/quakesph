import test from 'node:test';
import assert from 'node:assert/strict';

import { copyrightYears, formatTimePHT, haversineKm, safeUrl, timeAgo, titleCase } from '../assets/js/utils.js';
import { classifyMag, filterByMag, mergeSources, normalizeEmsc, normalizeUsgs, summarize } from '../assets/js/quakes.js';
import { buildUrls } from '../assets/js/api.js';

test('haversineKm: Manila to Cebu is about 570 km', () => {
    const km = haversineKm(14.5995, 120.9842, 10.3157, 123.8854);
    assert.ok(km > 560 && km < 600, `got ${km}`);
    assert.equal(haversineKm(10, 120, 10, 120), 0);
});

test('titleCase fixes ALL CAPS region names', () => {
    assert.equal(titleCase('PHILIPPINE ISLANDS REGION'), 'Philippine Islands Region');
    assert.equal(titleCase('MINDANAO, PHILIPPINES'), 'Mindanao, Philippines');
});

test('formatTimePHT always shows Philippine Time', () => {
    // 2026-11-17T13:17:00Z is 21:17 in Manila (UTC+8)
    assert.equal(formatTimePHT(Date.UTC(2026, 10, 17, 13, 17)), '17 Nov 2026, 9:17 PM');
    assert.equal(formatTimePHT(Date.UTC(2026, 10, 17, 16, 5)), '18 Nov 2026, 12:05 AM');
});

test('timeAgo', () => {
    const now = 1_000_000_000_000;
    assert.equal(timeAgo(now - 20_000, now), 'just now');
    assert.equal(timeAgo(now - 5 * 60_000, now), '5 min ago');
    assert.equal(timeAgo(now - 3 * 3_600_000, now), '3 h ago');
    assert.equal(timeAgo(now - 2 * 86_400_000, now), '2 d ago');
    assert.equal(timeAgo(now + 5000, now), 'just now');   // clock skew never shows negatives
});

test('safeUrl only allows https links on trusted hosts', () => {
    const hosts = ['earthquake.usgs.gov'];
    assert.equal(safeUrl('https://earthquake.usgs.gov/earthquakes/eventpage/us1', hosts), 'https://earthquake.usgs.gov/earthquakes/eventpage/us1');
    assert.equal(safeUrl('javascript:alert(1)', hosts), null);
    assert.equal(safeUrl('http://earthquake.usgs.gov/x', hosts), null);
    assert.equal(safeUrl('https://evil.example/x', hosts), null);
    assert.equal(safeUrl('https://earthquake.usgs.gov.evil.example/x', hosts), null);
    assert.equal(safeUrl('not a url', hosts), null);
    assert.equal(safeUrl(undefined, hosts), null);
});

test('copyrightYears updates itself every year', () => {
    assert.equal(copyrightYears(2025, new Date('2024-06-01')), '2025');
    assert.equal(copyrightYears(2025, new Date('2025-03-01')), '2025');
    assert.equal(copyrightYears(2025, new Date('2026-11-17')), '2025\u20132026');
    assert.equal(copyrightYears(2025, new Date('2031-07-04')), '2025\u20132031');
});

test('classifyMag uses inclusive lower bounds', () => {
    assert.equal(classifyMag(3.9).key, 'minor');
    assert.equal(classifyMag(4.0).key, 'light');
    assert.equal(classifyMag(4.99).key, 'light');
    assert.equal(classifyMag(5).key, 'moderate');
    assert.equal(classifyMag(6).key, 'strong');
    assert.equal(classifyMag(7.4).key, 'major');
    assert.equal(classifyMag(-0.5).key, 'minor');
});

const usgsSample = {
    features: [
        { id: 'us1', properties: { mag: 4.6, place: '10 km N of Burgos, Philippines', time: 1_700_000_000_000, url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us1' }, geometry: { coordinates: [122.1, 18.5, 35] } },
        { id: 'us2', properties: { mag: null, place: 'broken', time: 1_700_000_100_000 }, geometry: { coordinates: [122, 18, 10] } },
        { id: 'us3', properties: { mag: 3, place: '<img src=x onerror=alert(1)>', time: 1_700_000_200_000, url: 'javascript:alert(1)' }, geometry: { coordinates: [121, 14, 5] } }
    ]
};

test('normalizeUsgs skips broken records and blocks bad links', () => {
    const list = normalizeUsgs(usgsSample);
    assert.equal(list.length, 2);                              // the null magnitude one is dropped
    assert.equal(list[0].url, 'https://earthquake.usgs.gov/earthquakes/eventpage/us1');
    assert.equal(list[1].url, null);                           // javascript: link removed
    assert.equal(list[1].place, '<img src=x onerror=alert(1)>'); // kept as plain text; the UI never uses innerHTML
    assert.deepEqual(normalizeUsgs(null), []);
    assert.deepEqual(normalizeUsgs({ features: 'nope' }), []);
});

test('normalizeEmsc reads region, ISO time and negative depth', () => {
    const list = normalizeEmsc({ features: [
        { id: '20261117_0000123', properties: { mag: 3.2, flynn_region: 'MINDANAO, PHILIPPINES', time: '2026-11-17T13:17:20.5Z' }, geometry: { coordinates: [125.1, 7.2, -33] } }
    ] });
    assert.equal(list.length, 1);
    assert.equal(list[0].place, 'Mindanao, Philippines');
    assert.equal(list[0].depth, 33);
    assert.equal(list[0].time, Date.parse('2026-11-17T13:17:20.5Z'));
    assert.equal(list[0].source, 'EMSC');
});

test('mergeSources removes the same quake reported twice and sorts newest first', () => {
    const usgs = [{ id: 'USGS:a', source: 'USGS', mag: 4.1, lat: 10, lon: 125, time: 1_000_000, depth: 10, place: 'x', url: null }];
    const emsc = [
        { id: 'EMSC:dup', source: 'EMSC', mag: 4.0, lat: 10.2, lon: 125.1, time: 1_030_000, depth: 12, place: 'x', url: null },     // 30 s, ~25 km: duplicate
        { id: 'EMSC:far', source: 'EMSC', mag: 3.1, lat: 10.2, lon: 125.1, time: 1_500_000, depth: 12, place: 'y', url: null },     // 8 min later: different quake
        { id: 'EMSC:other', source: 'EMSC', mag: 3.0, lat: 15, lon: 120, time: 1_010_000, depth: 8, place: 'z', url: null }          // same time, 700 km away
    ];
    const merged = mergeSources(usgs, emsc);
    assert.deepEqual(merged.map((q) => q.id), ['EMSC:far', 'EMSC:other', 'USGS:a']);
});

test('filterByMag and summarize', () => {
    const q = (id, mag, time) => ({ id, mag, time, lat: 0, lon: 0, depth: 1, place: '', url: null, source: 'USGS' });
    const list = [q('a', 6.1, 3), q('b', 4.2, 2), q('c', 2.9, 1)];
    assert.equal(filterByMag(list, 4).length, 2);
    assert.equal(filterByMag(list, 0).length, 3);
    const s = summarize(list);
    assert.equal(s.count, 3);
    assert.equal(s.latest.id, 'a');
    assert.equal(s.strongest.id, 'a');
    assert.deepEqual(s.counts, { major: 0, strong: 1, moderate: 0, light: 1, minor: 1 });
    assert.deepEqual(summarize([]), { count: 0, latest: null, strongest: null, counts: { major: 0, strong: 0, moderate: 0, light: 0, minor: 0 } });
});

test('buildUrls: EMSC only for small quakes, parameters are encoded', () => {
    const now = Date.UTC(2026, 10, 17, 12, 0, 0);
    const all = buildUrls('day', 0, now);
    assert.match(all.usgs, /starttime=2026-11-16T12%3A00%3A00/);
    assert.match(all.usgs, /minlatitude=4/);
    assert.ok(!all.usgs.includes('minmagnitude'));
    assert.match(all.emsc, /maxmag=3.9/);
    const strong = buildUrls('week', 5, now);
    assert.match(strong.usgs, /minmagnitude=5/);
    assert.equal(strong.emsc, null);
    assert.ok(buildUrls('bogus', 0, now).usgs.includes('starttime=2026-11-16'));   // unknown period falls back to a day
});
