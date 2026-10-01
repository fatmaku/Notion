// Viewer triggers (2.0): the „Zuschauer-Trigger“ card is visible, a command mapping added through the UI
// is saved via PUT /api/chat, POST /api/chat/test fires the trigger (log line + overlay effect + feed
// highlight), a combo rule fires after 3 simulated texts, and „Intensität aus Stimme“ attaches
// visual.intensity based on the (stubbed) meter level.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, api, sseClient, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const auth = { token };
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

    // (a) card visible with status pills and the default gift tiers
    assert.ok(await panel.locator('#viewer-card').isVisible(), 'viewer card visible');
    assert.ok(await panel.locator('#combos-card').isVisible(), 'combos card visible');
    assert.equal(await panel.locator('#chat-status-twitch').textContent(), 'aus');
    assert.equal(await panel.locator('#gift-tiers tr').count(), 3, 'three gift tier rows');
    assert.equal(await panel.locator('#chat-commands tr').count(), 0, 'no commands yet');
    assert.ok(await panel.locator('#viewer-card a[href="docs/VIEWER.md"]').count(), 'link to docs/VIEWER.md');

    // (b) add a command mapping via the UI -> PUT /api/chat
    await panel.click('#btn-chat-cmd-add');
    assert.equal(await panel.locator('#chat-commands tr').count(), 1);
    await panel.fill('#chat-commands tr [data-f="cmd"]', '!lol');
    await panel.selectOption('#chat-commands tr [data-f="trigger"]', 'lol');
    await panel.fill('#chat-cd-user', '0');
    await panel.fill('#chat-cd-global', '0');
    await panel.fill('#chat-twitch-channel', 'meinkanal');
    await panel.fill('#chat-yt-key', 'AIza-test-key');
    await panel.selectOption('#gift-tiers tr:nth-child(2) [data-f="trigger"]', 'money');
    await panel.click('#btn-chat-save');
    await panel.waitForFunction(() => /gespeichert/.test(document.querySelector('#chat-save-status').textContent), null, { timeout: 3000 });
    const saved = await api(base, 'GET', '/api/chat', auth);
    assert.deepEqual(saved.json.settings.commands, { '!lol': 'lol' }, 'command stored on the server');
    assert.equal(saved.json.settings.twitch.channel, 'meinkanal');
    assert.equal(saved.json.settings.twitch.enabled, false, 'not enabled -> no connection attempt');
    assert.equal(saved.json.settings.youtube.hasKey, true);
    assert.equal(saved.json.settings.gifts.tiers.find((t) => t.min === 10).trigger, 'money');
    assert.ok(!saved.text.includes('AIza-test-key'), 'key never comes back');
    assert.ok(!(await panel.locator('#chat-yt-haskey').isHidden()), '„gespeichert ✔“ shown');
    assert.equal(await panel.inputValue('#chat-yt-key'), '', 'key field cleared after save');
    assert.match(await panel.textContent('#log'), /Zuschauer-Trigger gespeichert: 1 Befehl/);
    log('command mapping saved via UI');

    // (c) POST /api/chat/test fires the trigger -> log line, overlay effect, highlighted feed line
    const before = await fires();
    const t = await api(base, 'POST', '/api/chat/test', { ...auth, json: { platform: 'twitch', user: 'Ayşe', text: '!lol das war gut' } });
    assert.equal(t.json.fired, true, t.text);
    await waitFor(async () => (await fires()) === before + 1, { timeoutMs: 3000, what: 'overlay fire from chat' });
    await panel.waitForFunction(() => document.querySelectorAll('#chat-feed .chat-line.fired').length >= 1, null, { timeout: 3000 });
    const line = panel.locator('#chat-feed .chat-line.fired').first();
    assert.equal(await line.getAttribute('data-fired'), 'lol');
    assert.match(await line.textContent(), /Ayşe/);
    assert.match(await line.textContent(), /!lol das war gut/);
    await panel.waitForFunction(() => /LOL\s+←\s+chat:twitch:Ayşe/.test(document.querySelector('#log').textContent), null, { timeout: 3000 });
    // the panel's own „Test-Nachricht“ input goes through the same route
    await panel.fill('#chat-test-text', 'hallo zusammen');
    await panel.click('#btn-chat-test');
    await panel.waitForFunction(() => document.querySelectorAll('#chat-feed .chat-line').length >= 2, null, { timeout: 3000 });
    assert.equal(await panel.locator('#chat-feed .chat-line:not(.fired)').count(), 1, 'plain chat line not highlighted');
    assert.match(await panel.textContent('#log'), /nur Chat \(kein Befehl\)/);
    // a gift through the webhook shows up in the feed and fires the tier trigger
    const g = await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount: 25, gift: 'rose' } });
    assert.equal(g.json.trigger, 'money', g.text);
    await panel.waitForFunction(() => document.querySelectorAll('#chat-feed .chat-line.gift').length === 1, null, { timeout: 3000 });
    assert.match(await panel.locator('#chat-feed .chat-line.gift').textContent(), /Fan/);
    await panel.screenshot({ path: path.join(shotDir, 'viewer.png'), fullPage: true });
    log('chat test fired lol, gift fired money');

    // (d) combo: 3× „krass“ (trigger wow) within 10 s -> win (confetti) – via the real handleText path
    await panel.evaluate(() => {
      window.livefx.combos.set([{ keywordTriggerId: 'wow', times: 3, withinMs: 10000, fireTriggerId: 'win' }]);
      window.livefx.matcher.globalMinGap = 0;
      const list = window.livefx.triggers.map((t) => (t.id === 'wow' ? { ...t, cooldown: 0 } : t));
      window.livefx.setTriggers(list);
    });
    assert.equal(await panel.locator('#combo-rows tr').count(), 1, 'combo row rendered');
    const sse = await sseClient(base, { role: 'overlay' });
    await sse.next('state');
    try {
      for (let i = 0; i < 3; i++) {
        await panel.evaluate(() => window.livefx.handleText('das ist krass', true, { source: 'Test' }));
        await sleep(60);
      }
      const ids = [];
      for (let i = 0; i < 4; i++) ids.push((await sse.next('fire', 3000)).trigger.id);
      assert.deepEqual(ids, ['wow', 'wow', 'wow', 'win'], 'three wow fires then the combo fires win');
      assert.match(await panel.textContent('#log'), /Kombi: 3× Mind blown in 10 s → Let's go/);
      await overlay.waitForFunction(() => document.querySelector('.fx-confetti, .fx-piece, [class*="confetti"]') !== null, null, { timeout: 3000 }).catch(() => {});
      log('combo fired win after 3× krass');

      // (e) intensity from voice: stub the meter level, enable the setting, fire -> visual.intensity
      await panel.evaluate(() => {
        window.livefx.intensityFromVoice = true;
        window.livefx.meter.level = 0.7;
        window.livefx.meter.peak = 0.7;
      });
      assert.ok(await panel.isChecked('#intensity-voice'), 'checkbox reflects the setting');
      assert.equal(await panel.evaluate(() => window.livefx.voiceIntensity()), 3);
      await panel.evaluate(() => window.livefx.handleText('bruh', true, { source: 'Test' }));
      const loud = await sse.next('fire', 3000);
      assert.equal(loud.trigger.id, 'bruh');
      assert.equal(loud.trigger.visual.intensity, 3, 'loud voice -> intensity 3');
      assert.match(await panel.textContent('#log'), /BRUH\s+←\s+Test: „bruh“\s+· Intensität 3/);
      await panel.evaluate(() => {
        window.livefx.meter.level = 0.1;
        window.livefx.meter.peak = 0.1;
      });
      await panel.evaluate(() => window.livefx.handleText('lol', true, { source: 'Test' }));
      const quiet = await sse.next('fire', 3000);
      assert.equal(quiet.trigger.visual.intensity, 1, 'quiet voice -> intensity 1');
      await panel.evaluate(() => (window.livefx.intensityFromVoice = false));
      await panel.evaluate(() => window.livefx.handleText('fail', true, { source: 'Test' }));
      const off = await sse.next('fire', 3000);
      assert.equal(off.trigger.visual.intensity, undefined, 'setting off -> no intensity attached');
      assert.equal(await panel.evaluate(() => localStorage.getItem('livefx.intensityFromVoice')), '0');
      log('intensity from voice: 3 / 1 / off');
    } finally {
      sse.close();
    }

    // (f) combos persist in localStorage and survive a reload
    await panel.reload();
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.deepEqual(await panel.evaluate(() => window.livefx.combos.rules), [{ keywordTriggerId: 'wow', times: 3, withinMs: 10000, fireTriggerId: 'win' }]);
    assert.equal(await panel.locator('#chat-commands tr').count(), 1, 'commands reloaded from the server');
    assert.equal(await panel.inputValue('#chat-twitch-channel'), 'meinkanal');

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
