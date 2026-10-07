// Story band (LiveFX 2.2): scenes render in a bottom band (default 22 %, portrait 20 % above the chat zone)
// instead of covering the camera; effect zones keep rain / confetti in the edge columns and cards in the
// columns (no flash / impact zoom); `layout`, `story`, `story-state` and `volume {bus}` messages; URL pins
// (?story= ?band= ?zone= ?volume=); the server remembers layout + volumes in the SSE `state` message.
// Screenshots: story-band.png (16:9), story-band-portrait.png (9:16).
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (±${tol})`);

/** Samples the particle canvas on a grid inside [x0..x1] × [y0..y1] (fractions) and returns the max alpha. */
const CANVAS_PROBE = (box) => {
  const c = document.querySelector('#stage canvas.fx-canvas');
  if (!c) return -1;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  let max = 0;
  for (let fy = box[1]; fy <= box[3]; fy += 0.025) {
    for (let fx = box[0]; fx <= box[2]; fx += 0.025) {
      const d = ctx.getImageData(Math.min(W - 1, Math.round(fx * W)), Math.min(H - 1, Math.round(fy * H)), 1, 1).data;
      if (d[3] > max) max = d[3];
    }
  }
  return max;
};

async function run({ browser, startServer, api, sseClient, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const auth = { token };
  try {
    // ---------------------------------------------------------------- 1. landscape 1920×1080, default band
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}/overlay.html?perf=high`);
    await page.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.director, null, { timeout: 5000 });

    const init = await page.evaluate(() => {
      const R = window.livefx.renderer;
      const band = document.querySelector('#stage > .fx-band');
      return {
        layout: R.layout,
        volumes: R.volumes,
        volume: R.volume,
        body: { story: document.body.dataset.storyLayout, zone: document.body.dataset.zone, band: getComputedStyle(document.body).getPropertyValue('--fx-band').trim() },
        bandFirst: !!band && document.getElementById('stage').firstElementChild === band,
        bandLayout: band && band.dataset.layout,
        schema: { layouts: window.LiveFXSchema.STORY_LAYOUTS, zones: window.LiveFXSchema.ZONES, defaults: window.LiveFXSchema.LAYOUT_DEFAULTS, vol: window.LiveFXSchema.VOLUME_DEFAULTS },
      };
    });
    log('init', JSON.stringify(init));
    assert.deepEqual(init.layout, { storyLayout: 'band', band: 22, zone: 'edges' }, 'default layout');
    assert.deepEqual(init.volumes, { master: 0.5, sfx: 0.8, ambient: 0.5 }, 'default levels');
    assert.equal(init.volume, 0.5, 'renderer.volume = master');
    assert.deepEqual(init.body, { story: 'band', zone: 'edges', band: '22' });
    assert.equal(init.bandFirst, true, '.fx-band is the first child of #stage');
    assert.equal(init.bandLayout, 'band');
    assert.deepEqual(init.schema.layouts, ['band', 'full', 'frame']);
    assert.deepEqual(init.schema.zones, ['full', 'edges', 'bottom', 'top']);

    // scene rain -> band box 22 % high, bottom-aligned; camera area pixel-clear
    await page.evaluate(() => window.livefx.renderer.fire({ id: 'r', visual: { kind: 'scene', scene: 'rain', text: 'Es regnete', intensity: 3 } }));
    await page.waitForSelector('.fx-band .fx-scene[data-scene="rain"].fx-scene-on', { timeout: 2000 });
    await sleep(1200);
    const band = await page.evaluate(() => {
      const s = document.querySelector('.fx-scene[data-scene="rain"]');
      const b = document.querySelector('#stage > .fx-band');
      const r = s.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const P = window.livefx.renderer.particles;
      const amb = P.items.filter((p) => p.ambient);
      const above = Array.from(document.querySelectorAll('#stage *')).filter((el) => {
        if (el.tagName === 'CANVAS') return false;
        const q = el.getBoundingClientRect();
        return q.width > 0 && q.height > 0 && q.top < innerHeight * 0.75;
      }).length;
      return {
        top: r.top, bottom: r.bottom, h: r.height, w: r.width, bandTop: br.top, bandH: br.height, H: innerHeight, W: innerWidth,
        inBand: s.parentElement === b,
        rect: P.rect,
        amb: amb.length,
        ambInBand: amb.every((p) => p.y >= P.rect.y0 - p.size * 2 && p.y <= P.rect.y0 + P.rect.h + p.size),
        above,
        stats: window.livefx.renderer.stats.scenes,
      };
    });
    log('band', JSON.stringify(band));
    near(band.h, 0.22 * band.H, 2, 'scene height 22 %');
    near(band.bottom, band.H, 1, 'scene bottom-aligned');
    near(band.bandH, 0.22 * band.H, 2, 'band height');
    assert.equal(band.w, band.W, 'band spans the width');
    assert.equal(band.inBand, true, 'scene lives in .fx-band');
    assert.ok(band.rect && Math.abs(band.rect.y0 - band.bandTop) <= 1 && Math.abs(band.rect.h - band.bandH) <= 1, `particles clipped to the band rect ${JSON.stringify(band.rect)}`);
    assert.ok(band.amb > 0, 'ambient particles alive');
    assert.equal(band.ambInBand, true, 'ambient particles stay inside the band');
    assert.equal(band.above, 0, 'no DOM scene node above the band');
    const camAlpha = await page.evaluate(CANVAS_PROBE, [0.2, 0.02, 0.8, 0.72]);
    assert.equal(camAlpha, 0, `camera area on the canvas is transparent (max alpha ${camAlpha})`);
    const bandAlpha = await page.evaluate(CANVAS_PROBE, [0.05, 0.8, 0.95, 0.99]);
    assert.ok(bandAlpha > 0, `drops are painted inside the band (max alpha ${bandAlpha})`);

    // ---------------------------------------------------------------- 2. zone edges: rain in the columns, cards in the columns, no flash / zoom
    const edges = await page.evaluate(() => {
      const R = window.livefx.renderer;
      R.fire({ id: 'p', visual: { kind: 'rain', emoji: '🍕', count: 40 } });
      R.fire({ id: 'k', visual: { kind: 'confetti' } });
      R.fire({ id: 'c1', visual: { kind: 'card', emoji: '🔥', text: 'HYPE', intensity: 2, shake: true, impact: true } });
      R.fire({ id: 'c2', visual: { kind: 'text', text: 'WOW', style: 'neon' } });
      R.fire({ id: 'c3', visual: { kind: 'banner', text: 'BANNER' } });
      const W = innerWidth;
      const edge = parseFloat(getComputedStyle(document.body).getPropertyValue('--fx-edge')) / 100 * W;
      const inCol = (x) => x <= edge + 1 || x >= W - edge - 1;
      const drops = R.particles.items.filter((p) => p.text === '🍕');
      const conf = R.particles.items.filter((p) => p.kind === 'rect');
      const mid = (el) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
      };
      const card = document.querySelector('.fx-card');
      const text = document.querySelector('.fx-bigtext');
      const banner = document.querySelector('.fx-banner');
      return {
        edge, W,
        drops: drops.length, dropsInCols: drops.every((p) => inCol(p.x)),
        conf: conf.length, confInCols: conf.every((p) => inCol(p.x)),
        cardCls: card.className, cardX: mid(card), textCls: text.className, textX: mid(text),
        bannerCls: banner.className, bannerW: parseFloat(getComputedStyle(banner).width), bannerLeft: parseFloat(getComputedStyle(banner).left),
        flash: document.querySelectorAll('.fx-flash').length,
        impact: document.getElementById('stage').classList.contains('fx-impact'),
        shake: document.getElementById('stage').classList.contains('fx-shake'),
      };
    });
    log('edges', JSON.stringify(edges));
    near(edges.edge, 0.22 * edges.W, 1, '--fx-edge 22vw');
    assert.ok(edges.drops >= 40 && edges.dropsInCols, `rain spawns only in the edge columns (${edges.drops})`);
    assert.ok(edges.conf > 0 && edges.confInCols, 'confetti spawns only in the edge columns');
    assert.match(edges.cardCls, /fx-col-(left|right)/, 'card goes to a column');
    assert.match(edges.textCls, /fx-col-(left|right)/, 'text goes to a column');
    assert.ok(edges.cardX <= edges.edge || edges.cardX >= edges.W - edges.edge, `card centre in a column (${edges.cardX})`);
    assert.ok(edges.textX <= edges.edge || edges.textX >= edges.W - edges.edge, `text centre in a column (${edges.textX})`);
    assert.ok(/fx-col-(left|right)/.test(edges.cardCls) && /fx-col-(left|right)/.test(edges.textCls) && edges.cardCls.replace(/.*(fx-col-\w+).*/, '$1') !== edges.textCls.replace(/.*(fx-col-\w+).*/, '$1'), 'columns alternate');
    assert.match(edges.bannerCls, /fx-col-(left|right)/);
    near(edges.bannerW, edges.edge, 2, 'banner fills one column');
    assert.ok(edges.bannerLeft === 0 || Math.abs(edges.bannerLeft - (edges.W - edges.edge)) <= 1, `banner sits in a column (${edges.bannerLeft})`);
    assert.equal(edges.flash, 0, 'no flash in zone edges');
    assert.equal(edges.impact, false, 'no impact zoom in zone edges');
    assert.equal(edges.shake, true, 'shake still runs');
    await page.evaluate(() => window.livefx.renderer.clear());

    // ---------------------------------------------------------------- 3. layout messages: zone / band / frame / full
    const layouts = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      const out = {};
      const rect = () => {
        const r = document.querySelector('#stage > .fx-band').getBoundingClientRect();
        return { l: r.left, t: r.top, w: r.width, h: r.height };
      };
      bus._emit({ id: 'l1', type: 'layout', zone: 'full' });
      out.zoneFull = { zone: R.layout.zone, body: document.body.dataset.zone, band: R.layout.band };
      R.fire({ id: 'f', visual: { kind: 'card', emoji: '⚡', shake: true, impact: true } });
      out.fullFlash = document.querySelectorAll('.fx-flash').length;
      out.fullImpact = document.getElementById('stage').classList.contains('fx-impact');
      out.fullCard = document.querySelector('.fx-card').className;
      R.clear();
      bus._emit({ id: 'l2', type: 'layout', band: 30 });
      await new Promise((r) => setTimeout(r, 50));
      out.band30 = { band: R.layout.band, rect: rect(), cssVar: getComputedStyle(document.body).getPropertyValue('--fx-band').trim(), prect: R.particles.updateRect() };
      bus._emit({ id: 'l3', type: 'layout', band: 99 });
      out.bandClamp = R.layout.band;
      bus._emit({ id: 'l4', type: 'layout', storyLayout: 'frame' });
      await new Promise((r) => setTimeout(r, 50));
      out.frame = { layout: R.layout.storyLayout, data: document.querySelector('#stage > .fx-band').dataset.layout, rect: rect() };
      bus._emit({ id: 'l5', type: 'layout', storyLayout: 'full' });
      await new Promise((r) => setTimeout(r, 50));
      out.full = { rect: rect(), prect: R.particles.updateRect() };
      bus._emit({ id: 'l6', type: 'layout', storyLayout: 'volcano', zone: 'left', band: 'x' });
      out.garbage = R.layout;
      bus._emit({ id: 'l7', type: 'layout', storyLayout: 'band', band: 22, zone: 'edges' });
      await new Promise((r) => setTimeout(r, 50));
      out.back = { layout: R.layout, rect: rect() };
      return { ...out, W: innerWidth, H: innerHeight };
    });
    log('layouts', JSON.stringify(layouts));
    assert.deepEqual(layouts.zoneFull, { zone: 'full', body: 'full', band: 22 }, 'partial layout keeps the other keys');
    assert.equal(layouts.fullFlash, 1, 'flash in zone full');
    assert.equal(layouts.fullImpact, true, 'impact zoom in zone full');
    assert.doesNotMatch(layouts.fullCard, /fx-col-/, 'no column class in zone full');
    assert.equal(layouts.band30.band, 30);
    assert.equal(layouts.band30.cssVar, '30');
    near(layouts.band30.rect.h, 0.3 * layouts.H, 2, 'band 30 %');
    near(layouts.band30.prect.h, 0.3 * layouts.H, 2, 'particle rect follows the band');
    assert.equal(layouts.bandClamp, 35, 'band clamps to 35');
    assert.equal(layouts.frame.layout, 'frame');
    assert.equal(layouts.frame.data, 'frame');
    near(layouts.frame.rect.w, 0.3 * layouts.W, 2, 'frame box 30 % wide');
    near(layouts.frame.rect.l + layouts.frame.rect.w, layouts.W - 0.02 * layouts.W, 2, 'frame box right-aligned');
    assert.equal(layouts.full.rect.w, layouts.W, 'full layout = whole width');
    assert.equal(layouts.full.rect.h, layouts.H, 'full layout = whole height');
    assert.equal(layouts.full.prect, null, 'full layout: whole-frame particle semantics');
    assert.deepEqual(layouts.garbage, { storyLayout: 'full', band: 35, zone: 'full' }, 'garbage keys are ignored');
    assert.deepEqual(layouts.back.layout, { storyLayout: 'band', band: 22, zone: 'edges' });
    near(layouts.back.rect.h, 0.22 * layouts.H, 2, 'band back to 22 %');

    // ---------------------------------------------------------------- 4. live story: story message -> band shows rain + night + dragon
    const story = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      bus._emit({ id: 's1', type: 'story', text: 'Es regnete in der Nacht im Wald, der Drache flog über das Schloss', final: true });
      await new Promise((r) => setTimeout(r, 300));
      const st = window.livefx.director.state;
      const band = document.querySelector('#stage > .fx-band');
      return {
        state: { scene: st.scene, weather: st.weather, time: st.time, place: st.place, landmark: st.landmark, lang: st.lang, loop: st.loop },
        actors: st.actors, props: st.props,
        current: R.currentScene, loop: R.loopName, mood: band.dataset.mood, idle: band.classList.contains('fx-band-idle'),
        canvasActors: R.particles.actors.map((a) => ({ emoji: a.emoji, role: a.role, action: a.action })),
        canvasProps: R.particles.props.map((p) => p.emoji),
        stories: R.stats.stories,
        mixer: window.LiveFXSounds.mixer.stats,
        sharedCtx: window.LiveFXSounds.mixer.ctx === R.audioCtx,
      };
    });
    log('story', JSON.stringify(story));
    assert.deepEqual(story.state, { scene: 'rain', weather: 'rain', time: 'night', place: 'forest', landmark: 'castle', lang: 'de', loop: 'rain' });
    assert.deepEqual(story.actors, [{ emoji: '🐉', role: 'dragon', action: 'fly' }]);
    assert.deepEqual(story.props, [{ emoji: '🏰', role: 'castle' }]);
    assert.equal(story.current, 'rain', 'band shows the rain scene');
    assert.equal(story.loop, 'rain', 'ambient loop by scene');
    assert.equal(story.mood, 'calm');
    assert.equal(story.idle, false);
    assert.deepEqual(story.canvasActors, [{ emoji: '🐉', role: 'dragon', action: 'fly' }], 'dragon sprite on the canvas');
    assert.deepEqual(story.canvasProps, ['🏰']);
    assert.equal(story.stories, 1);
    assert.equal(story.mixer.loop, 'rain', 'loop runs on the mixer ambient bus');
    assert.equal(story.sharedCtx, true, 'mixer on the renderer context');
    await sleep(900);
    const actorsDrawn = await page.evaluate(() => {
      const R = window.livefx.renderer;
      const a = R.particles.actors[0];
      const r = R.particles.sceneRect();
      return { x: a && a.x, y: a && a.y, size: a && a.size, inBand: !!a && a.y >= r.y0 && a.y <= r.y0 + r.h, raf: R.particles.raf !== 0 };
    });
    log('actor', JSON.stringify(actorsDrawn));
    assert.equal(actorsDrawn.inBand, true, 'dragon flies inside the band');
    assert.equal(actorsDrawn.raf, true, 'particle loop runs for the actors');
    await page.screenshot({ path: path.join(shotDir, 'story-band.png') });

    // night via story-state, then "Ende" clears everything; idle fade
    const night = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      bus._emit({ id: 's2', type: 'story-state', state: { scene: 'night', mood: 'scary', actors: [{ emoji: '👻', role: 'ghost' }], props: [] } });
      await new Promise((r) => setTimeout(r, 100));
      const o = { scene: R.currentScene, mood: document.querySelector('#stage > .fx-band').dataset.mood, loop: R.loopName, actors: R.particles.actors.filter((a) => a.state !== 'out').map((a) => a.emoji), stories: R.stats.stories };
      R.storyIdleMs = 250;
      R.storyTouch();
      await new Promise((r) => setTimeout(r, 450));
      o.idle = document.querySelector('#stage > .fx-band').classList.contains('fx-band-idle');
      bus._emit({ id: 's3', type: 'story', text: 'Und das war das Ende', final: true });
      await new Promise((r) => setTimeout(r, 100));
      o.afterEnd = { scene: R.currentScene, loop: R.loopName, idle: document.querySelector('#stage > .fx-band').classList.contains('fx-band-idle'), end: window.livefx.director.state.end };
      return o;
    });
    log('night', JSON.stringify(night));
    assert.equal(night.scene, 'night');
    assert.equal(night.mood, 'scary');
    assert.equal(night.loop, 'nightCrickets', 'loop suggested by scene when the state has none');
    assert.deepEqual(night.actors, ['👻']);
    assert.equal(night.idle, true, 'band fades after storyIdleMs without input');
    assert.deepEqual(night.afterEnd, { scene: null, loop: null, idle: false, end: true }, '"Ende" clears the band');
    await page.waitForFunction(() => document.querySelectorAll('.fx-scene').length === 0, null, { timeout: 2000 });

    // ---------------------------------------------------------------- 5. volume busses
    const vol = await page.evaluate(() => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      const M = window.LiveFXSounds.mixer;
      bus._emit({ id: 'v1', type: 'volume', volume: 0.3, bus: 'ambient' });
      bus._emit({ id: 'v2', type: 'volume', volume: 0.6 });
      bus._emit({ id: 'v3', type: 'volume', volume: 0.9, bus: 'sfx' });
      const a = { volumes: { ...R.volumes }, volume: R.volume, mixer: { master: M.stats.master, sfx: M.stats.sfx, ambient: M.stats.ambient } };
      bus._emit({ id: 'v4', type: 'state', volumes: { ambient: 0.1 }, layout: { zone: 'top' }, volume: 0.2 });
      bus._emit({ id: 'v5', type: 'volume', volume: 'x', bus: 'ambient' });
      bus._emit({ id: 'v6', type: 'volume', volume: 0.7, bus: 'kitchen' });
      return { ...a, b: { volumes: { ...R.volumes }, zone: R.layout.zone, mixer: { master: M.stats.master, ambient: M.stats.ambient } }, setVolume: R.setVolume('ambient', 0.45) };
    });
    log('volume', JSON.stringify(vol));
    assert.deepEqual(vol.volumes, { master: 0.6, sfx: 0.9, ambient: 0.3 });
    assert.equal(vol.volume, 0.6, 'volume getter = master');
    assert.deepEqual(vol.mixer, { master: 0.6, sfx: 0.9, ambient: 0.3 }, 'mixer busses follow');
    assert.deepEqual(vol.b.volumes, { master: 0.7, sfx: 0.9, ambient: 0.1 }, 'state volumes apply; garbage ignored; unknown bus = master');
    assert.equal(vol.b.zone, 'top', 'state layout applies');
    assert.deepEqual(vol.b.mixer, { master: 0.7, ambient: 0.1 });
    assert.equal(vol.setVolume, 0.45);
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    await ctx.close();

    // ---------------------------------------------------------------- 6. URL pins: ?story=frame&band=25&zone=bottom&volume=0.4
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const pinned = await pctx.newPage();
    await pinned.goto(`${base}/overlay.html?story=frame&band=25&zone=bottom&volume=0.4`);
    await pinned.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const pins = await pinned.evaluate(() => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      const a = { layout: { ...R.layout }, master: R.volume };
      bus._emit({ id: 'p1', type: 'layout', storyLayout: 'full', band: 30, zone: 'full' });
      bus._emit({ id: 'p2', type: 'state', volume: 0.9, volumes: { master: 0.9, ambient: 0.2 }, layout: { storyLayout: 'band', zone: 'edges' } });
      bus._emit({ id: 'p3', type: 'volume', volume: 0.8 });
      R.fire({ id: 'c', visual: { kind: 'card', emoji: '🙂' } });
      return { ...a, after: { ...R.layout }, volumes: { ...R.volumes }, card: document.querySelector('.fx-card').className };
    });
    log('pins', JSON.stringify(pins));
    assert.deepEqual(pins.layout, { storyLayout: 'frame', band: 25, zone: 'bottom' });
    assert.equal(pins.master, 0.4);
    assert.deepEqual(pins.after, { storyLayout: 'frame', band: 25, zone: 'bottom' }, 'URL pins win over layout / state messages');
    assert.deepEqual(pins.volumes, { master: 0.8, sfx: 0.8, ambient: 0.2 }, 'state master ignored with ?volume=, ambient applies, explicit volume message applies');
    assert.match(pins.card, /fx-in-band/, 'zone bottom puts cards into the band');
    await pctx.close();

    // ---------------------------------------------------------------- 7. portrait 1080×1920: band 20 % above the chat zone
    const octx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const portrait = await octx.newPage();
    const perrors = [];
    portrait.on('pageerror', (e) => perrors.push(String(e)));
    await portrait.goto(`${base}/overlay.html?layout=portrait&perf=high`);
    await portrait.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.director, null, { timeout: 5000 });
    await portrait.evaluate(() => {
      window.livefx.bus._emit({ id: 'ps', type: 'story', text: 'gece ormanda yağmur yağıyordu, ejderha kalenin üzerinden uçtu', final: true });
    });
    await portrait.waitForSelector('.fx-band .fx-scene[data-scene="rain"].fx-scene-on', { timeout: 2000 });
    await sleep(1200);
    const por = await portrait.evaluate(() => {
      const R = window.livefx.renderer;
      const b = document.querySelector('#stage > .fx-band').getBoundingClientRect();
      const st = window.livefx.director.state;
      R.fire({ id: 'p', visual: { kind: 'rain', emoji: '🍕', count: 30 } });
      const W = innerWidth;
      const edge = parseFloat(getComputedStyle(document.body).getPropertyValue('--fx-edge')) / 100 * W;
      const drops = R.particles.items.filter((p) => p.text === '🍕');
      return {
        band: R.layout.band, pct: R.bandPct, cssVar: getComputedStyle(document.body).getPropertyValue('--fx-band').trim(),
        top: b.top, bottom: b.bottom, h: b.height, H: innerHeight, W,
        state: { scene: st.scene, time: st.time, place: st.place, landmark: st.landmark, lang: st.lang },
        actors: st.actors.map((a) => a.role + ':' + a.action),
        edge, dropsInCols: drops.length > 0 && drops.every((p) => p.x <= edge + 1 || p.x >= W - edge - 1),
      };
    });
    log('portrait', JSON.stringify(por));
    assert.equal(por.band, 22, 'logical band stays the default');
    assert.equal(por.pct, 20, 'portrait uses 20 % unless pinned');
    assert.equal(por.cssVar, '20');
    near(por.h, 0.2 * por.H, 2, 'portrait band 20 %');
    near(por.bottom, 0.65 * por.H, 2, 'portrait band sits above the chat zone (bottom 35 %)');
    assert.deepEqual(por.state, { scene: 'rain', time: 'night', place: 'forest', landmark: 'castle', lang: 'tr' }, 'Turkish sentence');
    assert.deepEqual(por.actors, ['dragon:fly']);
    near(por.edge, 0.3 * por.W, 1, 'portrait edge columns 30vw');
    assert.equal(por.dropsInCols, true, 'portrait rain in the edge columns');
    const porCam = await portrait.evaluate(CANVAS_PROBE, [0.31, 0.02, 0.69, 0.43]);
    assert.equal(porCam, 0, `portrait camera area transparent (max alpha ${porCam})`);
    await portrait.screenshot({ path: path.join(shotDir, 'story-band-portrait.png') });
    // explicit band in portrait wins over the 20 % rule
    const porPinned = await portrait.evaluate(() => {
      window.livefx.bus._emit({ id: 'pb', type: 'layout', band: 28 });
      return { band: window.livefx.renderer.layout.band, pct: window.livefx.renderer.bandPct };
    });
    assert.deepEqual(porPinned, { band: 28, pct: 28 });
    assert.deepEqual(perrors, [], `portrait errors: ${perrors.join('; ')}`);
    await octx.close();

    // ---------------------------------------------------------------- 8. server: /fire layout + volume {bus} + story are validated, relayed and remembered
    const overlay = await sseClient(base, { role: 'overlay' });
    const first = await overlay.next('state');
    assert.equal(first.layout, null, 'no layout before a message');
    assert.equal(first.volumes, null, 'no volumes before a message');
    for (const bad of [{ type: 'layout' }, { type: 'layout', storyLayout: 'wide' }, { type: 'layout', zone: 'left' }, { type: 'layout', band: 'x' }, { type: 'volume', volume: 0.5, bus: 'kitchen' }, { type: 'story' }, { type: 'story', text: '' }, { type: 'story-state' }, { type: 'story-state', state: 'rain' }]) {
      const r = await api(base, 'POST', '/fire', { ...auth, json: bad });
      assert.equal(r.status, 400, JSON.stringify(bad));
      assert.equal(r.json.error, 'invalid_envelope');
    }
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'layout', zone: 'bottom', band: 99, extra: 1 } })).status, 200);
    const relayed = await overlay.next('layout');
    assert.deepEqual({ zone: relayed.zone, band: relayed.band, storyLayout: relayed.storyLayout, extra: relayed.extra }, { zone: 'bottom', band: 35, storyLayout: undefined, extra: undefined }, 'partial layout relayed as sent (band clamped)');
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'layout', storyLayout: 'frame' } })).status, 200);
    await overlay.next('layout');
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'volume', volume: 0.25, bus: 'ambient' } })).status, 200);
    const rv = await overlay.next('volume');
    assert.deepEqual({ volume: rv.volume, bus: rv.bus }, { volume: 0.25, bus: 'ambient' });
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'volume', volume: 0.65, bus: 'master' } })).status, 200);
    const rm = await overlay.next('volume');
    assert.deepEqual({ volume: rm.volume, bus: rm.bus }, { volume: 0.65, bus: undefined }, 'bus master travels without a bus key (1.x receivers)');
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'story', text: 'Es war einmal ein Drache', final: false, lang: 'DE', source: 'Panel' } })).status, 200);
    const rs = await overlay.next('story');
    assert.deepEqual({ text: rs.text, final: rs.final, lang: rs.lang, source: rs.source }, { text: 'Es war einmal ein Drache', final: false, lang: 'de', source: 'Panel' });
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'story-state', state: { scene: 'forest', actors: [{ emoji: '🦊', role: 'fox' }], mood: 'happy', junk: 1 } } })).status, 200);
    const rst = await overlay.next('story-state');
    assert.deepEqual(rst.state, { scene: 'forest', weather: 'clear', time: 'day', place: null, mood: 'happy', actors: [{ emoji: '🦊', role: 'fox' }], props: [] });
    overlay.close();
    const late = await sseClient(base, { role: 'overlay' });
    const st = await late.next('state');
    late.close();
    assert.deepEqual(st.layout, { zone: 'bottom', band: 35, storyLayout: 'frame' }, 'state remembers the merged layout');
    assert.deepEqual(st.volumes, { ambient: 0.25, master: 0.65 }, 'state remembers per-bus levels');
    assert.equal(st.volume, 0.65, 'state.volume mirrors the master level');
    log('server state', JSON.stringify({ layout: st.layout, volumes: st.volumes }));
  } finally {
    await server.stop();
  }
}

module.exports = { run };
