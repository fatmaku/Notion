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
