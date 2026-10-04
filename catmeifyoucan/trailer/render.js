// Cat Me If You Can – Trailer rendern: Bild für Bild mit Playwright, Musik dazu, H.264/AAC.
//
//   node trailer/render.js --lang en --format 16x9      ein Video
//   node trailer/render.js --all                        alle 6 Sprachen × 2 Formate
//   Optionen: --lang en,tr  --format 16x9,9x16  --jobs 2  --out public/media  --crf 20
//
// Ergebnis: public/media/trailer-<format>-<lang>.mp4 und Standbild trailer-<format>-<lang>.jpg

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.js';
import { writeWav } from './music.js';
import { FPS, DURATION } from './timeline.js';
import { LANGS } from './texts.js';
import { loadPlaywright, launchOptions } from '../test/helpers/playwright.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORMATS = ['16x9', '9x16'];
const POSTER_T = 10.6; // Sammelkarte mit Name – starkes, buntes Standbild
const MAX_BYTES = 6 * 1024 * 1024;

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const all = argv.includes('--all');
const langs = all ? LANGS : opt('lang', 'en').split(',');
const formats = all ? FORMATS : opt('format', '16x9').split(',');
const jobs = Math.max(1, Number(opt('jobs', 2)));
const outDir = path.resolve(opt('out', path.join(HERE, '..', 'public', 'media')));
const crf = String(opt('crf', 20));
for (const l of langs) if (!LANGS.includes(l)) throw new Error(`Unbekannte Sprache: ${l}`);
for (const f of formats) if (!FORMATS.includes(f)) throw new Error(`Unbekanntes Format: ${f}`);

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-trailer-'));
const music = writeWav(path.join(tmp, 'music.wav'));

function ffmpeg(args) {
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  const done = new Promise((resolve, reject) => {
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-2000)}`))));
  });
  return { p, done };
}
const write = (stream, buf) => new Promise((resolve, reject) => (stream.write(buf, (e) => (e ? reject(e) : resolve()))));

async function renderOne(browser, port, lang, format) {
  const [w, h] = format === '9x16' ? [1080, 1920] : [1920, 1080];
  const name = `trailer-${format}-${lang}`;
  const mp4 = path.join(outDir, `${name}.mp4`);
  const part = path.join(tmp, `${name}.mp4`);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/trailer/scene.html?lang=${lang}&format=${format}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(`${name}: ${err}`);

  const frames = Math.round(DURATION * FPS);
  // H.264 High, yuv420p (TV-Bereich, BT.709), schneller Start im Browser (+faststart).
  // CRF mit Obergrenze für die Bitrate: so bleibt jedes Video sicher unter 6 MB.
  const ff = ffmpeg([
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', music,
    '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-maxrate', '1500k', '-bufsize', '3000k',
    '-profile:v', 'high', '-level:v', '4.0', '-g', String(FPS * 2), '-r', String(FPS),
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-t', String(DURATION), '-movflags', '+faststart',
    '-metadata', `title=Cat Me If You Can – Trailer (${lang}, ${format})`,
    '-metadata', 'artist=HappyTuncay', '-metadata', `language=${lang}`,
    part,
  ]);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.renderAt(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    await write(ff.p.stdin, buf);
    if (i % 150 === 0) process.stdout.write(`  ${name}: ${i}/${frames}\n`);
  }
  ff.p.stdin.end();
  await ff.done;
  await page.evaluate((t) => window.renderAt(t), POSTER_T);
  await page.screenshot({ type: 'jpeg', quality: 86, path: path.join(outDir, `${name}.jpg`) });
  await page.close();
  if (errors.length) throw new Error(`${name}: ${errors.join('; ')}`);
  const size = fs.statSync(part).size;
  if (size > MAX_BYTES) throw new Error(`${name}: ${(size / 1048576).toFixed(2)} MB > 6 MB – höheres --crf wählen`);
  fs.copyFileSync(part, mp4);
  fs.rmSync(part);
  console.log(`✓ ${path.relative(process.cwd(), mp4)}  ${(size / 1048576).toFixed(2)} MB  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

const { server, port } = await startServer(0);
const pw = await loadPlaywright();
const browser = await pw.chromium.launch(launchOptions());
const queue = [];
for (const lang of langs) for (const format of formats) queue.push([lang, format]);
let failed = 0;
try {
  await Promise.all(
    Array.from({ length: Math.min(jobs, queue.length) }, async () => {
      while (queue.length) {
        const [lang, format] = queue.shift();
        try {
          await renderOne(browser, port, lang, format);
        } catch (e) {
          failed++;
          console.error(`✗ ${lang} ${format}: ${e.message}`);
        }
      }
    }),
  );
} finally {
  await browser.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (failed) process.exit(1);
