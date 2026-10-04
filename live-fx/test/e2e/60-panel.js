// Panel integration: hotkeys honour the enabled flag, transcript highlighting on raw text, editor round
// trip to the server, reload from the server, external ASR backend, foreign fire logging, token card,
// smart mode (mock) through the real handleText path.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  try {
    const overlay = await ctx.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const fires = () => overlay.evaluate(() => window.livefx.renderer.stats.fires);

    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await panel.evaluate(() => window.livefx.ready);

    // (a) hotkey 4 -> exactly one rain (trigger #4 = lol); disabled trigger + modifier keys fire nothing
    await panel.keyboard.press('4');
    await sleep(700);
    const drops = await overlay.evaluate(() => window.livefx.renderer.particles.items.filter((p) => p.kind === 'emoji' && !p.ambient).length);
    assert.equal(await overlay.locator('.fx-rain').count(), 1, 'hotkey 4 rendered one rain (marker)');
    assert.ok(drops > 0, 'hotkey 4 rendered canvas rain drops');
    assert.equal(await fires(), 1, 'exactly one fire after hotkey 4');
    log(`hotkey 4 -> ${drops} drops`);
    await panel.evaluate(() => {
      const list = window.livefx.triggers.slice();
      list[3].enabled = false;
      window.livefx.setTriggers(list);
    });
    assert.ok(await panel.locator('#pad button').nth(3).evaluate((b) => b.classList.contains('off')), 'pad button 4 is .off');
    await panel.keyboard.press('4');
    await panel.keyboard.press('Control+1');
    await sleep(700);
    assert.equal(await fires(), 1, 'disabled trigger / ctrl-combo fired nothing');
    assert.match(await panel.textContent('#log'), /deaktiviert/);

    // (b) raw-text highlighting with a typographic apostrophe
    await panel.evaluate(() => window.livefx.handleText('Let’s go!', true, { source: 'Test' }));
    const mark = await panel.textContent('#transcript mark');
    assert.ok(mark.includes('Let’s go'), `mark text: ${mark}`);
    await overlay.waitForFunction(() => Array.from(document.querySelectorAll('.fx-card .fx-text')).some((el) => /LET'S GO/.test(el.textContent)), null, { timeout: 3000 });
    log('transcript highlighted', JSON.stringify(mark));

    // (c) editor round trip: rename the first trigger, saved to the server
    await panel.click('#trigger-rows tr:first-child [data-act="edit"]');
    await panel.waitForSelector('dialog.fx-editor[open]');
    await panel.fill('dialog.fx-editor [name="label"]', 'BRUH2');
    await panel.screenshot({ path: path.join(shotDir, 'panel-editor.png') });
    await panel.click('dialog.fx-editor [data-act="save"]');
    await panel.waitForFunction(() => !document.querySelector('dialog.fx-editor').open);
    assert.equal(await panel.inputValue('#trigger-rows tr:first-child [data-f="label"]'), 'BRUH2');
    assert.ok((await panel.textContent('#pad button:first-child')).includes('BRUH2'), 'pad shows BRUH2');
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && r.json.triggers.some((t) => t.label === 'BRUH2');
      },
      { timeoutMs: 3000, what: 'BRUH2 on the server' }
    );
    log('editor saved BRUH2 to the server');

    // (d) reload with cleared localStorage -> triggers come from the server
    await panel.evaluate(() => localStorage.clear());
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.equal(await panel.inputValue('#trigger-rows tr:first-child [data-f="label"]'), 'BRUH2');
    assert.match(await panel.textContent('#log'), /Server/);

    // (e) external ASR backend receives /api/transcript
    await panel.selectOption('#asr', 'external');
    await panel.click('#btn-listen');
    assert.match(await panel.textContent('#btn-listen'), /extern/i);
    const tr = await api(base, 'POST', '/api/transcript', { json: { text: 'oh nein das war ein fail' }, token });
    assert.equal(tr.status, 200, tr.text);
    await overlay.waitForFunction(() => Array.from(document.querySelectorAll('.fx-card .fx-text')).some((el) => el.textContent.includes('wah')), null, { timeout: 3000 });
    await panel.waitForFunction(() => document.querySelector('#log').textContent.includes('Extern'), null, { timeout: 3000 });
    log('external transcript fired the fail card');

    // (f) foreign fire from the API shows up in the log
    const ff = await api(base, 'POST', '/api/fire', { json: { id: 'wow', source: 'Stream Deck' }, token });
    assert.equal(ff.status, 200, ff.text);
    await panel.waitForFunction(() => document.querySelector('#log').textContent.includes('Stream Deck'), null, { timeout: 3000 });

    // (g) token card
    assert.equal(await panel.inputValue('#token'), token);
    assert.ok((await panel.textContent('#curl-example')).includes(token), 'curl example uses the token');

    // (h) smart mode (mock classifier) through handleText: no keyword hit -> KI fires crickets
    await panel.waitForFunction(() => !document.querySelector('#smart').disabled, null, { timeout: 3000 });
    await panel.check('#smart');
    await panel.evaluate(() => {
      // The mock reacts to "trigger:<id>", but "awkward" is also a keyword of that trigger – drop it
      // so the keyword matcher stays silent and the smart gate opens.
      const list = window.livefx.triggers.slice();
      const t = list.find((x) => x.id === 'awkward');
      t.keywords = t.keywords.filter((k) => k !== 'awkward');
      window.livefx.setTriggers(list);
    });
    await sleep(1300); // global min gap after the fail card
    await panel.evaluate(() => window.livefx.handleText('bitte trigger:awkward jetzt', true, { source: 'Test' }));
    await overlay.waitForFunction(() => Array.from(document.querySelectorAll('.fx-card')).some((el) => el.textContent.includes('🦗') || el.textContent.includes('...')), null, { timeout: 4000 });
    await panel.waitForFunction(() => document.querySelector('#log').textContent.includes('KI'), null, { timeout: 3000 });
    log('smart mode fired crickets');

    await panel.screenshot({ path: path.join(shotDir, 'panel.png'), fullPage: true });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
