// Unit tests for /api/gifs (status, keys, search, import) – mock provider only, never the real Tenor/Giphy.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, api } = require('./helpers/server');

const TOKEN = 'test-token';

test('gifs API (mock provider)', async (t) => {
  const server = await startServer({ env: { LIVEFX_GIF_MOCK: '1' } });
  const { base, dataDir } = server;
  t.after(() => server.stop());
  const port = new URL(base).port;

  await t.test('status shows mock providers and no keys', async () => {
    const r = await api(base, 'GET', '/api/gifs/status');
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true, providers: { tenor: true, giphy: true }, mock: true });
  });

  await t.test('search without auth -> 401', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze');
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'unauthorized');
  });

  await t.test('search returns 6 normalized results, q echoed in titles', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze&lang=de', { token: TOKEN });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.provider, 'tenor');
    assert.equal(r.json.mock, true);
    assert.equal(r.json.results.length, 6);
    for (const res of r.json.results) {
      assert.deepEqual(Object.keys(res).sort(), ['height', 'id', 'preview', 'title', 'url', 'width']);
      assert.ok(res.title.includes('katze'), res.title);
      assert.match(res.url, new RegExp(`^http://127\\.0\\.0\\.1:${port}/api/gifs/mock/\\d+\\.gif$`));
      assert.equal(res.preview, res.url);
      assert.ok(res.width > 0 && res.height > 0);
    }
    const g = await api(base, 'GET', '/api/gifs/search?q=hund&provider=giphy', { token: TOKEN });
    assert.equal(g.json.provider, 'giphy');
    assert.ok(g.json.results[0].title.includes('Giphy'));
    // same-origin browser call passes too
    const so = await api(base, 'GET', '/api/gifs/search?q=katze', { headers: { 'sec-fetch-site': 'same-origin' } });
    assert.equal(so.status, 200);
  });

  await t.test('limit clamped, empty q -> 400, bad provider -> 400', async () => {
    const one = await api(base, 'GET', '/api/gifs/search?q=x&limit=1', { token: TOKEN });
    assert.equal(one.json.results.length, 1);
    const zero = await api(base, 'GET', '/api/gifs/search?q=x&limit=0', { token: TOKEN });
    assert.equal(zero.json.results.length, 1, 'limit 0 clamps to 1');
    const huge = await api(base, 'GET', '/api/gifs/search?q=x&limit=9999', { token: TOKEN });
    assert.equal(huge.status, 200);
    assert.equal(huge.json.results.length, 6, 'mock has 6 results max');
    const empty = await api(base, 'GET', '/api/gifs/search?q=%20%20', { token: TOKEN });
    assert.equal(empty.status, 400);
    assert.equal(empty.json.error, 'bad_query');
    const none = await api(base, 'GET', '/api/gifs/search', { token: TOKEN });
    assert.equal(none.status, 400);
    const bad = await api(base, 'GET', '/api/gifs/search?q=x&provider=imgur', { token: TOKEN });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'bad_provider');
  });

  await t.test('mock gif route serves a valid GIF', async () => {
    const res = await fetch(`${base}/api/gifs/mock/1.gif`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/gif');
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.toString('latin1', 0, 6), 'GIF89a');
    const bad = await fetch(`${base}/api/gifs/mock/x.gif`);
    assert.equal(bad.status, 404);
  });

  await t.test('import of a mock url -> asset listed and served as image/gif', async () => {
    const s = await api(base, 'GET', '/api/gifs/search?q=katze', { token: TOKEN });
    const first = s.json.results[0];
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url: first.url }, token: TOKEN });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    const a = r.json.asset;
    assert.deepEqual(Object.keys(a).sort(), ['mtime', 'name', 'size', 'type', 'url']);
    assert.equal(a.type, 'image');
    assert.equal(a.url, `assets/${a.name}`);
    assert.match(a.name, /^gif-.*\.gif$/);
    assert.equal(a.size, 43);
    const list = await api(base, 'GET', '/api/assets');
    assert.ok(list.json.assets.some((x) => x.name === a.name), 'listed');
    const served = await fetch(`${base}/${a.url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/gif');
    assert.equal(Buffer.from(await served.arrayBuffer()).toString('latin1', 0, 6), 'GIF89a');
    assert.ok(fs.existsSync(path.join(dataDir, 'assets', a.name)));
  });

  await t.test('import with a custom name: sanitized, extension forced, collisions numbered', async () => {
    const url = `http://127.0.0.1:${port}/api/gifs/mock/2.gif`;
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url, name: 'Lustige Katze (final).png' }, token: TOKEN });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.asset.name, 'lustige-katze-final.gif');
    const r2 = await api(base, 'POST', '/api/gifs/import', { json: { url, name: 'Lustige Katze (final)' }, token: TOKEN });
    assert.equal(r2.json.asset.name, 'lustige-katze-final-2.gif');
    const trav = await api(base, 'POST', '/api/gifs/import', { json: { url, name: '../../evil' }, token: TOKEN });
    assert.equal(trav.status, 200);
    assert.equal(trav.json.asset.name, 'evil.gif');
  });

  await t.test('import: non-allow-listed hosts / http / IPs rejected without a network call', async () => {
    const cases = [
      'https://example.com/x.gif',
      'http://media.tenor.com/x.gif',
      'https://10.0.0.1/x.gif',
      'https://[::1]/x.gif',
      'https://evil-tenor.com/x.gif',
      'https://tenor.com.evil.net/x.gif',
      'https://user:pw@media.giphy.com/x.gif',
      `http://127.0.0.1:${Number(port) + 1}/api/gifs/mock/1.gif`,
      'ftp://media.giphy.com/x.gif',
    ];
    for (const url of cases) {
      const started = Date.now();
      const r = await api(base, 'POST', '/api/gifs/import', { json: { url }, token: TOKEN });
      assert.equal(r.status, 400, `${url}: ${r.text}`);
      assert.equal(r.json.error, 'host_not_allowed', url);
      assert.ok(Date.now() - started < 1500, `${url} answered without a network round trip`);
    }
    const noUrl = await api(base, 'POST', '/api/gifs/import', { json: {}, token: TOKEN });
    assert.equal(noUrl.status, 400);
    const junk = await api(base, 'POST', '/api/gifs/import', { json: { url: 'not a url' }, token: TOKEN });
    assert.equal(junk.status, 400);
    const noAuth = await api(base, 'POST', '/api/gifs/import', { json: { url: `http://127.0.0.1:${port}/api/gifs/mock/1.gif` } });
    assert.equal(noAuth.status, 401);
  });

  await t.test('import: non-image body -> 415', async () => {
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `${base}/health` }, token: TOKEN });
    assert.equal(r.status, 415, r.text);
    assert.equal(r.json.error, 'unsupported_type');
  });

  await t.test('keys never appear in status even in mock mode', async () => {
    const put = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: 'AIzaSyMockTenorKey123' }, token: TOKEN });
    assert.equal(put.status, 200, put.text);
    assert.ok(!put.text.includes('AIzaSyMockTenorKey123'));
    const st = await api(base, 'GET', '/api/gifs/status');
    assert.ok(!st.text.includes('AIzaSyMockTenorKey123'));
  });
});

test('gifs API (no provider, no mock)', async (t) => {
  const server = await startServer();
  const { base, dataDir } = server;
  t.after(() => server.stop());
  const port = new URL(base).port;

  await t.test('status: nothing configured', async () => {
    const r = await api(base, 'GET', '/api/gifs/status');
    assert.deepEqual(r.json, { ok: true, providers: { tenor: false, giphy: false }, mock: false });
  });

  await t.test('search -> 503 no_provider with German hint', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze', { token: TOKEN });
    assert.equal(r.status, 503);
    assert.equal(r.json.error, 'no_provider');
    assert.match(r.json.message, /GIFS\.md/);
  });

  await t.test('mock route and loopback import are unavailable outside mock mode', async () => {
    const m = await fetch(`${base}/api/gifs/mock/1.gif`);
    assert.equal(m.status, 404);
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `http://127.0.0.1:${port}/api/gifs/mock/1.gif` }, token: TOKEN });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'host_not_allowed');
  });

  await t.test('keys PUT/GET round trip, file mode 0600, keys never returned', async () => {
    const noAuth = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: 'AIzaSyTenorTestKey12345' } });
    assert.equal(noAuth.status, 401);
    const put = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: 'AIzaSyTenorTestKey12345' }, token: TOKEN });
    assert.equal(put.status, 200, put.text);
    assert.deepEqual(put.json.providers, { tenor: true, giphy: false });
    assert.ok(!put.text.includes('AIzaSyTenorTestKey12345'));
    const st = await api(base, 'GET', '/api/gifs/status');
    assert.deepEqual(st.json.providers, { tenor: true, giphy: false });
    assert.ok(!st.text.includes('AIzaSyTenorTestKey12345'));
    const file = path.join(dataDir, 'config.json');
    assert.ok(fs.existsSync(file));
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).tenorKey, 'AIzaSyTenorTestKey12345');

    const g = await api(base, 'PUT', '/api/gifs/keys', { json: { giphyKey: 'GiphyTestKey1234567890' }, token: TOKEN });
    assert.deepEqual(g.json.providers, { tenor: true, giphy: true });
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(cfg.tenorKey, 'AIzaSyTenorTestKey12345', 'other key kept');
    assert.equal(cfg.giphyKey, 'GiphyTestKey1234567890');

    const del = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: '' }, token: TOKEN });
    assert.deepEqual(del.json.providers, { tenor: false, giphy: true });
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).tenorKey, undefined);

    const bad = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: 'has spaces in it' }, token: TOKEN });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'bad_key');
    const notJson = await api(base, 'PUT', '/api/gifs/keys', { body: 'x', token: TOKEN, headers: { 'content-type': 'text/plain' } });
    assert.equal(notJson.status, 415);
  });

  await t.test('search with a configured key but unreachable upstream -> 502 (mock off, no real call succeeds)', async () => {
    // The sandbox cannot reach giphy; the important part is that the error is a clean 502/504, never a 500.
    const r = await api(base, 'GET', '/api/gifs/search?q=katze&provider=giphy', { token: TOKEN });
    assert.ok([502, 503].includes(r.status), `status ${r.status}: ${r.text}`);
    if (r.status === 502) assert.equal(r.json.error, 'upstream');
  });
});

test('gifs API: env keys and LIVEFX_ASSET_MAX', async (t) => {
  const server = await startServer({ env: { LIVEFX_GIF_MOCK: '1', LIVEFX_ASSET_MAX: '20' } });
  const { base } = server;
  t.after(() => server.stop());
  const port = new URL(base).port;

  await t.test('import over the limit -> 413', async () => {
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `http://127.0.0.1:${port}/api/gifs/mock/1.gif` }, token: TOKEN });
    assert.equal(r.status, 413, r.text);
    assert.equal(r.json.error, 'payload_too_large');
  });
});

test('gifs API: keys from environment', async (t) => {
  const server = await startServer({ env: { LIVEFX_GIPHY_KEY: 'EnvGiphyKey123456' } });
  const { base } = server;
  t.after(() => server.stop());
  const r = await api(base, 'GET', '/api/gifs/status');
  assert.deepEqual(r.json, { ok: true, providers: { tenor: false, giphy: true }, mock: false });
  assert.ok(!r.text.includes('EnvGiphyKey'));
});

test('gifs: provider normalizers (pure)', () => {
  const { normalizeTenor, normalizeGiphy, checkAllowed } = require('../server/api-gifs');
  const tenor = normalizeTenor({
    results: [
      { id: 'abc', content_description: 'Cat', media_formats: { gif: { url: 'https://media.tenor.com/a/b.gif', dims: [400, 300] }, tinygif: { url: 'https://media.tenor.com/a/t.gif' } } },
      { id: 'nourl', media_formats: {} },
      { id: 'http', media_formats: { gif: { url: 'http://media.tenor.com/x.gif' } } },
    ],
  });
  assert.deepEqual(tenor, [{ id: 'abc', title: 'Cat', preview: 'https://media.tenor.com/a/t.gif', url: 'https://media.tenor.com/a/b.gif', width: 400, height: 300 }]);
  const giphy = normalizeGiphy({
    data: [{ id: 'g1', title: 'Dog', images: { original: { url: 'https://media2.giphy.com/o.gif', width: '480', height: '270' }, fixed_width_small: { url: 'https://media2.giphy.com/s.gif' } } }],
  });
  assert.deepEqual(giphy, [{ id: 'g1', title: 'Dog', preview: 'https://media2.giphy.com/s.gif', url: 'https://media2.giphy.com/o.gif', width: 480, height: 270 }]);
  const fakeReq = { socket: { localPort: 1 } };
  for (const ok of ['https://media.tenor.com/x.gif', 'https://c.tenor.com/x.gif', 'https://media2.giphy.com/x.gif', 'https://i.giphy.com/x.gif']) {
    assert.equal(checkAllowed(ok, fakeReq).href, ok);
  }
  for (const bad of ['https://giphy.com.evil/x.gif', 'https://xgiphy.com/x.gif', 'https://127.0.0.1/x.gif', 'http://c.tenor.com/x.gif', 'https://192.168.1.1/x']) {
    assert.throws(() => checkAllowed(bad, fakeReq), (e) => e.code === 'host_not_allowed', bad);
  }
});
