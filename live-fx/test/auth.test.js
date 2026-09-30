// Auth model: forged same-origin headers are not enough off-host; loopback, panel cookie or Bearer are.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const auth = require('../server/auth');
const { startServer, api, sseClient } = require('./helpers/server');

const TOKEN = 'abcdef0123456789abcdef0123456789';
const req = (headers, remoteAddress = '10.0.0.5') => ({ headers, socket: { remoteAddress } });

test('isAuthorized: forged sec-fetch-site / Origin from another machine is rejected', () => {
  assert.strictEqual(auth.isAuthorized(req({ host: '192.168.1.20:8787', 'sec-fetch-site': 'same-origin' }), TOKEN), false);
  assert.strictEqual(auth.isAuthorized(req({ host: '192.168.1.20:8787', origin: 'http://192.168.1.20:8787' }), TOKEN), false);
});

test('isAuthorized: loopback socket, panel cookie or Bearer pass', () => {
  assert.strictEqual(auth.isAuthorized(req({ host: '127.0.0.1:8787', 'sec-fetch-site': 'same-origin' }, '127.0.0.1'), TOKEN), true);
  assert.strictEqual(auth.isAuthorized(req({ host: '192.168.1.20:8787', 'sec-fetch-site': 'same-origin', cookie: `x=1; livefx=${TOKEN}` }), TOKEN), true);
  assert.strictEqual(auth.isAuthorized(req({ host: '192.168.1.20:8787', 'sec-fetch-site': 'same-origin', cookie: 'livefx=wrong' }), TOKEN), false);
  assert.strictEqual(auth.isAuthorized(req({ host: 'evil.example', authorization: `Bearer ${TOKEN}` }), TOKEN), true);
  assert.strictEqual(auth.isAuthorized(req({ host: '127.0.0.1', cookie: `livefx=${TOKEN}` }), TOKEN), false, 'cookie alone without same-origin signal is not enough');
});

test('server: panel page sets the HttpOnly cookie; read routes reject foreign Hosts; replay honours audience', async () => {
  const server = await startServer();
  try {
    const page = await fetch(`${server.base}/`);
    assert.match(page.headers.get('set-cookie') || '', new RegExp(`^livefx=${server.token}; HttpOnly; SameSite=Strict; Path=/`));
    assert.strictEqual((await fetch(`${server.base}/overlay.html`)).headers.get('set-cookie'), null, 'overlay gets no cookie');

    const evilStatus = await new Promise((resolve, reject) => {
      const u = new URL(server.base);
      require('http').get({ host: u.hostname, port: u.port, path: '/api/triggers', headers: { host: 'evil.example' } }, (r) => {
        r.resume();
        resolve(r.statusCode);
      }).on('error', reject);
    });
    assert.strictEqual(evilStatus, 403);
    assert.strictEqual((await api(server.base, 'GET', '/api/triggers')).status, 200);

    const overlay = await sseClient(server.base, { role: 'overlay' });
    await overlay.next('state');
    await api(server.base, 'POST', '/api/transcript', { json: { text: 'geheimer satz' }, token: server.token });
    await api(server.base, 'POST', '/fire', { json: { type: 'volume', volume: 0.5 }, token: server.token });
    await overlay.next('volume');
    overlay.close();
    const re = await sseClient(server.base, { role: 'overlay', lastEventId: 0 });
    await re.next('state');
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(re.events.some((e) => e.msg.type === 'volume'), 'volume replayed');
    assert.ok(!re.events.some((e) => e.msg.type === 'transcript'), 'panel-only transcript not replayed to an overlay');
    re.close();
  } finally {
    await server.stop();
  }
});
