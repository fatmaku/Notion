// Monatsbericht „Straßenkatzen von Kadıköy“: Summen für einen Monat mit zwei Monaten Daten
// (Istanbul-Zeit an den Monatsgrenzen, zusammengeführte Katzen, abgelehnte Fotos, gesperrte Konten),
// Hilfe-Fälle aus dem Statusverlauf, Monatsprüfung, Standardmonat, Vergleich mit dem Vormonat,
// keine Koordinaten/Spitznamen im Bericht, Server-Route mit Cache/ETag, Texte in 6 Sprachen und die
// Seite im echten Browser (en, ar, fa, Druckansicht, Link aus der Statistik, statisch ohne Server).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { normalizeAnalysis } from '../public/core/analysis.js';
import { recomputeCat } from '../public/core/cats.js';
import { dayKey } from '../public/core/time.js';
import { REGIONS } from '../public/config/regions.js';
import { GAME } from '../public/config/game.js';
import { addMonths, monthBounds, isMonthKey, MIN_MONTH } from '../public/core/report.js';
import { createApp } from '../server/app.js';
import { CACHE_PAST_MS } from '../server/report.js';
import { loadPlaywright, launchOptions } from './helpers/playwright.js';

const NOW = Date.parse('2026-10-15T09:00:00Z'); // 12:00 in Istanbul
const TZ = 'Europe/Istanbul';
const T = (iso) => Date.parse(iso);
const DISTRICT = Object.fromEntries(REGIONS[0].districts.map((d) => [d.id, d]));
const NICKS = ['GizliAyse', 'GizliBaran', 'GizliCan', 'GizliBan'];

function engineSetup(clock = { now: NOW }) {
  const store = new MemoryStore();
  const engine = createEngine({
    store,
    now: () => clock.now,
    game: GAME,
    analyzer: { name: 'test', analyze: async () => normalizeAnalysis({ is_cat: true, is_live_photo: true, ownership: 'street' }, { analyzer: 'test' }) },
    photos: { save: async () => ({ photoId: null, photoUrl: null }), remove: async () => {} },
  });
  return { engine, store, clock };
}

/**
 * Zwei Monate Daten (August + September 2026, dazu ein wenig Oktober). Erwartete Summen stehen
 * in den Tests. Die Sichtungen haben echte (genaue) Koordinaten – im Bericht dürfen sie nie auftauchen.
 */
function seed(engine) {
  const { store } = engine.ctx;
  let k = 0;
  const id = (p) => `${p}_${String(++k).padStart(3, '0')}`;
  const [p1, p2, p3, banned] = NICKS.map((nick, i) => {
    const p = { id: `p_${i + 1}`, nickname: nick, lang: 'en', role: i === 2 ? 'volunteer' : 'player', tokenHash: `${nick}`.padEnd(64, 'h'), xp: 0, badges: [], badgeDates: {}, questsDone: {}, banned: nick === 'GizliBan', createdAt: T('2026-07-01T00:00:00Z') };
    store.players.insert(p);
    return p;
  });
  const cat = (cid, district, extra = {}) => store.cats.insert({
    id: cid, regionId: 'kadikoy', district, name: `Name${cid}`, namedBy: null, discoveredBy: null, discoveredAt: 0, createdAt: 0,
    lastSeenAt: 0, lastLat: null, lastLon: null, profile: {}, latest: {}, fingerprint: { colors: null }, status: 'active', rarity: 'common',
    observationCount: 0, catcherIds: [], needsReview: false, possibleDuplicates: [], ...extra,
  });
  const obs = (catId, player, iso, district, a = {}, extra = {}) => {
    const at = T(iso);
    const [lat, lon] = DISTRICT[district].center;
    const o = {
      id: id('o'), playerId: player.id, catId, regionId: 'kadikoy', district, dayKey: dayKey(at, TZ), createdAt: at, capturedAt: at,
      lat: lat + 0.000123, lon: lon + 0.000456, accuracy: 8, source: 'camera', counted: true, flags: [], status: 'ok', photoId: null, photoUrl: null,
      analysis: normalizeAnalysis({ is_cat: true, is_live_photo: true, ownership: 'street', pattern: 'tekir', age_group: 'adult', body_condition_score: 5, ear_tip: 'not_visible', ...a }, { analyzer: 'test' }),
      fingerprint: { colors: null, hash: null }, detector: null, match: { method: null, score: null, candidates: [] }, isDiscovery: false, rarity: 'common', xp: 0, ...extra,
    };
    store.observations.insert(o);
    return o;
  };
  const ev = (catId, by, iso, data) => store.events.insert({ id: id('e'), catId, by: by && by.id, at: T(iso), note: 'Gizli not', ...data });

  for (const [cid, d] of [['c_A', 'caferaga'], ['c_B', 'caferaga'], ['c_C', 'osmanaga'], ['c_D', 'rasimpasa'], ['c_E', 'osmanaga'], ['c_F', 'osmanaga'], ['c_H', 'caferaga'], ['c_I', 'osmanaga']]) cat(cid, d);
  cat('c_G', 'caferaga', { mergedInto: 'c_B' });

  // ---- August
  obs('c_A', p1, '2026-08-10T10:00:00Z', 'caferaga', { ear_tip: 'none' });
  obs('c_B', p2, '2026-08-20T10:00:00Z', 'caferaga', { ear_tip: 'tipped', age_group: 'senior' });
  // ---- September (Istanbul): 31.08. 21:30 UTC = 1. September 00:30 vor Ort
  obs('c_C', p1, '2026-08-31T21:30:00Z', 'osmanaga', { ear_tip: 'none', age_group: 'kitten', body_condition_score: 3 });
  obs('c_I', p1, '2026-09-03T08:00:00Z', 'osmanaga', { ear_tip: 'none' });
  obs('c_A', p1, '2026-09-05T08:00:00Z', 'caferaga', { ear_tip: 'tipped' }); // im September kastriert gesehen
  const a6 = obs('c_A', p2, '2026-09-06T08:00:00Z', 'caferaga', { ear_tip: 'not_visible', body_condition_score: 7 });
  obs('c_B', p3, '2026-09-09T08:00:00Z', 'caferaga', { ear_tip: 'not_visible', age_group: 'senior' });
  obs('c_E', banned, '2026-09-12T08:00:00Z', 'osmanaga'); // gesperrtes Konto → zählt nicht
  obs('c_F', p2, '2026-09-14T08:00:00Z', 'osmanaga', {}, { status: 'rejected' }); // abgelehnt → zählt nicht
  obs('c_G', p1, '2026-09-15T08:00:00Z', 'caferaga', { age_group: 'senior' }); // zusammengeführt in B → B
  obs('c_H', p3, '2026-09-20T08:00:00Z', 'caferaga', { ear_tip: 'none', health_severity: 'urgent', health_flags: ['wound'], age_group: 'junior' });
  obs('c_C', p2, '2026-09-30T20:59:00Z', 'osmanaga', { ear_tip: 'not_visible', age_group: 'kitten', body_condition_score: 3 }); // 23:59 vor Ort
  // ---- Oktober: 30.09. 21:30 UTC = 1. Oktober 00:30 vor Ort
  obs('c_D', p3, '2026-09-30T21:30:00Z', 'rasimpasa');
  obs('c_A', p1, '2026-10-03T08:00:00Z', 'caferaga', { ear_tip: 'tipped' });

  // Meldungen und Hilfe-Fälle
  ev('c_A', p2, '2026-09-06T08:01:00Z', { type: 'condition', from: 'active', to: 'active', tags: ['hungry'], severity: 'mild', observationId: a6.id });
  ev('c_B', p3, '2026-09-09T08:01:00Z', { type: 'condition', from: 'active', to: 'active', tags: ['fed', 'healthy'], severity: 'none' });
  ev('c_C', banned, '2026-09-30T20:00:00Z', { type: 'condition', from: 'active', to: 'active', tags: ['hungry', 'thirsty'], severity: 'mild' });
  ev('c_D', p3, '2026-09-30T21:31:00Z', { type: 'condition', from: 'active', to: 'active', tags: ['hungry'], severity: 'mild' });
  // I: Meldung „krank“ → braucht Hilfe (4.9.), Freiwillige: wieder gut (10.9.)
  ev('c_I', p1, '2026-09-04T08:00:00Z', { type: 'help_report', from: 'active', to: 'needs_help', tags: ['sick'], severity: 'attention' });
  ev('c_I', p3, '2026-09-10T08:00:00Z', { type: 'status', from: 'needs_help', to: 'active' });
  store.cats.update('c_I', { status: 'active', statusAt: T('2026-09-10T08:00:00Z') });
  // H: KI meldet „dringend“ (20.9.), in Behandlung erst am 2.10.
  ev('c_H', p3, '2026-09-20T08:00:00Z', { type: 'auto_flag', from: 'active', to: 'needs_help' });
  ev('c_H', p3, '2026-10-02T08:00:00Z', { type: 'status', from: 'needs_help', to: 'in_care' });
  store.cats.update('c_H', { status: 'in_care', statusAt: T('2026-10-02T08:00:00Z') });
  // Meldung bei einer adoptierten Katze ändert den Status nicht (kein neuer Fall)
  ev('c_B', p1, '2026-09-25T08:00:00Z', { type: 'status', from: 'active', to: 'adopted' });
  ev('c_B', p2, '2026-09-26T08:00:00Z', { type: 'help_report', from: 'adopted', to: 'needs_help', tags: [], severity: 'attention' });
  store.cats.update('c_B', { status: 'adopted', statusAt: T('2026-09-25T08:00:00Z') });

  for (const c of store.cats.all()) if (!c.mergedInto) recomputeCat(engine.ctx, c.id);
  return { p1, p2, p3, banned };
}

// ---------------------------------------------------------------- Helfer

test('Monatshelfer: Format, ±Monate, Grenzen in Istanbul-Zeit', () => {
  assert.equal(isMonthKey('2026-09'), true);
  for (const bad of ['2026-9', '2026-13', '2026-00', '26-09', '2026-09-01', '', null, 202609]) assert.equal(isMonthKey(bad), false, String(bad));
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-09', -13), '2025-08');
  const { start, end } = monthBounds('2026-09', TZ);
  assert.equal(new Date(start).toISOString(), '2026-08-31T21:00:00.000Z');
  assert.equal(new Date(end + 1).toISOString(), '2026-09-30T21:00:00.000Z');
});

// ---------------------------------------------------------------- Engine

test('Bericht September: Katzen, neue Katzen, Fotos, Spieler:innen, Kastration, Meldungen, Grenzen', () => {
  const { engine } = engineSetup();
  seed(engine);
  const r = engine.report({ month: '2026-09' });
  assert.equal(r.month, '2026-09');
  assert.equal(r.hasData, true);
  assert.equal(r.partial, false);
  assert.equal(r.region.id, 'kadikoy');
  const tt = r.totals;
  assert.equal(tt.cats, 5, 'A, B (+ zusammengeführte G), C, H, I – nicht E (gesperrt), F (abgelehnt), D (Oktober)');
  assert.equal(tt.observations, 8);
  assert.equal(tt.newCats, 3, 'C (1.9. 00:30 vor Ort), H, I');
  assert.equal(tt.players, 3, 'gesperrtes Konto zählt nicht');
  assert.equal(tt.tnrKnown, 5);
  assert.equal(tt.tnrTipped, 2, 'A (im September gesehen) und B');
  assert.equal(tt.tnrPct, 40);
  assert.equal(tt.reports, 3, 'hungrig (A), gefüttert+gesund (B), krank (I) – nicht vom gesperrten Konto, nicht Oktober');
  assert.deepEqual([r.reports.hungry, r.reports.fed, r.reports.healthy, r.reports.sick, r.reports.thirsty], [1, 1, 1, 1, 0]);
  assert.equal(tt.hungryReports, 1);
  assert.equal(tt.fedReports, 1);
  // Hilfe: I geöffnet und gelöst, H geöffnet (am Monatsende offen); Meldung bei adoptierter B kein Fall
  assert.deepEqual(r.help, { opened: 2, helped: 1, open: 1, inCare: 0, toCare: 0, resolved: 1, adopted: 0, died: 0 });
  assert.equal(tt.helpOpened, 2);
  assert.equal(tt.helpOpen, 1);
  // Verteilungen: letzter Befund im Monat je Katze
  assert.deepEqual(r.ages, { kitten: 1, junior: 1, adult: 2, senior: 1, unknown: 0 });
  assert.equal(r.bcs.thin, 1, 'C: BCS 3');
  assert.equal(r.bcs.overweight, 1, 'A: letzter Befund BCS 7');
  assert.equal(r.bcs.ideal, 3);
  assert.equal(r.severity.urgent, 1);
  // Tage: 30, Istanbul-Grenzen
  assert.equal(r.perDay.length, 30);
  assert.equal(r.perDay[0].day, '2026-09-01');
  assert.deepEqual(r.perDay[0], { day: '2026-09-01', observations: 1, newCats: 1 });
  assert.equal(r.perDay[29].observations, 1, '30.9. 23:59 vor Ort gehört zum September');
  assert.equal(r.throughDay, '2026-09-30');
  // Mahalle-Tabelle
  const caf = r.districts.find((d) => d.id === 'caferaga');
  const osm = r.districts.find((d) => d.id === 'osmanaga');
  assert.deepEqual({ cats: caf.cats, observations: caf.observations, needsHelp: caf.needsHelp, hungry: caf.hungry, tnrKnown: caf.tnrKnown, tnrPct: caf.tnrPct, coverage: caf.coverage },
    { cats: 3, observations: 5, needsHelp: 1, hungry: 1, tnrKnown: 3, tnrPct: 67, coverage: 'low' });
  assert.equal(osm.cats, 2);
  assert.equal(osm.tnrPct, null, 'unter 3 geprüften Katzen kein Anteil');
  assert.equal(r.districts.length, REGIONS[0].districts.length);
  assert.equal(r.districts.find((d) => d.id === 'rasimpasa').coverage, 'none');
  // Datenlage
  assert.equal(r.coverage.days, 30);
  assert.equal(r.coverage.daysWithData, 8);
  assert.equal(r.coverage.districtsWithData, 2);
  assert.ok(r.coverage.low.includes('caferaga') && r.coverage.none.includes('rasimpasa'));
  assert.equal(r.coverage.aiAssessedPct, 100);
  assert.equal(r.coverage.earKnownPct, 100);
  assert.deepEqual(r.method, { timezone: TZ, lowDataPhotos: 10, minSample: 3, missingAfterDays: GAME.missingAfterDays });
  assert.deepEqual(r.months.map((m) => m.month), ['2026-10', '2026-09', '2026-08']);
  assert.equal(r.months.find((m) => m.month === '2026-08').observations, 2);
});

test('Vergleich mit dem Vormonat und laufender Monat', () => {
  const { engine } = engineSetup();
  seed(engine);
  const sep = engine.report({ month: '2026-09' });
  const aug = engine.report({ month: '2026-08' });
  assert.equal(sep.previous.month, '2026-08');
  assert.equal(sep.previous.hasData, true);
  assert.deepEqual(sep.previous.totals, aug.totals, 'Vormonat = eigener Bericht des Vormonats');
  assert.equal(aug.totals.cats, 2);
  assert.equal(aug.totals.observations, 2);
  assert.equal(aug.totals.tnrPct, 50, 'Ende August: A ohne, B mit Ohrmarke');
  assert.equal(aug.previous.hasData, false, 'Juli ohne Daten');
  assert.equal(aug.previous.totals.cats, 0);
  // Oktober läuft noch: bis heute (15.), H in Behandlung (geholfen), nichts offen
  const oct = engine.report({ month: '2026-10' });
  assert.equal(oct.partial, true);
  assert.equal(oct.throughDay, '2026-10-15');
  assert.equal(oct.perDay.length, 15);
  assert.equal(oct.totals.cats, 2, 'D (1.10. 00:30 vor Ort) und A');
  assert.deepEqual([oct.help.opened, oct.help.helped, oct.help.toCare, oct.help.open, oct.help.inCare], [0, 1, 1, 0, 1]);
  assert.equal(oct.totals.reports, 1);
  assert.equal(oct.previous.totals.cats, 5);
});

test('Monatsprüfung und Standardmonat', () => {
  const { engine, clock } = engineSetup();
  // ohne Daten: laufender Monat, leer
  const empty = engine.report({});
  assert.equal(empty.month, '2026-10');
  assert.equal(empty.hasData, false);
  assert.deepEqual(empty.months, [{ month: '2026-10', observations: 0 }]);
  assert.equal(engine.defaultReportMonth(), '2026-10');
  seed(engine);
  assert.equal(engine.report({}).month, '2026-09', 'letzter abgeschlossener Monat mit Daten');
  assert.equal(engine.report({ month: '' }).month, '2026-09');
  assert.equal(engine.defaultReportMonth(), '2026-09');
  for (const bad of ['abc', '2026-13', '2026-1', '2026-00', '2026-11', '2027-01', '2023-12', 202609, '2026-09; DROP', { m: 1 }]) {
    assert.throws(() => engine.report({ month: bad }), (e) => e.status === 400 && e.code === 'invalid_month', String(bad));
  }
  try {
    engine.report({ month: '2026-11' });
  } catch (e) {
    assert.deepEqual(e.details, { min: MIN_MONTH, max: '2026-10' });
  }
  assert.equal(engine.report({ month: MIN_MONTH }).hasData, false, 'frühester Monat geht (leer)');
  // Am 1. November 00:30 Istanbul-Zeit ist Oktober der letzte abgeschlossene Monat
  clock.now = T('2026-10-31T21:30:00Z');
  assert.equal(engine.report({}).month, '2026-10');
  assert.equal(engine.report({ month: '2026-11' }).partial, true);
  // Nur Daten im laufenden Monat → laufender Monat
  const only = engineSetup();
  seed(only.engine);
  for (const o of only.store.observations.all()) if (o.createdAt < T('2026-09-30T21:00:00Z')) only.store.observations.update(o.id, { status: 'rejected' });
  assert.equal(only.engine.report({}).month, '2026-10');
});

test('Datenschutz: keine Koordinaten, keine Katzen-IDs, keine Spitznamen, keine Notizen im Bericht', () => {
  const { engine, store } = engineSetup();
  seed(engine);
  for (const month of ['2026-08', '2026-09', '2026-10']) {
    const json = JSON.stringify(engine.report({ month }));
    assert.ok(!/"(lat|lon|lastLat|lastLon|accuracy)"/.test(json), `${month}: Koordinaten-Felder`);
    for (const o of store.observations.all()) {
      assert.ok(!json.includes(String(o.lat)) && !json.includes(String(o.lon)), `${month}: Koordinate ${o.lat},${o.lon}`);
      assert.ok(!json.includes(o.id), `${month}: Sichtungs-ID`);
    }
    for (const c of ['c_A', 'c_B', 'c_C', 'c_D', 'Namec_A']) assert.ok(!json.includes(c), `${month}: ${c}`);
    assert.ok(!/\b4[01]\.\d{3,}|\b29\.\d{3,}/.test(json), `${month}: nichts, was wie eine Koordinate aussieht`);
    for (const n of [...NICKS, 'p_1', 'p_2', 'Gizli not']) assert.ok(!json.includes(n), `${month}: ${n}`);
  }
});

// ---------------------------------------------------------------- Server

const clock = { now: NOW };
let app;
let base;
let tmp;
let ready = null;
const setupServer = () => (ready ||= (async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-report-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: false, now: () => clock.now, log: () => {} });
  seed(app.engine);
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
})());
test.after(async () => {
  if (!app) return;
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('GET /api/report: Monat, Standardmonat, Prüfung, Cache-Control, ETag/304, Zwischenspeicher', async () => {
  await setupServer();
  const res = await fetch(`${base}/api/report?month=2026-09`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /^public, max-age=\d+$/);
  const etag = res.headers.get('etag');
  assert.match(etag, /^"r-[\w-]{16}(-br|-gzip)?"$/, 'eigener ETag je Verfahren (fetch bietet br/gzip an)');
  const body = await res.json();
  assert.equal(body.totals.cats, 5);
  assert.equal(body.previous.totals.cats, 2);
  const again = await fetch(`${base}/api/report?month=2026-09`, { headers: { 'If-None-Match': etag } });
  assert.equal(again.status, 304);

  const def = await (await fetch(`${base}/api/report`)).json();
  assert.equal(def.month, '2026-09');
  for (const bad of ['2026-13', 'abc', '2026-9', '2027-01', '2023-12', '%00']) {
    const r = await fetch(`${base}/api/report?month=${bad}`);
    assert.equal(r.status, 400, bad);
    assert.equal((await r.json()).error, 'invalid_month', bad);
  }
  const fut = await (await fetch(`${base}/api/report?month=2026-11`)).json();
  assert.deepEqual(fut.details, { min: '2024-01', max: '2026-10' });
  assert.equal((await fetch(`${base}/api/report?month=2026-09`, { method: 'POST' })).status, 405);

  // Zwischenspeicher: neue Sichtung im September erscheint erst nach Ablauf
  const { store } = app.engine.ctx;
  const proto = store.observations.all().find((o) => o.catId === 'c_A' && o.dayKey === '2026-09-05');
  store.observations.insert({ ...proto, id: 'o_neu', catId: 'c_D', createdAt: T('2026-09-07T08:00:00Z'), dayKey: '2026-09-07' });
  assert.equal((await (await fetch(`${base}/api/report?month=2026-09`)).json()).totals.cats, 5, 'noch aus dem Zwischenspeicher');
  clock.now += CACHE_PAST_MS + 1000;
  const fresh = await fetch(`${base}/api/report?month=2026-09`);
  assert.equal((await fresh.json()).totals.cats, 6, 'nach Ablauf neu gerechnet');
  assert.notEqual(fresh.headers.get('etag'), etag);
  store.observations.update('o_neu', { status: 'rejected' });
  clock.now += CACHE_PAST_MS + 1000;
  // Laufender Monat: kurze Speicherzeit
  const cur = await fetch(`${base}/api/report?month=2026-10`);
  assert.equal(cur.status, 200);
  assert.ok(Number(/max-age=(\d+)/.exec(cur.headers.get('cache-control'))[1]) <= 120);
});

// ---------------------------------------------------------------- Texte

test('Texte: alle Bericht-Schlüssel in 6 Sprachen, gleiche Platzhalter, keine GANZ-GROSS-Zeilen, Ziffern', async () => {
  const langs = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
  const mods = {};
  for (const l of langs) mods[l] = (await import(`../public/js/lang/${l}.js`)).default;
  const keys = Object.keys(mods.en).filter((k) => k.startsWith('mr.'));
  assert.ok(keys.length >= 70, `${keys.length} Schlüssel`);
  const ph = (v) => [...new Set((typeof v === 'object' ? Object.values(v).join(' ') : v).match(/\{\w+\}/g) || [])].sort().join();
  const all = (v) => (typeof v === 'object' ? Object.values(v) : v.split('|'));
  for (const l of langs) {
    assert.deepEqual(Object.keys(mods[l]).filter((k) => k.startsWith('mr.')).sort(), [...keys].sort(), `${l}: gleiche Schlüssel`);
    for (const k of keys) {
      assert.ok(mods[l][k], `${l}: ${k} fehlt`);
      assert.equal(ph(mods[l][k]), ph(mods.en[k]), `${l}: ${k} Platzhalter`);
      for (const s of all(mods[l][k])) {
        assert.ok(!/\b[A-ZÇĞİÖŞÜ]{5,}\b/.test(s.replace(/KediDex|HappyTuncay|GeoJSON|JSON|CSV/g, '')), `${l}: ${k} GANZ GROSS`);
        if (l === 'fa') assert.ok(!/[0-9]/.test(s), `fa: ${k} lateinische Ziffer`);
        if (l === 'ar') assert.ok(!/[٠-٩]/.test(s), `ar: ${k} arabisch-indische Ziffer`);
        assert.ok(!/(jag|hunt|avla|охот|صيد|شکار)/i.test(s), `${l}: ${k} Jagd-Wort`);
        assert.ok(s.split(/\s+/).length <= 16, `${l}: ${k} zu lang`);
      }
    }
    for (const k of ['mr.lowNote', 'mr.minNote']) if (['ru', 'ar', 'fa'].includes(l)) assert.equal(typeof mods[l][k], 'object', `${l}: ${k} Plural als Objekt`);
  }
  assert.match(mods.ar['mr.title'], /قاضي كوي/);
  assert.match(mods.fa['mr.title'], /کادیکوی/);
});

// ---------------------------------------------------------------- Browser

/** Statischer Server nur für public/ – wie ein Hosting ohne API (Demo im Browser). */
function staticServer(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, p === '/' ? 'index.html' : p);
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return srv;
}

test('Seite im Browser: en/ar/fa ohne Fehler, Vormonat, Monatswahl, Sprache, Druck, Link aus der Statistik, statisch', { timeout: 180000 }, async (t) => {
  await setupServer();
  let pw;
  let browser;
  try {
    pw = await loadPlaywright();
    browser = await pw.chromium.launch(launchOptions());
  } catch (e) {
    t.skip(`kein Browser: ${e.message}`);
    return;
  }
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-US' });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on('pageerror', (e) => errors.push(e.message));
    pg.on('console', (m) => {
      // 400 für einen ungültigen Monat in der Adresse ist gewollt (→ Standardmonat mit Hinweis)
      if (m.type() === 'error' && !/status of 400/.test(m.text())) errors.push(m.text());
    });
    const text = async (sel) => (await pg.locator(sel).first().innerText()).replace(/[\u2066-\u2069\u200e\u200f]/g, '');
    const open = async (q) => {
      await pg.goto(`${base}/report.html${q}`);
      await pg.waitForSelector('body[data-ready="1"]');
    };
    const noScroll = async (what) => {
      const s = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(s <= 0, `${what}: kein seitliches Scrollen (${s})`);
    };

    // ---- Englisch
    await open('?month=2026-09&lang=en');
    assert.equal(await pg.evaluate(() => document.documentElement.lang), 'en');
    assert.match(await pg.title(), /Street cats of Kadıköy · September 2026/);
    assert.equal(await pg.locator('[data-month-label]').innerText(), 'September 2026');
    assert.equal(await pg.locator('[data-kpi="cats"] .mr-kpi-v').innerText(), '5');
    assert.match(await text('[data-kpi="cats"] .mr-kpi-d'), /▲\s*August: 2$/);
    assert.match(await text('[data-kpi="tnrPct"]'), /40%[\s\S]*5 cats checked[\s\S]*August: 50%/);
    assert.equal(await pg.locator('[data-help="open"] b').innerText(), '1');
    assert.ok(await pg.locator('.viz').count() >= 5, 'Diagramme');
    assert.deepEqual(await pg.locator('.mr-districts tbody tr').evaluateAll((rows) => rows.map((r) => r.dataset.district)), ['caferaga', 'osmanaga']);
    assert.match(await pg.locator('.mr-method').innerText(), /not every cat[\s\S]*can be wrong[\s\S]*never show exact places/);
    assert.equal(await pg.locator('[data-demo-chip]').count(), 0, 'echte Daten: kein Demo-Hinweis');
    assert.equal(await pg.locator('a[data-dl="csv"]').getAttribute('href'), 'api/export/cats.csv?lang=en');
    assert.equal(await pg.locator('a[data-dl="json"]').getAttribute('href'), 'api/report?month=2026-09');
    await noScroll('en');
    // Grafik ↔ Tabelle
    const card = pg.locator('[data-viz="reports"]');
    await card.locator('[data-toggle]').click();
    assert.match(await card.locator('[data-table]').innerText(), /Hungry\s+1/);
    await card.locator('[data-toggle]').click();
    assert.equal(await card.locator('[data-table]').isHidden(), true);
    // Mahalle-Tabelle als CSV (im Browser erzeugt)
    const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-dl="table"]')]);
    assert.equal(dl.suggestedFilename(), 'catmeifyoucan-report-2026-09-districts.csv');
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    assert.match(csv, /^﻿month,district_id,district,cats,photos/);
    assert.match(csv, /2026-09,caferaga,Caferağa,3,5,1,1,67,3,low/);
    assert.ok(!/4[01]\.\d{3}|29\.\d{3}/.test(csv), 'keine Koordinaten in der CSV');
    // Monat zurück → August (ohne Juli zum Vergleichen), Adresse merkt sich den Monat
    await pg.click('[data-step="-1"]');
    await pg.waitForFunction(() => location.search.includes('month=2026-08'));
    await pg.waitForSelector('[data-no-prev]');
    assert.equal(await pg.locator('[data-month-label]').innerText(), 'August 2026');
    assert.equal(await pg.locator('[data-step="-1"]').isDisabled(), true, 'kein Monat vor den ersten Daten');
    await pg.selectOption('[data-month]', '2026-10');
    await pg.waitForSelector('[data-partial]');
    assert.match(await text('[data-partial]'), /not over yet\. Numbers until 15\sOctober\./);
    assert.equal(await pg.locator('[data-step="1"]').isDisabled(), true, 'kein Monat in der Zukunft');
    // Druckansicht: Bedienung weg, Methodik und Adresse da
    await pg.emulateMedia({ media: 'print' });
    assert.equal(await pg.locator('.mr-picker').isVisible(), false);
    assert.equal(await pg.locator('.mr-actions').isVisible(), false);
    assert.equal(await pg.locator('.mr-method').isVisible(), true);
    assert.match(await pg.locator('.mr-url').innerText(), /report\.html\?month=2026-10&lang=en/);
    await pg.emulateMedia({ media: 'screen' });
    // Falscher Monat in der Adresse → Standardmonat mit Hinweis
    await open('?month=2031-01&lang=en');
    assert.equal(await pg.locator('[data-month-label]').innerText(), 'September 2026');
    assert.equal(await pg.locator('[data-bad-month]').count(), 1);

    // ---- Arabisch (rechts nach links), Sprachwechsel zu Persisch
    await open('?month=2026-09&lang=ar');
    assert.equal(await pg.evaluate(() => document.documentElement.dir), 'rtl');
    assert.equal(await pg.evaluate(() => document.documentElement.lang), 'ar');
    assert.match(await pg.locator('h1').innerText(), /قطط الشوارع في قاضي كوي/);
    assert.equal(await pg.locator('[data-kpi="cats"] .mr-kpi-v').innerText(), '5');
    assert.match(await pg.locator('[data-month-label]').innerText(), /سبتمبر 2026/);
    await noScroll('ar');
    await pg.selectOption('[data-lang]', 'fa');
    await pg.waitForFunction(() => document.documentElement.lang === 'fa' && location.search.includes('lang=fa'));
    assert.equal(await pg.locator('[data-kpi="cats"] .mr-kpi-v').innerText(), '۵');
    assert.match(await pg.locator('[data-month-label]').innerText(), /سپتامبر ۲۰۲۶/);
    await noScroll('fa');
    // Schmales Handy (320 px)
    await pg.setViewportSize({ width: 320, height: 640 });
    await open('?month=2026-09&lang=ru');
    await noScroll('ru 320');
    await pg.setViewportSize({ width: 390, height: 844 });

    // ---- Link aus der Statistik der App
    await pg.evaluate(async () => {
      const r = await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: 'Berichtleser', lang: 'en' }) });
      localStorage.setItem('catme.token', (await r.json()).token);
      localStorage.setItem('catme.lang', 'en');
    });
    await pg.goto(`${base}/app.html#/stats`);
    await pg.waitForSelector('[data-report-link]');
    assert.equal(await pg.locator('[data-report-link]').getAttribute('href'), 'report.html?lang=en');
    assert.match(await pg.locator('[data-report-link]').innerText(), /Monthly report/);
    await pg.click('[data-report-link]');
    await pg.waitForSelector('body[data-ready="1"]');
    assert.match(pg.url(), /report\.html\?lang=en&month=2026-09$/);

    assert.deepEqual(errors, [], 'keine Fehler in der Konsole');
    t.diagnostic(`Server-Modus geprüft: en, ar, fa, ru (320 px), Druck, Statistik-Link → ${pg.url()}`);
    await ctx.close();

    // ---- Statisch gehostet (ohne API): Demo-Zahlen aus der Engine im Browser, mit „Demo“
    const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
    const srv = staticServer(path.resolve(pub));
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    try {
      const sctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
      const sp = await sctx.newPage();
      const serr = [];
      sp.on('pageerror', (e) => serr.push(e.message));
      sp.on('console', (m) => {
        if (m.type() === 'error' && !/status of 404/.test(m.text())) serr.push(m.text());
      });
      await sp.goto(`http://127.0.0.1:${srv.address().port}/report.html?lang=ar`);
      await sp.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
      assert.equal(await sp.locator('[data-demo-chip]').count(), 1, 'Demo-Hinweis im Kopf');
      assert.equal(await sp.locator('[data-demo-note]').count(), 1);
      assert.equal(await sp.evaluate(() => document.documentElement.dir), 'rtl');
      assert.equal(await sp.locator('a[data-dl="csv"]').count(), 0, 'keine Server-Downloads ohne Server');
      assert.ok(Number(await sp.locator('[data-kpi="cats"] .mr-kpi-v').innerText()) > 0 || (await sp.locator('[data-empty]').count()) === 1);
      assert.deepEqual(serr, [], 'keine Fehler (statisch)');
      await sctx.close();
    } finally {
      await new Promise((r) => srv.close(r));
    }
  } finally {
    await browser.close();
  }
});
