// Meme packs: the panel loads the Turkish pack (table grows, server gets the tr- ids), a Turkish
// sentence fires a pack card in the overlay, and "Entfernen" removes the pack again.
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
    assert.equal(await panel.locator('.pack').count(), 3, 'three pack rows');
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

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
