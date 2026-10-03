// Mobile / PWA static files: allow-list additions, content types and service-worker headers.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { startServer, api } = require('./helpers/server');

let server;
test.before(async () => {
  server = await startServer();
});
test.after(async () => server && server.stop());

test('mobile page, manifest, service worker and icons are served with the right types', async () => {
  const page = await api(server.base, 'GET', '/mobile.html');
  assert.strictEqual(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(page.text, /id="pad"/);
  assert.strictEqual(page.headers.get('set-cookie'), null, 'mobile.html does not hand out the panel cookie (GET /m does)');

  const manifest = await api(server.base, 'GET', '/manifest.webmanifest');
  assert.strictEqual(manifest.status, 200);
  assert.strictEqual(manifest.headers.get('content-type'), 'application/manifest+json');
  assert.strictEqual(manifest.json.name.startsWith('LiveFX'), true);
  assert.strictEqual(manifest.json.display, 'standalone');
  assert.strictEqual(manifest.json.start_url, '/');

  const sw = await api(server.base, 'GET', '/sw.js');
  assert.strictEqual(sw.status, 200);
  assert.match(sw.headers.get('content-type'), /javascript/);
  assert.strictEqual(sw.headers.get('service-worker-allowed'), '/');
  assert.strictEqual(sw.headers.get('cache-control'), 'no-cache');
  assert.match(sw.text, /livefx-shell-v/);

  const png = await fetch(`${server.base}/icons/icon-192.png`);
  assert.strictEqual(png.status, 200);
  assert.strictEqual(png.headers.get('content-type'), 'image/png');
  const bytes = Buffer.from(await png.arrayBuffer());
  assert.strictEqual(bytes.subarray(1, 4).toString(), 'PNG');
  const svg = await api(server.base, 'GET', '/icons/icon.svg');
  assert.strictEqual(svg.status, 200);
  assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);
});

test('every path the service worker precaches exists on the server', async () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const listed = [...sw.matchAll(/^\s+'(\/[^']*)',$/gm)].map((m) => m[1]);
  assert.ok(listed.length >= 25, `precache list found (${listed.length})`);
  for (const p of listed) {
    const r = await fetch(`${server.base}${p}`, { method: 'HEAD' });
    assert.strictEqual(r.status, 200, p);
  }
});

test('icons, vendor and models are confined to their directories', async () => {
  for (const p of ['/icons/../server.js', '/icons/icon.svg/../../server.js', '/icons/x.txt', '/icons/', '/vendor/../server.js', '/models/../token.txt', '/models/whisper-tiny/../../token.txt', '/models/whisper-tiny/config.json/', '/icon.svg', '/vendor/x.exe']) {
    const r = await api(server.base, 'GET', p);
    assert.strictEqual(r.status, 404, p);
  }
});

test('absent vendor / model files yield 404, present model files are served with their type', async () => {
  assert.strictEqual((await api(server.base, 'GET', '/vendor/x.js')).status, 404);
  assert.strictEqual((await api(server.base, 'GET', '/vendor/transformers.min.js')).status, 404);
  assert.strictEqual((await api(server.base, 'GET', '/models/whisper-tiny/config.json')).status, 404);

  const dir = path.join(server.dataDir, 'models', 'whisper-tiny', 'onnx');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(server.dataDir, 'models', 'whisper-tiny', 'config.json'), '{"model_type":"whisper"}');
  fs.writeFileSync(path.join(dir, 'encoder_model_quantized.onnx'), Buffer.from([1, 2, 3]));
  fs.writeFileSync(path.join(server.dataDir, 'models', 'vocab.txt'), 'a\n');

  const cfg = await api(server.base, 'GET', '/models/whisper-tiny/config.json');
  assert.strictEqual(cfg.status, 200);
  assert.match(cfg.headers.get('content-type'), /application\/json/);
  assert.deepStrictEqual(cfg.json, { model_type: 'whisper' });

  const onnx = await fetch(`${server.base}/models/whisper-tiny/onnx/encoder_model_quantized.onnx`);
  assert.strictEqual(onnx.status, 200);
  assert.strictEqual(onnx.headers.get('content-type'), 'application/octet-stream');
  assert.strictEqual((await onnx.arrayBuffer()).byteLength, 3);

  const txt = await api(server.base, 'GET', '/models/vocab.txt');
  assert.strictEqual(txt.status, 200);
  assert.match(txt.headers.get('content-type'), /text\/plain/);

  assert.strictEqual((await api(server.base, 'GET', '/models/../token.txt')).status, 404);
  assert.strictEqual((await api(server.base, 'GET', '/models/whisper-tiny/config.json.bak')).status, 404);
});

test('vendor files are served from <root>/vendor with js/mjs/wasm types', async () => {
  const root = path.join(__dirname, '..');
  const vendor = path.join(root, 'vendor');
  const existed = fs.existsSync(vendor);
  const name = `livefx-test-${process.pid}`;
  fs.mkdirSync(vendor, { recursive: true });
  try {
    fs.writeFileSync(path.join(vendor, `${name}.mjs`), 'export const x = 1;');
    fs.writeFileSync(path.join(vendor, `${name}.wasm`), Buffer.from([0, 0x61, 0x73, 0x6d]));
    const mjs = await api(server.base, 'GET', `/vendor/${name}.mjs`);
    assert.strictEqual(mjs.status, 200);
    assert.match(mjs.headers.get('content-type'), /javascript/);
    const wasm = await fetch(`${server.base}/vendor/${name}.wasm`);
    assert.strictEqual(wasm.status, 200);
    assert.strictEqual(wasm.headers.get('content-type'), 'application/wasm');
  } finally {
    fs.rmSync(path.join(vendor, `${name}.mjs`), { force: true });
    fs.rmSync(path.join(vendor, `${name}.wasm`), { force: true });
    if (!existed && fs.readdirSync(vendor).length === 0) fs.rmdirSync(vendor);
  }
});

test('the panel links the manifest, registers the service worker and shows the Handy card', async () => {
  const html = (await api(server.base, 'GET', '/')).text;
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(html, /id="mobile-url"/);
  assert.match(html, /id="btn-copy-mobile"/);
  assert.match(html, /js\/mobile-link\.js/);
  for (const p of ['/overlay.html', '/demo.html', '/mobile.html']) {
    assert.match((await api(server.base, 'GET', p)).text, /serviceWorker\.register\('\/sw\.js'\)/, p);
  }
});
