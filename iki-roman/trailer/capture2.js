#!/opt/node22/bin/node
// Renders engine2.html frame by frame (deterministic clock) with Playwright/Chromium and pipes JPEG frames into ffmpeg.
// Usage:
//   node capture2.js --page engine2.html --format 16x9 --lang tr --out out/x.mp4 [--fps 30] [--from f --to f] [--quality 90] [--cut 60|30]
//   node capture2.js --page engine2.html --format 16x9 --lang tr --stills 2,5,9 [--stills-dir out/storyboard]
// Stills are written as JPEG to out/storyboard/<format>_<lang>_t<sec>.jpg. --swiftshader uses the GPU-emulation flags of the old engine.
// ffmpeg: env FFMPEG, otherwise the imageio-ffmpeg binary (has libx264/aac), otherwise "ffmpeg" from PATH.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path');

const args = {}; const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true; args[k] = v; } }
const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] };
const format = args.format || '16x9', lang = (args.lang || 'tr').toLowerCase();
if (!FORMATS[format]) { console.error('unknown --format', format, '(16x9 | 9x16 | 1x1)'); process.exit(2); }
const [Wd, Ht] = FORMATS[format];
const page = args.page || 'engine2.html', fps = +(args.fps || 30), quality = +(args.quality || 90);
const cut = args.cut ? `&cut=${args.cut}` : '';
const url = 'file://' + path.resolve(__dirname, page) + `?capture&format=${format}&lang=${lang}${cut}`;

function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { const p = execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); if (p && fs.existsSync(p)) return p; } catch (e) { }
  return 'ffmpeg';
}

(async () => {
  // Software compositing (--disable-gpu) screenshots this page 2.5-3x faster than the swiftshader path on this box; --swiftshader opts back in.
  const gpuArgs = args.swiftshader ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--disable-gpu'];
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', ...gpuArgs, '--font-render-hinting=none', '--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: Wd, height: Ht }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto(url);
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => { }))); if (window.READY) await window.READY; });
  const info = await p.evaluate(() => ({ dur: window.DUR, stage: window.STAGE, fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style) }));
  console.log(`engine: ${JSON.stringify(info.stage)} DUR=${info.dur}s fonts=[${[...new Set(info.fonts)].join(', ')}]`);
  const shot = async t => { await p.evaluate(t => render(t), t); return p.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width: Wd, height: Ht } }); };

  if (args.stills) {
    const dir = path.resolve(__dirname, args['stills-dir'] || 'out/storyboard'); fs.mkdirSync(dir, { recursive: true });
    for (const t of String(args.stills).split(',').map(Number)) {
      const f = path.join(dir, `${format}_${lang}_t${String(t).replace('.', '_')}.jpg`); fs.writeFileSync(f, await shot(t)); console.log('still', f);
    }
  } else {
    const out = args.out; if (!out) { console.error('--out <file.mp4> required'); process.exit(2); }
    fs.mkdirSync(path.dirname(path.resolve(__dirname, out)), { recursive: true });
    const FF = ffmpegBin();
    const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', path.resolve(__dirname, out)], { stdio: ['pipe', 'inherit', 'inherit'] });
    const total = Math.round(info.dur * fps);
    const from = +(args.from || 0), to = Math.min(total, +(args.to || Infinity));
    const t0 = Date.now();
    for (let i = from; i < to; i++) {
      const buf = await shot(i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 300 === 0 && i > from) console.log(`${format}/${lang} frame ${i}/${to} (${((i - from) / ((Date.now() - t0) / 1000)).toFixed(1)} fps)`);
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    console.log(`${format}/${lang} done: ${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out} (ffmpeg exit ${code})`);
    if (code) process.exitCode = 1;
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
