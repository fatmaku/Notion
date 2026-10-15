// js/setup-card.js – easy setup helpers: /api/setup normalisation (real server shape, tolerant of gaps), the 2.2
// fallback from /api/config, overlay links for the LAN, tunnel pairing links, first-run decision, code formatting,
// pairing view markup and the printable setup card (two QR codes, A6/A5, no script, escaped payloads); the pairing
// controller against a fake server: expiry on the server clock (skewed device clocks), renewal pause, internet QR held
// back after a pairing.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/setup-card.js');
const QR = require('../js/qr.js');

// GET /api/setup as server/api-pairing.js setupInfo() answers it
const REAL = {
  ok: true,
  version: '2.4.0',
  panelUrl: 'http://127.0.0.1:8787/',
  lanUrls: ['http://192.168.178.23:8787/', 'http://172.20.0.1:8787/'],
  bestLanUrl: 'http://192.168.178.23:8787/',
  overlayUrls: {
    local: 'http://127.0.0.1:8787/overlay.html',
    localPortrait: 'http://127.0.0.1:8787/overlay.html?layout=portrait',
    lan: 'http://192.168.178.23:8787/overlay.html?key=abc123',
    lanPortrait: 'http://192.168.178.23:8787/overlay.html?layout=portrait&key=abc123',
    key: 'abc123',
  },
  tunnel: { state: 'idle', url: null, error: null, pairingUrl: null },
  pairing: {
    url: 'http://192.168.178.23:8787/p#s3cretS3cretS3cret',
    lanUrl: 'http://192.168.178.23:8787/p#s3cretS3cretS3cret',
    tunnelUrl: null,
    manualUrl: 'http://192.168.178.23:8787/p',
    code: '482913',
    expiresAt: '2026-10-09T07:04:08.259Z',
    ttlMs: 600000,
    via: 'lan',
  },
  devices: [{ id: 'hoKqzgkHEaKr', name: 'iPhone · Safari', via: 'lan', createdAt: 1791528852339, lastSeen: '2026-10-09T07:00:00.000Z', current: false }],
  lan: { listening: true, bind: '0.0.0.0', ips: [{ address: '192.168.178.23', iface: 'eth0' }], port: 8787, reason: null },
};

test('normalizeSetup reads the real /api/setup answer', () => {
  const n = S.normalizeSetup(REAL);
  assert.strictEqual(n.source, 'setup');
  assert.deepStrictEqual(n.lanUrls, ['http://192.168.178.23:8787', 'http://172.20.0.1:8787'], 'origins, best first');
  assert.strictEqual(n.bestLanUrl, 'http://192.168.178.23:8787');
  assert.strictEqual(n.pairing.lanUrl, REAL.pairing.lanUrl, 'fragment (secret) kept');
  assert.strictEqual(n.pairing.hasLan, true);
  assert.strictEqual(n.pairing.manualUrl, 'http://192.168.178.23:8787/p');
  assert.strictEqual(n.pairing.code, '482913');
  assert.strictEqual(n.pairing.expiresAt, Date.parse('2026-10-09T07:04:08.259Z'));
  assert.deepStrictEqual(n.overlay.lan, { landscape: REAL.overlayUrls.lan, portrait: REAL.overlayUrls.lanPortrait }, 'LAN overlay links keep the key');
  assert.deepStrictEqual(n.overlay.local, { landscape: REAL.overlayUrls.local, portrait: REAL.overlayUrls.localPortrait });
  assert.strictEqual(n.devices.length, 1);
  assert.strictEqual(n.devices[0].name, 'iPhone · Safari');
  assert.strictEqual(n.devices[0].lastSeen, Date.parse('2026-10-09T07:00:00.000Z'));
  assert.strictEqual(n.devices[0].createdAt, 1791528852339);
  assert.strictEqual(n.tunnel.state, 'idle');
  assert.strictEqual(S.tunnelPairingUrl(n), '', 'no tunnel link while the tunnel is off');
  assert.deepStrictEqual(n.lan, { listening: true, reason: '' });
});

test('normalizeSetup tolerates gaps, junk and loopback addresses', () => {
  assert.strictEqual(S.normalizeSetup(null), null);
  const n = S.normalizeSetup({ ok: true, lanUrls: ['javascript:alert(1)', 'http://127.0.0.1:8787/', 42, 'http://10.0.0.5:8787'], devices: [{ id: '' }, null, { id: 7, name: '<b>x</b>' }], tunnel: { status: 'online', url: 'https://a-b.trycloudflare.com' } });
  assert.deepStrictEqual(n.lanUrls, ['http://10.0.0.5:8787'], 'only real LAN origins');
  assert.strictEqual(n.pairing, null);
  assert.deepStrictEqual(n.devices.map((d) => [d.id, d.name]), [['7', '<b>x</b>']], 'names kept raw – escaped when rendered');
  assert.strictEqual(n.tunnel.state, 'online', '`status` accepted for `state`');
  assert.strictEqual(n.overlay.lan.landscape, 'http://10.0.0.5:8787/overlay.html', 'LAN overlay built from the best address');
  assert.strictEqual(n.overlay.lan.portrait, 'http://10.0.0.5:8787/overlay.html?layout=portrait');
  const local = S.normalizeSetup({ ok: true, pairing: { url: null, lanUrl: null, code: '123456' }, lan: { listening: false, reason: 'local_only' } });
  assert.strictEqual(local.pairing.code, '123456', 'code kept without a reachable link');
  assert.strictEqual(local.pairing.hasLan, true);
  assert.strictEqual(local.pairing.lanUrl, '');
  assert.deepStrictEqual(local.lan, { listening: false, reason: 'local_only' });
});

test('tunnel pairing link: server value first, else the LAN link moved onto the tunnel origin', () => {
  const online = { ...REAL, tunnel: { state: 'online', url: 'https://brave-otter.trycloudflare.com', pairingUrl: 'https://brave-otter.trycloudflare.com/p#s3cretS3cretS3cret' } };
  assert.strictEqual(S.tunnelPairingUrl(S.normalizeSetup(online)), 'https://brave-otter.trycloudflare.com/p#s3cretS3cretS3cret');
  const derived = S.normalizeSetup({ ...REAL, tunnel: { state: 'online', url: 'https://brave-otter.trycloudflare.com' } });
  assert.strictEqual(S.tunnelPairingUrl(derived), 'https://brave-otter.trycloudflare.com/p#s3cretS3cretS3cret');
  assert.strictEqual(S.tunnelPairingUrl(S.normalizeSetup({ ...REAL, tunnel: { state: 'starting', url: 'https://x.trycloudflare.com' } })), '');
  assert.strictEqual(S.withOrigin('http://1.2.3.4:8787/p?next=camera#abc', 'https://t.example/'), 'https://t.example/p?next=camera#abc');
  assert.strictEqual(S.withOrigin('nope', 'https://t.example'), '');
});

test('overlayLinks: arrays, plain objects, derived portrait keeps the key', () => {
  const a = S.overlayLinks(['http://192.168.1.2:8787/overlay.html?key=k1', 'http://127.0.0.1:8787/overlay.html']);
  assert.strictEqual(a.lan.landscape, 'http://192.168.1.2:8787/overlay.html?key=k1');
  assert.strictEqual(a.lan.portrait, 'http://192.168.1.2:8787/overlay.html?key=k1&layout=portrait');
  assert.strictEqual(a.local.portrait, 'http://127.0.0.1:8787/overlay.html?layout=portrait');
  const none = S.overlayLinks(undefined, { origin: 'http://127.0.0.1:8787' });
  assert.deepStrictEqual(none.lan, { landscape: '', portrait: '' }, 'no LAN without an address');
  assert.strictEqual(none.local.landscape, 'http://127.0.0.1:8787/overlay.html');
});

test('fromConfig: the 2.2 token link for servers without /api/setup (legacy, loopback dropped, IPv6 in brackets)', () => {
  const n = S.fromConfig({ ok: true, token: 'tok en', lanIps: ['192.168.0.9', '127.0.0.1', 'fe80::1', 'evil"host'], port: 8790, version: '2.2.0' }, { protocol: 'http:', origin: 'http://127.0.0.1:8790', port: '8790' });
  assert.strictEqual(n.source, 'config');
  assert.deepStrictEqual(n.lanUrls, ['http://192.168.0.9:8790', 'http://[fe80::1]:8790']);
  assert.strictEqual(n.pairing.url, 'http://192.168.0.9:8790/m?token=tok%20en');
  assert.strictEqual(n.pairing.legacy, true);
  assert.strictEqual(n.devicesKnown, false);
  assert.strictEqual(n.overlay.lan.landscape, 'http://192.168.0.9:8790/overlay.html');
  assert.strictEqual(S.fromConfig({ token: 't', lanIps: [] }, { protocol: 'http:' }).pairing, null, 'no LAN address → no link');
  assert.strictEqual(S.fromConfig({ token: 't', lanIps: ['10.1.1.1'], secure: true, port: 8443 }, {}).pairing.url, 'https://10.1.1.1:8443/m?token=t');
});

test('isFirstRun: forced, automation, done, local state, server data', () => {
  assert.strictEqual(S.isFirstRun({}), true, 'unknown server = fresh');
  assert.strictEqual(S.isFirstRun({ serverFresh: false }), false, 'server already has triggers');
  assert.strictEqual(S.isFirstRun({ hadLocalState: true }), false);
  assert.strictEqual(S.isFirstRun({ setupDone: true }), false);
  assert.strictEqual(S.isFirstRun({ automated: true }), false, 'scripted browsers see the full panel');
  assert.strictEqual(S.isFirstRun({ automated: true, force: '1' }), true, '?firstrun=1 forces it');
  assert.strictEqual(S.isFirstRun({ force: '0' }), false, '?firstrun=0 switches it off');
});

test('serverLooksFresh: untouched defaults written during this server run count as a fresh install', () => {
  const defaults = [{ id: 'a' }, { id: 'b' }];
  const now = Date.parse('2026-10-09T08:00:00Z');
  const startedIso = '2026-10-09T07:59:30Z'; // server up for 30 s, defaults written at start
  assert.strictEqual(S.serverLooksFresh({ updatedAt: null }), true, 'never saved');
  assert.strictEqual(S.serverLooksFresh({ updatedAt: startedIso, removed: [], triggers: defaults, defaults, uptimeS: 30, now }), true);
  assert.strictEqual(S.serverLooksFresh({ updatedAt: '2026-10-08T20:00:00Z', removed: [], triggers: defaults, defaults, uptimeS: 30, now }), false, 'saved in an earlier run');
  assert.strictEqual(S.serverLooksFresh({ updatedAt: startedIso, removed: ['x'], triggers: defaults, defaults, uptimeS: 30, now }), false, 'something removed');
  assert.strictEqual(S.serverLooksFresh({ updatedAt: startedIso, triggers: [{ id: 'a' }, { id: 'c' }], defaults, uptimeS: 30, now }), false, 'edited list');
  assert.strictEqual(S.serverLooksFresh({ updatedAt: startedIso, triggers: defaults, defaults, uptimeS: null, now }), false, 'no uptime (not this PC) → not fresh');
});

test('small helpers: code, times, URLs', () => {
  assert.strictEqual(S.formatCode('482913'), '482 913');
  assert.strictEqual(S.formatCode('48-29 13'), '482 913');
  assert.strictEqual(S.formatCode('ABCD1234'), 'ABCD 1234');
  assert.strictEqual(S.parseTime('2026-10-09T07:00:00Z'), Date.parse('2026-10-09T07:00:00Z'));
  assert.strictEqual(S.parseTime(1791528852), 1791528852000, 'seconds → ms');
  assert.strictEqual(S.parseTime(1791528852339), 1791528852339);
  assert.strictEqual(S.parseTime('1791528852339'), 1791528852339);
  assert.strictEqual(S.parseTime('kaputt'), null);
  assert.strictEqual(S.relTime(1000, 21000), 'gerade eben');
  assert.strictEqual(S.relTime(0, 5 * 60000), 'vor 5 min');
  assert.strictEqual(S.relTime(0, 3 * 3600000), 'vor 3 h');
  assert.strictEqual(S.countdown(9 * 60000 + 41000), '9:41');
  assert.strictEqual(S.countdown(-5), '0:00');
  assert.strictEqual(S.cleanUrl('javascript:alert(1)'), '');
  assert.strictEqual(S.cleanUrl(' http://a.example/x '), 'http://a.example/x');
  assert.ok(S.isLoopbackUrl('http://127.0.0.1:8787/') && S.isLoopbackUrl('http://localhost/') && S.isLoopbackUrl('http://[::1]:1/'));
  assert.ok(!S.isLoopbackUrl('http://192.168.1.2/'));
});

test('pairViewHtml: ids per view, escaped prefix, optional card button', () => {
  const html = S.pairViewHtml({ id: 'wiz-phone', qr: 280 });
  for (const id of ['wiz-phone-qr', 'wiz-phone-code', 'wiz-phone-state', 'wiz-phone-dot', 'wiz-phone-url-line', 'wiz-phone-hint', 'wiz-phone-tunnel', 'wiz-phone-devices', 'wiz-phone-expiry', 'wiz-phone-new', 'wiz-phone-copy', 'wiz-phone-card', 'wiz-phone-lan']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /data-qr="280"/);
  assert.strictEqual((html.match(/data-pair-act="tunnel"/g) || []).length, 1, 'ONE tunnel button');
  assert.doesNotMatch(S.pairViewHtml({ id: 'x', card: false }), /data-pair-act="card"/);
  assert.doesNotMatch(S.pairViewHtml({ id: '"><script>' }), /<script>/);
});

test('cardHtml: two QR codes (pairing + overlay) that decode to their payloads, DE/TR/EN lines, A6/A5, no script', () => {
  const data = { pairingUrl: REAL.pairing.lanUrl, code: '482913', expiresAt: REAL.pairing.expiresAt, overlayUrl: REAL.overlayUrls.lan, version: '2.4.0', created: Date.parse('2026-10-09T06:54:00Z') };
  const html = S.cardHtml(data);
  const payloads = [...html.matchAll(/data-qr-payload="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  assert.deepStrictEqual(payloads, [REAL.pairing.lanUrl, REAL.overlayUrls.lan]);
  // each SVG is exactly the encoder's matrix of its payload
  const svgs = [...html.matchAll(/<svg[^>]*>.*?<\/svg>/g)].map((m) => m[0]);
  assert.strictEqual(svgs.length, 2);
  svgs.forEach((svg, i) => {
    const ref = QR.toSvg(payloads[i], { scale: 4, margin: 4, dark: '#000000', light: '#ffffff' });
    assert.strictEqual(svg, ref, `QR ${i} = encoder output`);
  });
  assert.match(html, /Code <b>482 913<\/b>/);
  for (const lang of ['DE', 'TR', 'EN']) assert.match(html, new RegExp(`<b>${lang}</b> ①`), lang);
  assert.match(html, /@page \{ size: 148mm 105mm/, 'A6 by default');
  assert.match(S.cardHtml({ ...data, size: 'a5' }), /@page \{ size: 210mm 148mm/);
  assert.match(html, /data-size="a6"/);
  assert.doesNotMatch(html, /<script/i, 'no script in the print page');
  assert.match(html, /gleiches WLAN/);
  const evil = S.cardHtml({ pairingUrl: 'http://1.2.3.4/p#"><img src=x onerror=alert(1)>', overlayUrl: 'http://127.0.0.1:8787/overlay.html' });
  assert.doesNotMatch(evil, /<img/);
  assert.match(evil, /nur auf diesem PC/, 'loopback overlay is marked as PC-only');
  const legacy = S.cardHtml({ pairingUrl: 'http://1.2.3.4:8787/m?token=x', legacy: true, overlayUrl: '' });
  assert.match(legacy, /Zugangs-Token/, 'legacy token link carries a warning');
  assert.strictEqual((legacy.match(/data-qr-payload=/g) || []).length, 1, 'no overlay QR without an URL');
});

// ---------- pairing controller (createPairing) with a fake server ----------
const TUNNEL_ORIGIN = 'https://brave-otter.trycloudflare.com';

/**
 * Fake /api/setup + POST /api/pairing + POST /api/tunnel/start. `skewMs` = how far the PC/phone clock (Date.now, mocked)
 * runs AHEAD of the server; `dateHeader: false` = answers without a `Date` header; `ttlMs` = lifetime of new codes.
 */
function fakeServer({ skewMs = 0, dateHeader = true, ttlMs = 600000, lan = true, tunnel = false } = {}) {
  const m = { posts: 0, gets: 0, seq: 0, devices: [], tunnel, lan };
  const serverNow = () => Date.now() - skewMs;
  const code = () => {
    m.seq++;
    const t = serverNow();
    const secret = `secret${m.seq}secret${m.seq}`;
    return { url: m.lan ? `http://192.168.178.23:8787/p#${secret}` : null, lanUrl: m.lan ? `http://192.168.178.23:8787/p#${secret}` : null, tunnelUrl: m.tunnel ? `${TUNNEL_ORIGIN}/p#${secret}` : null, manualUrl: 'http://192.168.178.23:8787/p', code: String(400000 + m.seq), expiresAt: new Date(t + ttlMs).toISOString(), ttlMs };
  };
  m.pairing = code();
  const withTunnel = (p) => ({ ...p, tunnelUrl: m.tunnel ? S.withOrigin(p.lanUrl || `http://192.168.178.23:8787/p#${p.code}`, TUNNEL_ORIGIN) : null });
  const answer = (json) => ({
    status: 200,
    ok: true,
    headers: { get: (k) => (k.toLowerCase() === 'date' && dateHeader ? new Date(serverNow()).toUTCString() : null) },
    json: async () => json,
  });
  m.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    if (url === '/api/setup') {
      m.gets++;
      const p = withTunnel(m.pairing);
      return answer({
        ok: true,
        lanUrls: m.lan ? ['http://192.168.178.23:8787/'] : [],
        bestLanUrl: m.lan ? 'http://192.168.178.23:8787/' : null,
        tunnel: m.tunnel ? { state: 'online', url: TUNNEL_ORIGIN, pairingUrl: p.tunnelUrl } : { state: 'idle', url: null },
        pairing: p,
        devices: m.devices,
        lan: { listening: m.lan, reason: m.lan ? null : 'local_only' },
      });
    }
    if (url === '/api/pairing' && method === 'POST') {
      m.posts++;
      m.pairing = code();
      return answer({ ok: true, pairing: withTunnel(m.pairing) });
    }
    if (url === '/api/tunnel/start' && method === 'POST') {
      m.tunnel = true;
      return answer({ ok: true, status: 'online', url: TUNNEL_ORIGIN });
    }
    return { status: 404, ok: false, headers: { get: () => null }, json: async () => ({ ok: false }) };
  };
  m.pair = (name) => {
    m.devices.push({ id: `dev${m.devices.length + 1}`, name, lastSeen: new Date(serverNow()).toISOString() });
    m.pairing = code();
  };
  return m;
}
const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r));
};

function controller(server, extra = {}) {
  return S.createPairing({ roots: [], window: {}, online: true, isVisible: () => true, fetch: server.fetch, pollMs: 2000, ...extra });
}

test('controller: countdown and renewal follow the server clock (device clock 9.8 min ahead → no renewal loop)', async (t) => {
  const start = Date.parse('2026-10-09T08:00:00Z');
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: start });
  const skewMs = 9.8 * 60000;
  const srv = fakeServer({ skewMs });
  const c = controller(srv);
  c.start();
  await flush();
  assert.strictEqual(c.state.mode, 'setup');
  const st = c.state;
  assert.ok(Math.abs(st.skew + skewMs) < 1500, `offset learnt from the Date header (${st.skew})`);
  const left = st.expiresAt - Date.now();
  assert.ok(left > 590000 && left <= 601000, `a fresh code shows ~10 min on this device's clock (${left} ms)`);
  for (let i = 0; i < 10; i++) {
    t.mock.timers.tick(1000);
    await flush();
  }
  assert.strictEqual(srv.posts, 0, 'no POST /api/pairing for a code that is still valid on the server');
  // 9 min 45 s later (server clock): now it really is about to expire → exactly ONE renewal
  t.mock.timers.tick(575000);
  await flush();
  for (let i = 0; i < 8; i++) {
    t.mock.timers.tick(1000);
    await flush();
  }
  assert.strictEqual(srv.posts, 1, `one renewal shortly before the server-side expiry (${srv.posts})`);
  assert.ok(c.state.expiresAt - Date.now() > 590000, 'the renewed code counts down from ~10 min again');
  c.stop();
});

test('controller: without a Date header the offset comes from a fresh code; a renewal is followed by a 30 s pause', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: Date.parse('2026-10-09T08:00:00Z') });
  const srv = fakeServer({ skewMs: 9.8 * 60000, dateHeader: false });
  const c = controller(srv);
  c.start();
  await flush();
  for (let i = 0; i < 6; i++) {
    t.mock.timers.tick(1000);
    await flush();
  }
  assert.strictEqual(srv.posts, 1, `the code looks expired on the skewed clock: ONE renewal, then the offset is known (${srv.posts})`);
  assert.ok(c.state.expiresAt - Date.now() > 590000, 'fresh code: expiresAt - ttlMs = server „now“');
  // a server that hands out codes which really die within the renewal window must not be asked every second
  const short = fakeServer({ ttlMs: 10000 });
  const c2 = controller(short);
  c2.start();
  await flush();
  for (let i = 0; i < 25; i++) {
    t.mock.timers.tick(1000);
    await flush();
  }
  assert.ok(short.posts >= 1 && short.posts <= 2, `at most one renewal per 30 s (${short.posts} in 25 s)`);
  c.stop();
  c2.stop();
});

test('controller: once a phone pairs, the internet QR is held back until the streamer asks for it again', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: Date.parse('2026-10-09T08:00:00Z') });
  // (a) WLAN works, the streamer switched to the internet QR
  const srv = fakeServer();
  const c = controller(srv);
  c.start();
  await flush();
  assert.strictEqual(c.state.via, 'lan');
  await c.startTunnel();
  assert.strictEqual(c.state.via, 'tunnel');
  assert.ok(c.state.url.startsWith(`${TUNNEL_ORIGIN}/p#`));
  srv.pair('iPhone · Safari');
  await c.refresh();
  assert.strictEqual(c.state.connected && c.state.connected.name, 'iPhone · Safari');
  assert.strictEqual(c.state.via, 'lan', 'back to the WLAN code after the pairing');
  assert.strictEqual(c.state.tunnelWanted, false);
  assert.strictEqual(c.state.tunnelHeld, true);
  await c.startTunnel(); // „➕ Weiteres Handy (Internet)“ / the tunnel button
  assert.strictEqual(c.state.via, 'tunnel', 'internet QR on request');
  c.stop();

  // (b) no WLAN (e.g. camera view through the tunnel): the internet QR is the automatic one – until a phone pairs
  const off = fakeServer({ lan: false, tunnel: true });
  const c2 = controller(off);
  c2.start();
  await flush();
  assert.strictEqual(c2.state.via, 'tunnel', 'without WLAN the internet QR shows by itself');
  off.pair('Android · Chrome');
  await c2.refresh();
  assert.strictEqual(c2.state.url, '', 'no QR on screen after the pairing');
  assert.strictEqual(c2.state.tunnelHeld, true);
  for (let i = 0; i < 20; i++) {
    t.mock.timers.tick(30000);
    await flush();
  }
  assert.strictEqual(c2.state.url, '', 'it does not come back by itself (renewals, polls)');
  c2.wantTunnel();
  await c2.refresh();
  assert.strictEqual(c2.state.via, 'tunnel', 'wantTunnel() (the Handy card button) shows it again');
  c2.stop();
});

test('pairViewHtml: „➕ Weiteres Handy“ button, honest „Neuer Code“ tooltip', () => {
  const html = S.pairViewHtml({ id: 'v' });
  assert.match(html, /id="v-more"[^>]*data-pair-act="more"[^>]*hidden/, '„➕ Weiteres Handy“ starts hidden');
  assert.doesNotMatch(html, /alte wird ungültig/, 'the „Neuer Code“ tooltip does not promise to kill the old code');
  assert.match(html, /alte bleibt bis zum Ablauf gültig/);
});
