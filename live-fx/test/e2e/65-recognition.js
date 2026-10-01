// Robust recognition (1.2): settings persist across reloads and reach the matcher, reaction "sicher"
// ignores interim results, fuzzy hits offer a keyword suggestion, misses can be assigned/ignored,
// diagnostics + self-check render, and the mic meter starts with Chromium's fake media device.
// Every sub-scenario gets its own server + browser context; failures are collected and reported together.
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

async function openOverlay(ctx, base, errors) {
  const overlay = await ctx.newPage();
  overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
  await overlay.goto(`${base}/overlay.html`);
  await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
  return overlay;
}

/** Runs one sub-scenario with its own server and context. */
async function scenario(name, { browser, startServer, log }, fn) {
  const server = await startServer();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  try {
    await fn({ base: server.base, token: server.token, ctx, errors });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    log(`${name}: ok`);
    return null;
  } catch (e) {
    log(`${name}: FAILED – ${e && e.message ? e.message : e}`);
    return `${name}: ${e && e.stack ? e.stack : e}`;
  } finally {
    await ctx.close();
    await server.stop();
  }
}

async function run(h) {
  const { api, waitFor, shotDir } = h;
  const failures = [];
  const add = (f) => f && failures.push(f);

  // (a) settings persist across a reload and reach the matcher (tolerance getter = matcher package)
  add(
    await scenario('settings', h, async ({ base, ctx, errors }) => {
      let panel = await openPanel(ctx, base, errors);
      assert.equal(await panel.inputValue('#asr-tolerance'), 'medium', 'default tolerance is medium');
      assert.equal(await panel.inputValue('#asr-reaction'), 'fast', 'default reaction is fast');
      assert.equal(await panel.inputValue('#lang'), 'auto', 'default language');
      assert.equal(await panel.locator('#lang optgroup').count(), 3, 'three language groups');
      await panel.selectOption('#asr-tolerance', 'high');
      await panel.selectOption('#lang', 'de-AT');
      await panel.reload();
      await panel.waitForSelector('#pad button');
      await panel.evaluate(() => window.livefx.ready);
      assert.equal(await panel.inputValue('#asr-tolerance'), 'high', 'tolerance high restored');
      assert.equal(await panel.inputValue('#lang'), 'de-AT', 'language restored');
      assert.equal(await panel.textContent('#pill-lang-value'), 'de-AT', 'header pill shows the language');

      await panel.selectOption('#asr-tolerance', 'medium');
      await panel.selectOption('#asr-reaction', 'safe');
      await panel.check('#asr-restart');
      const s1 = await panel.evaluate(() => window.livefx.asrSettings);
      assert.equal(s1.tolerance, 'medium');
      assert.equal(s1.reaction, 'safe');
      assert.equal(s1.restart, true);
      await panel.reload();
      await panel.waitForSelector('#pad button');
      await panel.evaluate(() => window.livefx.ready);
      assert.equal(await panel.inputValue('#asr-tolerance'), 'medium', 'tolerance medium restored');
      assert.equal(await panel.inputValue('#asr-reaction'), 'safe', 'reaction safe restored');
      assert.ok(await panel.isChecked('#asr-restart'), 'restart checkbox restored');
      const s2 = await panel.evaluate(() => window.livefx.asrSettings);
      assert.equal(s2.reaction, 'safe');
      // header pill scrolls to the card (no error, card stays in the DOM)
      await panel.click('#pill-lang');
      assert.ok(await panel.locator('#asr-settings #lang').count(), '#lang lives in the recognition card');
      // depends on the matcher package (tolerance getter)
      const tol = await panel.evaluate(() => window.livefx.matcher.tolerance);
      assert.equal(tol, 'medium', `window.livefx.matcher.tolerance (matcher package) – got ${tol}`);
      panel = null;
    })
  );

  // (b) reaction "sicher": interim results never fire, final ones do
  add(
    await scenario('reaction-safe', h, async ({ base, ctx, errors }) => {
      const overlay = await openOverlay(ctx, base, errors);
      const fires = () => overlay.evaluate(() => window.livefx.renderer.stats.fires);
      const panel = await openPanel(ctx, base, errors);
      await panel.selectOption('#asr-reaction', 'safe');
      await panel.evaluate(() => window.livefx.handleText('krass', false, { source: 'Test' }));
      await sleep(600);
      assert.equal(await fires(), 0, 'interim result fired nothing in safe mode');
      assert.ok((await panel.textContent('#transcript')).includes('krass'), 'interim text still shown');
      await panel.evaluate(() => window.livefx.handleText('krass', true, { source: 'Test' }));
      await waitFor(async () => (await fires()) === 1, { timeoutMs: 3000, what: 'final result fired' });
      assert.match(await panel.textContent('#log'), /Test: „krass“/);
    })
  );

  // (c) fuzzy hit + learn button (needs the matcher package: fuzzy/spoken)
  add(
    await scenario('fuzzy-learn', h, async ({ base, ctx, errors }) => {
      const overlay = await openOverlay(ctx, base, errors);
      const fires = () => overlay.evaluate(() => window.livefx.renderer.stats.fires);
      const panel = await openPanel(ctx, base, errors);
      assert.equal(await panel.inputValue('#asr-tolerance'), 'medium');
      await panel.evaluate(() => window.livefx.handleText('das war grass', true, { source: 'Test' }));
      await waitFor(async () => (await fires()) === 1, { timeoutMs: 3000, what: 'fuzzy hit "grass" fired wow (matcher package)' });
      assert.ok((await panel.textContent('#transcript mark')).includes('grass'), 'spoken word highlighted');
      assert.match(await panel.textContent('#log'), /„grass“ \(≈ krass\)/);
      const btn = panel.locator('#fuzzy-suggest button');
      assert.equal(await btn.count(), 1, 'one suggestion');
      assert.ok((await btn.textContent()).includes('grass'), 'suggestion names the spoken word');
      assert.equal(await btn.getAttribute('data-trigger'), 'wow');
      await panel.screenshot({ path: path.join(shotDir, 'recognition.png'), fullPage: true });
      await btn.click();
      assert.equal(await panel.locator('#fuzzy-suggest button').count(), 0, 'suggestion removed after learning');
      assert.match(await panel.textContent('#log'), /📚 „grass“ → Mind blown gelernt/);
      assert.ok((await panel.inputValue('#trigger-rows tr[data-id="wow"] [data-f="keywords"]')).includes('grass'), 'row shows the new keyword');
      await waitFor(
        async () => {
          const r = await api(base, 'GET', '/api/triggers');
          const wow = r.json && r.json.triggers.find((t) => t.id === 'wow');
          return wow && wow.keywords.includes('grass');
        },
        { timeoutMs: 3000, what: 'grass in wow.keywords on the server' }
      );
    })
  );

  // (d) misses: chips + assign, ignore
  add(
    await scenario('misses', h, async ({ base, ctx, errors }) => {
      const overlay = await openOverlay(ctx, base, errors);
      const panel = await openPanel(ctx, base, errors);
      assert.ok(await panel.locator('#recog-learn').isHidden(), 'learning card hidden while empty');
      await panel.evaluate(() => window.livefx.handleText('kappa keepo', true, { source: 'Test' }));
      const li = panel.locator('#misses li');
      assert.equal(await li.count(), 1, 'one miss listed');
      assert.ok(await panel.locator('#recog-learn').isVisible(), 'learning card visible');
      assert.equal(await li.locator('button.chip').count(), 2, 'two word chips');
      await li.locator('button.chip[data-word="keepo"]').click();
      assert.ok(await li.locator('button.chip[data-word="keepo"]').evaluate((b) => b.classList.contains('sel')), 'chip selected');
      const firstOpt = await li.locator('[data-act="assign"] option').first().textContent();
      assert.match(firstOpt, /Trigger zuweisen/);
      await li.locator('[data-act="assign"]').selectOption('lol');
      assert.equal(await panel.locator('#misses li').count(), 0, 'miss removed after assignment');
      assert.match(await panel.textContent('#log'), /📚 „keepo“ → LOL gelernt/);
      await waitFor(
        async () => {
          const r = await api(base, 'GET', '/api/triggers');
          const lol = r.json && r.json.triggers.find((t) => t.id === 'lol');
          return lol && lol.keywords.includes('keepo');
        },
        { timeoutMs: 3000, what: 'keepo in lol.keywords on the server' }
      );
      await panel.evaluate(() => window.livefx.handleText('keepo', true, { source: 'Test' }));
      await overlay.waitForSelector('.fx-drop', { timeout: 3000 });
      assert.ok((await panel.textContent('#transcript mark')).includes('keepo'), 'learned keyword highlighted');

      // whole phrase (no chip selected) becomes the keyword
      await panel.evaluate(() => window.livefx.handleText('ganz ohne treffer', true, { source: 'Text' }));
      await panel.locator('#misses li [data-act="assign"]').selectOption('gg');
      assert.ok((await panel.evaluate(() => window.livefx.triggers.find((t) => t.id === 'gg').keywords)).includes('ganz ohne treffer'));

      // ignore: entry disappears and the same sentence never comes back
      await panel.evaluate(() => window.livefx.handleText('blubber blubb', true, { source: 'Test' }));
      assert.equal(await panel.locator('#misses li').count(), 1);
      await panel.locator('#misses li [data-act="ignore"]').click();
      assert.equal(await panel.locator('#misses li').count(), 0, 'ignored entry removed');
      await panel.evaluate(() => window.livefx.handleText('blubber blubb', true, { source: 'Test' }));
      await panel.evaluate(() => window.livefx.handleText('irgendwas', true, { source: 'Test' }));
      await panel.evaluate(() => window.livefx.handleText('blubber blubb', true, { source: 'Test' }));
      const texts = await panel.locator('#misses li').evaluateAll((els) => els.map((e) => e.textContent));
      assert.ok(!texts.some((t) => t.includes('blubber')), `ignored sentence must not reappear: ${texts.join(' | ')}`);
      assert.deepEqual(await panel.evaluate(() => window.livefx.asrSettings.ignored), ['blubber blubb']);
      // learnKeyword API: duplicates are skipped
      assert.equal(await panel.evaluate(() => window.livefx.learnKeyword('lol', ' keepo ')), false, 'duplicate keyword skipped');
      assert.equal(await panel.evaluate(() => window.livefx.learnKeyword('nope-id', 'x')), false, 'unknown trigger skipped');
    })
  );

  // (e) diagnostics, self-check timeout, mic meter with the fake media device
  add(
    await scenario('diagnostics', h, async ({ base, ctx, errors }) => {
      const panel = await openPanel(ctx, base, errors);
      assert.match(await panel.textContent('#diag-state'), /Zustand: (idle|listening|starting|restarting|unsupported|error)/);
      assert.match(await panel.textContent('#diag-latency'), /Matcher/);
      await panel.evaluate(() => window.livefx.handleText('hallo welt', true, { source: 'Test' }));
      assert.match(await panel.textContent('#diag-latency'), /Matcher \d+(,\d)? ms/, 'matcher timing rendered');

      // self-check with the external backend (no real Web Speech in headless Chromium)
      await panel.selectOption('#asr', 'external');
      await panel.click('#btn-selfcheck');
      assert.match(await panel.textContent('#selfcheck-status'), /Test: sag „krass“/);
      assert.ok(await panel.evaluate(() => window.livefx.selfCheck.active), 'self-check running');
      await waitFor(async () => /listening/.test(await panel.textContent('#diag-state')), { timeoutMs: 3000, what: 'ASR started by the self-check' });
      // a wrong sentence ends the check with ❌, then a fresh check + the right word gives ✅
      await panel.evaluate(() => window.livefx.handleText('irgendwas anderes', true, { source: 'Test' }));
      assert.match(await panel.textContent('#selfcheck-status'), /❌ verstanden/);
      await panel.click('#btn-selfcheck');
      await panel.evaluate(() => window.livefx.handleText('das ist krass', true, { source: 'Test' }));
      assert.match(await panel.textContent('#selfcheck-status'), /✅ „krass“ erkannt/);
      // timeout path (8 s window – triggered directly instead of waiting on real timers)
      await panel.click('#btn-selfcheck');
      await panel.evaluate(() => window.livefx.selfCheck.timeout());
      assert.match(await panel.textContent('#selfcheck-status'), /❌ (Mikro liefert kein Signal|nichts erkannt)/);
      assert.ok(!(await panel.evaluate(() => window.livefx.selfCheck.active)), 'self-check finished');

      // meter (asr package): starts with --use-fake-device-for-media-stream
      const meterOk = await panel.evaluate(async () => {
        if (!window.LiveFXMeter || typeof window.LiveFXMeter.create !== 'function') return 'missing';
        const m = window.LiveFXMeter.create();
        const ok = await m.start();
        m.stop();
        return ok;
      });
      assert.equal(meterOk, true, `LiveFXMeter.create().start() (asr package) – got ${meterOk}`);
      assert.ok(await panel.evaluate(() => !!window.livefx.meter), 'panel created a meter');
    })
  );

  if (failures.length) throw new Error(`${failures.length} sub-scenario(s) failed:\n${failures.join('\n\n')}`);
}

module.exports = { run };
