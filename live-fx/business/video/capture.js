#!/usr/bin/env node
// Renders trailer.html frame by frame with a deterministic clock (render(t)) and pipes JPEGs into ffmpeg.
//   node capture.js 9x16              -> LiveFX_Trailer_9x16.mp4  (1080×1920)
//   node capture.js 16x9              -> LiveFX_Trailer_16x9.mp4  (1920×1080)
//   node capture.js 9x16 --stills     -> stills/9x16-<t>.jpg for 4 key frames (no video)
//   node capture.js 9x16 --stills=2,12.6,25.5   custom times
// Env: FFMPEG (binary path, default "ffmpeg"), FPS (default 30), CRF (default 20), PRESET (default medium).
// Needs a full ffmpeg (libx264 + aac), e.g. apt-get install ffmpeg. The Playwright-bundled ffmpeg is VP8/webm-only.
// Audio: music.wav (node music.js) is muxed with -shortest and a 2 s fade-out at the end of the video.
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FF = process.env.FFMPEG || 'ffmpeg';
const ratio = process.argv.includes('16x9') ? '16x9' : '9x16';
const stillArg = process.argv.find((a) => a.startsWith('--stills'));
const FPS = Number(process.env.FPS || 30), CRF = process.env.CRF || '20', PRESET = process.env.PRESET || 'medium';
const W = ratio === '9x16' ? 1080 : 1920, H = ratio === '9x16' ? 1920 : 1080;
const OUT = path.join(__dirname, `LiveFX_Trailer_${ratio}.mp4`);
const MUSIC = path.join(__dirname, 'music.wav');
const KEY_STILLS = [2.7, 6.9, 29.6, 48.3];

(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => { console.error('page error:', e); process.exitCode = 1; });
  await p.goto('file://' + path.join(__dirname, 'trailer.html') + `?capture&ratio=${ratio}`);
  await p.evaluate(async () => { await window.READY; });
  const dur = await p.evaluate(() => DUR);
  const shot = async (t, quality = 90) => { await p.evaluate((t) => render(t), t); return p.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width: W, height: H } }); };

  if (stillArg) {
    const times = stillArg.includes('=') ? stillArg.split('=')[1].split(',').map(Number) : KEY_STILLS;
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    for (const t of times) {
      const f = path.join(__dirname, 'stills', `${ratio}-${String(t).replace('.', '_')}s.jpg`);
      fs.writeFileSync(f, await shot(t, 85)); console.log('still', f);
    }
    await b.close(); return;
  }

  const tmp = path.join(__dirname, `.video_${ratio}.mp4`);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (FPS * 5) === 0) console.log(`${ratio} frame ${i}/${n}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  await b.close();

  if (fs.existsSync(MUSIC)) {
    const r = spawnSync(FF, ['-y', '-loglevel', 'error', '-i', tmp, '-i', MUSIC, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', `afade=t=out:st=${dur - 2}:d=2`, '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('mux failed');
    fs.unlinkSync(tmp);
  } else { fs.renameSync(tmp, OUT); console.warn('music.wav missing – video without audio (run: node music.js)'); }
  console.log('done', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch((e) => { console.error(e); process.exit(1); });
