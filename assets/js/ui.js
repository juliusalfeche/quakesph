// Draws things on the page. Text is always set with textContent (never innerHTML),
// so nothing coming from an outside server can ever run as code.

import { MAG_CLASSES } from './config.js';
import { classifyMag } from './quakes.js';
import { formatTimePHT, timeAgo } from './utils.js';

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

const depthText = (q) => (q.depth === null ? 'depth unknown' : `${Math.round(q.depth * 10) / 10} km deep`);

export function applyMagnitudeColors() {
    MAG_CLASSES.forEach((c) => document.documentElement.style.setProperty(`--mag-${c.key}`, c.color));
}

export function renderStats(summary, periodLabel, now = Date.now()) {
    $('stat-count').textContent = String(summary.count);
    $('stat-count-sub').textContent = periodLabel.toLowerCase();
    $('stat-strongest').textContent = summary.strongest ? `M${summary.strongest.mag.toFixed(1)}` : '\u2013';
    $('stat-strongest-sub').textContent = summary.strongest ? summary.strongest.place : 'no quakes';
    $('stat-latest').textContent = summary.latest ? timeAgo(summary.latest.time, now) : '\u2013';
    $('stat-latest-sub').textContent = summary.latest ? summary.latest.place : 'no quakes';
}

export function renderLegend(counts) {
    document.querySelectorAll('[data-legend]').forEach((item) => {
        item.querySelector('.legend__count').textContent = String(counts[item.dataset.legend] ?? 0);
    });
}

function quakeItem(q, now) {
    const cls = classifyMag(q.mag);
    const item = el('li', 'quake');

    const main = el('button', 'quake__main');
    main.type = 'button';
    main.dataset.id = q.id;
    main.setAttribute('aria-label', `Magnitude ${q.mag.toFixed(1)}, ${q.place}, ${timeAgo(q.time, now)}. Show on map.`);

    const body = el('span', 'quake__body');
    const meta = el('span', 'quake__meta');
    const time = el('time', null, formatTimePHT(q.time));
    time.dateTime = new Date(q.time).toISOString();
    meta.append(time, document.createTextNode(` PHT \u00b7 ${depthText(q)} \u00b7 ${q.source}`));
    body.append(el('span', 'quake__place', q.place), meta);

    main.append(el('span', `mag mag--${cls.key}`, q.mag.toFixed(1)), body, el('span', 'quake__ago', timeAgo(q.time, now)));
    item.append(main);

    if (q.url) {
        const link = el('a', 'quake__link', 'Details');
        link.href = q.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `Details for ${q.place} on USGS (opens in a new tab)`);
        item.append(link);
    }
    return item;
}

export function renderList(quakes, limit, now = Date.now()) {
    const fragment = document.createDocumentFragment();
    quakes.slice(0, limit).forEach((q) => fragment.append(quakeItem(q, now)));
    $('quake-list').replaceChildren(fragment);
    $('empty').hidden = quakes.length > 0;
    const more = $('more');
    more.hidden = quakes.length <= limit;
    more.textContent = `Show more (${quakes.length - limit} left)`;
}

export function buildPopup(q) {
    const root = el('div', 'popup');
    const head = el('div', 'popup__head');
    head.append(el('span', `mag mag--${classifyMag(q.mag).key}`, q.mag.toFixed(1)), el('strong', 'popup__place', q.place));
    root.append(head);

    const facts = el('dl', 'popup__facts');
    [['Time', `${formatTimePHT(q.time)} PHT`], ['Depth', q.depth === null ? 'Unknown' : `${Math.round(q.depth * 10) / 10} km`], ['Source', q.source]]
        .forEach(([label, value]) => facts.append(el('dt', null, label), el('dd', null, value)));
    root.append(facts);

    if (q.url) {
        const link = el('a', 'popup__link', 'More details on USGS');
        link.href = q.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        root.append(link);
    }
    return root;
}

export function setStatus(text, kind = 'info') {
    const status = $('status');
    status.textContent = text;
    status.dataset.kind = kind;
    status.hidden = text === '';
    $('retry').hidden = kind !== 'error';
}

export function setNotice(text) {
    $('notice').textContent = text;
    $('notice').hidden = text === '';
}

export function setUpdated(text) { $('updated').textContent = text; }
export function setBusy(busy) { $('quake-list').setAttribute('aria-busy', String(busy)); }
export function setDistance(text) { $('distance').textContent = text; }
export function setMapNotice(text) { $('map-notice').textContent = text; $('map-notice').hidden = text === ''; }
export function showMapFallback() { $('map-fallback').hidden = false; $('map').hidden = true; }
