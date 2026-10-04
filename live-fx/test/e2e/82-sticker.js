// Release 2.1 integration: free sticker library in the panel (memes/index.json, „Sticker (kostenlos)“ tab),
// free-floating Fluent stickers in the overlay (no dark card box), text style `sticker` (comic burst), image
// fallback to the emoji card when a source does not load, and the performance mode select (#perf) that the
// overlay follows live and that a late overlay receives from the server's state message.
// Screenshots: sticker-overlay.png (3 text stickers TR/DE/EN + 3 Fluent stickers), sticker-panel.png.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const L = '#asset-library';

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  const { base } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE' });
  const errors = [];
  try {
    const overlay = await ctx.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    await overlay.setViewportSize({ width: 1280, height: 720 });
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus && window.livefx.bus.serverOk, null, { timeout: 5000 });
    assert.equal(await overlay.evaluate(() => document.body.dataset.perfMode), 'auto');

    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);

    // ---- performance mode: panel select -> bus -> overlay body[data-perf-mode] ----
    const opts = await panel.evaluate(() => Array.from(document.querySelectorAll('#perf option')).map((o) => [o.value, o.textContent]));
    assert.deepEqual(opts, [['auto', 'Automatisch (empfohlen)'], ['eco', 'Eco (schwacher PC)'], ['high', 'Hoch (beste Grafik)']]);
    assert.equal(await panel.inputValue('#perf'), 'auto');
    await panel.selectOption('#perf', 'eco');
    await overlay.waitForFunction(() => document.body.dataset.perfMode === 'eco' && document.body.dataset.perf === 'eco', null, { timeout: 5000 });
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.perf')), 'eco');
    assert.equal(await panel.evaluate(() => window.livefx.perf.get()), 'eco');
    // a late overlay gets the mode from the server's state message
    const late = await ctx.newPage();
    late.on('pageerror', (e) => errors.push(`late overlay: ${e.message}`));
    await late.goto(`${base}/overlay.html`);
    await late.waitForFunction(() => document.body.dataset.perfMode === 'eco', null, { timeout: 5000 });
    // ?perf= in the URL pins the mode
    const pinned = await ctx.newPage();
    await pinned.goto(`${base}/overlay.html?perf=high`);
    await pinned.waitForFunction(() => window.livefx && window.livefx.bus && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await pinned.waitForTimeout(300);
    assert.equal(await pinned.evaluate(() => document.body.dataset.perfMode), 'high', 'URL pin wins over the state message');
    await pinned.close();
    await panel.evaluate(() => window.livefx.perf.set('high'));
    await overlay.waitForFunction(() => document.body.dataset.perfMode === 'high' && document.body.dataset.perf === 'high', null, { timeout: 5000 });
    await late.waitForFunction(() => document.body.dataset.perfMode === 'high', null, { timeout: 5000 });
    await late.close();
    // persisted across reloads
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.equal(await panel.inputValue('#perf'), 'high');
    log('perf select: eco/high reach the overlay live, late overlay gets it from state, URL pin wins');

    // ---- sticker library tab ----
    await panel.waitForSelector(`${L} .lib-tab[data-tab="stickers"]`);
    assert.equal(await panel.isVisible(`${L} .sticker-lib`), false, 'sticker tab is lazy and hidden by default');
    assert.equal(await panel.isVisible(`${L} .asset-upload`), true);
    await panel.click(`${L} .lib-tab[data-tab="stickers"]`);
    await panel.waitForFunction((l) => document.querySelectorAll(`${l} .sticker-item`).length === 143, L, { timeout: 5000 });
    const lib = await panel.evaluate((l) => ({
      credit: document.querySelector(`${l} .sticker-credit`).textContent,
      chips: document.querySelectorAll(`${l} .sticker-chip`).length,
      lazy: Array.from(document.querySelectorAll(`${l} .sticker-thumb`)).every((i) => i.getAttribute('loading') === 'lazy' && i.width === 64),
      badges: document.querySelectorAll(`${l} .sticker-badge`).length,
      uploadHidden: !document.querySelector(`${l} .asset-upload`).offsetParent,
    }), L);
    assert.equal(lib.credit, 'Fluent Emoji © Microsoft, MIT – siehe THIRD-PARTY-NOTICES.md');
    assert.ok(lib.chips > 10, `category chips ${lib.chips}`);
    assert.ok(lib.lazy, '64 px lazy thumbnails');
    const animatedCount = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'memes', 'index.json'), 'utf8')).items.filter((i) => i.animated).length;
    assert.equal(lib.badges, animatedCount, `animated badge on the ${animatedCount} animated stickers`);
    assert.ok(lib.uploadHidden, 'files pane hidden while the sticker tab is open');

    // category chip + search (TR keyword, diacritics folded)
    await panel.click(`${L} .sticker-chip[data-cat="animals"]`);
    const animals = await panel.evaluate((l) => Array.from(document.querySelectorAll(`${l} .sticker-item`)).map((e) => e.dataset.category), L);
    assert.ok(animals.length > 5 && animals.every((c) => c === 'animals'), 'chip filters by category');
    await panel.click(`${L} .sticker-chip[data-cat=""]`);
    await panel.fill(`${L} .sticker-q`, 'gül');
    await panel.waitForFunction((l) => document.querySelectorAll(`${l} .sticker-item`).length < 20, L);
    const ids = await panel.evaluate((l) => Array.from(document.querySelectorAll(`${l} .sticker-item`)).map((e) => e.dataset.id), L);
    assert.ok(ids.includes('joy'), `„gül“ finds joy: ${ids}`);
    await panel.fill(`${L} .sticker-q`, 'lach');
    await panel.waitForFunction((l) => document.querySelector(`${l} .sticker-item`) && document.querySelector(`${l} .sticker-item`).dataset.id === 'joy', L);
    await panel.waitForFunction((l) => Array.from(document.querySelectorAll(`${l} .sticker-thumb`)).every((i) => i.complete && i.naturalWidth > 0), L, { timeout: 5000 });
    await panel.evaluate((l) => document.querySelector(l).scrollIntoView(), L);
    await panel.locator(L).screenshot({ path: path.join(shotDir, 'sticker-panel.png') });

    // „Als Trigger“ -> editor with memes/ src + emoji fallback, save, fire
    const before = await panel.evaluate(() => window.livefx.triggers.length);
    await panel.click(`${L} .sticker-item[data-id="joy"] .sticker-trigger`);
    await panel.waitForSelector('dialog.fx-editor[open]', { timeout: 5000 });
    const ed = await panel.evaluate(() => {
      const f = (n) => document.querySelector(`dialog.fx-editor [name="${n}"]`).value;
      return { kind: f('kind'), src: f('src'), emoji: f('emoji'), label: f('label'), keywords: f('keywords') };
    });
    assert.equal(ed.kind, 'image');
    assert.equal(ed.src, 'memes/fluent/joy.webp');
    assert.equal(ed.emoji, '😂');
    assert.match(ed.label, /Lachtränen/);
    assert.match(ed.keywords, /lachtränen/);
    await panel.fill('dialog.fx-editor [name="keywords"]', 'stickertest');
    await panel.click('dialog.fx-editor [data-act="save"]');
    await panel.waitForFunction((n) => window.livefx.triggers.length === n + 1, before, { timeout: 5000 });
    const trig = await panel.evaluate(() => window.livefx.triggers[window.livefx.triggers.length - 1]);
    assert.equal(trig.visual.kind, 'image');
    assert.equal(trig.visual.src, 'memes/fluent/joy.webp');
    assert.equal(trig.visual.emoji, '😂');
    await panel.evaluate((id) => window.livefx.fire(window.livefx.triggers.find((t) => t.id === id), 'e2e'), trig.id);
    const shown = await overlay.waitForFunction(
      () => {
        const img = document.querySelector('.fx-sticker-img img');
        if (!img || !img.complete || !(img.naturalWidth > 0)) return null;
        const box = getComputedStyle(img.closest('.fx-card'));
        return { src: img.getAttribute('src'), w: img.naturalWidth, bg: box.backgroundColor, shadow: box.boxShadow, filter: getComputedStyle(img).filter };
      },
      null,
      { timeout: 5000 }
    );
    const info = await shown.jsonValue();
    assert.equal(info.src, 'memes/fluent/joy.webp');
    assert.ok(info.w > 0);
    assert.equal(info.bg, 'rgba(0, 0, 0, 0)', 'no dark card box');
    assert.equal(info.shadow, 'none');
    assert.match(info.filter, /drop-shadow/, 'cheap drop shadow in high mode');
    log('sticker trigger fired: free-floating', info.src, `${info.w}px`);

    // ---- image fallback: a source that does not load becomes the emoji card ----
    await overlay.evaluate(() => {
      window.livefx.renderer.clear();
      window.livefx.renderer.fire({ id: 'broken', visual: { kind: 'image', src: 'assets/does-not-exist.png', emoji: '🦄', text: 'Weg' } });
    });
    await overlay.waitForFunction(() => {
      const c = document.querySelector('.fx-card:not(.fx-card-image)');
      return c && c.querySelector('.fx-emoji').textContent === '🦄' && /Weg/.test(c.textContent) && !document.querySelector('.fx-card-image');
    }, null, { timeout: 5000 });
    log('broken image -> emoji card');

    // eco: sticker without the drop-shadow filter
    await overlay.evaluate(() => {
      window.livefx.renderer.clear();
      window.livefx.renderer.setPerf('eco');
      window.livefx.renderer.fire({ id: 'e', visual: { kind: 'image', src: 'memes/fluent/fire.webp', emoji: '🔥' } });
    });
    const ecoFilter = await overlay.waitForFunction(() => {
      const img = document.querySelector('.fx-sticker-img img');
      return img ? getComputedStyle(img).filter : null;
    });
    assert.equal(await ecoFilter.jsonValue(), 'none', 'eco: no drop-shadow filter');
    await overlay.evaluate(() => {
      window.livefx.renderer.clear();
      window.livefx.renderer.setPerf('high');
    });

    // ---- visual check: 3 text stickers (TR / DE / EN) + 3 free-floating Fluent stickers at 1920×1080 ----
    await overlay.setViewportSize({ width: 1920, height: 1080 });
    await overlay.evaluate(() => {
      const r = window.livefx.renderer;
      r.clear();
      document.body.style.background = '#3a4250';
      const P = window.LiveFXPacks;
      const pick = (lang, id) => {
        const list = P && P.get ? P.get(`text-${lang}`) : null;
        const t = list && (list.triggers || list).find ? (list.triggers || list).find((x) => x.id.endsWith(id)) : null;
        return t ? t.visual : null;
      };
      const texts = [
        pick('tr', 'yokartik') || { kind: 'text', style: 'sticker', text: 'YOK ARTIK', color: '#06d6a0', color2: '#118ab2' },
        pick('de', 'krass') || { kind: 'text', style: 'sticker', text: 'KRASS', color: '#ffd166', color2: '#ef476f' },
        { kind: 'text', style: 'sticker', text: 'SHEESH', color: '#ffffff', color2: '#ff006e' },
      ];
      texts.forEach((v) => r.text({ ...v, position: 'center' }));
      ['joy', 'heart-eyes', 'party-face'].forEach((id) => r.image({ kind: 'image', src: `memes/fluent/${id}.webp`, emoji: '🙂', position: 'center' }));
      const els = Array.from(document.querySelectorAll('.fx-bigtext, .fx-sticker-img'));
      els.forEach((el, i) => {
        el.style.animation = 'none';
        el.style.opacity = '1';
        const col = el.classList.contains('fx-bigtext') ? 0 : 1;
        const row = col ? i - 3 : i;
        el.style.left = col ? `${[66, 86, 66][row]}%` : '28%';
        el.style.top = col ? `${[24, 50, 76][row]}%` : `${20 + row * 30}%`;
        el.style.transform = 'translate(-50%, -50%)';
      });
    });
    await overlay.waitForFunction(() => Array.from(document.querySelectorAll('.fx-sticker-img img')).length === 3 && Array.from(document.querySelectorAll('.fx-sticker-img img')).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 });
    assert.equal(await overlay.evaluate(() => document.querySelectorAll('.fx-text-sticker').length), 3);
    await overlay.waitForTimeout(1000); // letter + burst pop-in finished
    const burst = await overlay.evaluate(() => {
      const w = document.querySelector('.fx-text-sticker .fx-word');
      const before = getComputedStyle(w, '::before');
      const letter = getComputedStyle(w.querySelector('.fx-letter'));
      return { clip: before.clipPath, bg: before.backgroundColor, color: letter.color, stroke: letter.webkitTextStrokeWidth };
    });
    assert.match(burst.clip, /^polygon/);
    assert.notEqual(burst.bg, 'rgba(0, 0, 0, 0)');
    assert.ok(parseFloat(burst.stroke) > 4, `outline ${burst.stroke}`);
    await overlay.screenshot({ path: path.join(shotDir, 'sticker-overlay.png') });
    log('sticker-overlay.png: 3 text stickers + 3 Fluent stickers');

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
