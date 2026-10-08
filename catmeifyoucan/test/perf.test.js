// Erweiterung perf: Kompression (brotli/gzip), ETags je Verfahren, Range/HEAD, Lade-Reihenfolge der App.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { pickEncoding, isCompressible, etagMatches, etagFor, addVary, createCompressionCache, sendBody } from '../server/compress.js';
import { bootLogoDataUrl, bootLogoSvg } from '../scripts/boot-logo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(here, '..', 'public');
const read = (p) => fs.readFileSync(path.join(PUB, p));

let app;
let base;
let tmp;

test.before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-perf-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});

test.after(async () => {
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** Rohe Antwort ohne automatisches Entpacken (fetch würde das still erledigen). */
function raw(p, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(base + p, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

const unpack = (r) => {
  const enc = r.headers['content-encoding'];
  if (enc === 'br') return zlib.brotliDecompressSync(r.body);
  if (enc === 'gzip') return zlib.gunzipSync(r.body);
  return r.body;
};

test('Accept-Encoding: q-Werte, Stern, x-gzip, Ablehnung', () => {
  assert.equal(pickEncoding('gzip, deflate, br, zstd'), 'br');
  assert.equal(pickEncoding('gzip, deflate'), 'gzip');
  assert.equal(pickEncoding('br;q=0.5, gzip;q=0.9'), 'gzip');
  assert.equal(pickEncoding('br;q=0, gzip'), 'gzip');
  assert.equal(pickEncoding('gzip;q=0, br;q=0'), null);
  assert.equal(pickEncoding('*'), 'br');
  assert.equal(pickEncoding('*;q=0.3, br;q=0'), 'gzip');
  assert.equal(pickEncoding('x-gzip'), 'gzip');
  assert.equal(pickEncoding('identity'), null);
  assert.equal(pickEncoding(''), null);
  assert.equal(pickEncoding(undefined), null);
  assert.equal(pickEncoding('br;q=abc, gzip'), 'gzip', 'ungültiger q-Wert zählt als „nein“');
  assert.equal(pickEncoding(' BR ; Q=1.0 '), 'br');
  assert.equal(pickEncoding('br;q=0.8, gzip;q=0.8'), 'br', 'Gleichstand → brotli');
});

test('Bausteine: Typen, Vary, ETag-Vergleich', () => {
  for (const t of ['text/html; charset=utf-8', 'text/javascript', 'text/css', 'application/json; charset=utf-8', 'image/svg+xml', 'application/manifest+json', 'text/markdown', 'text/plain', 'application/geo+json', 'application/xml', 'text/csv']) {
    assert.ok(isCompressible(t), t);
  }
  for (const t of ['image/jpeg', 'image/png', 'image/webp', 'font/woff2', 'video/mp4', 'application/octet-stream', '', undefined]) {
    assert.ok(!isCompressible(t), String(t));
  }
  assert.equal(addVary('Accept-Language', 'Accept-Encoding'), 'Accept-Language, Accept-Encoding');
  assert.equal(addVary('accept-encoding', 'Accept-Encoding'), 'accept-encoding');
  assert.equal(addVary('', 'Accept-Encoding'), 'Accept-Encoding');
  assert.equal(etagFor('"abc"', 'br'), '"abc-br"');
  assert.equal(etagFor('W/"abc"', 'gzip'), 'W/"abc-gzip"');
  assert.equal(etagFor('"abc"', null), '"abc"');
  assert.ok(etagMatches('"abc-br"', '"abc-br"'));
  assert.ok(etagMatches('W/"abc-br"', '"abc-br"'), 'Proxys machen ETags oft schwach');
  assert.ok(etagMatches('"x", "abc-br"', '"abc-br"'));
  assert.ok(etagMatches('*', '"abc"'));
  assert.ok(!etagMatches('"abc"', '"abc-br"'));
  assert.ok(!etagMatches('', '"abc"'));
});

test('Statische Datei: brotli und gzip entpacken zum Original, eigener ETag je Verfahren, Vary', async () => {
  const orig = read('js/app.js');
  const br = await raw('/js/app.js', { 'Accept-Encoding': 'gzip, deflate, br' });
  assert.equal(br.status, 200);
  assert.equal(br.headers['content-encoding'], 'br');
  assert.equal(br.headers.vary, 'Accept-Encoding');
  assert.equal(Number(br.headers['content-length']), br.body.length);
  assert.ok(br.body.length < orig.length * 0.6, 'deutlich kleiner');
  assert.deepEqual(unpack(br), orig);
  assert.match(br.headers['content-type'], /javascript/);

  const gz = await raw('/js/app.js', { 'Accept-Encoding': 'gzip' });
  assert.equal(gz.headers['content-encoding'], 'gzip');
  assert.deepEqual(unpack(gz), orig);

  const plain = await raw('/js/app.js');
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.headers.vary, 'Accept-Encoding');
  assert.deepEqual(plain.body, orig);

  const tags = new Set([br.headers.etag, gz.headers.etag, plain.headers.etag]);
  assert.equal(tags.size, 3, 'drei Varianten, drei ETags');
  assert.ok(br.headers.etag.endsWith('-br"'));

  // 304 nur mit dem ETag der eigenen Variante (auch in schwacher Form)
  const again = await raw('/js/app.js', { 'Accept-Encoding': 'br', 'If-None-Match': br.headers.etag });
  assert.equal(again.status, 304);
  assert.equal(again.body.length, 0);
  assert.equal(again.headers.etag, br.headers.etag);
  const weak = await raw('/js/app.js', { 'Accept-Encoding': 'br', 'If-None-Match': `W/${br.headers.etag}` });
  assert.equal(weak.status, 304);
  const other = await raw('/js/app.js', { 'Accept-Encoding': 'br', 'If-None-Match': plain.headers.etag });
  assert.equal(other.status, 200, 'unverpackter ETag passt nicht zur brotli-Variante');
  const plain304 = await raw('/js/app.js', { 'If-None-Match': plain.headers.etag });
  assert.equal(plain304.status, 304);

  // Sicherheits-Header bleiben (HTML), Kompression auch für CSS, SVG, Manifest, Sprachdateien
  for (const p of ['/app.html', '/css/app.css', '/site/img/hero-fallback.svg', '/manifest.webmanifest', '/js/lang/fa.js', '/vendor/three/three.module.min.js']) {
    const r = await raw(p, { 'Accept-Encoding': 'br' });
    assert.equal(r.status, 200, p);
    assert.equal(r.headers['content-encoding'], read(p.slice(1)).length >= 1024 ? 'br' : undefined, p);
    assert.deepEqual(unpack(r), read(p.slice(1)), p);
  }
  const html = await raw('/app.html', { 'Accept-Encoding': 'br' });
  assert.match(html.headers['content-security-policy'], /script-src 'self'/);
  assert.equal(html.headers['x-content-type-options'], 'nosniff');
});

test('Statische Datei: Range bleibt unverpackt, HEAD liefert Kopf ohne Körper', async () => {
  const orig = read('css/app.css');
  const part = await raw('/css/app.css', { 'Accept-Encoding': 'br', Range: 'bytes=10-19' });
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-encoding'], undefined);
  assert.equal(part.headers['content-range'], `bytes 10-19/${orig.length}`);
  assert.deepEqual(part.body, orig.subarray(10, 20));
  assert.equal(part.headers.vary, 'Accept-Encoding');

  const head = await raw('/css/app.css', { 'Accept-Encoding': 'br' }, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.headers['content-encoding'], 'br');
  assert.equal(head.body.length, 0);
  const full = await raw('/css/app.css', { 'Accept-Encoding': 'br' });
  assert.equal(head.headers['content-length'], full.headers['content-length']);
  assert.equal(head.headers.etag, full.headers.etag);

  const headPlain = await raw('/css/app.css', {}, 'HEAD');
  assert.equal(Number(headPlain.headers['content-length']), orig.length);
  assert.equal(headPlain.body.length, 0);
});

test('Nicht gepackt: Bilder, Schriften, Videos, kleine Dateien, Fotos', async () => {
  for (const p of ['/icons/icon-192.png', '/vendor/fonts/manrope-latin.woff2']) {
    const r = await raw(p, { 'Accept-Encoding': 'gzip, br' });
    assert.equal(r.status, 200, p);
    assert.equal(r.headers['content-encoding'], undefined, p);
    assert.equal(r.headers.vary, undefined, p);
    assert.deepEqual(r.body, read(p.slice(1)), p);
  }
  const mp4 = fs.readdirSync(path.join(PUB, 'media')).find((f) => f.endsWith('.mp4'));
  if (mp4) {
    const v = await raw(`/media/${mp4}`, { 'Accept-Encoding': 'br', Range: 'bytes=0-99' });
    assert.equal(v.status, 206);
    assert.equal(v.headers['content-encoding'], undefined);
    assert.equal(v.body.length, 100);
  }
  // unter 1 KB lohnt sich Packen nicht
  const small = fs.readdirSync(path.join(PUB, 'site', 'img')).map((f) => `site/img/${f}`).find((f) => fs.statSync(path.join(PUB, f)).size < 1024);
  assert.ok(small, 'kleines SVG vorhanden');
  const s = await raw(`/${small}`, { 'Accept-Encoding': 'br' });
  assert.equal(s.headers['content-encoding'], undefined);
  assert.deepEqual(s.body, read(small));
});

test('Startseite: gepackt je Sprache, Vary Accept-Language + Accept-Encoding, Sprache und Richtung bleiben', async () => {
  const r = await raw('/?lang=ar', { 'Accept-Encoding': 'br' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-encoding'], 'br');
  assert.equal(r.headers.vary, 'Accept-Language, Accept-Encoding');
  assert.match(r.headers['content-security-policy'], /script-src 'self'/);
  const html = unpack(r).toString('utf8');
  assert.match(html, /<html lang="ar" dir="rtl"/);
  assert.match(html, /media\/og-ar\.png/);
  assert.equal(Number(r.headers['content-length']), r.body.length);

  const gz = await raw('/?lang=ar', { 'Accept-Encoding': 'gzip' });
  assert.equal(unpack(gz).toString('utf8'), html);
  const plain = await raw('/?lang=ar');
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.body.toString('utf8'), html);
  assert.notEqual(plain.headers.etag, r.headers.etag);

  const again = await raw('/?lang=ar', { 'Accept-Encoding': 'br', 'If-None-Match': r.headers.etag });
  assert.equal(again.status, 304);
  const de = await raw('/', { 'Accept-Encoding': 'br', 'Accept-Language': 'de-DE,de;q=0.9' });
  assert.match(unpack(de).toString('utf8'), /<html lang="de" dir="ltr"/);
  assert.notEqual(de.headers.etag, r.headers.etag);
  const head = await raw('/?lang=ar', { 'Accept-Encoding': 'br' }, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers['content-length'], r.headers['content-length']);
});

test('API: JSON ab 1 KB gepackt, kleine Antworten und Fehler unverpackt', async () => {
  const cfg = await raw('/api/config', { 'Accept-Encoding': 'gzip, deflate, br' });
  assert.equal(cfg.status, 200);
  assert.equal(cfg.headers['content-encoding'], 'br');
  assert.match(cfg.headers.vary, /Accept-Encoding/);
  assert.equal(cfg.headers['cache-control'], 'no-store');
  const data = JSON.parse(unpack(cfg).toString('utf8'));
  assert.ok(Array.isArray(data.regions) && data.regions.length);

  const cats = await raw('/api/cats?limit=50', { 'Accept-Encoding': 'gzip' });
  assert.equal(cats.headers['content-encoding'], 'gzip');
  assert.ok(JSON.parse(unpack(cats).toString('utf8')));

  const health = await raw('/api/health', { 'Accept-Encoding': 'br' });
  assert.equal(health.headers['content-encoding'], undefined, 'unter 1 KB');
  assert.equal(JSON.parse(health.body.toString('utf8')).ok, true);

  const err = await raw('/api/nope', { 'Accept-Encoding': 'br' });
  assert.equal(err.status, 404);
  assert.equal(err.headers['content-encoding'], undefined);
  assert.equal(JSON.parse(err.body.toString('utf8')).error, 'not_found');

  const csv = await raw('/api/export/cats.csv', { 'Accept-Encoding': 'br' });
  assert.equal(csv.headers['content-encoding'], 'br');
  assert.match(csv.headers['content-disposition'], /attachment/);
  assert.match(unpack(csv).toString('utf8'), /\n/);

  // fetch (wie im Browser) entpackt selbst – die App merkt nichts
  const viaFetch = await (await fetch(`${base}/api/config`)).json();
  assert.deepEqual(viaFetch, data);
});

test('Katzenseite /c/<id>: gepackt, 304 mit ETag der Variante, Vary behält Accept-Language', async () => {
  const id = app.engine.ctx.store.cats.all()[0].id;
  const r = await raw(`/c/${encodeURIComponent(id)}?lang=tr`, { 'Accept-Encoding': 'br' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-encoding'], 'br');
  assert.equal(r.headers.vary, 'Accept-Language, Accept-Encoding');
  assert.match(unpack(r).toString('utf8'), /<html lang="tr"/);
  assert.ok(r.headers.etag.endsWith('-br"'));
  const again = await raw(`/c/${encodeURIComponent(id)}?lang=tr`, { 'Accept-Encoding': 'br', 'If-None-Match': r.headers.etag });
  assert.equal(again.status, 304);
  const plain = await raw(`/c/${encodeURIComponent(id)}?lang=tr`);
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.body.toString('utf8'), unpack(r).toString('utf8'));
});

test('Speicher: geänderte Datei (Zeit/Größe) wird neu gepackt; gleichzeitige Anfragen teilen sich die Arbeit', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-pack-'));
  try {
    const file = path.join(dir, 'a.js');
    fs.writeFileSync(file, 'const a = 1;\n'.repeat(400));
    const cache = createCompressionCache();
    const st1 = fs.statSync(file);
    const [x, y] = await Promise.all([cache.get(file, st1, 'br'), cache.get(file, st1, 'br')]);
    assert.equal(x, y);
    assert.equal(cache.stats().entries, 1);
    assert.equal(zlib.brotliDecompressSync(x).toString(), 'const a = 1;\n'.repeat(400));
    fs.writeFileSync(file, 'const b = 2;\n'.repeat(500));
    const t = new Date(Date.now() + 5000);
    fs.utimesSync(file, t, t);
    const z = await cache.get(file, fs.statSync(file), 'br');
    assert.equal(zlib.brotliDecompressSync(z).toString(), 'const b = 2;\n'.repeat(500));
    const g = await cache.get(file, fs.statSync(file), 'gzip');
    assert.equal(zlib.gunzipSync(g).toString(), 'const b = 2;\n'.repeat(500));
    assert.equal(cache.stats().entries, 2);
    // Obergrenze: älteste Einträge fliegen raus
    const tiny = createCompressionCache({ maxBytes: 1 });
    await tiny.get(file, fs.statSync(file), 'br');
    await tiny.get(file, fs.statSync(file), 'gzip');
    assert.equal(tiny.stats().entries, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sendBody: HEAD, 304, Packen lohnt nicht → unverpackt mit normalem ETag', () => {
  const mk = (headers, method = 'GET') => {
    const out = { headers: null, status: 0, body: undefined };
    const res = { writeHead: (s, h) => ((out.status = s), (out.headers = h)), end: (b) => (out.body = b) };
    return { req: { method, headers }, res, out };
  };
  const big = JSON.stringify({ list: Array.from({ length: 200 }, (_, i) => ({ i, name: `Katze ${i}` })) });
  let c = mk({ 'accept-encoding': 'br' }, 'HEAD');
  sendBody(c.req, c.res, 200, big, { 'Content-Type': 'application/json' });
  assert.equal(c.out.headers['Content-Encoding'], 'br');
  assert.equal(c.out.body, undefined);
  assert.ok(c.out.headers['Content-Length'] > 0);

  c = mk({ 'accept-encoding': 'gzip', 'if-none-match': '"e1-gzip"' });
  sendBody(c.req, c.res, 200, big, { 'Content-Type': 'text/html' }, { etag: '"e1"' });
  assert.equal(c.out.status, 304);

  // Zufallsbytes lassen sich nicht packen → unverpackt, ETag ohne Endung
  const noise = crypto.randomBytes(4096);
  c = mk({ 'accept-encoding': 'br' });
  sendBody(c.req, c.res, 200, noise, { 'Content-Type': 'text/plain' }, { etag: '"n1"' });
  assert.equal(c.out.headers['Content-Encoding'], undefined);
  assert.equal(c.out.headers.ETag, '"n1"');
  assert.equal(c.out.headers.Vary, 'Accept-Encoding');
  assert.deepEqual(c.out.body, noise);
});

// ---------------------------------------------------------------- App: Lade-Reihenfolge

const src = (p) => fs.readFileSync(path.join(PUB, p), 'utf8');
const resolveFrom = (from, spec) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
function staticImports(file) {
  return [...src(file).matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => resolveFrom(file, m[1]));
}
function staticGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const dep of staticImports(entry)) staticGraph(dep, seen);
  return seen;
}

test('App: Ansichten werden erst bei Bedarf geladen (kein statischer Import von Ansichten)', () => {
  const imports = staticImports('js/app.js');
  assert.deepEqual(imports.sort(), ['js/api.js', 'js/i18n.js', 'js/ui.js']);
  const app = src('js/app.js');
  const views = Object.fromEntries([...app.matchAll(/^\s*(\w+): \(\) => import\('\.\/([^']+)'\)/gm)].map((m) => [m[1], `js/${m[2]}`]));
  assert.ok(Object.keys(views).length >= 8);
  // jede Route ruft eine Funktion, die ihr Modul wirklich exportiert
  const uses = [...app.matchAll(/loadView\('(\w+)'\)\)\.(\w+)\(/g)];
  assert.ok(uses.length >= 10);
  for (const [, name, fn] of uses) {
    assert.ok(views[name], `Ansicht ${name}`);
    assert.match(src(views[name]), new RegExp(`export (?:async )?function ${fn}\\b`), `${views[name]} exportiert ${fn}`);
  }
});

test('app.html: modulepreload deckt alle Module für „Heute“ ab, Lade-Logo = icons/logo.svg', () => {
  const html = src('app.html');
  const pre = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);
  const need = new Set([...staticGraph('js/app.js'), ...staticGraph('js/views/home.js')]);
  need.delete('js/app.js'); // steht als <script type="module">
  for (const f of need) assert.ok(pre.includes(f), `modulepreload fehlt: ${f}`);
  for (const f of pre) assert.ok(need.has(f) && fs.existsSync(path.join(PUB, f)), `unnötig oder fehlt: ${f}`);
  // Schrift-Preload nach den Modulen (sonst bremst er sie auf schwachem Netz), mit crossorigin
  const font = html.indexOf('rel="preload" href="vendor/fonts/unbounded-latin.woff2" as="font" type="font/woff2" crossorigin');
  assert.ok(font > html.lastIndexOf('rel="modulepreload"'));
  // Lade-Logo als data:-URL: gleiche Zeichnung wie icons/logo.svg (ohne Kommentare/Titel)
  const m = /<div class="boot"><img src="(data:image\/svg\+xml,[^"]+)"/.exec(html);
  assert.ok(m, 'Lade-Logo als data:-URL');
  assert.equal(m[1], bootLogoDataUrl(src('icons/logo.svg')), 'Lade-Logo veraltet → node scripts/boot-logo.js');
  assert.equal(decodeURIComponent(m[1].slice('data:image/svg+xml,'.length)), bootLogoSvg(src('icons/logo.svg')));
});

test('Service Worker: alle Einträge der Hülle gibt es, alle Ansichten sind dabei (offline)', () => {
  const sw = src('sw.js');
  const shell = [...sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];')).matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const f of shell) assert.ok(fs.existsSync(path.join(PUB, f)), `fehlt: ${f}`);
  const views = [...src('js/app.js').matchAll(/import\('\.\/([^']+)'\)/g)].map((m) => `js/${m[1]}`);
  for (const v of views) {
    for (const f of staticGraph(v)) assert.ok(shell.includes(f), `nicht offline verfügbar: ${f} (über ${v})`);
  }
  assert.doesNotMatch(sw, /const VERSION = 'catme-v2'/, 'VERSION erhöht');
});

test('Schriften: kleine Türkisch-Dateien stehen hinter latin-ext und decken nur Ğ ğ İ Ş ş ab', () => {
  const css = src('css/fonts.css');
  for (const fam of ['unbounded', 'manrope', 'vazirmatn']) {
    const big = css.indexOf(`${fam}-latin-ext.woff2`);
    const tr = css.indexOf(`${fam}-latin-ext-tr.woff2`);
    assert.ok(big > 0 && tr > big, `${fam}: Reihenfolge`);
    const file = path.join(PUB, 'vendor', 'fonts', `${fam}-latin-ext-tr.woff2`);
    assert.ok(fs.statSync(file).size < 8000, `${fam}: klein`);
    assert.equal(fs.readFileSync(file).subarray(0, 4).toString('latin1'), 'wOF2');
    const rule = css.slice(tr, css.indexOf('}', tr));
    assert.match(rule, /unicode-range: U\+011E-011F,U\+0130,U\+015E-015F;/);
  }
});
