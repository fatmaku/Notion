// server/api-mobile.js: GET /m?token= cookie handshake, rate limit, and the /api/config fields the
// "Handy" card needs (lanIps, secure, port).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, api } = require('./helpers/server');
const { createLimiter, tokenMatches } = require('../server/api-mobile');

const SAME_ORIGIN = { 'sec-fetch-site': 'same-origin' };

/** Raw GET without following redirects (fetch would follow the 302). */
function rawGet(base, p, headers = {}) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    http
      .get({ host: u.hostname, port: u.port, path: p, headers }, (res) => {
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
          resolve({ status: res.statusCode, headers: res.headers, json, text });
        });
      })
      .on('error', reject);
  });
}

test('GET /m – token handshake', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;

  await t.test('correct token -> 302 to /mobile.html with the HttpOnly panel cookie', async () => {
    const r = await rawGet(base, '/m?token=test-token');
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, '/mobile.html');
    const cookie = String(r.headers['set-cookie'] && r.headers['set-cookie'][0]);
    assert.ok(cookie.startsWith('livefx=test-token; HttpOnly'), cookie);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\//);
    assert.ok(!/Secure/.test(cookie), 'no Secure flag over plain http');
    assert.equal(r.headers['cache-control'], 'no-store');
  });

  await t.test('no token param -> 302 to /mobile.html without a cookie', async () => {
    const r = await rawGet(base, '/m');
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, '/mobile.html');
    assert.equal(r.headers['set-cookie'], undefined);
  });

  await t.test('wrong token -> 401 JSON (German), no cookie; same length wrong token too', async () => {
    const r = await rawGet(base, '/m?token=wrong');
    assert.equal(r.status, 401);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.error, 'unauthorized');
    assert.match(r.json.message, /Token/);
    assert.equal(r.headers['set-cookie'], undefined);
    const r2 = await rawGet(base, '/m?token=test-tokeX');
    assert.equal(r2.status, 401);
    const r3 = await rawGet(base, '/m?token=');
    assert.equal(r3.status, 401);
  });

  await t.test('10 wrong attempts per minute per address, the 11th -> 429; correct token still blocked', async () => {
    // Three failures already happened above (same 127.0.0.1 socket address) -> seven more reach the limit.
    for (let i = 0; i < 7; i++) {
      const r = await rawGet(base, `/m?token=nope-${i}`);
      assert.equal(r.status, 401, `attempt ${i + 4}`);
    }
    const r = await rawGet(base, '/m?token=nope-final');
    assert.equal(r.status, 429);
    assert.equal(r.json.error, 'rate_limited');
    assert.match(r.json.message, /warten/);
    const ok = await rawGet(base, '/m?token=test-token');
    assert.equal(ok.status, 429, 'limit applies before the compare');
  });

  await t.test('/m is not a fallthrough to static (HEAD/POST -> 404)', async () => {
    const r = await api(base, 'POST', '/m?token=test-token');
    assert.equal(r.status, 404);
  });
});

test('/api/config carries lanIps, secure and port', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const r = await api(server.base, 'GET', '/api/config', { headers: SAME_ORIGIN });
  assert.equal(r.status, 200, r.text);
  assert.ok(Array.isArray(r.json.lanIps));
  for (const ip of r.json.lanIps) assert.match(ip, /^\d{1,3}(\.\d{1,3}){3}$/);
  assert.ok(!r.json.lanIps.includes('127.0.0.1'));
  assert.equal(r.json.secure, false);
  assert.equal(typeof r.json.port, 'number');
  assert.equal(r.json.port, Number(new URL(server.base).port), 'port is the actually bound one');
});

test('unit: tokenMatches + createLimiter', () => {
  assert.equal(tokenMatches('abc', 'abc'), true);
  assert.equal(tokenMatches('abc', 'abd'), false);
  assert.equal(tokenMatches('abc', 'abcd'), false);
  assert.equal(tokenMatches('', ''), false);
  assert.equal(tokenMatches(undefined, 'abc'), false);

  let now = 1000;
  const lim = createLimiter({ max: 2, windowMs: 100, now: () => now });
  assert.equal(lim.blocked('a'), false);
  lim.fail('a');
  lim.fail('a');
  assert.equal(lim.blocked('a'), true);
  assert.equal(lim.blocked('b'), false, 'per address');
  now += 101;
  assert.equal(lim.blocked('a'), false, 'window expired');
  lim.fail('a');
  lim.reset('a');
  assert.equal(lim.blocked('a'), false);
});
