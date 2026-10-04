// Server core: robustness against malformed requests, static allow-list, SSE framing, body limits.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const net = require('net');
const { startServer, api, sseClient } = require('./helpers/server');

let server;
test.before(async () => {
  server = await startServer();
});
test.after(async () => server && server.stop());

function rawRequest(base, text) {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const sock = net.connect(Number(port), hostname, () => sock.write(text));
    let out = '';
    sock.setEncoding('utf8');
    sock.on('data', (d) => (out += d));
    sock.on('end', () => resolve(out));
    sock.on('close', () => resolve(out));
    sock.on('error', reject);
    sock.setTimeout(3000, () => {
      sock.destroy();
      resolve(out);
    });
  });
}

test('malformed percent-encoding and NUL bytes do not crash the server', async () => {
  assert.strictEqual((await api(server.base, 'GET', '/%')).status, 400);
  assert.strictEqual((await api(server.base, 'GET', '/%00')).status, 404);
  assert.strictEqual((await api(server.base, 'GET', '/js/%00bus.js')).status, 404);
  assert.strictEqual((await api(server.base, 'GET', '/health')).status, 200, 'still alive');
});

test('malformed Host header yields 400, not a crash', async () => {
  const out = await rawRequest(server.base, 'GET /health HTTP/1.1\r\nHost: [\r\nConnection: close\r\n\r\n');
  assert.match(out, /^HTTP\/1\.1 400/);
  assert.strictEqual((await api(server.base, 'GET', '/health')).status, 200);
});

test('static allow-list: app files served, server code and data hidden', async () => {
  for (const p of ['/', '/index.html', '/overlay.html', '/demo.html', '/js/bus.js', '/css/panel.css', '/docs/CONTRACTS.md']) {
    const r = await api(server.base, 'GET', p);
    assert.strictEqual(r.status, 200, p);
  }
  for (const p of ['/server.js', '/server/router.js', '/test/e2e.js', '/package.json', '/docs/../server.js', '/docs/x.txt', '/data/token.txt', '/data/triggers.json', '/js/', '/css']) {
    const r = await api(server.base, 'GET', p);
    assert.strictEqual(r.status, 404, p);
  }
  assert.strictEqual((await api(server.base, 'GET', '/favicon.ico')).status, 204);
  const head = await fetch(`${server.base}/js/bus.js`, { method: 'HEAD' });
  assert.strictEqual(head.status, 200);
  assert.strictEqual((await head.text()).length, 0);
  assert.match(head.headers.get('content-type'), /javascript/);
});

test('path traversal attempts are rejected', async () => {
  const cases = ['/..%2fserver.js', '/js/..%2f..%2fserver.js', '/assets/..%2f..%2ftoken.txt', '/assets/../token.txt', '/js/../server.js'];
  for (const p of cases) {
    const out = await rawRequest(server.base, `GET ${p} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    assert.match(out, /^HTTP\/1\.1 (400|404)/, p);
  }
});

test('unknown /api routes are JSON 404s', async () => {
  const r = await api(server.base, 'POST', '/api/does-not-exist', { json: {} });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(r.json.ok, false);
  assert.strictEqual(r.json.error, 'not_found');
});

test('oversized bodies get 413 without hanging', async () => {
  const big = Buffer.alloc(1_500_000, 0x20).toString();
  const started = Date.now();
  const r = await api(server.base, 'POST', '/fire', { body: `{"type":"volume","volume":1${big}}`, headers: { 'content-type': 'application/json' }, token: server.token });
  assert.strictEqual(r.status, 413);
  assert.strictEqual(r.json.error, 'payload_too_large');
  assert.ok(Date.now() - started < 5000, 'answered promptly');
  assert.strictEqual((await api(server.base, 'GET', '/health')).status, 200);
});

test('SSE: retry hint, initial state, ids and role counting', async () => {
  const overlay = await sseClient(server.base, { role: 'overlay' });
  const panel = await sseClient(server.base, { role: 'panel' });
  const st = await overlay.next('state');
  assert.strictEqual(st.type, 'state');
  assert.strictEqual(overlay.retry, 2000);
  assert.ok(overlay.events[0].id >= 1, 'events carry a numeric id');
  await panel.next('state');
  const h = (await api(server.base, 'GET', '/health')).json;
  assert.strictEqual(h.overlays, 1);
  assert.strictEqual(h.panels, 1);
  overlay.close();
  panel.close();
  await new Promise((r) => setTimeout(r, 200));
  const h2 = (await api(server.base, 'GET', '/health')).json;
  assert.strictEqual(h2.overlays + h2.panels, 0, 'closed clients are evicted');
});

test('SSE: one broadcast reaches every subscriber once; Last-Event-ID replays recent events', async () => {
  const a = await sseClient(server.base, { role: 'overlay' });
  const b = await sseClient(server.base, { role: 'overlay' });
  await a.next('state');
  await b.next('state');
  const r = await api(server.base, 'POST', '/fire', { json: { type: 'volume', volume: 0.42 }, token: server.token });
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  const ma = await a.next('volume');
  const mb = await b.next('volume');
  assert.strictEqual(ma.id, mb.id);
  assert.strictEqual(ma.id, r.json.id);
  assert.strictEqual(a.events.filter((e) => e.msg.type === 'volume').length, 1);
  const lastId = a.events[a.events.length - 1].id;
  a.close();
  b.close();

  // A client reconnecting with Last-Event-ID older than the volume event gets it replayed.
  const c = await sseClient(server.base, { role: 'overlay', lastEventId: lastId - 1 });
  const replayed = await c.next('volume');
  assert.strictEqual(replayed.id, ma.id);
  const state = await c.next('state');
  assert.strictEqual(state.volume, 0.42, 'state carries the last volume');
  c.close();
});

// ---- 2.1: ETag / 304 and gzip for static files ----
function rawGet(base, p, headers = {}, method = 'GET') {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${p}`, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('static: strong ETag, If-None-Match -> 304 without body, changed tag -> 200', async () => {
  const fs = require('fs');
  const path = require('path');
  const st = fs.statSync(path.join(__dirname, '..', 'js', 'fx.js'));
  const a = await rawGet(server.base, '/js/fx.js');
  assert.strictEqual(a.status, 200);
  assert.match(a.headers.etag, /^"[0-9a-f]+-[0-9a-f]+"$/, 'strong (no W/) size-mtime tag');
  assert.strictEqual(a.headers.etag, `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`);
  assert.strictEqual(a.headers['content-encoding'], undefined, 'no gzip without Accept-Encoding');
  assert.strictEqual(Number(a.headers['content-length']), st.size);
  assert.strictEqual(a.headers.vary, 'Accept-Encoding');
  const b = await rawGet(server.base, '/js/fx.js', { 'if-none-match': a.headers.etag });
  assert.strictEqual(b.status, 304);
  assert.strictEqual(b.body.length, 0);
  assert.strictEqual(b.headers.etag, a.headers.etag);
  assert.strictEqual(b.headers['cache-control'], 'no-cache');
  const list = await rawGet(server.base, '/js/fx.js', { 'if-none-match': `"nope", W/${a.headers.etag}` });
  assert.strictEqual(list.status, 304, 'tag lists + weak comparison');
  assert.strictEqual((await rawGet(server.base, '/js/fx.js', { 'if-none-match': '*' })).status, 304);
  const c = await rawGet(server.base, '/js/fx.js', { 'if-none-match': '"0-0"' });
  assert.strictEqual(c.status, 200);
  assert.strictEqual(c.body.length, st.size);
  // Binary files get an ETag too, but never Vary / gzip.
  const png = await rawGet(server.base, '/icons/icon-192.png', { 'accept-encoding': 'gzip' });
  assert.strictEqual(png.status, 200);
  assert.ok(png.headers.etag);
  assert.strictEqual(png.headers['content-encoding'], undefined);
  assert.strictEqual(png.headers.vary, undefined);
  assert.strictEqual((await rawGet(server.base, '/icons/icon-192.png', { 'if-none-match': png.headers.etag })).status, 304);
});

test('static: gzip for text > 1 KB when accepted, cached, own ETag; HEAD matches; small / q=0 stay plain', async () => {
  const zlib = require('zlib');
  const fs = require('fs');
  const path = require('path');
  const plain = fs.readFileSync(path.join(__dirname, '..', 'js', 'fx.js'));
  const g = await rawGet(server.base, '/js/fx.js', { 'accept-encoding': 'br, gzip, deflate' });
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.headers['content-encoding'], 'gzip');
  assert.strictEqual(g.headers.vary, 'Accept-Encoding');
  assert.match(g.headers['content-type'], /javascript/);
  assert.strictEqual(Number(g.headers['content-length']), g.body.length);
  assert.ok(g.body.length < plain.length / 2, `compressed ${g.body.length} < ${plain.length} / 2`);
  assert.ok(zlib.gunzipSync(g.body).equals(plain), 'decompresses to the file');
  assert.match(g.headers.etag, /-gz"$/, 'compressed representation has its own strong tag');
  const again = await rawGet(server.base, '/js/fx.js', { 'accept-encoding': 'gzip' });
  assert.ok(again.body.equals(g.body), 'cached gzip body is identical');
  assert.strictEqual((await rawGet(server.base, '/js/fx.js', { 'accept-encoding': 'gzip', 'if-none-match': g.headers.etag })).status, 304);
  const head = await rawGet(server.base, '/js/fx.js', { 'accept-encoding': 'gzip' }, 'HEAD');
  assert.strictEqual(head.status, 200);
  assert.strictEqual(head.body.length, 0);
  assert.strictEqual(head.headers['content-length'], g.headers['content-length']);
  assert.strictEqual(head.headers['content-encoding'], 'gzip');
  const q0 = await rawGet(server.base, '/js/fx.js', { 'accept-encoding': 'gzip;q=0' });
  assert.strictEqual(q0.headers['content-encoding'], undefined, 'gzip;q=0 = not acceptable');
  assert.strictEqual(q0.body.length, plain.length);
  // HTML / CSS compress too; the cookie still comes with index.html.
  for (const p of ['/overlay.html', '/css/overlay.css', '/']) {
    const r = await rawGet(server.base, p, { 'accept-encoding': 'gzip' });
    assert.strictEqual(r.headers['content-encoding'], 'gzip', p);
  }
  assert.ok((await rawGet(server.base, '/', { 'accept-encoding': 'gzip' })).headers['set-cookie'], 'panel cookie kept');
  // fetch() (undici) negotiates and decompresses transparently.
  const f = await fetch(`${server.base}/js/fx.js`);
  assert.strictEqual(await f.text(), plain.toString('utf8'));
  // Unit helpers.
  const S = require('../server/static');
  assert.strictEqual(S.acceptsGzip({ headers: { 'accept-encoding': 'deflate' } }), false);
  assert.strictEqual(S.acceptsGzip({ headers: { 'accept-encoding': 'GZIP;q=0.5' } }), true);
  assert.strictEqual(S.acceptsGzip({ headers: {} }), false);
  assert.strictEqual(S.compressible('image/png'), false);
  assert.strictEqual(S.compressible('image/svg+xml'), true);
  assert.strictEqual(S.compressible('application/manifest+json'), true);
});
