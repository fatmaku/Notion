// Sketch layer ("Zeichenfilm", js/sketch.js, LiveFX 2.3): the live story drawn as a whiteboard animation inside the
// story band. Overlay in band mode with storyStyle sketch: a story state rain + forest + car (+ girl) is drawn in
// progressively (pen), after 1.5 s there is ink inside the band and nothing above it; ≤ 2 ms JavaScript per frame
// at 1080p while drawing in and in the steady state, and the whole main thread (JS + the browser's canvas raster and
// upload, CDP TaskDuration) at most 2× the emoji style on the same scene (mixed ≤ 1.5×), ≤ 30 drawn frames per
// second; diff (removed car is wiped out, a new house draws in, the rest stays put); style switch sketch -> mixed -> emoji ->
// sketch; idle band stops + clears the drawing and the next touch brings it back; `end` erases everything and the rAF
// loop stops; the recording helper produces a WebM; 9:16 portrait with the band at the very bottom.
// Screenshots: sketch-16x9.png, sketch-9x16.png (+ sketch-16x9-band.png, sketch-9x16-band.png close-ups),
// sketch-mixed-9x16.png.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RAIN_FOREST_CAR = {
  scene: 'rain',
  weather: 'rain',
  time: 'day',
  place: 'forest',
  mood: 'calm',
  caption: '',
  actors: [{ emoji: '👧', role: 'girl', action: 'go' }],
  props: [{ emoji: '🚗', role: 'car' }],
};
// A camera-like backdrop for the screenshots only (the overlay itself is transparent).
const CAMERA_BG = 'linear-gradient(135deg, #6b7a8f 0%, #c9b79c 50%, #3d5a6c 100%)';

/** Ink on the sketch canvas: near-white opaque pixels (white ink) and any painted pixel; plus where it sits. */
function probeSketch() {
  const c = document.querySelector('#stage > .fx-band > canvas.fx-sketch');
  const band = document.querySelector('#stage > .fx-band');
  if (!c || !band) return null;
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let ink = 0;
  let painted = 0;
  let minY = c.height;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 8) painted++;
    if (d[i + 3] >= 180 && d[i] >= 200 && d[i + 1] >= 200 && d[i + 2] >= 200) {
      ink++;
      const y = Math.floor(i / 4 / c.width);
      if (y < minY) minY = y;
    }
  }
  const cr = c.getBoundingClientRect();
  const br = band.getBoundingClientRect();
  return {
    ink,
    painted,
    minY,
    canvas: { w: c.width, h: c.height, top: Math.round(cr.top), bottom: Math.round(cr.bottom), left: Math.round(cr.left), right: Math.round(cr.right) },
    band: { top: Math.round(br.top), bottom: Math.round(br.bottom), left: Math.round(br.left), right: Math.round(br.right), h: Math.round(br.height) },
    display: getComputedStyle(c).display,
    vh: innerHeight,
  };
}

/** Max alpha of a transparent page screenshot (data URL) in the rows above `top` (sampled every 4 px). */
async function alphaAbove({ dataUrl, top }) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const h = Math.max(0, Math.min(img.height, Math.floor(top)));
  if (!h) return { max: 0, rows: 0 };
  const d = g.getImageData(0, 0, img.width, h).data;
  let max = 0;
  for (let y = 0; y < h; y += 4) for (let x = 0; x < img.width; x += 4) max = Math.max(max, d[(y * img.width + x) * 4 + 3]);
  return { max, rows: h };
}

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  const { base } = server;
  try {
    // ---------------------------------------------------------------- 1. 16:9 1920×1080, band, storyStyle sketch
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'warning' && /sketch/i.test(m.text())) errors.push(m.text());
    });
    await page.goto(`${base}/overlay.html?perf=high&storystyle=sketch&story=band`);
    await page.waitForFunction(() => window.livefx && window.livefx.director && window.LiveFXSketch, null, { timeout: 5000 });

    const lib = await page.evaluate(() => ({ n: window.LiveFXSketch.LIBRARY.length, version: window.LiveFXSketch.VERSION, car: window.LiveFXSketch.pathFor('car').strokes.length }));
    assert.ok(lib.n >= 24, `library: ${lib.n}`);
    assert.ok(lib.car > 3, 'pathFor works in the page');

    // story state -> the renderer attaches the sketch (hook in js/fx.js) and hands the state over
    const t0 = await page.evaluate((st) => {
      const R = window.livefx.renderer;
      R.story(st);
      if (!R.sketch) {
        // hook not in this fx.js yet: wire it the way the renderer does
        R.sketch = window.LiveFXSketch.attach(R, () => (typeof R.sketchSurface === 'function' ? R.sketchSurface() : null));
        R.sketch.setStyle('sketch');
        R.sketch.update({ ...R.storyState, style: 'sketch', idle: false });
      }
      R.sketch.resetStats(); // frame times of the draw-in below
      return performance.now();
    }, RAIN_FOREST_CAR);
    const early = await page.evaluate(() => {
      const s = window.livefx.renderer.sketch;
      return { attached: !!s && s === window.LiveFXSketch.attach(window.livefx.renderer), style: s.style, data: document.querySelector('#stage > .fx-band').dataset.style };
    });
    log('attached', JSON.stringify(early));
    assert.deepEqual(early, { attached: true, style: 'sketch', data: 'sketch' }, 'LiveFXSketch attached once, style sketch');

    await sleep(320);
    const p300 = await page.evaluate(probeSketch);
    const s300 = await page.evaluate(() => ({ ...window.livefx.renderer.sketch.stats }));
    log('t≈0.3 s', JSON.stringify({ ink: p300.ink, drawing: s300.drawing, running: s300.running }));
    assert.ok(s300.drawing > 0, 'elements are still being drawn in at 0.3 s');
    assert.equal(s300.running, true, 'rAF loop runs while drawing');

    // ≥ 1.5 s after the state: ink inside the band (more than at 0.3 s – drawn progressively), nothing above
    const wait = 1500 - (await page.evaluate((t) => performance.now() - t, t0));
    if (wait > 0) await sleep(wait);
    const p15 = await page.evaluate(probeSketch);
    log('t≈1.5 s', JSON.stringify(p15));
    assert.ok(p15.ink > 1500, `ink pixels in the band after 1.5 s: ${p15.ink}`);
    assert.ok(p15.ink > p300.ink * 1.3, `drawn progressively (${p300.ink} -> ${p15.ink})`);
    assert.equal(p15.display, 'block');
    assert.ok(p15.canvas.top >= p15.band.top - 1 && p15.canvas.bottom <= p15.band.bottom + 1, 'sketch canvas inside the band');
    assert.ok(Math.abs(p15.canvas.w - (p15.canvas.right - p15.canvas.left)) <= 2, 'canvas resolution = band size (dpr 1)');
    assert.equal(p15.band.bottom, 1080, 'band at the bottom');
    assert.ok(p15.band.h >= 200 && p15.band.h <= 260, `band 22 % high (${p15.band.h})`);
    const shot = await page.screenshot({ omitBackground: true });
    const above = await page.evaluate(alphaAbove, { dataUrl: `data:image/png;base64,${shot.toString('base64')}`, top: p15.band.top - 2 });
    log('above the band', JSON.stringify(above));
    assert.ok(above.rows > 700, 'probed the camera area');
    assert.equal(above.max, 0, 'no pixel above the band (camera stays clear)');

    await page.waitForFunction(() => window.livefx.renderer.sketch.stats.drawing === 0, null, { timeout: 4000 });
    const drawIn = await page.evaluate(() => ({ ...window.livefx.renderer.sketch.stats }));
    log('draw-in JS', JSON.stringify({ frames: drawIn.frames, meanMs: drawIn.meanMs, p95Ms: drawIn.p95Ms, maxMs: drawIn.maxMs, rebuilds: drawIn.rebuilds }));
    assert.ok(drawIn.frames >= 30, `draw-in frames: ${drawIn.frames}`);
    // pen strokes, sprites rasterised (pose frames: at most one per frame) and the settled-scenery cache repainted
    // (at most every 300 ms) – a single frame may take a few ms, the phase on average not
    assert.ok(drawIn.meanMs <= 2, `draw-in: ≤ 2 ms JS per frame on average (${drawIn.meanMs} ms)`);
    const full = await page.evaluate(() => {
      const s = window.livefx.renderer.sketch;
      const els = s.elements;
      return { keys: els.map((e) => e.key), states: [...new Set(els.map((e) => e.state))], car: els.find((e) => e.key === 'prop:car'), girl: els.find((e) => e.key === 'actor:girl'), stats: { ...s.stats } };
    });
    log('elements', JSON.stringify(full.keys));
    for (const k of ['ground:horizon', 'prop:car', 'actor:girl', 'wx:rain']) assert.ok(full.keys.includes(k), `drawn: ${k}`);
    assert.ok(full.keys.filter((k) => k.startsWith('forest:')).length >= 3, 'forest trees');
    assert.ok(full.keys.some((k) => k.startsWith('sky:cloud:')), 'rain clouds');
    assert.deepEqual(full.states, ['show'], 'everything drawn in');
    assert.equal(full.car.id, 'car');
    assert.equal(full.stats.running, true, 'rain + walking girl keep animating');

    // performance: steady state (rain falling, girl walking, clouds drifting) at 1080p – JavaScript per drawn frame
    await sleep(500); // colour washes merged, caches settled
    await page.evaluate(() => window.livefx.renderer.sketch.resetStats());
    await sleep(2000);
    const perf = await page.evaluate(() => ({ ...window.livefx.renderer.sketch.stats }));
    log('perf 1080p JS', JSON.stringify({ frames: perf.frames, meanMs: perf.meanMs, p95Ms: perf.p95Ms, maxMs: perf.maxMs, fps: perf.fps, cached: perf.cached, rebuilds: perf.rebuilds, sprites: perf.sprites }));
    assert.ok(perf.frames >= 40 && perf.frames <= 66, `rain + walking: ~30 drawn frames per second (${perf.frames} in 2 s)`);
    assert.ok(perf.meanMs <= 2, `≤ 2 ms JS per frame (mean ${perf.meanMs} ms)`);
    assert.ok(perf.p95Ms <= 2, `p95 ≤ 2 ms JS (${perf.p95Ms} ms)`);
    assert.ok(perf.cached >= 1, `the settled scenery is blitted from a cache (${perf.cached})`);

    // the whole main thread (CDP TaskDuration: JS + the canvas raster / upload Chromium does when it commits a
    // frame): sketch steady state vs the sketch loop frozen vs the same scene in style mixed and emoji
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const taskPerSec = async (ms) => {
      const read = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value;
      const a = await read();
      await sleep(ms);
      return Math.round(((await read()) - a) * 1000 * (1000 / ms));
    };
    const fr0 = await page.evaluate(() => window.livefx.renderer.sketch.stats.frames);
    const main = { sketch: await taskPerSec(3000) };
    main.drawnFps = Math.round(((await page.evaluate(() => window.livefx.renderer.sketch.stats.frames)) - fr0) / 3);
    await page.evaluate(() => {
      const s = window.livefx.renderer.sketch;
      s.__kick = s._kick;
      s._kick = () => {};
      s._stop();
    });
    main.frozen = await taskPerSec(2000);
    await page.evaluate(() => {
      const s = window.livefx.renderer.sketch;
      s._kick = s.__kick;
      delete s.__kick;
      s._kick();
      window.livefx.renderer.setLayout({ storyStyle: 'mixed' });
    });
    await sleep(2000);
    main.mixed = await taskPerSec(3000);
    await page.evaluate(() => window.livefx.renderer.setLayout({ storyStyle: 'emoji' }));
    await sleep(800);
    main.emoji = await taskPerSec(3000);
    main.msPerDrawnFrame = Math.round(((main.sketch - main.frozen) / Math.max(1, main.drawnFps)) * 10) / 10;
    log('main thread ms/s', JSON.stringify(main));
    assert.ok(main.frozen <= 25, `sketch loop frozen: the rest of the overlay is idle (${main.frozen} ms/s)`);
    assert.ok(main.drawnFps <= 32, `≤ 30 drawn frames per second in the steady state (${main.drawnFps})`);
    assert.ok(main.sketch <= 2 * main.emoji, `sketch ≤ 2× emoji style on the main thread (${main.sketch} vs ${main.emoji} ms/s)`);
    assert.ok(main.mixed <= 1.5 * main.emoji, `mixed ≤ 1.5× emoji style (${main.mixed} vs ${main.emoji} ms/s)`);
    await cdp.detach();
    // back to sketch: drawn in again (diff below needs the scene on stage)
    await page.evaluate(() => window.livefx.renderer.setLayout({ storyStyle: 'sketch' }));
    await sleep(300);
    await page.waitForFunction(() => window.livefx.renderer.sketch.stats.drawing === 0 && window.livefx.renderer.sketch.elements.some((e) => e.key === 'prop:car'), null, { timeout: 5000 });

    // ---------------------------------------------------------------- 2. diff: car leaves (erase wipe), house arrives (draws in)
    const diff = await page.evaluate(async (st) => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      const before = Object.fromEntries(s.elements.map((e) => [e.key, e.x]));
      R.story({ ...st, props: [{ emoji: '🏠', role: 'house' }] });
      const at0 = s.elements;
      await new Promise((r) => setTimeout(r, 120));
      const at120 = s.elements;
      await new Promise((r) => setTimeout(r, 1600));
      const after = s.elements;
      return {
        carAt0: (at0.find((e) => e.key === 'prop:car') || {}).state,
        carAt120: (at120.find((e) => e.key === 'prop:car') || {}).state,
        houseAt120: (at120.find((e) => e.key === 'prop:house') || {}).state,
        carAfter: after.some((e) => e.key === 'prop:car'),
        houseAfter: (after.find((e) => e.key === 'prop:house') || {}).state,
        moved: after.filter((e) => e.key.startsWith('forest:') && before[e.key] !== undefined && before[e.key] !== e.x).map((e) => e.key),
        trees: after.filter((e) => e.key.startsWith('forest:')).length,
      };
    }, RAIN_FOREST_CAR);
    log('diff', JSON.stringify(diff));
    assert.equal(diff.carAt0, 'erase', 'removed car gets the erase wipe');
    assert.ok(['wait', 'draw'].includes(diff.houseAt120), `new house draws in (${diff.houseAt120})`);
    assert.equal(diff.carAfter, false, 'car gone after the wipe');
    assert.equal(diff.houseAfter, 'show');
    assert.deepEqual(diff.moved, [], 'trees on stage keep their place');
    assert.ok(diff.trees >= 2);

    // ---------------------------------------------------------------- 3. style switch sketch -> mixed -> emoji -> sketch
    const styles = await page.evaluate(async (st) => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      const P = R.particles;
      const band = document.querySelector('#stage > .fx-band');
      const out = {};
      R.story({ ...st, props: [{ emoji: '🚗', role: 'car' }, { emoji: '🏠', role: 'house' }] }); // car back + house, girl walking
      await new Promise((r) => setTimeout(r, 300));
      R.setLayout({ storyStyle: 'mixed' });
      await new Promise((r) => setTimeout(r, 1800));
      out.mixed = {
        style: s.style,
        data: band.dataset.style,
        drawnActors: s.elements.filter((e) => e.key.startsWith('actor:') && e.state !== 'erase').length,
        drawnProps: s.elements.filter((e) => e.key.startsWith('prop:') && e.state !== 'erase').length,
        trees: s.elements.filter((e) => e.key.startsWith('forest:')).length,
        emojiActors: P.actors.filter((a) => a.state !== 'out').map((a) => a.emoji),
        emojiProps: P.props.filter((p) => p.state !== 'out').map((p) => p.emoji),
        rainStrokes: s.elements.some((e) => e.key === 'wx:rain' && e.state !== 'erase'),
      };
      R.setLayout({ storyStyle: 'emoji' });
      await new Promise((r) => setTimeout(r, 200));
      const c = document.querySelector('canvas.fx-sketch');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let painted = 0;
      for (let i = 3; i < d.length; i += 16) if (d[i] > 0) painted++;
      out.emoji = { style: s.style, data: band.dataset.style, display: getComputedStyle(c).display, running: s.stats.running, elements: s.stats.elements, painted, emojiActors: P.actors.filter((a) => a.state !== 'out').length };
      R.setLayout({ storyStyle: 'sketch' });
      const t1 = performance.now();
      await new Promise((r) => setTimeout(r, 300));
      while (s.stats.drawing > 0 && performance.now() - t1 < 4000) await new Promise((r) => setTimeout(r, 100));
      out.sketch = { style: s.style, data: band.dataset.style, keys: s.elements.map((e) => e.key), running: s.stats.running, emojiActors: P.actors.filter((a) => a.state !== 'out').length };
      return out;
    }, RAIN_FOREST_CAR);
    log('styles', JSON.stringify(styles));
    assert.equal(styles.mixed.style, 'mixed');
    assert.equal(styles.mixed.data, 'mixed');
    assert.equal(styles.mixed.drawnActors, 0, 'mixed: figures stay emoji');
    assert.deepEqual(styles.mixed.emojiActors, ['👧'], 'mixed: the renderer shows the girl');
    if (styles.mixed.emojiProps.length) assert.equal(styles.mixed.drawnProps, 0, 'mixed: no drawn car next to the emoji car');
    else assert.ok(styles.mixed.drawnProps >= 1, 'mixed: props drawn when the renderer shows none');
    assert.ok(styles.mixed.trees >= 3, 'mixed: scenery drawn');
    assert.equal(styles.mixed.rainStrokes, false, 'mixed: the emoji parallax shows the rain');
    assert.deepEqual(styles.emoji, { style: 'emoji', data: 'emoji', display: 'none', running: false, elements: 0, painted: 0, emojiActors: 1 }, 'emoji: drawing hidden, stopped, cleared');
    assert.equal(styles.sketch.style, 'sketch');
    assert.equal(styles.sketch.data, 'sketch');
    assert.ok(styles.sketch.keys.includes('actor:girl') && styles.sketch.keys.includes('prop:car'), 'sketch: figures + props drawn again');
    assert.equal(styles.sketch.emojiActors, 0, 'sketch: no emoji figures');
    assert.equal(styles.sketch.running, true);

    // 16:9 screenshot (rain, forest, house, car, walking girl) on a camera-like backdrop
    await page.evaluate((bg) => (document.documentElement.style.background = bg), CAMERA_BG);
    await page.screenshot({ path: path.join(shotDir, 'sketch-16x9.png') });
    const bandBox = await page.evaluate(() => {
      const r = document.querySelector('#stage > .fx-band').getBoundingClientRect();
      return { x: 0, y: Math.max(0, r.top - 30), width: r.width, height: Math.min(innerHeight, r.bottom) - Math.max(0, r.top - 30) };
    });
    await page.screenshot({ path: path.join(shotDir, 'sketch-16x9-band.png'), clip: bandBox });
    await page.evaluate(() => (document.documentElement.style.background = ''));

    // ---------------------------------------------------------------- 4. theme + mood tint the ink
    const tint = await page.evaluate(async (st) => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      R.story({ ...st, mood: 'sad' });
      await new Promise((r) => setTimeout(r, 200));
      const sad = s.stats.ink;
      R.setTheme('kinderbuch');
      R.story({ ...st, mood: 'calm' });
      await new Promise((r) => setTimeout(r, 200));
      const kb = s.stats.ink;
      R.setTheme('neon');
      R.story(st);
      await new Promise((r) => setTimeout(r, 200));
      return { sad, kb, neon: s.stats.ink };
    }, RAIN_FOREST_CAR);
    log('ink', JSON.stringify(tint));
    assert.notEqual(tint.sad, '#ffffff', 'sad mood tints the ink');
    assert.ok(parseInt(tint.sad.slice(5, 7), 16) > parseInt(tint.sad.slice(1, 3), 16), 'sad = bluish');
    assert.equal(tint.kb, '#fffdf2', 'kinderbuch: warm ink');
    assert.equal(tint.neon, '#ffffff', 'neon calm: white ink');

    // ---------------------------------------------------------------- 5. idle band: stop + clear, next touch redraws
    const idle = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      const ink = () => {
        const c = document.querySelector('canvas.fx-sketch');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
        return n;
      };
      const old = R.storyIdleMs;
      R.storyIdleMs = 300;
      R.storyTouch();
      await new Promise((r) => setTimeout(r, 450));
      const atIdle = { idle: R.storyIdle, sketchIdle: s.idle, running: s.stats.running };
      await new Promise((r) => setTimeout(r, 1100));
      const cleared = { ink: ink(), elements: s.stats.elements };
      R.storyIdleMs = old;
      R.storyTouch();
      // a whole scene draws in within ≤ 1.4 s stagger + ≤ 1.2 s per element
      const t1 = performance.now();
      await new Promise((r) => setTimeout(r, 300));
      while (s.stats.drawing > 0 && performance.now() - t1 < 4000) await new Promise((r) => setTimeout(r, 100));
      const drawnIn = Math.round(performance.now() - t1);
      return { atIdle, cleared, back: { idle: R.storyIdle, sketchIdle: s.idle, running: s.stats.running, ink: ink(), car: s.elements.some((e) => e.key === 'prop:car' && e.state === 'show'), drawnIn } };
    });
    log('idle', JSON.stringify(idle));
    assert.deepEqual(idle.atIdle, { idle: true, sketchIdle: true, running: false }, 'idle band stops the drawing loop');
    assert.deepEqual(idle.cleared, { ink: 0, elements: 0 }, 'idle band drops the drawing (nothing over the camera)');
    assert.equal(idle.back.idle, false);
    assert.equal(idle.back.sketchIdle, false);
    assert.equal(idle.back.running, true);
    assert.ok(idle.back.ink > 500 && idle.back.car, 'the next touch draws the story again');
    assert.ok(idle.back.drawnIn <= 2900, `whole scene drawn in ${idle.back.drawnIn} ms`);

    // ---------------------------------------------------------------- 6. recording helper (WebM)
    const rec = await page.evaluate(async () => {
      const s = window.livefx.renderer.sketch;
      try {
        const r = await window.LiveFXSketch.record({ canvas: s.canvas, ms: 700, download: false });
        return { ok: true, bytes: r.bytes, mime: r.mimeType, ms: r.ms, url: typeof r.url, file: r.filename };
      } catch (e) {
        return { ok: false, error: String(e && e.message) };
      }
    });
    log('record', JSON.stringify(rec));
    assert.equal(rec.ok, true, `record: ${rec.error}`);
    assert.ok(rec.bytes > 500, `WebM bytes: ${rec.bytes}`);
    assert.match(rec.mime, /^video\/webm/);
    assert.match(rec.file, /^livefx-sketch-\d{8}-\d{6}\.webm$/);

    // ---------------------------------------------------------------- 6b. band resize: re-laid out at once (no second draw-in)
    const resize = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      const c = document.querySelector('canvas.fx-sketch');
      const h0 = c.height;
      R.setLayout({ band: 30 });
      await new Promise((r) => setTimeout(r, 1000));
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 3] >= 180 && d[i] >= 200 && d[i + 1] >= 200 && d[i + 2] >= 200) ink++;
      const out = { h0, h1: c.height, bandH: Math.round(document.querySelector('#stage > .fx-band').getBoundingClientRect().height), states: [...new Set(s.elements.map((e) => e.state))], ink };
      R.setLayout({ band: 22 });
      return out;
    });
    log('resize', JSON.stringify(resize));
    assert.ok(resize.h1 > resize.h0 * 1.2 && Math.abs(resize.h1 - resize.bandH) <= 2, 'canvas follows the band');
    assert.deepEqual(resize.states, ['show'], 'resized drawing appears at once');
    assert.ok(resize.ink > 300, 'still drawn after the resize');

    // ---------------------------------------------------------------- 6c. static scene: the rAF loop sleeps, the drawing stays
    const still = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      R.story({ scene: 'night', time: 'night', weather: 'clear', place: 'forest', mood: 'calm', actors: [], props: [{ emoji: '🏠', role: 'house' }] });
      const t1 = performance.now();
      await new Promise((r) => setTimeout(r, 300));
      while ((s.stats.drawing > 0 || s.stats.erasing > 0 || s.stats.running) && performance.now() - t1 < 5000) await new Promise((r) => setTimeout(r, 100));
      const frames = s.stats.frames;
      await new Promise((r) => setTimeout(r, 400));
      const c = document.querySelector('canvas.fx-sketch');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i + 3] >= 180 && d[i] >= 200 && d[i + 1] >= 200 && d[i + 2] >= 200) ink++;
      return { keys: s.elements.map((e) => e.key), running: s.stats.running, idleFrames: s.stats.frames - frames, ink, settledIn: Math.round(performance.now() - t1) };
    });
    log('static', JSON.stringify(still));
    assert.ok(still.keys.includes('sky:moon') && still.keys.includes('prop:house') && still.keys.some((k) => k.startsWith('sky:star:')), 'night: moon, stars, house');
    assert.ok(!still.keys.includes('wx:rain') && !still.keys.includes('actor:girl'), 'rain and girl are gone');
    assert.equal(still.running, false, 'nothing moves -> rAF stopped');
    assert.equal(still.idleFrames, 0, 'no frames drawn while still');
    assert.ok(still.ink > 300, 'the still drawing stays on the canvas');

    // ---------------------------------------------------------------- 6d. a scene without a story (scene pad) is drawn too
    const pad = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      R.fire({ id: 'pad-snow', visual: { kind: 'scene', scene: 'snow', text: '', intensity: 2 } });
      await new Promise((r) => setTimeout(r, 400));
      return { scene: R.currentScene, keys: s.elements.filter((e) => e.state !== 'erase').map((e) => e.key), running: s.stats.running };
    });
    log('scene pad', JSON.stringify(pad));
    assert.equal(pad.scene, 'snow');
    assert.ok(pad.keys.includes('wx:snow') && pad.keys.some((k) => k.startsWith('sky:cloud:')), 'scene pad snow: clouds + falling flakes');
    assert.ok(!pad.keys.includes('prop:house'), 'the story drawing made room');
    assert.equal(pad.running, true);

    // ---------------------------------------------------------------- 7. end: everything is wiped out, the loop stops
    const end = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const s = R.sketch;
      R.story({ scene: null, end: true, actors: [], props: [] });
      await new Promise((r) => setTimeout(r, 150));
      const erasing = s.stats.erasing + s.elements.filter((e) => e.state === 'erase').length;
      await new Promise((r) => setTimeout(r, 1800));
      const c = document.querySelector('canvas.fx-sketch');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let painted = 0;
      for (let i = 3; i < d.length; i += 16) if (d[i] > 0) painted++;
      return { erasing, elements: s.stats.elements, running: s.stats.running, painted };
    });
    log('end', JSON.stringify(end));
    assert.ok(end.erasing > 0, 'end erases the drawing');
    assert.deepEqual({ elements: end.elements, running: end.running, painted: end.painted }, { elements: 0, running: false, painted: 0 }, 'empty band, rAF stopped');
    assert.deepEqual(errors, [], 'no page errors / hook warnings');
    await ctx.close();

    // ---------------------------------------------------------------- 8. 9:16 portrait 1080×1920, band at the very bottom
    const pctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const pp = await pctx.newPage();
    const perr = [];
    pp.on('pageerror', (e) => perr.push(String(e)));
    await pp.goto(`${base}/overlay.html?perf=high&layout=portrait&storystyle=sketch`);
    await pp.waitForFunction(() => window.livefx && window.livefx.director && window.LiveFXSketch, null, { timeout: 5000 });
    await pp.evaluate((st) => window.livefx.renderer.story({ ...st, props: [{ emoji: '🚗', role: 'car' }, { emoji: '🏠', role: 'house' }] }), RAIN_FOREST_CAR);
    await sleep(1500);
    const pr = await pp.evaluate(probeSketch);
    log('9:16', JSON.stringify(pr));
    assert.ok(pr.ink > 1500, `portrait ink: ${pr.ink}`);
    assert.equal(pr.band.bottom, 1920, 'band flush with the frame bottom (bandPosition bottom)');
    assert.ok(pr.canvas.top >= pr.band.top - 1 && pr.canvas.bottom <= pr.band.bottom + 1);
    const pshot = await pp.screenshot({ omitBackground: true });
    const pabove = await pp.evaluate(alphaAbove, { dataUrl: `data:image/png;base64,${pshot.toString('base64')}`, top: pr.band.top - 2 });
    assert.equal(pabove.max, 0, 'portrait: nothing above the band');
    await pp.waitForFunction(() => window.livefx.renderer.sketch.stats.drawing === 0, null, { timeout: 4000 });
    const pkeys = await pp.evaluate(() => window.livefx.renderer.sketch.elements.map((e) => e.key));
    for (const k of ['prop:car', 'prop:house', 'actor:girl']) assert.ok(pkeys.includes(k), `portrait drawn: ${k}`);
    await pp.evaluate((bg) => (document.documentElement.style.background = bg), CAMERA_BG);
    await sleep(100);
    await pp.screenshot({ path: path.join(shotDir, 'sketch-9x16.png') });
    const pbox = await pp.evaluate(() => {
      const r = document.querySelector('#stage > .fx-band').getBoundingClientRect();
      return { x: 0, y: Math.max(0, r.top - 30), width: r.width, height: Math.min(innerHeight, r.bottom) - Math.max(0, r.top - 30) };
    });
    await pp.screenshot({ path: path.join(shotDir, 'sketch-9x16-band.png'), clip: pbox });
    // mixed in 9:16: drawn scenery behind the renderer's emoji figures
    await pp.evaluate(() => window.livefx.renderer.setLayout({ storyStyle: 'mixed' }));
    await sleep(1800);
    await pp.screenshot({ path: path.join(shotDir, 'sketch-mixed-9x16.png'), clip: pbox });
    assert.deepEqual(perr, [], 'portrait: no page errors');
    await pctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
