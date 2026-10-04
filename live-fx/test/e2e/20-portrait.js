// Portrait layout (?layout=portrait): safe-zone cards, shortened rain, plus overlay `state` volume handling.
'use strict';

const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  try {
    // ---------- portrait ----------
    const ctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
    const page = await ctx.newPage();
    await page.goto(`${server.base}/overlay.html?layout=portrait`);
    await page.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    const hasClass = await page.evaluate(() => document.body.classList.contains('layout-portrait'));
    if (!hasClass) throw new Error('body.layout-portrait missing');

    const fall = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--fx-fall').trim());
    if (fall !== '62vh') throw new Error(`--fx-fall in portrait is "${fall}", expected "62vh"`);

    // Safe-positioned card: the renderer may not add fx-pos-* yet (other package), so add it here.
    await page.evaluate(() => {
      window.livefx.renderer.fire({ visual: { kind: 'card', emoji: '🙂', text: 'SAFE', position: 'safe' } });
      const card = document.querySelector('.fx-card');
      if (!card.classList.contains('fx-pos-safe')) card.classList.add('fx-pos-safe');
    });
    await sleep(700); // pop-in settles at ~20 % of 2.6 s
    const card = await page.evaluate(() => {
      const el = document.querySelector('.fx-card');
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height, fxTop: cs.getPropertyValue('--fx-top').trim(), cssTop: cs.top, innerHeight: window.innerHeight };
    });
    log('safe card', JSON.stringify(card));
    if (card.fxTop !== '32%') throw new Error(`--fx-top on safe card is "${card.fxTop}", expected "32%"`);
    if (Math.abs(parseFloat(card.cssTop) - 0.32 * card.innerHeight) > 1) throw new Error(`computed top ${card.cssTop} is not 32% of ${card.innerHeight}`);
    if (card.bottom > 0.65 * card.innerHeight) throw new Error(`safe card bottom ${card.bottom} exceeds 65% of ${card.innerHeight}`);
    if (card.height < 40) throw new Error('card did not render at full size');
    const centre = (card.top + card.bottom) / 2;
    if (Math.abs(centre - 0.32 * card.innerHeight) > 4) throw new Error(`safe card centre ${centre} not at 32% (${0.32 * card.innerHeight})`);

    // Top position anchors the card's upper edge at 18 %.
    const topCard = await page.evaluate(async () => {
      window.livefx.renderer.fire({ visual: { kind: 'card', emoji: '⬆️', text: 'TOP', position: 'top' } });
      const els = document.querySelectorAll('.fx-card');
      const el = els[els.length - 1];
      el.classList.add('fx-pos-top');
      await new Promise((r) => setTimeout(r, 700));
      const r = el.getBoundingClientRect();
      return { top: r.top, innerHeight: window.innerHeight };
    });
    if (Math.abs(topCard.top - 0.18 * topCard.innerHeight) > 4) throw new Error(`top card edge ${topCard.top} not at 18% (${0.18 * topCard.innerHeight})`);

    // Portrait image cards are capped at 80vw x 40vh.
    const img = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'fx-card fx-card-image';
      el.innerHTML = '<img alt="">';
      document.getElementById('stage').appendChild(el);
      const cs = getComputedStyle(el.querySelector('img'));
      const out = { maxWidth: cs.maxWidth, maxHeight: cs.maxHeight };
      el.remove();
      return out;
    });
    if (Math.abs(parseFloat(img.maxWidth) - 0.8 * 540) > 1 || Math.abs(parseFloat(img.maxHeight) - 0.4 * 960) > 1) {
      throw new Error(`portrait image limits ${JSON.stringify(img)}, expected 432px x 384px`);
    }

    // Rain (canvas path): one marker with the count, 2 × count canvas drops that start above the viewport inside
    // the portrait band, and the canvas falls the same 62vh (--fx-fall) the DOM fallback uses.
    const rain = await page.evaluate(() => {
      window.livefx.renderer.fire({ visual: { kind: 'rain', emoji: '🍕', count: 12 } });
      const P = window.livefx.renderer.particles;
      const drops = P.items.filter((p) => p.text === '🍕');
      const mark = document.querySelector('.fx-rain');
      return {
        mark: mark ? Number(mark.dataset.count) : -1,
        dom: document.querySelectorAll('.fx-drop').length,
        n: drops.length,
        xs: drops.map((p) => p.x),
        ys: drops.map((p) => p.y),
        fallPx: P.fallPx(),
        fallVar: getComputedStyle(document.body).getPropertyValue('--fx-fall').trim(),
        innerHeight: window.innerHeight,
      };
    });
    if (rain.mark !== 12) throw new Error(`rain marker count ${rain.mark}`);
    if (rain.dom !== 0) throw new Error(`${rain.dom} DOM drops although the canvas is available`);
    if (rain.n !== 24) throw new Error(`expected 24 canvas drops, got ${rain.n}`);
    if (!rain.xs.every((x) => x >= 0 && x <= 540)) throw new Error(`canvas drop outside the viewport: ${rain.xs.join(',')}`);
    if (!rain.ys.every((y) => y < 0)) throw new Error(`canvas drop not above the viewport at spawn: ${rain.ys.join(',')}`);
    if (rain.fallVar !== '62vh') throw new Error(`--fx-fall is "${rain.fallVar}"`);
    if (Math.abs(rain.fallPx - 0.62 * rain.innerHeight) > 1) throw new Error(`canvas fall ${rain.fallPx}px, expected 62vh`);
    await page.waitForTimeout(400); // let the burst fall into frame for the screenshot
    await page.screenshot({ path: path.join(shotDir, 'portrait.png') });

    // Deterministic fall distance: a drop with a near-instant animation ends 62vh (595.2px) lower,
    // and the --x variable positions it horizontally when no inline `left` is set.
    const settled = await page.evaluate(async () => {
      const mk = (cls) => {
        const el = document.createElement('div');
        el.className = cls;
        el.style.setProperty('--x', '0.5');
        el.style.animationDuration = '0.01s';
        el.style.animationDelay = '0s';
        document.getElementById('stage').appendChild(el);
        return el;
      };
      const drop = mk('fx-drop');
      const conf = mk('fx-confetti');
      await new Promise((r) => setTimeout(r, 200));
      const ty = (el) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return m.m42;
      };
      const out = { dropY: ty(drop), confY: ty(conf), dropLeft: parseFloat(getComputedStyle(drop).left), innerHeight: window.innerHeight, innerWidth: window.innerWidth };
      drop.remove();
      conf.remove();
      return out;
    });
    log('fall', JSON.stringify(settled));
    const expectFall = 0.62 * settled.innerHeight;
    if (Math.abs(settled.dropY - expectFall) > 1) throw new Error(`drop fell ${settled.dropY}px, expected ${expectFall}`);
    if (Math.abs(settled.confY - expectFall) > 1) throw new Error(`confetti fell ${settled.confY}px, expected ${expectFall}`);
    if (Math.abs(settled.dropLeft - 0.5 * settled.innerWidth) > 1) throw new Error(`--x=0.5 gave left ${settled.dropLeft}, expected ${0.5 * settled.innerWidth}`);
    await ctx.close();

    // ---------- landscape: state volume handling ----------
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const plain = await ctx2.newPage();
    await plain.goto(`${server.base}/overlay.html`);
    await plain.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const v1 = await plain.evaluate(() => {
      window.livefx.bus._emit({ id: 'x1', type: 'state', volume: 0.3 });
      return window.livefx.renderer.volume;
    });
    if (v1 !== 0.3) throw new Error(`state volume not applied without ?volume= (got ${v1})`);
    const v1b = await plain.evaluate(() => {
      window.livefx.bus._emit({ id: 'x2', type: 'state', volume: null });
      return window.livefx.renderer.volume;
    });
    if (v1b !== 0.3) throw new Error(`state with volume:null must not change the volume (got ${v1b})`);
    const v1c = await plain.evaluate(() => {
      window.livefx.bus._emit({ id: 'x3', type: 'volume', volume: 0.9 });
      return window.livefx.renderer.volume;
    });
    if (v1c !== 0.9) throw new Error(`explicit volume message not applied (got ${v1c})`);

    // Landscape: --fx-fall stays 115vh and safe == center.
    const land = await plain.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'fx-card fx-pos-safe';
      document.getElementById('stage').appendChild(el);
      const out = { fall: getComputedStyle(document.body).getPropertyValue('--fx-fall').trim(), top: getComputedStyle(el).top, portrait: document.body.classList.contains('layout-portrait') };
      el.remove();
      return out;
    });
    if (land.portrait) throw new Error('landscape page must not have layout-portrait');
    if (land.fall !== '115vh') throw new Error(`landscape --fx-fall is "${land.fall}"`);
    if (Math.abs(parseFloat(land.top) - 360) > 1) throw new Error(`landscape safe card top ${land.top}, expected 360px (50%)`);

    const pinned = await ctx2.newPage();
    await pinned.goto(`${server.base}/overlay.html?volume=0.5`);
    await pinned.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const v2 = await pinned.evaluate(() => {
      window.livefx.bus._emit({ id: 'y1', type: 'state', volume: 0.3 });
      return window.livefx.renderer.volume;
    });
    if (v2 !== 0.5) throw new Error(`state volume must be ignored with ?volume=0.5 (got ${v2})`);
    const v2b = await pinned.evaluate(() => {
      window.livefx.bus._emit({ id: 'y2', type: 'volume', volume: 0.2 });
      return window.livefx.renderer.volume;
    });
    if (v2b !== 0.2) throw new Error(`explicit volume message must still apply with ?volume= (got ${v2b})`);
    await ctx2.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
