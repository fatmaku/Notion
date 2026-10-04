#!/usr/bin/env node
// Cat Me If You Can – rendert das Social-Media-Paket neu.
//
//   node marketing/render.js                         # alles: 5 Motive × 2 Formate × 6 Sprachen + 6 Link-Vorschauen
//   node marketing/render.js --motif twenty --lang ar,fa --format story
//   node marketing/render.js --og                     # nur die Link-Vorschauen (public/media/og*.png)
//   node marketing/render.js --check                  # nur prüfen, nichts schreiben
//   node marketing/render.js --serve 8940             # Vorlage im Browser ansehen (Galerie: /marketing/templates/gallery.html)
//
// Ergebnis:
//   marketing/social/<motiv>-<format>-<sprache>.jpg   (JPEG, Qualität 88, ≤ 350 KB)
//   public/media/og-<sprache>.png, public/media/og.png (1200 × 630, ≤ 300 KB, og.png = Englisch)
// Link-Vorschauen werden mit ffmpeg verkleinert (256 Farben, wenn SSIM ≥ 0,985, sonst verlustfrei).
// Prüft jedes Bild: Text im Bild und mit Rand, Story-Schutzzone (oben 220 px, unten 380 px frei),
// kein Überlauf/keine Überlappung, Schriften geladen, Dateigröße.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LANGS, MOTIFS, FORMATS } from './texts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT_SOCIAL = path.join(HERE, 'social');
const OUT_MEDIA = path.join(PUBLIC, 'media');
const JPEG_QUALITY = 88;
const MAX_JPEG = 350 * 1024;
const MAX_PNG = 300 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json',
};

/** Statischer Server: /marketing/* aus diesem Ordner, alles andere aus public/ (Schriften, Logo, avatar.js). */
export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    let root = PUBLIC;
    if (p.startsWith('/marketing/')) {
      root = HERE;
      p = p.slice('/marketing'.length);
    }
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function args() {
  const a = process.argv.slice(2);
  const get = (k) => {
    const i = a.indexOf(k);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : null;
  };
  const list = (k, all) => (get(k) ? get(k).split(',').map((s) => s.trim()).filter(Boolean) : all);
  return {
    motifs: list('--motif', MOTIFS),
    formats: list('--format', ['post', 'story']),
    langs: list('--lang', LANGS),
    ogOnly: a.includes('--og'),
    noOg: a.includes('--no-og') || ((a.includes('--motif') || a.includes('--format')) && !a.includes('--og')),
    check: a.includes('--check'),
    serve: a.includes('--serve') ? Number(get('--serve')) || 8940 : 0,
    jobs: Number(get('--jobs')) || 4,
  };
}

async function loadPw() {
  const { loadPlaywright, launchOptions } = await import(path.join(ROOT, 'test/helpers/playwright.js'));
  return { pw: await loadPlaywright(), launchOptions };
}

/**
 * PNG verkleinern (braucht ffmpeg, sonst bleibt die Datei wie sie ist):
 * 1. auf 256 Farben – bei flachen Grafiken praktisch unsichtbar; nur behalten, wenn SSIM ≥ 0,985,
 * 2. sonst verlustfrei neu packen.
 */
function optimizePng(file) {
  const pal = `${file}.pal.png`;
  const zip = `${file}.zip.png`;
  const run = (a) => spawnSync('ffmpeg', ['-v', 'info', '-y', ...a], { encoding: 'utf8' });
  try {
    const before = fs.statSync(file).size;
    let best = { f: file, size: before, how: '' };
    if (run(['-i', file, '-filter_complex', '[0:v]split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', '-pix_fmt', 'pal8', pal]).status === 0) {
      const cmp = run(['-i', file, '-i', pal, '-lavfi', '[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]ssim', '-f', 'null', '-']);
      const m = /All:([\d.]+)/.exec(cmp.stderr || '');
      const ssim = m ? Number(m[1]) : 0;
      if (ssim >= 0.985 && fs.statSync(pal).size < best.size) best = { f: pal, size: fs.statSync(pal).size, how: `256 Farben, SSIM ${ssim.toFixed(3)}` };
    }
    if (best.f === file && run(['-i', file, '-pred', 'mixed', '-compression_level', '9', zip]).status === 0 && fs.statSync(zip).size < best.size) {
      best = { f: zip, size: fs.statSync(zip).size, how: 'verlustfrei' };
    }
    if (best.f !== file) fs.renameSync(best.f, file);
    return best.how;
  } catch {
    return '';
  } finally {
    fs.rmSync(pal, { force: true });
    fs.rmSync(zip, { force: true });
  }
}

async function main() {
  const o = args();
  const { server, port } = await startServer(o.serve || 0);
  const base = `http://127.0.0.1:${port}/marketing/templates/social.html`;
  if (o.serve) {
    console.log(`Vorlage: ${base}?motif=cat-me&format=post&lang=en`);
    console.log(`Galerie: http://127.0.0.1:${port}/marketing/templates/gallery.html`);
    return;
  }
  const jobs = [];
  if (!o.ogOnly) {
    for (const motif of o.motifs) for (const format of o.formats) for (const lang of o.langs) jobs.push({ motif, format, lang });
  }
  if (!o.noOg || o.ogOnly) for (const lang of o.langs) jobs.push({ motif: 'og', format: 'og', lang });
  for (const j of jobs) {
    if (j.motif !== 'og' && !MOTIFS.includes(j.motif)) throw new Error(`Unbekanntes Motiv: ${j.motif}`);
    if (!FORMATS[j.format]) throw new Error(`Unbekanntes Format: ${j.format}`);
    if (!LANGS.includes(j.lang)) throw new Error(`Unbekannte Sprache: ${j.lang}`);
  }
  fs.mkdirSync(OUT_SOCIAL, { recursive: true });
  fs.mkdirSync(OUT_MEDIA, { recursive: true });

  const { pw, launchOptions } = await loadPw();
  const browser = await pw.chromium.launch(launchOptions());
  const results = [];
  let failed = 0;
  const queue = [...jobs];
  async function worker() {
    const ctx = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    while (queue.length) {
      const j = queue.shift();
      const { w, h } = FORMATS[j.format];
      errors.length = 0;
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${base}?motif=${j.motif}&format=${j.format}&lang=${j.lang}`, { waitUntil: 'load' });
      await page.waitForFunction(() => document.documentElement.dataset.ready, null, { timeout: 30000 });
      const state = await page.evaluate(() => document.documentElement.dataset.ready);
      if (state === 'error') errors.push(await page.evaluate(() => document.documentElement.dataset.error));
      const lay = state === 'error' ? { issues: [], scale: '', sizes: '' } : await page.evaluate(() => window.__layout());
      const issues = [...errors, ...lay.issues];
      let file = '';
      let size = 0;
      let quality = JPEG_QUALITY;
      if (!o.check) {
        const clip = { x: 0, y: 0, width: w, height: h };
        if (j.motif === 'og') {
          file = path.join(OUT_MEDIA, `og-${j.lang}.png`);
          fs.writeFileSync(file, await page.screenshot({ type: 'png', clip }));
          optimizePng(file);
          size = fs.statSync(file).size;
          if (size > MAX_PNG) issues.push(`PNG zu groß: ${(size / 1024).toFixed(0)} KB`);
          if (j.lang === 'en') fs.copyFileSync(file, path.join(OUT_MEDIA, 'og.png'));
        } else {
          file = path.join(OUT_SOCIAL, `${j.motif}-${j.format}-${j.lang}.jpg`);
          let buf = await page.screenshot({ type: 'jpeg', quality, clip });
          while (buf.length > MAX_JPEG && quality > 70) {
            quality -= 4;
            buf = await page.screenshot({ type: 'jpeg', quality, clip });
          }
          fs.writeFileSync(file, buf);
          size = buf.length;
          if (size > MAX_JPEG) issues.push(`JPEG zu groß: ${(size / 1024).toFixed(0)} KB`);
        }
      }
      if (issues.length) failed++;
      const name = j.motif === 'og' ? `og-${j.lang}.png` : `${j.motif}-${j.format}-${j.lang}.jpg`;
      results.push({ name, size, quality, scale: lay.scale, sizes: lay.sizes, issues });
      const kb = size ? `${(size / 1024).toFixed(0).padStart(4)} KB${quality !== JPEG_QUALITY && j.motif !== 'og' ? ` (q${quality})` : ''}` : '';
      console.log(`${issues.length ? '✗' : '✓'} ${name.padEnd(36)} ${kb}  Bühne ${lay.scale}  ${lay.sizes}`);
      for (const i of issues) console.log(`    · ${i}`);
    }
    await ctx.close();
  }
  await Promise.all(Array.from({ length: Math.min(o.jobs, jobs.length) }, worker));
  await browser.close();
  server.close();
  console.log(`\n${jobs.length} Bilder, ${failed ? `${failed} mit Hinweisen` : 'alle in Ordnung'}.`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
