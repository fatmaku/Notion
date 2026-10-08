// Katzen-Spaziergänge („Kedi rotaları“): Wegpunkte, Rechnung, Google-Maps-Link, API-Form,
// Tierschutz (nie genaue Katzen-Koordinaten), „deine Katzen heute“, bester Weg, Texte in 6 Sprachen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { WALKS, WALK_RULES } from '../public/config/routes.js';
import { REGIONS } from '../public/config/regions.js';
import { haversine, pointInPolygon } from '../public/core/geo.js';
import {
  legLengthsM, pathLengthM, walkDistanceM, walkMinutes, distanceToPathM, mapsUrl, pickEvenly, validateWalk,
} from '../public/core/routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const jpeg = `data:image/jpeg;base64,${fs.readFileSync(path.join(here, 'fixtures', 'cat.jpg')).toString('base64')}`;
const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
const DAY = 86400000;
const walk = (id) => WALKS.find((w) => w.id === id);

// ---------------------------------------------------------------- Konfiguration

test('Wege: 3–4 Wege, eindeutige IDs, alle Punkte im Kadıköy-Polygon, Abschnitte < 900 m', () => {
  assert.ok(WALKS.length >= 3 && WALKS.length <= 4, 'drei bis vier Wege');
  assert.equal(new Set(WALKS.map((w) => w.id)).size, WALKS.length, 'IDs eindeutig');
  const kadikoy = REGIONS.find((r) => r.id === 'kadikoy');
  for (const w of WALKS) {
    assert.deepEqual(validateWalk(w, REGIONS), [], `${w.id} ist gültig`);
    assert.equal(w.regionId, 'kadikoy');
    assert.ok(w.waypoints.length >= 3 && w.waypoints.length <= 2 + WALK_RULES.mapsWaypoints, `${w.id}: 3–5 Punkte`);
    for (const [lat, lon] of w.waypoints) {
      assert.ok(pointInPolygon(lat, lon, kadikoy.polygon), `${w.id}: ${lat},${lon} liegt in Kadıköy (ohne Randpuffer)`);
      const withPoly = kadikoy.districts.filter((d) => Array.isArray(d.polygon) && d.polygon.length > 2);
      if (withPoly.length) assert.ok(withPoly.some((d) => pointInPolygon(lat, lon, d.polygon)), `${w.id}: ${lat},${lon} liegt in einem Viertel`);
    }
    for (const m of legLengthsM(w.waypoints)) assert.ok(m < 900 && m > 30, `${w.id}: Abschnitt ${Math.round(m)} m`);
    for (const f of ['name', 'story', 'start', 'finish']) for (const l of LANGS) assert.ok(w[f][l] && w[f][l].trim(), `${w.id}.${f}.${l}`);
  }
});

test('Wegprüfung erkennt Fehler: außerhalb, zu weit, fehlende Sprache, Viertel-Polygone', () => {
  const bad = {
    id: 'bad-walk',
    regionId: 'kadikoy',
    name: { tr: 'x', en: 'x', de: 'x', ru: 'x', ar: 'x' }, // fa fehlt
    story: walk('moda-coast').story,
    start: walk('moda-coast').start,
    finish: walk('moda-coast').finish,
    waypoints: [[40.9927, 29.0230], [41.0430, 29.0070], [40.9790, 29.0252]], // Beşiktaş liegt nicht in Kadıköy
  };
  const p = validateWalk(bad, REGIONS);
  assert.ok(p.some((x) => /name\.fa fehlt/.test(x)));
  assert.ok(p.some((x) => /Punkt 1 liegt nicht in Kadıköy/.test(x)));
  assert.ok(p.some((x) => /Abschnitt 0→1/.test(x)), 'zu langer Abschnitt');
  assert.ok(validateWalk({ ...walk('moda-coast'), waypoints: walk('moda-coast').waypoints.slice(0, 2) }, REGIONS).some((x) => /Wegpunkte nötig/.test(x)));
  assert.ok(validateWalk({ ...walk('moda-coast'), id: '../x' }, REGIONS).some((x) => /ungültige id/.test(x)));
  // Regionen mit echten Viertel-Polygonen: Punkt muss in einem davon liegen
  const square = (la, lo, d) => [[la - d, lo - d], [la - d, lo + d], [la + d, lo + d], [la + d, lo - d]];
  const regions = REGIONS.map((r) => ({ ...r, districts: [{ id: 'moda', name: 'Moda', center: [40.984, 29.025], polygon: square(40.984, 29.025, 0.004) }] }));
  const pm = validateWalk(walk('moda-coast'), regions);
  assert.ok(pm.length >= 1 && pm.every((x) => /in keinem Viertel/.test(x)), 'Punkte außerhalb des Moda-Quadrats werden gemeldet');
  assert.ok(pm.some((x) => /Punkt 0 /.test(x)), 'der Anleger liegt außerhalb des kleinen Quadrats');
});

// ---------------------------------------------------------------- Rechnung

test('Rechnung: Haversine-Länge, Straßenfaktor, 4 km/h + Pausen, Abstand zur Linie', () => {
  // 0,009° Breite ≈ 1000,76 m
  const one = legLengthsM([[40.98, 29.02], [40.989, 29.02]])[0];
  assert.ok(Math.abs(one - 1000.76) < 0.5, `1 km: ${one}`);
  const pts = walk('moda-coast').waypoints;
  const sum = legLengthsM(pts).reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(pathLengthM(pts) - sum) < 1e-6);
  let manual = 0;
  for (let i = 1; i < pts.length; i++) manual += haversine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  assert.ok(Math.abs(pathLengthM(pts) - manual) < 1e-6);
  assert.ok(Math.abs(walkDistanceM(pts) - sum * WALK_RULES.streetFactor) < 1e-6);
  // Dauer: Gehzeit + 5 min pro Zwischenstopp, aufgerundet auf 5 min
  assert.equal(walkMinutes(2000, 2), 40); // 30 + 10
  assert.equal(walkMinutes(2100, 2), 45); // 31,5 + 10 → 45
  assert.equal(walkMinutes(1000, 0), 15);
  assert.equal(walkMinutes(0, 0), 5, 'mindestens 5 Minuten');
  assert.equal(walkMinutes(4000, 0, { ...WALK_RULES, speedKmh: 5 }), 50);
  // Abstand zur Linie
  const seg = [[40.98, 29.02], [40.98, 29.03]];
  assert.ok(distanceToPathM(40.98, 29.025, seg) < 0.5, 'auf der Linie');
  const north = distanceToPathM(40.98 + 100 / 110574, 29.025, seg);
  assert.ok(Math.abs(north - 100) < 1, `100 m nördlich: ${north}`);
  const beyond = distanceToPathM(40.98, 29.035, seg);
  assert.ok(Math.abs(beyond - haversine(40.98, 29.035, 40.98, 29.03)) < 2, 'hinter dem Ende = Abstand zum Endpunkt');
  assert.equal(distanceToPathM(40.98, 29.02, []), Infinity);
});

test('Google-Maps-Link: Fußweg, Start, Ziel, höchstens 3 Zwischenpunkte, Café als Ziel', () => {
  const pts = walk('moda-coast').waypoints;
  const u = new URL(mapsUrl(pts));
  assert.equal(u.origin + u.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(u.searchParams.get('api'), '1');
  assert.equal(u.searchParams.get('travelmode'), 'walking');
  assert.equal(u.searchParams.get('origin'), '40.99270,29.02300');
  assert.equal(u.searchParams.get('destination'), '40.98360,29.02680');
  assert.deepEqual(u.searchParams.get('waypoints').split('|'), ['40.98800,29.02360', '40.98260,29.02340', '40.97900,29.02520']);
  // viele Punkte → gleichmäßig auf 3 Zwischenpunkte gekürzt, Start/Ziel bleiben
  const many = Array.from({ length: 9 }, (_, i) => [40.98 + i * 0.001, 29.02]);
  const um = new URL(mapsUrl(many));
  assert.equal(um.searchParams.get('waypoints').split('|').length, 3);
  assert.equal(um.searchParams.get('origin'), '40.98000,29.02000');
  assert.equal(um.searchParams.get('destination'), '40.98800,29.02000');
  // Café am Ende: Ziel = Café; das Wegziel bleibt Zwischenpunkt, wenn es > 150 m entfernt ist
  const c = walk('carsi-bahariye').waypoints;
  const uc = new URL(mapsUrl(c, { destination: [40.9893, 29.0312] }));
  assert.equal(uc.searchParams.get('destination'), '40.98930,29.03120');
  assert.ok(uc.searchParams.get('waypoints').split('|').includes('40.98770,29.03000'));
  const near = new URL(mapsUrl(pts, { destination: [40.9834, 29.0263] }));
  assert.ok(!near.searchParams.get('waypoints').includes('40.98360,29.02680'), 'Café direkt am Ziel ersetzt das Ziel');
  assert.equal(mapsUrl([]), null);
  assert.equal(mapsUrl([[NaN, 1]]), null);
  assert.deepEqual(pickEvenly([1, 2, 3, 4], 3), [1, 3, 4]);
  assert.deepEqual(pickEvenly([1, 2], 3), [1, 2]);
  assert.deepEqual(pickEvenly([1, 2, 3], 0), []);
});

// ---------------------------------------------------------------- Engine (wie im Browser-Demo)

function bareEngine(now = Date.now()) {
  const store = new MemoryStore();
  const engine = createEngine({
    store,
    now: () => now,
    analyzer: { name: 'test', analyze: async () => ({}) },
    photos: { save: async () => ({ photoId: null, photoUrl: null }), remove: async () => {} },
  });
  return { engine, store };
}

let seq = 0;
function sighting(store, { lat, lon, at, status = 'active', catPatch = {}, obsPatch = {} }) {
  const id = `c_t${++seq}`;
  store.cats.insert({
    id, regionId: 'kadikoy', district: 'caferaga', name: `Kedi${seq}`, status, rarity: 'common', profile: { pattern: 'tekir' },
    lastSeenAt: at, lastLat: lat, lastLon: lon, createdAt: at, catcherIds: [], observationCount: 1, ...catPatch,
  });
  store.observations.insert({
    id: `o_t${seq}`, playerId: 'p_t', catId: id, regionId: 'kadikoy', dayKey: '2026-01-01', createdAt: at, lat, lon,
    status: 'ok', counted: true, flags: [], analysis: {}, ...obsPatch,
  });
  return id;
}

test('Engine: Zählung um den Weg (7 Tage, gerundet), Hilfe, Cafés, bester Weg', () => {
  const now = Date.UTC(2026, 9, 7, 12);
  const { engine, store } = bareEngine(now);
  // ohne Daten: keine Katzen, kein bester Weg
  const empty = engine.walkRoutes();
  assert.equal(empty.best, null);
  assert.ok(empty.routes.every((r) => r.cats === 0 && !r.best && r.mine === null));
  assert.deepEqual(empty.routes.map((r) => r.id), WALKS.map((w) => w.id), 'ohne besten Weg: kuratierte Reihenfolge');

  // Yeldeğirmeni: 3 Katzen, eine braucht Hilfe; Moda: 1 Katze vor 8 Tagen (zählt nicht), eine abgelehnte Sichtung
  sighting(store, { lat: 40.9979, lon: 29.0251, at: now - 3600000 });
  sighting(store, { lat: 40.9969, lon: 29.0262, at: now - 2 * DAY });
  sighting(store, { lat: 40.9987, lon: 29.0270, at: now - 5 * DAY, status: 'needs_help' });
  sighting(store, { lat: 40.9790, lon: 29.0252, at: now - 8 * DAY });
  sighting(store, { lat: 40.9826, lon: 29.0234, at: now - DAY, obsPatch: { status: 'rejected' } });
  sighting(store, { lat: 40.9588, lon: 29.0962, at: now - DAY }); // Bostancı – an keinem Weg
  // Partner-Cafés: eins am Ziel, eins nur vorgeschlagen (zählt nicht), eins weit weg
  const cafe = (patch) => store.places.insert({ id: `pl_${++seq}`, type: 'partner', regionId: 'kadikoy', status: 'approved', active: true, reward: { minCats: 15, discountPct: 10 }, ...patch });
  cafe({ name: 'Ziel-Café', lat: 40.9970, lon: 29.0260 });
  cafe({ name: 'Noch nicht', lat: 40.9965, lon: 29.0262, status: 'pending' });
  cafe({ name: 'Geschlossen', lat: 40.9966, lon: 29.0261, active: false });
  cafe({ name: 'Fern', lat: 40.9588, lon: 29.0962 });

  const res = engine.walkRoutes();
  assert.equal(res.best, 'yeldegirmeni');
  assert.equal(res.routes[0].id, 'yeldegirmeni', 'bester Weg steht oben');
  const y = res.routes[0];
  assert.equal(y.best, true);
  assert.equal(y.cats, 3);
  assert.equal(y.needHelp, 1);
  assert.equal(y.cafes.length, 1);
  assert.equal(y.cafes[0].name, 'Ziel-Café');
  assert.deepEqual(y.cafes[0].reward, { discountPct: 10, minCats: 15 });
  assert.equal(y.cafeAtEnd && y.cafeAtEnd.name, 'Ziel-Café');
  assert.equal(new URL(y.mapsUrl).searchParams.get('destination'), '40.99700,29.02600', 'Navigation endet am Café');
  const moda = res.routes.find((r) => r.id === 'moda-coast');
  assert.equal(moda.cats, 0, 'alt (8 Tage) und abgelehnt zählen nicht');
  assert.equal(moda.cafeAtEnd, null);
  assert.equal(res.routes.filter((r) => r.best).length, 1);
  for (const r of res.routes) {
    const w = walk(r.id);
    assert.equal(r.distanceM, Math.round(walkDistanceM(w.waypoints)));
    assert.equal(r.durationMin, walkMinutes(r.distanceM, w.waypoints.length - 2));
    assert.equal(r.durationMin % 5, 0);
  }
  // Einzelansicht: Hitzeflecken nur gerundet, Katzenliste ohne Koordinaten
  const d = engine.walkRoute('yeldegirmeni');
  assert.equal(d.best, true);
  assert.equal(d.catList.length, 3);
  assert.ok(d.heat.length >= 1);
  for (const [la, lo, n] of d.heat) {
    assert.equal(Math.round(la * 1000) / 1000, la);
    assert.equal(Math.round(lo * 1000) / 1000, lo);
    assert.ok(n >= 1);
  }
  assert.throws(() => engine.walkRoute('gibt-es-nicht'), (e) => e.status === 404 && e.code === 'route_not_found');
  assert.throws(() => engine.walkRoute('../../etc'), (e) => e.status === 404);
  assert.throws(() => engine.walkRoute(42), (e) => e.status === 404);
});

// ---------------------------------------------------------------- HTTP-API

let app;
let base;
let tmp;
const PRECISE = { lat: 40.98417231, lon: 29.02612345 };

test.before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-routes-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  // Katze mit sehr genauer Position direkt am Moda-Weg (frisch gesehen)
  const { store } = app.engine.ctx;
  const t = Date.now();
  store.cats.insert({
    id: 'c_routes_precise', regionId: 'kadikoy', district: 'caferaga', name: 'Gizli', status: 'active', rarity: 'common',
    profile: { pattern: 'smokin' }, lastSeenAt: t - 3600000, lastLat: PRECISE.lat, lastLon: PRECISE.lon, createdAt: t - DAY,
    catcherIds: ['p_routes_x'], observationCount: 1, photoUrl: null,
  });
  store.observations.insert({
    id: 'o_routes_precise', playerId: 'p_routes_x', catId: 'c_routes_precise', regionId: 'kadikoy', dayKey: 'x', createdAt: t - 3600000,
    lat: PRECISE.lat, lon: PRECISE.lon, accuracy: 4, status: 'ok', counted: true, flags: [], analysis: {},
  });
});

test.after(async () => {
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const get = async (p, token) => {
  const res = await fetch(base + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { status: res.status, data, text, headers: res.headers };
};

test('API: GET /api/routes – Form der Antwort', async () => {
  const { status, data, headers } = await get('/api/routes');
  assert.equal(status, 200);
  assert.match(headers.get('content-type'), /application\/json/);
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.equal(data.days, 7);
  assert.equal(typeof data.generatedAt, 'number');
  assert.equal(data.routes.length, WALKS.length);
  assert.deepEqual(new Set(data.routes.map((r) => r.id)), new Set(WALKS.map((w) => w.id)));
  for (const r of data.routes) {
    for (const f of ['name', 'story', 'start', 'finish']) assert.deepEqual(Object.keys(r[f]).sort(), [...LANGS].sort(), `${r.id}.${f}`);
    assert.equal(typeof r.icon, 'string');
    assert.ok(Array.isArray(r.waypoints) && r.waypoints.length >= 3);
    assert.ok(Number.isInteger(r.distanceM) && r.distanceM > 500 && r.distanceM < 5000, `${r.id}: ${r.distanceM} m`);
    assert.ok(Number.isInteger(r.durationMin) && r.durationMin % 5 === 0);
    assert.ok(Number.isInteger(r.cats) && r.cats >= 0);
    assert.ok(Number.isInteger(r.needHelp) && r.needHelp <= r.cats);
    assert.equal(typeof r.density, 'number');
    assert.ok(Array.isArray(r.cafes));
    for (const c of r.cafes) {
      assert.equal(typeof c.name, 'string');
      assert.ok(c.distM <= WALK_RULES.cafeRadiusM || (r.cafeAtEnd && r.cafeAtEnd.id === c.id));
      assert.ok(c.reward && c.reward.discountPct > 0 && c.reward.minCats > 0);
      assert.ok(!('pinHash' in c) && !('createdBy' in c), 'keine internen Café-Daten');
    }
    assert.match(r.mapsUrl, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&travelmode=walking&origin=/);
    assert.equal(r.mine, null, 'ohne Anmeldung keine eigenen Zahlen');
    assert.equal(typeof r.best, 'boolean');
    assert.ok(!('heat' in r) && !('catList' in r), 'Liste ohne Details');
  }
  if (data.best) {
    assert.equal(data.routes[0].id, data.best);
    assert.equal(data.routes.filter((r) => r.best).length, 1);
  }
  // Demo-Cafés: Mırmır Kafe liegt am Ziel des Moda-Wegs
  const moda = data.routes.find((r) => r.id === 'moda-coast');
  assert.match(moda.cafeAtEnd.name, /Mırmır/);
  assert.ok(moda.cats >= 1, 'die frische Katze am Weg zählt');

  const one = await get('/api/routes/moda-coast');
  assert.equal(one.status, 200);
  assert.equal(one.data.id, 'moda-coast');
  assert.equal(one.data.days, 7);
  assert.ok(Array.isArray(one.data.heat) && one.data.heat.every((h) => h.length === 3));
  assert.ok(Array.isArray(one.data.catList) && one.data.catList.some((c) => c.id === 'c_routes_precise'));
  assert.equal(one.data.cats, moda.cats);

  for (const bad of ['/api/routes/gibt-es-nicht', '/api/routes/..%2F..%2Fetc', `/api/routes/${'a'.repeat(80)}`, '/api/routes/%E0%A4%A']) {
    const r = await get(bad);
    assert.ok(r.status === 404 || r.status === 400, `${bad}: ${r.status}`);
  }
  const nf = await get('/api/routes/gibt-es-nicht');
  assert.equal(nf.data.error, 'route_not_found');
  const post = await fetch(`${base}/api/routes`, { method: 'POST' });
  assert.equal(post.status, 405, 'nur lesen');
});

test('Tierschutz: Weg-Antworten enthalten nie genaue Katzen-Koordinaten', async () => {
  const list = await get('/api/routes');
  const one = await get('/api/routes/moda-coast');
  for (const { text } of [list, one]) {
    assert.ok(!text.includes('40.98417') && !text.includes('29.02612'), 'genaue Position taucht nicht auf');
    assert.ok(!text.includes('p_routes_x') && !text.includes('o_routes_precise'), 'keine Spieler- oder Sichtungs-IDs');
    assert.ok(!/"(lastLat|lastLon|accuracy|playerId|tokenHash)"/.test(text));
  }
  // Hitzeflecken: höchstens 3 Nachkommastellen (wie die öffentliche Karte)
  for (const [la, lo] of one.data.heat) {
    assert.equal(Math.round(la * 1000) / 1000, la);
    assert.equal(Math.round(lo * 1000) / 1000, lo);
  }
  assert.ok(one.data.heat.some(([la, lo]) => la === 40.984 && lo === 29.026), 'die Katze erscheint nur als gerundeter Fleck');
  // Katzenliste: ohne Koordinaten, nur öffentliche Felder
  for (const c of one.data.catList) {
    assert.ok(!('lat' in c) && !('lon' in c) && !('lastLat' in c));
    assert.ok(c.photoUrl === null || /^\/photos\/[0-9a-f]{20}_c\.jpg$/.test(c.photoUrl), 'nur Ausschnitt-Fotos');
  }
  // Einzige Koordinaten in der Antwort: Wegpunkte, Hitzeflecken (gerundet) und Partner-Cafés (öffentliche Orte)
  const cafes = new Set(app.engine.listPlaces({ type: 'partner' }).flatMap((p) => [p.lat, p.lon]));
  const allowed = new Set([...one.data.waypoints.flat(), ...one.data.heat.flatMap(([a, b]) => [a, b]), ...cafes]);
  const nums = one.text.match(/-?\d+\.\d{3,}/g) || [];
  for (const n of nums) if (Math.abs(Number(n)) > 20 && Math.abs(Number(n)) < 50) assert.ok(allowed.has(Number(n)), `Koordinate ${n} ist erlaubt`);
});

test('Spieler:in: „deine Katzen heute“ auf dem Weg – nur mit Token, ohne Fehler bei falschem Token', async () => {
  const reg = await (await fetch(`${base}/api/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: 'Spaziergang', lang: 'en' }) })).json();
  const token = reg.token;
  const c = await fetch(`${base}/api/catch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ photo: jpeg, crop: jpeg, lat: 40.9827, lon: 29.0236, accuracy: 8, capturedAt: Date.now(), source: 'camera', fingerprint: { colors: { orange: 0.6, white: 0.4 }, hash: '7a6b5c4d3e2f1a0b' } }),
  });
  assert.equal(c.status, 201);
  const mine = await get('/api/routes', token);
  assert.equal(mine.status, 200);
  const byId = Object.fromEntries(mine.data.routes.map((r) => [r.id, r]));
  assert.equal(byId['moda-coast'].mine.today, 1);
  assert.equal(byId['kalamis-fenerbahce'].mine.today, 0);
  const one = await get('/api/routes/moda-coast', token);
  assert.equal(one.data.mine.today, 1);
  // falsches Token → wie ohne Anmeldung (öffentliche Seite, kein 401)
  const wrong = await get('/api/routes', 'x'.repeat(40));
  assert.equal(wrong.status, 200);
  assert.ok(wrong.data.routes.every((r) => r.mine === null));
  // gesperrt → keine eigenen Zahlen, aber die öffentliche Liste
  const p = app.engine.ctx.store.players.all().find((x) => x.nickname === 'Spaziergang');
  app.engine.ctx.store.players.update(p.id, { banned: true });
  const banned = await get('/api/routes', token);
  assert.equal(banned.status, 200);
  assert.ok(banned.data.routes.every((r) => r.mine === null));
});

// ---------------------------------------------------------------- Texte

const langFile = async (l) => (await import(`../public/js/lang/${l}.js`)).default;
const placeholders = (v) => [...new Set((typeof v === 'string' ? v : Object.values(v).join(' ')).match(/\{\w+\}/g) || [])].sort();
const values = (v) => (typeof v === 'string' ? [v] : Object.values(v));

test('Texte: jeder benutzte Schlüssel in allen 6 Sprachen, gleiche Platzhalter, Plural in ru/ar/fa', async () => {
  const src = ['public/js/views/routes.js', 'public/js/views/home.js', 'public/js/map.js']
    .map((f) => fs.readFileSync(path.join(here, '..', f), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/['"`](routes\.[A-Za-z0-9]+)['"`]/g)].map((m) => m[1]));
  used.add('err.route_not_found');
  assert.ok(used.size >= 25, `${used.size} Schlüssel gefunden`);
  const en = await langFile('en');
  const enKeys = Object.keys(en).filter((k) => k.startsWith('routes.'));
  for (const k of used) assert.ok(k in en, `en: ${k}`);
  for (const l of LANGS) {
    const m = await langFile(l);
    const keys = Object.keys(m).filter((k) => k.startsWith('routes.'));
    assert.deepEqual(keys.sort(), [...enKeys].sort(), `${l}: gleiche routes.*-Schlüssel wie en`);
    for (const k of [...used]) {
      assert.ok(m[k] !== undefined, `${l}: ${k} fehlt`);
      assert.deepEqual(placeholders(m[k]), placeholders(en[k]), `${l}: Platzhalter in ${k}`);
    }
  }
  for (const l of ['ru', 'ar', 'fa']) {
    const m = await langFile(l);
    for (const k of ['routes.catsWeek', 'routes.mine']) assert.equal(typeof m[k], 'object', `${l}: ${k} als Plural-Objekt`);
  }
  const ru = await langFile('ru');
  assert.deepEqual(Object.keys(ru['routes.catsWeek']).sort(), ['few', 'many', 'one', 'other']);
  const ar = await langFile('ar');
  for (const k of ['routes.catsWeek', 'routes.mine', 'routes.min']) assert.deepEqual(Object.keys(ar[k]).sort(), ['few', 'many', 'one', 'other', 'two', 'zero']);
});

test('Texte: einfach, keine Großbuchstaben-Zeilen, richtige Ziffern und Buchstaben, Marke', async () => {
  const hunting = { en: /\b(hunt|prey)/i, de: /Beute|Jagd\b/, tr: /\bav(la|cı)/i, ru: /охот|добыч/i, ar: /صيد|اصطياد|فريسة/, fa: /شکار/ };
  for (const l of LANGS) {
    const m = await langFile(l);
    const texts = [
      ...Object.entries(m).filter(([k]) => k.startsWith('routes.') || k === 'err.route_not_found').flatMap(([, v]) => values(v)),
      ...WALKS.flatMap((w) => ['name', 'story', 'start', 'finish'].map((f) => w[f][l])),
    ];
    for (const s of texts) {
      const plain = s.replace(/\{\w+\}/g, '');
      assert.doesNotMatch(plain, /\b[A-ZÇĞİÖŞÜÄÖ]{4,}\b/, `${l}: keine GROSS-Wörter: ${s}`);
      assert.doesNotMatch(plain, /Kadikoy|Kadiköy/, `${l}: Kadıköy richtig geschrieben`);
      assert.doesNotMatch(plain, hunting[l], `${l}: keine Jagd-Wörter: ${s}`);
      for (const sentence of plain.split(/[.!?؟]\s/)) {
        assert.ok(sentence.trim().split(/\s+/).length <= 14, `${l}: Satz zu lang: ${sentence}`);
      }
      if (l === 'fa') {
        assert.doesNotMatch(plain, /[0-9]/, `fa: persische Ziffern: ${s}`);
        assert.doesNotMatch(plain, /[يك]/, `fa: persische ی/ک statt arabischer: ${s}`);
      }
      if (l === 'ar') assert.doesNotMatch(plain, /[٠-٩۰-۹]/, `ar: lateinische Ziffern: ${s}`);
    }
  }
});

test('Texte: t() setzt Zahlen und Plural pro Sprache richtig ein', async () => {
  const { t, setLang } = await import('../public/js/i18n.js');
  const cases = {
    en: [['routes.catsWeek', 1, '1 cat seen this week'], ['routes.catsWeek', 3, '3 cats seen this week'], ['routes.min', 30, '30 min']],
    tr: [['routes.catsWeek', 3, 'Bu hafta 3 kedi görüldü'], ['routes.min', 30, '30 dk']],
    de: [['routes.mine', 1, 'Heute hier gefunden: 1 Katze'], ['routes.mine', 2, 'Heute hier gefunden: 2 Katzen']],
    ru: [['routes.catsWeek', 1, 'За неделю здесь видели 1 кошку'], ['routes.catsWeek', 3, 'За неделю здесь видели 3 кошки'], ['routes.catsWeek', 5, 'За неделю здесь видели 5 кошек']],
    ar: [['routes.min', 2, 'دقيقتان'], ['routes.min', 5, '5 دقائق'], ['routes.min', 30, '30 دقيقة'], ['routes.catsWeek', 1, 'شوهدت قطة واحدة هذا الأسبوع']],
    fa: [['routes.catsWeek', 3, 'این هفته ۳ گربه اینجا دیده شد'], ['routes.min', 30, '‏۳۰ دقیقه']],
  };
  try {
    for (const [l, list] of Object.entries(cases)) {
      setLang(l);
      for (const [k, n, want] of list) assert.equal(t(k, { n }), want, `${l} ${k} n=${n}`);
    }
    setLang('fa');
    assert.equal(t('common.km', { n: 2.5 }), '‏۲٫۵ کیلومتر');
  } finally {
    setLang('en');
  }
});
