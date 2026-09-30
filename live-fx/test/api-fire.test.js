// Unit tests for server/auth.js + server/api-fire.js: auth order, /fire, /api/fire, /api/config.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, api, sseClient } = require('./helpers/server');

const SAME_ORIGIN = { 'sec-fetch-site': 'same-origin' };

/** Raw request with an explicit Host header (fetch/undici does not let us override `host`). */
function rawPost(base, p, { host, headers = {}, body = '' } = {}) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: u.hostname, port: u.port, method: 'POST', path: p, headers: { 'content-type': 'application/json', ...headers, host } },
      (res) => {
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
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

const fireEnvelope = (id) => ({ id, type: 'fire', trigger: { id: 'lol', label: 'LOL', visual: { kind: 'card', emoji: '😂' } }, source: 'Test' });

test('auth + /fire', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;

  await t.test('no auth headers -> 401 unauthorized', async () => {
    const r = await api(base, 'POST', '/fire', { json: fireEnvelope('m-1') });
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'unauthorized');
  });

  await t.test('same-origin from 127.0.0.1 -> 200 and overlay receives the fire with the same id', async () => {
    const sse = await sseClient(base, { role: 'overlay' });
    t.after(() => sse.close());
    await sse.next('state');
    const r = await api(base, 'POST', '/fire', { json: fireEnvelope('m-same-origin'), headers: SAME_ORIGIN });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.id, 'm-same-origin');
    assert.equal(typeof r.json.overlays, 'number');
    assert.ok(r.json.overlays >= 1);
    const msg = await sse.next('fire');
    assert.equal(msg.id, 'm-same-origin');
    assert.equal(msg.trigger.id, 'lol');
    assert.equal(msg.source, 'Test');
  });

  await t.test('Bearer test-token -> 200', async () => {
    const r = await api(base, 'POST', '/fire', { json: fireEnvelope('m-bearer'), token: 'test-token' });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.id, 'm-bearer');
  });

  await t.test('wrong Bearer -> 401', async () => {
    const r = await api(base, 'POST', '/fire', { json: fireEnvelope('m-bad'), token: 'nope-token' });
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'unauthorized');
    const r2 = await api(base, 'POST', '/fire', { json: fireEnvelope('m-bad2'), token: 'test-token-longer' });
    assert.equal(r2.status, 401);
  });

  await t.test('Host: evil.example with same-origin -> 403 bad_host', async () => {
    const r = await rawPost(base, '/fire', { host: 'evil.example', headers: SAME_ORIGIN, body: JSON.stringify(fireEnvelope('m-evil')) });
    assert.equal(r.status, 403);
    assert.equal(r.json.error, 'bad_host');
  });

  await t.test('Host: evil.example with valid Bearer -> 200 (token always wins)', async () => {
    const r = await rawPost(base, '/fire', {
      host: 'evil.example',
      headers: { authorization: 'Bearer test-token' },
      body: JSON.stringify(fireEnvelope('m-evil-token')),
    });
    assert.equal(r.status, 200, r.text);
  });

  await t.test('Origin header matching Host counts as same-origin', async () => {
    const u = new URL(base);
    const r = await api(base, 'POST', '/fire', { json: fireEnvelope('m-origin'), headers: { origin: `http://${u.host}` } });
    assert.equal(r.status, 200, r.text);
    const bad = await api(base, 'POST', '/fire', { json: fireEnvelope('m-origin2'), headers: { origin: 'http://other.example' } });
    assert.equal(bad.status, 401);
  });

  await t.test('text/plain body: auth runs first (401), then 415 once authorized', async () => {
    // Order: requireAuth wraps the handler, so an unauthenticated request never reads the body.
    const r = await api(base, 'POST', '/fire', { body: 'hello', headers: { 'content-type': 'text/plain' } });
    assert.equal(r.status, 401);
    const r2 = await api(base, 'POST', '/fire', { body: 'hello', headers: { 'content-type': 'text/plain' }, token: 'test-token' });
    assert.equal(r2.status, 415);
    assert.equal(r2.json.error, 'unsupported_media_type');
  });

  await t.test('invalid envelope -> 400 invalid_envelope', async () => {
    const r = await api(base, 'POST', '/fire', { json: { type: 'nope' }, token: 'test-token' });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_envelope');
    const r2 = await api(base, 'POST', '/fire', { json: { type: 'fire' }, token: 'test-token' });
    assert.equal(r2.status, 400);
    assert.match(r2.json.message, /trigger/);
  });

  await t.test('volume 1.7 is clamped and remembered in state for new subscribers', async () => {
    const r = await api(base, 'POST', '/fire', { json: { type: 'volume', volume: 1.7 }, token: 'test-token' });
    assert.equal(r.status, 200, r.text);
    const sse = await sseClient(base, { role: 'overlay' });
    t.after(() => sse.close());
    const state = await sse.next('state');
    assert.equal(state.volume, 1);
  });
});

test('/api/fire', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;
  const auth = { token: 'test-token' };

  await t.test('without auth -> 401', async () => {
    const r = await api(base, 'POST', '/api/fire', { json: { id: 'lol' } });
    assert.equal(r.status, 401);
  });

  await t.test('{id} twice within cooldown -> fired, then blocked by cooldown', async () => {
    const sse = await sseClient(base, { role: 'overlay' });
    t.after(() => sse.close());
    await sse.next('state');
    const r1 = await api(base, 'POST', '/api/fire', { json: { id: 'lol' }, ...auth });
    assert.equal(r1.status, 200, r1.text);
    assert.equal(r1.json.fired, true);
    assert.equal(typeof r1.json.id, 'string');
    const msg = await sse.next('fire');
    assert.equal(msg.id, r1.json.id);
    assert.equal(msg.trigger.id, 'lol');
    assert.equal(msg.source, 'API');
    assert.ok(!Object.keys(msg.trigger).some((k) => k.startsWith('_')), 'internal keys stripped');

    const r2 = await api(base, 'POST', '/api/fire', { json: { id: 'lol', source: 'Deck' }, ...auth });
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.fired, false);
    assert.equal(r2.json.reason, 'cooldown');
    assert.equal(r2.json.id, 'lol');
    // Note: helper's next() does not mark waiter-resolved events consumed, so count events instead.
    await new Promise((r3) => setTimeout(r3, 300));
    assert.equal(sse.events.filter((e) => e.msg.type === 'fire').length, 1, 'blocked fire is not broadcast');
  });

  await t.test('force:true fires despite cooldown', async () => {
    const r = await api(base, 'POST', '/api/fire', { json: { id: 'lol', force: true, source: 'Deck' }, ...auth });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.fired, true);
  });

  await t.test('unknown id -> 404 unknown_trigger', async () => {
    const r = await api(base, 'POST', '/api/fire', { json: { id: 'does-not-exist' }, ...auth });
    assert.equal(r.status, 404);
    assert.equal(r.json.error, 'unknown_trigger');
  });

  await t.test('neither id nor trigger -> 400', async () => {
    const r = await api(base, 'POST', '/api/fire', { json: { source: 'x' }, ...auth });
    assert.equal(r.status, 400);
  });

  await t.test('ad-hoc {trigger} fires and reaches an overlay', async () => {
    const sse = await sseClient(base, { role: 'overlay' });
    t.after(() => sse.close());
    await sse.next('state');
    const r = await api(base, 'POST', '/api/fire', { json: { trigger: { label: 'adhoc', visual: { kind: 'card', emoji: '🐸' } } }, ...auth });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.fired, true);
    const msg = await sse.next('fire');
    assert.equal(msg.id, r.json.id);
    assert.equal(msg.trigger.label, 'adhoc');
    assert.equal(msg.trigger.visual.emoji, '🐸');
    assert.equal(msg.source, 'API');
  });

  await t.test('invalid trigger -> 400 invalid_trigger', async () => {
    const r = await api(base, 'POST', '/api/fire', { json: { trigger: 'nope' }, ...auth });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_trigger');
  });
});

test('/api/config', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;

  await t.test('same-origin -> token is test-token', async () => {
    const r = await api(base, 'GET', '/api/config', { headers: SAME_ORIGIN });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.token, 'test-token');
    assert.equal(typeof r.json.version, 'string');
    assert.equal(typeof r.json.smart, 'object');
    assert.equal(typeof r.json.smart.available, 'boolean');
    assert.equal(r.json.limits.assetBytes, 8 * 1024 * 1024);
  });

  await t.test('without auth -> 401', async () => {
    const r = await api(base, 'GET', '/api/config');
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'unauthorized');
  });
});

test('auth unit: loadOrCreateToken + hostAllowed + isAuthorized', async (t) => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const auth = require('../server/auth');
  const saved = { token: process.env.LIVEFX_TOKEN, hosts: process.env.LIVEFX_ALLOWED_HOSTS };
  t.after(() => {
    if (saved.token === undefined) delete process.env.LIVEFX_TOKEN;
    else process.env.LIVEFX_TOKEN = saved.token;
    if (saved.hosts === undefined) delete process.env.LIVEFX_ALLOWED_HOSTS;
    else process.env.LIVEFX_ALLOWED_HOSTS = saved.hosts;
  });

  await t.test('creates data/token.txt once (32 hex, mode 0600) and reuses it', () => {
    delete process.env.LIVEFX_TOKEN;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-auth-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const logs = [];
    const tok = auth.loadOrCreateToken({ dataDir: dir, log: (m) => logs.push(m) });
    assert.match(tok, /^[0-9a-f]{32}$/);
    const file = path.join(dir, 'token.txt');
    assert.equal(fs.readFileSync(file, 'utf8').trim(), tok);
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.ok(logs.some((l) => l.includes(file)));
    assert.equal(auth.loadOrCreateToken({ dataDir: dir }), tok);
    process.env.LIVEFX_TOKEN = 'env-wins';
    assert.equal(auth.loadOrCreateToken({ dataDir: dir }), 'env-wins');
  });

  await t.test('hostAllowed', () => {
    const req = (host) => ({ headers: host === undefined ? {} : { host } });
    for (const h of ['localhost', 'localhost:8787', '127.0.0.1:8787', '192.168.1.5', '[::1]:8787', '::1', '[fe80::1]', '10.0.0.1']) assert.equal(auth.hostAllowed(req(h)), true, h);
    for (const h of ['evil.example', 'evil.example:80', 'localhost.evil.example', '', undefined, '999.1.1.1']) assert.equal(auth.hostAllowed(req(h)), false, String(h));
    process.env.LIVEFX_ALLOWED_HOSTS = 'Stream-PC, obs.lan';
    assert.equal(auth.hostAllowed(req('stream-pc:8787')), true);
    assert.equal(auth.hostAllowed(req('OBS.LAN')), true);
    assert.equal(auth.hostAllowed(req('other.lan')), false);
    delete process.env.LIVEFX_ALLOWED_HOSTS;
  });

  await t.test('isAuthorized', () => {
    const tok = 'secret-token';
    const req = (headers) => ({ headers });
    assert.equal(auth.isAuthorized(req({ host: 'evil.example', authorization: `Bearer ${tok}` }), tok), true);
    assert.equal(auth.isAuthorized(req({ host: 'localhost', authorization: 'Bearer wrong-token' }), tok), false);
    assert.equal(auth.isAuthorized(req({ host: 'localhost', authorization: 'Bearer secret-toke' }), tok), false);
    assert.equal(auth.isAuthorized(req({ host: 'localhost', 'sec-fetch-site': 'same-origin' }), tok), true);
    assert.equal(auth.isAuthorized(req({ host: 'localhost', 'sec-fetch-site': 'cross-site' }), tok), false);
    assert.equal(auth.isAuthorized(req({ host: 'localhost:8787', origin: 'http://localhost:8787' }), tok), true);
    assert.equal(auth.isAuthorized(req({ host: 'localhost:8787', origin: 'http://localhost:9999' }), tok), false);
    assert.equal(auth.isAuthorized(req({ host: 'evil.example', 'sec-fetch-site': 'same-origin' }), tok), false);
    assert.equal(auth.isAuthorized(req({ host: 'localhost' }), tok), false);
  });
});
