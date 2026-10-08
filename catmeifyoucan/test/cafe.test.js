// Café-QR: Empfehlungscode (eindeutig, ohne verwechselbare Zeichen), Cookie nur für freigegebene
// Partner mit den richtigen Flags, Zuordnung bei der Anmeldung (erster Kontakt), Café-Zahlen mit
// Café-Sitzung, Druckvorlage (öffentliche Daten), Moderation, Texte in 6 Sprachen und die Druckseite
// im echten Browser: keine Fehler, QR ≥ 30 mm und mit jsQR lesbar → richtiger Link.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { normalizeAnalysis } from '../public/core/analysis.js';
import { seedDemo } from '../public/core/demo.js';
import { GAME } from '../public/config/game.js';
import { makeRefCode, uniqueRefCode, normalizeRefCode, REF_ALPHABET } from '../public/core/cafe.js';
import { readCookie, refCookie, clearRefCookie } from '../server/cafe.js';
import { createApp } from '../server/app.js';
import { loadPlaywright, launchOptions } from './helpers/playwright.js';

const T0 = Date.parse('2026-10-04T07:00:00Z');
const DAY = 86400000;
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const ADMIN = { id: 'admin', role: 'admin', nickname: 'Admin' };

function engineSetup() {
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

const partnerDoc = (id, extra = {}) => ({
  id, type: 'partner', regionId: 'kadikoy', name: `Kafe ${id}`, lat: 40.984, lon: 29.027, status: 'approved', active: true,
  pinHash: 'x', reward: { minCats: 20, discountPct: 20 }, createdAt: T0, ...extra,
});

// ---------------------------------------------------------------- Code

test('Empfehlungscode: 6 Zeichen, eindeutiges Alphabet, ohne Modulo-Schiefe, normalisierbar', () => {
  for (let i = 0; i < 500; i++) assert.match(makeRefCode(), CODE_RE);
  assert.ok(!/[01ILO]/.test(REF_ALPHABET));
  // Bytes ≥ 248 werden verworfen: 255,255,… liefert erst ab dem ersten brauchbaren Byte Zeichen
  let call = 0;
  const bytes = (n) => (call++ === 0 ? Uint8Array.from({ length: n }, (_, i) => (i < 3 ? 250 : i)) : new Uint8Array(n));
  assert.equal(makeRefCode(bytes), 'DEFGHJ');
  assert.throws(() => makeRefCode((n) => new Uint8Array(n).fill(255)));
  // Kollision: erster Versuch ist schon vergeben → nächster Code
  const seq = [new Uint8Array(12).fill(0), new Uint8Array(12).fill(1)];
  let k = 0;
  assert.equal(uniqueRefCode(new Set(['AAAAAA']), () => seq[Math.min(k++, 1)]), 'BBBBBB');
  assert.throws(() => uniqueRefCode(new Set(['AAAAAA']), () => new Uint8Array(12)));
  assert.equal(normalizeRefCode(' abc-234 '), 'ABC234');
  assert.equal(normalizeRefCode('ABC2340'), null);
  assert.equal(normalizeRefCode('ABCD1O'), null); // 1 und O gibt es nicht
  assert.equal(normalizeRefCode(null), null);
  assert.equal(normalizeRefCode('x'.repeat(5000)), null);
});

test('Code beim Anlegen und nachträglich für alte Partner; eindeutig; Orte ohne Café ohne Code', () => {
  const { engine, store } = engineSetup();
  for (let i = 0; i < 300; i++) store.places.insert(partnerDoc(`pl_old${i}`));
  store.places.insert({ id: 'pl_feed', type: 'feeding', regionId: 'kadikoy', name: 'Mama', lat: 40.98, lon: 29.02, status: 'approved', active: true });
  assert.equal(engine.ensureRefCodes(), 300);
  assert.equal(engine.ensureRefCodes(), 0);
  const codes = store.places.where('type', 'partner').map((p) => p.refCode);
  assert.equal(new Set(codes).size, 300);
  for (const c of codes) assert.match(c, CODE_RE);
  assert.equal(store.places.get('pl_feed').refCode, undefined);
  assert.equal(engine.refCodeOf('pl_feed'), null);

  const created = engine.upsertPlace(ADMIN, { type: 'partner', name: 'Yeni Kafe', lat: 40.985, lon: 29.026, pinHash: 'scrypt$x$y', reward: { minCats: 12, discountPct: 15 } });
  assert.match(created.refCode, CODE_RE);
  assert.equal(store.places.get(created.id).refCode, created.refCode);
  assert.ok(!codes.includes(created.refCode));
  // Ändern behält den Code
  const edited = engine.upsertPlace(ADMIN, { id: created.id, name: 'Yeni Kafe 2' });
  assert.equal(edited.refCode, created.refCode);
  const feed = engine.upsertPlace(ADMIN, { type: 'feeding', name: 'Su kabı', lat: 40.985, lon: 29.026 });
  assert.equal(feed.refCode, undefined);
});

test('Zuordnung: nur freigegebene, aktive Cafés; erster Kontakt gewinnt', async () => {
  const { engine, store } = engineSetup();
  store.places.insert(partnerDoc('pl_a'));
  store.places.insert(partnerDoc('pl_b'));
  store.places.insert(partnerDoc('pl_pending', { status: 'pending' }));
  store.places.insert(partnerDoc('pl_paused', { active: false }));
  const [a, b, pending, paused] = ['pl_a', 'pl_b', 'pl_pending', 'pl_paused'].map((id) => engine.refCodeOf(id));
  assert.equal(engine.refPartner(a.toLowerCase()).id, 'pl_a');
  assert.equal(engine.refPartner(pending), null);
  assert.equal(engine.refPartner(paused), null);
  assert.equal(engine.placeByRefCode(pending).id, 'pl_pending');

  const p = await engine.createPlayer({ nickname: 'Turist', tokenHash: 't'.repeat(64) });
  assert.equal(engine.attributeReferral(p, pending), null);
  assert.equal(engine.attributeReferral(p, paused), null);
  assert.equal(engine.attributeReferral(p, 'ZZZZZZ'), null);
  assert.equal(store.players.get(p.id).referral, undefined);
  const r = engine.attributeReferral(p, a);
  assert.deepEqual(r, { placeId: 'pl_a', at: T0 });
  assert.equal(engine.attributeReferral(p, b), null);
  assert.equal(store.players.get(p.id).referral.placeId, 'pl_a');
  assert.equal(engine.publicPlayer(store.players.get(p.id)).referral, undefined, 'Herkunft ist nicht öffentlich');
});

test('Café-Zahlen: gesamt / 30 Tage, Tagesziel, eingelöste Gutscheine; nur Summen', async () => {
  const s = engineSetup();
  const { engine, store } = s;
  store.places.insert(partnerDoc('pl_a', { reward: { minCats: 10, discountPct: 25 } }));
  store.places.insert(partnerDoc('pl_b'));
  const code = engine.refCodeOf('pl_a');
  const mk = async (nick) => {
    const p = await engine.createPlayer({ nickname: nick, tokenHash: `${nick}`.padEnd(64, 'h') });
    engine.attributeReferral(p, code);
    return p;
  };
  const old1 = await mk('Eski1');
  const old2 = await mk('Eski2');
  store.xp.insert({ id: 'x1', playerId: old1.id, amount: 100, reason: 'daily_goal', at: T0 + DAY, dayKey: '2026-10-05' });
  store.vouchers.insert({ id: 'v0', code: 'CAT-AAAA-AAAA', playerId: old2.id, regionId: 'kadikoy', dayKey: '2026-10-04', createdAt: T0 + 3600000, redeemedAt: T0 + 7200000, partnerId: 'pl_b' });
  s.tick(40 * DAY);
  const fresh = await mk('Yeni1');
  const banned = await mk('Yasak1');
  store.players.update(banned.id, { banned: true });
  const other = await engine.createPlayer({ nickname: 'Baska', tokenHash: 'b'.repeat(64) });
  engine.attributeReferral(other, engine.refCodeOf('pl_b'));
  store.xp.insert({ id: 'x2', playerId: fresh.id, amount: 100, reason: 'daily_goal', at: s.now() - 3600000, dayKey: '2026-11-13' });
  store.vouchers.insert({ id: 'v1', code: 'CAT-BBBB-BBBB', playerId: other.id, regionId: 'kadikoy', dayKey: 'x', createdAt: s.now() - 2 * DAY, redeemedAt: s.now() - 2 * DAY, partnerId: 'pl_a' });
  store.vouchers.insert({ id: 'v2', code: 'CAT-CCCC-CCCC', playerId: other.id, regionId: 'kadikoy', dayKey: 'y', createdAt: s.now() - 35 * DAY, redeemedAt: s.now() - 35 * DAY, partnerId: 'pl_a' });
  store.vouchers.insert({ id: 'v3', code: 'CAT-DDDD-DDDD', playerId: other.id, regionId: 'kadikoy', dayKey: 'z', createdAt: s.now() - DAY, redeemedAt: null, partnerId: null });

  const st = engine.partnerStats(store.places.get('pl_a'));
  assert.equal(st.refCode, code);
  assert.deepEqual(st.players, { total: 3, recent: 1 }); // gesperrtes Konto zählt nicht
  assert.deepEqual(st.reachedGoal, { total: 3, recent: 1 }); // Tagesziel-XP oder Gutschein
  assert.deepEqual(st.redeemed, { total: 2, recent: 1 });
  assert.deepEqual(st.reward, { minCats: 10, discountPct: 25 });
  assert.ok(!JSON.stringify(st).includes('Eski1'), 'keine Spitznamen');

  assert.throws(() => engine.referralOverview({ id: 'p', role: 'player' }), /forbidden|Moderation/);
  const all = engine.referralOverview(ADMIN);
  assert.equal(all.pl_a.players.total, 3);
  assert.equal(all.pl_b.players.total, 1);
  assert.equal(all.pl_a.live, true);
});

test('Druckvorlage: allgemeine Version, Café-Daten ohne PIN, unbekannt/gesperrt → 404', () => {
  const { engine, store } = engineSetup();
  store.places.insert(partnerDoc('pl_a', { pinHash: 'scrypt$geheim', reward: { minCats: 15, discountPct: 25 }, address: 'Moda' }));
  store.places.insert(partnerDoc('pl_x', { status: 'rejected' }));
  assert.deepEqual(engine.cafeKit(null), { dailyGoal: 20, discountPct: 20, cafe: null });
  const k = engine.cafeKit('pl_a');
  assert.equal(k.cafe.minCats, 15);
  assert.equal(k.cafe.discountPct, 25);
  assert.match(k.cafe.refCode, CODE_RE);
  assert.ok(!JSON.stringify(k).includes('geheim'));
  assert.equal(k.cafe.lat, undefined, 'keine Koordinaten');
  assert.throws(() => engine.cafeKit('pl_x'), (e) => e.status === 404);
  assert.throws(() => engine.cafeKit('nope'), (e) => e.status === 404);
  assert.equal(engine.refWelcome(k.cafe.refCode).cafe.name, 'Kafe pl_a');
  assert.equal(engine.refWelcome('ZZZZZZ').cafe, null);
});

test('Demo-Daten: Demo-Spieler:innen kamen über Demo-Cafés, echte Konten bleiben unberührt', async () => {
  const { engine, store } = engineSetup();
  seedDemo(engine);
  const real = await engine.createPlayer({ nickname: 'Echt', tokenHash: 'e'.repeat(64) });
  engine.ensureRefCodes();
  const demoPlayers = store.players.all().filter((p) => p.demo);
  assert.ok(demoPlayers.length > 0 && demoPlayers.every((p) => p.referral && store.places.get(p.referral.placeId).demo));
  assert.equal(store.players.get(real.id).referral, undefined);
  const sum = store.places.where('type', 'partner').reduce((n, p) => n + engine.partnerStats(p).players.total, 0);
  assert.equal(sum, demoPlayers.length);
});

// ---------------------------------------------------------------- Cookie-Helfer

test('Cookie-Helfer: lesen, Flags, löschen', () => {
  assert.equal(readCookie('a=1; catme_ref=ABC234; b=2', 'catme_ref'), 'ABC234');
  assert.equal(readCookie('xcatme_ref=ABC234', 'catme_ref'), null);
  assert.equal(readCookie('', 'catme_ref'), null);
  assert.equal(readCookie(`catme_ref=${'A'.repeat(9000)}`, 'catme_ref'), null);
  assert.equal(refCookie('ABC234'), 'catme_ref=ABC234; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly');
  assert.equal(refCookie('ABC234', { secure: true }), 'catme_ref=ABC234; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly; Secure');
  assert.match(clearRefCookie(), /^catme_ref=; Path=\/; Max-Age=0;/);
});

// ---------------------------------------------------------------- Server

let app;
let base;
let tmp;
let clock = T0;
const admin = () => ({ Authorization: `Bearer ${app.adminToken}`, 'Content-Type': 'application/json' });
const cafes = {};

let ready = null;
/** Server einmal für alle Server-Tests starten (mit eigener Uhr und einem Proxy: TRUST_PROXY=1). */
const setupServer = () => (ready ||= (async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-cafe-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: false, trustProxy: 1, now: () => clock, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const mk = async (name, extra = {}) => {
    const res = await fetch(`${base}/api/admin/places`, {
      method: 'POST', headers: admin(),
      body: JSON.stringify({ type: 'partner', name, lat: 40.984, lon: 29.027, address: 'Moda', reward: { minCats: 15, discountPct: 25 }, pin: '135790', ...extra }),
    });
    const p = await res.json();
    assert.equal(res.status, 200, JSON.stringify(p));
    assert.match(p.refCode, CODE_RE, 'Code gleich beim Anlegen');
    return p;
  };
  cafes.a = await mk('Kedi Kafe');
  cafes.b = await mk('Martı Kafe');
  cafes.paused = await mk('Uyku Kafe', { active: false });
  cafes.pending = await mk('Bekleyen Kafe', { status: 'pending' });
})());
test.after(async () => {
  if (!app) return;
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const page = (p, headers = {}) => fetch(base + p, { headers, redirect: 'manual' });
const json = async (method, p, body, headers = {}) => {
  const res = await fetch(base + p, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
};

test('Cookie nur auf Startseite/App, nur für freigegebene aktive Cafés, mit den richtigen Flags', async () => {
  await setupServer();
  for (const p of ['/', '/index.html', '/app.html']) {
    const res = await page(`${p}?ref=${cafes.a.refCode}`);
    assert.equal(res.status, 200, p);
    assert.equal(res.headers.get('set-cookie'), `catme_ref=${cafes.a.refCode}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`, p);
  }
  const lower = await page(`/?ref=${cafes.a.refCode.toLowerCase()}&lang=ar`);
  assert.match(lower.headers.get('set-cookie'), new RegExp(`^catme_ref=${cafes.a.refCode};`));
  assert.match(await lower.text(), /<html lang="ar" dir="rtl"/, 'Startseite bleibt wie sie war');
  // HTTPS hinter einem Proxy (TRUST_PROXY) → Secure
  const https = await page(`/?ref=${cafes.a.refCode}`, { 'X-Forwarded-Proto': 'https' });
  assert.match(https.headers.get('set-cookie'), /; HttpOnly; Secure$/);
  for (const [why, url] of [
    ['pausiert', `/?ref=${cafes.paused.refCode}`],
    ['nicht freigegeben', `/?ref=${cafes.pending.refCode}`],
    ['unbekannt', '/?ref=ZZZZZZ'],
    ['Unsinn', `/?ref=${encodeURIComponent('<script>')}`],
    ['andere Seite', `/partner.html?ref=${cafes.a.refCode}`],
    ['ohne ref', '/'],
  ]) {
    const res = await page(url);
    assert.equal(res.headers.get('set-cookie'), null, why);
  }
  // Erster Kontakt zählt: gültiges Cookie von Café A bleibt, auch wenn später Café B gescannt wird
  const keep = await page(`/?ref=${cafes.b.refCode}`, { Cookie: `catme_ref=${cafes.a.refCode}` });
  assert.equal(keep.headers.get('set-cookie'), null);
  // … ein ungültiges (z. B. pausiertes Café) wird ersetzt
  const replace = await page(`/?ref=${cafes.b.refCode}`, { Cookie: `catme_ref=${cafes.paused.refCode}` });
  assert.match(replace.headers.get('set-cookie'), new RegExp(`^catme_ref=${cafes.b.refCode};`));
});

test('Anmeldung mit Cookie speichert die Herkunft (erster Kontakt) und löscht das Cookie', async () => {
  await setupServer();
  const store = app.engine.ctx.store;
  const reg = await json('POST', '/api/players', { nickname: 'TuristAnna', lang: 'en' }, { Cookie: `x=1; catme_ref=${cafes.a.refCode}` });
  assert.equal(reg.status, 201);
  assert.match(reg.headers.get('set-cookie'), /^catme_ref=; Path=\/; Max-Age=0; SameSite=Lax; HttpOnly/);
  assert.equal(reg.data.player.referral, undefined, 'nicht in der Antwort');
  const p = store.players.get(reg.data.player.id);
  assert.deepEqual(p.referral, { placeId: cafes.a.id, at: clock });
  assert.ok(!JSON.stringify(p.referral).includes('127.0.0.1'), 'keine IP');
  // ohne Cookie: keine Herkunft, kein Set-Cookie
  const plain = await json('POST', '/api/players', { nickname: 'NormalBob' });
  assert.equal(plain.headers.get('set-cookie'), null);
  assert.equal(store.players.get(plain.data.player.id).referral, undefined);
  // Cookie eines pausierten Cafés: keine Herkunft, Cookie wird trotzdem gelöscht
  const paused = await json('POST', '/api/players', { nickname: 'PauseCem' }, { Cookie: `catme_ref=${cafes.paused.refCode}` });
  assert.equal(paused.status, 201);
  assert.equal(store.players.get(paused.data.player.id).referral, undefined);
  assert.match(paused.headers.get('set-cookie'), /Max-Age=0/);
  // Spätere Zuordnung zu einem anderen Café überschreibt nichts
  assert.equal(app.engine.attributeReferral(p, cafes.b.refCode), null);
  assert.equal(store.players.get(p.id).referral.placeId, cafes.a.id);
});

test('GET /api/partner/stats: nur mit Café-Sitzung, eigene Zahlen, 30-Tage-Fenster', async () => {
  await setupServer();
  assert.equal((await json('GET', '/api/partner/stats')).status, 401);
  const player = await json('POST', '/api/players', { nickname: 'SpielerX' });
  assert.equal((await json('GET', '/api/partner/stats', null, { Authorization: `Bearer ${player.data.token}` })).status, 401, 'Spieler-Token ist keine Café-Sitzung');
  const login = await json('POST', '/api/partner/login', { partnerId: cafes.a.id, pin: '135790' });
  assert.equal(login.status, 200);
  const auth = { Authorization: `Bearer ${login.data.token}` };
  // Anna (kam über den QR-Code) hat heute ihren Gutschein hier eingelöst
  const anna = app.engine.ctx.store.players.all().find((p) => p.nickname === 'TuristAnna');
  app.engine.ctx.store.vouchers.insert({ id: 'v_t1', code: 'CAT-EEEE-EEEE', playerId: anna.id, regionId: 'kadikoy', dayKey: 'x', createdAt: clock, redeemedAt: clock, partnerId: cafes.a.id });
  const s1 = await json('GET', '/api/partner/stats', null, auth);
  assert.equal(s1.status, 200);
  assert.equal(s1.data.placeId, cafes.a.id);
  assert.equal(s1.data.refCode, cafes.a.refCode);
  assert.deepEqual(s1.data.players, { total: 1, recent: 1 });
  assert.deepEqual(s1.data.reachedGoal, { total: 1, recent: 1 }); // Gutschein = Tagesziel geschafft
  assert.deepEqual(s1.data.redeemed, { total: 1, recent: 1 });
  assert.equal(s1.data.publicUrl, null);
  assert.ok(!JSON.stringify(s1.data).includes('TuristAnna'), 'keine Spitznamen');
  const loginB = await json('POST', '/api/partner/login', { partnerId: cafes.b.id, pin: '135790' });
  const sB = await json('GET', '/api/partner/stats', null, { Authorization: `Bearer ${loginB.data.token}` });
  assert.equal(sB.data.players.total, 0, 'Café B sieht nur seine eigenen Zahlen');
  clock += 31 * DAY;
  assert.equal((await json('GET', '/api/partner/stats', null, auth)).status, 401, 'Sitzung (12 h) abgelaufen');
  const again = await json('POST', '/api/partner/login', { partnerId: cafes.a.id, pin: '135790' });
  const s2 = await json('GET', '/api/partner/stats', null, { Authorization: `Bearer ${again.data.token}` });
  assert.deepEqual(s2.data.players, { total: 1, recent: 0 });
  assert.deepEqual(s2.data.redeemed, { total: 1, recent: 0 });
});

test('Öffentliche Endpunkte: Druckvorlage, Willkommen; Moderation braucht Rechte', async () => {
  await setupServer();
  const kit = await json('GET', `/api/cafe/kit?cafe=${cafes.a.id}`);
  assert.equal(kit.status, 200);
  assert.equal(kit.data.cafe.refCode, cafes.a.refCode);
  assert.equal(kit.data.cafe.minCats, 15);
  assert.equal(kit.data.cafe.discountPct, 25);
  assert.ok(!/pinHash|scrypt|lat/.test(JSON.stringify(kit.data)));
  assert.equal((await json('GET', `/api/cafe/kit?cafe=${cafes.pending.id}`)).status, 404);
  assert.equal((await json('GET', `/api/cafe/kit?cafe=${cafes.paused.id}`)).status, 404);
  assert.equal((await json('GET', '/api/cafe/kit')).data.cafe, null);
  assert.equal((await json('GET', `/api/cafe/ref?code=${cafes.a.refCode}`)).data.cafe.name, 'Kedi Kafe');
  assert.equal((await json('GET', '/api/cafe/ref', null, { Cookie: `catme_ref=${cafes.b.refCode}` })).data.cafe.name, 'Martı Kafe');
  assert.equal((await json('GET', '/api/cafe/ref')).data.cafe, null);
  assert.equal((await json('GET', '/api/admin/cafe/referrals')).status, 403);
  const ov = await json('GET', '/api/admin/cafe/referrals', null, admin());
  assert.equal(ov.status, 200);
  assert.equal(ov.data[cafes.a.id].refCode, cafes.a.refCode);
  assert.equal(ov.data[cafes.a.id].players.total, 1);
  assert.equal(ov.data[cafes.paused.id].live, false);
});

// ---------------------------------------------------------------- Texte

test('Texte: alle Café-QR-Schlüssel in 6 Sprachen, gleiche Platzhalter, keine GANZ-GROSS-Zeilen', async () => {
  const langs = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
  const mods = {};
  for (const l of langs) mods[l] = (await import(`../public/js/lang/${l}.js`)).default;
  const keys = Object.keys(mods.en).filter((k) => /^(cafe|print)\./.test(k));
  assert.ok(keys.length >= 40);
  const ph = (v) => [...new Set((typeof v === 'object' ? Object.values(v).join(' ') : v).match(/\{\w+\}/g) || [])].sort().join();
  const all = (v) => (typeof v === 'object' ? Object.values(v) : v.split('|'));
  for (const l of langs) {
    for (const k of keys) {
      assert.ok(mods[l][k], `${l}: ${k} fehlt`);
      assert.equal(ph(mods[l][k]), ph(mods.en[k]), `${l}: ${k} Platzhalter`);
      for (const s of all(mods[l][k])) {
        assert.ok(!/\b[A-ZÇĞİÖŞÜ]{5,}\b/.test(s.replace(/KediDex|HappyTuncay|EGSWCM|CATME/g, '')), `${l}: ${k} GANZ GROSS`);
        if (l === 'fa') assert.ok(!/[0-9]/.test(s.replace(/A4|QR/g, '')), `fa: ${k} lateinische Ziffer`);
        if (l === 'ar') assert.ok(!/[٠-٩]/.test(s), `ar: ${k} arabisch-indische Ziffer`);
      }
    }
  }
  for (const l of ['ru', 'ar', 'fa']) assert.equal(typeof mods[l]['print.offer'], 'object', `${l}: Plural als Objekt`);
});

// ---------------------------------------------------------------- Browser: Druckseite

const MM = 96 / 25.4; // CSS-Pixel je Millimeter

test('Druckseite im Browser: ohne Fehler, QR ≥ 30 mm und lesbar, Café-Angebot, RTL', { timeout: 120000 }, async (t) => {
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
  const require = createRequire(import.meta.url);
  const jsQRmod = require('jsqr');
  const jsQR = jsQRmod.default || jsQRmod;
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('catme.lang', 'en');
      } catch {
        /* egal */
      }
    });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on('pageerror', (e) => errors.push(e.message));
    pg.on('console', (m) => {
      // die 404-Antwort für ein unbekanntes Café ist gewollt (→ allgemeine Version)
      if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text());
    });

    /** PNG → Pixel (über den Browser dekodiert) für jsQR in Node. */
    async function pngPixels(png) {
      const raw = await pg.evaluate(async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const g = c.getContext('2d');
        g.drawImage(bmp, 0, 0);
        const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
        let s = '';
        for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
        return { w: bmp.width, h: bmp.height, b64: btoa(s) };
      }, png.toString('base64'));
      return { w: raw.w, h: raw.h, data: new Uint8ClampedArray(Buffer.from(raw.b64, 'base64')) };
    }

    /** QR-Code als echtes Bildschirmfoto (Druckansicht) → jsQR in Node. */
    async function readQr(selector) {
      const el = pg.locator(selector).first();
      const box = await el.boundingBox();
      const raw = await pngPixels(await el.screenshot());
      const code = jsQR(raw.data, raw.w, raw.h);
      assert.ok(code, `${selector}: QR nicht lesbar`);
      const dpr = raw.w / box.width;
      const codeMm = Math.hypot(code.location.topRightCorner.x - code.location.topLeftCorner.x, code.location.topRightCorner.y - code.location.topLeftCorner.y) / dpr / MM;
      return { text: code.data, boxMm: box.width / MM, codeMm };
    }

    const expected = `${base}/?ref=${cafes.a.refCode}`;
    for (const [layout, sel] of [['tent', '.qr-tent svg'], ['sticker', '.qr-sticker svg'], ['poster', '.qr-poster svg']]) {
      await pg.emulateMedia({ media: 'screen' });
      await pg.goto(`${base}/print.html?cafe=${encodeURIComponent(cafes.a.id)}&layout=${layout}&lang3=ar`);
      await pg.waitForSelector('body[data-ready="1"]');
      await pg.evaluate(() => document.fonts.ready);
      assert.ok(await pg.locator(`.sheet.${layout === 'sticker' ? 'stickers' : layout}`).count(), layout);
      const scroll = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(scroll <= 0, `${layout}: kein seitliches Scrollen am Handy (${scroll})`);
      await pg.setViewportSize({ width: 900, height: 1200 });
      await pg.emulateMedia({ media: 'print' });
      assert.equal(await pg.locator('.pk-controls').isVisible(), false, 'Bedienung wird nicht gedruckt');
      const sheetW = (await pg.locator('.sheet').first().boundingBox()).width / MM;
      assert.ok(Math.abs(sheetW - 210) < 1, `${layout}: Blatt 210 mm breit (${sheetW.toFixed(1)})`);
      const q = await readQr(sel);
      assert.equal(q.text, expected, `${layout}: QR-Link`);
      t.diagnostic(`${layout}: QR-Code ${q.codeMm.toFixed(1)} mm (ohne Ruhezone), Fläche ${q.boxMm.toFixed(1)} mm`);
      assert.ok(q.codeMm >= 30, `${layout}: QR ${q.codeMm.toFixed(1)} mm (ohne Ruhezone) ≥ 30 mm`);
      assert.ok(q.boxMm >= 30, `${layout}: QR-Fläche ${q.boxMm.toFixed(1)} mm`);
      const ar = pg.locator('.sheet p[lang="ar"][dir="rtl"]');
      assert.ok(await ar.count(), `${layout}: arabische Zeilen von rechts nach links`);
      if (layout !== 'sticker') {
        const offer = await pg.locator('.sheet .offer').first().innerText();
        assert.match(offer, /15 farklı kedi = burada %25 indirim/);
        assert.match(offer, /15 different cats in one day = 25% off here/);
        assert.match(await pg.locator('.sheet .offer').first().textContent(), /15\sقطة مختلفة/);
      }
      await pg.setViewportSize({ width: 390, height: 844 });
    }
    // Persisch: persische Ziffern im Angebot
    await pg.emulateMedia({ media: 'screen' });
    await pg.goto(`${base}/print.html?cafe=${encodeURIComponent(cafes.a.id)}&layout=poster&lang3=fa`);
    await pg.waitForSelector('body[data-ready="1"]');
    assert.match(await pg.locator('.sheet .offer p[lang="fa"]').innerText(), /۱۵ گربهٔ مختلف.*۲۵٪/);

    // Allgemeine Version (ohne Café) und unbekanntes Café → QR zur Startseite
    await pg.setViewportSize({ width: 900, height: 1200 });
    for (const q of ['', '?cafe=pl_gibtsnicht']) {
      await pg.goto(`${base}/print.html${q}`);
      await pg.waitForSelector('body[data-ready="1"]');
      await pg.emulateMedia({ media: 'print' });
      assert.equal((await readQr('.qr-tent svg')).text, `${base}/`);
      assert.match(await pg.locator('.sheet .offer').first().innerText(), /20 different cats in one day = 20% off at partner cafés/);
      await pg.emulateMedia({ media: 'screen' });
      assert.match(await pg.locator('[data-who]').innerText(), q ? /not found/ : /General version/);
    }
    // Café-Auswahl: nur freigegebene, aktive Cafés; Wechsel → neuer QR-Code und Adresse merkt sich das Café
    const options = await pg.locator('[data-cafe] option').evaluateAll((os) => os.map((o) => o.value));
    assert.ok(options.includes(cafes.a.id) && !options.includes(cafes.paused.id) && !options.includes(cafes.pending.id));
    await pg.selectOption('[data-cafe]', cafes.b.id);
    await pg.waitForFunction((id) => location.search.includes(`cafe=${id}`), cafes.b.id);
    await pg.emulateMedia({ media: 'print' });
    assert.equal((await readQr('.qr-tent svg')).text, `${base}/?ref=${cafes.b.refCode}`);
    await pg.emulateMedia({ media: 'screen' });

    // Gast scannt den QR-Code → Spiel: Gruß vom Café mit seinem echten Angebot (vor dem Spitznamen)
    await pg.goto(`${base}/?ref=${cafes.a.refCode}`);
    await pg.goto(`${base}/app.html`);
    const hello = pg.locator('[data-cafe-welcome]');
    await hello.waitFor();
    assert.match(await hello.innerText(), /Welcome! .*Kedi Kafe.* says hi\.\s+15 different cats in one day = 25% off there\./s);
    await pg.click('.langs button[data-lang="tr"]');
    assert.match(await pg.locator('[data-cafe-welcome]').innerText(), /Bir günde 15 farklı kedi = orada %25 indirim\./);
    await pg.click('.langs button[data-lang="en"]');

    // Café-Ansicht: Karte „Dein QR-Code“ nach der Anmeldung, Knopf führt zur Druckseite des Cafés
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.goto(`${base}/partner.html`);
    await pg.waitForSelector('select[name="partnerId"]');
    await pg.selectOption('select[name="partnerId"]', cafes.a.id);
    await pg.fill('input[name="pin"]', '135790');
    await pg.click('form button.primary');
    await pg.waitForSelector('.kit-qr svg');
    assert.equal(await pg.locator('[data-kit-link]').inputValue(), expected);
    assert.match(await pg.locator('.kit-stats').innerText(), /Came via your QR code/);
    // „QR-Bild speichern“: quadratisches PNG, nicht verzerrt, lesbar → derselbe Link
    const [download] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-kit-save]')]);
    assert.match(download.suggestedFilename(), new RegExp(`^catmeifyoucan-qr-${cafes.a.refCode}\\.png$`));
    const saved = await pngPixels(fs.readFileSync(await download.path()));
    assert.equal(saved.w, saved.h, 'quadratisch');
    assert.ok(saved.w >= 900, `groß genug (${saved.w} px)`);
    assert.equal(jsQR(saved.data, saved.w, saved.h)?.data, expected, 'gespeichertes QR-Bild lesbar');
    await pg.click('[data-kit-print]');
    await pg.waitForSelector('body[data-ready="1"]');
    assert.match(await pg.locator('[data-who]').innerText(), /Kedi Kafe/);
    await pg.setViewportSize({ width: 900, height: 1200 });
    await pg.emulateMedia({ media: 'print' });
    assert.equal((await readQr('.qr-tent svg')).text, expected);

    assert.deepEqual(errors, [], 'keine Fehler in der Konsole');
    await ctx.close();
  } finally {
    await browser.close();
  }
});
