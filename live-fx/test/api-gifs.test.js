// Unit tests for /api/gifs (status, keys, search, import) – mock provider and a local upstream stub only,
// never the real KLIPY/GIPHY.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { startServer, api } = require('./helpers/server');

const TOKEN = 'test-token';
const auth = { token: TOKEN };

test('gifs API (mock providers)', async (t) => {
  const server = await startServer({ env: { LIVEFX_GIF_MOCK: '1' } });
  const { base, dataDir } = server;
  t.after(() => server.stop());
  const port = new URL(base).port;
  const stats = async () => (await api(base, 'GET', '/api/gifs/mock-stats')).json;

  await t.test('status: klipy + giphy, klipy default, attribution strings, no tenor', async () => {
    const r = await api(base, 'GET', '/api/gifs/status');
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, {
      ok: true,
      providers: { klipy: true, giphy: true },
      mock: true,
      default: 'klipy',
      attribution: { klipy: 'Powered by KLIPY', giphy: 'Powered By GIPHY' },
    });
  });

  await t.test('search without auth -> 401', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze');
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'unauthorized');
  });

  await t.test('klipy (default): rating=g + locale sent, unsafe results filtered, hotlinks on static.klipy.com', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze&lang=de', auth);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.provider, 'klipy');
    assert.equal(r.json.attribution, 'Powered by KLIPY');
    assert.equal(r.json.mock, true);
    assert.equal(r.json.results.length, 6);
    assert.equal(r.json.filtered, 3, 'beer title, gun tag and church slug removed');
    for (const res of r.json.results) {
      assert.deepEqual(Object.keys(res).sort(), ['height', 'id', 'preview', 'provider', 'title', 'url', 'width']);
      assert.ok(res.title.includes('katze'), res.title);
      assert.ok(!/beer|funny|crowd/.test(res.title), res.title);
      assert.equal(res.provider, 'klipy');
      assert.match(res.url, /^https:\/\/static\.klipy\.com\/mock\/\d+\/md\.webp$/, 'small webp rendition');
      assert.match(res.preview, new RegExp(`^http://127\\.0\\.0\\.1:${port}/api/gifs/mock/\\d+\\.gif$`));
      assert.ok(res.width > 0 && res.height > 0);
    }
    const s = await stats();
    assert.equal(s.last.provider, 'klipy');
    assert.equal(s.last.host, 'api.klipy.com');
    assert.equal(s.last.path, '/v2/search');
    assert.equal(s.last.params.rating, 'g');
    assert.equal(s.last.params.contentfilter, 'high');
    assert.equal(s.last.params.locale, 'de_DE');
    assert.equal(s.last.params.country, 'DE');
    assert.equal(s.last.params.q, 'katze');
    const tr = await api(base, 'GET', '/api/gifs/search?q=kedi&lang=tr', auth);
    assert.equal(tr.status, 200);
    assert.equal((await stats()).last.params.locale, 'tr_TR');
  });

  await t.test('giphy: rating=g + lang sent, attribution „Powered By GIPHY“, webp hotlinks', async () => {
    const g = await api(base, 'GET', '/api/gifs/search?q=hund&provider=giphy&lang=tr', auth);
    assert.equal(g.status, 200, g.text);
    assert.equal(g.json.provider, 'giphy');
    assert.equal(g.json.attribution, 'Powered By GIPHY');
    assert.equal(g.json.results.length, 6);
    assert.ok(g.json.results.every((x) => /^https:\/\/media\.giphy\.com\/media\/mock\d+\/200\.webp$/.test(x.url)));
    const s = await stats();
    assert.equal(s.last.provider, 'giphy');
    assert.equal(s.last.host, 'api.giphy.com');
    assert.equal(s.last.params.rating, 'g');
    assert.equal(s.last.params.lang, 'tr');
    assert.equal(s.last.params.api_key, undefined, 'keys never exposed');
    const de = await api(base, 'GET', '/api/gifs/search?q=hund&provider=giphy&lang=de-DE', auth);
    assert.equal(de.json.lang, 'de');
    assert.equal((await stats()).last.params.lang, 'de');
    const xx = await api(base, 'GET', '/api/gifs/search?q=hund&provider=giphy&lang=fr', auth);
    assert.equal(xx.json.lang, 'en', 'unknown language falls back to en');
  });

  await t.test('blocked queries never reach the provider', async () => {
    const before = (await stats()).calls;
    const cases = [
      ['Kirche', 'religion'],
      ['cami', 'religion'],
      ['election', 'politics'],
      ['gun', 'violence'],
      ['b1er', 'drugs'],
      ['sexy', 'nsfw'],
      ['n a z i', 'hate'],
    ];
    for (const [q, reason] of cases) {
      for (const provider of ['klipy', 'giphy']) {
        const r = await api(base, 'GET', `/api/gifs/search?q=${encodeURIComponent(q)}&provider=${provider}&lang=de`, auth);
        assert.equal(r.status, 200, r.text);
        assert.equal(r.json.ok, true);
        assert.equal(r.json.blocked, true, q);
        assert.equal(r.json.reason, reason, q);
        assert.deepEqual(r.json.results, []);
        assert.match(r.json.message, /^Dieser Suchbegriff ist gesperrt/);
        assert.equal(r.json.attribution, provider === 'giphy' ? 'Powered By GIPHY' : 'Powered by KLIPY');
      }
    }
    const tr = await api(base, 'GET', '/api/gifs/search?q=cami&lang=tr', auth);
    assert.match(tr.json.message, /engellendi/);
    assert.equal((await stats()).calls, before, 'no provider request for blocked queries');
    const ok = await api(base, 'GET', '/api/gifs/search?q=krass', auth);
    assert.equal(ok.json.blocked, undefined);
    assert.equal((await stats()).calls, before + 1);
  });

  await t.test('tenor removed: 410 provider_removed with a clear hint', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze&provider=tenor', auth);
    assert.equal(r.status, 410);
    assert.equal(r.json.error, 'provider_removed');
    assert.match(r.json.message, /Tenor.*30\.06\.2026.*KLIPY/);
    const k = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: 'AIzaSyOldTenorKey123' }, ...auth });
    assert.equal(k.status, 410);
    assert.equal(k.json.error, 'provider_removed');
  });

  await t.test('limit clamped, empty q -> 400, bad provider -> 400', async () => {
    const one = await api(base, 'GET', '/api/gifs/search?q=x&limit=1', auth);
    assert.equal(one.json.results.length, 1);
    const zero = await api(base, 'GET', '/api/gifs/search?q=x&limit=0', auth);
    assert.equal(zero.json.results.length, 1, 'limit 0 clamps to 1');
    const huge = await api(base, 'GET', '/api/gifs/search?q=x&limit=9999', auth);
    assert.equal(huge.status, 200);
    assert.equal(huge.json.results.length, 6, 'mock has 6 safe results max');
    const empty = await api(base, 'GET', '/api/gifs/search?q=%20%20', auth);
    assert.equal(empty.status, 400);
    assert.equal(empty.json.error, 'bad_query');
    const long = await api(base, 'GET', `/api/gifs/search?q=${'a'.repeat(201)}`, auth);
    assert.equal(long.status, 400);
    const bad = await api(base, 'GET', '/api/gifs/search?q=x&provider=imgur', auth);
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'bad_provider');
  });

  await t.test('mock gif route serves a valid GIF', async () => {
    const res = await fetch(`${base}/api/gifs/mock/1.gif`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/gif');
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.toString('latin1', 0, 6), 'GIF89a');
    assert.equal((await fetch(`${base}/api/gifs/mock/x.gif`)).status, 404);
  });

  await t.test('import refused for provider media (403 provider_terms) – nothing stored', async () => {
    const s = await api(base, 'GET', '/api/gifs/search?q=katze', auth);
    const g = await api(base, 'GET', '/api/gifs/search?q=katze&provider=giphy', auth);
    const urls = [
      s.json.results[0].url,
      g.json.results[0].url,
      'https://i.giphy.com/abc.gif',
      'https://media4.giphy.com/media/x/giphy.gif',
      'https://static.klipy.com/x.gif',
      'https://media.tenor.com/x.gif',
    ];
    for (const url of urls) {
      const r = await api(base, 'POST', '/api/gifs/import', { json: { url }, ...auth });
      assert.equal(r.status, 403, `${url}: ${r.text}`);
      assert.equal(r.json.error, 'provider_terms', url);
    }
    for (const provider of ['klipy', 'giphy']) {
      const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `${base}/api/gifs/mock/1.gif`, provider }, ...auth });
      assert.equal(r.status, 403);
      assert.equal(r.json.error, 'provider_terms');
    }
    assert.ok(!fs.existsSync(path.join(dataDir, 'assets')) || fs.readdirSync(path.join(dataDir, 'assets')).length === 0);
  });

  await t.test('import: other hosts / http / IPs rejected without a network call (SSRF guards)', async () => {
    const cases = [
      'https://example.com/x.gif',
      'http://media.giphy.com/x.gif',
      'https://10.0.0.1/x.gif',
      'https://[::1]/x.gif',
      'https://evil-giphy.com/x.gif',
      'https://giphy.com.evil.net/x.gif',
      'https://klipy.com.evil.net/x.gif',
      'https://user:pw@media.giphy.com/x.gif',
      `http://127.0.0.1:${Number(port) + 1}/api/gifs/mock/1.gif`,
      `http://127.0.0.1:${port}/api/assets`,
      'ftp://media.giphy.com/x.gif',
    ];
    for (const url of cases) {
      const started = Date.now();
      const r = await api(base, 'POST', '/api/gifs/import', { json: { url }, ...auth });
      assert.equal(r.status, 400, `${url}: ${r.text}`);
      assert.equal(r.json.error, 'host_not_allowed', url);
      assert.ok(Date.now() - started < 1500, `${url} answered without a network round trip`);
    }
    assert.equal((await api(base, 'POST', '/api/gifs/import', { json: {}, ...auth })).status, 400);
    assert.equal((await api(base, 'POST', '/api/gifs/import', { json: { url: 'not a url' }, ...auth })).status, 400);
    const noAuth = await api(base, 'POST', '/api/gifs/import', { json: { url: `${base}/api/gifs/mock/1.gif` } });
    assert.equal(noAuth.status, 401);
  });

  await t.test('loopback mock route still exercises the guarded download path (tests only)', async () => {
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `http://127.0.0.1:${port}/api/gifs/mock/2.gif`, name: 'Lustige Katze (final).png' }, ...auth });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.asset.name, 'lustige-katze-final.gif');
    assert.equal(r.json.asset.size, 43);
  });

  await t.test('keys never appear in responses even in mock mode', async () => {
    const put = await api(base, 'PUT', '/api/gifs/keys', { json: { klipyKey: 'KlipyMockKey123456' }, ...auth });
    assert.equal(put.status, 200, put.text);
    assert.ok(!put.text.includes('KlipyMockKey123456'));
    const st = await api(base, 'GET', '/api/gifs/status');
    assert.ok(!st.text.includes('KlipyMockKey123456'));
  });
});

/** Local stand-in for api.klipy.com / api.giphy.com: records every request. */
function startStub() {
  const seen = [];
  let mode = 'ok';
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://stub');
    seen.push(u);
    if (mode === 'error') {
      res.writeHead(500);
      return res.end('boom');
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    if (u.pathname === '/klipy/v2/search') {
      return res.end(
        JSON.stringify({
          results: [
            { id: 'k1', title: 'Cat', tags: ['cat'], media_formats: { mediumgif: { url: 'https://static.klipy.com/k1/m.gif', dims: [220, 200] }, tinygif: { url: 'https://static.klipy.com/k1/t.gif', dims: [110, 100] } } },
            { id: 'k2', title: 'Cat with a gun', media_formats: { gif: { url: 'https://static.klipy.com/k2.gif', dims: [1, 1] } } },
            { id: 'k3', title: 'Cat elsewhere', media_formats: { gif: { url: 'https://evil.example/k3.gif', dims: [1, 1] } } },
            { id: 'k4', title: 'Cat', tags: ['wahlkampf'], media_formats: { gif: { url: 'https://static.klipy.com/k4.gif', dims: [1, 1] } } },
          ],
        })
      );
    }
    return res.end(
      JSON.stringify({
        data: [
          { id: 'g1', title: 'Dog', slug: 'dog-g1', images: { fixed_height: { url: 'https://media1.giphy.com/g1/200.gif', webp: 'https://media1.giphy.com/g1/200.webp', width: '300', height: '200' } } },
          { id: 'g2', title: 'Dog', slug: 'dog-in-a-mosque-g2', images: { fixed_height: { url: 'https://media1.giphy.com/g2/200.gif', width: '300', height: '200' } } },
        ],
      })
    );
  });
  return new Promise((resolve) =>
    srv.listen(0, '127.0.0.1', () =>
      resolve({
        base: `http://127.0.0.1:${srv.address().port}`,
        seen,
        setMode: (m) => (mode = m),
        close: () => new Promise((r) => srv.close(r)),
      })
    )
  );
}

test('gifs API against a local upstream stub (real request path)', async (t) => {
  const stub = await startStub();
  t.after(() => stub.close());
  const server = await startServer({ env: { LIVEFX_GIF_UPSTREAM: stub.base, LIVEFX_KLIPY_KEY: 'EnvKlipyKey12345', LIVEFX_GIPHY_KEY: 'EnvGiphyKey12345' } });
  const { base } = server;
  t.after(() => server.stop());

  await t.test('klipy: Tenor-v2-compatible request with key, rating=g, contentfilter=high, locale', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze&lang=de&limit=10', auth);
    assert.equal(r.status, 200, r.text);
    assert.equal(stub.seen.length, 1);
    const u = stub.seen[0];
    assert.equal(u.pathname, '/klipy/v2/search');
    assert.equal(u.searchParams.get('key'), 'EnvKlipyKey12345');
    assert.equal(u.searchParams.get('q'), 'katze');
    assert.equal(u.searchParams.get('rating'), 'g');
    assert.equal(u.searchParams.get('contentfilter'), 'high');
    assert.equal(u.searchParams.get('locale'), 'de_DE');
    assert.equal(u.searchParams.get('limit'), '10');
    assert.equal(r.json.attribution, 'Powered by KLIPY');
    assert.deepEqual(r.json.results, [
      { id: 'k1', title: 'Cat', preview: 'https://static.klipy.com/k1/t.gif', url: 'https://static.klipy.com/k1/m.gif', width: 220, height: 200, provider: 'klipy' },
    ]);
    assert.equal(r.json.filtered, 2, 'gun title and wahlkampf tag filtered; foreign host dropped earlier');
  });

  await t.test('giphy: rating=g and lang, slug filter, prefers webp', async () => {
    const before = stub.seen.length;
    const r = await api(base, 'GET', '/api/gifs/search?q=hund&provider=giphy&lang=tr', auth);
    assert.equal(r.status, 200, r.text);
    assert.equal(stub.seen.length, before + 1);
    const u = stub.seen[stub.seen.length - 1];
    assert.equal(u.pathname, '/giphy/v1/gifs/search');
    assert.equal(u.searchParams.get('api_key'), 'EnvGiphyKey12345');
    assert.equal(u.searchParams.get('rating'), 'g');
    assert.equal(u.searchParams.get('lang'), 'tr');
    assert.equal(r.json.attribution, 'Powered By GIPHY');
    assert.deepEqual(r.json.results.map((x) => [x.id, x.url]), [['g1', 'https://media1.giphy.com/g1/200.webp']]);
    assert.equal(r.json.filtered, 1);
  });

  await t.test('blocked query: zero upstream requests', async () => {
    const before = stub.seen.length;
    for (const q of ['Kirche', 'präsident', 'Pistole', 'v0dka', 'porno']) {
      for (const provider of ['klipy', 'giphy']) {
        const r = await api(base, 'GET', `/api/gifs/search?q=${encodeURIComponent(q)}&provider=${provider}`, auth);
        assert.equal(r.json.blocked, true, q);
      }
    }
    assert.equal(stub.seen.length, before, 'stub never contacted');
  });

  await t.test('no response caching (provider terms): every search hits the provider', async () => {
    const before = stub.seen.length;
    await api(base, 'GET', '/api/gifs/search?q=katze&lang=de&limit=10', auth);
    await api(base, 'GET', '/api/gifs/search?q=katze&lang=de&limit=10', auth);
    assert.equal(stub.seen.length, before + 2);
  });

  await t.test('upstream error -> clean 502', async () => {
    stub.setMode('error');
    const r = await api(base, 'GET', '/api/gifs/search?q=katze', auth);
    stub.setMode('ok');
    assert.equal(r.status, 502);
    assert.equal(r.json.error, 'upstream');
    assert.match(r.json.message, /HTTP 500/);
  });
});

test('gifs API (no provider, no mock)', async (t) => {
  const server = await startServer();
  const { base, dataDir } = server;
  t.after(() => server.stop());
  const port = new URL(base).port;
  const file = path.join(dataDir, 'config.json');

  await t.test('status: nothing configured', async () => {
    const r = await api(base, 'GET', '/api/gifs/status');
    assert.deepEqual(r.json.providers, { klipy: false, giphy: false });
    assert.equal(r.json.default, null);
    assert.equal(r.json.mock, false);
    assert.equal(r.json.tenorRemoved, undefined);
  });

  await t.test('search -> 503 no_provider with German hint; blocked queries still answered', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze', auth);
    assert.equal(r.status, 503);
    assert.equal(r.json.error, 'no_provider');
    assert.match(r.json.message, /KLIPY.*GIFS\.md/);
    const b = await api(base, 'GET', '/api/gifs/search?q=church', auth);
    assert.equal(b.status, 200);
    assert.equal(b.json.blocked, true);
    assert.equal(b.json.provider, null);
  });

  await t.test('mock routes and loopback import are unavailable outside mock mode', async () => {
    assert.equal((await fetch(`${base}/api/gifs/mock/1.gif`)).status, 404);
    assert.equal((await fetch(`${base}/api/gifs/mock-stats`)).status, 404);
    const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `http://127.0.0.1:${port}/api/gifs/mock/1.gif` }, ...auth });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'host_not_allowed');
  });

  await t.test('old tenor config: status flags it, search explains the shutdown, PUT tenorKey "" cleans up', async () => {
    fs.writeFileSync(file, JSON.stringify({ tenorKey: 'AIzaSyLeftoverTenor1' }));
    const st = await api(base, 'GET', '/api/gifs/status');
    assert.equal(st.json.tenorRemoved, true);
    assert.match(st.json.notice, /Tenor/);
    assert.deepEqual(st.json.providers, { klipy: false, giphy: false });
    assert.ok(!st.text.includes('AIzaSyLeftoverTenor1'));
    const s = await api(base, 'GET', '/api/gifs/search?q=katze', auth);
    assert.equal(s.status, 503);
    assert.match(s.json.message, /Tenor hat seine API am 30\.06\.2026 abgeschaltet/);
    const del = await api(base, 'PUT', '/api/gifs/keys', { json: { tenorKey: '' }, ...auth });
    assert.equal(del.status, 200);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).tenorKey, undefined);
    assert.equal(del.json.tenorRemoved, undefined);
  });

  await t.test('keys PUT round trip for klipy + giphy, file mode 0600, keys never returned', async () => {
    const noAuth = await api(base, 'PUT', '/api/gifs/keys', { json: { klipyKey: 'KlipyTestKey12345' } });
    assert.equal(noAuth.status, 401);
    const put = await api(base, 'PUT', '/api/gifs/keys', { json: { klipyKey: 'KlipyTestKey12345' }, ...auth });
    assert.equal(put.status, 200, put.text);
    assert.deepEqual(put.json.providers, { klipy: true, giphy: false });
    assert.equal(put.json.default, 'klipy');
    assert.ok(!put.text.includes('KlipyTestKey12345'));
    const st = await api(base, 'GET', '/api/gifs/status');
    assert.deepEqual(st.json.providers, { klipy: true, giphy: false });
    assert.ok(!st.text.includes('KlipyTestKey12345'));
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).klipyKey, 'KlipyTestKey12345');

    const g = await api(base, 'PUT', '/api/gifs/keys', { json: { giphyKey: 'GiphyTestKey1234567890' }, ...auth });
    assert.deepEqual(g.json.providers, { klipy: true, giphy: true });
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(cfg.klipyKey, 'KlipyTestKey12345', 'other key kept');
    assert.equal(cfg.giphyKey, 'GiphyTestKey1234567890');

    const del = await api(base, 'PUT', '/api/gifs/keys', { json: { klipyKey: '' }, ...auth });
    assert.deepEqual(del.json.providers, { klipy: false, giphy: true });
    assert.equal(del.json.default, 'giphy');
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).klipyKey, undefined);

    const bad = await api(base, 'PUT', '/api/gifs/keys', { json: { klipyKey: 'has spaces in it' }, ...auth });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'bad_key');
    const notJson = await api(base, 'PUT', '/api/gifs/keys', { body: 'x', token: TOKEN, headers: { 'content-type': 'text/plain' } });
    assert.equal(notJson.status, 415);
  });

  await t.test('configured key but unreachable upstream -> 502/503, never 500', async () => {
    const r = await api(base, 'GET', '/api/gifs/search?q=katze&provider=giphy', auth);
    assert.ok([502, 503].includes(r.status), `status ${r.status}: ${r.text}`);
    if (r.status === 502) assert.equal(r.json.error, 'upstream');
  });
});

test('gifs API: LIVEFX_ASSET_MAX caps the (test-only) download path', async (t) => {
  const server = await startServer({ env: { LIVEFX_GIF_MOCK: '1', LIVEFX_ASSET_MAX: '20' } });
  const { base } = server;
  t.after(() => server.stop());
  const port = new URL(base).port;
  const r = await api(base, 'POST', '/api/gifs/import', { json: { url: `http://127.0.0.1:${port}/api/gifs/mock/1.gif` }, ...auth });
  assert.equal(r.status, 413, r.text);
  assert.equal(r.json.error, 'payload_too_large');
  const n = await api(base, 'POST', '/api/gifs/import', { json: { url: `${base}/health` }, ...auth });
  assert.equal(n.status, 400, 'only the mock gif route is reachable on loopback');
});

test('gifs API: keys from environment', async (t) => {
  const server = await startServer({ env: { LIVEFX_KLIPY_KEY: 'EnvKlipyKey123456', LIVEFX_TENOR_KEY: 'AIzaSyEnvTenor12345' } });
  const { base } = server;
  t.after(() => server.stop());
  const r = await api(base, 'GET', '/api/gifs/status');
  assert.deepEqual(r.json.providers, { klipy: true, giphy: false });
  assert.equal(r.json.default, 'klipy');
  assert.equal(r.json.tenorRemoved, true, 'old env key is reported, not used');
  assert.ok(!r.text.includes('EnvKlipyKey') && !r.text.includes('AIzaSyEnvTenor'));
});

test('gifs: response mapping (pure)', () => {
  const { normalizeKlipy, normalizeGiphy, publicResults, checkAllowed, buildRequest, providerOfUrl } = require('../server/api-gifs');
  // KLIPY Tenor-v2-compatible shape
  const k = normalizeKlipy({
    results: [
      { id: 'abc', content_description: 'Cat', tags: ['cat'], media_formats: { gif: { url: 'https://static.klipy.com/a/b.gif', dims: [498, 300] }, tinygif: { url: 'https://static.klipy.com/a/t.gif', dims: [220, 132] }, webp: { url: 'https://static.klipy.com/a/m.webp', dims: [360, 216] } } },
      { id: 'nourl', media_formats: {} },
      { id: 'http', media_formats: { gif: { url: 'http://static.klipy.com/x.gif' } } },
      { id: 'foreign', media_formats: { gif: { url: 'https://media.tenor.com/x.gif' } } },
    ],
  });
  assert.equal(k.length, 1);
  assert.equal(k[0].url, 'https://static.klipy.com/a/m.webp', 'webp preferred');
  assert.equal(k[0].preview, 'https://static.klipy.com/a/t.gif');
  assert.equal(k[0].width, 360);
  assert.deepEqual(k[0].tags, ['cat']);
  // KLIPY native shape
  const kn = normalizeKlipy({
    result: true,
    data: { data: [{ id: 7, slug: 'happy-cat', title: 'Happy cat', tags: ['happy'], file: { hd: { gif: { url: 'https://static.klipy.com/hd.gif', width: 640, height: 360 } }, md: { webp: { url: 'https://static.klipy.com/md.webp', width: 320, height: 180 } }, xs: { gif: { url: 'https://static.klipy.com/xs.gif', width: 90, height: 50 } } } }] },
  });
  assert.deepEqual(publicResults(kn).results, [{ id: '7', title: 'Happy cat', preview: 'https://static.klipy.com/xs.gif', url: 'https://static.klipy.com/md.webp', width: 320, height: 180, provider: 'klipy' }]);
  // GIPHY
  const giphy = normalizeGiphy({
    data: [
      { id: 'g1', title: 'Dog', slug: 'dog-g1', images: { fixed_height: { url: 'https://media2.giphy.com/200.gif', webp: 'https://media2.giphy.com/200.webp', width: '356', height: '200' }, fixed_width_small: { url: 'https://media2.giphy.com/s.gif' }, original: { url: 'https://media2.giphy.com/o.gif' } } },
      { id: 'g2', title: 'Beer', images: { original: { url: 'https://media2.giphy.com/o2.gif', width: '1', height: '1' } } },
      { id: 'g3', title: 'Foreign', images: { original: { url: 'https://evil.example/o.gif' } } },
    ],
  });
  const pub = publicResults(giphy);
  assert.deepEqual(pub.results, [{ id: 'g1', title: 'Dog', preview: 'https://media2.giphy.com/s.gif', url: 'https://media2.giphy.com/200.webp', width: 356, height: 200, provider: 'giphy' }]);
  assert.equal(pub.filtered, 1);
  // request builder
  const kr = buildRequest('klipy', 'K', 'katze', 'tr', 5);
  assert.equal(kr.origin, 'https://api.klipy.com');
  assert.equal(kr.searchParams.get('rating'), 'g');
  assert.equal(kr.searchParams.get('locale'), 'tr_TR');
  const gr = buildRequest('giphy', 'G', 'hund', 'de', 5);
  assert.equal(gr.origin, 'https://api.giphy.com');
  assert.equal(gr.searchParams.get('rating'), 'g');
  assert.equal(gr.searchParams.get('lang'), 'de');
  // host ownership + import guard
  assert.equal(providerOfUrl('https://media3.giphy.com/x.gif'), 'giphy');
  assert.equal(providerOfUrl('https://static.klipy.com/x.gif'), 'klipy');
  assert.equal(providerOfUrl('https://giphy.com.evil/x.gif'), null);
  const fakeReq = { socket: { localPort: 1 } };
  for (const url of ['https://static.klipy.com/x.gif', 'https://i.giphy.com/x.gif', 'https://c.tenor.com/x.gif']) {
    assert.throws(() => checkAllowed(url, fakeReq), (e) => e.status === 403 && e.code === 'provider_terms', url);
  }
  for (const bad of ['https://giphy.com.evil/x.gif', 'https://xgiphy.com/x.gif', 'https://127.0.0.1/x.gif', 'http://c.tenor.com/x.gif', 'https://192.168.1.1/x', 'https://example.org/a.gif']) {
    assert.throws(() => checkAllowed(bad, fakeReq), (e) => e.code === 'host_not_allowed', bad);
  }
});
