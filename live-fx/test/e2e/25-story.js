// Story mode (1.3): persistent scene layer with crossfade, clear, caption escaping, duration, stickers,
// ambient loops (real LiveFXSounds.loop or a stub when sounds.js does not provide one yet), portrait
// layout, and the demo page's CanvasFX scene + recording.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  try {
    // ---------- overlay, landscape ----------
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${server.base}/overlay.html`);
    await page.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    // Ambient loops: use the real LiveFXSounds.loop when present, otherwise a stub with the same shape.
    const loopImpl = await page.evaluate(() => {
      const S = window.LiveFXSounds;
      if (S && typeof S.loop === 'function') return 'real';
      window.__loops = [];
      S.loop = (name, ctx, out, volume) => {
        const g = ctx.createGain();
        g.gain.value = volume;
        g.connect(out);
        const rec = { name, stopped: null };
        window.__loops.push(rec);
        return { stop: (fade) => (rec.stopped = fade) };
      };
      return 'stub';
    });
    log('loop implementation:', loopImpl);

    // 1. rain scene + loop: layer within 1 s, still there after 4 s, particles capped.
    await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 'r', sound: 'loop:rain', visual: { kind: 'scene', scene: 'rain', text: 'Es regnete in Strömen', intensity: 3 } });
    });
    await page.waitForSelector('.fx-scene[data-scene="rain"]', { timeout: 1000 });
    const rain0 = await page.evaluate(() => ({
      scene: window.livefx.renderer.currentScene,
      loop: window.livefx.renderer.loopName,
      first: document.getElementById('stage').firstElementChild.classList.contains('fx-scene'),
      on: document.querySelector('.fx-scene').classList.contains('fx-scene-on'),
      stats: window.livefx.renderer.stats.scenes,
      caption: document.querySelector('.fx-scene-caption').textContent,
    }));
    assert.equal(rain0.scene, 'rain');
    assert.equal(rain0.loop, 'rain', 'loopName after loop:rain');
    assert.equal(rain0.first, true, 'scene is the first child of #stage (below effects)');
    assert.equal(rain0.on, true);
    assert.equal(rain0.stats, 1);
    assert.equal(rain0.caption, 'Es regnete in Strömen');
    await sleep(4000);
    const rain4 = await page.evaluate(() => {
      const el = document.querySelector('.fx-scene[data-scene="rain"]');
      return {
        present: !!el,
        opacity: el ? getComputedStyle(el).opacity : null,
        // single render path: scene particles are canvas parallax items (no DOM spawner with a canvas)
        particles: window.livefx.renderer.particles.items.filter((p) => p.ambient).length,
        allX: window.livefx.renderer.particles.items.filter((p) => p.ambient).every((p) => Number.isFinite(p.x) && p.x >= -200 && p.x <= window.innerWidth + 200 && [0, 1, 2].includes(p.layer)),
        dom: el ? el.querySelectorAll('.fx-particle, .fx-scene-particles').length : -1,
        mode: el ? el.dataset.particles : null,
        cap: window.livefx.renderer.particles.ambient && window.livefx.renderer.particles.ambient.cap,
        layers: document.querySelectorAll('.fx-scene').length,
      };
    });
    log('rain after 4 s', JSON.stringify(rain4));
    assert.equal(rain4.present, true, 'rain scene still present after 4 s');
    assert.ok(parseFloat(rain4.opacity) > 0.95, 'rain scene fully visible after 4 s');
    assert.ok(rain4.particles > 0 && rain4.particles <= rain4.cap, `particles ${rain4.particles} (cap ${rain4.cap})`);
    assert.equal(rain4.cap, 110, 'ambient cap at intensity 3');
    assert.equal(rain4.allX, true, 'every particle is placed on a parallax layer inside the frame');
    assert.equal(rain4.dom, 0, 'no DOM particles next to the canvas');
    assert.equal(rain4.mode, 'canvas');
    assert.equal(rain4.layers, 1);

    // Same scene again = no-op (caption update only), layer element stays.
    const same = await page.evaluate(() => {
      const before = document.querySelector('.fx-scene[data-scene="rain"]');
      window.livefx.renderer.fire({ id: 'r', visual: { kind: 'scene', scene: 'rain', text: 'Noch mehr Regen' } });
      const after = document.querySelector('.fx-scene[data-scene="rain"]');
      return { sameEl: before === after, layers: document.querySelectorAll('.fx-scene').length, caption: document.querySelector('.fx-scene-caption').textContent, loop: window.livefx.renderer.loopName };
    });
    assert.equal(same.sameEl, true, 'same scene keeps its layer');
    assert.equal(same.layers, 1);
    assert.equal(same.caption, 'Noch mehr Regen');
    assert.equal(same.loop, 'rain', 'a scene without sound keeps the loop');

    // 2. night + loop:wind: rain fades (.fx-scene-out) and is removed, night present, loop swapped.
    await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 'n', sound: 'loop:wind', visual: { kind: 'scene', scene: 'night' } });
    });
    const swap = await page.evaluate(() => ({
      rainOut: !!document.querySelector('.fx-scene[data-scene="rain"].fx-scene-out'),
      night: !!document.querySelector('.fx-scene[data-scene="night"]'),
      current: window.livefx.renderer.currentScene,
      loop: window.livefx.renderer.loopName,
    }));
    assert.equal(swap.rainOut, true, 'old layer gets .fx-scene-out');
    assert.equal(swap.night, true);
    assert.equal(swap.current, 'night');
    assert.equal(swap.loop, 'wind', 'loop swapped on new loop: sound');
    await page.waitForFunction(() => !document.querySelector('.fx-scene[data-scene="rain"]'), null, { timeout: 2000 });
    const nightOpacity = await page.evaluate(() => getComputedStyle(document.querySelector('.fx-scene[data-scene="night"]')).opacity);
    assert.ok(parseFloat(nightOpacity) > 0.95, 'night scene fully visible');
    if (loopImpl === 'stub') {
      const stubs = await page.evaluate(() => window.__loops);
      assert.deepEqual(stubs.map((l) => l.name), ['rain', 'wind']);
      assert.equal(stubs[0].stopped, 1.5, 'old loop stopped with 1.5 s fade');
      assert.equal(stubs[1].stopped, null);
    }

    // Volume applies through the loop gain (no throw, value kept).
    const vol = await page.evaluate(() => {
      window.livefx.renderer.volume = 0.25;
      return window.livefx.renderer.volume;
    });
    assert.equal(vol, 0.25);

    // 3. clear: no scene, loop stopped.
    await page.evaluate(() => window.livefx.renderer.fire({ id: 'c', visual: { kind: 'scene', scene: 'clear' } }));
    const cleared = await page.evaluate(() => ({ current: window.livefx.renderer.currentScene, loop: window.livefx.renderer.loopName, out: !!document.querySelector('.fx-scene.fx-scene-out') }));
    assert.equal(cleared.current, null);
    assert.equal(cleared.loop, null, 'clear stops the loop');
    assert.equal(cleared.out, true);
    await page.waitForFunction(() => document.querySelectorAll('.fx-scene').length === 0, null, { timeout: 2000 });

    // 4. caption escaping: HTML stays literal text.
    await page.evaluate(() => window.livefx.renderer.fire({ id: 'x', visual: { kind: 'scene', scene: 'forest', text: '<b>x</b><img src=x onerror=window.__x=1>' } }));
    const cap = await page.evaluate(() => {
      const c = document.querySelector('.fx-scene[data-scene="forest"] .fx-scene-caption');
      return { text: c && c.textContent, b: c ? c.querySelectorAll('b, img').length : -1, x: window.__x };
    });
    assert.ok(cap.text.includes('<b>x</b>'), `caption literal: ${cap.text}`);
    assert.equal(cap.b, 0);
    assert.equal(cap.x, undefined);
    // Emoji override + intensity 1 -> particles use the custom emoji.
    await page.evaluate(() => window.livefx.renderer.fire({ id: 'x', visual: { kind: 'scene', scene: 'snow', emoji: '🦄', intensity: 1 } }));
    await sleep(600);
    const uni = await page.evaluate(() => window.livefx.renderer.particles.items.filter((p) => p.ambient).map((p) => p.text));
    assert.ok(uni.length > 0 && uni.every((t) => t === '🦄'), `override particles: ${uni.join('')}`);

    // 5. sticker: three emojis in .fx-sticker, staggered --i, text escaped.
    await page.evaluate(() => window.livefx.renderer.fire({ id: 's', visual: { kind: 'sticker', emoji: '🐉👸🛡️', text: 'Der <Drache>', position: 'top' } }));
    const sticker = await page.evaluate(() => {
      const el = document.querySelector('.fx-sticker');
      const spans = Array.from(el.querySelectorAll('.fx-sticker-emoji'));
      return { n: spans.length, i: spans.map((s) => s.style.getPropertyValue('--i')), emojis: spans.map((s) => s.textContent), top: el.classList.contains('fx-pos-top'), text: el.querySelector('.fx-text').textContent, html: el.querySelectorAll('b').length };
    });
    assert.equal(sticker.n, 3);
    assert.deepEqual(sticker.i, ['0', '1', '2']);
    assert.deepEqual(sticker.emojis, ['🐉', '👸', '🛡️']);
    assert.equal(sticker.top, true);
    assert.equal(sticker.text, 'Der <Drache>');
    // sticker is capped at 4 emojis
    const four = await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 's2', visual: { kind: 'sticker', emoji: '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣' } });
      const all = document.querySelectorAll('.fx-sticker');
      return all[all.length - 1].querySelectorAll('.fx-sticker-emoji').length;
    });
    assert.equal(four, 4);
    await page.waitForFunction(() => !document.querySelector('.fx-sticker'), null, { timeout: 4000 });

    // 6. forest + sticker screenshot (landscape).
    await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 'f', visual: { kind: 'scene', scene: 'forest', text: 'Tief im Wald…' } });
      window.livefx.renderer.fire({ id: 's', visual: { kind: 'sticker', emoji: '🐉👸🛡️', text: 'Der Drache', position: 'top' } });
    });
    await sleep(1400);
    await page.screenshot({ path: path.join(shotDir, 'story.png') });

    // 7. duration: 1 -> auto-clears (scene and loop).
    await page.evaluate(() => window.livefx.renderer.fire({ id: 'd', sound: 'loop:sea', visual: { kind: 'scene', scene: 'sea', duration: 1 } }));
    const seaNow = await page.evaluate(() => ({ current: window.livefx.renderer.currentScene, loop: window.livefx.renderer.loopName }));
    assert.equal(seaNow.current, 'sea');
    assert.equal(seaNow.loop, 'sea');
    await page.waitForFunction(() => window.livefx.renderer.currentScene === null, null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelectorAll('.fx-scene').length === 0, null, { timeout: 2000 });
    const afterDur = await page.evaluate(() => ({ loop: window.livefx.renderer.loopName, scenes: window.livefx.renderer.stats.scenes }));
    assert.equal(afterDur.loop, null, 'auto-clear stops the loop');
    assert.ok(afterDur.scenes >= 7, `stats.scenes ${afterDur.scenes}`);

    // 8. every scene id renders a layer with its class; unknown id -> card.
    const ids = await page.evaluate(async () => {
      const out = [];
      for (const id of window.LiveFXSchema.SCENES.filter((x) => x !== 'clear')) {
        window.livefx.renderer.fire({ id, visual: { kind: 'scene', scene: id } });
        const el = document.querySelector(`.fx-scene[data-scene="${id}"]`);
        out.push({ id, ok: !!el && el.classList.contains(`fx-scene-${id}`) && getComputedStyle(el.querySelector('.fx-scene-bg')).backgroundImage !== 'none' });
        await new Promise((r) => setTimeout(r, 120));
      }
      window.livefx.renderer.fire({ id: 'c', visual: { kind: 'scene', scene: 'clear' } });
      const cards = document.querySelectorAll('.fx-card').length;
      window.livefx.renderer.fire({ id: 'bad', visual: { kind: 'scene', scene: 'volcano', emoji: '🌋' } });
      out.push({ id: 'volcano->card', ok: document.querySelectorAll('.fx-card').length === cards + 1 && !document.querySelector('.fx-scene[data-scene="volcano"]') });
      return out;
    });
    for (const r of ids) assert.equal(r.ok, true, `scene ${r.id}`);
    await page.waitForFunction(() => document.querySelectorAll('.fx-scene').length === 0, null, { timeout: 2000 });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    await ctx.close();

    // ---------- overlay, portrait: storm scene fills the frame, particles use --fx-fall ----------
    const pctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
    const portrait = await pctx.newPage();
    await portrait.goto(`${server.base}/overlay.html?layout=portrait`);
    await portrait.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await portrait.evaluate(() => window.livefx.renderer.fire({ id: 'st', visual: { kind: 'scene', scene: 'storm', text: 'Ein Gewitter zog auf', intensity: 3 } }));
    await sleep(1500);
    const p = await portrait.evaluate(() => {
      const el = document.querySelector('.fx-scene[data-scene="storm"]');
      const r = el.getBoundingClientRect();
      const cap = el.querySelector('.fx-scene-caption').getBoundingClientRect();
      const P = window.livefx.renderer.particles;
      return {
        w: r.width,
        h: r.height,
        capTop: cap.top,
        capBottom: cap.bottom,
        innerHeight: window.innerHeight,
        fall: getComputedStyle(el).getPropertyValue('--fx-fall').trim(),
        fallPx: P.fallPx(),
        particles: P.items.filter((x) => x.ambient).length,
      };
    });
    log('portrait storm', JSON.stringify(p));
    assert.equal(p.w, 540);
    assert.equal(p.h, 960);
    assert.ok(p.capTop >= 0.25 * p.innerHeight && p.capBottom <= 0.45 * p.innerHeight, 'caption sits in the top third in portrait');
    assert.equal(p.fall, '62vh', 'scene inherits --fx-fall');
    assert.ok(Math.abs(p.fallPx - 0.62 * p.innerHeight) <= 1, `canvas particles fall 62vh (${p.fallPx})`);
    assert.ok(p.particles > 0 && p.particles <= 110, `storm particles ${p.particles}`);
    await portrait.screenshot({ path: path.join(shotDir, 'story-portrait.png') });
    await pctx.close();

    // ---------- demo page: CanvasFX scene + recording ----------
    const dctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const demo = await dctx.newPage();
    const demoErrors = [];
    demo.on('pageerror', (e) => demoErrors.push(String(e)));
    await demo.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Requested device not found', 'NotFoundError'));
      }
    });
    await demo.goto(`${server.base}/demo.html`);
    await demo.waitForFunction(() => window.livefxDemo && window.livefxDemo.state.ready, null, { timeout: 8000 });
    await demo.evaluate(() => {
      const S = window.LiveFXSounds;
      if (!S || typeof S.loop !== 'function') {
        S.loop = (name, ctx, out, volume) => {
          const g = ctx.createGain();
          g.gain.value = volume;
          g.connect(out);
          return { stop() {} };
        };
      }
      window.livefxDemo.fire({ id: 'scene', label: 'Regen', keywords: [], sound: 'loop:rain', visual: { kind: 'scene', scene: 'rain', text: 'Es regnete', intensity: 2 } });
    });
    await demo.waitForSelector('#stage .fx-scene[data-scene="rain"]', { timeout: 2000 });
    const d0 = await demo.evaluate(() => ({
      scene: window.livefxDemo.canvasFx.scene && window.livefxDemo.canvasFx.scene.id,
      dom: window.livefxDemo.renderer.currentScene,
      loop: window.livefxDemo.state.loopName,
    }));
    assert.equal(d0.scene, 'rain', 'canvasFx.scene set');
    assert.equal(d0.dom, 'rain');
    assert.equal(d0.loop, 'rain', 'demo routes the loop through its own mix');
    await demo.evaluate(() => window.livefxDemo.startRecording());
    await demo.evaluate(() => window.livefxDemo.fire({ id: 'stk', label: 'Ritter', keywords: [], visual: { kind: 'sticker', emoji: '🛡️⚔️', text: 'Ritter' } }));
    await demo.waitForTimeout(1200);
    const blob = await demo.evaluate(async () => {
      const b = await window.livefxDemo.stopRecording();
      const c = window.livefxDemo.canvasFx;
      return { size: b.size, type: b.type, particles: c.scene ? c.scene.particles.length : -1, sticker: c.active.some((f) => f.kind === 'sticker') };
    });
    log('demo blob', JSON.stringify(blob));
    assert.ok(blob.size > 0, 'recording with a scene produced data');
    assert.ok(String(blob.type).startsWith('video/webm'));
    assert.ok(blob.particles > 0 && blob.particles <= 40, `canvas particles ${blob.particles}`);
    await demo.click('#btn-close-result');
    // clear ends the canvas scene and the loop.
    await demo.evaluate(() => window.livefxDemo.fire({ id: 'end', label: 'Ende', keywords: [], visual: { kind: 'scene', scene: 'clear' } }));
    const d1 = await demo.evaluate(() => ({ scene: window.livefxDemo.canvasFx.scene, loop: window.livefxDemo.state.loopName, dom: window.livefxDemo.renderer.currentScene }));
    assert.equal(d1.scene, null);
    assert.equal(d1.loop, null);
    assert.equal(d1.dom, null);
    assert.deepEqual(demoErrors, [], `demo errors: ${demoErrors.join('; ')}`);
    await dctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
