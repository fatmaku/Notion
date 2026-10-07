// Start wizard (2.2) in the panel: the three steps are visible, the overlay URL follows the format and the
// copy button writes the clipboard, the status dot turns green once a second overlay (OBS) connects, the test
// effect fires, a pack tile loads a pack and updates the x / LIMITS counter, advanced cards are collapsed
// behind „Erweitert“; plus the 2.2 settings: volume busses, overlay layout, primary language, live story,
// gap default 0.5 and a story mode that no longer forces the safe reaction.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const errors = [];
  try {
    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await panel.evaluate(() => window.livefx.ready);

    // (a) wizard visible on top, three steps, advanced cards collapsed by default
    assert.ok(await panel.locator('#wizard-card').isVisible(), 'wizard card visible');
    assert.equal(await panel.locator('.wizard-step').count(), 3);
    assert.ok(await panel.locator('#wiz-mic-test').isVisible());
    const advanced = panel.locator('.card[data-advanced]');
    assert.ok((await advanced.count()) >= 4, 'advanced cards marked');
    for (let i = 0; i < (await advanced.count()); i++) assert.equal(await advanced.nth(i).isVisible(), false, `advanced card ${i} hidden`);
    assert.equal(await panel.evaluate(() => window.livefx.advanced.get()), false);
    assert.match(await panel.textContent('#btn-advanced'), /anzeigen/);
    await panel.click('#btn-advanced');
    assert.ok(await advanced.first().isVisible(), 'advanced cards shown after the click');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.panel.advanced')), '1');
    await panel.click('#btn-advanced');
    assert.equal(await advanced.first().isVisible(), false);
    log('wizard + advanced toggle ok');

    // (b) overlay URL, format, size, copy
    assert.equal(await panel.inputValue('#wiz-overlay-url'), `${base}/overlay.html`);
    assert.equal((await panel.textContent('#wiz-size')).trim(), '1920 × 1080');
    await panel.selectOption('#wiz-format', 'portrait');
    assert.equal(await panel.inputValue('#wiz-overlay-url'), `${base}/overlay.html?layout=portrait`);
    assert.equal((await panel.textContent('#wiz-size')).trim(), '1080 × 1920');
    await panel.selectOption('#wiz-format', 'landscape');
    assert.equal((await panel.locator('ol.wiz-guide li').count()), 6, 'six mini-guide steps');
    await panel.click('#wiz-copy-url');
    const clip = await panel.evaluate(() => navigator.clipboard.readText());
    assert.equal(clip, `${base}/overlay.html`, 'copy wrote the overlay URL');
    assert.match(await panel.textContent('#wiz-copy-url'), /Kopiert/);
    log('copy -> clipboard ok');

    // (c) status: only the preview iframe counts -> not connected; a second overlay -> green + „verbunden ✔“
    await panel.evaluate(() => window.livefx.pollHealth());
    await sleep(200);
    assert.equal(await panel.locator('#wiz-obs-dot').evaluate((d) => d.classList.contains('on')), false, 'not connected with the preview alone');
    assert.match(await panel.textContent('#wiz-obs-state'), /noch nicht verbunden/);
    const overlay = await ctx.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await overlay.evaluate(() => {
      window.__msgs = [];
      window.livefx.bus.onMessage((m) => window.__msgs.push(m));
    });
    await waitFor(
      async () => {
        const h = await api(base, 'GET', '/health');
        return h.json && h.json.overlays >= 2;
      },
      { timeoutMs: 5000, what: 'two overlays on /health' }
    );
    await panel.evaluate(() => window.livefx.pollHealth());
    await panel.waitForFunction(() => document.querySelector('#wiz-obs-dot').classList.contains('on'), null, { timeout: 3000 });
    assert.match(await panel.textContent('#wiz-obs-state'), /Overlay verbunden ✔/);
    assert.ok(await panel.locator('#wiz-obs').evaluate((s) => s.classList.contains('done')), 'step 2 marked done');
    log('status dot green with a second overlay');

    // (d) test effect fires into the overlay
    const fires = () => overlay.evaluate(() => window.livefx.renderer.stats.fires);
    await panel.click('#wiz-test-fx');
    await overlay.waitForSelector('.fx-card', { timeout: 3000 });
    assert.equal(await fires(), 1, 'test effect fired once');
    assert.match(await panel.textContent('#log'), /Start-Assistent/);
    log('test effect ok');

    // (e) pack tile: load -> counter + server, click again -> unload
    const before = await panel.evaluate(() => window.livefx.triggers.length);
    const limit = await panel.evaluate(() => window.LiveFXSchema.LIMITS.triggers);
    assert.match((await panel.textContent('#wiz-pack-count')).trim(), new RegExp(`^${before} / ${limit} Trigger`));
    const tile = panel.locator('#wiz-pack-tiles button[data-pack="tr"]');
    assert.equal(await tile.evaluate((b) => b.classList.contains('loaded')), false);
    await tile.click();
    await panel.waitForFunction(() => document.querySelector('#wiz-pack-tiles button[data-pack="tr"]').classList.contains('loaded'), null, { timeout: 3000 });
    const after = await panel.evaluate(() => window.livefx.triggers.length);
    const trCount = await panel.evaluate(() => window.LiveFXPacks.packs.tr.triggers.length);
    assert.equal(after, before + trCount, 'pack triggers added');
    assert.match((await panel.textContent('#wiz-pack-count')).trim(), new RegExp(`^${after} / ${limit} Trigger · 1 / \\d+ Pakete`));
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && r.json.triggers.some((t) => String(t.id).startsWith('tr-'));
      },
      { timeoutMs: 3000, what: 'pack on the server' }
    );
    assert.ok(await panel.locator('#packs .pack[data-pack="tr"]').evaluate((el) => el.classList.contains('loaded')), 'packs card agrees');
    await panel.locator('#wiz-pack-tiles button[data-pack="tr"]').click();
    await panel.waitForFunction(() => !document.querySelector('#wiz-pack-tiles button[data-pack="tr"]').classList.contains('loaded'), null, { timeout: 3000 });
    assert.equal(await panel.evaluate(() => window.livefx.triggers.length), before, 'pack removed again');
    // every pack fits
    const allIds = await panel.evaluate(() => window.LiveFXPacks.list().map((p) => p.id));
    for (const id of allIds) await panel.evaluate((pid) => window.livefx.packs.load(pid), id);
    const total = await panel.evaluate(() => window.livefx.triggers.length);
    const sum = await panel.evaluate(() => window.LiveFXPacks.list().reduce((n, p) => n + p.count, 0));
    assert.ok(total >= before + sum - 5 && total <= limit, `all packs loaded (${total} of ${limit}, packs sum ${sum})`);
    assert.equal(await panel.locator('#wiz-pack-tiles button.pack-tile.loaded').count(), allIds.length, 'every tile loaded');
    for (const id of allIds) await panel.evaluate((pid) => window.livefx.packs.unload(pid), id);
    assert.equal(await panel.evaluate(() => window.livefx.triggers.length), before);
    log(`pack tiles ok (${allIds.length} packs, ${sum} triggers fit in ${limit})`);

    // (f) settings: gap default, volumes, layout, primary language, live story, story mode without safe
    assert.equal(await panel.inputValue('#gap'), '0.5', 'gap default 0.5');
    assert.equal(await panel.evaluate(() => window.livefx.matcher.globalMinGap), 0.5);
    assert.deepEqual(await panel.evaluate(() => window.livefx.volumes.get()), { master: 0.5, sfx: 0.8, ambient: 0.5 }, 'volume defaults');
    await overlay.evaluate(() => (window.__msgs.length = 0));
    await panel.fill('#volume-sfx', '0.3'); // fill() dispatches `input`
    await panel.fill('#volume-ambient', '0.2');
    await panel.fill('#volume', '0.7');
    await overlay.waitForFunction(() => window.__msgs.filter((m) => m.type === 'volume').length >= 3, null, { timeout: 3000 });
    const vols = await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'volume').map((m) => ({ volume: m.volume, bus: m.bus || null })));
    assert.deepEqual(vols, [{ volume: 0.3, bus: 'sfx' }, { volume: 0.2, bus: 'ambient' }, { volume: 0.7, bus: null }], 'volume messages per bus (master without bus)');
    assert.deepEqual(JSON.parse(await panel.evaluate(() => localStorage.getItem('livefx.volumes'))), { master: 0.7, sfx: 0.3, ambient: 0.2 });

    await overlay.evaluate(() => (window.__msgs.length = 0));
    await panel.selectOption('#story-layout', 'full');
    await panel.fill('#band-height', '30');
    await panel.dispatchEvent('#band-height', 'change');
    await panel.selectOption('#effect-zone', 'top');
    await overlay.waitForFunction(() => window.__msgs.filter((m) => m.type === 'layout').length >= 3, null, { timeout: 3000 });
    const lay = await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'layout').pop());
    assert.equal(lay.storyLayout, 'full');
    assert.equal(lay.band, 30);
    assert.equal(lay.zone, 'top');
    assert.deepEqual(await panel.evaluate(() => window.livefx.layout.get()), { storyLayout: 'full', band: 30, zone: 'top' });
    await panel.fill('#band-height', '99');
    await panel.dispatchEvent('#band-height', 'change');
    assert.equal(await panel.inputValue('#band-height'), '35', 'band height clamped to LIMITS.bandMax');

    await panel.selectOption('#primary-lang', 'tr-TR');
    assert.equal(await panel.evaluate(() => window.livefx.primaryLang), 'tr-TR');
    assert.equal(await panel.evaluate(() => window.livefx.matcher.phonetic), 'tr', 'matcher.setPhonetic(primaryLang)');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.asr.primary')), 'tr-TR');

    await overlay.evaluate(() => (window.__msgs.length = 0));
    await panel.check('#live-story');
    await panel.evaluate(() => window.livefx.handleText('es regnete im', false, { source: 'Test', lang: 'de-DE' }));
    await panel.evaluate(() => window.livefx.handleText('es regnete im Wald', true, { source: 'Test', lang: 'de-DE' }));
    await overlay.waitForFunction(() => window.__msgs.filter((m) => m.type === 'story').length >= 2, null, { timeout: 3000 });
    const story = await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'story').map((m) => ({ text: m.text, final: m.final, lang: m.lang })));
    assert.deepEqual(story, [{ text: 'es regnete im', final: false, lang: 'de' }, { text: 'es regnete im Wald', final: true, lang: 'de' }], 'story messages for interim + final');
    await panel.uncheck('#live-story');

    await panel.selectOption('#asr-reaction', 'fast');
    await panel.check('#story-mode');
    await panel.evaluate(() => window.livefx.ready);
    assert.equal(await panel.inputValue('#asr-reaction'), 'fast', 'story mode no longer forces the safe reaction');
    assert.equal(await panel.inputValue('#asr-tolerance'), 'medium');
    await panel.uncheck('#story-mode');
    log('settings: volumes / layout / primary language / live story / story mode ok');

    // (g) persistence across a reload
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.deepEqual(await panel.evaluate(() => window.livefx.volumes.get()), { master: 0.7, sfx: 0.3, ambient: 0.2 });
    assert.deepEqual(await panel.evaluate(() => window.livefx.layout.get()), { storyLayout: 'full', band: 35, zone: 'top' });
    assert.equal(await panel.inputValue('#primary-lang'), 'tr-TR');
    assert.equal(await panel.inputValue('#story-layout'), 'full');
    assert.equal(await panel.locator('.card[data-advanced]').first().isVisible(), false, 'advanced stays collapsed');
    await overlay.evaluate(() => (window.__msgs.length = 0));
    await overlay.waitForFunction(() => window.__msgs.some((m) => m.type === 'layout') && window.__msgs.filter((m) => m.type === 'volume').length >= 3, null, { timeout: 5000 });
    log('non-default volumes + layout re-sent after reload');

    await panel.screenshot({ path: path.join(shotDir, 'wizard.png'), fullPage: true });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    void token;
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
