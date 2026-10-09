// Phone pairing (2.3): server/pairing.js (codes, devices, persistence) and the routes in server/api-pairing.js
// (pairing page, POST /api/pair, /api/pairing, /api/devices, /api/setup), LAN address ranking.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createPairing, cookieHeader, clearCookieHeader, shortDeviceName, cleanName, MAX_GLOBAL_FAILURES } = require('../server/pairing');
const { rankLanAddresses, lanState, pairingLinks, detectDefaultRouteIp } = require('../server/api-pairing');
const { startServer, api } = require('./helpers/server');

const MIN = 60 * 1000;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-pairing-'));
}

function clock(start = 1_700_000_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => (t += ms);
  return now;
}

/** Raw request (explicit headers, no redirect following). */
function raw(base, p, { method = 'GET', headers = {}, body = null } = {}) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: u.hostname, port: u.port, path: p, method, headers: { ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (text += c));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {
          /* not json */
        }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const pairPost = (base, payload, headers = {}) => raw(base, '/api/pair', { method: 'POST', headers: { origin: base, ...headers }, body: JSON.stringify(payload) });

// ---------------------------------------------------------------- unit: pairing store

test('create: 6-digit code + url-safe secret, valid 10 minutes; redeem by secret mints a device cookie', () => {
  const now = clock();
  const p = createPairing({ now });
  const c = p.create();
  assert.match(c.code, /^\d{6}$/);
  assert.match(c.secret, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(c.expiresAt - c.createdAt, 10 * MIN);
  const r = p.redeem({ secret: c.secret, userAgent: IPHONE, via: 'lan' });
  assert.equal(r.ok, true);
  assert.equal(r.device.name, 'iPhone · Safari');
  assert.equal(r.device.via, 'lan');
  assert.match(r.cookieValue, /^[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/);
  const d = p.deviceFromCookie(r.cookieValue);
  assert.equal(d.id, r.device.id);
  assert.equal(p.deviceFromRequest({ headers: { cookie: `a=1; livefx_dev=${r.cookieValue}; b=2` } }).id, r.device.id);
  assert.equal(p.deviceFromCookie(`${r.device.id}.${'x'.repeat(43)}`), null, 'wrong secret');
  assert.equal(p.deviceFromCookie('garbage'), null);
  assert.equal(p.deviceFromRequest({ headers: {} }), null);
});

test('single use, expiry after 10 minutes, typed 6-digit code, wrong input', () => {
  const now = clock();
  const p = createPairing({ now });
  const a = p.create();
  assert.equal(p.redeem({ secret: a.secret }).ok, true);
  assert.deepEqual(p.redeem({ secret: a.secret }), { ok: false, reason: 'used' }, 'single use');
  const b = p.create();
  now.advance(10 * MIN + 1);
  assert.deepEqual(p.redeem({ secret: b.secret }), { ok: false, reason: 'expired' });
  now.advance(20 * MIN);
  assert.deepEqual(p.redeem({ secret: b.secret }), { ok: false, reason: 'invalid' }, 'forgotten after a while');
  const c = p.create();
  const typed = p.redeem({ code: ` ${c.code} `, userAgent: ANDROID });
  assert.equal(typed.ok, true, 'typed code');
  assert.equal(typed.device.name, 'Android · Chrome');
  assert.equal(p.redeem({ code: c.code }).reason, 'used');
  assert.equal(p.redeem({ code: '12345' }).reason, 'invalid');
  assert.equal(p.redeem({}).reason, 'invalid');
  assert.equal(p.redeem({ secret: 'short' }).reason, 'invalid');
});

test(`brute force: ${MAX_GLOBAL_FAILURES} wrong attempts burn every open code`, () => {
  const p = createPairing({ now: clock() });
  const c = p.create();
  const c2 = p.create();
  assert.equal(p.openCount, 2);
  let wrong = 0;
  while ([c.code, c2.code].includes(String(wrong).padStart(6, '0'))) wrong++;
  let last;
  for (let i = 0; i < MAX_GLOBAL_FAILURES; i++) last = p.redeem({ code: String(wrong).padStart(6, '0') });
  assert.equal(last.reason, 'locked');
  assert.equal(p.openCount, 0, 'open codes burnt');
  assert.equal(p.redeem({ secret: c.secret }).reason, 'invalid', 'the real code is gone too – a new QR is one click');
});

test('current(): reuses the open code while it has time left, else a new one; consumed codes are replaced', () => {
  const now = clock();
  const p = createPairing({ now });
  const a = p.current();
  assert.equal(p.current().secret, a.secret, 'same QR while polling');
  now.advance(7 * MIN);
  assert.equal(p.current().secret, a.secret, '3 minutes left: still the same');
  now.advance(1 * MIN + 1);
  const b = p.current();
  assert.notEqual(b.secret, a.secret, 'less than 2 minutes left: fresh code');
  assert.equal(p.redeem({ secret: b.secret }).ok, true);
  assert.notEqual(p.current().secret, b.secret, 'used code is never shown again');
});

test('devices: re-pairing with a valid cookie keeps the device; revoke / revokeAll; events; 180-day expiry; cap', () => {
  const now = clock();
  const events = [];
  const p = createPairing({ now, maxDevices: 3 });
  p.onChange((e) => events.push(e.event));
  const first = p.redeem({ secret: p.create().secret, userAgent: IPHONE });
  const again = p.redeem({ secret: p.create().secret, userAgent: IPHONE, existing: p.deviceFromCookie(first.cookieValue) });
  assert.equal(again.ok, true);
  assert.equal(again.again, true);
  assert.equal(again.cookieValue, null, 'no new cookie');
  assert.equal(p.listDevices().length, 1);
  assert.equal(p.listDevices(first.device.id)[0].current, true);
  assert.equal(p.revoke(first.device.id), true);
  assert.equal(p.revoke(first.device.id), false);
  assert.equal(p.deviceFromCookie(first.cookieValue), null, 'revoked cookie is dead');
  assert.deepEqual(events, ['paired', 'paired', 'revoked']);

  const cookies = [];
  for (let i = 0; i < 4; i++) {
    now.advance(1000);
    cookies.push(p.mintDevice({ userAgent: ANDROID }).cookieValue);
  }
  assert.equal(p.deviceCount, 3, 'capped, the least recently used one goes');
  assert.equal(p.deviceFromCookie(cookies[0]), null);
  assert.ok(p.deviceFromCookie(cookies[3]));
  const kept = p.deviceFromCookie(cookies[3]);
  now.advance(10 * 1000);
  p.touch(kept);
  now.advance(180 * 24 * 60 * MIN - 5000);
  assert.ok(p.deviceFromCookie(cookies[3]), 'used recently: still valid');
  assert.equal(p.deviceFromCookie(cookies[1]), null, 'unused for 180 days: expired');
  assert.equal(p.listDevices().length, 1, 'listing prunes the other expired device');
  assert.equal(p.revokeAll(), 1);
  assert.equal(p.deviceCount, 0);
});

test('persistence: devices.json keeps only hashes (0600), survives a restart, a broken file is moved aside', () => {
  const dir = tmpDir();
  try {
    const p = createPairing({ dataDir: dir });
    const r = p.redeem({ secret: p.create().secret, userAgent: IPHONE, name: '  Studio <b>Handy</b>  ' });
    assert.equal(r.device.name, 'Studio bHandy/b', 'cleaned name');
    const file = path.join(dir, 'devices.json');
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes(r.cookieValue.split('.')[1]), 'the cookie secret is not stored');
    assert.match(text, /"hash": "[a-f0-9]{64}"/);
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    const p2 = createPairing({ dataDir: dir });
    assert.equal(p2.deviceFromCookie(r.cookieValue).name, 'Studio bHandy/b', 'device known after a restart');
    fs.writeFileSync(file, '{ kaputt');
    const logs = [];
    const p3 = createPairing({ dataDir: dir, log: (m) => logs.push(m) });
    assert.equal(p3.deviceCount, 0);
    assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('devices.json.broken-')), 'broken file kept for inspection');
    assert.ok(logs.some((m) => /beschädigt/.test(m)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('cookie flags, device names, name cleaning', () => {
  assert.equal(cookieHeader('abc.def'), 'livefx_dev=abc.def; HttpOnly; SameSite=Lax; Path=/; Max-Age=15552000');
  assert.equal(cookieHeader('abc.def', { secure: true }), 'livefx_dev=abc.def; HttpOnly; SameSite=Lax; Path=/; Max-Age=15552000; Secure');
  assert.equal(clearCookieHeader(), 'livefx_dev=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  assert.equal(shortDeviceName(IPHONE), 'iPhone · Safari');
  assert.equal(shortDeviceName(ANDROID), 'Android · Chrome');
  assert.equal(shortDeviceName('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) CriOS/120.0 Mobile/15E148 Safari/604.1'), 'iPad · Chrome');
  assert.equal(shortDeviceName('Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36'), 'Android · Samsung Internet');
  assert.equal(shortDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0'), 'Windows-PC · Edge');
  assert.equal(shortDeviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5; rv:130.0) Gecko/20100101 Firefox/130.0'), 'Mac · Firefox');
  assert.equal(shortDeviceName(''), 'Gerät');
  assert.equal(cleanName('a\u0000b\nc  d'), 'ab c d');
  assert.equal(cleanName('x'.repeat(80)).length, 40);
  assert.equal(cleanName(42), '');
});

// ---------------------------------------------------------------- unit: LAN addresses

test('rankLanAddresses: default route first, then 192.168 / 10.x; WSL, Hyper-V, Docker, VPN last; no loopback / link-local', () => {
  const ifaces = {
    'vEthernet (WSL)': [{ family: 'IPv4', address: '172.22.80.1', internal: false }],
    'VirtualBox Host-Only Network': [{ family: 'IPv4', address: '192.168.56.1', internal: false }],
    'WLAN': [{ family: 'IPv4', address: '192.168.178.23', internal: false }, { family: 'IPv6', address: 'fe80::1', internal: false }],
    'Ethernet 2': [{ family: 'IPv4', address: '10.0.0.7', internal: false }],
    tailscale0: [{ family: 'IPv4', address: '100.101.102.103', internal: false }],
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    eth9: [{ family: 'IPv4', address: '169.254.10.20', internal: false }],
    docker0: [{ family: 4, address: '172.17.0.1', internal: false }],
  };
  const ranked = rankLanAddresses(ifaces).map((a) => a.address);
  assert.deepEqual(ranked.slice(0, 2), ['192.168.178.23', '10.0.0.7']);
  assert.ok(!ranked.includes('127.0.0.1') && !ranked.includes('169.254.10.20') && !ranked.includes('fe80::1'));
  for (const v of ['172.22.80.1', '192.168.56.1', '172.17.0.1']) assert.ok(ranked.indexOf(v) > ranked.indexOf('100.101.102.103') || ranked.indexOf(v) > 1, `${v} ranked low`);
  assert.deepEqual(rankLanAddresses(ifaces, '10.0.0.7')[0], { address: '10.0.0.7', iface: 'Ethernet 2' }, 'default route wins');
  assert.deepEqual(rankLanAddresses({}), []);
});

test('lanState / pairingLinks: bind address decides, tunnel base wins when online', async () => {
  const code = { code: '123456', secret: 'S'.repeat(22), expiresAt: Date.now() + 600000, ttlMs: 600000 };
  const ifaces = () => ({ wlan0: [{ family: 'IPv4', address: '192.168.1.20', internal: false }] });
  const local = { config: { boundAddress: '127.0.0.1', port: 8787 }, networkInterfaces: ifaces };
  assert.equal(lanState(local).listening, false);
  assert.equal(pairingLinks(local, code).url, null);
  assert.equal(pairingLinks(local, code).reason, 'local_only');
  const lan = { config: { boundAddress: '0.0.0.0', port: 8787 }, networkInterfaces: ifaces };
  const l = pairingLinks(lan, code);
  assert.equal(l.url, `http://192.168.1.20:8787/p#${'S'.repeat(22)}`);
  assert.equal(l.lanUrl, l.url);
  assert.equal(l.cameraUrl, `http://192.168.1.20:8787/p?next=camera#${'S'.repeat(22)}`);
  assert.equal(l.manualUrl, 'http://192.168.1.20:8787/p');
  assert.equal(l.via, 'lan');
  assert.equal(pairingLinks(lan, code, { next: 'panel' }).url, `http://192.168.1.20:8787/p?next=panel#${'S'.repeat(22)}`);
  assert.equal(pairingLinks(lan, code, { next: 'evil' }).url, l.url, 'unknown next → phone remote');
  const fixed = { config: { boundAddress: '10.1.2.3', port: 9000, secure: true }, networkInterfaces: ifaces };
  assert.equal(pairingLinks(fixed, code).url, `https://10.1.2.3:9000/p#${'S'.repeat(22)}`, 'explicit HOST + TLS');
  const tunnel = { ...lan, tunnel: { status: () => ({ status: 'online', url: 'https://brave-cat.trycloudflare.com' }) } };
  const t = pairingLinks(tunnel, code);
  assert.equal(t.url, `https://brave-cat.trycloudflare.com/p#${'S'.repeat(22)}`);
  assert.equal(t.lanUrl, l.url);
  assert.equal(t.via, 'tunnel');
  const ip = await detectDefaultRouteIp({ timeoutMs: 300 });
  assert.ok(ip === null || /^\d+\.\d+\.\d+\.\d+$/.test(ip), String(ip));
});

// ---------------------------------------------------------------- server routes (loopback)

test('routes: pairing page, POST /api/pair (cookie, single use, same-origin, 10/min), /api/pairing, /api/devices, /api/setup', async (t) => {
  const server = await startServer({ env: { HOST: '0.0.0.0' } });
  t.after(() => server.stop());
  const { base, token } = server;

  await t.test('GET /p: inline page reads the fragment, nonce CSP, no-store, no referrer', async () => {
    const r = await raw(base, '/p?next=camera');
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /text\/html/);
    assert.equal(r.headers['cache-control'], 'no-store');
    assert.equal(r.headers['referrer-policy'], 'no-referrer');
    const csp = r.headers['content-security-policy'];
    const nonce = /script-src 'nonce-([^']+)'/.exec(csp)[1];
    assert.ok(r.text.includes(`<script nonce="${nonce}">`), 'inline script carries the nonce');
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /connect-src 'self'/);
    assert.match(r.text, /location\.hash/);
    assert.match(r.text, /history\.replaceState/, 'secret removed from the address bar');
    assert.match(r.text, /addEventListener\('hashchange'/, 'a QR link opened on an already open /p page still pairs');
    assert.match(r.text, /fetch\('\/api\/pair'/);
    assert.match(r.text, /data-next="\/camera\.html"/);
    assert.match(r.text, /inputmode="numeric"/);
    for (const w of ['Handy koppeln', 'Telefonu eşleştir', 'Pair your phone']) assert.ok(r.text.includes(w), w);
    assert.ok(!r.text.includes(token), 'no token in the page');
    assert.equal((await raw(base, '/p/')).status, 200);
    assert.equal((await raw(base, '/p', { method: 'HEAD' })).status, 200);
  });

  await t.test('POST /api/pairing needs auth and returns a fresh pairing; /api/setup has the full shape', async () => {
    assert.equal((await api(base, 'POST', '/api/pairing')).status, 401);
    const created = await api(base, 'POST', '/api/pairing', { token, json: { next: 'camera' } });
    assert.equal(created.status, 200, created.text);
    assert.match(created.json.pairing.code, /^\d{6}$/);
    const s = await api(base, 'GET', '/api/setup', { token });
    assert.equal(s.status, 200, s.text);
    const d = s.json;
    for (const k of ['ok', 'version', 'panelUrl', 'lanUrls', 'bestLanUrl', 'overlayUrls', 'cameraUrl', 'tunnel', 'pairing', 'devices', 'lan', 'secure']) assert.ok(k in d, `setup.${k}`);
    assert.equal(d.version, require('../package.json').version);
    assert.equal(d.panelUrl, `${base}/`);
    assert.deepEqual(Object.keys(d.tunnel).sort(), ['error', 'pairingUrl', 'state', 'url']);
    assert.equal(d.tunnel.state, 'idle');
    assert.equal(d.overlayUrls.local, `${base}/overlay.html`);
    assert.equal(d.overlayUrls.localPortrait, `${base}/overlay.html?layout=portrait`);
    assert.match(d.overlayUrls.key, /^[A-Za-z0-9]{20}$/);
    assert.ok(Array.isArray(d.devices));
    assert.equal(d.lan.listening, true);
    assert.equal(d.lan.port, Number(new URL(base).port));
    assert.match(d.pairing.expiresAt, /^\d{4}-\d\d-\d\dT/);
    assert.match(d.pairing.code, /^\d{6}$/);
    if (d.bestLanUrl) {
      assert.equal(d.lanUrls[0], d.bestLanUrl);
      assert.match(d.bestLanUrl, /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/$/);
      assert.ok(d.pairing.url.startsWith(`${d.bestLanUrl}p#`), d.pairing.url);
      assert.equal(d.overlayUrls.lan, `${d.bestLanUrl}overlay.html?key=${d.overlayUrls.key}`);
    }
    const again = await api(base, 'GET', '/api/setup', { token });
    assert.equal(again.json.pairing.code, d.pairing.code, 'polling keeps the same code');
    const fresh = await api(base, 'GET', '/api/setup?new=1', { token });
    assert.notEqual(fresh.json.pairing.expiresAt + fresh.json.pairing.code, d.pairing.expiresAt + d.pairing.code, '?new=1 creates one');
    const ownSetup = await api(base, 'GET', '/api/setup', { headers: { 'sec-fetch-site': 'same-origin' } });
    assert.equal(ownSetup.status, 200, 'the panel on this PC (same-origin) may read it');
  });

  await t.test('redeem: secret → 200 + device cookie, again → 400 used; cross-origin → 403; code works', async () => {
    const code = (await api(base, 'POST', '/api/pairing', { token })).json.pairing.code;
    const second = (await api(base, 'POST', '/api/pairing', { token })).json.pairing;
    const sec = second.url ? second.url.split('#')[1] : null; // null only on a machine without any LAN address
    assert.equal((await raw(base, '/api/pair', { method: 'POST', body: JSON.stringify({ code }) })).status, 403, 'no Origin');
    assert.equal((await raw(base, '/api/pair', { method: 'POST', headers: { origin: 'http://evil.example' }, body: JSON.stringify({ code }) })).status, 403);
    const ok = await pairPost(base, { code, name: 'Studio-Handy' }, { 'user-agent': IPHONE });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.json.device.name, 'Studio-Handy');
    assert.equal(ok.json.redirect, '/mobile.html');
    assert.match(ok.headers['set-cookie'][0], /^livefx_dev=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; HttpOnly; SameSite=Lax; Path=\/; Max-Age=15552000$/);
    const used = await pairPost(base, { code });
    assert.equal(used.status, 400);
    assert.equal(used.json.error, 'used');
    if (sec) {
      const bySecret = await pairPost(base, { secret: sec, next: 'camera' }, { 'user-agent': ANDROID });
      assert.equal(bySecret.status, 200, bySecret.text);
      assert.equal(bySecret.json.redirect, '/camera.html');
      assert.equal(bySecret.json.device.name, 'Android · Chrome');
    }
    const wrong = await pairPost(base, { code: '000000' === code ? '000001' : '000000' });
    assert.ok([400, 429].includes(wrong.status));
    const devices = await api(base, 'GET', '/api/devices', { token });
    assert.ok(devices.json.devices.some((x) => x.name === 'Studio-Handy'));
  });

  await t.test('10 attempts per minute and address → 429', async () => {
    let status = 0;
    for (let i = 0; i < 12 && status !== 429; i++) status = (await pairPost(base, { code: '999999' })).status;
    assert.equal(status, 429);
    const r = await pairPost(base, { code: '999999' });
    assert.equal(r.json.error, 'rate_limited');
  });

  await t.test('/api/devices: list, revoke one (404 when unknown), ?id=, revoke all needs ?all=1', async () => {
    assert.equal((await api(base, 'GET', '/api/devices')).status, 401);
    const list = (await api(base, 'GET', '/api/devices', { token })).json.devices;
    assert.ok(list.length >= 1);
    for (const d of list) assert.deepEqual(Object.keys(d).sort(), ['createdAt', 'current', 'id', 'lastSeen', 'name', 'via']);
    const del = await api(base, 'DELETE', `/api/devices/${encodeURIComponent(list[0].id)}`, { token });
    assert.equal(del.status, 200);
    assert.equal(del.json.revoked, list[0].id);
    assert.equal((await api(base, 'DELETE', `/api/devices/${encodeURIComponent(list[0].id)}`, { token })).status, 404);
    assert.equal((await api(base, 'DELETE', '/api/devices?id=nope', { token })).status, 404, 'unknown id never means "all"');
    assert.equal((await api(base, 'DELETE', '/api/devices', { token })).status, 400);
    const all = await api(base, 'DELETE', '/api/devices?all=1', { token });
    assert.equal(all.status, 200);
    assert.equal((await api(base, 'GET', '/api/devices', { token })).json.devices.length, 0);
  });
});

test('/api/setup with --local (HOST=127.0.0.1): no LAN, no pairing link, reason local_only', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const s = await api(server.base, 'GET', '/api/setup', { token: server.token });
  assert.equal(s.status, 200);
  assert.equal(s.json.lan.listening, false);
  assert.deepEqual(s.json.lanUrls, []);
  assert.equal(s.json.bestLanUrl, null);
  assert.equal(s.json.pairing.url, null);
  assert.equal(s.json.pairing.reason, 'local_only');
  assert.equal(s.json.overlayUrls.lan, null);
  assert.match(server.logs().out, /Handy: aus/);
});
