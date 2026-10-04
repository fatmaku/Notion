// Cat Me If You Can – Karte (Leaflet, lokal mitgeliefert) für Kartenansicht und Mini-Karten.

import { t, L as lbl, tx } from './i18n.js';
import { esc, catImg, stars, statusChip, fmtAgo, toast, errorText, modal, pct, patternLabel } from './ui.js';
import { PLACE_TYPES, PATTERNS } from '../core/taxonomy.js';

let leafletP = null;
export function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (!leafletP) {
    leafletP = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'vendor/leaflet/leaflet.css';
      document.head.append(css);
      const s = document.createElement('script');
      s.src = 'vendor/leaflet/leaflet.js';
      s.onload = () => resolve(window.L);
      s.onerror = reject;
      document.head.append(s);
    }).catch(() => {
      leafletP = null;
      return null;
    });
  }
  return leafletP;
}

const PATTERN_DOT = {
  tekir: '#8a7a68', tekir_beyaz: '#a99880', sarman: '#e9893a', sarman_beyaz: '#f0a868', krem: '#efd3a4', siyah: '#2b2b2e',
  beyaz: '#f4efe6', gri: '#8d8f96', gri_beyaz: '#b5b7bd', smokin: '#2b2b2e', uc_renk: '#e9893a', kaplumbaga: '#5a3a22',
  renk_uclu: '#e9dcc4', van: '#f4efe6', diger: '#b9a58c',
};
const STATUS_RING = { active: '#0ca30c', needs_help: '#d03b3b', in_care: '#fab219', adopted: '#2a78d6', missing: '#898781', deceased: '#52514e' };

function baseMap(L, el, app, opts = {}) {
  const region = app.config.regions[0];
  const map = L.map(el, { zoomControl: opts.zoomControl !== false, attributionControl: true, ...opts }).setView(region.center, region.zoom);
  L.tileLayer(app.config.tiles.url, { maxZoom: 19, attribution: app.config.tiles.attribution }).addTo(map);
  L.polygon(region.polygon, { color: '#f28c28', weight: 2, fill: false, dashArray: '6 6', interactive: false }).addTo(map);
  return map;
}

export async function miniMap(el, app, points) {
  if (!el || !points.length) return;
  const L = await loadLeaflet();
  if (!L) {
    el.remove();
    return;
  }
  const map = baseMap(L, el, app, { zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile });
  const pts = points.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  for (const p of pts) L.circleMarker(p, { radius: 7, color: '#fbf3e4', weight: 2, fillColor: '#f28c28', fillOpacity: 0.9 }).addTo(map);
  if (pts.length === 1) map.setView(pts[0], 16);
  else if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 17 });
}

export async function renderMap(view, app) {
  view.innerHTML = `
    <div class="mapview">
      <div class="map-el" data-map></div>
      <div class="map-ctrl">
        <label><input type="checkbox" data-layer="cats" checked> 🐱 ${esc(t('map.cats'))}</label>
        <label><input type="checkbox" data-layer="cafes" checked> ☕ ${esc(t('map.cafes'))}</label>
        <label><input type="checkbox" data-layer="food" checked> 🥣 ${esc(t('map.food'))}</label>
        <label><input type="checkbox" data-layer="heat"> 🔥 ${esc(t('map.heat'))}</label>
      </div>
      <button class="btn map-suggest" data-suggest>➕ ${esc(t('map.suggest'))}</button>
      <p class="map-note">${esc(t('map.fuzzy'))}</p>
    </div>`;
  const [data, L] = await Promise.all([app.api.map(), loadLeaflet()]);
  const el = view.querySelector('[data-map]');
  if (!L) {
    el.outerHTML = `<div class="pad"><p>${esc(t('map.offline'))}</p><ul class="cafes">${data.cats.slice(0, 100).map((c) => `<li><a href="#/cat/${esc(c.id)}">${esc(c.name || patternLabel(c.pattern))}</a> · ${esc(fmtAgo(c.lastSeenAt))}</li>`).join('')}</ul></div>`;
    return;
  }
  const map = baseMap(L, el, app);
  const layers = { cats: L.layerGroup(), cafes: L.layerGroup(), food: L.layerGroup(), heat: L.layerGroup() };

  for (const c of data.cats) {
    if (!Number.isFinite(c.lat)) continue;
    const icon = L.divIcon({
      className: 'pin-cat',
      html: `<span style="--c:${PATTERN_DOT[c.pattern] || '#b9a58c'};--ring:${STATUS_RING[c.status] || '#0ca30c'}">${c.status === 'needs_help' ? '!' : ''}${c.rarity === 'legendary' ? '★' : ''}</span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const m = L.marker([c.lat, c.lon], { icon, title: c.name || patternLabel(c.pattern) });
    m.bindPopup(() => `<a class="pop" href="#/cat/${esc(c.id)}">${catImg({ ...c, profile: { pattern: c.pattern } }, { size: 'sm' })}
      <span><b>${esc(c.name || t('card.unnamed'))}</b><br>${stars(c.rarity)}<br>${statusChip(c.status)}<br><small>${esc(L_(c.pattern))} · ${esc(fmtAgo(c.lastSeenAt))}</small></span></a>`);
    layers.cats.addLayer(m);
  }
  for (const p of data.places) {
    const isCafe = p.type === 'partner';
    const icon = L.divIcon({ className: `pin-place ${isCafe ? 'cafe' : ''}`, html: `<span>${PLACE_TYPES[p.type] ? PLACE_TYPES[p.type].icon : '📍'}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    const m = L.marker([p.lat, p.lon], { icon, title: p.name, zIndexOffset: isCafe ? 500 : 0 });
    m.bindPopup(`<b>${esc(p.name)}</b>${p.demo && !/demo/i.test(p.name) ? ` <span class="chip demo">${esc(t('common.demo'))}</span>` : ''}<br><small>${esc(lbl(PLACE_TYPES, p.type))}${p.address ? ` · ${esc(p.address)}` : ''}</small>
      ${isCafe && p.reward ? `<br>☕ <b>${esc(pct(p.reward.discountPct))}</b> · ${esc(t('v.needs', { n: p.reward.minCats }))}` : ''}${p.description ? `<br><small>${esc(tx(p.description))}</small>` : ''}`);
    (isCafe ? layers.cafes : layers.food).addLayer(m);
  }
  const maxHeat = Math.max(1, ...data.heat.map((h) => h[2]));
  for (const [la, lo, n] of data.heat) {
    L.circle([la, lo], { radius: 60 + 40 * Math.sqrt(n / maxHeat), stroke: false, fillColor: '#eb6834', fillOpacity: 0.12 + 0.4 * (n / maxHeat), interactive: false }).addTo(layers.heat);
  }
  for (const k of ['cats', 'cafes', 'food']) layers[k].addTo(map);
  view.querySelectorAll('[data-layer]').forEach((cb) => cb.addEventListener('change', () => {
    const lay = layers[cb.dataset.layer];
    if (cb.checked) lay.addTo(map);
    else map.removeLayer(lay);
  }));
  map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true });
  map.on('locationfound', (e) => L.circleMarker(e.latlng, { radius: 7, color: '#fff', weight: 3, fillColor: '#2a78d6', fillOpacity: 1 }).addTo(map));

  // Futterstelle vorschlagen: auf die Karte tippen → Formular
  view.querySelector('[data-suggest]').addEventListener('click', () => {
    if (!app.api.hasToken()) return toast(t('err.login_required'), { type: 'error' });
    toast(t('map.tapToPlace'));
    el.classList.add('picking');
    map.once('click', (e) => {
      el.classList.remove('picking');
      const m = modal(`<form class="pad" data-f><h2>➕ ${esc(t('map.suggest'))}</h2>
        <select name="type">${['feeding', 'water', 'shelter'].map((k) => `<option value="${k}">${PLACE_TYPES[k].icon} ${esc(lbl(PLACE_TYPES, k))}</option>`).join('')}</select>
        <input name="name" maxlength="60" placeholder="${esc(lbl(PLACE_TYPES, 'feeding'))}">
        <textarea name="note" rows="3" maxlength="300"></textarea>
        <div class="actions"><button class="btn primary">${esc(t('cat.send'))}</button><button type="button" class="btn" data-close>${esc(t('common.cancel'))}</button></div></form>`);
      m.el.querySelector('[data-f]').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        try {
          await app.api.suggestPlace({ type: f.type.value, name: f.name.value, note: f.note.value, lat: e.latlng.lat, lon: e.latlng.lng });
          m.close();
          toast(t('map.suggestSent'), { type: 'success' });
        } catch (err) {
          toast(errorText(err), { type: 'error' });
        }
      });
    });
  });
  return () => map.remove();
}

const L_ = (p) => lbl(PATTERNS, p || 'diger');
