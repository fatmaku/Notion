// Story band (LiveFX 2.2): scenes render in a bottom band (default 22 %, portrait 20 %) instead of covering the
// camera; effect zones keep rain / confetti in the edge columns and cards in the columns (no flash / impact zoom);
// `layout`, `story`, `story-state` and `volume {bus}` messages; URL pins (?story= ?band= ?zone= ?volume=); the server
// remembers layout + volumes in the SSE `state` message.
// 2.3: portrait band position (`bandPosition` / ?bandpos= bottom = flush with the frame bottom (default) | chat =
// above the chat zone), a burst fired together with a story line lives its full duration (one particle loop),
// the live-story lifecycle (props / actors leave, idle band clears and comes back), `storyStyle` + sketch hook.
// Screenshots: story-band.png (16:9), story-band-portrait.png / story-band-portrait-bottom.png (9:16, band at the
// bottom), story-band-portrait-chat.png (9:16, band above the chat zone), story-applause-portrait.png.
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
    assert.deepEqual(init.layout, { storyLayout: 'band', band: 22, zone: 'edges', bandPosition: 'bottom', storyStyle: 'mixed' }, 'default layout');
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
    assert.deepEqual(layouts.garbage, { storyLayout: 'full', band: 35, zone: 'full', bandPosition: 'bottom', storyStyle: 'mixed' }, 'garbage keys are ignored');
    assert.deepEqual(layouts.back.layout, { storyLayout: 'band', band: 22, zone: 'edges', bandPosition: 'bottom', storyStyle: 'mixed' });
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
    assert.deepEqual(pins.layout, { storyLayout: 'frame', band: 25, zone: 'bottom', bandPosition: 'bottom', storyStyle: 'mixed' });
    assert.equal(pins.master, 0.4);
    assert.deepEqual(pins.after, { storyLayout: 'frame', band: 25, zone: 'bottom', bandPosition: 'bottom', storyStyle: 'mixed' }, 'URL pins win over layout / state messages');
    assert.deepEqual(pins.volumes, { master: 0.8, sfx: 0.8, ambient: 0.2 }, 'state master ignored with ?volume=, ambient applies, explicit volume message applies');
    assert.match(pins.card, /fx-in-band/, 'zone bottom puts cards into the band');
    await pctx.close();

    // ---------------------------------------------------------------- 7. portrait 1080×1920: band 20 %, flush with the bottom edge (2.3 default)
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
    near(por.bottom, por.H, 1, 'portrait band sits at the very bottom (bandPosition bottom, the 2.3 default)');
    assert.deepEqual(por.state, { scene: 'rain', time: 'night', place: 'forest', landmark: 'castle', lang: 'tr' }, 'Turkish sentence');
    assert.deepEqual(por.actors, ['dragon:fly']);
    near(por.edge, 0.3 * por.W, 1, 'portrait edge columns 30vw');
    assert.equal(por.dropsInCols, true, 'portrait rain in the edge columns');
    const porCam = await portrait.evaluate(CANVAS_PROBE, [0.31, 0.02, 0.69, 0.43]);
    assert.equal(porCam, 0, `portrait camera area transparent (max alpha ${porCam})`);
    await portrait.screenshot({ path: path.join(shotDir, 'story-band-portrait.png') });
    await portrait.screenshot({ path: path.join(shotDir, 'story-band-portrait-bottom.png') });
    // live `layout {bandPosition}`: chat lifts the band above the chat zone, bottom brings it back; particles follow
    const porPos = await portrait.evaluate(async () => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      const box = () => {
        const b = document.querySelector('#stage > .fx-band').getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, h: b.height, w: b.width, rect: R.particles.updateRect(), pos: R.bandPosition, body: document.body.dataset.bandPos };
      };
      const out = { bottom: box() };
      bus._emit({ id: 'bp1', type: 'layout', bandPosition: 'chat' });
      out.chat = box();
      out.layoutChat = R.layout.bandPosition;
      bus._emit({ id: 'bp2', type: 'layout', bandPosition: 'nowhere' });
      out.garbage = R.layout.bandPosition;
      bus._emit({ id: 'bp3', type: 'layout', bandPosition: 'bottom' });
      out.back = box();
      return out;
    });
    log('portrait bandPosition', JSON.stringify(porPos));
    near(porPos.bottom.bottom, por.H, 1, 'bottom: band bottom = frame bottom');
    assert.equal(porPos.bottom.w, por.W, 'bottom: full width');
    assert.deepEqual([porPos.bottom.pos, porPos.bottom.body], ['bottom', 'bottom']);
    near(porPos.chat.bottom, 0.65 * por.H, 2, 'chat: band bottom at 65 % (above the chat zone)');
    near(porPos.chat.h, 0.2 * por.H, 2, 'chat: same 20 % height');
    near(porPos.chat.rect.y0 + porPos.chat.rect.h, 0.65 * por.H, 2, 'particle clip rect follows the band');
    assert.deepEqual([porPos.layoutChat, porPos.chat.pos, porPos.chat.body], ['chat', 'chat', 'chat']);
    assert.equal(porPos.garbage, 'chat', 'unknown bandPosition keeps the current one');
    near(porPos.back.bottom, por.H, 1, 'back at the bottom');
    // explicit band in portrait wins over the 20 % rule
    const porPinned = await portrait.evaluate(() => {
      window.livefx.bus._emit({ id: 'pb', type: 'layout', band: 28 });
      return { band: window.livefx.renderer.layout.band, pct: window.livefx.renderer.bandPct };
    });
    assert.deepEqual(porPinned, { band: 28, pct: 28 });
    assert.deepEqual(perrors, [], `portrait errors: ${perrors.join('; ')}`);
    await octx.close();

    // ?bandpos=chat pins the 2.2 look (band above the chat zone) against layout / state messages; landscape ignores it
    const cctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const chatPage = await cctx.newPage();
    await chatPage.goto(`${base}/overlay.html?layout=portrait&bandpos=chat&perf=high`);
    await chatPage.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.director, null, { timeout: 5000 });
    await chatPage.evaluate(() => window.livefx.bus._emit({ id: 'cs', type: 'story', text: 'gece ormanda yağmur yağıyordu, ejderha kalenin üzerinden uçtu', final: true }));
    await chatPage.waitForSelector('.fx-band .fx-scene[data-scene="rain"].fx-scene-on', { timeout: 2000 });
    await sleep(1200);
    const chat = await chatPage.evaluate(() => {
      const R = window.livefx.renderer;
      const bus = window.livefx.bus;
      const b0 = document.querySelector('#stage > .fx-band').getBoundingClientRect();
      bus._emit({ id: 'cp1', type: 'layout', bandPosition: 'bottom' });
      bus._emit({ id: 'cp2', type: 'state', layout: { bandPosition: 'bottom', zone: 'edges' } });
      const b1 = document.querySelector('#stage > .fx-band').getBoundingClientRect();
      return { bottom0: b0.bottom, bottom1: b1.bottom, pos: R.layout.bandPosition, H: innerHeight };
    });
    log('portrait ?bandpos=chat', JSON.stringify(chat));
    near(chat.bottom0, 0.65 * chat.H, 2, '?bandpos=chat: band bottom at 65 %');
    near(chat.bottom1, 0.65 * chat.H, 2, 'pinned against layout / state messages');
    assert.equal(chat.pos, 'chat');
    await chatPage.screenshot({ path: path.join(shotDir, 'story-band-portrait-chat.png') });
    await cctx.close();
    const lctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const land = await lctx.newPage();
    await land.goto(`${base}/overlay.html?bandpos=chat`);
    await land.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const landPos = await land.evaluate(() => {
      const b = document.querySelector('#stage > .fx-band').getBoundingClientRect();
      return { bottom: b.bottom, H: innerHeight, layout: window.livefx.renderer.layout.bandPosition, pos: window.livefx.renderer.bandPosition };
    });
    near(landPos.bottom, landPos.H, 1, 'landscape ignores bandPosition: band at the bottom');
    assert.deepEqual([landPos.layout, landPos.pos], ['chat', 'bottom'], 'requested chat, in use bottom (landscape)');
    await lctx.close();

    // ---------------------------------------------------------------- 7b. applause + story at once: the burst lives its full duration
    // (2.3 root cause: every scene particle spawned inside a frame booked a second rAF loop, so after a few seconds
    // of scene the physics ran N× per frame and a 👏 rain hit the floor within ~0.3 s.)
    const actx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const ap = await actx.newPage();
    const aerrors = [];
    ap.on('pageerror', (e) => aerrors.push(String(e)));
    await ap.goto(`${base}/overlay.html?layout=portrait&zone=edges`); // perf auto (OBS default)
    await ap.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.director, null, { timeout: 5000 });
    await ap.evaluate(() => {
      const P = window.livefx.renderer.particles;
      const orig = P._tick;
      window.__ticks = [];
      P._tick = (now) => {
        window.__ticks.push(now);
        return orig.call(P, now);
      };
      window.livefx.bus._emit({ id: 'af', type: 'story', text: 'ormanda yürüdük', final: true, lang: 'tr' });
    });
    await sleep(4000); // the scene spawns ambient particles for a while (the old bug grew one loop per spawn)
    const loops = await ap.evaluate(async () => {
      const P = window.livefx.renderer.particles;
      window.__ticks = [];
      await new Promise((r) => setTimeout(r, 1000));
      const t = window.__ticks;
      // a constant-speed probe (vy 100 px/s, no gravity) must move ~100 px per second with the scene running
      P.add({ kind: 'emoji', text: '🧪', x: 100, y: 0, floor: 99999, vx: 0, vy: 100, g: 0, wind: 0, drift: 0, phase: 0, rot: 0, vr: 0, size: 30, life: 5, layer: 1 });
      const probe = P.items.find((q) => q.text === '🧪');
      const y0 = probe.y;
      const t0 = performance.now();
      await new Promise((r) => setTimeout(r, 1000));
      const v = ((probe.y - y0) / (performance.now() - t0)) * 1000;
      P.items = P.items.filter((q) => q !== probe);
      return { calls: t.length, frames: new Set(t).size, v, scene: window.livefx.renderer.currentScene, amb: P.items.filter((q) => q.ambient).length };
    });
    log('particle loop', JSON.stringify(loops));
    assert.equal(loops.scene, 'forest');
    assert.ok(loops.amb > 0, 'ambient particles running');
    assert.ok(loops.frames > 10, `frames counted (${loops.frames})`);
    assert.ok(loops.calls / loops.frames <= 1.05, `one particle loop: ${loops.calls} ticks in ${loops.frames} frames`);
    near(loops.v, 100, 15, 'probe speed px/s with a scene running');
    const clap = await ap.evaluate(async () => {
      const R = window.livefx.renderer;
      const P = R.particles;
      const bus = window.livefx.bus;
      // the streamer says "alkış" (a story line) and the clap trigger fires in the same moment
      bus._emit({ id: 'al1', type: 'story', text: 'alkış', final: true, lang: 'tr' });
      bus._emit({ id: 'al2', type: 'fire', trigger: { id: 'clap', visual: { kind: 'rain', emoji: '👏', count: 24 } } });
      bus._emit({ id: 'al3', type: 'fire', trigger: { id: 'party', visual: { kind: 'confetti' } } });
      const n0 = P.items.filter((p) => p.text === '👏').length;
      const c0 = P.items.filter((p) => p.kind === 'rect').length;
      const start = performance.now();
      let lastVis = 0;
      const samples = {};
      await new Promise((resolve) => {
        (function tick() {
          const t = performance.now() - start;
          const vis = P.items.filter((p) => p.text === '👏' && p.y > 0 && p.y < innerHeight && p.age / p.life < 0.95).length;
          if (vis >= 3) lastVis = t;
          if (!samples.s15 && t >= 1500) samples.s15 = { clap: vis, confetti: P.items.filter((p) => p.kind === 'rect').length, marker: document.querySelectorAll('.fx-rain[data-emoji="👏"]').length };
          if (t < 4000) requestAnimationFrame(tick);
          else resolve();
        })();
      });
      return { n0, c0, ...samples, visibleMs: Math.round(lastVis), scene: R.currentScene, fps: R.stats.fps };
    });
    log('applause + story', JSON.stringify(clap));
    assert.ok(clap.n0 === 48 || clap.n0 === 24, `👏 burst spawned: 24 × 2 drops (eco: × 1) – got ${clap.n0}`);
    assert.ok(clap.c0 >= 45, `confetti spawned (${clap.c0})`);
    assert.ok(clap.s15.clap >= 3, `👏 rain still visible after 1.5 s (${clap.s15.clap})`);
    assert.ok(clap.s15.confetti > 0, `confetti still alive after 1.5 s (${clap.s15.confetti})`);
    assert.equal(clap.s15.marker, 1, 'rain marker node still there (story did not clear transient effects)');
    assert.ok(clap.visibleMs >= 2000, `👏 rain visible for ${clap.visibleMs} ms (>= 2 s)`);
    assert.equal(clap.scene, 'forest', 'the story scene keeps running');
    assert.ok(clap.fps > 0 && clap.fps < 200, `stats.fps is a frame rate (${clap.fps})`);
    await ap.evaluate(() => window.livefx.renderer.fire({ id: 'clap2', visual: { kind: 'rain', emoji: '👏', count: 24 } }));
    await sleep(900);
    await ap.screenshot({ path: path.join(shotDir, 'story-applause-portrait.png') });
    assert.deepEqual(aerrors, [], `applause errors: ${aerrors.join('; ')}`);
    await actx.close();

    // ---------------------------------------------------------------- 7c. lifecycle: car leaves, idle band clears + comes back, director ticks
    const yctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const lp = await yctx.newPage();
    const lerrors = [];
    lp.on('pageerror', (e) => lerrors.push(String(e)));
    await lp.goto(`${base}/overlay.html?layout=portrait&perf=high`);
    await lp.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.director, null, { timeout: 5000 });
    const life = await lp.evaluate(async () => {
      const R = window.livefx.renderer;
      const P = R.particles;
      const bus = window.livefx.bus;
      const D = window.livefx.director;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      let ticks = 0;
      const tick = D.tick;
      D.tick = (now) => {
        ticks++;
        return tick(now);
      };
      const say = async (text) => {
        bus._emit({ id: 'ly' + Math.random().toString(36).slice(2, 8), type: 'story', text, final: true });
        await wait(150);
        return { scene: R.currentScene, props: P.props.filter((p) => p.state !== 'out').map((p) => p.emoji), weather: D.state.weather };
      };
      const steps = [];
      for (const line of ['yağmur yağıyordu', 'araba geldi', 'güneş açtı', 'ormanda yürüdük']) steps.push(await say(line));
      await wait(1100);
      const out = { steps, ticks };
      // idle: the band fades AND its actors / ambient / loop stop
      await say('kız geldi');
      await wait(900); // the girl walks in
      R.storyIdleMs = 300;
      R.storyTouch();
      await wait(1500); // idle after 300 ms, the band + its sprites fade over 0.8 s
      out.idle = {
        idle: R.storyIdle,
        cls: document.querySelector('#stage > .fx-band').classList.contains('fx-band-idle'),
        actors: P.actors.length,
        props: P.props.length,
        ambient: P.items.filter((p) => p.ambient).length,
        ambientOn: !!P.ambient,
        loop: R.loopName,
        scene: R.currentScene,
        scenes: document.querySelectorAll('.fx-scene').length,
      };
      // a line that changes nothing still wakes the band with the remembered state
      R.storyIdleMs = 60000;
      bus._emit({ id: 'lw', type: 'story', text: 've sonra', final: true });
      await wait(300);
      out.wake = { idle: R.storyIdle, cls: document.querySelector('#stage > .fx-band').classList.contains('fx-band-idle'), scene: R.currentScene, loop: R.loopName, actors: P.actors.map((a) => a.emoji), ambientOn: !!P.ambient };
      // a lifetime expiry (tick) does not wake an idle band
      R.storyIdleMs = 200;
      R.storyTouch();
      await wait(1300);
      R.story({ ...D.state, actors: [{ emoji: '🐻', role: 'bear' }] }, { touch: false });
      await wait(100);
      out.expiryWhileIdle = { idle: R.storyIdle, scene: R.currentScene, actors: P.actors.length, remembered: R.storyState.actors.map((a) => a.role) };
      return out;
    });
    log('lifecycle', JSON.stringify(life));
    assert.deepEqual(life.steps.map((x) => x.scene), ['rain', 'rain', null, 'forest'], 'the band empties after the rain (a lone car holds no stage)');
    assert.deepEqual(life.steps.map((x) => x.props), [[], ['🚗'], [], []], 'the car arrives with the rain and leaves with it');
    assert.deepEqual(life.steps.map((x) => x.weather), ['rain', 'rain', 'clear', 'clear'], 'rain gone when the sun comes');
    assert.ok(life.ticks >= 1, `director.tick runs every second (${life.ticks})`);
    assert.deepEqual(life.idle, { idle: true, cls: true, actors: 0, props: 0, ambient: 0, ambientOn: false, loop: null, scene: null, scenes: 0 }, 'idle band: nothing keeps painting');
    assert.deepEqual(life.wake, { idle: false, cls: false, scene: 'forest', loop: 'birds', actors: ['👧'], ambientOn: true }, 'the next sentence brings the band back');
    assert.deepEqual(life.expiryWhileIdle, { idle: true, scene: null, actors: 0, remembered: ['bear'] }, 'an expiry keeps an idle band dark (state remembered)');
    assert.deepEqual(lerrors, [], `lifecycle errors: ${lerrors.join('; ')}`);
    await yctx.close();

    // ---------------------------------------------------------------- 7d. storyStyle + sketch hook (stub LiveFXSketch)
    const sctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const sp = await sctx.newPage();
    await sp.addInitScript(() => {
      window.__sketch = { attach: [], updates: [], styles: [] };
      window.LiveFXSketch = {
        attach(renderer, getSurface) {
          window.__sketch.attach.push({ renderer: renderer === (window.livefx && window.livefx.renderer), fn: typeof getSurface });
          window.__sketch.getSurface = getSurface;
          return {
            update(state) {
              window.__sketch.updates.push({ scene: state.scene, style: state.style, idle: state.idle, actors: state.actors.map((a) => a.role) });
              const s = getSurface();
              s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
              s.ctx.fillStyle = '#ff00ff';
              s.ctx.fillRect(10, 10, 40, 40);
            },
            setStyle(style) {
              window.__sketch.styles.push(style);
            },
          };
        },
      };
    });
    await sp.goto(`${base}/overlay.html?perf=high`);
    await sp.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.director, null, { timeout: 5000 });
    const sk = await sp.evaluate(async () => {
      const R = window.livefx.renderer;
      const P = R.particles;
      const bus = window.livefx.bus;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = { before: { attach: window.__sketch.attach.length, style: R.storyStyle, data: document.querySelector('#stage > .fx-band').dataset.style } };
      bus._emit({ id: 'k1', type: 'story', text: 'A fox walked into the forest', final: true });
      await wait(200);
      bus._emit({ id: 'k2', type: 'story', text: 'The fox danced', final: true });
      await wait(200);
      const surf = window.__sketch.getSurface();
      const band = document.querySelector('#stage > .fx-band');
      out.mixed = {
        attach: window.__sketch.attach,
        updates: window.__sketch.updates.slice(),
        style: R.storyStyle,
        data: band.dataset.style,
        surface: { inBand: surf.canvas.parentElement === band, cls: surf.canvas.className, w: surf.width, h: surf.height, bw: band.clientWidth, bh: band.clientHeight, cw: surf.canvas.width, dpr: surf.dpr, layout: surf.layout.storyStyle },
        display: getComputedStyle(surf.canvas).display,
        actors: P.actors.filter((a) => a.state !== 'out').map((a) => a.emoji),
        ambientOn: !!P.ambient,
      };
      bus._emit({ id: 'k3', type: 'layout', storyStyle: 'sketch' });
      await wait(100);
      out.sketch = { style: R.storyStyle, data: band.dataset.style, styles: window.__sketch.styles.slice(), actors: P.actors.filter((a) => a.state !== 'out').length, ambientOn: !!P.ambient, ambient: P.items.filter((p) => p.ambient).length, ground: getComputedStyle(document.querySelector('.fx-scene-ground')).visibility, last: window.__sketch.updates[window.__sketch.updates.length - 1] };
      bus._emit({ id: 'k4', type: 'layout', storyStyle: 'emoji' });
      await wait(100);
      out.emoji = { data: band.dataset.style, display: getComputedStyle(surf.canvas).display, actors: P.actors.filter((a) => a.state !== 'out').map((a) => a.emoji), ambientOn: !!P.ambient };
      bus._emit({ id: 'k5', type: 'layout', storyStyle: 'mixed' });
      out.attachCount = window.__sketch.attach.length;
      return out;
    });
    log('sketch hook', JSON.stringify(sk));
    assert.deepEqual(sk.before, { attach: 0, style: 'emoji', data: 'emoji' }, 'not attached before the first story state');
    assert.deepEqual(sk.mixed.attach, [{ renderer: true, fn: 'function' }], 'LiveFXSketch.attach(renderer, getSurface) once');
    assert.deepEqual(sk.mixed.updates.map((u) => [u.scene, u.style, u.idle]), [['forest', 'mixed', false], ['forest', 'mixed', false]], 'sketch.update(state) per story state');
    assert.deepEqual(sk.mixed.updates[1].actors, ['fox']);
    assert.equal(sk.mixed.style, 'mixed');
    assert.equal(sk.mixed.data, 'mixed');
    assert.equal(sk.mixed.surface.inBand, true, 'surface canvas lives in .fx-band');
    assert.equal(sk.mixed.surface.cls, 'fx-sketch');
    assert.deepEqual([sk.mixed.surface.w, sk.mixed.surface.h], [sk.mixed.surface.bw, sk.mixed.surface.bh], 'surface = band size');
    assert.equal(sk.mixed.surface.cw, Math.round(sk.mixed.surface.w * sk.mixed.surface.dpr), 'canvas pixels = band × dpr');
    assert.equal(sk.mixed.display, 'block');
    assert.deepEqual(sk.mixed.actors, ['🦊'], 'mixed: emoji actors too');
    assert.equal(sk.mixed.ambientOn, true);
    assert.equal(sk.sketch.style, 'sketch');
    assert.equal(sk.sketch.data, 'sketch');
    assert.deepEqual(sk.sketch.styles, ['mixed', 'sketch'], 'setStyle on attach and on change');
    assert.deepEqual([sk.sketch.actors, sk.sketch.ambientOn, sk.sketch.ambient, sk.sketch.ground], [0, false, 0, 'hidden'], 'sketch: no emoji sprites / parallax / ground');
    assert.equal(sk.sketch.last.style, 'sketch', 'the drawing is redrawn with the new style');
    assert.deepEqual(sk.emoji, { data: 'emoji', display: 'none', actors: ['🦊'], ambientOn: true }, 'emoji: drawing hidden, sprites back');
    assert.equal(sk.attachCount, 1, 'attach never runs twice');
    const skPx = await sp.evaluate(() => {
      const c = document.querySelector('.fx-sketch');
      return c.getContext('2d').getImageData(Math.round(20 * (window.devicePixelRatio || 1)), Math.round(20 * (window.devicePixelRatio || 1)), 1, 1).data[3];
    });
    assert.ok(skPx > 0, 'the stub drew on the band surface');
    await sctx.close();

    // ---------------------------------------------------------------- 8. server: /fire layout + volume {bus} + story are validated, relayed and remembered
    const overlay = await sseClient(base, { role: 'overlay' });
    const first = await overlay.next('state');
    assert.equal(first.layout, null, 'no layout before a message');
    assert.equal(first.volumes, null, 'no volumes before a message');
    for (const bad of [{ type: 'layout' }, { type: 'layout', storyLayout: 'wide' }, { type: 'layout', zone: 'left' }, { type: 'layout', band: 'x' }, { type: 'layout', bandPosition: 'middle' }, { type: 'layout', storyStyle: 'video' }, { type: 'volume', volume: 0.5, bus: 'kitchen' }, { type: 'story' }, { type: 'story', text: '' }, { type: 'story-state' }, { type: 'story-state', state: 'rain' }]) {
      const r = await api(base, 'POST', '/fire', { ...auth, json: bad });
      assert.equal(r.status, 400, JSON.stringify(bad));
      assert.equal(r.json.error, 'invalid_envelope');
    }
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'layout', zone: 'bottom', band: 99, extra: 1 } })).status, 200);
    const relayed = await overlay.next('layout');
    assert.deepEqual({ zone: relayed.zone, band: relayed.band, storyLayout: relayed.storyLayout, extra: relayed.extra }, { zone: 'bottom', band: 35, storyLayout: undefined, extra: undefined }, 'partial layout relayed as sent (band clamped)');
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'layout', storyLayout: 'frame' } })).status, 200);
    await overlay.next('layout');
    assert.equal((await api(base, 'POST', '/fire', { ...auth, json: { type: 'layout', bandPosition: 'chat', storyStyle: 'sketch' } })).status, 200);
    const rbp = await overlay.next('layout');
    assert.deepEqual({ bandPosition: rbp.bandPosition, storyStyle: rbp.storyStyle, zone: rbp.zone }, { bandPosition: 'chat', storyStyle: 'sketch', zone: undefined }, '2.3 keys relayed');
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
    assert.deepEqual(st.layout, { zone: 'bottom', band: 35, storyLayout: 'frame', bandPosition: 'chat', storyStyle: 'sketch' }, 'state remembers the merged layout');
    assert.deepEqual(st.volumes, { ambient: 0.25, master: 0.65 }, 'state remembers per-bus levels');
    assert.equal(st.volume, 0.65, 'state.volume mirrors the master level');
    log('server state', JSON.stringify({ layout: st.layout, volumes: st.volumes }));
  } finally {
    await server.stop();
  }
}

module.exports = { run };
