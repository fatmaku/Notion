// Renders trailer.html frame by frame (deterministic clock) and pipes JPEGs into ffmpeg.
// Usage: node capture.js out.mp4 [fps]   |   node capture.js --stills t1,t2,...
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const FF = process.env.FFMPEG || 'ffmpeg';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/trailer.html?capture');
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
  const shot = async t => { await p.evaluate(t => render(t), t); return p.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1920 } }); };
  if (process.argv[2] === '--stills') {
    for (const t of process.argv[3].split(',').map(Number)) require('fs').writeFileSync(`${__dirname}/still-${t}.jpg`, await shot(t));
  } else {
    const fps = +(process.argv[3] || 30), dur = await p.evaluate(() => DUR), out = process.argv[2];
    const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < dur * fps; i++) {
      const buf = await shot(i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 300 === 0) console.log('frame', i);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
