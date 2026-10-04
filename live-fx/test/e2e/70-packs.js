// Meme packs: the panel loads the Turkish pack (table grows, server gets the tr- ids), a Turkish
// sentence fires a pack card in the overlay, and "Entfernen" removes the pack again.
// 2.1: the "🎞️ Reaktionen (animiert)" pack loads through the same pack UI, a fired reaction shows the
// bundled animated WebP (memes/fluent/…) in the overlay, and six stickers are screenshotted together.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  try {
    const overlay = await ctx.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await panel.evaluate(() => window.livefx.ready);

    const rows = () => panel.locator('#trigger-rows tr').count();
    const packSize = await panel.evaluate(() => window.LiveFXPacks.get('tr').length);
    const packRow = panel.locator('.pack[data-pack="tr"]');
    assert.equal(await panel.locator('.pack:not(.story)').count(), 9, 'nine meme/theme/text/reaction pack rows (story packs are listed separately)');
    assert.ok((await packRow.textContent()).includes('Türkçe'), 'Turkish pack row present');
    const before = await rows();

    // (a) Laden -> table grows by the pack size, server has the tr- ids
    await packRow.locator('[data-act="load"]').click();
    assert.equal(await rows(), before + packSize, 'table grew by the pack size');
    assert.equal(await panel.locator('#pad button').count(), before + packSize, 'pad grew too');
    assert.match(await packRow.textContent(), /geladen/);
    assert.ok(await packRow.locator('[data-act="load"]').isDisabled(), 'Laden disabled once loaded');
    assert.match(await panel.textContent('#log'), /Türkçe: \d+ Trigger geladen/);
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && r.json.triggers.filter((t) => t.id.startsWith('tr-')).length === packSize;
      },
      { timeoutMs: 3000, what: 'tr- triggers on the server' }
    );
    log(`loaded tr pack: ${packSize} triggers`);

    // clicking Laden again must not duplicate anything
    await panel.evaluate(() => document.querySelector('.pack[data-pack="tr"] [data-act="load"]').removeAttribute('disabled'));
    await packRow.locator('[data-act="load"]').click();
    assert.equal(await rows(), before + packSize, 'no duplicates on a second load');

    // (b) a Turkish sentence fires the pack card in the overlay
    await panel.evaluate(() => window.livefx.handleText('yok artık bu ne ya', true, { source: 'Test' }));
    await overlay.waitForFunction(() => Array.from(document.querySelectorAll('.fx-card .fx-text')).some((el) => el.textContent.includes('YOK ARTIK')), null, { timeout: 3000 });
    assert.ok((await panel.textContent('#transcript mark')).includes('yok artık'), 'keyword highlighted');
    await overlay.screenshot({ path: path.join(shotDir, 'packs-overlay.png') });
    await panel.screenshot({ path: path.join(shotDir, 'packs.png'), fullPage: true });
    log('yok artık fired the pack card');

    // (c) Entfernen -> tr- ids gone locally and on the server
    await packRow.locator('[data-act="unload"]').click();
    assert.equal(await rows(), before, 'table back to the previous size');
    assert.equal(await panel.evaluate(() => window.livefx.triggers.filter((t) => t.id.startsWith('tr-')).length), 0);
    assert.ok(await packRow.locator('[data-act="unload"]').isDisabled(), 'Entfernen disabled when nothing is loaded');
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && !r.json.triggers.some((t) => t.id.startsWith('tr-'));
      },
      { timeoutMs: 3000, what: 'tr- triggers removed on the server' }
    );
    log('tr pack removed');

    // (d) 2.1 reactions pack: load via the pack UI, fire one, the overlay shows the bundled WebP sticker
    const rxRow = panel.locator('.pack[data-pack="reactions"]');
    assert.ok((await rxRow.textContent()).includes('Reaktionen (animiert)'), 'reactions pack row present');
    const rxSize = await panel.evaluate(() => window.LiveFXPacks.get('reactions').length);
    await rxRow.locator('[data-act="load"]').click();
    assert.equal(await rows(), before + rxSize, 'table grew by the reactions pack size');
    assert.match(await rxRow.textContent(), /geladen/);
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && r.json.triggers.filter((t) => t.id.startsWith('reactions-')).length === rxSize;
      },
      { timeoutMs: 3000, what: 'reactions- triggers on the server' }
    );
    await panel.evaluate(() => {
      const t = window.livefx.triggers.find((x) => x.id === 'reactions-heartyes');
      window.livefx.fire(t, 'Test');
    });
    const loaded = await overlay.waitForFunction(
      () => {
        const img = Array.from(document.querySelectorAll('.fx-card-image img')).find((i) => /memes\/fluent\/heart-eyes\.webp$/.test(i.getAttribute('src') || ''));
        return img && img.complete && img.naturalWidth > 0 ? { src: img.src, w: img.naturalWidth, h: img.naturalHeight } : null;
      },
      null,
      { timeout: 4000 }
    );
    const info = await loaded.jsonValue();
    assert.match(info.src, /\.webp$/);
    assert.ok(info.w >= 120 && info.w <= 160, `sticker natural width ${info.w}`);
    log(`reaction sticker loaded: ${info.src.replace(base, '')} (${info.w}x${info.h})`);

    // six stickers at once (spread over the overlay) for a visual check
    const six = ['joy', 'heart-eyes', 'fire', 'party-face', 'thumbs-up', 'popcorn'];
    await overlay.waitForTimeout(3000); // let the first sticker finish
    await overlay.evaluate((ids) => {
      const r = window.livefx.renderer || null;
      ids.forEach((id, i) => {
        const pos = ['top', 'center', 'safe'][i % 3];
        if (r && typeof r.image === 'function') r.image({ kind: 'image', src: `memes/fluent/${id}.webp`, position: pos, emoji: '🙂' });
      });
      document.querySelectorAll('.fx-card-image').forEach((el, i) => {
        el.style.animation = 'none';
        el.style.opacity = '1';
        el.style.left = `${10 + (i % 3) * 32}%`;
        el.style.top = `${18 + Math.floor(i / 3) * 42}%`;
        el.style.transform = 'none';
      });
    }, six);
    await overlay.waitForFunction((n) => {
      const imgs = Array.from(document.querySelectorAll('.fx-card-image img'));
      return imgs.length >= n && imgs.every((i) => i.complete && i.naturalWidth > 0);
    }, six.length, { timeout: 4000 });
    await overlay.screenshot({ path: path.join(shotDir, 'reactions-overlay.png') });
    log('six reaction stickers rendered (shots/reactions-overlay.png)');

    await rxRow.locator('[data-act="unload"]').click();
    assert.equal(await rows(), before, 'reactions pack removed again');

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
