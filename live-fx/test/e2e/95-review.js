// Release-2.0 review of the browser side (renderer v2, mixer hook, panel 1.5/1.6 cards, editor, mobile):
// robustness and XSS regressions found in the adversarial pass, each reproduced here before it was fixed.
//   - renderer without canvas 2d / without requestAnimationFrame falls back to DOM effects (no errors)
//   - every user-controlled string / colour / src is escaped or rejected (card, banner, text, lower-third,
//     sticker, rain, scene caption, combo steps), setTheme() with garbage -> neon without class leaks
//   - mixer shares the renderer's AudioContext; unknown sounds do not count; NaN pan / gain 0 are harmless
//   - 200 fires leave no nodes / timers behind and the particle loop stops when idle (no CPU burn)
//   - themes: text vs card / accent contrast >= 3:1 for every theme, portrait + pastel screenshot
//   - panel: chat feed escapes user/text, combos with 0 / NaN, effectiveLang() without detection,
//     explicit preview sound stays on, blocked localStorage (private mode) still boots the panel
//   - editor: invalid combo JSON shows a message instead of throwing; `text` without text saves as a card
//   - mobile: text / lower-third / combo tiles render
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYLOAD = '<img src=x onerror="window.__xss=1"><b>x</b>';

/** WCAG relative luminance of a CSS colour string (#rgb, #rrggbb, rgb[a](...)); null when unparsable. */
function luminance(css) {
  const s = String(css || '').trim();
  let r;
  let g;
  let b;
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if ((m = /^rgba?\(([^)]+)\)$/i.exec(s))) {
    [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
  } else return null;
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la == null || lb == null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

async function newOverlay(browser, url, { viewport = { width: 1280, height: 720 }, init } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  if (init) await page.addInitScript(init);
  await page.goto(url);
  await page.waitForFunction(() => window.livefx && window.livefx.renderer && window.livefx.bus.serverOk, null, { timeout: 5000 });
  return { ctx, page, errors };
}

async function run({ browser, startServer, api, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  try {
    // ---------------------------------------------------------------- 1. no canvas 2d -> DOM fallback
    {
      const { ctx, page, errors } = await newOverlay(browser, `${base}/overlay.html`, {
        init: () => {
          HTMLCanvasElement.prototype.getContext = () => null;
        },
      });
      const r = await page.evaluate(async () => {
        const R = window.livefx.renderer;
        R.fire({ id: 'k', visual: { kind: 'confetti', intensity: 3, emoji: '🎉', text: 'GG' } });
        R.fire({ id: 'r', visual: { kind: 'rain', emoji: '🍕', count: 7, intensity: 3 } });
        R.fire({ id: 't', visual: { kind: 'text', text: 'NO CANVAS', intensity: 3, impact: true } });
        R.fire({ id: 's', visual: { kind: 'scene', scene: 'night', text: 'cap' } });
        await new Promise((res) => setTimeout(res, 150));
        return {
          canvas: R.stats.canvas,
          ok: R.particles.ok,
          canvasEl: document.querySelectorAll('#stage canvas').length,
          confetti: document.querySelectorAll('.fx-confetti').length,
          drops: document.querySelectorAll('.fx-drop').length,
          text: document.querySelectorAll('.fx-bigtext').length,
          scene: document.querySelectorAll('.fx-scene').length,
          particles: R.stats.particles,
          fps: R.stats.fps,
          raf: R.particles.raf,
        };
      });
      log('no-canvas', JSON.stringify(r));
      assert.equal(r.canvas, false);
      assert.equal(r.ok, false);
      assert.equal(r.canvasEl, 0, 'no canvas element mounted when getContext fails');
      assert.equal(r.confetti, 90, 'DOM confetti fallback');
      assert.equal(r.drops, 7);
      assert.equal(r.text, 1);
      assert.equal(r.scene, 1);
      assert.equal(r.particles, 0);
      assert.equal(typeof r.fps, 'number');
      assert.equal(r.raf, 0, 'no rAF loop without a canvas');
      assert.deepEqual(errors, [], `no-canvas errors: ${errors.join('; ')}`);
      await ctx.close();
    }

    // ---------------------------------------------------------------- 2. no requestAnimationFrame
    {
      const { ctx, page, errors } = await newOverlay(browser, `${base}/overlay.html?layout=portrait`, {
        viewport: { width: 540, height: 960 },
        init: () => {
          window.requestAnimationFrame = undefined;
          window.cancelAnimationFrame = undefined;
        },
      });
      const r = await page.evaluate(() => {
        const R = window.livefx.renderer;
        R.fire({ id: 'k', visual: { kind: 'confetti', intensity: 2 } });
        R.fire({ id: 'c', visual: { kind: 'card', emoji: '🙂', text: 'X', intensity: 3 } });
        R.fire({ id: 'lt', visual: { kind: 'lower-third', title: 'T', subtitle: 'S' } });
        R.clear();
        return { ok: R.particles.ok, confetti: document.querySelectorAll('.fx-confetti').length, left: document.querySelectorAll('#stage > *').length };
      });
      assert.equal(r.ok, false);
      assert.equal(r.confetti, 0, 'clear() removed the DOM confetti');
      assert.equal(r.left, 0);
      assert.deepEqual(errors, [], `no-rAF errors: ${errors.join('; ')}`);
      await ctx.close();
    }

    // ---------------------------------------------------------------- 3. main overlay: XSS sweep, audio, leaks, themes
    const { ctx, page, errors } = await newOverlay(browser, `${base}/overlay.html`);

    const xss = await page.evaluate((P) => {
      const R = window.livefx.renderer;
      const hostileColor = '#fff; background: url(javascript:1)';
      const fire = (visual, extra) => R.fire({ id: 'x', ...extra, visual });
      fire({ kind: 'card', emoji: P, text: P, bg: hostileColor, color: 'red', position: '<x>' });
      fire({ kind: 'banner', emoji: P, text: P, color: hostileColor });
      fire({ kind: 'text', text: P, emoji: P, style: '<s>', color: hostileColor, color2: 'expression(1)' });
      fire({ kind: 'lower-third', title: P, subtitle: P, emoji: P, color: hostileColor });
      fire({ kind: 'sticker', emoji: P, text: P });
      fire({ kind: 'rain', emoji: P, count: 3 });
      fire({ kind: 'image', src: 'javascript:alert(1)', text: P, emoji: P });
      fire({ kind: 'image', src: 'data:text/html,<script>window.__xss=1</script>', text: P });
      fire({ kind: 'scene', scene: 'night', text: P, emoji: P });
      fire({ kind: 'scene', scene: '<b>', text: P });
      fire({ kind: 'combo', steps: [{ delay: 0, visual: { kind: 'card', text: P, bg: hostileColor } }, { delay: 0, visual: { kind: 'text', text: P } }, { delay: 0, visual: { kind: 'combo', steps: [{ visual: { kind: 'banner', text: 'NESTED' } }] } }] });
      fire({ kind: 'confetti', emoji: P, text: P });
      fire({ kind: 'card', emoji: { toString: () => P }, text: 42 });
      const stage = document.getElementById('stage');
      const styles = Array.from(stage.querySelectorAll('[style]')).map((el) => el.getAttribute('style')).join('\n');
      const word = stage.querySelector('.fx-word');
      return {
        imgs: stage.querySelectorAll('img').length,
        imgSrcs: Array.from(stage.querySelectorAll('img')).map((i) => i.getAttribute('src')),
        bold: stage.querySelectorAll('b').length,
        onerror: stage.querySelectorAll('[onerror]').length,
        scripts: stage.querySelectorAll('script').length,
        xssFlag: window.__xss,
        styles,
        cardText: stage.querySelector('.fx-card .fx-text').textContent,
        banner: stage.querySelector('.fx-banner').textContent,
        dataText: word && word.getAttribute('data-text'),
        caption: stage.querySelector('.fx-scene-caption').textContent,
        ltTitle: stage.querySelector('.fx-lt-title').textContent,
        nested: Array.from(stage.querySelectorAll('.fx-banner')).filter((b) => /NESTED/.test(b.textContent)).length,
        sceneClasses: Array.from(stage.querySelectorAll('.fx-scene')).map((s) => s.className),
        theme: R.setTheme('<script>'),
        body: document.body.getAttribute('data-theme'),
        themed: document.body.classList.contains('fx-themed'),
        posClass: stage.querySelector('.fx-card').className,
      };
    }, PAYLOAD);
    log('xss', JSON.stringify({ imgs: xss.imgs, bold: xss.bold, onerror: xss.onerror, theme: xss.theme }));
    assert.equal(xss.imgs, 0, `no <img> from payloads or rejected src: ${xss.imgSrcs}`);
    assert.equal(xss.bold, 0, 'no injected <b>');
    assert.equal(xss.onerror, 0);
    assert.equal(xss.scripts, 0);
    assert.equal(xss.xssFlag, undefined);
    assert.ok(!/javascript|expression|url\(/i.test(xss.styles), `hostile colours rejected: ${xss.styles}`);
    assert.equal(xss.cardText, PAYLOAD, 'card text literal');
    assert.ok(xss.banner.includes(PAYLOAD), 'banner text literal');
    assert.equal(xss.dataText, PAYLOAD.slice(0, 40), 'data-text literal (<= 40 graphemes)');
    assert.equal(xss.caption, PAYLOAD);
    assert.equal(xss.ltTitle, PAYLOAD);
    assert.equal(xss.nested, 0, 'nested combo never fires');
    assert.ok(xss.sceneClasses.every((c) => /^fx-scene fx-scene-night/.test(c)), `scene classes: ${xss.sceneClasses}`);
    assert.equal(xss.theme, 'neon');
    assert.equal(xss.body, null);
    assert.equal(xss.themed, false, 'no fx-themed class leak');
    assert.match(xss.posClass, /fx-pos-center/, 'unknown position -> center');
    await page.evaluate(() => window.livefx.renderer.clear());

    // text styles: gradient must clip on the (composited) letters themselves – on .fx-word Chromium paints
    // nothing; glitch copies are DOM clones of the letters so they wrap exactly like the word.
    const styles = await page.evaluate(() => {
      const R = window.livefx.renderer;
      R.fire({ id: 'g', visual: { kind: 'text', text: 'Gradient Wort', style: 'gradient', color: '#ff4d6d', color2: '#4dd2ff' } });
      R.fire({ id: 'gl', visual: { kind: 'text', text: 'Glitch Wort <b>', style: 'glitch' } });
      const [grad, glitch] = document.querySelectorAll('.fx-bigtext');
      const letter = grad.querySelector('.fx-letter');
      const lcs = getComputedStyle(letter);
      const wcs = getComputedStyle(grad.querySelector('.fx-word'));
      const layers = glitch.querySelectorAll('.fx-glitch-layer');
      const realLetters = Array.from(glitch.querySelector('.fx-word').children).filter((c) => !c.classList.contains('fx-glitch-layer'));
      const count = (root) => root.querySelectorAll('.fx-letter').length;
      return {
        letterClip: lcs.webkitBackgroundClip || lcs.backgroundClip,
        letterGradient: /gradient/.test(lcs.backgroundImage),
        letterAnims: lcs.animationName,
        wordFill: wcs.webkitTextFillColor,
        layers: layers.length,
        layerLetters: Array.from(layers).map(count),
        wordLetters: realLetters.reduce((n, c) => n + (c.classList.contains('fx-letter') ? 1 : count(c)), 0),
        layerText: layers[0] && layers[0].textContent.replace(/\u00a0/g, ' '),
        aligned: layers.length === 2 && Math.abs(layers[0].getBoundingClientRect().height - glitch.querySelector('.fx-word').getBoundingClientRect().height) < 2,
        bold: glitch.querySelectorAll('b').length,
      };
    });
    log('text styles', JSON.stringify(styles));
    assert.equal(styles.letterClip, 'text', 'gradient clips on the letters');
    assert.equal(styles.letterGradient, true);
    assert.match(styles.letterAnims, /fx-letter-in/);
    assert.match(styles.letterAnims, /fx-gradient-move/);
    assert.equal(styles.wordFill, 'rgba(0, 0, 0, 0)', 'word text fill transparent (gradient shows through the letters)');
    assert.equal(styles.layers, 2, 'two glitch layers');
    assert.deepEqual(styles.layerLetters, [styles.wordLetters, styles.wordLetters], 'glitch layers mirror every letter');
    assert.equal(styles.layerText, 'Glitch Wort <b>');
    assert.equal(styles.aligned, true, 'glitch layers wrap like the word');
    assert.equal(styles.bold, 0);
    await page.evaluate(() => window.livefx.renderer.clear());

    // mixer shares the renderer's AudioContext; unknown builtin names do not count; NaN pan / gain 0 are harmless
    const audio = await page.evaluate(() => {
      const R = window.livefx.renderer;
      const M = window.LiveFXSounds.mixer;
      const s0 = R.stats.sounds;
      R.volume = 0.7;
      R.fire({ id: 'a', sound: 'pop', visual: { kind: 'card', emoji: '🔊' } });
      const shared = M.ctx === R.audioCtx && !!R.audioCtx;
      const afterKnown = R.stats.sounds - s0;
      R.fire({ id: 'b', sound: 'noSuchSound', visual: { kind: 'card' } });
      const afterUnknown = R.stats.sounds - s0;
      R.playSound('pop', { gain: 0, pan: NaN, intensity: NaN });
      R.playSound('pop', { gain: NaN, pan: 2 });
      R.fire({ id: 'c', sound: 'pop', gain: NaN, visual: { kind: 'rain', count: 1 } });
      R.volume = NaN;
      const vol = R.volume;
      M.setMaster(NaN);
      return { shared, afterKnown, afterUnknown, total: R.stats.sounds - s0, vol, master: M.stats.master, voices: M.stats.voices, limiter: M.stats.limiter, contexts: 1 };
    });
    log('audio', JSON.stringify(audio));
    assert.equal(audio.shared, true, 'mixer initialised on the renderer context (one AudioContext)');
    assert.equal(audio.afterKnown, 1);
    assert.equal(audio.afterUnknown, 1, 'unknown builtin does not count as a sound');
    assert.equal(audio.total, 4);
    assert.equal(audio.vol, 0.7, 'NaN volume ignored');
    assert.equal(audio.master, 0.7, 'setMaster(NaN) keeps the level');
    assert.equal(audio.limiter, true);

    // 200 fires (20 batches of 10 over ~2 s, plain v2 look – headless software rendering cannot composite
    // hundreds of blurred/rayed cards at once): nodes + timers gone, particle loop idle, impact class cleared
    const leak = await page.evaluate(async () => {
      const R = window.livefx.renderer;
      const kinds = ['card', 'banner', 'text', 'lower-third', 'sticker', 'rain', 'card', 'image', 'confetti', 'card'];
      let peak = 0;
      let impactOnce = 0;
      for (let i = 0; i < 200; i++) {
        const kind = kinds[i % kinds.length];
        R.fire({ id: `m${i}`, visual: { kind, emoji: '🙂', text: `N${i}`, title: 'T', src: 'assets/none.png', count: 2, intensity: kind === 'confetti' ? 2 : 1, impact: i % 5 === 0, shake: i % 7 === 0, style: 'bounce' } });
        peak = Math.max(peak, document.querySelectorAll('#stage > *').length);
        impactOnce = Math.max(impactOnce, document.getElementById('stage').className.split(/\s+/).filter((c) => c === 'fx-impact').length);
        if (i % 10 === 9) await new Promise((res) => setTimeout(res, 100));
      }
      await new Promise((res) => setTimeout(res, 5200));
      return {
        peak,
        impactOnce,
        left: document.querySelectorAll('#stage > :not(.fx-canvas):not(.fx-scene)').length,
        timers: R._timers.size,
        particles: R.stats.particles,
        raf: R.particles.raf,
        fps: R.stats.fps,
        frameMs: R.stats.frameMs,
        stageClass: document.getElementById('stage').className,
        transform: getComputedStyle(document.getElementById('stage')).transform,
      };
    });
    log('leak', JSON.stringify(leak));
    assert.ok(leak.peak > 200, `nodes were created (${leak.peak})`);
    assert.ok(leak.impactOnce <= 1, 'impact class never duplicated');
    assert.equal(leak.left, 0, 'all transient nodes removed after their lifetime');
    assert.equal(leak.timers, 0);
    assert.equal(leak.particles, 0);
    assert.equal(leak.raf, 0, 'particle rAF loop stopped when idle');
    assert.ok(Number.isFinite(leak.fps) && leak.fps > 0, `fps numeric: ${leak.fps}`);
    assert.ok(!/fx-impact/.test(leak.stageClass), 'impact class cleared');
    assert.ok(leak.transform === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(leak.transform), `stage transform reset: ${leak.transform}`);

    // themes: rendered card / banner / lower-third text vs their backgrounds for every theme (nothing white-on-white)
    const themes = await page.evaluate(() => {
      const R = window.livefx.renderer;
      const out = {};
      for (const t of window.LiveFXRenderer.THEMES) {
        R.clear();
        R.setTheme(t);
        R.fire({ id: 'c', visual: { kind: 'card', emoji: '🙂', text: 'CARD' } });
        R.fire({ id: 'b', visual: { kind: 'banner', emoji: '🙂', text: 'BANNER' } });
        R.fire({ id: 'l', visual: { kind: 'lower-third', title: 'LT', subtitle: 'sub' } });
        R.fire({ id: 's', visual: { kind: 'scene', scene: 'snow', text: 'caption' } });
        const vars = getComputedStyle(document.body);
        const pick = (el) => {
          const cs = getComputedStyle(el);
          return { color: cs.color, bg: cs.backgroundColor, gradient: /gradient/.test(cs.backgroundImage) };
        };
        out[t] = {
          card: pick(document.querySelector('.fx-card')),
          banner: pick(document.querySelector('.fx-banner')),
          lt: pick(document.querySelector('.fx-lt-bar')),
          caption: pick(document.querySelector('.fx-scene-caption')),
          accent: vars.getPropertyValue('--fx-accent').trim(),
          accent2: vars.getPropertyValue('--fx-accent-2').trim(),
        };
        R.clearScene();
      }
      R.clear();
      R.setTheme('neon');
      return out;
    });
    for (const [t, v] of Object.entries(themes)) {
      const bannerBgs = v.banner.gradient ? [v.accent, v.accent2] : [v.banner.bg];
      const c = {
        card: contrast(v.card.color, v.card.bg),
        banner: Math.min(...bannerBgs.map((bg) => contrast(v.banner.color, bg))),
        lt: contrast(v.lt.color, v.lt.bg),
        caption: contrast(v.caption.color, v.caption.bg),
      };
      log(`theme ${t}: card ${c.card.toFixed(1)}:1, banner ${c.banner.toFixed(1)}:1, lower-third ${c.lt.toFixed(1)}:1, caption ${c.caption.toFixed(1)}:1`);
      for (const [k, ratio] of Object.entries(c)) assert.ok(Number.isFinite(ratio) && ratio >= 3, `${t}/${k}: contrast ${ratio} (${JSON.stringify(v[k])})`);
    }
    assert.deepEqual(errors, [], `overlay errors: ${errors.join('; ')}`);
    await ctx.close();

    // ---------------------------------------------------------------- 4. portrait + pastel screenshot
    {
      const { ctx: pctx, page: portrait, errors: perr } = await newOverlay(browser, `${base}/overlay.html?layout=portrait&theme=pastel`, { viewport: { width: 540, height: 960 } });
      // A mid-grey "video" behind the transparent overlay so light/white elements are judged against a real backdrop.
      await portrait.addStyleTag({ content: 'html { background: linear-gradient(180deg, #8a8f99, #dfe3ea) !important; }' });
      const shot = await portrait.evaluate(async () => {
        const R = window.livefx.renderer;
        R.fire({ id: 's', visual: { kind: 'scene', scene: 'snow', text: 'Es schneit', intensity: 1 } });
        R.fire({ id: 'lt', visual: { kind: 'lower-third', title: 'Max Mustermann', subtitle: 'Gast', emoji: '🎤', glow: true } });
        R.fire({ id: 'c', visual: { kind: 'card', emoji: '🤯', text: 'KRASS', position: 'safe', intensity: 2, glow: true } });
        R.fire({ id: 't', visual: { kind: 'text', text: 'WOW', style: 'gradient', position: 'top' } });
        await new Promise((res) => setTimeout(res, 800));
        const card = document.querySelector('.fx-card');
        const banner = document.querySelector('.fx-banner');
        const cap = document.querySelector('.fx-scene-caption');
        const cs = (el) => getComputedStyle(el);
        return {
          theme: document.body.dataset.theme,
          lt: document.querySelectorAll('.fx-lower-third').length,
          banner: banner && banner.textContent.trim(),
          card: { color: cs(card).color, bg: cs(card).backgroundColor, bottom: card.getBoundingClientRect().bottom / innerHeight },
          caption: { color: cs(cap).color, bg: cs(cap).backgroundColor, top: cap.getBoundingClientRect().top / innerHeight },
          bannerColor: banner && cs(banner).color,
          bannerBgImage: banner && cs(banner).backgroundImage,
        };
      });
      await portrait.screenshot({ path: path.join(shotDir, 'review-portrait-pastel.png') });
      log('portrait pastel', JSON.stringify(shot));
      assert.equal(shot.theme, 'pastel');
      assert.equal(shot.lt, 0, 'lower-third -> banner in portrait');
      assert.match(shot.banner, /^🎤 Max Mustermann · Gast 🎤$/, 'banner carries emoji + "title · subtitle"');
      assert.ok(contrast(shot.card.color, shot.card.bg) >= 3, `pastel card text vs bg: ${shot.card.color} / ${shot.card.bg}`);
      assert.ok(contrast(shot.caption.color, shot.caption.bg) >= 3, `pastel caption: ${shot.caption.color} / ${shot.caption.bg}`);
      assert.ok(shot.card.bottom <= 0.65, `safe card stays above the chat zone (${shot.card.bottom})`);
      assert.ok(shot.caption.top < 0.35, `portrait caption sits in the upper third (${shot.caption.top})`);
      assert.match(shot.bannerBgImage, /gradient/, 'banner keeps its gradient');
      assert.deepEqual(perr, [], `portrait errors: ${perr.join('; ')}`);
      await pctx.close();
    }

    // ---------------------------------------------------------------- 5. panel
    const tctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const panel = await tctx.newPage();
    const perrors = [];
    panel.on('pageerror', (e) => perrors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await panel.evaluate(() => window.livefx.ready);

    // chat feed escapes everything; odd field types do not throw
    const feed = await panel.evaluate((P) => {
      const bus = window.livefx.bus;
      bus._emit({ id: 'rv-c1', type: 'chat', platform: '<i>tw</i>', user: P, text: `<script>window.__xss=1</script> hi ${P}`, blocked: true });
      bus._emit({ id: 'rv-c2', type: 'chat', platform: 'twitch', user: 'u', text: 't', fired: `"><img src=x onerror=window.__xss=1>` });
      bus._emit({ id: 'rv-g1', type: 'gift', platform: 'tiktok', user: null, amount: 'x', currency: P, gift: { a: 1 }, text: P, tier: null });
      bus._emit({ id: 'rv-g2', type: 'gift', platform: 'youtube', user: 'Fan', amount: 5, fired: 'win', trigger: 'win', tier: 1 });
      const el = document.querySelector('#chat-feed');
      return {
        lines: el.querySelectorAll('.chat-line').length,
        imgs: el.querySelectorAll('img, script, i, b').length,
        onerror: el.querySelectorAll('[onerror]').length,
        flag: window.__xss,
        firstUser: el.querySelector('.chat-line .user').textContent,
        fired: el.querySelector('.chat-line[data-fired]') && el.querySelector('.chat-line[data-fired]').getAttribute('data-fired'),
        feed: window.livefx.chat.feed.length,
      };
    }, PAYLOAD);
    log('feed', JSON.stringify({ lines: feed.lines, imgs: feed.imgs, fired: feed.fired }));
    assert.equal(feed.lines, 4);
    assert.equal(feed.imgs, 0, 'chat user/text/platform/fired never become markup');
    assert.equal(feed.onerror, 0);
    assert.equal(feed.flag, undefined);
    assert.equal(feed.firstUser, PAYLOAD);
    assert.equal(feed.fired, '"><img src=x onerror=window.__xss=1>', 'data-fired is attribute-escaped');
    assert.equal(feed.feed, 4);

    // combos: 0 / NaN / strings are clamped, junk dropped, default rule when nothing stored
    const combos = await panel.evaluate(() => {
      const C = window.livefx.combos;
      C.set([{ keywordTriggerId: 'wow', times: 0, withinMs: NaN, fireTriggerId: 'win' }, 'junk', null, { times: '3', withinMs: '99999999' }, { keywordTriggerId: 'wow', times: 50, withinMs: 1e12, fireTriggerId: 'wow' }]);
      const rules = C.rules;
      const rows = document.querySelectorAll('#combo-rows tr').length;
      // rules that fire their own keyword trigger must not loop (combo fires are never counted again)
      for (let i = 0; i < 25; i++) C.record({ id: 'wow', label: 'W' }, 'Test');
      return { rules, rows, stored: localStorage.getItem('livefx.combos') };
    });
    log('combos', JSON.stringify(combos.rules));
    assert.equal(combos.rules.length, 3);
    assert.deepEqual(combos.rules[0], { keywordTriggerId: 'wow', times: 2, withinMs: 500, fireTriggerId: 'win' });
    assert.deepEqual(combos.rules[1], { keywordTriggerId: '', times: 3, withinMs: 600000, fireTriggerId: '' });
    assert.deepEqual(combos.rules[2], { keywordTriggerId: 'wow', times: 20, withinMs: 600000, fireTriggerId: 'wow' });
    assert.equal(combos.rows, 3);
    assert.equal(JSON.parse(combos.stored).length, 3);

    // effectiveLang() without any detection, malformed lang events, theme getter/setter
    const lang = await panel.evaluate(() => {
      const L = window.livefx;
      document.querySelector('#lang').value = 'auto';
      document.querySelector('#lang').dispatchEvent(new Event('change'));
      const a = L.effectiveLang();
      L.asrEvent({ type: 'lang' });
      L.asrEvent({ type: 'lang', lang: 7, family: null });
      L.asrEvent(null);
      L.asrEvent('x');
      const b = L.effectiveLang();
      const detected = L.detectedLang;
      L.asrEvent({ type: 'lang', lang: 'en-GB' });
      const c = L.effectiveLang();
      const themeBefore = L.theme.get();
      const set = L.theme.set('bogus');
      const themeAfter = L.theme.get();
      L.theme.set('minimal');
      return { a, b, c, detected, themeBefore, set, themeAfter, final: L.theme.get(), stored: localStorage.getItem('livefx.theme'), pill: document.querySelector('#pill-lang-value').textContent };
    });
    log('lang', JSON.stringify(lang));
    assert.equal(lang.a, 'de-DE');
    assert.equal(lang.b, 'de-DE', 'malformed lang events are ignored');
    assert.equal(lang.detected, null);
    assert.equal(lang.c, 'en-GB');
    assert.equal(lang.pill, 'Auto · EN');
    assert.equal(lang.set, 'neon', 'unknown theme -> neon');
    assert.equal(lang.themeAfter, 'neon');
    assert.equal(lang.final, 'minimal');
    assert.equal(lang.stored, 'minimal');

    // explicit preview sound ON is not fought by the mute enforcement
    await panel.evaluate(() => window.livefx.previewSound.set(true));
    await panel.waitForFunction(() => {
      const f = document.querySelector('#preview');
      return f && /volume=0\.[1-9]/.test(f.getAttribute('src')) && f.contentWindow && f.contentWindow.livefx && f.contentWindow.livefx.bus.serverOk;
    }, null, { timeout: 6000 });
    await sleep(1600);
    const pv = await panel.evaluate(() => ({ on: window.livefx.previewSound.get(), vol: document.querySelector('#preview').contentWindow.livefx.renderer.volume, slider: Number(document.querySelector('#volume').value) }));
    log('preview', JSON.stringify(pv));
    assert.equal(pv.on, true);
    assert.ok(pv.vol > 0 && Math.abs(pv.vol - pv.slider) < 0.01, `preview keeps the slider volume while ON (${pv.vol} vs ${pv.slider})`);
    await panel.evaluate(() => window.livefx.previewSound.set(false));
    await sleep(1300);
    assert.equal(await panel.evaluate(() => document.querySelector('#preview').contentWindow.livefx.renderer.volume), 0, 'muted again when OFF');

    // command table: empty + duplicate commands do not break saving (server validates, panel never throws)
    await panel.click('#btn-chat-cmd-add');
    await panel.click('#btn-chat-cmd-add');
    await panel.click('#btn-chat-cmd-add');
    await panel.fill('#chat-commands tr:nth-child(1) [data-f="cmd"]', '');
    await panel.selectOption('#chat-commands tr:nth-child(1) [data-f="trigger"]', 'lol');
    await panel.fill('#chat-commands tr:nth-child(2) [data-f="cmd"]', '!Dup');
    await panel.selectOption('#chat-commands tr:nth-child(2) [data-f="trigger"]', 'lol');
    await panel.fill('#chat-commands tr:nth-child(3) [data-f="cmd"]', '!dup');
    await panel.selectOption('#chat-commands tr:nth-child(3) [data-f="trigger"]', 'wow');
    const saved = await panel.evaluate(() => window.livefx.chat.save());
    assert.ok(saved && saved.ok, 'save succeeded');
    log('commands saved', JSON.stringify(saved.settings.commands));
    assert.equal(Object.keys(saved.settings.commands).length, 1, 'empty command dropped, duplicates merged server-side');
    assert.ok(saved.settings.commands['!dup'], 'lower-cased key kept');

    // editor: invalid combo JSON -> message, text kind without text -> card
    const editor = await panel.evaluate(async () => {
      const E = window.LiveFXEditor;
      const p = E.open({ id: 'rv-edit', label: 'Edit', keywords: [], visual: { kind: 'combo', steps: [{ delay: 0, visual: { kind: 'card' } }] } }, { assets: [], sounds: window.LiveFXSounds.names });
      const d = document.querySelector('dialog.fx-editor');
      const steps = d.querySelector('[name="steps"]');
      steps.value = '[{ "delay": 0, visual: nope }';
      steps.dispatchEvent(new Event('input'));
      const errBox = d.querySelector('.fx-steps-error');
      const msg1 = errBox.textContent;
      const hidden1 = errBox.hidden;
      d.querySelector('[data-act="save"]').click();
      const stillOpen = d.open && E.isOpen();
      const warn = d.querySelector('.fx-editor-warnings').textContent;
      // now a nested combo and >6 steps
      steps.value = JSON.stringify([{ delay: 0, visual: { kind: 'combo', steps: [] } }]);
      steps.dispatchEvent(new Event('input'));
      const msg2 = errBox.textContent;
      steps.value = JSON.stringify(Array.from({ length: 7 }, () => ({ delay: 0, visual: { kind: 'card' } })));
      steps.dispatchEvent(new Event('input'));
      const msg3 = errBox.textContent;
      // switch to text kind with empty text and save -> card
      d.querySelector('[name="kind"]').value = 'text';
      d.querySelector('[name="kind"]').dispatchEvent(new Event('change'));
      d.querySelector('[name="text"]').value = '   ';
      d.querySelector('[data-act="save"]').click();
      const result = await p;
      return { msg1, hidden1, stillOpen, warn, msg2, msg3, result };
    });
    log('editor', JSON.stringify({ msg1: editor.msg1, msg2: editor.msg2, msg3: editor.msg3, kind: editor.result && editor.result.visual.kind }));
    assert.match(editor.msg1, /Ungültiges JSON/);
    assert.equal(editor.hidden1, false);
    assert.equal(editor.stillOpen, true, 'save refused while the JSON is invalid');
    assert.match(editor.warn, /Combo-Schritte/);
    assert.match(editor.msg2, /keine Combo/);
    assert.match(editor.msg3, /Maximal 6/);
    assert.ok(editor.result, 'saved');
    assert.equal(editor.result.visual.kind, 'card', 'text without text saves as card');
    assert.equal(editor.result.visual.text, undefined);
    assert.equal(editor.result.visual.steps, undefined, 'combo steps dropped on the new kind');
    // the saved trigger must not linger in the list (the editor was opened directly, not via the panel)
    assert.deepEqual(perrors, [], `panel errors: ${perrors.join('; ')}`);
    await tctx.close();

    // ---------------------------------------------------------------- 6. panel boots with localStorage denied (private mode)
    {
      const pctx = await browser.newContext();
      const p2 = await pctx.newPage();
      const e2 = [];
      p2.on('pageerror', (e) => e2.push(`panel-ls: ${e.message}`));
      await p2.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new DOMException('Access is denied for this document.', 'SecurityError');
          },
        });
      });
      await p2.goto(`${base}/`);
      await p2.waitForSelector('#pad button', { timeout: 8000 });
      await p2.evaluate(() => window.livefx.ready);
      const st = await p2.evaluate(() => {
        const L = window.livefx;
        L.theme.set('pastel');
        L.previewSound.set(true);
        L.previewSound.set(false);
        L.audioCheck.set('mic-source', true);
        L.combos.set([{ keywordTriggerId: 'wow', times: 3, withinMs: 10000, fireTriggerId: 'win' }]);
        L.intensityFromVoice = true;
        L.setStoryMode(true);
        L.setStoryMode(false);
        return { triggers: L.triggers.length, theme: L.theme.get(), combos: L.combos.rules.length, lang: L.asrSettings.lang, story: L.storyMode };
      });
      log('localStorage denied', JSON.stringify(st));
      assert.ok(st.triggers > 0, 'triggers loaded from the server');
      assert.equal(st.theme, 'pastel');
      assert.equal(st.combos, 1);
      assert.equal(st.lang, 'auto');
      assert.deepEqual(e2, [], `panel without localStorage: ${e2.join('; ')}`);
      await pctx.close();
    }

    // ---------------------------------------------------------------- 7. mobile tiles for the v3 kinds
    {
      const put = await api(base, 'PUT', '/api/triggers', {
        token,
        json: {
          triggers: [
            { id: 'rv-text', label: 'Text', keywords: ['textwort'], visual: { kind: 'text', text: 'WOW', style: 'glitch' } },
            { id: 'rv-lt', label: 'Bauchbinde', keywords: [], visual: { kind: 'lower-third', title: 'Max', emoji: '🎤' } },
            { id: 'rv-combo', label: 'Combo', keywords: [], visual: { kind: 'combo', steps: [{ delay: 0, visual: { kind: 'text', text: 'GO' } }, { delay: 300, visual: { kind: 'confetti' } }] } },
            { id: 'rv-img', label: 'Bild', keywords: [], visual: { kind: 'image', src: 'https://example.com/a.png' } },
          ],
          removed: [],
        },
      });
      assert.equal(put.status, 200, put.text);
      const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const phone = await mctx.newPage();
      const merr = [];
      phone.on('pageerror', (e) => merr.push(`mobile: ${e.message}`));
      await phone.goto(`${base}/mobile.html`);
      await phone.waitForSelector('#pad button');
      await phone.evaluate(() => window.livefx.ready);
      await phone.waitForFunction(() => window.livefx.bus.serverOk, null, { timeout: 5000 });
      const tiles = await phone.evaluate(() => {
        const q = (id) => document.querySelector(`#pad button[data-id="${id}"]`);
        return {
          text: q('rv-text') && q('rv-text').querySelector('.emoji').textContent,
          lt: q('rv-lt') && q('rv-lt').querySelector('.emoji').textContent,
          combo: q('rv-combo') && q('rv-combo').querySelector('.lbl').textContent,
          img: q('rv-img') && q('rv-img').querySelector('img.thumb') && q('rv-img').querySelector('img.thumb').getAttribute('src'),
          all: document.querySelectorAll('#pad button').length,
        };
      });
      log('mobile tiles', JSON.stringify(tiles));
      assert.equal(tiles.text, '✨', 'text tile falls back to the default emoji');
      assert.equal(tiles.lt, '🎤');
      assert.equal(tiles.combo, 'Combo');
      assert.equal(tiles.img, 'https://example.com/a.png');
      assert.ok(tiles.all >= 4);
      await phone.tap('#pad button[data-id="rv-combo"]');
      await phone.waitForFunction(() => /Combo/.test(document.querySelector('#transcript').textContent), null, { timeout: 3000 });
      assert.deepEqual(merr, [], `mobile errors: ${merr.join('; ')}`);
      await mctx.close();
    }
  } finally {
    await server.stop();
  }
}

module.exports = { run };
