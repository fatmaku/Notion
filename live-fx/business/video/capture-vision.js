#!/usr/bin/env node
// Renders vision.html frame by frame with a deterministic clock (render(t)) and pipes JPEG frames into ffmpeg.
// Frames are read straight from the canvas (toDataURL) – faster than page screenshots.
//   node capture-vision.js 9x16 --lang=de            -> LiveFX_Vision_de_9x16.mp4  (1080×1920)
//   node capture-vision.js 16x9 --lang=tr            -> LiveFX_Vision_tr_16x9.mp4  (1920×1080)
//   node capture-vision.js 9x16 --lang=en --stills   -> stills/vision-en-9x16-<t>s.jpg at 2/8/15/22/29/34 s
//   node capture-vision.js 9x16 --lang=de --stills=4.5,12.6   custom times
// Env: FFMPEG (default "ffmpeg"), FPS (default 30), CRF (default 24), PRESET (default medium).
// Audio: music-vision.wav (node music-vision.js) is muxed with a 2 s fade-out; without it the video stays silent.
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FF = process.env.FFMPEG || 'ffmpeg';
const ratio = process.argv.includes('16x9') ? '16x9' : '9x16';
const langArg = (process.argv.find((a) => a.startsWith('--lang=')) || '--lang=de').split('=')[1];
const lang = ['de', 'tr', 'en'].includes(langArg) ? langArg : 'de';
const stillArg = process.argv.find((a) => a.startsWith('--stills'));
const FPS = Number(process.env.FPS || 30), CRF = process.env.CRF || '24', PRESET = process.env.PRESET || 'medium';
const W = ratio === '9x16' ? 1080 : 1920, H = ratio === '9x16' ? 1920 : 1080;
const OUT = path.join(__dirname, `LiveFX_Vision_${lang}_${ratio}.mp4`);
const MUSIC = path.join(__dirname, 'music-vision.wav');
const KEY_STILLS = [2, 8, 15, 22, 29, 34];

(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu', '--disable-accelerated-2d-canvas'] /* software 2D canvas: ~30x faster than SwiftShader here */ });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => { console.error('page error:', e); process.exitCode = 1; });
  await p.goto('file://' + path.join(__dirname, 'vision.html') + `?capture&ratio=${ratio}&lang=${lang}`);
  await p.evaluate(async () => { await window.READY; });
  const dur = await p.evaluate(() => DUR);
  const frame = async (t, q = 0.9) => {
    const url = await p.evaluate(([t, q]) => { render(t); return document.getElementById('c').toDataURL('image/jpeg', q); }, [t, q]);
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  };

  if (stillArg) {
    const times = stillArg.includes('=') ? stillArg.split('=')[1].split(',').map(Number) : KEY_STILLS;
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    for (const t of times) {
      const f = path.join(__dirname, 'stills', `vision-${lang}-${ratio}-${String(t).replace('.', '_')}s.jpg`);
      fs.writeFileSync(f, await frame(t, 0.88)); console.log('still', f);
    }
    await b.close(); return;
  }

  const tmp = path.join(__dirname, `.vision_${lang}_${ratio}.mp4`);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-pix_fmt', 'yuv420p', '-threads', '2', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frame(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (FPS * 5) === 0) console.log(`${lang} ${ratio} frame ${i}/${n}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  await b.close();

  if (fs.existsSync(MUSIC)) {
    const r = spawnSync(FF, ['-y', '-loglevel', 'error', '-i', tmp, '-i', MUSIC, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-af', `afade=t=out:st=${dur - 2}:d=2`, '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('mux failed');
    fs.unlinkSync(tmp);
  } else { fs.renameSync(tmp, OUT); console.warn('music-vision.wav missing – video without audio (run: node music-vision.js)'); }
  console.log('done', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch((e) => { console.error(e); process.exit(1); });
