// Einrichtung per QR-Code (Erweiterung qr-setup): Einmal-Codes (admin · partner · volunteer), nur Hashes
// gespeichert, einmal einlösbar (auch bei zwei gleichzeitigen Versuchen), Ablauf, falscher Zweck,
// Widerruf, Ratenbegrenzung, Admin-Sitzungen (anmelden, auflisten ohne Token, abmelden), Café-PIN per QR,
// Freiwillige einladen, nie aus der Query, übersteht Neustart (Journal). Dazu Texte in allen Sprachen und
// ein echter Browser-Durchlauf: QR auf dem Bildschirm → jsQR → zweites Gerät (390 × 844).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { createApp } from '../server/app.js';
import { newSetupCode, deviceLabel, weakPin, CODE_BYTES, PURPOSES, SESSION_TTL_MS, SESSION_SHORT_MS } from '../server/setup-codes.js';
import { loadPlaywright, launchOptions } from './helpers/playwright.js';

const T0 = Date.parse('2026-10-09T08:00:00Z');
const MIN = 60000;
const DAY = 86400000;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Eigene App mit eigener Uhr (und frischen Ratenbegrenzern). */
async function fresh({ dataDir = null, demo = false, publicUrl = '', adminToken = '', t0 = T0 } = {}) {
  const dir = dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'catme-qrs-'));
  const clock = { t: t0 };
  const app = await createApp({ dataDir: dir, aiMode: 'mock', demo, publicUrl, adminToken, now: () => clock.t, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const json = async (method, p, body, token, headers = {}) => {
    const res = await fetch(base + p, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  const A = app.adminToken;
  const code = async (purpose, extra = {}) => {
    const r = await json('POST', '/api/admin/setup-codes', { purpose, ...extra }, A);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data;
  };
  const cafe = async (extra = {}) => {
    const r = await json('POST', '/api/admin/places', { type: 'partner', name: `Kafe ${crypto.randomBytes(3).toString('hex')}`, lat: 40.9852, lon: 29.0271, reward: { minCats: 10, discountPct: 15 }, ...extra }, A);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  };
  const player = async (nickname) => (await json('POST', '/api/players', { nickname })).data;
  const done = async (keep = false) => {
    await app.close();
    if (!keep) fs.rmSync(dir, { recursive: true, force: true });
  };
  return { app, dir, clock, base, json, A, code, cafe, player, done, tick: (ms) => (clock.t += ms) };
}

// ---------------------------------------------------------------- Code

test('Code: ≥ 128 Bit Zufall, URL-sicher (base64url), jedes Mal anders', () => {
  assert.ok(CODE_BYTES * 8 >= 128);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = newSetupCode();
    assert.match(c, /^[A-Za-z0-9_-]{24}$/);
    assert.equal(Buffer.from(c, 'base64url').length, CODE_BYTES);
    assert.equal(encodeURIComponent(c), c, 'ohne Umkodierung im Link');
    seen.add(c);
  }
  assert.equal(seen.size, 2000);
  // Zufallsquelle wird wirklich benutzt (gleiche Bytes → gleicher Code)
  assert.equal(newSetupCode(() => Buffer.alloc(CODE_BYTES, 0xfb)), Buffer.alloc(CODE_BYTES, 0xfb).toString('base64url'));
  assert.deepEqual(Object.keys(PURPOSES).sort(), ['admin', 'partner', 'volunteer']);
  assert.equal(PURPOSES.admin.ttlMs, 10 * MIN);
  assert.equal(PURPOSES.partner.ttlMs, 7 * DAY);
  assert.equal(PURPOSES.volunteer.maxUses, 50);
  assert.equal(SESSION_TTL_MS, 30 * DAY);
});

test('Gerätename aus dem User-Agent', () => {
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'), 'iPhone · Safari');
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'), 'Android · Chrome');
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0'), 'Windows · Firefox');
  assert.equal(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'), 'Mac · Safari');
  assert.equal(deviceLabel('catme-setup-qr'), 'Terminal');
  assert.equal(deviceLabel(''), 'Browser');
  assert.ok(deviceLabel('x'.repeat(5000)).length <= 60);
});

// ---------------------------------------------------------------- Server

test('Gespeichert wird nur der Hash – Code und Sitzungs-Token stehen nirgends auf der Platte', async () => {
  const s = await fresh();
  try {
    const c1 = await s.code('admin');
    const place = await s.cafe({ pin: '135790' });
    const c2 = await s.code('partner', { placeId: place.id });
    const c3 = await s.code('volunteer', { maxUses: 5 });
    for (const c of [c1, c2, c3]) {
      assert.match(c.code, /^[A-Za-z0-9_-]{24}$/);
      assert.equal(c.path, `/${{ admin: 'admin.html#setup=', partner: 'partner.html#setup=', volunteer: 'app.html#invite=' }[c.purpose]}${c.code}`);
      assert.equal(c.url, null, 'ohne CATME_PUBLIC_URL kein absoluter Link');
      assert.equal(c.codeHash, undefined);
    }
    assert.equal(c2.placeName, place.name);
    assert.equal(c3.maxUses, 5);
    const sess = await s.json('POST', '/api/setup/admin', { code: c1.code });
    assert.equal(sess.status, 201);
    const docs = s.app.engine.ctx.store.setupCodes.all();
    assert.equal(docs.length, 3);
    for (const [c, d] of [[c1, docs.find((x) => x.id === c1.id)], [c2, docs.find((x) => x.id === c2.id)]]) {
      assert.equal(d.codeHash, sha(c.code));
      assert.ok(!JSON.stringify(d).includes(c.code));
    }
    const sdoc = s.app.engine.ctx.store.adminSessions.all()[0];
    assert.equal(sdoc.tokenHash, sha(sess.data.token));
    s.app.journal.compact();
    const disk = fs.readFileSync(path.join(s.dir, 'snapshot.json'), 'utf8') + fs.readFileSync(path.join(s.dir, 'journal.jsonl'), 'utf8');
    for (const secret of [c1.code, c2.code, c3.code, sess.data.token]) assert.ok(!disk.includes(secret), 'nichts Geheimes auf der Platte');
    assert.ok(disk.includes(sha(c3.code)));
    // Listen zeigen weder Codes noch Hashes noch Tokens
    const list = await s.json('GET', '/api/admin/setup-codes', null, s.A);
    assert.equal(list.status, 200);
    assert.deepEqual(list.data.map((x) => x.purpose).sort(), ['partner', 'volunteer'], 'benutzter Admin-Code ist nicht mehr offen');
    const listText = JSON.stringify(list.data);
    for (const bad of [c2.code, c3.code, sha(c2.code), 'codeHash']) assert.ok(!listText.includes(bad));
    const sessions = await s.json('GET', '/api/admin/sessions', null, sess.data.token);
    assert.equal(sessions.status, 200);
    assert.equal(sessions.data.sessions.length, 1);
    assert.equal(sessions.data.sessions[0].current, true);
    assert.equal(sessions.data.sessions[0].via, 'qr');
    const sText = JSON.stringify(sessions.data);
    assert.ok(!sText.includes(sess.data.token) && !sText.includes(sha(sess.data.token)) && !sText.includes('tokenHash'));
  } finally {
    await s.done();
  }
});

test('Einmal: zwei gleichzeitige Einlöse-Versuche → genau einer gewinnt (alle drei Zwecke)', async () => {
  const s = await fresh();
  try {
    const a = await s.code('admin');
    const r1 = await Promise.all([1, 2, 3].map(() => s.json('POST', '/api/setup/admin', { code: a.code })));
    assert.deepEqual(r1.map((r) => r.status).sort(), [201, 409, 409]);
    assert.equal(s.app.engine.ctx.store.adminSessions.count(), 1, 'genau eine Sitzung');
    assert.equal(r1.find((r) => r.status === 409).data.error, 'code_used');

    const place = await s.cafe();
    const p = await s.code('partner', { placeId: place.id });
    const r2 = await Promise.all([s.json('POST', '/api/setup/partner', { code: p.code, pin: '318642' }), s.json('POST', '/api/setup/partner', { code: p.code, pin: '529731' })]);
    assert.deepEqual(r2.map((r) => r.status).sort(), [201, 409]);
    const winner = r2.find((r) => r.status === 201).data;
    const winPin = r2[0].status === 201 ? '318642' : '529731';
    assert.equal((await s.json('POST', '/api/partner/login', { partnerId: place.id, pin: winPin })).status, 200, 'die PIN des Gewinners gilt');
    assert.equal((await s.json('GET', '/api/partner/me', null, winner.token)).status, 200);

    s.tick(5 * MIN); // Ratenbegrenzung wieder auffüllen
    const v = await s.code('volunteer');
    const [x, y] = [await s.player('Eins'), await s.player('Zwei')];
    const r3 = await Promise.all([s.json('POST', '/api/invites/redeem', { code: v.code }, x.token), s.json('POST', '/api/invites/redeem', { code: v.code }, y.token)]);
    assert.deepEqual(r3.map((r) => r.status).sort(), [200, 409]);
    const roles = [x, y].map((pl) => s.app.engine.ctx.store.players.get(pl.player.id).role).sort();
    assert.deepEqual(roles, ['player', 'volunteer']);
  } finally {
    await s.done();
  }
});

test('Ablauf, falscher Zweck, Widerruf, unbekannt – und nie aus der Query', async () => {
  const s = await fresh();
  try {
    // Admin-Code: 10 Minuten
    const a = await s.code('admin');
    assert.equal(a.expiresAt, T0 + 10 * MIN);
    s.tick(10 * MIN + 1);
    const late = await s.json('POST', '/api/setup/admin', { code: a.code });
    assert.equal(late.status, 410);
    assert.equal(late.data.error, 'code_expired');
    // Café-Code: 7 Tage (6 Tage 23 h geht noch, danach nicht)
    const place = await s.cafe();
    const p = await s.code('partner', { placeId: place.id });
    assert.equal(p.expiresAt, s.clock.t + 7 * DAY);
    s.tick(7 * DAY - MIN);
    assert.equal((await s.json('POST', '/api/setup/info', { code: p.code, purpose: 'partner' })).status, 200);
    s.tick(2 * MIN);
    assert.equal((await s.json('POST', '/api/setup/partner', { code: p.code, pin: '135790' })).data.error, 'code_expired');

    // Falscher Zweck → wie unbekannt; der Code bleibt für den richtigen Zweck gültig
    s.tick(5 * MIN);
    const a2 = await s.code('admin');
    const pl = await s.player('Falsch');
    for (const [p2, body, tok] of [['/api/setup/partner', { code: a2.code, pin: '135790' }], ['/api/invites/redeem', { code: a2.code }, pl.token]]) {
      const r = await s.json('POST', p2, body, tok);
      assert.equal(r.status, 400, p2);
      assert.equal(r.data.error, 'invalid_code');
    }
    // … und umgekehrt: Café- oder Einladungs-Code als Admin-Code → nie Moderation
    const pc = await s.code('partner', { placeId: (await s.cafe()).id });
    const vc = await s.code('volunteer', { maxUses: 50 });
    for (const c of [pc, vc]) {
      const r = await s.json('POST', '/api/setup/admin', { code: c.code, purpose: 'admin' });
      assert.deepEqual([r.status, r.data.error, r.data.token], [400, 'invalid_code', undefined]);
    }
    assert.equal((await s.json('POST', '/api/invites/redeem', { code: pc.code }, pl.token)).data.error, 'invalid_code');
    assert.equal(s.app.engine.ctx.store.adminSessions.count(), 0);
    // Nie aus der Query: ?code=… wird ignoriert, nur der Body zählt
    const viaQuery = await s.json('POST', `/api/setup/admin?code=${a2.code}`, {});
    assert.equal(viaQuery.status, 400);
    assert.equal(viaQuery.data.error, 'invalid_code');
    assert.equal((await s.json('POST', `/api/setup/info?code=${a2.code}`, {})).data.error, 'invalid_code');
    assert.equal((await s.json('POST', '/api/setup/admin', { code: a2.code })).status, 201, 'richtiger Zweck, im Body → geht');

    // Widerruf
    s.tick(5 * MIN);
    const v = await s.code('volunteer', { maxUses: 3 });
    assert.equal((await s.json('DELETE', `/api/admin/setup-codes/${v.id}`, null, s.A)).status, 200);
    assert.equal((await s.json('POST', '/api/invites/redeem', { code: v.code }, pl.token)).data.error, 'invalid_code');
    assert.ok(!(await s.json('GET', '/api/admin/setup-codes', null, s.A)).data.some((x) => x.id === v.id));
    assert.equal((await s.json('DELETE', '/api/admin/setup-codes/sc_gibtsnicht', null, s.A)).status, 404);

    // Unbekannt / kaputt / falscher Typ
    for (const bad of [newSetupCode(), 'kurz', 'x'.repeat(300), 12345, null, '<script>']) {
      const r = await s.json('POST', '/api/setup/info', { code: bad });
      assert.equal(r.status, 400, String(bad));
      assert.equal(r.data.error, 'invalid_code');
    }
    // Neuer Café-Code macht den älteren desselben Cafés ungültig (es gilt nur der neueste QR-Code)
    const old = await s.code('partner', { placeId: place.id });
    const neu = await s.code('partner', { placeId: place.id });
    assert.equal((await s.json('POST', '/api/setup/info', { code: old.code })).data.error, 'invalid_code');
    assert.equal((await s.json('POST', '/api/setup/info', { code: neu.code })).status, 200);
  } finally {
    await s.done();
  }
});

test('Ratenbegrenzung: Einlösen ist knapp begrenzt (pro IP), Prüfen etwas großzügiger', async () => {
  const s = await fresh();
  try {
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await s.json('POST', '/api/setup/admin', { code: newSetupCode() })).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400));
    assert.equal(statuses[10], 429, 'ab dem 11. Versuch: zu viele Anfragen');
    // Einladungen: pro Konto knapp, pro IP großzügig (ein Treffen im selben WLAN geht durch)
    const v = await s.code('volunteer', { maxUses: 20 });
    const crowd = [];
    for (let i = 0; i < 20; i++) crowd.push(await s.player(`Helfer${i}`));
    const results = await Promise.all(crowd.map((pl) => s.json('POST', '/api/invites/redeem', { code: v.code }, pl.token)));
    assert.deepEqual(results.map((r) => r.status), Array(20).fill(200), '20 Freiwillige im selben WLAN');
    const one = crowd[0];
    const v2 = await s.code('volunteer');
    const mine = [];
    for (let i = 0; i < 11; i++) mine.push((await s.json('POST', '/api/invites/redeem', { code: newSetupCode() }, one.token)).status);
    assert.equal(mine[10], 429, 'ein Konto: nach 10 Fehlversuchen gebremst');
    s.tick(MIN);
    assert.equal((await s.json('POST', '/api/invites/redeem', { code: v2.code }, one.token)).status, 200, 'nach einer Minute wieder möglich');
    const info = [];
    for (let i = 0; i < 21; i++) info.push((await s.json('POST', '/api/setup/info', { code: newSetupCode() })).status);
    assert.equal(info.filter((x) => x === 400).length, 20);
    assert.equal(info[20], 429);
  } finally {
    await s.done();
  }
});

test('Admin-Sitzungen: Moderation mit Sitzung, Liste, einzeln/alle anderen abmelden, Ablauf nach 30 Tagen', async () => {
  const s = await fresh();
  try {
    // Ohne Rechte keine Codes, keine Geräteliste
    const pl = await s.player('Neugierig');
    for (const [m, p] of [['POST', '/api/admin/setup-codes'], ['GET', '/api/admin/setup-codes'], ['GET', '/api/admin/sessions'], ['POST', '/api/admin/sessions']]) {
      assert.equal((await s.json(m, p, m === 'POST' ? { purpose: 'admin' } : null, pl.token)).status, 403, `${m} ${p}`);
      assert.equal((await s.json(m, p, m === 'POST' ? { purpose: 'admin' } : null)).status, 403);
    }
    // Koppeln per QR (Handy) und Anmelden mit dem Token (Laptop → eigene Sitzung)
    const phone = (await s.json('POST', '/api/setup/admin', { code: (await s.code('admin')).code }, null, { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1' })).data;
    const laptop = (await s.json('POST', '/api/admin/sessions', {}, s.A, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/141.0' })).data;
    assert.ok(phone.token && laptop.token && phone.token !== laptop.token && phone.token !== s.A);
    for (const tok of [phone.token, laptop.token]) assert.equal((await s.json('GET', '/api/admin/queue', null, tok)).status, 200);
    // Eine Sitzung darf weitere Geräte koppeln (aber nie den ADMIN_TOKEN sehen)
    const c = await s.json('POST', '/api/admin/setup-codes', { purpose: 'admin' }, phone.token);
    assert.equal(c.status, 201);
    assert.ok(!JSON.stringify(c.data).includes(s.A));
    const list = (await s.json('GET', '/api/admin/sessions', null, phone.token)).data;
    assert.equal(list.current, phone.session.id);
    assert.deepEqual(list.sessions.map((x) => x.label).sort(), ['Windows · Chrome', 'iPhone · Safari']);
    assert.equal(list.sessions.find((x) => x.current).label, 'iPhone · Safari');
    // Laptop abmelden (vom Handy aus) → Laptop-Token geht nicht mehr
    assert.equal((await s.json('DELETE', `/api/admin/sessions/${laptop.session.id}`, null, phone.token)).status, 200);
    assert.equal((await s.json('GET', '/api/admin/queue', null, laptop.token)).status, 403);
    assert.equal((await s.json('DELETE', `/api/admin/sessions/${laptop.session.id}`, null, phone.token)).status, 404);
    // „Alle anderen abmelden“ behält das eigene Gerät
    const more = await Promise.all([1, 2].map(() => s.json('POST', '/api/admin/sessions', {}, s.A)));
    const out = await s.json('POST', '/api/admin/sessions/revoke-others', {}, phone.token);
    assert.equal(out.data.revoked, 2);
    for (const m of more) assert.equal((await s.json('GET', '/api/admin/queue', null, m.data.token)).status, 403);
    assert.equal((await s.json('GET', '/api/admin/queue', null, phone.token)).status, 200);
    // Abmelden beendet nur die eigene Sitzung; der ADMIN_TOKEN geht immer
    const tab = (await s.json('POST', '/api/admin/sessions', {}, s.A)).data;
    assert.equal((await s.json('POST', '/api/admin/logout', {}, tab.token)).status, 200);
    assert.equal((await s.json('GET', '/api/admin/queue', null, tab.token)).status, 403);
    assert.equal((await s.json('POST', '/api/admin/logout', {}, s.A)).status, 200);
    assert.equal((await s.json('GET', '/api/admin/queue', null, s.A)).status, 200, 'Master-Token bleibt');
    // 30 Tage später ist die Sitzung abgelaufen
    s.tick(SESSION_TTL_MS + 1);
    assert.equal((await s.json('GET', '/api/admin/queue', null, phone.token)).status, 403);
    assert.equal(s.app.engine.ctx.store.adminSessions.count(), 0, 'abgelaufene Sitzung entfernt');
  } finally {
    await s.done();
  }
});

test('Notbremse: neuer ADMIN_TOKEN → alle davon abgeleiteten Geräte und offenen Codes gelten nicht mehr', async () => {
  const A = 'erster-admin-token-0123456789abcdef';
  const B = 'zweiter-admin-token-0123456789abcdef';
  const s = await fresh({ adminToken: A });
  const phone = (await s.json('POST', '/api/setup/admin', { code: (await s.code('admin')).code })).data;
  const laptop = (await s.json('POST', '/api/admin/sessions', { remember: true }, A)).data;
  const open = await s.code('admin');
  const inv = await s.code('volunteer', { maxUses: 5 });
  assert.equal((await s.json('GET', '/api/admin/queue', null, phone.token)).status, 200);
  const t = s.clock.t;
  await s.done(true);
  // gleicher Token → alles bleibt
  const same = await fresh({ dataDir: s.dir, adminToken: A, t0: t });
  assert.equal((await same.json('GET', '/api/admin/queue', null, laptop.token)).status, 200);
  await same.done(true);
  // anderer Token → abgemeldet, Codes ungültig, Liste leer
  const s2 = await fresh({ dataDir: s.dir, adminToken: B, t0: t });
  try {
    for (const tok of [phone.token, laptop.token, A]) assert.equal((await s2.json('GET', '/api/admin/queue', null, tok)).status, 403);
    assert.equal((await s2.json('POST', '/api/setup/admin', { code: open.code })).data.error, 'invalid_code');
    const pl = await s2.player('NachWechsel');
    assert.equal((await s2.json('POST', '/api/invites/redeem', { code: inv.code }, pl.token)).data.error, 'invalid_code');
    assert.deepEqual((await s2.json('GET', '/api/admin/sessions', null, B)).data.sessions, []);
    assert.deepEqual((await s2.json('GET', '/api/admin/setup-codes', null, B)).data, []);
    assert.equal((await s2.json('GET', '/api/admin/queue', null, B)).status, 200, 'der neue Token geht');
    // nichts vom alten Token im Speicher: Fingerabdruck ≠ Token, Token nirgends auf der Platte
    s2.app.journal.compact();
    const disk = fs.readFileSync(path.join(s.dir, 'snapshot.json'), 'utf8');
    assert.ok(!disk.includes(A) && !disk.includes(B));
  } finally {
    await s2.done();
  }
});

test('Spielerkonto als Admin: Geräte und Codes gelten nur, solange das Konto admin und nicht gesperrt ist', async () => {
  const s = await fresh();
  try {
    const boss = await s.player('Moderatorin');
    await s.json('POST', `/api/admin/players/${boss.player.id}/role`, { role: 'admin' }, s.A);
    const mk = async (purpose, extra = {}) => (await s.json('POST', '/api/admin/setup-codes', { purpose, ...extra }, boss.token)).data;
    const pair = await mk('admin');
    const phone = (await s.json('POST', '/api/setup/admin', { code: pair.code })).data;
    assert.equal((await s.json('GET', '/api/admin/queue', null, phone.token)).status, 200);
    const tab = (await s.json('POST', '/api/admin/sessions', {}, boss.token)).data;
    const pending = await mk('admin');
    const inv = await mk('volunteer', { maxUses: 10 });
    // herabgestuft → Handy, Tab, offene Codes: alles weg
    await s.json('POST', `/api/admin/players/${boss.player.id}/role`, { role: 'volunteer' }, s.A);
    for (const tok of [phone.token, tab.token, boss.token]) assert.equal((await s.json('GET', '/api/admin/queue', null, tok)).status, 403);
    assert.equal((await s.json('POST', '/api/setup/admin', { code: pending.code })).data.error, 'invalid_code');
    const pl = await s.player('Neuling');
    assert.equal((await s.json('POST', '/api/invites/redeem', { code: inv.code }, pl.token)).data.error, 'invalid_code');
    assert.ok(!(await s.json('GET', '/api/admin/sessions', null, s.A)).data.sessions.some((x) => x.id === phone.session.id));
    // wieder admin, dann gesperrt → neues Gerät gilt nicht
    await s.json('POST', `/api/admin/players/${boss.player.id}/role`, { role: 'admin' }, s.A);
    s.tick(5 * MIN);
    const p2 = (await s.json('POST', '/api/setup/admin', { code: (await mk('admin')).code })).data;
    assert.equal((await s.json('GET', '/api/admin/queue', null, p2.token)).status, 200);
    await s.json('POST', `/api/admin/players/${boss.player.id}/ban`, { banned: true }, s.A);
    assert.equal((await s.json('GET', '/api/admin/queue', null, p2.token)).status, 403, 'gesperrt → Gerät abgemeldet');
  } finally {
    await s.done();
  }
});

test('Abmelden nimmt offene Kopplungs-Codes mit; ohne „Gerät merken“ nur 12 Stunden; Zustand eines Codes', async () => {
  const s = await fresh();
  try {
    const phone = (await s.json('POST', '/api/setup/admin', { code: (await s.code('admin')).code })).data;
    const thief = (await s.json('POST', '/api/setup/admin', { code: (await s.code('admin')).code })).data;
    // gestohlenes Gerät erstellt schnell einen Kopplungs-Code (und eine Einladung) …
    const sneaky = (await s.json('POST', '/api/admin/setup-codes', { purpose: 'admin' }, thief.token)).data;
    const inv = (await s.json('POST', '/api/admin/setup-codes', { purpose: 'volunteer' }, thief.token)).data;
    // … wird abgemeldet → der Kopplungs-Code gilt nicht mehr, die Einladung schon
    assert.equal((await s.json('DELETE', `/api/admin/sessions/${thief.session.id}`, null, phone.token)).status, 200);
    assert.equal((await s.json('POST', '/api/setup/admin', { code: sneaky.code })).data.error, 'invalid_code');
    assert.equal((await s.json('GET', `/api/admin/setup-codes/${sneaky.id}`, null, phone.token)).data.state, 'revoked');
    assert.equal((await s.json('GET', `/api/admin/setup-codes/${inv.id}`, null, phone.token)).data.state, 'open');
    // „Alle anderen abmelden“: auch Kopplungs-Codes aus dem Terminal/von anderen weg, die eigenen bleiben
    const other = (await s.json('POST', '/api/admin/sessions', { remember: true }, s.A)).data;
    const fromOther = (await s.json('POST', '/api/admin/setup-codes', { purpose: 'admin' }, other.token)).data;
    const fromTerminal = await s.code('admin', { via: 'terminal' });
    const mine = (await s.json('POST', '/api/admin/setup-codes', { purpose: 'admin' }, phone.token)).data;
    const out = (await s.json('POST', '/api/admin/sessions/revoke-others', {}, phone.token)).data;
    assert.deepEqual([out.revoked, out.revokedCodes], [1, 2]);
    for (const c of [fromOther, fromTerminal]) assert.equal((await s.json('GET', `/api/admin/setup-codes/${c.id}`, null, phone.token)).data.state, 'revoked');
    assert.equal((await s.json('GET', `/api/admin/setup-codes/${mine.id}`, null, phone.token)).data.state, 'open');
    // Zustand: benutzt / abgelaufen; nur für Moderation; kein Code und kein Hash in der Antwort
    s.tick(5 * MIN);
    assert.equal((await s.json('POST', '/api/setup/admin', { code: mine.code })).status, 201);
    const st = await s.json('GET', `/api/admin/setup-codes/${mine.id}`, null, phone.token);
    assert.equal(st.data.state, 'used');
    assert.ok(!JSON.stringify(st.data).includes(mine.code) && !('codeHash' in st.data) && !('epoch' in st.data));
    const late = await s.code('admin');
    s.tick(11 * MIN);
    assert.equal((await s.json('GET', `/api/admin/setup-codes/${late.id}`, null, s.A)).data.state, 'expired');
    const pl = await s.player('Neugierig');
    assert.equal((await s.json('GET', `/api/admin/setup-codes/${late.id}`, null, pl.token)).status, 403);
    assert.equal((await s.json('GET', '/api/admin/setup-codes/sc_gibtsnicht', null, s.A)).status, 404);
    // Token-Anmeldung ohne „Gerät merken“: 12 Stunden; mit: 30 Tage
    const short = (await s.json('POST', '/api/admin/sessions', { remember: false }, s.A)).data;
    const long = (await s.json('POST', '/api/admin/sessions', { remember: true }, s.A)).data;
    assert.equal(short.session.expiresAt - short.session.createdAt, SESSION_SHORT_MS);
    assert.equal(long.session.expiresAt - long.session.createdAt, SESSION_TTL_MS);
    s.tick(SESSION_SHORT_MS + 1);
    assert.equal((await s.json('GET', '/api/admin/queue', null, short.token)).status, 403);
    assert.equal((await s.json('GET', '/api/admin/queue', null, long.token)).status, 200);
  } finally {
    await s.done();
  }
});

test('Café per QR: nur freigegebene Cafés, PIN-Regeln, neue PIN gilt, alte Sitzungen sind beendet', async () => {
  const s = await fresh();
  try {
    // Café ohne PIN anlegen (das Café wählt sie selbst) → noch nicht in der Anmeldeliste
    const place = await s.cafe();
    assert.equal(place.hasPin, false);
    assert.ok(!(await s.json('GET', '/api/partners')).data.some((p) => p.id === place.id), 'ohne PIN nicht in der Anmeldeliste');
    assert.equal((await s.json('POST', '/api/partner/login', { partnerId: place.id, pin: '000000' })).status, 401);
    // Nicht freigegeben / pausiert / kein Café → kein Code
    const pending = await s.cafe({ status: 'pending' });
    const paused = await s.cafe({ active: false });
    const feed = (await s.json('POST', '/api/admin/places', { type: 'feeding', name: 'Mama', lat: 40.985, lon: 29.027 }, s.A)).data;
    for (const id of [pending.id, paused.id, feed.id, 'pl_gibtsnicht', undefined]) {
      const r = await s.json('POST', '/api/admin/setup-codes', { purpose: 'partner', placeId: id }, s.A);
      assert.equal(r.status, 400, String(id));
      assert.equal(r.data.error, 'cafe_not_ready');
    }
    const c = await s.code('partner', { placeId: place.id });
    const info = await s.json('POST', '/api/setup/info', { code: c.code, purpose: 'partner' });
    assert.deepEqual(info.data.cafe, { id: place.id, name: place.name, address: '' });
    assert.equal(info.data.purpose, 'partner');
    // Ungültige PIN → 400, der Code bleibt gültig
    for (const pin of ['12345', '1234567890123', 'abcdef', '', null]) {
      const r = await s.json('POST', '/api/setup/partner', { code: c.code, pin });
      assert.equal(r.status, 400, String(pin));
      assert.equal(r.data.error, 'invalid_pin');
    }
    // Zu leichte PIN → 400 weak_pin, der Code bleibt gültig
    s.tick(5 * MIN);
    for (const pin of ['000000', '123456', '654321', '121212', '123123', '112233']) {
      const r = await s.json('POST', '/api/setup/partner', { code: c.code, pin });
      assert.deepEqual([r.status, r.data.error], [400, 'weak_pin'], pin);
    }
    assert.ok(!s.app.engine.ctx.store.places.get(place.id).pinHash, 'nichts gesetzt');
    assert.ok(!weakPin('246813') && !weakPin('97531086') && weakPin('12341234') && weakPin('9876543210'));
    s.tick(5 * MIN);
    // Café inzwischen pausiert → abgelehnt, Code bleibt; wieder aktiv → geht
    await s.json('POST', '/api/admin/places', { id: place.id, active: false }, s.A);
    assert.equal((await s.json('POST', '/api/setup/partner', { code: c.code, pin: '246813' })).data.error, 'cafe_not_ready');
    await s.json('POST', '/api/admin/places', { id: place.id, active: true }, s.A);
    // placeId im Body ist egal: der Code gehört zu genau einem Café
    const other = await s.cafe({ pin: '975310' });
    const ok = await s.json('POST', '/api/setup/partner', { code: c.code, pin: '246813', placeId: other.id, partnerId: other.id });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.partner.id, place.id);
    assert.equal((await s.json('POST', '/api/partner/login', { partnerId: other.id, pin: '975310' })).status, 200, 'anderes Café unverändert');
    assert.equal((await s.json('GET', '/api/partner/me', null, ok.data.token)).status, 200, 'gleich angemeldet');
    assert.ok((await s.json('GET', '/api/partners')).data.some((p) => p.id === place.id), 'jetzt mit PIN in der Liste');
    assert.equal((await s.json('GET', '/api/admin/places', null, s.A)).data.find((p) => p.id === place.id).hasPin, true);
    // Zweites Gerät meldet sich mit der PIN an; ein neuer Einrichtungs-QR (neue PIN) beendet alle alten Sitzungen
    const tablet = (await s.json('POST', '/api/partner/login', { partnerId: place.id, pin: '246813' })).data;
    s.tick(5 * MIN);
    const again = await s.code('partner', { placeId: place.id });
    const re = await s.json('POST', '/api/setup/partner', { code: again.code, pin: '97531086' });
    assert.equal(re.status, 201);
    assert.equal((await s.json('GET', '/api/partner/me', null, tablet.token)).status, 401, 'alte Sitzung beendet');
    assert.equal((await s.json('GET', '/api/partner/me', null, ok.data.token)).status, 401);
    assert.equal((await s.json('POST', '/api/partner/login', { partnerId: place.id, pin: '246813' })).status, 401, 'alte PIN gilt nicht mehr');
    assert.equal((await s.json('POST', '/api/partner/login', { partnerId: place.id, pin: '97531086' })).status, 200);
    // gespeichert ist nur der scrypt-Hash der PIN
    assert.match(s.app.engine.ctx.store.places.get(place.id).pinHash, /^scrypt\$/);
  } finally {
    await s.done();
  }
});

test('Freiwillige einladen: nur volunteer, Admin bleibt Admin, gesperrt abgelehnt, maxUses gilt', async () => {
  const s = await fresh();
  try {
    for (const bad of [0, 51, 2.5, 'viele', -1]) {
      const r = await s.json('POST', '/api/admin/setup-codes', { purpose: 'volunteer', maxUses: bad }, s.A);
      assert.equal(r.status, 400, String(bad));
    }
    assert.equal((await s.json('POST', '/api/admin/setup-codes', { purpose: 'admin', maxUses: 2 }, s.A)).status, 400, 'Admin-Codes nur einmal');
    assert.equal((await s.json('POST', '/api/admin/setup-codes', { purpose: 'superuser' }, s.A)).data.error, 'invalid_purpose');
    const v = await s.code('volunteer', { maxUses: 2 });
    assert.equal((await s.json('POST', '/api/invites/redeem', { code: v.code })).status, 401, 'nur mit Spielerkonto');
    const [a, b, c] = [await s.player('Ayse'), await s.player('Bora'), await s.player('Cem')];
    const boss = await s.player('Chefin');
    await s.json('POST', `/api/admin/players/${boss.player.id}/role`, { role: 'admin' }, s.A);
    const bad = await s.player('Gesperrt');
    await s.json('POST', `/api/admin/players/${bad.player.id}/ban`, { banned: true }, s.A);

    const ra = await s.json('POST', '/api/invites/redeem', { code: v.code }, a.token);
    assert.equal(ra.status, 200);
    assert.deepEqual([ra.data.role, ra.data.changed, ra.data.player.role], ['volunteer', true, 'volunteer']);
    // schon Freiwillige:r → nichts ändert sich, kein Gebrauch verbraucht
    const again = await s.json('POST', '/api/invites/redeem', { code: v.code }, a.token);
    assert.deepEqual([again.status, again.data.changed], [200, false]);
    // Moderation wird nie herabgestuft (und verbraucht keinen Gebrauch)
    const rb = await s.json('POST', '/api/invites/redeem', { code: v.code }, boss.token);
    assert.deepEqual([rb.status, rb.data.role, rb.data.changed], [200, 'admin', false]);
    assert.equal(s.app.engine.ctx.store.players.get(boss.player.id).role, 'admin');
    // gesperrt → 403, kein Gebrauch
    const rx = await s.json('POST', '/api/invites/redeem', { code: v.code }, bad.token);
    assert.deepEqual([rx.status, rx.data.error], [403, 'banned']);
    assert.equal(s.app.engine.ctx.store.players.get(bad.player.id).role, 'player');
    s.tick(5 * MIN);
    // zweiter echter Gebrauch, dann ist Schluss
    assert.equal((await s.json('POST', '/api/invites/redeem', { code: v.code }, b.token)).status, 200);
    const rc = await s.json('POST', '/api/invites/redeem', { code: v.code }, c.token);
    assert.deepEqual([rc.status, rc.data.error], [409, 'code_used']);
    assert.equal(s.app.engine.ctx.store.players.get(c.player.id).role, 'player');
    // eine Einladung macht nie zum Admin, egal was im Body steht
    s.tick(5 * MIN);
    const v2 = await s.code('volunteer');
    const sneaky = await s.json('POST', '/api/invites/redeem', { code: v2.code, role: 'admin' }, c.token);
    assert.equal(sneaky.data.role, 'volunteer');
    assert.equal(s.app.engine.ctx.store.players.get(c.player.id).role, 'volunteer');
  } finally {
    await s.done();
  }
});

test('Neustart: Codes und Admin-Sitzungen bleiben (Journal); CATME_PUBLIC_URL macht absolute Links', async () => {
  const s = await fresh({ publicUrl: 'https://kedi.example/' });
  const place = await s.cafe();
  const a = await s.code('admin');
  assert.equal(a.url, `https://kedi.example/admin.html#setup=${a.code}`);
  const p = await s.code('partner', { placeId: place.id });
  const v = await s.code('volunteer', { maxUses: 3 });
  const sess = (await s.json('POST', '/api/admin/sessions', {}, s.A)).data;
  await s.done(true); // Daten behalten
  const s2 = await fresh({ dataDir: s.dir });
  try {
    assert.equal((await s2.json('GET', '/api/admin/queue', null, sess.token)).status, 200, 'Sitzung nach Neustart gültig');
    assert.equal((await s2.json('POST', '/api/setup/admin', { code: a.code })).status, 201);
    assert.equal((await s2.json('POST', '/api/setup/partner', { code: p.code, pin: '864209' })).status, 201);
    const pl = await s2.player('NachNeustart');
    assert.equal((await s2.json('POST', '/api/invites/redeem', { code: v.code }, pl.token)).status, 200);
    assert.equal((await s2.json('GET', '/api/admin/setup-codes', null, s2.A)).data.find((x) => x.id === v.id).uses, 1);
  } finally {
    await s2.done();
  }
});

test('qr-kit: Restzeit ohne Nullen, Handy-Adresse ohne Fragment/fremde Query, leichte PINs', async () => {
  const { fmtLeft, phoneUrl, weakPin: wp } = await import('../public/js/qr-kit.js');
  const u = { d: 'gün', h: 'sa', min: 'dk' };
  assert.equal(fmtLeft(9 * MIN + 41000, u), '9:41');
  assert.equal(fmtLeft(7 * DAY, u), '7 gün', 'nicht „7 gün 0 sa“');
  assert.equal(fmtLeft(7 * DAY - 1000, u), '6 gün 23 sa');
  assert.equal(fmtLeft(3 * 3600000, u), '3 sa');
  assert.equal(fmtLeft(3 * 3600000 + 12 * MIN, u), '3 sa 12 dk');
  assert.equal(fmtLeft(-5, u), '0:00');
  const de = { d: (n) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`, h: 'Std', min: 'Min' };
  assert.equal(fmtLeft(7 * DAY, de), '7 Tage', 'ausgeschrieben, nicht „7 T“');
  assert.equal(fmtLeft(DAY + 2 * 3600000, de), '1 Tag 2 Std');
  assert.equal(phoneUrl('https://kedi.example/app.html?lang=de&token=x&ref=AB12#invite=abc'), 'https://kedi.example/app.html?lang=de&ref=AB12');
  assert.equal(phoneUrl('https://kedi.example/?ref=<script>'), 'https://kedi.example/');
  assert.equal(wp, weakPin, 'Browser und Server benutzen dieselbe Regel');
});

// ---------------------------------------------------------------- Texte

test('Texte: qrs.* in allen 6 Spielsprachen, Moderation/Café in tr/en/de, Startseite in 6 Sprachen', async () => {
  const langs = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
  const mods = {};
  for (const l of langs) mods[l] = (await import(`../public/js/lang/${l}.js`)).default;
  const keys = Object.keys(mods.en).filter((k) => k.startsWith('qrs.'));
  assert.ok(keys.length >= 9);
  const ph = (v) => [...new Set(String(v).match(/\{\w+\}/g) || [])].sort().join();
  const caps = (s) => /\b[A-ZÇĞİÖŞÜ]{5,}\b/.test(s);
  for (const l of langs) {
    for (const k of keys) {
      assert.ok(mods[l][k], `${l}: ${k} fehlt`);
      assert.equal(ph(mods[l][k]), ph(mods.en[k]), `${l}: ${k} Platzhalter`);
      assert.ok(!caps(mods[l][k]), `${l}: ${k} GANZ GROSS`);
      if (l === 'fa') assert.ok(!/[0-9]/.test(mods[l][k]), `fa: ${k} lateinische Ziffer`);
    }
    // neuer Block steht unter dem eigenen Anker, nach dem letzten bisherigen
    const src = fs.readFileSync(new URL(`../public/js/lang/${l}.js`, import.meta.url), 'utf8');
    assert.ok(src.indexOf('// ── Erweiterung: qr-setup ──') > src.indexOf('// ── Erweiterung: perf ──'), `${l}: Anker`);
  }
  // Moderation und Café-Ansicht: eigene Tabellen tr/en/de mit denselben Schlüsseln
  for (const file of ['admin.js', 'partner.js']) {
    const src = fs.readFileSync(new URL(`../public/js/${file}`, import.meta.url), 'utf8');
    const table = src.slice(src.indexOf('const T = {'), src.indexOf('\n};', src.indexOf('const T = {')));
    const block = (l) => {
      const i = table.indexOf(`\n  ${l}: {`);
      return table.slice(i, table.indexOf('\n  },', i));
    };
    const keyset = (l) => new Set([...block(l).matchAll(/(?:^|[\s{,])'?([\w.]+)'?: '/g)].map((m) => m[1]));
    const en = keyset('en');
    assert.ok(en.size > 20, file);
    for (const l of ['tr', 'de']) {
      const ks = keyset(l);
      for (const k of en) assert.ok(ks.has(k), `${file} ${l}: ${k} fehlt`);
    }
    for (const v of block('tr').match(/'[^'\n]*'/g)) assert.ok(!caps(v), `${file}: GANZ GROSS ${v}`);
  }
  const site = await import('../public/site/i18n.js');
  for (const l of site.LANGS) for (const k of ['phone.title', 'phone.lead', 'phone.close', 'phone.alt']) assert.ok(site.TEXT[l][k], `Startseite ${l}: ${k}`);
});

// ---------------------------------------------------------------- Browser

test('Browser: früher gespeicherter ADMIN_TOKEN wird gegen eine Sitzung getauscht; leichte PIN am Café-Handy abgelehnt', { timeout: 120000 }, async (t) => {
  let pw;
  let browser;
  try {
    pw = await loadPlaywright();
    browser = await pw.chromium.launch(launchOptions());
  } catch (e) {
    t.skip(`kein Browser: ${e.message}`);
    return;
  }
  const s = await fresh({ t0: Date.now() });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });
    // so hat die Moderation früher den Master-Token abgelegt (sessionStorage, Schlüssel catme.admin.token)
    await ctx.addInitScript((tok) => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        sessionStorage.setItem('catme.admin.token', tok);
      }
    }, s.A);
    const pg = await ctx.newPage();
    await pg.goto(`${s.base}/admin.html`);
    await pg.waitForSelector('[data-card="cafe"]');
    const st = await pg.evaluate(() => ({ legacy: sessionStorage.getItem('catme.admin.token'), tab: sessionStorage.getItem('catme.admin.tabSession'), local: localStorage.getItem('catme.admin.session') }));
    assert.equal(st.legacy, null, 'Master-Token aus dem Browser gelöscht');
    assert.ok(st.tab && st.tab !== s.A, 'stattdessen eine eigene Sitzung (nur dieser Tab)');
    assert.equal(st.local, null);
    const sess = s.app.engine.ctx.store.adminSessions.all();
    assert.equal(sess.length, 1);
    assert.equal(sess[0].expiresAt - sess[0].createdAt, SESSION_SHORT_MS, 'ohne „Gerät merken“: 12 Stunden');
    assert.equal(await pg.locator('.top .wordmark i').innerText(), 'Moderation');
    // Neu laden: weiter angemeldet, ohne Master-Token
    for (let i = 0; i < 7; i++) await s.code('volunteer'); // viele offene Codes → Liste klappt ab 6 zu
    await pg.reload();
    await pg.waitForSelector('[data-card="cafe"]');
    assert.equal(s.app.engine.ctx.store.adminSessions.count(), 1, 'keine zweite Sitzung beim Neuladen');
    await pg.waitForSelector('[data-codes] .more-list summary');
    assert.equal(await pg.locator('[data-codes] > ul > li').count(), 5);
    assert.match(await pg.locator('[data-codes] .more-list summary').innerText(), /Weitere 2 zeigen/);
    // „Neuer QR-Code“ auf der Admin-Karte: der alte, nicht benutzte Kopplungs-Code gilt nicht mehr
    await pg.click('[data-qr-admin] [data-qr-make]');
    await pg.waitForSelector('[data-qr-admin][data-code]');
    const first = await pg.getAttribute('[data-qr-admin]', 'data-code');
    await pg.click('[data-qr-admin] button.ghost[data-qr-make]');
    await pg.waitForFunction((id) => document.querySelector('[data-qr-admin]').dataset.code && document.querySelector('[data-qr-admin]').dataset.code !== id, first);
    for (let i = 0; i < 20 && !s.app.engine.ctx.store.setupCodes.get(first).revokedAt; i++) await new Promise((r) => setTimeout(r, 100));
    assert.ok(s.app.engine.ctx.store.setupCodes.get(first).revokedAt, 'alter Kopplungs-Code widerrufen');

    // Café-Handy: leichte PIN → verständlicher Hinweis, Code bleibt gültig; Tippflächen ≥ 44 px
    const place = await s.cafe();
    const c = await s.code('partner', { placeId: place.id });
    const cp = await (await browser.newContext({ viewport: { width: 320, height: 640 }, locale: 'tr-TR' })).newPage();
    await cp.goto(`${s.base}${c.path}`);
    await cp.waitForSelector('[data-setup]');
    for (const pin of ['123456', '000000']) {
      await cp.fill('[data-setup] input[name="pin"]', pin);
      await cp.fill('[data-setup] input[name="pin2"]', pin);
      await cp.click('[data-setup] button');
      await cp.waitForSelector('[data-setup] [data-err]:not([hidden])');
      assert.match(await cp.locator('[data-setup] [data-err]').innerText(), /çok kolay/);
    }
    assert.ok(!s.app.engine.ctx.store.places.get(place.id).pinHash);
    await cp.fill('[data-setup] input[name="pin"]', '582914');
    await cp.fill('[data-setup] input[name="pin2"]', '582914');
    await cp.click('[data-setup] button');
    await cp.waitForSelector('[data-a2hs]');
    const tiny = await cp.locator('.top .langs button, .a2hs .btn, .staff-card header .link').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
    assert.deepEqual(tiny, [], 'Café-Seite: Tippflächen ≥ 44 px');
    assert.equal(await cp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  } finally {
    await browser.close();
    await s.done();
  }
});

test('Browser: Café-QR → jsQR → Café-Handy setzt PIN; Einladung → Freiwillige:r; Admin-QR → zweites Gerät angemeldet', { timeout: 180000 }, async (t) => {
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-qrs-ui-'));
  const app = await createApp({ dataDir: dir, aiMode: 'mock', demo: false, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const errors = [];
  const watch = (pg, tag) => {
    pg.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    pg.on('console', (m) => {
      if (m.type() === 'error' && !/status of 40[134]/.test(m.text())) errors.push(`${tag}: ${m.text()}`);
    });
  };
  /** QR auf dem Bildschirm → echtes Bildschirmfoto → jsQR (wie eine Handykamera, nur schärfer). */
  async function readQr(pg, sel) {
    const el = pg.locator(sel).first();
    await el.waitFor();
    // Modal blendet ein (opacity) – erst fotografieren, wenn alle endlichen Animationen fertig sind
    await pg.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
    const box = await el.boundingBox();
    const png = await el.screenshot();
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
    const code = jsQR(new Uint8ClampedArray(Buffer.from(raw.b64, 'base64')), raw.w, raw.h);
    assert.ok(code, `${sel}: QR nicht lesbar`);
    return { text: code.data, size: box.width };
  }
  const phoneCtx = (extra = {}) => browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'tr-TR', ...extra });
  try {
    // Moderation am Handy (Token einmal eingeben, „Gerät merken“)
    const adminCtx = await phoneCtx({ permissions: ['geolocation'], geolocation: { latitude: 40.98652, longitude: 29.02733, accuracy: 9 } });
    const ad = await adminCtx.newPage();
    watch(ad, 'admin');
    await ad.goto(`${base}/admin.html`);
    assert.equal(await ad.getAttribute('html', 'lang'), 'tr', 'Sprache aus dem Browser (nicht mehr immer Deutsch)');
    await ad.fill('input[name="token"]', app.adminToken);
    await ad.check('input[name="remember"]');
    await ad.click('form button');
    await ad.waitForSelector('[data-card="cafe"]');
    const stored = await ad.evaluate(() => [localStorage.getItem('catme.admin.session'), sessionStorage.getItem('catme.admin.token')]);
    assert.ok(stored[0] && stored[0] !== app.adminToken, 'gemerkt wird eine eigene Sitzung, nie der ADMIN_TOKEN');
    assert.equal(stored[1], null);
    assert.equal(await ad.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'kein seitliches Scrollen');

    // Neues Café am Handy: Standort → speichern → Einrichtungs-QR erscheint sofort
    await ad.click('[data-new-cafe]');
    const form = ad.locator('form.place-form[data-place=""]');
    await form.locator('input[name="name"]').fill('Pati Kahve');
    await form.locator('[data-locate]').click();
    await ad.waitForFunction(() => document.querySelector('form.place-form[data-place=""] input[name="lat"]').value !== '');
    assert.equal(await form.locator('input[name="lat"]').inputValue(), '40.986520');
    assert.equal(await form.locator('input[name="lon"]').inputValue(), '29.027330');
    assert.match(await form.locator('[data-loc-out]').innerText(), /±9 m/);
    await form.locator('button.primary').click();
    await ad.waitForSelector('.qr-modal .qr-box svg');
    const cafeQr = await readQr(ad, '.qr-modal .qr-box');
    assert.ok(cafeQr.size >= 240, `QR groß genug (${cafeQr.size} px)`);
    assert.match(cafeQr.text, new RegExp(`^${base}/partner\\.html#setup=[A-Za-z0-9_-]{24}$`));
    const place = app.engine.ctx.store.places.all().find((p) => p.name === 'Pati Kahve');
    assert.ok(place && !place.pinHash, 'Café ohne PIN angelegt');
    assert.equal(await ad.locator('.qr-modal a[href^="print.html?cafe="]').getAttribute('href'), `print.html?cafe=${place.id}`);

    // Café-Handy (390 × 844): QR öffnen → Fragment ist sofort weg → PIN zweimal → angemeldet
    const cafeCtx = await phoneCtx({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
    const cp = await cafeCtx.newPage();
    watch(cp, 'cafe');
    await cp.goto(cafeQr.text);
    await cp.waitForSelector('[data-setup]');
    assert.equal(cp.url(), `${base}/partner.html`, 'Code nicht mehr in der Adresszeile');
    assert.match(await cp.locator('.setup-pin h1').innerText(), /Pati Kahve/);
    await cp.fill('[data-setup] input[name="pin"]', '482915');
    await cp.fill('[data-setup] input[name="pin2"]', '482910');
    await cp.click('[data-setup] button');
    await cp.waitForSelector('[data-setup] [data-err]:not([hidden])');
    assert.match(await cp.locator('[data-setup] [data-err]').innerText(), /aynı değil/);
    await cp.fill('[data-setup] input[name="pin2"]', '482915');
    await cp.click('[data-setup] button');
    await cp.waitForSelector('[data-a2hs]');
    assert.match(await cp.locator('[data-a2hs]').innerText(), /Ana Ekrana Ekle/, 'iPhone-Hinweis');
    await cp.waitForSelector('.kit-qr svg');
    assert.match(await cp.locator('.staff-card h1').first().innerText(), /Pati Kahve/);
    assert.ok(app.engine.ctx.store.places.get(place.id).pinHash, 'PIN gesetzt');
    // Moderation sieht „benutzt“
    await ad.waitForSelector('.qr-modal .qr-state.ok', { timeout: 15000 });
    await ad.click('.qr-modal .modal-x');

    // Freiwillige einladen (5 Personen) → neues Handy → Onboarding mit Hinweis → nach dem Spitznamen Freiwillige:r
    await ad.click('[data-tab="setup"]');
    await ad.waitForSelector('[data-card="volunteer"]');
    await ad.click('[data-card="volunteer"] .uses-pick label:nth-of-type(2)');
    await ad.click('[data-qr-vol] [data-qr-make]');
    await ad.waitForSelector('[data-qr-vol] .qr-box svg');
    const inv = await readQr(ad, '[data-qr-vol] .qr-box');
    assert.match(inv.text, new RegExp(`^${base}/app\\.html#invite=[A-Za-z0-9_-]{24}$`));
    assert.match(await ad.locator('[data-qr-vol] [data-qr-uses]').innerText(), /5/);
    const volCtx = await phoneCtx();
    const vp = await volCtx.newPage();
    watch(vp, 'volunteer');
    await vp.goto(inv.text);
    await vp.waitForSelector('[data-invite-note]');
    assert.equal(vp.url(), `${base}/app.html#/`, 'Einladungscode nicht mehr in der Adresszeile');
    await vp.fill('#nick', 'GonulluAyse');
    await vp.click('.onb-form button');
    await vp.waitForSelector('.toast.success');
    assert.match(await vp.locator('.toast.success').innerText(), /gönüllüsün/);
    const vol = app.engine.ctx.store.players.all().find((p) => p.nickname === 'GonulluAyse');
    assert.equal(vol.role, 'volunteer');
    assert.equal(await vp.evaluate(() => sessionStorage.getItem('catme.invite')), null, 'Code nach dem Einlösen vergessen');
    await vp.goto(`${base}/app.html#/profile`);
    await vp.waitForSelector('.profile-head .chip');
    assert.match(await vp.locator('.profile-head .chip').innerText(), /Gönüllü/);

    // Admin-QR → zweites Gerät ist angemeldet („Mit Handy verbunden“)
    await ad.click('[data-tab="setup"]');
    await ad.waitForSelector('[data-qr-admin] [data-qr-make]');
    await ad.click('[data-qr-admin] [data-qr-make]');
    await ad.waitForSelector('[data-qr-admin] .qr-box svg');
    const pair = await readQr(ad, '[data-qr-admin] .qr-box');
    assert.match(pair.text, new RegExp(`^${base}/admin\\.html#setup=[A-Za-z0-9_-]{24}$`));
    assert.ok(!pair.text.includes(app.adminToken), 'nie der ADMIN_TOKEN im QR');
    const ad2Ctx = await phoneCtx({ locale: 'en-US' });
    const ad2 = await ad2Ctx.newPage();
    watch(ad2, 'admin2');
    await ad2.goto(pair.text);
    await ad2.waitForSelector('[data-paired]');
    assert.equal(ad2.url(), `${base}/admin.html`);
    assert.match(await ad2.locator('[data-paired]').innerText(), /Phone connected/);
    await ad2.waitForSelector('#devices .devices li');
    assert.equal(await ad2.locator('#devices .devices li').count(), 2, 'zwei Geräte: Token-Login + gekoppeltes Handy');
    // Derselbe QR ein zweites Mal → Hinweis, Token-Feld bleibt
    const ad3 = await (await phoneCtx({ locale: 'en-US' })).newPage();
    await ad3.goto(pair.text);
    await ad3.waitForSelector('.login-card .err');
    assert.match(await ad3.locator('.login-card .err').innerText(), /does not work any more/);
    assert.ok(await ad3.locator('input[name="token"]').isVisible());
    // Moderations-Hub auch bei 320 × 640 ohne seitliches Scrollen, QR ≥ 240 px
    await ad2.setViewportSize({ width: 320, height: 640 });
    await ad2.click('[data-qr-cafe] [data-qr-make]');
    await ad2.waitForSelector('[data-qr-cafe] .qr-box svg');
    const small = await readQr(ad2, '[data-qr-cafe] .qr-box');
    assert.ok(small.size >= 240, `320 px: QR ${small.size} px`);
    assert.equal(await ad2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    const tiny = await ad2.locator('.admin-tabs button, .uses-pick span, .btn').evaluateAll((els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
    assert.deepEqual(tiny, [], 'Tippflächen ≥ 44 px');

    // Desktop: Startseite und Spiel zeigen „Auf dem Handy spielen“ (ohne Fragment/fremde Query)
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
    const lp = await desk.newPage();
    watch(lp, 'landing');
    await lp.goto(`${base}/?lang=de&utm_source=x&ref=ZZZZZZ#how`);
    await lp.waitForSelector('[data-phone-card] svg');
    const land = await readQr(lp, '.phone-qr');
    assert.equal(land.text, `${base}/?lang=de&ref=ZZZZZZ`);
    assert.match(await lp.locator('.phone-t').innerText(), /Auf dem Handy spielen/);
    await lp.click('.phone-x');
    await lp.reload();
    await lp.waitForTimeout(1500);
    assert.equal(await lp.locator('[data-phone-card]').count(), 0, 'geschlossen bleibt geschlossen');
    const narrow = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await narrow.goto(`${base}/`);
    await narrow.waitForTimeout(1500);
    assert.equal(await narrow.locator('[data-phone-card]').count(), 0, 'am Handy keine Karte');
    // Moderation am Desktop: „Am Handy öffnen“ erzeugt einen Kopplungs-Code
    const dp = await desk.newPage();
    watch(dp, 'admin-desk');
    await dp.goto(`${base}/admin.html`);
    await dp.fill('input[name="token"]', app.adminToken);
    await dp.click('form button');
    await dp.click('[data-open-phone]');
    await dp.waitForSelector('.qr-modal .qr-box svg');
    assert.match((await readQr(dp, '.qr-modal .qr-box')).text, /\/admin\.html#setup=[A-Za-z0-9_-]{24}$/);

    assert.deepEqual(errors, [], 'keine Fehler in der Konsole');
  } finally {
    await browser.close();
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
