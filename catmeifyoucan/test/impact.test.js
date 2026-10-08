// Wirkung & Dank: Hilfe-Aktionen nur für Freiwillige (serverseitig geprüft), Statuswechsel, Abklingzeit und
// Tageslimit, Dank-Feed nur an Melder:innen der letzten 14 Tage und nie an die Helfer:in, gelesen/ungelesen,
// „Deine Wirkung“, Zusammenführen, Browser-Demo-Antwort, HTTP-Endpunkte (Rechte, Ratenbegrenzung, keine
// Koordinaten), Leitfaden-Seite, Texte in 6 Sprachen und die Ansichten im echten Browser (auch RTL).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { normalizeAnalysis } from '../public/core/analysis.js';
import { GAME } from '../public/config/game.js';
import { CARE_ACTIONS, FEED_WINDOW_DAYS, MAX_CARE_PER_DAY, isThankableReport, feedKind } from '../public/core/impact.js';
import { createApp } from '../server/app.js';
import { loadPlaywright, launchOptions } from './helpers/playwright.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const T0 = Date.parse('2026-10-04T07:00:00Z');
const HOUR = 3600000;
const DAY = 24 * HOUR;
const ADMIN = { id: 'admin', role: 'admin', nickname: 'Admin' };

function setup() {
  let now = T0;
  const store = new MemoryStore();
  const engine = createEngine({
    store,
    now: () => now,
    game: GAME,
    analyzer: { name: 'test', analyze: async () => normalizeAnalysis({ is_cat: true, is_live_photo: true, ownership: 'street' }, { analyzer: 'test' }) },
    photos: { save: async () => ({ photoId: null, photoUrl: null }), remove: async () => {} },
  });
  return { engine, store, tick: (ms) => (now += ms), now: () => now };
}

let seq = 0;
async function mkPlayer(s, nick, role = 'player', extra = {}) {
  const p = await s.engine.createPlayer({ nickname: nick, lang: 'en', tokenHash: nick.padEnd(64, 'x') });
  s.store.players.update(p.id, { role, ...extra });
  return s.store.players.get(p.id);
}
function mkCat(s, extra = {}) {
  const id = `c_t${++seq}`;
  s.store.cats.insert({
    id, regionId: 'kadikoy', district: null, name: `Kedi${seq}`, status: 'active', lastSeenAt: s.now(), lastLat: 40.98531, lastLon: 29.02712,
    profile: { pattern: 'tekir' }, observationCount: 1, catcherIds: [], discoveredBy: null, createdAt: s.now(), ...extra,
  });
  return id;
}
const report = (s, p, catId, tags, note = '') => s.engine.reportHelp(p, catId, { tags, note });

// ---------------------------------------------------------------- Rechte

test('Hilfe-Aktionen: nur Freiwillige und Moderation – Spieler:innen, gesperrte Konten, falsche Aktionen nicht', async () => {
  const s = setup();
  const player = await mkPlayer(s, 'Turist');
  const vol = await mkPlayer(s, 'Gonullu', 'volunteer');
  const banned = await mkPlayer(s, 'Gesperrt', 'volunteer', { banned: true });
  const admin = await mkPlayer(s, 'Selin', 'admin');
  const c = mkCat(s);
  assert.throws(() => s.engine.careAction(player, c, { action: 'fed' }), { status: 403, code: 'volunteers_only' });
  assert.throws(() => s.engine.careAction(banned, c, { action: 'fed' }), { status: 403, code: 'banned' });
  assert.throws(() => s.engine.careAction(null, c, { action: 'fed' }), { status: 403 });
  for (const action of [undefined, '', 'adopt', '__proto__', 'constructor', 'toString', { x: 1 }]) {
    assert.throws(() => s.engine.careAction(vol, c, { action }), { status: 400, code: 'invalid_action' }, String(action));
  }
  assert.throws(() => s.engine.careAction(vol, 'c_gibtsnicht', { action: 'fed' }), { status: 404, code: 'cat_not_found' });
  assert.throws(() => s.engine.careAction(vol, c, { action: 'fed', note: 'orospu' }), { status: 400, code: 'text_not_allowed' });
  assert.equal(s.store.events.all().filter((e) => e.type.startsWith('care_')).length, 0, 'nichts gespeichert');
  assert.equal(s.engine.careAction(vol, c, { action: 'fed' }).event.type, 'care_fed');
  assert.equal(s.engine.careAction(admin, c, { action: 'water' }).event.type, 'care_water');
  assert.deepEqual(Object.keys(CARE_ACTIONS), ['fed', 'water', 'vet', 'ok']);
});

// ---------------------------------------------------------------- Statuswechsel

test('Statuswechsel: Tierarzt → in Behandlung, wieder gut → draußen, Futter/Wasser ändern nichts, adoptiert/verstorben gesperrt', async () => {
  const s = setup();
  const melder = await mkPlayer(s, 'Melderin');
  const vol = await mkPlayer(s, 'Gonullu', 'volunteer');
  const c = mkCat(s);
  // draußen, gut: füttern ja (Status bleibt), „wieder gut“ nein
  let r = s.engine.careAction(vol, c, { action: 'fed', note: '  Kuru mama  ' });
  assert.equal(r.cat.status, 'active');
  assert.deepEqual([r.event.from, r.event.to], ['active', 'active']);
  assert.throws(() => s.engine.careAction(vol, c, { action: 'ok' }), { status: 409, code: 'already_ok' });
  // Meldung „verletzt“ → braucht Hilfe → Tierarzt → in Behandlung → wieder gut → draußen
  s.tick(60000);
  report(s, melder, c, ['injured']);
  assert.equal(s.store.cats.get(c).status, 'needs_help');
  s.tick(60000);
  r = s.engine.careAction(vol, c, { action: 'vet' });
  assert.equal(r.cat.status, 'in_care');
  assert.deepEqual([r.event.from, r.event.to], ['needs_help', 'in_care']);
  assert.equal(s.store.cats.get(c).statusBy, vol.id);
  s.tick(60000);
  r = s.engine.careAction(vol, c, { action: 'ok' });
  assert.equal(r.cat.status, 'active');
  assert.deepEqual([r.event.from, r.event.to], ['in_care', 'active']);
  // Protokoll im Katzenprofil: neueste zuerst, mit Notiz und Spitzname
  const log = s.engine.getCat(c).events.filter((e) => e.type.startsWith('care_'));
  assert.deepEqual(log.map((e) => e.type), ['care_ok', 'care_vet', 'care_fed']);
  assert.equal(log[2].note, 'Kuru mama');
  assert.equal(log[2].by, 'Gonullu');

  // lange nicht gesehen: Tierarzt ja, „wieder gut“ nein (Status wird beim Lesen berechnet)
  const old = mkCat(s, { lastSeenAt: s.now() - 40 * DAY });
  assert.equal(s.engine.getCat(old).cat.status, 'missing');
  assert.throws(() => s.engine.careAction(vol, old, { action: 'ok' }), { status: 409, code: 'invalid_transition' });
  assert.equal(s.engine.careAction(vol, old, { action: 'water' }).cat.status, 'missing');
  assert.equal(s.engine.careAction(vol, old, { action: 'vet' }).cat.status, 'in_care');

  for (const status of ['adopted', 'deceased']) {
    const x = mkCat(s, { status });
    for (const action of Object.keys(CARE_ACTIONS)) {
      assert.throws(() => s.engine.careAction(vol, x, { action }), { status: 409, code: 'cat_closed' }, `${status}/${action}`);
    }
  }
});

test('Ratenbegrenzung in der Engine: gleiche Aktion an derselben Katze erst nach der Abklingzeit, Tageslimit pro Person', async () => {
  const s = setup();
  const vol = await mkPlayer(s, 'Gonullu', 'volunteer');
  const other = await mkPlayer(s, 'Gonullu2', 'volunteer');
  const c = mkCat(s);
  s.engine.careAction(vol, c, { action: 'fed' });
  const err = (() => {
    try {
      s.engine.careAction(vol, c, { action: 'fed' });
    } catch (e) {
      return e;
    }
    return null;
  })();
  assert.equal(err && err.code, 'care_too_soon');
  assert.equal(err.status, 409);
  assert.ok(err.details.retryAfter > 0 && err.details.retryAfter <= 3 * 3600);
  s.engine.careAction(vol, c, { action: 'water' }); // andere Aktion geht
  s.engine.careAction(other, c, { action: 'fed' }); // andere Person geht
  s.tick(CARE_ACTIONS.fed.cooldownH * HOUR);
  s.engine.careAction(vol, c, { action: 'fed' });

  const s2 = setup();
  const busy = await mkPlayer(s2, 'Fleissig', 'volunteer');
  const cats = Array.from({ length: MAX_CARE_PER_DAY + 1 }, () => mkCat(s2));
  for (const id of cats.slice(0, MAX_CARE_PER_DAY)) s2.engine.careAction(busy, id, { action: 'water' });
  assert.throws(() => s2.engine.careAction(busy, cats.at(-1), { action: 'water' }), { status: 429, code: 'care_limit' });
  s2.tick(DAY);
  s2.engine.careAction(busy, cats.at(-1), { action: 'water' });
});

// ---------------------------------------------------------------- Dank-Feed

test('Dank-Feed: nur Melder:innen der letzten 14 Tage, nie die Helfer:in, nur passende Meldungen, neueste zuerst', async () => {
  const s = setup();
  const [a, b, c, d, e, g] = [await mkPlayer(s, 'Ayse'), await mkPlayer(s, 'Baran'), await mkPlayer(s, 'Can'), await mkPlayer(s, 'Deniz'), await mkPlayer(s, 'Ece'), await mkPlayer(s, 'Gul')];
  const v = await mkPlayer(s, 'Volkan', 'volunteer');
  const w = await mkPlayer(s, 'Wera', 'volunteer');
  const cat = mkCat(s, { name: 'Duman' });
  report(s, d, cat, ['sick']); // T0 – wird 15 Tage alt
  s.tick(12 * DAY);
  report(s, a, cat, ['sick']); // 3 Tage vor der Hilfe
  s.tick(2 * DAY);
  report(s, b, cat, ['hungry']); // 1 Tag vor der Hilfe
  s.tick(DAY - HOUR);
  report(s, c, cat, ['healthy']); // gesund → kein Dank
  report(s, g, cat, ['kittens']); // „hat Kitten“ (leicht) → kein Dank
  report(s, v, cat, ['thirsty']); // die Helferin hat selbst gemeldet
  s.tick(HOUR); // = T0 + 15 Tage
  const r = s.engine.careAction(v, cat, { action: 'fed' });
  assert.equal(r.notified, 2, 'Ayse + Baran');
  const items = (p) => s.engine.myFeed(p).items;
  assert.deepEqual(items(a).map((x) => x.kind), ['fed']);
  assert.deepEqual(items(b).map((x) => x.kind), ['fed']);
  assert.equal(items(a)[0].cat.name, 'Duman');
  assert.equal(items(a)[0].cat.id, cat);
  assert.equal(items(a)[0].reportedAt, T0 + 12 * DAY);
  for (const p of [c, d, g, v]) assert.equal(items(p).length, 0, p.nickname);

  s.tick(HOUR);
  report(s, e, cat, ['hungry']); // nach der Fütterung gemeldet → dafür kein Dank
  assert.equal(items(e).length, 0);
  s.tick(HOUR);
  assert.equal(s.engine.careAction(w, cat, { action: 'water' }).notified, 4, 'Ayse, Baran, Volkan (Meldung „durstig“), Ece');
  assert.deepEqual(items(a).map((x) => x.kind), ['water', 'fed'], 'neueste zuerst');
  assert.deepEqual(items(v).map((x) => x.kind), ['water'], 'Volkan bekommt Dank für Weras Hilfe, nicht für die eigene');
  assert.deepEqual(items(e).map((x) => x.kind), ['water']);
  assert.equal(items(w).length, 0);
  // zwei Freiwillige füttern kurz nacheinander → nur ein Dank „Futter“
  s.tick(HOUR);
  s.engine.careAction(w, cat, { action: 'fed' });
  assert.deepEqual(items(a).map((x) => x.kind), ['fed', 'water']);
  // keine Koordinaten im Feed
  assert.doesNotMatch(JSON.stringify(s.engine.myFeed(a)), /"lat"|"lon"|lastLat|40\.98/);
  assert.equal(FEED_WINDOW_DAYS, 14);
});

test('Dank-Feed: Statuswechsel durch Freiwillige (in Behandlung, adoptiert, wieder gut) – nicht „verstorben“', async () => {
  const s = setup();
  const a = await mkPlayer(s, 'Ayse');
  const v = await mkPlayer(s, 'Volkan', 'volunteer');
  const c1 = mkCat(s);
  const c2 = mkCat(s);
  report(s, a, c1, ['injured']);
  report(s, a, c2, ['sick']);
  s.tick(HOUR);
  s.engine.setCatStatus(v, c1, 'in_care', 'Klinik');
  s.tick(HOUR);
  s.engine.setCatStatus(v, c1, 'adopted');
  s.engine.setCatStatus(v, c2, 'deceased');
  assert.deepEqual(s.engine.myFeed(a).items.map((x) => [x.kind, x.cat.id]), [['adopted', c1], ['care', c1]]);
  // Moderation (Admin-Token) zählt auch; „wieder gut“ nach „braucht Hilfe“
  const c3 = mkCat(s);
  report(s, a, c3, ['limping']);
  s.tick(HOUR);
  s.engine.setCatStatus(ADMIN, c3, 'active');
  assert.equal(s.engine.myFeed(a).items[0].kind, 'ok');
  // reine Funktionen
  assert.equal(feedKind({ type: 'status', from: 'missing', to: 'active' }), null);
  assert.equal(feedKind({ type: 'status', from: 'active', to: 'deceased' }), null);
  assert.equal(feedKind({ type: 'named' }), null);
  assert.equal(isThankableReport({ type: 'condition', by: 'p', catId: 'c', tags: ['fed'], severity: 'none' }), false);
  assert.equal(isThankableReport({ type: 'condition', by: 'p', catId: 'c', tags: ['thin'], severity: 'attention' }), true);
  assert.equal(isThankableReport({ type: 'auto_flag', by: 'p', catId: 'c' }), true);
});

test('Dank-Feed: ungelesen/gelesen bis zum Stand der Liste, nichts geht verloren', async () => {
  const s = setup();
  const a = await mkPlayer(s, 'Ayse');
  const v = await mkPlayer(s, 'Volkan', 'volunteer');
  const c = mkCat(s);
  report(s, a, c, ['hungry']);
  s.tick(HOUR);
  s.engine.careAction(v, c, { action: 'fed' });
  s.tick(60000);
  s.engine.careAction(v, c, { action: 'water' });
  let f = s.engine.myFeed(a);
  assert.equal(f.unread, 2);
  assert.ok(f.items.every((x) => x.unread));
  assert.equal(s.engine.feedCount(a).unread, 2);
  const listedAt = f.now;
  s.tick(10 * 60000);
  s.engine.careAction(v, c, { action: 'vet' }); // kommt nach dem Öffnen der Liste
  assert.equal(s.engine.markFeedRead(a, { upTo: listedAt }).unread, 1, 'neuer Eintrag bleibt neu');
  f = s.engine.myFeed(a);
  assert.deepEqual(f.items.map((x) => [x.kind, x.unread]), [['vet', true], ['water', false], ['fed', false]]);
  assert.equal(s.store.players.get(a.id).feedReadAt, listedAt, 'gespeichert am Konto');
  // Zeitpunkt in der Zukunft wird auf „jetzt“ begrenzt
  assert.equal(s.engine.markFeedRead(a, { upTo: s.now() + 7 * DAY }).unread, 0);
  assert.equal(s.store.players.get(a.id).feedReadAt, s.now());
  s.tick(HOUR);
  s.engine.careAction(v, c, { action: 'ok' });
  assert.equal(s.engine.feedCount(a).unread, 1);
  // älterer Stand setzt nichts zurück; ohne upTo → jetzt
  s.engine.markFeedRead(a, { upTo: T0 });
  assert.equal(s.engine.feedCount(a).unread, 1);
  assert.equal(s.engine.markFeedRead(a, {}).unread, 0);
  assert.equal(s.engine.markFeedRead(a, { upTo: 'quatsch' }).unread, 0);
});

test('Zusammenführen: Meldung an der doppelten Katze zählt für die Ziel-Katze', async () => {
  const s = setup();
  const a = await mkPlayer(s, 'Ayse');
  const v = await mkPlayer(s, 'Volkan', 'volunteer');
  const dup = mkCat(s, { name: null });
  const real = mkCat(s, { name: 'Pamuk' });
  for (const id of [dup, real]) s.store.observations.insert({ id: `o_${id}`, playerId: a.id, catId: id, regionId: 'kadikoy', status: 'ok', createdAt: s.now(), lat: 40.985, lon: 29.027, analysis: {} });
  report(s, a, dup, ['hungry']);
  s.engine.mergeCats(ADMIN, dup, real);
  s.tick(HOUR);
  s.engine.careAction(v, dup, { action: 'fed' }); // alte ID wird aufgelöst
  const items = s.engine.myFeed(a).items;
  assert.equal(items.length, 1);
  assert.equal(items[0].cat.id, real);
  assert.equal(items[0].cat.name, 'Pamuk');
});

// ---------------------------------------------------------------- Deine Wirkung

test('Deine Wirkung: Meldungen, geholfene Katzen, Erstfunde, Sichtungen durch andere, Hilfe als Freiwillige', async () => {
  const s = setup();
  const a = await mkPlayer(s, 'Ayse');
  const b = await mkPlayer(s, 'Baran');
  const v = await mkPlayer(s, 'Volkan', 'volunteer');
  assert.deepEqual(s.engine.myImpact(a), { reports: 0, helpedCats: 0, foundFirst: 0, seenByOthers: 0, careActions: 0, thanks: 0 });
  const mine = mkCat(s, { discoveredBy: a.id });
  mkCat(s, { discoveredBy: a.id, removed: true }); // entfernt → zählt nicht
  mkCat(s, { discoveredBy: a.id, mergedInto: mine }); // zusammengeführt → zählt nicht
  const obs = (id, pid, extra = {}) => s.store.observations.insert({ id: `o${++seq}`, playerId: pid, catId: id, regionId: 'kadikoy', status: 'ok', createdAt: s.now(), lat: 40.985, lon: 29.027, analysis: {}, ...extra });
  obs(mine, a.id);
  obs(mine, b.id);
  obs(mine, b.id);
  obs(mine, v.id);
  obs(mine, b.id, { status: 'rejected' });
  const c1 = mkCat(s);
  const c2 = mkCat(s);
  report(s, a, c1, ['hungry']);
  report(s, a, c2, ['healthy']);
  report(s, a, mine, ['sick']);
  s.tick(HOUR);
  s.engine.careAction(v, c1, { action: 'fed' });
  s.engine.careAction(v, c1, { action: 'water' });
  s.engine.careAction(v, mine, { action: 'vet' });
  assert.deepEqual(s.engine.myImpact(a), { reports: 3, helpedCats: 2, foundFirst: 1, seenByOthers: 3, careActions: 0, thanks: 3 });
  assert.equal(s.engine.myImpact(v).careActions, 3);
  assert.equal(s.engine.myImpact(b).reports, 0);
});

test('Browser-Demo: Demo-Freiwillige reagiert erst nach einer Minute, passend zur Meldung, einmal', async () => {
  const s = setup();
  const helper = await mkPlayer(s, 'ModaAyse', 'volunteer', { demo: true });
  const p = await mkPlayer(s, 'Ich', 'volunteer'); // im Browser-Demo ist man selbst Freiwillige:r
  const hungry = mkCat(s);
  const sick = mkCat(s);
  const fine = mkCat(s);
  report(s, p, hungry, ['hungry']);
  report(s, p, sick, ['injured']);
  report(s, p, fine, ['healthy']);
  assert.equal(s.engine.demoRespond(p), 0, 'zu früh');
  s.tick(61000);
  assert.equal(s.engine.demoRespond(p), 1);
  assert.equal(s.engine.demoRespond(p), 1);
  assert.equal(s.engine.demoRespond(p), 0, 'alles beantwortet');
  const items = s.engine.myFeed(p).items;
  assert.deepEqual(items.map((x) => [x.cat.id, x.kind]).sort(), [[hungry, 'fed'], [sick, 'vet']].sort());
  assert.ok(s.store.events.where('by', helper.id).every((e) => e.demo === true));
  assert.equal(s.store.cats.get(sick).status, 'in_care');
  // ohne Demo-Freiwillige passiert nichts (echter Server)
  const s2 = setup();
  const q = await mkPlayer(s2, 'Echt');
  report(s2, q, mkCat(s2), ['hungry']);
  s2.tick(DAY);
  assert.equal(s2.engine.demoRespond(q), 0);
});

// ---------------------------------------------------------------- HTTP

let app;
let base;
let tmp;
async function startServer() {
  if (app) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-impact-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
}
test.after(async () => {
  if (app) await app.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});
async function j(method, p, body, token) {
  const res = await fetch(base + p, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}
let seqHttp = 0;
async function register(nick) {
  const r = await j('POST', '/api/players', { nickname: `${nick}${++seqHttp}`, lang: 'en' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}
function activeCat(skip = 0) {
  return app.engine.listCats({ status: 'active', limit: 200 }).items.filter((c) => c.name)[skip].id;
}

test('HTTP: Rechte serverseitig, Feed, gelesen, Wirkung, keine Koordinaten', async () => {
  await startServer();
  const r = await register('Melder');
  const v = await register('Helfer');
  const cat = activeCat(0);
  assert.equal((await j('GET', '/api/me/feed')).status, 401);
  assert.equal((await j('GET', '/api/me/impact')).status, 401);
  assert.equal((await j('POST', '/api/me/feed/read', {})).status, 401);
  assert.equal((await j('POST', `/api/cats/${cat}/care`, { action: 'fed' })).status, 401);
  assert.equal((await j('POST', `/api/cats/${cat}/help`, { tags: ['hungry'] }, r.token)).status, 200);
  // Spieler:in → 403, auch wenn die App die Knöpfe gar nicht zeigt
  const denied = await j('POST', `/api/cats/${cat}/care`, { action: 'fed' }, v.token);
  assert.equal(denied.status, 403);
  assert.equal(denied.data.error, 'volunteers_only');
  const role = await j('POST', `/api/admin/players/${v.player.id}/role`, { role: 'volunteer' }, app.adminToken);
  assert.equal(role.status, 200);
  const done = await j('POST', `/api/cats/${cat}/care`, { action: 'fed', note: 'Kuru mama' }, v.token);
  assert.equal(done.status, 201, JSON.stringify(done.data));
  assert.ok(done.data.notified >= 1);
  assert.equal(done.data.event.type, 'care_fed');
  const again = await j('POST', `/api/cats/${cat}/care`, { action: 'fed' }, v.token);
  assert.equal(again.status, 409);
  assert.equal(again.data.error, 'care_too_soon');
  assert.ok(Number(again.headers.get('retry-after')) > 0);

  const feed = await j('GET', '/api/me/feed', null, r.token);
  assert.equal(feed.status, 200);
  assert.equal(feed.data.unread, 1);
  assert.equal(feed.data.items[0].kind, 'fed');
  assert.equal(feed.data.items[0].cat.id, cat);
  assert.doesNotMatch(JSON.stringify(feed.data), /"lat"|"lon"|lastLat|photoId|tokenHash|"by"/);
  assert.deepEqual(Object.keys((await j('GET', '/api/me/feed?count=1', null, r.token)).data).sort(), ['now', 'unread']);
  assert.equal((await j('GET', '/api/me/feed', null, v.token)).data.items.length, 0, 'Helfer bekommt keinen Dank für sich selbst');
  assert.equal((await j('POST', '/api/me/feed/read', { upTo: feed.data.now }, r.token)).data.unread, 0);
  assert.equal((await j('GET', '/api/me/feed?count=1', null, r.token)).data.unread, 0);
  const imp = await j('GET', '/api/me/impact', null, r.token);
  assert.equal(imp.data.reports, 1);
  assert.equal(imp.data.helpedCats, 1);
  assert.equal((await j('GET', '/api/me/impact', null, v.token)).data.careActions, 1);
  // Protokoll der Katze (öffentlich) zeigt die Hilfe
  const pub = await j('GET', `/api/cats/${cat}`);
  assert.ok(pub.data.events.some((e) => e.type === 'care_fed' && e.note === 'Kuru mama'));
  // kaputte Eingaben
  assert.equal((await j('POST', `/api/cats/${cat}/care`, { action: 'adopt' }, v.token)).data.error, 'invalid_action');
  assert.equal((await j('POST', '/api/cats/c_gibtsnicht/care', { action: 'water' }, v.token)).status, 404);
});

test('HTTP: Leitfaden-Seite guide.html (CSP, kein Inline-Skript), App-Hülle, Katzenseite verlinkt den Leitfaden', async () => {
  await startServer();
  const res = await fetch(`${base}/guide.html`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  const html = await res.text();
  assert.match(html, /<script type="module" src="js\/guide-page\.js"><\/script>/);
  assert.equal((html.match(/<script/g) || []).length, 1, 'nur das Modul');
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'keine Inline-Handler');
  // Service Worker: alle Einträge gibt es wirklich (sonst schlägt addAll fehl)
  const sw = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8');
  const shell = [...sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];')).matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const f of ['js/views/impact.js', 'js/views/guide.js', 'guide.html', 'js/guide-page.js']) assert.ok(shell.includes(f), f);
  for (const f of shell) assert.ok(fs.existsSync(path.join(PUBLIC, f)), `fehlt: ${f}`);
  // Katze braucht Hilfe → die öffentliche Katzenseite (Erweiterung share) verlinkt guide.html
  const r = await register('Seite');
  const cat = activeCat(3);
  assert.equal((await j('POST', `/api/cats/${cat}/help`, { tags: ['injured'] }, r.token)).status, 200);
  const page = await (await fetch(`${base}/c/${cat}?lang=en`)).text();
  assert.match(page, /href="\/guide\.html\?lang=[a-z]{2}"/);
});

// ---------------------------------------------------------------- Texte

test('Texte: alle impact-Schlüssel in 6 Sprachen, gleiche Platzhalter, Plural, Ziffern, keine GANZ-GROSS-Zeilen, kurz', async () => {
  const langs = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
  const mods = {};
  for (const l of langs) mods[l] = (await import(`../public/js/lang/${l}.js`)).default;
  const re = /^(feed|impact|care|guide)\.|^ev\.care_|^err\.(volunteers_only|invalid_action|care_too_soon|care_limit|cat_closed|already_ok|invalid_transition)$/;
  const keys = Object.keys(mods.en).filter((k) => re.test(k));
  assert.ok(keys.length >= 75, `nur ${keys.length}`);
  const ph = (v) => [...new Set((typeof v === 'object' ? Object.values(v).join(' ') : v).match(/\{\w+\}/g) || [])].sort().join();
  const all = (v) => (typeof v === 'object' ? Object.values(v) : v.split('|'));
  for (const l of langs) {
    for (const k of keys) {
      assert.ok(mods[l][k], `${l}: ${k} fehlt`);
      assert.equal(ph(mods[l][k]), ph(mods.en[k]), `${l}: ${k} Platzhalter`);
      for (const s of all(mods[l][k])) {
        assert.ok(!/\b[A-ZÇĞİÖŞÜА-Я]{4,}\b/u.test(s.replace(/KediDex|HappyTuncay/g, '')), `${l}: ${k} GANZ GROSS`);
        if (l === 'fa') assert.ok(!/[0-9]/.test(s), `fa: ${k} lateinische Ziffer`);
        if (l === 'ar') assert.ok(!/[٠-٩]/.test(s), `ar: ${k} arabisch-indische Ziffer`);
        assert.ok(!/jag|hunt|охот|صيد|شکار|avla/i.test(s), `${l}: ${k} Jagd-Wort`);
      }
    }
  }
  // Zahlen-Sätze: ru/ar/fa als Plural-Objekt, en/de mit Einzahl|Mehrzahl
  const counted = ['feed.bellNew', 'impact.reports', 'impact.helped', 'impact.found', 'impact.seen', 'impact.care', 'care.notified'];
  for (const k of counted) {
    for (const l of ['ru', 'ar', 'fa']) assert.equal(typeof mods[l][k], 'object', `${l}: ${k} Plural als Objekt`);
    assert.ok(mods.en[k].includes('|'), `en: ${k} Einzahl|Mehrzahl`);
  }
  // sehr einfache Sprache: kurze Sätze (Englisch als Vorlage)
  for (const k of keys.filter((x) => typeof mods.en[x] === 'string')) {
    for (const s of mods.en[k].split('|')) {
      for (const sentence of s.split(/(?<=[.!?])\s+/)) assert.ok(sentence.split(/\s+/).length <= 13, `en: ${k} zu lang: ${sentence}`);
    }
  }
  // ehrlich: keine Telefonnummern im Leitfaden
  for (const l of langs) for (const k of keys.filter((x) => x.startsWith('guide.'))) assert.doesNotMatch(String(mods[l][k]), /\d{3,}|\+\d/, `${l}: ${k}`);
});

// ---------------------------------------------------------------- Browser

test('Browser: Herz mit Zahl, Dank-Feed, Wirkung, Hilfe-Knöpfe nur für Freiwillige, Leitfaden (RTL), guide.html', { timeout: 120000 }, async (t) => {
  await startServer();
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
    const r = await register('BrowserMelder');
    const v = await register('BrowserHelfer');
    assert.equal((await j('POST', `/api/admin/players/${v.player.id}/role`, { role: 'volunteer' }, app.adminToken)).status, 200);
    const cat = activeCat(6);
    const sick = activeCat(7);
    assert.equal((await j('POST', `/api/cats/${cat}/help`, { tags: ['hungry'] }, r.token)).status, 200);
    assert.equal((await j('POST', `/api/cats/${sick}/help`, { tags: ['sick'] }, r.token)).status, 200);
    assert.equal((await j('POST', `/api/cats/${cat}/care`, { action: 'fed' }, v.token)).status, 201);
    const errors = [];
    const open = async (token, lang) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lang });
      await ctx.addInitScript(([tok, l]) => {
        localStorage.setItem('catme.token', tok);
        localStorage.setItem('catme.lang', l);
      }, [token, lang]);
      // Kartenkacheln kommen von außen – im Test nicht laden
      await ctx.route(/tile\.openstreetmap\.org/, (route) => route.abort());
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      return page;
    };
    const page = await open(r.token, 'en');
    await page.goto(`${base}/app.html#/`);
    await page.waitForSelector('.feed-n:not([hidden])');
    assert.equal(await page.locator('.feed-n').innerText(), '1');
    assert.match(await page.locator('[data-feed-bell]').getAttribute('aria-label'), /Thank-you notes: 1 new thank-you note/);
    await page.waitForSelector('.impact-line');
    assert.match(await page.locator('.impact-line').innerText(), /1 cat got help after your report/);
    await page.click('[data-feed-bell]');
    await page.waitForSelector('.feed-item.unread');
    assert.match(await page.locator('.feed-item').first().innerText(), /Got food – thanks to your report/);
    await page.waitForSelector('.feed-n[hidden]', { state: 'attached' });
    // Spieler:in sieht keine Hilfe-Knöpfe, aber den Hinweis + Leitfaden
    await page.goto(`${base}/app.html#/cat/${sick}`);
    await page.waitForSelector('.help-hint');
    assert.equal(await page.locator('.care-card').count(), 0);
    // Meldeformular → „Wie kann ich helfen?“ öffnet den Leitfaden über dem Formular
    await page.click('[data-act="help"]');
    await page.click('.modal [data-guide-pop]');
    await page.waitForSelector('.guide-pop');
    assert.equal(await page.locator('.modal-wrap').count(), 2, 'Formular bleibt offen');
    assert.equal(await page.locator('.guide-pop .guide-sec').count(), 6);

    const vp = await open(v.token, 'en');
    await vp.goto(`${base}/app.html#/cat/${sick}`);
    await vp.waitForSelector('.care-card');
    assert.deepEqual(await vp.locator('[data-care]').evaluateAll((els) => els.map((e) => e.dataset.care)), ['fed', 'water', 'vet', 'ok']);
    await vp.click('[data-care="vet"]');
    await vp.fill('.modal textarea[name="note"]', 'Moda Vet');
    await vp.click('.modal .btn.primary');
    await vp.waitForSelector('.toast.success');
    assert.match(await vp.locator('.toast.success').innerText(), /(1 person|[0-9]+ people) who reported it gets? a thank-you/);
    await vp.waitForFunction(() => document.querySelector('.cat-hero .st-in_care'));

    // Arabisch: Leitfaden von rechts nach links, Herz-Zahl mit Ziffer
    const ar = await open(r.token, 'ar');
    await ar.goto(`${base}/app.html#/guide`);
    await ar.waitForSelector('.guide-grid');
    assert.equal(await ar.evaluate(() => document.documentElement.dir), 'rtl');
    assert.equal(await ar.locator('.guide .guide-sec').count(), 6);
    await ar.waitForSelector('.feed-n:not([hidden])');
    assert.equal(await ar.locator('.feed-n bdi').count(), 1);

    // öffentliche Seite ohne Konto, Sprachwahl
    const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, locale: 'de' });
    const gp = await ctx.newPage();
    gp.on('pageerror', (e) => errors.push(e.message));
    await gp.goto(`${base}/guide.html?lang=fa`);
    await gp.waitForSelector('.guide-grid');
    assert.equal(await gp.evaluate(() => [document.documentElement.lang, document.documentElement.dir].join()), 'fa,rtl');
    await gp.click('[data-lang="de"]');
    assert.match(await gp.locator('h1').innerText(), /So hilfst du Straßenkatzen/);
    assert.ok(await gp.evaluate(() => document.documentElement.scrollWidth <= 320), 'kein Querscrollen bei 320 px');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('HTTP: Ratenbegrenzung für die Hilfe-Aktionen (eigener Server, damit die anderen Tests nicht ausgebremst werden)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-impact-rl-'));
  const own = await createApp({ dataDir: dir, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => own.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${own.server.address().port}`;
  try {
    const call = async (method, p, body, token) => {
      const res = await fetch(url + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: res.status, data: await res.json().catch(() => null) };
    };
    const v = (await call('POST', '/api/players', { nickname: 'Eilig', lang: 'en' })).data;
    await call('POST', `/api/admin/players/${v.player.id}/role`, { role: 'volunteer' }, own.adminToken);
    const cats = own.engine.listCats({ status: 'active', limit: 60 }).items;
    let limited = null;
    let ok = 0;
    for (let i = 0; i < 40 && !limited; i++) {
      const x = await call('POST', `/api/cats/${cats[i].id}/care`, { action: 'water' }, v.token);
      if (x.status === 201) ok++;
      if (x.status === 429) limited = x;
    }
    assert.ok(ok >= 10, `erst ${ok} gingen durch`);
    assert.ok(limited, 'irgendwann 429');
    assert.equal(limited.data.error, 'rate_limited');
  } finally {
    await own.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
