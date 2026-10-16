#!/usr/bin/env node
// Renders video/trailer.html frame by frame (deterministic render(t)) and pipes JPEGs into ffmpeg.
//   node video/capture.js 16x9            -> video/Ladeklar_Trailer_16x9.mp4 (1920×1080, 72 s)
//   node video/capture.js 9x16            -> video/Ladeklar_Trailer_9x16.mp4 (1080×1920, 30 s)
//   node video/capture.js 16x9 --stills=2,31,44   -> video/stills/16x9-<t>.jpg
// Options: --url=ladeklar.de (end card), env FPS (30), CRF (19). Music: python3 video/music.py
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ratio = process.argv.includes('9x16') ? '9x16' : '16x9';
const stills = process.argv.find((a) => a.startsWith('--stills'));
const url = (process.argv.find((a) => a.startsWith('--url=')) || '--url=ladeklar.de').slice(6);
const FPS = Number(process.env.FPS || 30), CRF = process.env.CRF || '19';
const W = ratio === '9x16' ? 1080 : 1920, H = ratio === '9x16' ? 1920 : 1080;
const OUT = path.join(ROOT, 'video', `Ladeklar_Trailer_${ratio}.mp4`);
const MUSIC = path.join(ROOT, 'video', ratio === '9x16' ? 'music-30.wav' : 'music-72.wav');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (p.startsWith('/web/fonts/')) f = path.join(ROOT, p);
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
p.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await p.goto(`${base}/video/trailer.html?ratio=${ratio}&url=${encodeURIComponent(url)}`);
await p.evaluate(async () => { await window.READY; });
const dur = await p.evaluate(() => window.DUR);
const shot = async (t, q = 92) => { await p.evaluate((t) => window.render(t), t); return p.screenshot({ type: 'jpeg', quality: q, clip: { x: 0, y: 0, width: W, height: H } }); };

if (stills) {
  const times = stills.includes('=') ? stills.split('=')[1].split(',').map(Number) : [2, 6, 11, 16, 21, 25, 29, 32, 36, 41, 45, 50, 55, 60, 65, 70];
  const dir = path.join(ROOT, 'video', 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of times) { const f = path.join(dir, `${ratio}-${String(t).replace('.', '_')}.jpg`); fs.writeFileSync(f, await shot(t, 82)); console.log('still', f); }
  await b.close(); srv.close(); process.exit();
}

const tmp = path.join(ROOT, 'video', `.video_${ratio}.mp4`);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(dur * FPS), t0 = Date.now();
for (let i = 0; i < n; i++) {
  const buf = await shot(i / FPS);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (FPS * 6) === 0) console.log(`${ratio} ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
await b.close(); srv.close();
if (fs.existsSync(MUSIC)) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-i', MUSIC, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('mux failed');
  fs.unlinkSync(tmp);
} else { fs.renameSync(tmp, OUT); console.warn('music missing – python3 video/music.py'); }
console.log('done', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB in', ((Date.now() - t0) / 1000).toFixed(0), 's');
