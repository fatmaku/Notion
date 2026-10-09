// 2.3 LAN by default: requests that are not from this PC (WLAN devices, the internet tunnel) need a paired-device
// cookie or a Bearer; the overlay on another PC uses the read-only overlay key; loopback behaviour is unchanged.
// Unit tests run against fake requests; the integration part connects through this machine's LAN address so the
// server really sees a non-loopback socket (skipped when the machine has no LAN address).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const auth = require('../server/auth');
const { createPairing } = require('../server/pairing');
const { rankLanAddresses } = require('../server/api-pairing');
const { startServer, api } = require('./helpers/server');

const TOKEN = 'abcdef0123456789abcdef0123456789';
const KEY = auth.overlayKeyFor(TOKEN);

function fakeReq(url, { method = 'GET', headers = {}, remote = '192.168.1.50' } = {}) {
  return { url, method, headers: { host: '192.168.1.20:8787', ...headers }, socket: { remoteAddress: remote } };
}

function setup() {
  const pairing = createPairing();
  const { cookieValue } = pairing.mintDevice({ userAgent: 'iPhone Safari/1' });
  return { ctx: { token: TOKEN, pairing, overlayKey: KEY }, cookie: `livefx_dev=${cookieValue}` };
}

test('decide(): unpaired WLAN device reaches only the pairing page, public static code and /health', () => {
  const { ctx } = setup();
  const d = (url, opts) => auth.decide(fakeReq(url, opts), ctx);
  for (const p of ['/p', '/p/', '/p?next=camera', '/m?token=x', '/health', '/favicon.ico', '/manifest.webmanifest', '/sw.js', '/js/bus.js', '/css/mobile.css', '/icons/icon.svg', '/memes/index.json', '/docs/START.md']) {
    assert.equal(d(p).action, 'pass', p);
    assert.equal(d(p).level, 'open', p);
  }
  assert.equal(d('/api/pair', { method: 'POST' }).action, 'pass', 'POST /api/pair is open');
  assert.deepEqual(d('/'), { action: 'redirect', location: '/p?next=panel' });
  assert.deepEqual(d('/index.html'), { action: 'redirect', location: '/p?next=panel' });
  assert.deepEqual(d('/mobile.html'), { action: 'redirect', location: '/p' });
  assert.deepEqual(d('/camera.html'), { action: 'redirect', location: '/p?next=camera' });
  assert.deepEqual(d('/', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 Safari/604.1' } }), { action: 'redirect', location: '/p' }, 'a phone gets the remote after pairing');
  assert.deepEqual(d('/', { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129.0 Mobile Safari/537.36' } }), { action: 'redirect', location: '/p' });
  for (const p of ['/api/triggers', '/api/config', '/api/assets', '/api/gifs/status', '/api/smart', '/api/setup', '/events', '/events?role=panel', '/assets/x.png']) {
    const r = d(p);
    assert.equal(r.action, 'deny', p);
    assert.equal(r.status, 401, p);
    assert.equal(r.code, 'pairing_required', p);
    assert.match(r.message, /nicht gekoppelt/);
  }
  for (const [p, m] of [['/fire', 'POST'], ['/api/fire', 'POST'], ['/api/triggers', 'PUT'], ['/m', 'POST'], ['/p', 'POST'], ['/api/tunnel/start', 'POST']]) assert.equal(d(p, { method: m }).action, 'deny', `${m} ${p}`);
  const ov = d('/overlay.html');
  assert.equal(ov.action, 'deny');
  assert.equal(ov.code, 'overlay_key');
  assert.equal(ov.html, true);
});

test('decide(): paired device / Bearer / legacy cookie = full access; loopback unchanged; tunnel is never local', () => {
  const { ctx, cookie } = setup();
  const full = auth.decide(fakeReq('/api/triggers', { headers: { cookie } }), ctx);
  assert.equal(full.action, 'pass');
  assert.equal(full.level, 'full');
  assert.ok(full.device && full.device.id);
  assert.equal(auth.decide(fakeReq('/', { headers: { cookie: 'livefx_dev=forged.aaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }), ctx).action, 'redirect');
  assert.equal(auth.decide(fakeReq('/api/fire', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } }), ctx).level, 'full');
  assert.equal(auth.decide(fakeReq('/api/fire', { method: 'POST', headers: { authorization: 'Bearer nope' } }), ctx).action, 'deny');
  assert.equal(auth.decide(fakeReq('/events?role=panel', { headers: { cookie: `livefx=${TOKEN}` } }), ctx).level, 'full', 'legacy panel cookie still works');
  for (const ra of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) assert.equal(auth.decide(fakeReq('/api/triggers', { remote: ra, headers: { host: '127.0.0.1:8787' } }), ctx).level, 'local', ra);
  const viaCf = auth.decide(fakeReq('/api/triggers', { remote: '127.0.0.1', headers: { host: '127.0.0.1:8787', 'cf-connecting-ip': '203.0.113.5' } }), ctx);
  assert.equal(viaCf.action, 'deny');
  assert.equal(viaCf.code, 'tunnel_login');
  assert.equal(auth.decide(fakeReq('/', { remote: '127.0.0.1', headers: { host: 'x-y.trycloudflare.com' } }), ctx).action, 'redirect');
  assert.equal(auth.isLocal(fakeReq('/', { remote: '127.0.0.1', headers: { host: 'x-y.trycloudflare.com' } })), false);
});

test('decide(): overlay key (query or cookie) opens only overlay page, overlay events and uploaded assets', () => {
  const { ctx } = setup();
  assert.match(KEY, /^[A-Za-z0-9]{20}$/);
  assert.equal(auth.overlayKeyFor(TOKEN), KEY, 'stable for one token');
  assert.notEqual(auth.overlayKeyFor('another-token-123'), KEY, 'rotates with the token');
  const q = auth.decide(fakeReq(`/overlay.html?layout=portrait&key=${KEY}`), ctx);
  assert.equal(q.action, 'pass');
  assert.equal(q.level, 'overlay');
  assert.equal(q.setCookie, `livefx_ov=${KEY}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`, 'cookie so /events and /assets work without changing overlay code');
  const cookie = `livefx_ov=${KEY}`;
  for (const p of ['/events', '/events?role=overlay', '/assets/boom.mp3', '/overlay.html']) {
    const r = auth.decide(fakeReq(p, { headers: { cookie } }), ctx);
    assert.equal(r.level, 'overlay', p);
    assert.equal(r.setCookie, null, `${p}: no new cookie`);
  }
  for (const p of ['/events?role=panel', '/api/triggers', '/api/config', '/']) assert.notEqual(auth.decide(fakeReq(p, { headers: { cookie } }), ctx).level, 'overlay', p);
  assert.equal(auth.decide(fakeReq('/fire', { method: 'POST', headers: { cookie } }), ctx).action, 'deny', 'read-only');
  assert.equal(auth.decide(fakeReq('/overlay.html?key=wrong'), ctx).action, 'deny');
  assert.equal(auth.decide(fakeReq(`/api/triggers?key=${KEY}`), ctx).action, 'deny');
});

test('isAuthorized / requireAuth: device cookie alone is enough for reads, writes also need a same-origin signal', async () => {
  const { ctx, cookie } = setup();
  const lan = (method, headers = {}) => fakeReq('/api/x', { method, headers: { cookie, ...headers } });
  assert.equal(auth.isAuthorized(lan('GET'), ctx), true, 'GET without Sec-Fetch-Site / Origin (plain-http LAN)');
  assert.equal(auth.isAuthorized(lan('HEAD'), ctx), true);
  assert.equal(auth.isAuthorized(lan('POST'), ctx), false, 'write without Origin');
  assert.equal(auth.isAuthorized(lan('POST', { origin: 'http://192.168.1.20:8787' }), ctx), true);
  assert.equal(auth.isAuthorized(lan('PUT', { origin: 'http://evil.example' }), ctx), false);
  assert.equal(auth.isAuthorized(fakeReq('/api/x', { headers: {} }), ctx), false, 'no cookie');
  assert.equal(auth.isAuthorized(fakeReq('/api/x', { remote: '127.0.0.1', headers: { host: '127.0.0.1:8787', 'sec-fetch-site': 'same-origin' } }), ctx), true, 'loopback as before');
  assert.equal(auth.isAuthorized(fakeReq('/api/x', { remote: '127.0.0.1', headers: { host: '127.0.0.1:8787' } }), ctx), false, 'loopback still needs same-origin');
  assert.equal(auth.isAuthorized(fakeReq('/api/x', { headers: { host: 'evil.example', cookie } }), ctx), false, 'foreign Host');

  const handler = auth.requireAuth(async () => 'ran');
  assert.equal(await handler(lan('GET'), {}, ctx), 'ran');
  await assert.rejects(handler(lan('POST'), {}, ctx), (e) => e.status === 401 && /Same-Origin/.test(e.message));
  await assert.rejects(handler(fakeReq('/api/x'), {}, ctx), (e) => e.status === 401 && /nicht gekoppelt/.test(e.message));
  await assert.rejects(handler(fakeReq('/api/x', { headers: { host: 'evil.example' } }), {}, ctx), (e) => e.status === 403);
  assert.equal(await handler(fakeReq('/api/x', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, host: 'evil.example' } }), {}, ctx), 'ran', 'Bearer always wins');
  const tunnelNoCookie = fakeReq('/api/x', { method: 'POST', remote: '127.0.0.1', headers: { host: '127.0.0.1:8787', origin: 'http://127.0.0.1:8787', 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': '203.0.113.1' } });
  await assert.rejects(handler(tunnelNoCookie, {}, ctx), (e) => e.status === 401, 'tunnel + same-origin without a session is refused');
});

test('clientAddress: cf-connecting-ip only counts for our own cloudflared (loopback socket)', () => {
  assert.equal(auth.clientAddress(fakeReq('/', { remote: '127.0.0.1', headers: { host: 'a.trycloudflare.com', 'cf-connecting-ip': '203.0.113.9' } })), 'cf:203.0.113.9');
  assert.equal(auth.clientAddress(fakeReq('/', { remote: '192.168.1.50', headers: { 'cf-connecting-ip': '1.2.3.4' } })), '192.168.1.50', 'spoofed header from the LAN is ignored');
  assert.equal(auth.clientAddress(fakeReq('/', { remote: '127.0.0.1', headers: { host: 'a.trycloudflare.com', 'cf-connecting-ip': 'x'.repeat(80) } })), 'tunnel');
  assert.equal(auth.clientAddress(fakeReq('/', { remote: '127.0.0.1', headers: { host: '127.0.0.1' } })), '127.0.0.1');
});

// ---------------------------------------------------------------- integration over the real LAN address

const lanIp = (() => {
  const best = rankLanAddresses(require('os').networkInterfaces())[0];
  return best ? best.address : null;
})();

/** Request to the server through `host` (the LAN IP → non-loopback socket on the server side). */
function req(host, port, p, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host, port, path: p, method, headers: { host: `${host}:${port}`, ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        text += c;
        if (/text\/event-stream/.test(res.headers['content-type'] || '') && text.includes('"type":"state"')) res.destroy();
      });
      const done = () => {
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {
          /* not json */
        }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      };
      res.on('end', done);
      res.on('close', done);
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

test('LAN integration: pairing over the WLAN address, panel API with the device cookie, overlay key, loopback unchanged', { skip: lanIp ? false : 'keine LAN-Adresse auf diesem Rechner' }, async (t) => {
  const server = await startServer({ env: { HOST: '0.0.0.0' } });
  t.after(() => server.stop());
  const { base, token } = server;
  const port = Number(new URL(base).port);
  const L = (p, o) => req(lanIp, port, p, o);
  const origin = `http://${lanIp}:${port}`;

  await t.test('without pairing: 401 for the panel API, redirect for pages, minimal /health, public static code', async () => {
    const tr = await L('/api/triggers');
    assert.equal(tr.status, 401);
    assert.equal(tr.json.error, 'pairing_required');
    assert.equal((await L('/api/config')).status, 401);
    assert.equal((await L('/events?role=panel')).status, 401, 'no viewer chat / transcripts for strangers');
    assert.equal((await L('/events')).status, 401);
    assert.equal((await L('/fire', { method: 'POST', headers: { origin }, body: '{"type":"volume","volume":0}' })).status, 401);
    const page = await L('/');
    assert.equal(page.status, 302);
    assert.equal(page.headers.location, '/p?next=panel');
    assert.equal(page.headers['set-cookie'], undefined, 'the master token never leaves the PC as a cookie');
    assert.equal((await L('/mobile.html')).headers.location, '/p');
    const h = await L('/health');
    assert.deepEqual(Object.keys(h.json).sort(), ['ok', 'version']);
    assert.equal((await L('/js/bus.js')).status, 200);
    assert.equal((await L('/p')).status, 200);
    const ov = await L('/overlay.html');
    assert.equal(ov.status, 401);
    assert.match(ov.headers['content-type'], /text\/html/);
    assert.match(ov.text, /Overlay-Schlüssel fehlt/);
  });

  let cookie;
  await t.test('pair with the code from the PC (loopback /api/setup) → device cookie; reads work without Origin', async () => {
    const setup = await api(base, 'GET', '/api/setup', { token });
    assert.ok(setup.json.lanUrls.some((u) => u.includes(lanIp)), JSON.stringify(setup.json.lanUrls));
    const secret = setup.json.pairing.lanUrl.split('#')[1];
    const paired = await L('/api/pair', { method: 'POST', headers: { origin, 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1' }, body: JSON.stringify({ secret }) });
    assert.equal(paired.status, 200, paired.text);
    assert.equal(paired.json.device.via, 'lan');
    cookie = String(paired.headers['set-cookie'][0]).split(';')[0];
    assert.ok(cookie.startsWith('livefx_dev='));
    const tr = await L('/api/triggers', { headers: { cookie } });
    assert.equal(tr.status, 200);
    const cfg = await L('/api/config', { headers: { cookie } });
    assert.equal(cfg.status, 200, 'GET with the cookie alone (no Sec-Fetch-Site on plain-http LAN)');
    assert.equal(cfg.json.token, undefined, 'the master token is hidden from paired devices');
    assert.equal(cfg.json.tokenHidden, true);
    assert.equal(cfg.headers['content-length'], String(Buffer.byteLength(cfg.text)));
    assert.equal((await L('/api/tunnel', { headers: { cookie } })).status, 200);
    const setupLan = await L('/api/setup', { headers: { cookie } });
    assert.equal(setupLan.status, 200);
    assert.ok(setupLan.json.devices.some((d) => d.current), 'the phone sees itself as current');
    const page = await L('/', { headers: { cookie } });
    assert.equal(page.status, 200);
    assert.equal(page.headers['set-cookie'], undefined, 'index.html via LAN does not hand out the token cookie');
    const mobile = await L('/mobile.html', { headers: { cookie } });
    assert.equal(mobile.status, 200);
    const sse = await L('/events?role=panel', { headers: { cookie } });
    assert.equal(sse.status, 200);
    const h = await L('/health', { headers: { cookie } });
    assert.ok('overlays' in h.json && 'devices' in h.json);
  });

  await t.test('writes need the cookie AND a matching Origin', async () => {
    const body = JSON.stringify({ type: 'volume', volume: 0.4 });
    assert.equal((await L('/fire', { method: 'POST', headers: { cookie }, body })).status, 401, 'no Origin');
    assert.equal((await L('/fire', { method: 'POST', headers: { cookie, origin: 'http://evil.example' }, body })).status, 401);
    assert.equal((await L('/fire', { method: 'POST', headers: { cookie, origin }, body })).status, 200);
  });

  await t.test('overlay key: page + events + assets read-only', async () => {
    const key = (await api(base, 'GET', '/api/setup', { token })).json.overlayUrls.key;
    const page = await L(`/overlay.html?key=${key}`);
    assert.equal(page.status, 200);
    const ovCookie = String(page.headers['set-cookie'][0]).split(';')[0];
    assert.equal(ovCookie, `livefx_ov=${key}`);
    assert.equal((await L('/events', { headers: { cookie: ovCookie } })).status, 200);
    assert.equal((await L(`/events?role=overlay&key=${key}`)).status, 200);
    assert.equal((await L('/events?role=panel', { headers: { cookie: ovCookie } })).status, 401);
    assert.equal((await L('/api/triggers', { headers: { cookie: ovCookie } })).status, 401);
    assert.equal((await L('/assets/missing.png', { headers: { cookie: ovCookie } })).status, 404, 'past the guard, then the static 404');
  });

  await t.test('revoking the device kills the cookie at once', async () => {
    const list = (await api(base, 'GET', '/api/devices', { token })).json.devices;
    const me = list.find((d) => d.via === 'lan');
    assert.equal((await api(base, 'DELETE', `/api/devices/${me.id}`, { token })).status, 200);
    assert.equal((await L('/api/triggers', { headers: { cookie } })).status, 401);
    assert.equal((await L('/', { headers: { cookie } })).status, 302);
  });

  await t.test('loopback unchanged: panel cookie on /, reads without credentials, same-origin writes', async () => {
    const page = await fetch(`${base}/`);
    assert.match(page.headers.get('set-cookie') || '', new RegExp(`^livefx=${token}; HttpOnly; SameSite=Strict; Path=/`));
    assert.equal((await api(base, 'GET', '/api/triggers')).status, 200);
    const cfg = await api(base, 'GET', '/api/config', { headers: { 'sec-fetch-site': 'same-origin' } });
    assert.equal(cfg.json.token, token, 'the panel on this PC still shows the token');
    assert.equal((await api(base, 'GET', '/api/config')).status, 401, 'loopback still needs same-origin for authed routes');
    const h = await api(base, 'GET', '/health');
    assert.ok('overlays' in h.json);
    assert.equal((await fetch(`${base}/overlay.html`)).status, 200, 'OBS on this PC: no key needed');
  });

  await t.test('/m rate limit is per visitor through the tunnel (cf-connecting-ip), not one shared bucket', async () => {
    const tun = (ip, tok) => req('127.0.0.1', port, `/m?token=${tok}`, { headers: { host: `127.0.0.1:${port}`, 'cf-connecting-ip': ip } });
    for (let i = 0; i < 10; i++) assert.equal((await tun('203.0.113.66', `wrong-${i}`)).status, 401);
    assert.equal((await tun('203.0.113.66', token)).status, 429, 'the guesser is locked out');
    const phone = await tun('198.51.100.7', token);
    assert.equal(phone.status, 302, 'the real phone is not');
    assert.match(String(phone.headers['set-cookie']), /^livefx_dev=.*; Secure$/);
  });
});

test('DNS rebinding: a foreign Host passes only with a VALID Bearer (any Authorization header used to be enough)', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const port = Number(new URL(server.base).port);
  const evil = (headers) => req('127.0.0.1', port, '/api/triggers', { headers: { host: `evil.example:${port}`, ...headers } });
  assert.equal((await evil({})).status, 403);
  assert.equal((await evil({ authorization: 'Bearer wrong' })).status, 403, 'a made-up header no longer opens the door');
  assert.equal((await req('127.0.0.1', port, '/', { headers: { host: `evil.example:${port}`, authorization: 'x' } })).status, 403, 'no panel page (and no cookie) for a rebound origin');
  assert.equal((await evil({ authorization: `Bearer ${server.token}` })).status, 200, 'external tools with the token still work from any Host');
});
