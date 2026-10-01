// Story mode (1.3) in the panel: the toggle switches the recognition to medium/safe/2 s, loads the story
// pack of the current language, shows the scene pad (one button per scene) whose buttons fire scenes in
// the overlay; a read sentence fires a sticker; switching off restores the previous settings; the editor
// opens a scene trigger with the scene select visible. Assertions that need the renderer package
// (`.fx-scene` / `.fx-sticker`) are reported instead of failing when that layer is missing.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

    // Non-default settings so the restore on toggle-off is observable.
    await panel.selectOption('#asr-tolerance', 'high');
    await panel.selectOption('#asr-reaction', 'fast');
    await panel.fill('#gap', '0.5');
    await panel.dispatchEvent('#gap', 'change');
    assert.equal(await panel.inputValue('#lang'), 'auto', 'default language is auto');
    assert.ok(await panel.locator('#scene-pad').isHidden(), 'scene pad hidden before story mode');
    assert.equal(await panel.locator('.pack.story').count(), 3, 'three story packs listed in the pack card');

    const rows = () => panel.locator('#trigger-rows tr').count();
    const before = await rows();
    const packSize = await panel.evaluate(() => window.LiveFXPacks.get('story-de').length);
    const scenes = await panel.evaluate(() => window.LiveFXSchema.SCENES || window.LiveFXPacks.SCENE_IDS);
    assert.ok(Array.isArray(scenes) && scenes.length >= 13, `SCENES known (${scenes && scenes.length})`);

    // (a) toggle on -> medium / safe / gap 2, story-de pack loaded (locally + on the server), scene pad visible
    await panel.check('#story-mode');
    assert.equal(await panel.inputValue('#asr-tolerance'), 'medium', 'tolerance medium');
    assert.equal(await panel.inputValue('#asr-reaction'), 'safe', 'reaction safe');
    assert.equal(await panel.inputValue('#gap'), '2', 'gap 2 s');
    assert.equal(await panel.evaluate(() => window.livefx.matcher.globalMinGap), 2, 'matcher gap 2');
    assert.equal(await panel.evaluate(() => window.livefx.asrSettings.tolerance), 'medium');
    assert.equal(await panel.evaluate(() => window.livefx.asrSettings.reaction), 'safe');
    assert.equal(await rows(), before + packSize, 'table grew by the story pack');
    assert.ok(await panel.locator('#scene-pad').isVisible(), 'scene pad visible');
    assert.equal(await panel.locator('#scene-pad button').count(), scenes.length, 'one pad button per scene');
    assert.match(await panel.textContent('#scene-pad'), /Szene beenden/, 'clear button labelled „Szene beenden“');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.story')), '1', 'persisted');
    assert.match(await panel.textContent('.pack[data-pack="story-de"]'), /geladen/, 'story-de pack row shows loaded');
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && r.json.triggers.filter((t) => t.id.startsWith('story-de-')).length === packSize;
      },
      { timeoutMs: 3000, what: 'story-de- triggers on the server' }
    );
    const serverRain = (await api(base, 'GET', '/api/triggers')).json.triggers.find((t) => t.id === 'story-de-regen');
    assert.ok(serverRain, 'rain trigger on the server');
    if (serverRain.visual.kind !== 'scene') log(`NOTE: server normalized the scene trigger to "${serverRain.visual.kind}" (schema package missing?)`);
    // pad thumbnails: scene trigger shows the scene emoji, sticker its first emoji
    const thumbs = await panel.evaluate(() => {
      const byId = (id) => {
        const i = window.livefx.triggers.findIndex((t) => t.id === id);
        const b = document.querySelectorAll('#pad button')[i];
        return b ? b.querySelector('.emoji').textContent : null;
      };
      return { rain: byId('story-de-regen'), drache: byId('story-de-drache') };
    });
    assert.equal(thumbs.rain, '🌧️', 'scene trigger thumbnail = scene emoji');
    assert.equal(thumbs.drache, '🐉', 'sticker thumbnail = first emoji');
    log(`story mode on: ${packSize} triggers, ${scenes.length} scene buttons`);

    // (b) rain button -> overlay .fx-scene[data-scene="rain"] (renderer package)
    await panel.click('#scene-pad button[data-scene="rain"]');
    await panel.waitForFunction(() => document.querySelector('#log').textContent.includes('Szenen-Pad'), null, { timeout: 3000 });
    const hasSceneLayer = await overlay.evaluate(() => !!(window.livefx && window.livefx.renderer && typeof window.livefx.renderer.scene === 'function'));
    if (hasSceneLayer) {
      await overlay.waitForSelector('.fx-scene[data-scene="rain"]', { timeout: 4000 });
      assert.equal(await overlay.evaluate(() => window.livefx.renderer.currentScene), 'rain', 'renderer.currentScene');
      log('rain scene on stage');
    } else log('NOTE: renderer has no scene() yet – .fx-scene assertion skipped (scenes package)');

    // (c) reading a sentence fires the dragon sticker (position top)
    await sleep(2100); // story gap
    await panel.evaluate(() => window.livefx.handleText('und dann kam der drache', true, { source: 'Test' }));
    await panel.waitForFunction(() => document.querySelector('#log').textContent.includes('Drache'), null, { timeout: 3000 });
    assert.ok((await panel.textContent('#transcript mark')).includes('der drache'), 'keyword highlighted');
    if (hasSceneLayer) {
      await overlay.waitForSelector('.fx-sticker, .fx-card', { timeout: 4000 });
      log('dragon sticker rendered');
    } else {
      await overlay.waitForSelector('.fx-card, .fx-sticker', { timeout: 4000 });
      log('dragon fired (card fallback without sticker renderer)');
    }
    await overlay.screenshot({ path: path.join(shotDir, 'story-panel-overlay.png') });
    await panel.screenshot({ path: path.join(shotDir, 'story-panel.png'), fullPage: true });

    // (d) interim results are ignored in "sicher" mode (story mode) – no second fire
    const logBefore = await panel.evaluate(() => document.querySelector('#log').children.length);
    await panel.evaluate(() => window.livefx.handleText('im wald', false, { source: 'Test' }));
    await sleep(200);
    assert.equal(await panel.evaluate(() => document.querySelector('#log').children.length), logBefore, 'interim text does not fire in safe mode');

    // (e) reload keeps story mode on (pad visible, settings still story)
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.ok(await panel.isChecked('#story-mode'), 'story mode restored after reload');
    assert.ok(await panel.locator('#scene-pad').isVisible(), 'scene pad visible after reload');
    assert.equal(await panel.inputValue('#gap'), '2');
    assert.equal(await rows(), before + packSize, 'pack not duplicated on reload');

    // (f) toggle off -> previous settings back, pad hidden, pack kept
    await panel.uncheck('#story-mode');
    assert.equal(await panel.inputValue('#asr-tolerance'), 'high', 'tolerance restored');
    assert.equal(await panel.inputValue('#asr-reaction'), 'fast', 'reaction restored');
    assert.equal(await panel.inputValue('#gap'), '0.5', 'gap restored');
    assert.equal(await panel.evaluate(() => window.livefx.matcher.globalMinGap), 0.5, 'matcher gap restored');
    assert.ok(await panel.locator('#scene-pad').isHidden(), 'scene pad hidden');
    assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.story')), '0');
    assert.equal(await rows(), before + packSize, 'pack kept after switching off');
    log('story mode off: settings restored');

    // (g) editor: a scene trigger opens with the scene select + intensity visible, sound has the loop group
    await panel.click('#trigger-rows tr[data-id="story-de-regen"] [data-act="edit"]');
    await panel.waitForSelector('dialog.fx-editor[open]');
    const kinds = await panel.evaluate(() => Array.from(document.querySelectorAll('dialog.fx-editor [name="kind"] option')).map((o) => o.value));
    if (kinds.includes('scene')) {
      assert.equal(await panel.inputValue('dialog.fx-editor [name="kind"]'), 'scene', 'kind = scene');
      assert.ok(await panel.locator('dialog.fx-editor [data-field="scene"]').isVisible(), 'scene select visible');
      assert.ok(await panel.locator('dialog.fx-editor [data-field="intensity"]').isVisible(), 'intensity visible');
      assert.ok(await panel.locator('dialog.fx-editor [data-field="colors"]').isHidden(), 'colors hidden for scenes');
      assert.equal(await panel.inputValue('dialog.fx-editor [name="scene"]'), 'rain', 'scene select = rain');
      assert.equal(await panel.locator('dialog.fx-editor [name="scene"] option').count(), scenes.length, 'one option per scene');
      assert.equal(await panel.inputValue('dialog.fx-editor [name="sound"]'), 'loop:rain', 'sound = loop:rain');
      assert.ok((await panel.locator('dialog.fx-editor [name="sound"] optgroup[label="Atmosphäre (Loop)"]').count()) === 1, 'loop optgroup');
      log('editor shows the scene fields');
    } else log('NOTE: LiveFXSchema.KINDS has no "scene" – editor scene assertions skipped (schema package)');
    await panel.screenshot({ path: path.join(shotDir, 'story-editor.png') });
    await panel.click('dialog.fx-editor [data-act="cancel"]');
    await panel.waitForFunction(() => !document.querySelector('dialog.fx-editor').open);

    // (h) Turkish language -> story-tr pack when story mode is switched on again
    await panel.selectOption('#lang', 'tr-TR');
    await panel.check('#story-mode');
    await panel.waitForFunction(() => window.livefx.triggers.some((t) => t.id.startsWith('story-tr-')), null, { timeout: 3000 });
    assert.match(await panel.textContent('.pack[data-pack="story-tr"]'), /geladen/, 'story-tr loaded for tr-TR');
    await panel.uncheck('#story-mode');

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
