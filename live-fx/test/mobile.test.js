// Mobile / PWA static files: allow-list additions, content types and service-worker headers (2.3: camera view).
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
  // 2.2: QR canvases + internet link in the Handy card, wizard on top, shared pack helpers + phonetics loaded
  for (const id of ['mobile-qr', 'tunnel-qr', 'btn-tunnel', 'btn-copy-tunnel', 'tunnel-status', 'wizard-card', 'wiz-copy-url', 'wiz-pack-tiles', 'btn-advanced', 'volume-sfx', 'volume-ambient', 'story-layout', 'band-height', 'effect-zone', 'primary-lang', 'live-story']) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} in index.html`);
  }
  for (const f of ['js/qr.js', 'js/packs-store.js', 'js/phonetic.js']) assert.match(html, new RegExp(f.replace('.', '\\.')), `${f} loaded by the panel`);
  assert.ok(html.indexOf('js/qr.js') < html.indexOf('js/mobile-link.js'), 'qr.js before mobile-link.js');
  assert.ok(html.indexOf('js/packs-store.js') > html.indexOf('js/packs.js') && html.indexOf('js/packs-store.js') > html.indexOf('js/schema.js'), 'packs-store after packs + schema');
  assert.match(html, /id="gap"[^>]*value="0\.5"/, 'gap default 0.5');
  assert.equal((html.match(/data-advanced/g) || []).length, 5, 'five advanced cards');

  const mobile = (await api(server.base, 'GET', '/mobile.html')).text;
  for (const id of ['favs-card', 'favs', 'btn-vol-down', 'btn-vol-up', 'vol-label', 'btn-mic', 'btn-band', 'btn-zone', 'btn-style', 'btn-bandpos', 'packs-card', 'packs']) {
    assert.match(mobile, new RegExp(`id="${id}"`), `#${id} in mobile.html`);
  }
  assert.match(mobile, /js\/packs-store\.js/);
  assert.ok(mobile.indexOf('js/packs-store.js') > mobile.indexOf('js/schema.js'), 'packs-store after schema on the phone');
  for (const p of ['/overlay.html', '/demo.html', '/mobile.html']) {
    assert.match((await api(server.base, 'GET', p)).text, /serviceWorker\.register\('\/sw\.js'\)/, p);
  }
});

test('camera view: page, script, stylesheet and guide are served; the panel links it', async () => {
  const page = await api(server.base, 'GET', '/camera.html');
  assert.strictEqual(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.strictEqual(page.headers.get('set-cookie'), null, 'camera.html hands out no panel cookie');
  for (const id of ['frame', 'cam', 'fx', 'cam-device', 'btn-mirror', 'btn-aspect', 'btn-rec', 'btn-studio', 'btn-popup', 'rec-result', 'rec-download']) {
    assert.match(page.text, new RegExp(`id="${id}"`), `#${id} in camera.html`);
  }
  assert.match(page.text, /<iframe id="fx"[^>]*allow="autoplay"/, 'overlay iframe may play sound');
  assert.match(page.text, /js\/camera\.js/);
  assert.match(page.text, /css\/camera\.css/);
  assert.match(page.text, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.strictEqual((await fetch(`${server.base}/camera.html`, { method: 'HEAD' })).status, 200);

  const js = await api(server.base, 'GET', '/js/camera.js');
  assert.strictEqual(js.status, 200);
  assert.match(js.headers.get('content-type'), /javascript/);
  const css = await api(server.base, 'GET', '/css/camera.css');
  assert.strictEqual(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  assert.doesNotMatch(css.text, /color-scheme:\s*dark/, 'no dark color-scheme (would paint the overlay iframe opaque)');
  const doc = await api(server.base, 'GET', '/docs/KAMERA.md');
  assert.strictEqual(doc.status, 200);
  for (const h of ['## Deutsch', '## Türkçe', '## English', 'OBS Virtual Camera', 'FaceTime', 'WhatsApp']) assert.ok(doc.text.includes(h), `KAMERA.md mentions ${h}`);
  for (const p of ['/camera.htm', '/camera.html/', '/Camera.html', '/camera.js', '/js/camera.html']) assert.strictEqual((await api(server.base, 'GET', p)).status, 404, p);

  const html = (await api(server.base, 'GET', '/')).text;
  for (const id of ['camera-card', 'camera-url', 'camera-open', 'btn-camera-record', 'btn-camera-sketch', 'btn-copy-camera', 'story-style', 'band-position']) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} in index.html`);
  }
  assert.match(html, /<select id="story-style"[^>]*>[\s\S]*?value="mixed"[\s\S]*?value="sketch"[\s\S]*?value="emoji"/);
  assert.match(html, /<select id="band-position"[^>]*>[\s\S]*?value="bottom"[\s\S]*?value="chat"/);
});

test('camera helpers: output size, overlay URL, fit, cover crop, MIME choice, gradients, shadows', () => {
  const C = require('../js/camera.js');
  assert.deepStrictEqual(C.outputSize('16:9', 720), { width: 1280, height: 720 });
  assert.deepStrictEqual(C.outputSize('9:16', 720), { width: 720, height: 1280 });
  assert.deepStrictEqual(C.outputSize('portrait', '1080'), { width: 1080, height: 1920 });
  assert.deepStrictEqual(C.outputSize('nonsense', 999), { width: 1280, height: 720 });

  assert.strictEqual(C.overlaySrc('', '16:9'), 'overlay.html');
  assert.strictEqual(C.overlaySrc('?record=1&mic=1&cam=x', '9:16'), 'overlay.html?layout=portrait', 'camera-only params stay out');
  assert.strictEqual(C.overlaySrc('?theme=pastel&band=30&zone=edges&bandpos=chat&storystyle=sketch&layout=x', '16:9'), 'overlay.html?theme=pastel&band=30&zone=edges&bandpos=chat&storystyle=sketch');
  assert.strictEqual(C.overlaySrc('?storystyle=emoji', '16:9', { storystyle: 'sketch' }), 'overlay.html?storystyle=sketch');
  assert.strictEqual(C.overlaySrc('?storystyle=emoji', '16:9', { storystyle: null }), 'overlay.html');

  assert.deepStrictEqual(C.fitBox(1280, 720, 1280, 720), { scale: 1, x: 0, y: 0 });
  const f = C.fitBox(390, 674, 720, 1280);
  assert.ok(Math.abs(f.scale - 674 / 1280) < 1e-9 && f.y === 0 && f.x > 0, JSON.stringify(f));
  assert.deepStrictEqual(C.coverRect(640, 480, 1280, 720), { sx: 0, sy: 60, sw: 640, sh: 360 });
  assert.deepStrictEqual(C.coverRect(1280, 720, 720, 1280), { sx: 437.5, sy: 0, sw: 405, sh: 720 });

  const only = (list) => (m) => list.includes(m);
  assert.strictEqual(C.pickMime('auto', true, only(['video/webm;codecs=vp8,opus', 'video/mp4;codecs=avc1,mp4a.40.2'])), 'video/mp4;codecs=avc1,mp4a.40.2', 'auto prefers H.264 MP4');
  assert.strictEqual(C.pickMime('auto', true, only(['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2'])), 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'level 4.0 (1080p30) first');
  // a bare video/mp4 (Chromium/Linux: VP9 + Opus inside an .mp4) loses against WebM – only Safari-like browsers get it
  assert.strictEqual(C.pickMime('auto', true, only(['video/webm;codecs=vp8,opus', 'video/mp4'])), 'video/webm;codecs=vp8,opus', 'bare MP4 not preferred');
  assert.strictEqual(C.pickMime('mp4', true, only(['video/webm', 'video/mp4'])), 'video/webm');
  assert.strictEqual(C.pickMime('auto', true, only(['video/mp4'])), 'video/mp4', 'bare MP4 as the last resort');
  for (const fmt of ['auto', 'mp4', 'webm']) {
    for (const a of [true, false]) {
      const list = C.mimeCandidates(fmt, a);
      assert.strictEqual(list[list.length - 1], 'video/mp4', `${fmt}: bare MP4 last`);
      assert.ok(list.slice(0, -1).filter((m) => /^video\/mp4/.test(m)).every((m) => /codecs=avc1/.test(m)), `${fmt}: every other MP4 names H.264`);
      assert.ok(!list.some((m) => /42E01E/i.test(m)), 'no level-3.0 H.264 (too low for 720p30)');
    }
  }
  assert.strictEqual(C.phoneSafe('video/mp4;codecs=avc1.640028,mp4a.40.2'), true);
  assert.strictEqual(C.phoneSafe('video/mp4'), true, 'Safari: plain MP4 is H.264');
  assert.strictEqual(C.phoneSafe('video/mp4;codecs=vp9,opus'), false);
  assert.strictEqual(C.phoneSafe('video/mp4;codecs="vp09.00.10.08,opus"'), false);
  assert.strictEqual(C.phoneSafe('video/webm;codecs=vp9,opus'), false);
  assert.strictEqual(C.pickMime('webm', true, only(['video/webm;codecs=vp8,opus', 'video/mp4'])), 'video/webm;codecs=vp8,opus');
  assert.strictEqual(C.pickMime('mp4', false, only(['video/webm'])), 'video/webm', 'falls back to what the browser has');
  assert.strictEqual(C.pickMime('auto', false, only([])), '');
  assert.strictEqual(C.extFor('video/mp4;codecs=avc1'), 'mp4');
  assert.strictEqual(C.extFor('video/webm;codecs=vp9,opus'), 'webm');
  assert.strictEqual(C.formatTime(65400), '01:05');
  assert.strictEqual(C.familyOf('tr-TR'), 'tr');
  assert.strictEqual(C.familyOf('fr-FR'), '');
  assert.match(C.cameraErrorText({ name: 'NotReadableError' }), /belegt/);
  assert.match(C.cameraErrorText({}, false), /HTTPS/);

  const g = C.parseGradient('linear-gradient(rgba(0, 0, 0, 0) 0px, rgb(0, 0, 0) 18%, rgb(0, 0, 0) 100%)');
  assert.strictEqual(g.type, 'linear');
  assert.strictEqual(g.angle, 180);
  assert.deepStrictEqual(g.stops.map((s) => s.color), ['rgba(0, 0, 0, 0)', 'rgb(0, 0, 0)', 'rgb(0, 0, 0)']);
  assert.deepStrictEqual(C.resolveStops(g.stops, 100), [0, 0.18, 1]);
  const t = C.parseGradient('linear-gradient(to right, red, blue 30%, lime)');
  assert.deepStrictEqual(t.to, { x: 1, y: 0 });
  assert.deepStrictEqual(C.resolveStops(t.stops, 200), [0, 0.3, 1]);
  const two = C.parseGradient('linear-gradient(172deg, rgba(0, 0, 0, 0) 0px 44%, rgba(210, 228, 255, 0.45) 50%, rgba(0, 0, 0, 0) 56%)');
  assert.strictEqual(two.stops.length, 4, 'a stop with two positions counts twice');
  const r = C.parseGradient('radial-gradient(circle at 75% 12%, rgb(58, 63, 120) 0%, rgb(2, 3, 16) 100%)');
  assert.strictEqual(r.type, 'radial');
  assert.strictEqual(r.shape, 'circle');
  assert.deepStrictEqual(r.at, [{ v: 75, u: '%' }, { v: 12, u: '%' }]);
  assert.strictEqual(C.parseGradient('radial-gradient(rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0) 60%)').shape, 'ellipse');
  assert.strictEqual(C.parseGradient('url("a.png")'), null);
  assert.deepStrictEqual(C.splitTopLevel('linear-gradient(red, blue), url("x,y.png"), none'), ['linear-gradient(red, blue)', 'url("x,y.png")', 'none']);

  assert.deepStrictEqual(C.parseShadows('rgba(0, 0, 0, 0.45) 0px 20px 60px 0px'), [{ color: 'rgba(0, 0, 0, 0.45)', x: 0, y: 20, blur: 60, spread: 0, inset: false }]);
  assert.deepStrictEqual(C.parseShadows('0px 0px 12px red, rgb(1, 2, 3) 1px 2px 0px inset').map((s) => [s.color, s.blur, s.inset]), [['red', 12, false], ['rgb(1, 2, 3)', 0, true]]);
  assert.deepStrictEqual(C.parseShadows('none'), []);
  assert.ok(C.isTransparent('rgba(0, 0, 0, 0)') && C.isTransparent('transparent') && !C.isTransparent('rgb(0, 0, 0)'));
});
