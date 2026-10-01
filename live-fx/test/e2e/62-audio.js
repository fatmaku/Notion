// Audio (1.5): silent preview by default, preview-sound toggle, echo warning when a second overlay is
// connected, Ton-Check checklist persistence, OBS test sound through the bus, auto language default.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openPanel(ctx, base, errors) {
  const panel = await ctx.newPage();
  panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
  await panel.goto(`${base}/`);
  await panel.waitForSelector('#pad button');
  await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
  await panel.evaluate(() => window.livefx.ready);
  return panel;
}

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  try {
    let panel = await openPanel(ctx, base, errors);

    // (a) fresh profile: preview silent, toggle off, auto language selected, pill says Auto
    const src0 = await panel.getAttribute('#preview', 'src');
    assert.match(src0, /volume=0(?:[^.\d]|$)/, `preview src is muted: ${src0}`);
    assert.equal(await panel.isChecked('#preview-sound'), false, 'preview sound off by default');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.previewSound')), null, 'nothing persisted yet');
    assert.ok(await panel.locator('#lang option[value="auto"]').count(), '#lang has an auto option');
    assert.equal(await panel.inputValue('#lang'), 'auto', 'auto selected on a fresh profile');
    assert.equal(await panel.locator('#lang optgroup').count(), 3, 'the three language groups stay');
    assert.equal(await panel.textContent('#pill-lang-value'), 'Auto', 'header pill shows Auto');
    assert.match(await panel.textContent('#diag-lang'), /Erkannte Sprache/, 'diag line present');
    assert.ok(await panel.isHidden('#echo-warning'), 'no echo warning initially');
    const backends = await panel.evaluate(() => LiveFXASR.backends.map((b) => b.name));
    const asrName = await panel.evaluate(() => window.livefx.asr && window.livefx.asr.name);
    log(`backends: ${backends.join(',')} -> asr backend ${asrName}`);
    if (backends.includes('auto')) assert.equal(asrName, 'auto', 'auto language uses the auto backend');
    else assert.equal(asrName, 'webspeech', 'without an auto backend the panel falls back to webspeech');

    // existing users keep their stored language
    await panel.selectOption('#lang', 'tr-TR');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.asr.lang')), 'tr-TR');
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.equal(await panel.inputValue('#lang'), 'tr-TR', 'stored language restored');
    assert.equal(await panel.textContent('#pill-lang-value'), 'tr-TR');
    await panel.selectOption('#lang', 'auto');
    assert.equal(await panel.textContent('#pill-lang-value'), 'Auto');

    // simulated lang event (as the auto backend sends it) updates diag + pill + effective language
    await panel.evaluate(() => window.livefx.asrEvent({ type: 'lang', lang: 'tr-TR', family: 'tr', score: 0.9, mode: 'parallel', reason: 'test' }));
    assert.match(await panel.textContent('#diag-lang'), /Türkçe \(tr-TR\).*parallel/, 'diag shows the detected language');
    assert.equal(await panel.textContent('#pill-lang-value'), 'Auto · TR');
    assert.equal(await panel.evaluate(() => window.livefx.effectiveLang()), 'tr-TR');
    assert.match(await panel.textContent('#log'), /Sprache erkannt: Türkçe/);
    log('lang event reflected in diag + pill');

    // (b) toggling preview sound: src volume > 0, persisted
    await panel.fill('#volume', '0.6');
    await panel.check('#preview-sound');
    const src1 = await panel.getAttribute('#preview', 'src');
    const vol1 = Number(/volume=([\d.]+)/.exec(src1)[1]);
    assert.ok(vol1 > 0, `preview src carries the slider volume: ${src1}`);
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.previewSound')), '1');
    assert.equal(await panel.evaluate(() => window.livefx.previewSound.get()), true);
    assert.equal(await panel.isChecked('#audiocheck input[data-key="preview-off"]'), false, 'auto item follows the switch');
    log(`preview sound on -> ${src1}`);

    // (c) second overlay (OBS) connects -> echo warning within 7 s; its button turns the sound off
    const overlay = await ctx.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const h = await api(base, 'GET', '/health');
    assert.ok(h.json.overlays >= 2, `/health counts preview + overlay tab: ${h.text}`);
    await panel.waitForSelector('#echo-warning:not([hidden])', { timeout: 7000 });
    assert.match(await panel.textContent('#echo-warning'), /Echo-Gefahr/);
    await panel.screenshot({ path: path.join(shotDir, 'panel-echo-warning.png'), fullPage: false });
    await panel.click('#echo-off');
    assert.ok(await panel.isHidden('#echo-warning'), 'warning gone after turning the sound off');
    assert.equal(await panel.isChecked('#preview-sound'), false);
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.previewSound')), '0');
    assert.match(await panel.getAttribute('#preview', 'src'), /volume=0(?:[^.\d]|$)/, 'preview muted again');
    assert.equal(await panel.isChecked('#audiocheck input[data-key="preview-off"]'), true);
    log('echo warning shown and cleared');

    // the muted preview stays muted when the slider sends a volume message
    await panel.waitForFunction(() => {
      const f = document.querySelector('#preview');
      return f && f.contentWindow && f.contentWindow.livefx && f.contentWindow.livefx.bus.serverOk;
    }, null, { timeout: 5000 });
    await panel.fill('#volume', '0.9');
    await panel.dispatchEvent('#volume', 'input');
    await sleep(1500);
    const pv = await panel.evaluate(() => document.querySelector('#preview').contentWindow.livefx.renderer.volume);
    assert.equal(pv, 0, `muted preview renderer volume stays 0 (got ${pv})`);

    // (d) Ton-Check checkboxes persist across reload
    await panel.check('#audiocheck input[data-key="mic-source"]');
    await panel.check('#audiocheck input[data-key="monitoring"]');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.audiocheck.mic-source')), '1');
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.equal(await panel.isChecked('#audiocheck input[data-key="mic-source"]'), true, 'mic-source persisted');
    assert.equal(await panel.isChecked('#audiocheck input[data-key="monitoring"]'), true, 'monitoring persisted');
    assert.equal(await panel.isChecked('#audiocheck input[data-key="browser-audio"]'), false);
    assert.equal(await panel.isChecked('#audiocheck input[data-key="preview-off"]'), true);
    assert.equal(await panel.isChecked('#preview-sound'), false, 'preview sound stays off after reload');

    // (e) „Test-Sound in OBS“ reaches the overlay tab through the bus
    const before = await overlay.evaluate(() => window.livefx.renderer.stats.fires);
    await panel.click('#btn-obs-sound');
    await overlay.waitForFunction(() => Array.from(document.querySelectorAll('.fx-card .fx-text')).some((el) => /TON-TEST/.test(el.textContent)), null, { timeout: 3000 });
    assert.equal(await overlay.evaluate(() => window.livefx.renderer.stats.fires), before + 1, 'exactly one fire on the overlay');
    await panel.waitForFunction(() => document.querySelector('#log').textContent.includes('TON-TEST'), null, { timeout: 2000 });
    log('OBS test sound rendered on the overlay tab');

    // (f) mic test with the fake device: reports a result within ~6 s
    await panel.click('#btn-mic-test');
    await panel.waitForFunction(() => /Pegel/.test(document.querySelector('#mic-test-status').textContent) && !/Sprich/.test(document.querySelector('#mic-test-status').textContent), null, { timeout: 8000 });
    log('mic test:', await panel.textContent('#mic-test-status'));

    await panel.screenshot({ path: path.join(shotDir, 'panel-audio.png'), fullPage: true });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
