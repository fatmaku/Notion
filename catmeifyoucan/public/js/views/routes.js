// Cat Me If You Can – Katzen-Spaziergänge: alle Wege (#/routes) und ein Weg auf der Karte (#/routes/<id>).
// Die Linie heißt nur „ungefähr hier lang“; „Los geht’s“ öffnet die Karten-App des Handys (Google Maps,
// Fußweg mit Zwischenpunkten). Katzen erscheinen nur als gerundete Hitzeflecken, nie als genaue Punkte.

import { t, tx } from '../i18n.js';
import { esc, bdi, sep, fmtNum, catImg, pct, patternLabel } from '../ui.js';
import { loadLeaflet } from '../map.js';

const MAPS_RE = /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&/;
/** Nur Links, die wirklich zu Google Maps führen (Antwort kommt vom Server – trotzdem prüfen). */
const safeMaps = (u) => (typeof u === 'string' && MAPS_RE.test(u) ? u : null);
const km = (m) => t('common.km', { n: Math.round(m / 100) / 10 });
const mins = (n) => t('routes.min', { n });
const back = () => `<button class="back" data-back><span class="dir-ic" aria-hidden="true">‹</span> ${esc(t('common.back'))}</button>`;

/** Übersetzung mit HTML im Platzhalter (z. B. fetter, isolierter Name): Rest wird escaped. */
function tHtml(key, name, html) {
  const parts = t(key, { [name]: '\u0000' }).split('\u0000');
  return parts.map(esc).join(html);
}

const demoChip = (c) => (c.demo && !/demo/i.test(c.name) ? ` <span class="chip demo">${esc(t('common.demo'))}</span>` : '');

function cafeHtml(r) {
  const c = r.cafeAtEnd || r.cafes[0];
  if (!c) return `<span class="muted">${esc(t('routes.noCafe'))}</span>`;
  const deal = c.reward && c.reward.discountPct ? t('v.discount', { n: c.reward.discountPct }) : '';
  return `${tHtml(r.cafeAtEnd ? 'routes.cafeEnd' : 'routes.cafeWay', 'name', `<b>${bdi(c.name)}</b>`)}${demoChip(c)}${deal ? `${esc(sep())}<span class="walk-deal">${esc(deal)}</span>` : ''}`;
}

function fromTo(r) {
  return `<span>${tHtml('routes.from', 'place', bdi(tx(r.start)))}</span> <span class="dir-ic" aria-hidden="true">→</span> <span>${tHtml('routes.to', 'place', bdi(tx(r.finish)))}</span>`;
}

function bestBadge() {
  return `<p class="walk-best"><span aria-hidden="true">⭐</span> <b>${esc(t('routes.best'))}</b> <small>${esc(t('routes.bestWhy'))}</small></p>`;
}

function startButton(r, cls = '') {
  const url = safeMaps(r.mapsUrl);
  return url ? `<a class="btn primary ${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">🧭</span> ${esc(t('routes.start'))}</a>` : '';
}

function tipsHtml() {
  return `<section class="card walk-tips">
      <h2><span aria-hidden="true">🐾</span> ${esc(t('routes.tipsTitle'))}</h2>
      <ul>${['routes.tip1', 'routes.tip2', 'routes.tip3', 'routes.tip4'].map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>
    </section>`;
}

function cardHtml(r) {
  const hid = `walk-${esc(r.id)}`;
  return `
    <article class="card walk-card${r.best ? ' best' : ''}" aria-labelledby="${hid}">
      ${r.best ? bestBadge() : ''}
      <div class="walk-top">
        <span class="walk-ico" aria-hidden="true">${esc(r.icon)}</span>
        <div>
          <h2 id="${hid}">${esc(tx(r.name))}</h2>
          <p class="walk-meta"><span>${esc(km(r.distanceM))}</span><span>${esc(mins(r.durationMin))}</span></p>
        </div>
      </div>
      <p class="walk-story">${esc(tx(r.story))}</p>
      <ul class="walk-facts">
        <li><span aria-hidden="true">🐱</span><span>${esc(r.cats ? t('routes.catsWeek', { n: r.cats }) : t('routes.noCats'))}</span></li>
        ${r.needHelp ? `<li class="walk-help"><span aria-hidden="true">🆘</span><a href="#/help">${esc(t('home.help', { n: r.needHelp }))}</a></li>` : ''}
        <li><span aria-hidden="true">☕</span><span>${cafeHtml(r)}</span></li>
        ${r.mine && r.mine.today ? `<li class="walk-mine"><span aria-hidden="true">✅</span><span>${esc(t('routes.mine', { n: r.mine.today }))}</span></li>` : ''}
      </ul>
      <p class="walk-ends small muted"><span aria-hidden="true">📍</span> ${fromTo(r)}</p>
      <div class="actions walk-actions">
        ${startButton(r)}
        <a class="btn" href="#/routes/${esc(encodeURIComponent(r.id))}"><span aria-hidden="true">🗺️</span> ${esc(t('routes.show'))}</a>
      </div>
    </article>`;
}

/** #/routes – alle Wege, der beste („gerade die meisten Katzen“) oben. */
export async function renderRoutes(view, app) {
  const data = await app.api.routes();
  view.innerHTML = `
    ${back()}
    <header class="walks-head">
      <h1><span aria-hidden="true">🚶</span> ${esc(t('routes.title'))}</h1>
      <p>${esc(t('routes.lead'))}</p>
    </header>
    ${data.routes.length ? data.routes.map(cardHtml).join('') : `<div class="empty"><div class="big-emoji">🚶</div><p>${esc(t('routes.none'))}</p></div>`}
    ${tipsHtml()}
    <p class="small muted walk-note">${esc(t('routes.rough'))}</p>`;
}

function cafeLi(c, r) {
  const atEnd = r.cafeAtEnd && r.cafeAtEnd.id === c.id;
  return `<li><span class="cafe-ico" aria-hidden="true">☕</span>
      <span><b>${bdi(c.name)}</b>${demoChip(c)}${atEnd ? ` <span class="chip walk-end-chip"><span aria-hidden="true">🏁</span> ${esc(t('routes.finishPin'))}</span>` : ''}<br><small class="muted">${esc(c.address || '')}</small></span>
      <span class="cafe-deal">${c.reward && c.reward.discountPct ? `<b>${esc(pct(c.reward.discountPct))}</b><small>${esc(t('v.needs', { n: c.reward.minCats }))}</small>` : ''}</span>
    </li>`;
}

/** #/routes/<id> – der Weg auf der Karte mit Start, Ziel, Cafés und gerundeten Katzen-Flecken. */
export async function renderRoute(view, app, id) {
  const r = await app.api.route(id);
  view.innerHTML = `
    ${back()}
    <header class="walk-head">
      ${r.best ? bestBadge() : ''}
      <h1><span class="walk-ico" aria-hidden="true">${esc(r.icon)}</span> ${esc(tx(r.name))}</h1>
      <p class="walk-meta"><span>${esc(km(r.distanceM))}</span><span>${esc(mins(r.durationMin))}</span></p>
      <div class="walk-cta">${startButton(r, 'big')}<p class="small muted">${esc(t('routes.startHint'))}</p></div>
    </header>
    <div class="walk-map" data-map aria-label="${esc(tx(r.name))}"></div>
    <p class="walk-legend small muted"><span class="walk-dash" aria-hidden="true"></span><span>${esc(t('routes.rough'))}</span></p>
    ${r.heat.length ? `<p class="walk-legend small muted"><span class="walk-heat-dot" aria-hidden="true"></span><span>${esc(t('routes.heat'))}</span></p>` : ''}
    <div class="walk-stats">
      <div class="stat"><span class="stat-l">${esc(t('routes.statCats'))}</span><span class="stat-v">${fmtNum(r.cats)}</span></div>
      <div class="stat"><span class="stat-l">${esc(t('stats.help'))}</span><span class="stat-v">${fmtNum(r.needHelp)}</span></div>
      ${r.mine ? `<div class="stat"><span class="stat-l">${esc(t('routes.statMine'))}</span><span class="stat-v">${fmtNum(r.mine.today)}</span></div>` : ''}
    </div>

    <section class="card">
      <p class="walk-story">${esc(tx(r.story))}</p>
      <p class="walk-ends small"><span aria-hidden="true">📍</span> ${fromTo(r)}</p>
      ${r.needHelp ? `<p class="small"><a href="#/help"><span aria-hidden="true">🆘</span> ${esc(t('stats.helpRadar'))}</a></p>` : ''}
    </section>

    <section class="card">
      <h2><span aria-hidden="true">☕</span> ${esc(t('routes.cafes'))}</h2>
      ${r.cafes.length ? `<ul class="cafes">${r.cafes.map((c) => cafeLi(c, r)).join('')}</ul>` : `<p class="muted">${esc(t('routes.noCafe'))}</p>`}
    </section>

    <section class="card">
      <h2><span aria-hidden="true">🐱</span> ${esc(t('routes.catsHere'))}</h2>
      ${r.catList.length ? `<div class="strip">${r.catList.map((c) => `
        <a class="strip-item" href="#/cat/${esc(encodeURIComponent(c.id))}">${catImg(c, { size: 'sm' })}<span>${c.name ? bdi(c.name) : esc(patternLabel(c.pattern))}</span></a>`).join('')}</div>`
        : `<p class="muted">${esc(t('routes.noCats'))}</p>`}
      <p class="small muted">${esc(t('map.fuzzy'))}</p>
    </section>
    ${tipsHtml()}`;

  const el = view.querySelector('[data-map]');
  const L = await loadLeaflet();
  if (!document.body.contains(el)) return undefined; // schon weiternavigiert
  if (!L) {
    el.outerHTML = `<p class="note">${esc(t('routes.mapOff'))}</p>`;
    return undefined;
  }
  const pts = r.waypoints;
  const map = L.map(el, { scrollWheelZoom: false, attributionControl: true, zoomSnap: 0.25 }); // feiner Zoom: der Weg füllt die Karte
  L.tileLayer(app.config.tiles.url, { maxZoom: 19, attribution: app.config.tiles.attribution }).addTo(map);

  // Katzen: nur gerundete Zellen als weiche Flecken (wie „Viele Katzen“ auf der großen Karte)
  const maxHeat = Math.max(1, ...r.heat.map((h) => h[2]));
  for (const [la, lo, n] of r.heat) {
    L.circle([la, lo], { radius: 60 + 50 * Math.sqrt(n / maxHeat), stroke: false, fillColor: '#eb6834', fillOpacity: 0.12 + 0.3 * (n / maxHeat), interactive: false }).addTo(map);
  }
  // „Ungefähr hier lang“: gestrichelte Linie mit dunklem Saum (auf hellen und dunklen Kacheln lesbar)
  L.polyline(pts, { color: '#14213d', weight: 9, opacity: 0.22, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  L.polyline(pts, { color: '#f28c28', weight: 5, dashArray: '10 9', lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  for (const p of pts.slice(1, -1)) L.circleMarker(p, { radius: 5, color: '#fffdf8', weight: 2, fillColor: '#f28c28', fillOpacity: 1, interactive: false }).addTo(map);

  const pin = (cls, emoji) => L.divIcon({ className: `walk-pin ${cls}`, html: `<span>${emoji}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
  L.marker(pts[0], { icon: pin('start', '🚶'), title: t('routes.startPin'), zIndexOffset: 900 })
    .bindPopup(`<b>${esc(t('routes.startPin'))}</b><br>${bdi(tx(r.start))}`).addTo(map);
  L.marker(pts[pts.length - 1], { icon: pin('finish', '🏁'), title: t('routes.finishPin'), zIndexOffset: 900 })
    .bindPopup(`<b>${esc(t('routes.finishPin'))}</b><br>${bdi(tx(r.finish))}`).addTo(map);
  for (const c of r.cafes) {
    const icon = L.divIcon({ className: 'pin-place cafe', html: '<span>☕</span>', iconSize: [30, 30], iconAnchor: [15, 15] });
    L.marker([c.lat, c.lon], { icon, title: c.name, zIndexOffset: 500 })
      .bindPopup(`<b>${bdi(c.name)}</b>${demoChip(c)}${c.reward && c.reward.discountPct ? `<br>☕ <b>${esc(pct(c.reward.discountPct))}</b>${esc(sep())}${esc(t('v.needs', { n: c.reward.minCats }))}` : ''}${c.address ? `<br><small>${esc(c.address)}</small>` : ''}`)
      .addTo(map);
  }
  const bounds = L.latLngBounds(pts);
  if (r.cafeAtEnd) bounds.extend([r.cafeAtEnd.lat, r.cafeAtEnd.lon]);
  map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
  map.locate({ setView: false, enableHighAccuracy: true });
  map.on('locationfound', (e) => L.circleMarker(e.latlng, { radius: 7, color: '#fff', weight: 3, fillColor: '#2a78d6', fillOpacity: 1, interactive: false }).addTo(map));
  map.on('locationerror', () => {}); // ohne Standort geht es auch
  return () => map.remove();
}
