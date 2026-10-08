// Zusammenspiel der Erweiterungen (Prüfung nach dem Zusammenführen von share, cafe, routes, impact,
// report, perf): Fehler, die nur entstehen, wenn zwei Erweiterungen aufeinandertreffen.
//
// * report × impact: „beim Tierarzt“/„wieder gut“ der Freiwilligen zählen im Monatsbericht als geholfen.
// * routes × Status: verstorbene und adoptierte Katzen stehen nicht mehr in den Spaziergängen.
// * impact: Tageslimit der Hilfe-Aktionen genau an der Istanbul-Tagesgrenze (schnelle Rechnung).
// * report × perf: /api/report hat einen eigenen ETag je Verfahren und versteht W/… und Listen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { normalizeAnalysis } from '../public/core/analysis.js';
import { GAME } from '../public/config/game.js';
import { WALKS } from '../public/config/routes.js';
import { MAX_CARE_PER_DAY } from '../public/core/impact.js';
import { startOfDay } from '../public/core/time.js';
import { createApp } from '../server/app.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const TZ = 'Europe/Istanbul';

function setup(start = Date.parse('2026-09-10T09:00:00Z')) {
  let now = start;
  const store = new MemoryStore();
  const engine = createEngine({
    store,
    now: () => now,
    game: GAME,
    analyzer: { name: 'test', analyze: async () => normalizeAnalysis({ is_cat: true, is_live_photo: true, ownership: 'street' }, { analyzer: 'test' }) },
    photos: { save: async () => ({ photoId: null, photoUrl: null }), remove: async () => {} },
  });
  return { engine, store, now: () => now, set: (t) => (now = t), tick: (ms) => (now += ms) };
}

async function mkPlayer(s, nick, role = 'player') {
  const p = await s.engine.createPlayer({ nickname: nick, lang: 'en', tokenHash: nick.padEnd(64, 'x') });
  s.store.players.update(p.id, { role });
  return s.store.players.get(p.id);
}

let seq = 0;
/** Katze mit einer Sichtung „jetzt“ an [lat, lon] (z. B. ein Wegpunkt). */
function mkCat(s, by, { at = [40.98531, 29.02712], status = 'active', name = null } = {}) {
  const id = `c_ia${++seq}`;
  const t = s.now();
  s.store.cats.insert({
    id, regionId: 'kadikoy', district: 'caferaga', name: name || `Kedi${seq}`, status, statusAt: t - 1000, lastSeenAt: t, lastLat: at[0], lastLon: at[1],
    profile: { pattern: 'tekir' }, observationCount: 1, catcherIds: [by.id], discoveredBy: by.id, createdAt: t,
  });
  s.store.observations.insert({
    id: `o_ia${seq}`, catId: id, playerId: by.id, regionId: 'kadikoy', createdAt: t, dayKey: s.engine.ctx.day(t), lat: at[0], lon: at[1],
    district: 'caferaga', status: 'ok', counted: true, analysis: { ear_tip: 'not_visible' },
  });
  return id;
}

// ---------------------------------------------------------------- report × impact

test('Monatsbericht zählt die schnelle Hilfe der Freiwilligen („beim Tierarzt“, „wieder gut“) als geholfen', async () => {
  const s = setup();
  const rep = await mkPlayer(s, 'Melderin');
  const vol = await mkPlayer(s, 'Gonullu', 'volunteer');
  const toVet = mkCat(s, rep);
  const toOk = mkCat(s, rep);
  const vetAgain = mkCat(s, rep);
  const justFed = mkCat(s, rep);
  const healthyVet = mkCat(s, rep);
  for (const id of [toVet, toOk, vetAgain, justFed]) s.engine.reportHelp(rep, id, { tags: ['injured'], note: 'Gizli not' });
  s.tick(HOUR);
  s.engine.careAction(vol, toVet, { action: 'vet', note: 'Geheime Notiz' }); // braucht Hilfe → in Behandlung
  s.engine.careAction(vol, toOk, { action: 'ok' }); // braucht Hilfe → draußen, gut
  s.engine.careAction(vol, vetAgain, { action: 'vet' });
  s.tick(13 * HOUR);
  s.engine.careAction(vol, vetAgain, { action: 'vet' }); // in Behandlung → in Behandlung: keine neue Hilfe
  s.engine.careAction(vol, justFed, { action: 'fed' }); // Status bleibt: keine Hilfe im Sinne des Berichts
  s.engine.careAction(vol, healthyVet, { action: 'vet' }); // war gar nicht gemeldet (draußen, gut → in Behandlung)

  s.set(Date.parse('2026-10-05T09:00:00Z'));
  const r = s.engine.report({ month: '2026-09' });
  assert.equal(r.help.opened, 4);
  assert.equal(r.help.toCare, 2, 'toVet + vetAgain (einmal) – nicht healthyVet, der vorher „draußen, gut“ war');
  assert.equal(r.help.resolved, 1, 'toOk');
  assert.equal(r.help.helped, 3);
  assert.equal(r.totals.helped, 3);
  assert.equal(r.help.open, 1, 'justFed braucht am Monatsende noch Hilfe');
  assert.equal(r.help.inCare, 3, 'toVet, vetAgain, healthyVet');
  assert.equal(r.help.died, 0);
  const json = JSON.stringify(r);
  for (const secret of ['Geheime Notiz', 'Gizli not', 'Gonullu', 'Melderin', toVet]) assert.ok(!json.includes(secret), secret);
});

// ---------------------------------------------------------------- routes × Status

test('Spaziergänge: verstorbene und adoptierte Katzen zählen nicht und stehen nicht in der Liste', async () => {
  const s = setup(Date.parse('2026-10-05T09:00:00Z'));
  const p = await mkPlayer(s, 'Fotografin');
  const w = WALKS.find((x) => x.id === 'moda-coast');
  const on = w.waypoints[1];
  const alive = mkCat(s, p, { at: on });
  const help = mkCat(s, p, { at: on, status: 'needs_help' });
  const care = mkCat(s, p, { at: on, status: 'in_care' });
  mkCat(s, p, { at: on, status: 'deceased' });
  mkCat(s, p, { at: on, status: 'adopted' });

  const detail = s.engine.walkRoute('moda-coast');
  const ids = detail.catList.map((c) => c.id);
  assert.deepEqual([...ids].sort(), [alive, help, care].sort(), 'nur Katzen, die noch auf der Straße leben');
  assert.equal(detail.cats, 3);
  assert.equal(detail.needHelp, 1);
  assert.ok(!detail.catList.some((c) => c.status === 'deceased' || c.status === 'adopted'));
  const heat = detail.heat.reduce((n, x) => n + x[2], 0);
  assert.equal(heat, 3, 'auch die Flecken zeigen nur diese Katzen');
  const list = s.engine.walkRoutes().routes.find((x) => x.id === 'moda-coast');
  assert.equal(list.cats, 3);

  // Katze stirbt nach der Sichtung → fällt sofort aus dem Weg heraus
  s.engine.setCatStatus({ id: 'admin', role: 'admin' }, alive, 'deceased');
  assert.ok(!s.engine.walkRoute('moda-coast').catList.some((c) => c.id === alive));
});

// ---------------------------------------------------------------- impact: Tageslimit an der Tagesgrenze

test('Hilfe-Aktionen: Tageslimit gilt genau für den Istanbul-Tag (00:00–23:59 vor Ort), auch mit vielen alten Aktionen', async () => {
  const day = '2026-09-10';
  const start = startOfDay(day, TZ); // 2026-09-09T21:00:00Z
  const s = setup(start + 2 * HOUR);
  const vol = await mkPlayer(s, 'Fleissig', 'volunteer');
  const reporter = await mkPlayer(s, 'Ayse');
  const cats = Array.from({ length: MAX_CARE_PER_DAY + 2 }, () => mkCat(s, reporter));
  // viele alte Aktionen (frühere Tage, ein Jahr Freiwilligen-Arbeit) – zählen nicht und verlangsamen den
  // Tipp nicht (vorher: jedes Ereignis per Intl formatiert, ~140 ms pro Tipp bei 20 000 Ereignissen)
  for (let i = 0; i < 20000; i++) {
    s.store.events.insert({ id: `e_old${i}`, catId: cats[i % cats.length], type: 'care_water', by: vol.id, at: start - 6 * HOUR - i * 1500000, from: 'active', to: 'active', action: 'water' });
  }
  // genau eine Millisekunde vor Mitternacht vor Ort: gestern
  s.store.events.insert({ id: 'e_edge_prev', catId: cats[0], type: 'care_fed', by: vol.id, at: start - 1, from: 'active', to: 'active', action: 'fed' });
  // genau um Mitternacht vor Ort: heute
  s.store.events.insert({ id: 'e_edge_today', catId: cats[1], type: 'care_fed', by: vol.id, at: start, from: 'active', to: 'active', action: 'fed' });
  const t0 = performance.now();
  for (const id of cats.slice(2, MAX_CARE_PER_DAY + 1)) s.engine.careAction(vol, id, { action: 'water' });
  const ms = (performance.now() - t0) / (MAX_CARE_PER_DAY - 1);
  assert.throws(() => s.engine.careAction(vol, cats.at(-1), { action: 'water' }), { status: 429, code: 'care_limit' }, '60 heute (inkl. 00:00:00.000)');
  assert.ok(ms < 50, `ein Tipp kostet ${ms.toFixed(1)} ms`);
  // nächster Tag vor Ort (21:00 UTC) → wieder frei
  s.set(startOfDay('2026-09-11', TZ));
  s.engine.careAction(vol, cats.at(-1), { action: 'water' });
});

// ---------------------------------------------------------------- report × perf: ETag je Verfahren

function raw(base, p, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${p}`, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('GET /api/report: eigener ETag je Verfahren, 304 auch mit W/… und Listen, nie für die falsche Variante', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-ia-'));
  const app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    await app.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const month = app.engine.report({}).month;
  const url = `/api/report?month=${month}`;

  const br = await raw(base, url, { 'Accept-Encoding': 'br' });
  const gz = await raw(base, url, { 'Accept-Encoding': 'gzip' });
  const plain = await raw(base, url, {});
  assert.equal(br.status, 200);
  assert.equal(br.headers['content-encoding'], 'br');
  assert.equal(gz.headers['content-encoding'], 'gzip');
  assert.equal(plain.headers['content-encoding'], undefined);
  for (const r of [br, gz, plain]) {
    assert.match(r.headers.vary || '', /Accept-Encoding/i);
    assert.match(r.headers['cache-control'], /^public, max-age=\d+$/);
  }
  assert.deepEqual(JSON.parse(zlib.brotliDecompressSync(br.body)), JSON.parse(plain.body));
  assert.deepEqual(JSON.parse(zlib.gunzipSync(gz.body)), JSON.parse(plain.body));
  assert.equal(new Set([br.headers.etag, gz.headers.etag, plain.headers.etag]).size, 3, 'drei Varianten, drei ETags');
  assert.ok(br.headers.etag.endsWith('-br"'));

  // 304 nur mit dem ETag der eigenen Variante
  const same = await raw(base, url, { 'Accept-Encoding': 'br', 'If-None-Match': br.headers.etag });
  assert.equal(same.status, 304);
  assert.equal(same.body.length, 0);
  assert.equal(same.headers.etag, br.headers.etag);
  assert.match(same.headers.vary || '', /Accept-Encoding/i);
  assert.equal((await raw(base, url, { 'Accept-Encoding': 'br', 'If-None-Match': `W/${br.headers.etag}` })).status, 304, 'schwacher ETag (Proxy)');
  assert.equal((await raw(base, url, { 'Accept-Encoding': 'br', 'If-None-Match': `"x", ${br.headers.etag}` })).status, 304, 'Liste');
  const wrong = await raw(base, url, { 'If-None-Match': br.headers.etag });
  assert.equal(wrong.status, 200, 'brotli-ETag bestätigt nie die ungepackte Variante');
  assert.equal(wrong.headers['content-encoding'], undefined);
  assert.equal((await raw(base, url, { 'If-None-Match': plain.headers.etag })).status, 304);
});
