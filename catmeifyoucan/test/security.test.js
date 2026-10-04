// Regressionstests für Funde aus der Code-Prüfung (Schummeln, Rechte, Cafés, Fotos, Proxy).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { normalizeAnalysis, heuristicAnalysis } from '../public/core/analysis.js';
import { GAME } from '../public/config/game.js';
import { createApp } from '../server/app.js';
import { clientIp } from '../server/http.js';
import { mockAnalyzer } from '../server/analyzers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const T0 = Date.parse('2026-10-04T07:00:00Z');

function engineWith({ analyze, verifier = null, game = {} } = {}) {
  let now = T0;
  const store = new MemoryStore();
  const engine = createEngine({
    store,
    now: () => now,
    game: { ...GAME, ...game },
    verifier,
    analyzer: { analyze },
    photos: { save: async () => ({ photoId: `p${now}`, photoUrl: null }), remove: async () => {} },
  });
  return { engine, store, tick: (ms) => (now += ms) };
}
const street = (extra = {}) => normalizeAnalysis({ is_cat: true, is_live_photo: true, ownership: 'street', pattern: 'tekir', eye_color: 'yellow', ...extra }, { analyzer: 'test' });
const fpOf = (i, colors) => ({ colors: colors || { orange: 0.5, black: 0.3, white: 0.2 }, hash: ((i * 2654435761) >>> 0).toString(16).padStart(8, '0') + 'abcdef01' });
const at = (i) => ({ lat: 40.9842 + i * 0.0001, lon: 29.0262, accuracy: 10, source: 'camera', images: {} });

test('KI-Ausfall: einfache Analyse übernimmt, Fang zählt aber nicht', async () => {
  const s = engineWith({ analyze: async (input) => ({ ...heuristicAnalysis(input), aiError: 'upstream' }) });
  const p = await s.engine.createPlayer({ nickname: 'Ausfall', tokenHash: 'a'.repeat(64) });
  const r = await s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(0) });
  assert.equal(r.counted, false);
  assert.ok(r.flags.includes('ai_unavailable'));
  assert.equal(r.today.count, 0);
});

test('Auch abgelehnte Versuche starten die Abklingzeit (jede Analyse kostet)', async () => {
  let n = 0;
  const s = engineWith({ analyze: async () => (n++ === 0 ? normalizeAnalysis({ is_cat: false }) : street()) });
  const p = await s.engine.createPlayer({ nickname: 'Spam', tokenHash: 'b'.repeat(64) });
  await assert.rejects(s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(1) }), { code: 'no_cat' });
  await assert.rejects(s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(2) }), { code: 'cooldown' });
  s.tick(GAME.catchCooldownSec * 1000);
  const r = await s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(3) });
  assert.equal(r.counted, true);
});

test('Manipulierte Fellfarben: Katze gleichen Musters in der Nähe geht in die KI-Prüfung', async () => {
  const calls = [];
  const s = engineWith({ analyze: async () => street(), verifier: { compare: async (a) => { calls.push(a); return { matchId: a.candidates[0].id, confidence: 0.9 }; } } });
  const p = await s.engine.createPlayer({ nickname: 'Farbe', tokenHash: 'c'.repeat(64) });
  const a = await s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(10, { orange: 0.9, white: 0.1 }) });
  s.tick(60000);
  // dieselbe Katze, aber „gefälschte“ Farben (komplett anders) und 30 m weiter
  const b = await s.engine.catchCat(p, { ...at(3), fingerprint: fpOf(11, { black: 0.9, gray: 0.1 }) });
  assert.equal(calls.length, 1, 'KI-Vergleich wurde gefragt');
  assert.equal(b.cat.id, a.cat.id);
  assert.equal(b.today.count, 1);
});

test('Tagesziel-XP gibt es nur einmal pro Tag (auch nach Moderation)', async () => {
  const s = engineWith({ analyze: async () => street(), game: { dailyGoal: 2, reid: { ...GAME.reid, radiusM: 1 } } });
  const admin = { id: 'admin', role: 'admin' };
  const p = await s.engine.createPlayer({ nickname: 'Ziel', tokenHash: 'd'.repeat(64) });
  const first = await s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(20) });
  s.tick(60000);
  const second = await s.engine.catchCat(p, { ...at(50), fingerprint: fpOf(21) });
  assert.equal(second.today.justReached, true);
  s.engine.rejectObservation(admin, first.observation.id, 'test');
  s.tick(60000);
  const third = await s.engine.catchCat(p, { ...at(100), fingerprint: fpOf(22) });
  assert.equal(third.today.count, 2);
  assert.equal(third.today.justReached, false);
  assert.equal(s.store.xp.where('playerId', p.id).filter((x) => x.reason === 'daily_goal').length, 1);
});

test('Gesperrte Konten: kein Benennen, kein Status, kein Einspruch, keine Moderation', async () => {
  const s = engineWith({ analyze: async () => street() });
  const p = await s.engine.createPlayer({ nickname: 'Gesperrt', tokenHash: 'e'.repeat(64) });
  const r = await s.engine.catchCat(p, { ...at(0), fingerprint: fpOf(30) });
  s.store.players.update(p.id, { banned: true, role: 'admin' });
  const banned = s.store.players.get(p.id);
  await assert.rejects(s.engine.nameCat(banned, r.cat.id, 'Paşa'), { code: 'banned' });
  assert.throws(() => s.engine.setCatStatus(banned, r.cat.id, 'deceased', ''), { code: 'forbidden' });
  assert.throws(() => s.engine.dispute(banned, r.observation.id, 'x'), { code: 'banned' });
  assert.throws(() => s.engine.reviewQueue(banned), { code: 'forbidden' });
  await assert.rejects(s.engine.updatePlayer(banned, { nickname: 'Neu' }), { code: 'banned' });
});

test('Proxy: X-Forwarded-For wird von rechts gelesen (links ist fälschbar)', () => {
  const req = { headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }, socket: { remoteAddress: '10.0.0.2' } };
  assert.equal(clientIp(req, 0), '10.0.0.2');
  assert.equal(clientIp(req, 1), '203.0.113.9');
  assert.equal(clientIp(req, 2), '6.6.6.6');
});

test('Server: Cafés, gesperrte Spieler, Fotos ohne Ausschnitt, Export > 200 Katzen', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-sec-'));
  const app = await createApp({ dataDir: tmp, analyzerOverride: { analyzer: mockAnalyzer, info: 'mock' }, demo: false, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const j = async (method, p, body, token) => {
    const res = await fetch(base + p, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  try {
    // Café: Login nur freigegeben; PIN-Wechsel und Ablehnung beenden Sitzungen
    const cafe = (await j('POST', '/api/admin/places', { type: 'partner', name: 'Sicher Kafe', lat: 40.985, lon: 29.03, reward: { minCats: 1, discountPct: 10 }, pin: '445566' }, app.adminToken)).data;
    const s1 = (await j('POST', '/api/partner/login', { partnerId: cafe.id, pin: '445566' })).data.token;
    assert.equal((await j('GET', '/api/partner/me', null, s1)).status, 200);
    await j('POST', '/api/admin/places', { id: cafe.id, pin: '778899' }, app.adminToken);
    assert.equal((await j('GET', '/api/partner/me', null, s1)).status, 401, 'alte Sitzung nach PIN-Wechsel ungültig');
    const s2 = (await j('POST', '/api/partner/login', { partnerId: cafe.id, pin: '778899' })).data.token;
    await j('POST', `/api/admin/places/${cafe.id}/review`, { approve: false }, app.adminToken);
    assert.equal((await j('GET', '/api/partner/me', null, s2)).status, 401, 'abgelehntes Café ist abgemeldet');
    assert.equal((await j('POST', '/api/partner/login', { partnerId: cafe.id, pin: '778899' })).status, 401, 'abgelehntes Café kann sich nicht anmelden');

    // Gesperrte Spieler:in: Schreibzugriffe 403, /api/me lesbar
    const reg = (await j('POST', '/api/players', { nickname: 'Bann' })).data;
    await j('POST', `/api/admin/players/${reg.player.id}/ban`, { banned: true }, app.adminToken);
    assert.equal((await j('GET', '/api/me', null, reg.token)).status, 200);
    assert.equal((await j('POST', '/api/vouchers', {}, reg.token)).status, 403);

    // Foto ohne Ausschnitt wird nicht veröffentlicht; kaputtes JPEG wird abgelehnt
    const jpeg = `data:image/jpeg;base64,${fs.readFileSync(path.join(here, 'fixtures', 'cat.jpg')).toString('base64')}`;
    const pl = (await j('POST', '/api/players', { nickname: 'OhneCrop' })).data;
    const c = await j('POST', '/api/catch', { photo: jpeg, lat: 40.9842, lon: 29.0262, accuracy: 10, source: 'camera', capturedAt: Date.now(), detector: { score: 0.9 } }, pl.token);
    assert.equal(c.status, 201, JSON.stringify(c.data));
    assert.equal(c.data.cat.photoUrl, null);
    assert.equal(fs.readdirSync(path.join(tmp, 'photos')).filter((f) => f.endsWith('_c.jpg')).length, 0);
    const broken = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(200, 7)]).toString('base64')}`;
    const pl2 = (await j('POST', '/api/players', { nickname: 'Kaputt' })).data;
    assert.equal((await j('POST', '/api/catch', { photo: broken, lat: 40.9842, lon: 29.0262 }, pl2.token)).status, 400);

    // Export: mehr als 200 Katzen
    const st = app.engine.ctx.store;
    for (let i = 0; i < 230; i++) {
      st.cats.insert({ id: `c_x${i}`, regionId: 'kadikoy', district: 'caferaga', lastLat: 40.984, lastLon: 29.026, lastSeenAt: Date.now(), profile: { pattern: 'tekir' }, latest: {}, status: 'active', catcherIds: [], observationCount: 1 });
    }
    const csv = await (await fetch(`${base}/api/export/cats.csv`)).text();
    assert.ok(csv.trim().split('\n').length > 231, 'alle Katzen im Export');
  } finally {
    await app.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Statische Dateien: Videos mit Typ und Byte-Bereichen (iOS Safari)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-range-'));
  const app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const file = path.join(here, '..', 'public', 'css', 'app.css');
  const size = fs.statSync(file).size;
  const bytes = fs.readFileSync(file);
  try {
    const full = await fetch(`${base}/css/app.css`);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('accept-ranges'), 'bytes');
    await full.arrayBuffer();
    const part = await fetch(`${base}/css/app.css`, { headers: { Range: 'bytes=10-19' } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), `bytes 10-19/${size}`);
    assert.deepEqual(Buffer.from(await part.arrayBuffer()), bytes.subarray(10, 20));
    const tail = await fetch(`${base}/css/app.css`, { headers: { Range: 'bytes=-5' } });
    assert.equal(tail.status, 206);
    assert.deepEqual(Buffer.from(await tail.arrayBuffer()), bytes.subarray(size - 5));
    const open = await fetch(`${base}/css/app.css`, { headers: { Range: `bytes=${size - 3}-` } });
    assert.equal(open.status, 206);
    assert.equal((await open.arrayBuffer()).byteLength, 3);
    const bad = await fetch(`${base}/css/app.css`, { headers: { Range: `bytes=${size + 10}-` } });
    assert.equal(bad.status, 416);
    assert.equal(bad.headers.get('content-range'), `bytes */${size}`);
    await bad.arrayBuffer();
    const stale = await fetch(`${base}/css/app.css`, { headers: { Range: 'bytes=0-9', 'If-Range': '"veraltet"' } });
    assert.equal(stale.status, 200, 'If-Range mit altem ETag → ganze Datei');
    await stale.arrayBuffer();
    const mp4 = path.join(here, '..', 'public', 'media', 'trailer-16x9-en.mp4');
    if (fs.existsSync(mp4)) {
      const v = await fetch(`${base}/media/trailer-16x9-en.mp4`, { method: 'HEAD' });
      assert.equal(v.headers.get('content-type'), 'video/mp4');
    }
  } finally {
    await app.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
