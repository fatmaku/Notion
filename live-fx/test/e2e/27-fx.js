// Renderer v2 (LiveFX 2.0): themes (?theme= + bus message), canvas particle layer (rain burst, confetti,
// stats.fps / stats.particles), text / lower-third / combo kinds, glow / tilt / impact / intensity, per-trigger
// gain through the v2 mixer hook (stubbed) and the old LiveFXSounds.play fallback, renderer.clear(), portrait
// lower-third -> banner fallback, plus two screenshots (16:9 neon text, 9:16 confetti).
// 2.1: rays + ring and rain drops live on the canvas (single render path); performance mode (setPerf, ?perf=,
// `perf` bus message, auto switch after 30 slow frames, eco look). The main page pins ?perf=high so a slow CI
// machine cannot auto-switch to eco in the middle of the visual assertions.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  try {
    // ---------- landscape, ?theme=pastel ----------
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${server.base}/overlay.html?theme=pastel&perf=high`);
    await page.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    // 1. theme from the URL, setTheme(), THEMES export, pinned theme ignores bus messages.
    const theme0 = await page.evaluate(() => ({
      body: document.body.dataset.theme,
      renderer: window.livefx.renderer.theme,
      themes: window.LiveFXRenderer.THEMES,
      cardBg: getComputedStyle(document.body).getPropertyValue('--fx-card-bg').trim(),
      canvas: !!document.querySelector('#stage canvas.fx-canvas'),
      ok: window.livefx.renderer.particles.ok,
      fps: window.livefx.renderer.stats.fps,
    }));
    assert.equal(theme0.body, 'pastel', 'body[data-theme=pastel]');
    assert.equal(theme0.renderer, 'pastel');
    assert.deepEqual(theme0.themes, ['neon', 'pastel', 'minimal', 'kinderbuch']);
    assert.equal(theme0.cardBg, '#fff4f8', 'pastel card background variable');
    assert.equal(theme0.canvas, true, 'canvas particle layer mounted');
    assert.equal(theme0.ok, true);
    assert.equal(typeof theme0.fps, 'number');
    const theme1 = await page.evaluate(() => {
      const r = window.livefx.renderer;
      const out = {};
      out.kinder = r.setTheme('kinderbuch');
      out.kinderBody = document.body.dataset.theme;
      out.unknown = r.setTheme('disco');
      out.unknownBody = document.body.dataset.theme;
      r.setTheme('pastel');
      window.livefx.bus._emit({ id: 'th-1', type: 'theme', theme: 'minimal' });
      out.pinned = document.body.dataset.theme;
      return out;
    });
    assert.equal(theme1.kinder, 'kinderbuch');
    assert.equal(theme1.kinderBody, 'kinderbuch');
    assert.equal(theme1.unknown, 'neon', 'unknown theme falls back to neon');
    assert.equal(theme1.unknownBody, undefined, 'neon = no data-theme attribute');
    assert.equal(theme1.pinned, 'pastel', '?theme= pins the theme against bus messages');

    // 2. text kind: one span per letter, neon style, rays at intensity 3, HTML stays literal.
    const text = await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 't', visual: { kind: 'text', text: 'Hi <b>', style: 'neon', intensity: 3, glow: true, impact: true } });
      const el = document.querySelector('.fx-bigtext');
      const letters = Array.from(el.querySelectorAll('.fx-letter'));
      return {
        cls: el.className,
        n: letters.length,
        i: letters.map((l) => l.style.getPropertyValue('--i')),
        joined: letters.map((l) => l.textContent).join('').replace(/ /g, ' '),
        b: el.querySelectorAll('b').length,
        rays: el.querySelectorAll('.fx-rays, .fx-ring').length,
        raysMode: el.dataset.rays,
        flares: window.livefx.renderer.particles.items.filter((p) => p.flare).map((p) => p.kind).sort().join(','),
        impact: document.getElementById('stage').classList.contains('fx-impact'),
        particles: window.livefx.renderer.stats.particles,
      };
    });
    assert.ok(/fx-text-neon/.test(text.cls) && /fx-glow/.test(text.cls) && /fx-has-rays/.test(text.cls), text.cls);
    assert.equal(text.n, 6);
    assert.deepEqual(text.i, ['0', '1', '2', '3', '4', '5']);
    assert.equal(text.joined, 'Hi <b>');
    assert.equal(text.b, 0, 'no injected markup');
    assert.equal(text.rays, 0, 'no DOM rays / ring next to the canvas');
    assert.equal(text.raysMode, 'canvas');
    assert.equal(text.flares, 'rays,ring', 'light rays sprite + ring drawn on the canvas at intensity >= 2');
    assert.equal(text.impact, true, 'impact adds .fx-impact to #stage');
    assert.ok(text.particles > 0, `spark burst at intensity 3 (${text.particles})`);
    await page.waitForFunction(() => !document.getElementById('stage').classList.contains('fx-impact'), null, { timeout: 1500 });
    for (const style of ['gradient', 'bounce', 'glitch']) {
      const ok = await page.evaluate((st) => {
        window.livefx.renderer.fire({ id: 't', visual: { kind: 'text', text: 'Go', style: st, color: '#ff0', color2: '#0ff' } });
        const all = document.querySelectorAll('.fx-bigtext');
        const el = all[all.length - 1];
        return el.classList.contains(`fx-text-${st}`) && el.style.getPropertyValue('--c1') === '#ff0' && el.querySelector('.fx-word').getAttribute('data-text') === 'Go';
      }, style);
      assert.equal(ok, true, `text style ${style}`);
    }

    // 3. card with intensity 3 + tilt + glow: classes, rays, animation name.
    const card = await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 'c', visual: { kind: 'card', emoji: '🔥', text: 'BOOM', intensity: 3, tilt: true, glow: true, position: 'top' } });
      const els = document.querySelectorAll('.fx-card');
      const el = els[els.length - 1];
      return {
        cls: el.className,
        anim: getComputedStyle(el).animationName,
        rays: el.classList.contains('fx-has-rays') && el.dataset.rays === 'canvas',
        domRays: el.querySelectorAll('.fx-rays, .fx-ring').length,
        flares: window.livefx.renderer.particles.items.filter((p) => p.flare && p.kind === 'rays').length,
        text: el.querySelector('.fx-text').textContent,
        i: el.style.getPropertyValue('--fx-i'),
      };
    });
    assert.ok(/fx-tilt/.test(card.cls) && /fx-glow/.test(card.cls) && /fx-pos-top/.test(card.cls), card.cls);
    assert.ok(/fx-pop-tilt/.test(card.anim), `tilt animation: ${card.anim}`);
    assert.equal(card.rays, true);
    assert.equal(card.domRays, 0);
    assert.ok(card.flares >= 1 && card.flares <= 2, `ray sprites alive (max 2): ${card.flares}`);
    assert.ok(/fx-blur-in/.test(card.anim), `entry motion animation: ${card.anim}`);
    assert.equal(card.text, 'BOOM');
    assert.equal(card.i, '3');
    // A plain v2 card keeps the classic animation and gets no rays.
    const plain = await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 'c', visual: { kind: 'card', emoji: '🙂', text: 'OK' } });
      const els = document.querySelectorAll('.fx-card');
      const el = els[els.length - 1];
      return { anim: getComputedStyle(el).animationName, rays: el.classList.contains('fx-has-rays') || !!el.querySelector('.fx-rays'), tilt: el.classList.contains('fx-tilt') };
    });
    assert.ok(/fx-pop\b/.test(plain.anim) && !/fx-pop-tilt/.test(plain.anim), plain.anim);
    assert.equal(plain.rays, false);
    assert.equal(plain.tilt, false);

    // 4. rain: canvas burst + one `.fx-rain` marker (count); confetti on the canvas; stats numeric.
    await page.evaluate(() => window.livefx.renderer.clear());
    const rain = await page.evaluate(async () => {
      window.livefx.renderer.fire({ id: 'r', visual: { kind: 'rain', emoji: '🍕', count: 12, intensity: 2 } });
      await new Promise((r) => setTimeout(r, 250));
      const s = window.livefx.renderer.stats;
      const mark = document.querySelectorAll('.fx-rain');
      return {
        drops: document.querySelectorAll('.fx-drop').length,
        marks: mark.length,
        count: mark.length ? Number(mark[0].dataset.count) : -1,
        emoji: mark.length ? mark[0].dataset.emoji : '',
        canvasDrops: window.livefx.renderer.particles.items.filter((p) => p.text === '🍕').length,
        particles: s.particles,
        fps: s.fps,
        frameMs: s.frameMs,
        cap: window.livefx.renderer.particles.cap,
      };
    });
    log('rain', JSON.stringify(rain));
    assert.equal(rain.drops, 0, 'no DOM drops when the canvas is available (single render path)');
    assert.equal(rain.marks, 1, 'one marker per rain');
    assert.equal(rain.count, 12, 'marker keeps the count');
    assert.equal(rain.emoji, '🍕');
    assert.equal(rain.canvasDrops, 48, 'count × intensity × 2 canvas drops');
    assert.ok(rain.particles > 0, `canvas particles after rain: ${rain.particles}`);
    assert.equal(typeof rain.fps, 'number');
    assert.ok(Number.isFinite(rain.fps) && rain.fps >= 0);
    assert.equal(typeof rain.frameMs, 'number');
    assert.equal(rain.cap, 800, 'intensity 2 cap');
    const conf = await page.evaluate(async () => {
      window.livefx.renderer.fire({ id: 'k', visual: { kind: 'confetti', intensity: 3, emoji: '🎉', text: 'GG' } });
      await new Promise((r) => setTimeout(r, 120));
      return { particles: window.livefx.renderer.stats.particles, dom: document.querySelectorAll('.fx-confetti').length, cap: window.livefx.renderer.particles.cap, card: !!document.querySelector('.fx-card') };
    });
    log('confetti', JSON.stringify(conf));
    assert.ok(conf.particles >= 200, `confetti particles ${conf.particles}`);
    assert.equal(conf.dom, 0, 'confetti is canvas-only when the canvas is available');
    assert.equal(conf.cap, 1200);
    assert.equal(conf.card, true, 'confetti with emoji/text still shows the card');
    // Auto-reduce bookkeeping: a reduced cap stays the ceiling.
    const reduced = await page.evaluate(() => {
      const p = window.livefx.renderer.particles;
      p.reducedTo = 300;
      p.setCap(3);
      const a = p.cap;
      p.setCap(1);
      const b = p.cap;
      p.reducedTo = 0;
      p.setCap(3);
      return { a, b, c: p.cap };
    });
    assert.deepEqual(reduced, { a: 300, b: 300, c: 1200 });

    // 5. lower-third (landscape): bar with title + subtitle, accent colour variable.
    const lt = await page.evaluate(() => {
      window.livefx.renderer.fire({ id: 'lt', visual: { kind: 'lower-third', title: 'Max <Mustermann>', subtitle: 'Gast', emoji: '🎤', color: '#00ff00', glow: true } });
      const el = document.querySelector('.fx-lower-third');
      return { title: el.querySelector('.fx-lt-title').textContent, sub: el.querySelector('.fx-lt-subtitle').textContent, emoji: el.querySelector('.fx-lt-emoji').textContent, accent: el.style.getPropertyValue('--fx-accent'), b: el.querySelectorAll('b').length, banner: document.querySelectorAll('.fx-banner').length };
    });
    assert.equal(lt.title, 'Max <Mustermann>');
    assert.equal(lt.sub, 'Gast');
    assert.equal(lt.emoji, '🎤');
    assert.equal(lt.accent, '#00ff00');
    assert.equal(lt.b, 0);
    assert.equal(lt.banner, 0, 'no banner fallback in landscape');

    // 6. combo: three steps rendered through fire(), stats.combos, cancelled by clear().
    await page.evaluate(() => window.livefx.renderer.clear());
    const combo = await page.evaluate(async () => {
      const r = window.livefx.renderer;
      const fires = r.stats.fires;
      r.fire({
        id: 'cb',
        visual: {
          kind: 'combo',
          steps: [
            { delay: 0, visual: { kind: 'text', text: 'GO', style: 'bounce' } },
            { delay: 250, visual: { kind: 'card', emoji: '🏁', text: 'STEP' } },
            { delay: 500, visual: { kind: 'sticker', emoji: '🎉🎉' } },
            { delay: 100, visual: { kind: 'combo', steps: [{ delay: 0, visual: { kind: 'banner', text: 'NO' } }] } },
          ],
        },
      });
      await new Promise((res) => setTimeout(res, 900));
      return {
        text: document.querySelectorAll('.fx-bigtext').length,
        card: document.querySelectorAll('.fx-card').length,
        sticker: document.querySelectorAll('.fx-sticker').length,
        banner: document.querySelectorAll('.fx-banner').length,
        combos: r.stats.combos,
        fires: r.stats.fires - fires,
        pending: r._timers.size,
      };
    });
    log('combo', JSON.stringify(combo));
    assert.equal(combo.text, 1);
    assert.equal(combo.card, 1);
    assert.equal(combo.sticker, 1);
    assert.equal(combo.banner, 0, 'nested combo step is ignored');
    assert.equal(combo.combos, 1);
    assert.equal(combo.fires, 4, '1 combo + 3 steps');
    assert.equal(combo.pending, 0);
    const cancelled = await page.evaluate(async () => {
      const r = window.livefx.renderer;
      r.fire({ id: 'cb2', visual: { kind: 'combo', steps: [{ delay: 400, visual: { kind: 'banner', text: 'LATE' } }] } });
      const pending = r._timers.size;
      r.clear();
      const after = r._timers.size;
      await new Promise((res) => setTimeout(res, 700));
      return { pending, after, banner: document.querySelectorAll('.fx-banner').length, particles: r.stats.particles, nodes: document.querySelectorAll('#stage > :not(.fx-canvas):not(.fx-scene)').length };
    });
    assert.equal(cancelled.pending, 1);
    assert.equal(cancelled.after, 0);
    assert.equal(cancelled.banner, 0, 'clear() cancels pending combo steps');
    assert.equal(cancelled.particles, 0);
    assert.equal(cancelled.nodes, 0, 'clear() removes transient nodes');

    // 7. gain + mixer hook (stub) and the old LiveFXSounds.play fallback.
    const audio = await page.evaluate(() => {
      const r = window.livefx.renderer;
      const S = window.LiveFXSounds;
      const calls = [];
      const master = [];
      const ducks = [];
      const had = S.mixer;
      S.mixer = { play: (name, o) => calls.push({ name, ...o }), setMaster: (v) => master.push(v), duck: (ms) => ducks.push(ms) };
      r.volume = 0.5;
      const s0 = r.stats.sounds;
      r.fire({ id: 'g', sound: 'airhorn', gain: 0.5, visual: { kind: 'card', emoji: '📣', intensity: 2, impact: true } });
      r.fire({ id: 'g2', sound: 'airhorn', visual: { kind: 'lower-third', title: 'L' } });
      r.fire({ id: 'g3', sound: 'airhorn', gain: 7, visual: { kind: 'rain', count: 1 } });
      const withMixer = r.stats.sounds - s0;
      S.mixer = had;
      if (!had) delete S.mixer;
      const s1 = r.stats.sounds;
      r.fire({ id: 'g4', sound: 'airhorn', gain: 0.3, visual: { kind: 'card', emoji: '🔈' } });
      return { calls, master, ducks, withMixer, fallback: r.stats.sounds - s1, volume: r.volume };
    });
    log('audio', JSON.stringify(audio));
    assert.equal(audio.master[0], 0.5, 'volume setter forwards to mixer.setMaster');
    assert.equal(audio.withMixer, 3);
    assert.equal(audio.calls.length, 3);
    assert.deepEqual(audio.calls[0], { name: 'airhorn', gain: 0.5, pan: 0, intensity: 2 });
    assert.equal(audio.calls[1].pan, -0.6, 'lower-third pans left');
    assert.equal(audio.calls[2].gain, 1, 'gain clamped');
    assert.deepEqual(audio.ducks, [250], 'impact ducks the mixer');
    assert.equal(audio.fallback, 1, 'old LiveFXSounds.play path still counts');
    assert.equal(audio.volume, 0.5);

    // 8. screenshot 16:9 – neon text + confetti on the default theme.
    await page.evaluate(() => {
      const r = window.livefx.renderer;
      r.clear();
      r.setTheme('neon');
      r.fire({ id: 'shot', visual: { kind: 'text', text: 'LIVE FX', style: 'neon', intensity: 2, color: '#ff4d6d', color2: '#7c5cff' } });
      r.fire({ id: 'shot2', visual: { kind: 'confetti', intensity: 2 } });
    });
    await sleep(900);
    await page.screenshot({ path: path.join(shotDir, 'fx-text-neon.png') });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    await ctx.close();

    // ---------- portrait: lower-third falls back to a banner, confetti screenshot ----------
    const pctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
    const portrait = await pctx.newPage();
    const perrors = [];
    portrait.on('pageerror', (e) => perrors.push(String(e)));
    await portrait.goto(`${server.base}/overlay.html?layout=portrait`);
    await portrait.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const p = await portrait.evaluate(() => {
      window.livefx.bus._emit({ id: 'th-p', type: 'theme', theme: 'kinderbuch' });
      window.livefx.renderer.fire({ id: 'lt', visual: { kind: 'lower-third', title: 'Max', subtitle: 'Gast' } });
      const banner = document.querySelector('.fx-banner');
      return { theme: document.body.dataset.theme, lt: document.querySelectorAll('.fx-lower-third').length, banner: banner ? banner.textContent.trim() : null };
    });
    assert.equal(p.theme, 'kinderbuch', 'theme bus message applies without ?theme=');
    assert.equal(p.lt, 0, 'no lower-third in portrait');
    assert.equal(p.banner, 'Max · Gast');
    await portrait.evaluate(() => {
      window.livefx.renderer.setTheme('neon');
      window.livefx.renderer.fire({ id: 'k', visual: { kind: 'confetti', intensity: 3, emoji: '🎉', text: 'GG', glow: true } });
    });
    await sleep(700);
    const pp = await portrait.evaluate(() => ({ particles: window.livefx.renderer.stats.particles, fps: window.livefx.renderer.stats.fps, w: document.querySelector('.fx-canvas').width }));
    log('portrait confetti', JSON.stringify(pp));
    assert.ok(pp.particles > 0);
    assert.equal(typeof pp.fps, 'number');
    assert.ok(pp.w >= 540, `canvas backing width ${pp.w}`);
    await portrait.screenshot({ path: path.join(shotDir, 'fx-confetti-portrait.png') });
    assert.deepEqual(perrors, [], `portrait errors: ${perrors.join('; ')}`);
    await pctx.close();

    // ---------- performance mode (2.1): ?perf=, bus message, setPerf, auto switch, eco look ----------
    const fctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const fp = await fctx.newPage();
    const ferrors = [];
    fp.on('pageerror', (e) => ferrors.push(String(e)));
    await fp.goto(`${server.base}/overlay.html?perf=eco`);
    await fp.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const eco = await fp.evaluate(async () => {
      const r = window.livefx.renderer;
      const out = { perf: r.perf, active: r.perfActive, body: document.body.dataset.perf, mode: document.body.dataset.perfMode };
      window.livefx.bus._emit({ id: 'pf-1', type: 'perf', perf: 'high' });
      out.pinned = r.perf; // ?perf= pins against bus messages
      r.fire({ id: 'e1', visual: { kind: 'card', emoji: '🔥', text: 'ECO', intensity: 3, glow: true, tilt: true, impact: true } });
      const card = document.querySelector('.fx-card');
      out.cardCls = card.className;
      out.flares = r.particles.items.filter((p) => p.flare).length;
      out.impact = document.getElementById('stage').classList.contains('fx-impact');
      r.clear();
      r.fire({ id: 'e2', visual: { kind: 'confetti', intensity: 3 } });
      out.confetti = r.particles.items.filter((p) => p.kind === 'rect').length;
      r.fire({ id: 'e3', visual: { kind: 'text', text: 'Go', style: 'glitch' } });
      const t = document.querySelector('.fx-bigtext');
      out.textCls = t.className;
      out.glitchLayers = t.querySelectorAll('.fx-glitch-layer').length;
      r.fire({ id: 'e4', visual: { kind: 'sticker', emoji: '🐉👸' } });
      out.stickerAnim = getComputedStyle(document.querySelector('.fx-sticker-emoji')).animationName;
      r.particles.setCap(2);
      out.cap2 = r.particles.cap;
      r.clear();
      r.fire({ id: 'e5', visual: { kind: 'rain', emoji: '🍕', count: 40, intensity: 3 } });
      out.rain = r.particles.items.filter((p) => p.text === '🍕').length;
      r.fire({ id: 'e6', visual: { kind: 'scene', scene: 'rain', intensity: 3 } });
      out.ambientCap = r.particles.ambient.cap;
      r.clear();
      r.clearScene();
      return out;
    });
    log('eco', JSON.stringify(eco));
    assert.deepEqual([eco.perf, eco.active, eco.body, eco.mode, eco.pinned], ['eco', 'eco', 'eco', 'eco', 'eco'], '?perf=eco');
    assert.ok(/fx-tilt/.test(eco.cardCls) && !/fx-glow|fx-blur-in|fx-has-rays/.test(eco.cardCls), `eco card: ${eco.cardCls}`);
    assert.equal(eco.flares, 0, 'eco: no rays / ring');
    assert.equal(eco.impact, false, 'eco: no impact zoom');
    assert.equal(eco.confetti, 45, 'eco: 45 confetti pieces');
    assert.ok(/fx-text-neon/.test(eco.textCls) && eco.glitchLayers === 0, `eco: glitch -> neon (${eco.textCls})`);
    assert.equal(eco.stickerAnim, 'none', 'eco: stickers do not bounce');
    assert.equal(eco.cap2, 400, 'eco: half particle cap');
    assert.equal(eco.rain, 120, 'eco: rain burst count × intensity (half of high)');
    assert.equal(eco.ambientCap, 55, 'eco: half ambient cap');

    // No ?perf=: default auto, bus message switches live, setPerf validates, auto -> eco after 30 slow frames.
    await fp.goto(`${server.base}/overlay.html`);
    await fp.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const auto = await fp.evaluate(() => {
      const r = window.livefx.renderer;
      const out = { start: [r.perf, r.perfActive, document.body.dataset.perf, document.body.dataset.perfMode] };
      window.livefx.bus._emit({ id: 'pf-2', type: 'perf', perf: 'eco' });
      out.viaBus = [r.perf, r.perfActive, document.body.dataset.perf];
      window.livefx.bus._emit({ id: 'pf-3', type: 'state', perf: 'high' });
      out.viaState = r.perf;
      out.bogus = r.setPerf('turbo');
      // Simulated frames (fake timestamps, real rAF paused): 60 Hz display, then 30 consecutive 40-ms frames.
      const m = r._mon;
      const feed = (n, dt) => {
        cancelAnimationFrame(m.raf);
        m.raf = 0;
        let t = 1e6;
        m.last = 0;
        r._monTick(t);
        for (let i = 0; i < n; i++) r._monTick((t += dt));
        cancelAnimationFrame(m.raf);
        m.raf = 0;
      };
      m.calibrate = 0;
      m.minFrame = 1000 / 60;
      feed(29, 40);
      out.after29 = [r.perfActive, r.stats.perfSwitches];
      feed(1, 10); // a fast frame resets the streak
      feed(29, 40);
      out.afterReset = r.perfActive;
      // OBS at 30 fps: 33-ms display frames, 40-ms frames are within the budget (1.25 × 33.3 ms).
      m.minFrame = 1000 / 30;
      feed(40, 40);
      out.obs30 = [r.perfActive, r.stats.perfSwitches];
      m.minFrame = 1000 / 60;
      feed(30, 40);
      out.switched = [r.perf, r.perfActive, document.body.dataset.perf, document.body.dataset.perfMode, r.stats.perfSwitches];
      out.again = r.setPerf('auto'); // same mode again keeps the switch
      out.stillEco = r.perfActive;
      r.setPerf('high');
      out.high = [r.perf, r.perfActive, document.body.dataset.perf];
      r.setPerf('auto');
      out.reAuto = [r.perf, r.perfActive];
      return out;
    });
    log('auto', JSON.stringify(auto));
    assert.deepEqual(auto.start, ['auto', 'high', 'high', 'auto'], 'default: auto, starts with the full look');
    assert.deepEqual(auto.viaBus, ['eco', 'eco', 'eco'], '`perf` bus message');
    assert.equal(auto.viaState, 'high', '`state` message may carry perf');
    assert.equal(auto.bogus, 'auto', 'unknown mode -> auto');
    assert.deepEqual(auto.after29, ['high', 0], '29 slow frames are not enough');
    assert.equal(auto.afterReset, 'high', 'a fast frame resets the streak');
    assert.deepEqual(auto.obs30, ['high', 0], 'frame budget follows a capped 30-fps source');
    assert.deepEqual(auto.switched, ['auto', 'eco', 'eco', 'auto', 1], '30 slow frames -> eco, counted in stats.perfSwitches');
    assert.equal(auto.again, 'auto');
    assert.equal(auto.stillEco, 'eco', 'the auto switch is permanent');
    assert.deepEqual(auto.high, ['high', 'high', 'high']);
    assert.deepEqual(auto.reAuto, ['auto', 'high'], 'choosing auto again starts with the full look');
    // Hidden page pauses scene animations (body.fx-hidden), visible again resumes.
    const hidden = await fp.evaluate(() => {
      window.livefx.renderer.fire({ id: 'sc', visual: { kind: 'scene', scene: 'storm' } });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      const l2 = document.querySelector('.fx-scene-storm .fx-scene-l2');
      const out = { cls: document.body.classList.contains('fx-hidden'), state: getComputedStyle(l2).animationPlayState };
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      out.back = getComputedStyle(l2).animationPlayState;
      return out;
    });
    assert.deepEqual(hidden, { cls: true, state: 'paused', back: 'running' }, 'scene animations pause while hidden');
    assert.deepEqual(ferrors, [], `perf errors: ${ferrors.join('; ')}`);
    await fctx.close();

    // ---------- demo page: CanvasFX mirrors text / lower-third / combo during a recording ----------
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
    await demo.evaluate(() => window.livefxDemo.startRecording());
    await demo.evaluate(() => {
      const D = window.livefxDemo;
      D.fire({ id: 'dt', label: 'Text', keywords: [], visual: { kind: 'text', text: 'Hallo Welt', style: 'gradient', color: '#ff0', color2: '#0ff', glow: true, intensity: 2 } });
      D.fire({ id: 'dl', label: 'LT', keywords: [], visual: { kind: 'lower-third', title: 'Max', subtitle: 'Gast', emoji: '🎤' } });
      D.fire({
        id: 'dc',
        label: 'Combo',
        keywords: [],
        visual: { kind: 'combo', steps: [{ delay: 0, visual: { kind: 'text', text: 'GO', style: 'glitch' }, sound: 'airhorn' }, { delay: 200, visual: { kind: 'confetti', intensity: 2 } }] },
      });
    });
    await demo.waitForTimeout(900);
    const d = await demo.evaluate(async () => {
      const D = window.livefxDemo;
      const kinds = D.canvasFx.active.map((f) => f.kind);
      const dom = { text: document.querySelectorAll('#stage .fx-bigtext').length, lt: document.querySelectorAll('#stage .fx-lower-third').length, combos: D.renderer.stats.combos };
      const blob = await D.stopRecording();
      return { kinds, dom, size: blob.size, type: blob.type };
    });
    log('demo', JSON.stringify(d));
    assert.ok(d.kinds.filter((k) => k === 'text').length >= 2, `canvas text effects: ${d.kinds.join(',')}`);
    assert.ok(d.kinds.includes('lower-third'), 'canvas lower-third');
    assert.ok(d.kinds.includes('confetti'), 'combo step rendered on the canvas');
    assert.equal(d.dom.text, 2, 'DOM text (direct + combo step)');
    assert.equal(d.dom.lt, 1);
    assert.equal(d.dom.combos, 1);
    assert.ok(d.size > 0 && String(d.type).startsWith('video/webm'));
    await demo.click('#btn-close-result');
    const cleared = await demo.evaluate(() => {
      const D = window.livefxDemo;
      D.fire({ id: 'dc2', label: 'Combo', keywords: [], visual: { kind: 'combo', steps: [{ delay: 500, visual: { kind: 'banner', text: 'LATE' } }] } });
      const pending = D.canvasFx._timers.size;
      D.canvasFx.clear();
      D.renderer.clear();
      return { pending, after: D.canvasFx._timers.size, active: D.canvasFx.active.length };
    });
    assert.deepEqual(cleared, { pending: 1, after: 0, active: 0 });
    assert.deepEqual(demoErrors, [], `demo errors: ${demoErrors.join('; ')}`);
    await dctx.close();

    // ---------- panel theme select -> overlay follows via bus, server repeats it in `state` ----------
    const tctx = await browser.newContext();
    const panel = await tctx.newPage();
    await panel.goto(`${server.base}/index.html`);
    await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const ov = await tctx.newPage();
    await ov.goto(`${server.base}/overlay.html`);
    await ov.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await panel.selectOption('#theme', 'kinderbuch');
    await ov.waitForFunction(() => document.body.dataset.theme === 'kinderbuch', null, { timeout: 5000 });
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.theme')), 'kinderbuch');
    const late = await tctx.newPage();
    await late.goto(`${server.base}/overlay.html`);
    await late.waitForFunction(() => document.body.dataset.theme === 'kinderbuch', null, { timeout: 5000 });
    log('panel theme select -> overlay + late overlay (state) ok');
    await tctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
