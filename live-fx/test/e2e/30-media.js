// Media: upload png + wav, render image card with file sound in the overlay, XSS/rain/src hardening,
// then the trigger editor + media library in the panel.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function makeWav(pcmBytes = 100) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1');
  h.writeUInt32LE(36 + pcmBytes, 4);
  h.write('WAVE', 8, 'latin1');
  h.write('fmt ', 12, 'latin1');
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(8000, 24);
  h.writeUInt32LE(16000, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36, 'latin1');
  h.writeUInt32LE(pcmBytes, 40);
  return Buffer.concat([h, Buffer.alloc(pcmBytes)]);
}

async function run({ browser, startServer, api, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  try {
    const up = async (name, body) =>
      api(base, 'POST', '/api/assets', { body, token, headers: { 'x-filename': name, 'content-type': 'application/octet-stream' } });
    const png = await up('meme.png', PNG);
    const wav = await up('boom.wav', makeWav());
    assert.equal(png.status, 200, png.text);
    assert.equal(wav.status, 200, wav.text);
    const pngName = png.json.asset.name;
    const wavName = wav.json.asset.name;
    log('uploaded', pngName, wavName);

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const overlay = await ctx.newPage();
    const pageErrors = [];
    overlay.on('pageerror', (e) => pageErrors.push(e.message));
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.renderer, null, { timeout: 5000 });

    // 1. image + file sound
    await overlay.evaluate(
      ({ pngName, wavName }) => {
        window.livefx.renderer.fire({
          id: 't',
          label: 't',
          keywords: [],
          sound: `file:assets/${wavName}`,
          visual: { kind: 'image', src: `assets/${pngName}`, text: 'MEME', position: 'safe' },
        });
      },
      { pngName, wavName }
    );
    await overlay.waitForFunction(() => {
      const img = document.querySelector('.fx-card-image img');
      return img && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 3000 });
    const imgInfo = await overlay.evaluate(() => {
      const img = document.querySelector('.fx-card-image img');
      const card = img.closest('.fx-card');
      return {
        src: img.getAttribute('src'),
        naturalWidth: img.naturalWidth,
        posSafe: card.classList.contains('fx-pos-safe'),
        text: card.textContent,
        audio: !!document.querySelector('#stage audio[src$=".wav"]'),
        fileSounds: window.livefx.renderer.stats.fileSounds,
        fires: window.livefx.renderer.stats.fires,
      };
    });
    assert.ok(imgInfo.src.endsWith(pngName), `img src ${imgInfo.src}`);
    assert.ok(imgInfo.naturalWidth > 0);
    assert.equal(imgInfo.posSafe, true, 'card has fx-pos-safe');
    assert.ok(imgInfo.text.includes('MEME'));
    assert.equal(imgInfo.audio, true, '#stage audio[src$=".wav"] exists');
    assert.equal(imgInfo.fileSounds, 1);
    assert.equal(imgInfo.fires, 1);
    await overlay.screenshot({ path: path.join(shotDir, 'media.png') });

    // 2. XSS in emoji/text
    await overlay.evaluate(() => {
      window.livefx.renderer.fire({ id: 'x', visual: { kind: 'card', emoji: '<img src=x onerror=window.__x=1>', text: '<b>x</b>' } });
    });
    await overlay.waitForTimeout(300);
    const xss = await overlay.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.fx-card'));
      const card = cards[cards.length - 1];
      return { x: window.__x, text: card.textContent, imgs: card.querySelectorAll('img').length, b: card.querySelectorAll('b').length };
    });
    assert.equal(xss.x, undefined, 'onerror handler must not run');
    assert.ok(xss.text.includes('<b>x</b>'), `literal text kept: ${xss.text}`);
    assert.equal(xss.imgs, 0);
    assert.equal(xss.b, 0);

    // 3. rain capped + --x
    await overlay.evaluate(() => {
      window.livefx.renderer.fire({ id: 'r', visual: { kind: 'rain', emoji: '🔥', count: 9999 } });
    });
    const rain = await overlay.evaluate(() => {
      const drops = Array.from(document.querySelectorAll('.fx-drop'));
      return { count: drops.length, allX: drops.every((el) => el.style.getPropertyValue('--x') !== '') };
    });
    assert.ok(rain.count > 0 && rain.count <= 60, `drop count ${rain.count}`);
    assert.equal(rain.allX, true, 'every drop has --x');

    // 4. javascript: src rejected, no error thrown
    const before = await overlay.evaluate(() => document.querySelectorAll('img').length);
    const threw = await overlay.evaluate(() => {
      try {
        window.livefx.renderer.fire({ id: 'j', visual: { kind: 'image', src: 'javascript:alert(1)' } });
        return null;
      } catch (e) {
        return e.message;
      }
    });
    assert.equal(threw, null, 'fire must not throw');
    const after = await overlay.evaluate(() => ({
      imgs: document.querySelectorAll('img').length,
      badSrc: !!document.querySelector('img[src^="javascript"]'),
    }));
    assert.equal(after.imgs, before, 'no img element added');
    assert.equal(after.badSrc, false);
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);

    // ---- panel: editor + library ----
    const panel = await ctx.newPage();
    const panelErrors = [];
    panel.on('pageerror', (e) => panelErrors.push(e.message));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    const have = await panel.evaluate(() => ({
      schema: !!window.LiveFXSchema,
      assets: !!window.LiveFXAssets,
      editor: !!window.LiveFXEditor,
      css: Array.from(document.styleSheets).some((s) => s.href && s.href.endsWith('/css/editor.css')),
    }));
    if (!have.schema) await panel.addScriptTag({ url: '/js/schema.js' });
    if (!have.assets) await panel.addScriptTag({ url: '/js/assets.js' });
    if (!have.editor) await panel.addScriptTag({ url: '/js/editor.js' });
    if (!have.css) await panel.addStyleTag({ url: '/css/editor.css' });
    log('panel already included:', JSON.stringify(have));

    const assetsList = await panel.evaluate(() => window.LiveFXAssets.list());
    assert.deepEqual(
      assetsList.map((a) => a.name).sort(),
      [pngName, wavName].sort()
    );

    // open the editor with the default 'wow' trigger
    await panel.evaluate((list) => {
      const wow = JSON.parse(JSON.stringify(window.LiveFXDefaultTriggers.find((t) => t.id === 'wow')));
      const grouped = window.LiveFXAssets.groupAssets(list);
      window.__tests = [];
      window.__editorResult = window.LiveFXEditor.open(wow, {
        assets: grouped,
        sounds: window.LiveFXSounds.names,
        onTest: (t) => window.__tests.push(t),
      });
    }, assetsList);
    await panel.waitForSelector('dialog.fx-editor[open]');
    const opts = await panel.evaluate(() => ({
      images: Array.from(document.querySelectorAll('dialog.fx-editor [name="src"] option')).map((o) => o.value),
      sounds: Array.from(document.querySelectorAll('dialog.fx-editor [name="sound"] option')).map((o) => o.value),
      kind: document.querySelector('dialog.fx-editor [name="kind"]').value,
      label: document.querySelector('dialog.fx-editor [name="label"]').value,
    }));
    assert.ok(opts.images.includes(`assets/${pngName}`), 'image select lists the png');
    assert.ok(opts.sounds.includes(`file:assets/${wavName}`), 'sound select lists the wav');
    assert.ok(opts.sounds.includes('airhorn'));
    assert.equal(opts.kind, 'card');
    assert.equal(opts.label, 'Mind blown');

    await panel.fill('dialog.fx-editor [name="label"]', 'Neuer Name');
    await panel.click('dialog.fx-editor [data-act="test"]');
    const tested = await panel.evaluate(() => window.__tests.length);
    assert.equal(tested, 1, 'onTest called');
    await panel.screenshot({ path: path.join(shotDir, 'editor.png') });
    await panel.click('dialog.fx-editor [data-act="save"]');
    const result = await panel.evaluate(async () => {
      const t = await window.__editorResult;
      const n = window.LiveFXSchema.normalizeTrigger(t, { usedIds: new Set() });
      return { t, warnings: n.warnings, same: JSON.stringify(n.trigger) === JSON.stringify(t) };
    });
    assert.ok(result.t, 'editor resolved a trigger');
    assert.equal(result.t.id, 'wow');
    assert.equal(result.t.label, 'Neuer Name');
    assert.equal(result.t.sound, 'airhorn');
    assert.equal(result.t.visual.kind, 'card');
    assert.equal(result.t.visual.shake, true);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.same, true, 're-normalizing is a no-op');
    const closed = await panel.evaluate(() => !document.querySelector('dialog.fx-editor').open);
    assert.equal(closed, true);

    // Escape cancels
    await panel.evaluate(() => {
      window.__cancelResult = window.LiveFXEditor.open({ id: 'tmp', label: 'tmp' }, { assets: [], sounds: [] });
    });
    await panel.waitForSelector('dialog.fx-editor[open]');
    await panel.keyboard.press('Escape');
    const cancelled = await panel.evaluate(() => window.__cancelResult);
    assert.equal(cancelled, null);

    // Mobile width: dialog must fit
    await panel.setViewportSize({ width: 375, height: 700 });
    await panel.evaluate(() => {
      window.__m = window.LiveFXEditor.open({ id: 'tmp', label: 'tmp' }, { assets: [], sounds: [] });
    });
    await panel.waitForSelector('dialog.fx-editor[open]');
    const box = await panel.evaluate(() => {
      const r = document.querySelector('dialog.fx-editor').getBoundingClientRect();
      return { w: r.width, right: r.right, scrollW: document.documentElement.scrollWidth };
    });
    assert.ok(box.right <= 375 && box.w <= 375, `dialog fits phone width: ${JSON.stringify(box)}`);
    await panel.screenshot({ path: path.join(shotDir, 'editor-mobile.png') });
    await panel.keyboard.press('Escape');
    await panel.setViewportSize({ width: 1280, height: 720 });

    // media library
    await panel.evaluate(() => {
      const div = document.createElement('div');
      div.id = '__lib';
      document.body.appendChild(div);
      window.__libChanges = [];
      window.__lib = window.LiveFXAssets.mountLibrary(div, { onChange: (a) => window.__libChanges.push(a.length) });
    });
    await panel.waitForFunction(() => document.querySelectorAll('#__lib .asset-item').length >= 2, null, { timeout: 3000 });
    const lib = await panel.evaluate(() => ({
      names: Array.from(document.querySelectorAll('#__lib .asset-item')).map((el) => el.dataset.name).sort(),
      imgs: document.querySelectorAll('#__lib img.asset-thumb').length,
      plays: document.querySelectorAll('#__lib .asset-play').length,
      dels: document.querySelectorAll('#__lib .asset-del').length,
      upload: !!document.querySelector('#__lib input[type=file]'),
      changes: window.__libChanges,
    }));
    assert.deepEqual(lib.names, [pngName, wavName].sort());
    assert.equal(lib.imgs, 1);
    assert.equal(lib.plays, 1);
    assert.equal(lib.dels, 2);
    assert.equal(lib.upload, true);
    assert.ok(lib.changes.length >= 1 && lib.changes[lib.changes.length - 1] === 2);

    // delete through the library (confirm() accepted)
    panel.once('dialog', (d) => d.accept());
    await panel.click(`#__lib .asset-del[data-name="${wavName}"]`);
    await panel.waitForFunction(() => document.querySelectorAll('#__lib .asset-item').length === 1, null, { timeout: 3000 });
    const remaining = await api(base, 'GET', '/api/assets');
    assert.deepEqual(
      remaining.json.assets.map((a) => a.name),
      [pngName]
    );
    await panel.screenshot({ path: path.join(shotDir, 'library.png') });
    assert.deepEqual(panelErrors, [], `panel errors: ${panelErrors.join('; ')}`);
    await ctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
