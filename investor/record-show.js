#!/usr/bin/env node
// Records LiveFX_Investor_Show.html to LiveFX_Investor_Show_<DE|TR|EN>.mp4 (1920×1080, 30 fps, H.264 + AAC).
// Frames are rendered deterministically (window.renderAt(t) pauses every CSS animation at time t),
// so the video is smooth regardless of machine speed.
//   node record-show.js                 -> all three languages
//   node record-show.js tr              -> one language
// Env: FFMPEG (default /usr/bin/ffmpeg), MUSIC (wav bed; generate with ../live-fx/business/video/music.js 150 <file>),
//      FPS (30), CRF (24).
'use strict';
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FF = process.env.FFMPEG || '/usr/bin/ffmpeg';
const FPS = Number(process.env.FPS || 30), CRF = process.env.CRF || '24';
const MUSIC = process.env.MUSIC || '';
const SHOW = path.join(__dirname, 'LiveFX_Investor_Show.html');

async function record(lang) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await p.goto('file://' + SHOW + `?capture&lang=${lang}`);
  await p.evaluate(async () => { await window.READY; });
  const dur = await p.evaluate(() => window.TOTAL);
  const tmp = path.join(os.tmpdir(), `lfx-show-${lang}.mp4`);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.renderAt(t), i / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (FPS * 15) === 0) console.log(`${lang} frame ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  await b.close();
  const out = path.join(__dirname, `LiveFX_Investor_Show_${lang.toUpperCase()}.mp4`);
  if (MUSIC && fs.existsSync(MUSIC)) {
    const r = spawnSync(FF, ['-y', '-loglevel', 'error', '-i', tmp, '-i', MUSIC, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '128k', '-af', `volume=0.8,afade=t=in:st=0:d=1,afade=t=out:st=${dur - 3}:d=3`, '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('mux failed');
    fs.unlinkSync(tmp);
  } else { fs.copyFileSync(tmp, out); fs.unlinkSync(tmp); console.warn('no MUSIC – video without audio'); }
  console.log('done', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB in', ((Date.now() - t0) / 1000).toFixed(0), 's');
}

(async () => {
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['de', 'tr', 'en'];
  for (const l of langs) await record(l);
})().catch((e) => { console.error(e); process.exit(1); });
