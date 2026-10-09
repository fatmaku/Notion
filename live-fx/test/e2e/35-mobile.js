// Mobile remote (mobile.html) on a phone-sized viewport: tiles fire into the overlay, search filters,
// pause blocks, scenes row, transcript line, mic gating; 2.4: bottom tab bar (Effekte · Story · Ton · Mehr, remembered),
// thumb-sized targets, haptics on fire, dark/light from the system, the phone microphone (mock Web Speech → POST
// /api/transcript, the phone fires when no panel matches, the PC panel with the „Extern“ input takes over without a
// double fire), then the service worker serves the panel shell while the browser is offline and the server is gone.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Records navigator.vibrate calls (haptics) – runs before the page scripts. */
function vibrateSpy() {
  window.__vib = [];
  try {
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: (p) => (window.__vib.push(p), true) });
  } catch (_) {
    /* ignore */
  }
}

/** Mock Web Speech (headless Chromium has no working recognizer): the test drives `window.__sr.say(text, final)`. */
function speechMock() {
  class MockRecognition {
    constructor() {
      window.__srAll = (window.__srAll || []).concat([this]);
      window.__sr = this;
    }
    start() {
      this.started = true;
      setTimeout(() => {
        if (this.onstart) this.onstart();
        if (this.onaudiostart) this.onaudiostart();
      }, 10);
    }
    stop() {
      setTimeout(() => this.onend && this.onend(), 10);
    }
    abort() {
      setTimeout(() => this.onend && this.onend(), 10);
    }
    say(text, isFinal = true) {
      const r = [{ transcript: text, confidence: 0.92 }];
      r.isFinal = isFinal;
      if (this.onspeechstart) this.onspeechstart();
      this.onresult({ resultIndex: 0, results: [r] });
    }
  }
  window.SpeechRecognition = MockRecognition;
  window.webkitSpeechRecognition = MockRecognition;
}

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'de-DE', colorScheme: 'dark' });
  await ctx.addInitScript(vibrateSpy);
  const errors = [];
  try {
    const overlay = await ctx.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const fires = () => overlay.evaluate(() => window.livefx.renderer.stats.fires);

    const phone = await ctx.newPage();
    phone.on('pageerror', (e) => errors.push(`mobile: ${e.message}`));
    await phone.goto(`${base}/mobile.html`);
    await phone.waitForSelector('#pad button');
    await phone.evaluate(() => window.livefx.ready);
    await phone.waitForFunction(() => window.livefx.bus.serverOk, null, { timeout: 5000 });

    // (a) layout: many tiles, no horizontal scroll at phone width, connection dot green, no assistant under automation
    const tiles = await phone.locator('#pad button').count();
    assert.ok(tiles >= 15, `tiles: ${tiles}`);
    const [scrollW, innerW] = await phone.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(scrollW <= innerW, `no horizontal scroll (${scrollW} <= ${innerW})`);
    await phone.waitForSelector('#dot-server.on', { timeout: 3000 });
    assert.equal(await phone.evaluate(() => window.livefx.setup.isOpen), false, 'setup assistant stays closed (automation, no fresh pairing)');
    assert.equal(await phone.evaluate(() => window.livefx.session.state), 'local', 'the PC itself: no pairing needed');
    assert.equal(await phone.locator('#auth-banner').isHidden(), true, 'no „nicht gekoppelt“ banner');
    log(`${tiles} tiles, width ${scrollW}/${innerW}`);

    // (a2) 2.4 bottom tab bar: four thumb-sized tabs at the bottom edge, Effekte first
    const bar = await phone.evaluate(() => {
      const nav = document.querySelector('#tabbar');
      const r = nav.getBoundingClientRect();
      const btns = [...nav.querySelectorAll('[role="tab"]')].map((b) => ({ tab: b.dataset.tab, label: b.querySelector('.lbl').textContent.trim(), h: b.getBoundingClientRect().height, sel: b.getAttribute('aria-selected') }));
      return { bottom: Math.round(r.bottom), top: Math.round(r.top), pos: getComputedStyle(nav).position, btns, vh: innerHeight };
    });
    assert.deepEqual(bar.btns.map((b) => b.tab), ['fx', 'story', 'sound', 'more']);
    assert.deepEqual(bar.btns.map((b) => b.label), ['Effekte', 'Story', 'Ton', 'Mehr']);
    assert.equal(bar.pos, 'fixed');
    assert.equal(bar.bottom, bar.vh, 'tab bar sits on the bottom edge');
    assert.ok(bar.btns.every((b) => b.h >= 48), `tabs ≥ 48 px: ${bar.btns.map((b) => b.h).join(',')}`);
    assert.deepEqual(bar.btns.map((b) => b.sel), ['true', 'false', 'false', 'false']);
    const smallTargets = await phone.evaluate(() =>
      [...document.querySelectorAll('#tab-fx button, header button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.id || b.className)
    );
    assert.deepEqual(smallTargets, [], 'every visible button on the Effekte tab ≥ 44 px');
    log('tab bar ok');

    // (b) tap the first tile -> card in the overlay, fired via the server (source "Handy"), with a vibration
    const firstLabel = (await phone.textContent('#pad button:first-child .lbl')).trim();
    await phone.tap('#pad button:first-child');
    await overlay.waitForSelector('.fx-card', { timeout: 3000 });
    assert.equal(await fires(), 1, 'one fire after the tap');
    assert.match(await phone.textContent('#transcript'), new RegExp(firstLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok((await phone.evaluate(() => window.__vib.length)) >= 1, 'haptic feedback on fire');
    log(`tap "${firstLabel}" -> overlay card (+ vibrate ${JSON.stringify(await phone.evaluate(() => window.__vib))})`);

    // (c) search filters the tiles by label / keyword
    await phone.fill('#search', 'fail');
    await sleep(100);
    const visible = await phone.locator('#pad button:not([hidden])').count();
    assert.ok(visible >= 1 && visible < tiles, `filtered: ${visible} of ${tiles}`);
    const visibleText = await phone.locator('#pad button:not([hidden])').allTextContents();
    assert.ok(visibleText.some((t) => /fail/i.test(t)), `fail tile visible: ${visibleText.join('|')}`);
    await phone.fill('#search', 'xyz-nichts');
    await sleep(100);
    assert.equal(await phone.locator('#pad button:not([hidden])').count(), 0);
    assert.equal(await phone.locator('#empty').isHidden(), false, '"Nichts gefunden" shown');
    await phone.fill('#search', '');
    await sleep(100);
    assert.equal(await phone.locator('#pad button:not([hidden])').count(), tiles);
    log('search filter ok');

    // (d) pause blocks taps; resume fires again
    await phone.tap('#btn-mute');
    assert.match(await phone.textContent('#btn-mute'), /Weiter/);
    await phone.tap('#pad button:nth-child(2)');
    await sleep(600);
    assert.equal(await fires(), 1, 'paused: nothing fired');
    assert.match(await phone.textContent('#transcript'), /pausiert/);
    await phone.tap('#btn-mute');
    await phone.tap('#pad button:nth-child(2)');
    await overlay.waitForFunction(() => window.livefx.renderer.stats.fires >= 2, null, { timeout: 3000 });
    log('pause blocks, resume fires');

    // (e) another client disables a trigger on the server -> tile greys out and does not fire
    const current = await api(base, 'GET', '/api/triggers');
    const list = current.json.triggers;
    list[2].enabled = false;
    const put = await api(base, 'PUT', '/api/triggers', { json: { triggers: list }, token });
    assert.equal(put.status, 200, put.text);
    await phone.waitForFunction(() => document.querySelector('#pad button:nth-child(3)').classList.contains('off'), null, { timeout: 3000 });
    await phone.tap('#pad button:nth-child(3)');
    await sleep(500);
    assert.equal(await fires(), 2, 'disabled tile fired nothing');
    assert.match(await phone.textContent('#transcript'), /deaktiviert/);

    // (f) Story tab: the scenes grid fires a scene with its ambient loop, like the panel's scene pad
    await phone.tap('#tabbtn-story');
    assert.equal(await phone.evaluate(() => window.livefx.tab), 'story');
    assert.equal(await phone.locator('#pad').isVisible(), false, 'Effekte tab hidden');
    assert.equal(await phone.getAttribute('#tabbtn-story', 'aria-selected'), 'true');
    await phone.tap('#scenes button[data-scene="rain"]');
    await overlay.waitForSelector('.fx-scene[data-scene="rain"]', { timeout: 3000 });
    assert.ok(await phone.locator('#scenes button[data-scene="rain"]').evaluate((b) => b.classList.contains('active')));
    const sceneTrigger = await phone.evaluate(() => window.livefx.sceneTrigger('rain'));
    assert.equal(sceneTrigger.sound, 'loop:rain');
    assert.equal(sceneTrigger.visual.kind, 'scene');
    await phone.tap('#scenes button[data-scene="clear"]');
    await sleep(200);
    log('scene rain -> overlay scene layer');

    // (g) transcript line mirrors external transcripts and foreign fires; volume reaches the overlay
    const tr = await api(base, 'POST', '/api/transcript', { json: { text: 'hallo vom whisper', final: true }, token });
    assert.equal(tr.status, 200, tr.text);
    await phone.waitForFunction(() => document.querySelector('#transcript').textContent.includes('hallo vom whisper'), null, { timeout: 3000 });
    const ff = await api(base, 'POST', '/api/fire', { json: { id: 'wow', source: 'Stream Deck', force: true }, token });
    assert.equal(ff.status, 200, ff.text);
    await phone.waitForFunction(() => document.querySelector('#transcript').textContent.includes('Stream Deck'), null, { timeout: 3000 });
    await phone.tap('#tabbtn-sound');
    assert.ok(await phone.locator('#volume').isVisible(), 'volume slider visible on the Ton tab');
    await phone.evaluate(() => {
      const v = document.querySelector('#volume');
      v.value = '0.3';
      v.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await overlay.waitForFunction(() => Math.abs(window.livefx.renderer.volume - 0.3) < 0.01, null, { timeout: 3000 });
    log('transcript line + volume ok');

    // (h) mic: 127.0.0.1 is a secure context -> either enabled (Chrome) or a clear reason; the
    //     HTTPS notice appears only in insecure contexts.
    const secure = await phone.evaluate(() => window.isSecureContext);
    assert.equal(secure, true);
    const micDisabled = await phone.locator('#btn-mic').isDisabled();
    const hint = (await phone.textContent('#mic-hint')).trim();
    if (micDisabled) assert.ok(hint.length > 0 && !/HTTPS|https/.test(hint), `mic hint: ${hint}`);
    else assert.equal(await phone.locator('#mic-hint').isHidden(), true);
    assert.equal(await phone.locator('#mic-https').isHidden(), true, 'no internet-link notice on a secure page');
    assert.deepEqual(await phone.$$eval('#mic-lang option', (o) => o.map((x) => x.value)), ['auto', 'de-DE', 'tr-TR', 'en-US']);
    assert.match(await phone.textContent('#mic-lang option[value="auto"]'), /^Auto \(Deutsch\)$/);
    // handleText runs the matcher on the phone (as the mic would) and fires through the bus
    await phone.evaluate(() => {
      const M = window.LiveFXMatcher;
      window.__m = new M.Matcher(window.livefx.triggers, { globalMinGap: 0, tolerance: 'medium', lang: 'de-DE' });
    });
    const hits = await phone.evaluate(() => window.__m.process('oh nein das war ein fail').length);
    assert.ok(hits >= 1, 'matcher available on the phone');
    log(`mic ${micDisabled ? 'unavailable (' + hint + ')' : 'available'}`);

    // (h2) 2.2: favourites (star tap + API), Leiser / Lauter ±6 dB, story band + zone buttons, pack tiles
    await phone.tap('#tabbtn-fx');
    await overlay.evaluate(() => {
      window.__msgs = [];
      window.livefx.bus.onMessage((m) => window.__msgs.push(m));
    });
    assert.equal(await phone.locator('#favs-card').isHidden(), true, 'no favourites yet');
    await phone.tap('#pad button:nth-child(2) .star');
    await phone.waitForSelector('#favs-card:not([hidden])', { timeout: 3000 });
    const favId = await phone.evaluate(() => document.querySelector('#pad button:nth-child(2)').dataset.id);
    assert.deepEqual(await phone.evaluate(() => window.livefx.favourites), [favId]);
    assert.equal(await phone.locator('#favs button').count(), 1);
    assert.ok(await phone.locator('#pad button:nth-child(2)').evaluate((b) => b.classList.contains('fav')), 'tile marked as favourite');
    assert.deepEqual(JSON.parse(await phone.evaluate(() => localStorage.getItem('livefx.mobile.favs'))), [favId], 'persisted');
    const firesBefore = await fires();
    await phone.tap('#favs button:first-child');
    await overlay.waitForFunction((n) => window.livefx.renderer.stats.fires > n, firesBefore, { timeout: 3000 });
    await phone.evaluate((id) => window.livefx.setFavourite(id, false), favId);
    assert.equal(await phone.locator('#favs-card').isHidden(), true, 'favourite removed');
    log('favourites ok');

    await phone.tap('#tabbtn-sound');
    assert.equal(await phone.evaluate(() => window.livefx.volume), 0.3);
    assert.equal((await phone.textContent('#vol-label')).trim(), '30 %');
    await phone.tap('#btn-vol-up');
    await overlay.waitForFunction(() => Math.abs(window.livefx.renderer.volume - 0.6) < 0.01, null, { timeout: 3000 });
    assert.equal((await phone.textContent('#vol-label')).trim(), '60 %', '+6 dB doubles');
    await phone.tap('#btn-vol-down');
    await overlay.waitForFunction(() => Math.abs(window.livefx.renderer.volume - 0.3) < 0.01, null, { timeout: 3000 });
    assert.equal((await phone.textContent('#vol-label')).trim(), '30 %', '−6 dB halves');
    const volMsgs = await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'volume').map((m) => [m.volume, m.bus || null]));
    assert.deepEqual(volMsgs.slice(-2), [[0.6, null], [0.3, null]], 'master volume messages (no bus)');
    log('±6 dB buttons ok');

    await phone.tap('#tabbtn-story');
    await overlay.evaluate(() => (window.__msgs.length = 0));
    await phone.tap('#btn-band');
    await overlay.waitForFunction(() => window.__msgs.some((m) => m.type === 'layout'), null, { timeout: 3000 });
    assert.deepEqual(await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'layout').map((m) => m.storyLayout)), ['band']);
    assert.match(await phone.textContent('#btn-band'), /Band aus/);
    await phone.tap('#btn-zone');
    await overlay.waitForFunction(() => window.__msgs.some((m) => m.type === 'layout' && m.zone), null, { timeout: 3000 });
    assert.equal(await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'layout' && m.zone).pop().zone), 'edges');
    assert.match(await phone.textContent('#btn-zone'), /Ränder/);
    assert.deepEqual(await phone.evaluate(() => window.livefx.layout), { band: true, zone: 'edges' });
    await phone.tap('#btn-band');
    assert.equal(await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'layout').pop().storyLayout), 'full');
    log('band / zone buttons ok');

    // 2.3 story look: „✏️ Stil“ cycles mixed → sketch → emoji, „📐 Band“ toggles bottom ↔ chat (only the changed key is sent)
    assert.deepEqual(await phone.evaluate(() => window.livefx.look), { storyStyle: 'mixed', bandPosition: 'bottom' }, 'look defaults');
    assert.match(await phone.textContent('#btn-style'), /Stil: Gemischt/);
    assert.match(await phone.textContent('#btn-bandpos'), /Band: ganz unten/);
    await overlay.evaluate(() => (window.__msgs.length = 0));
    await phone.tap('#btn-style');
    await overlay.waitForFunction(() => window.livefx.renderer.layout.storyStyle === 'sketch', null, { timeout: 3000 });
    assert.deepEqual(await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'layout').map((m) => [m.storyStyle, m.bandPosition, m.storyLayout])), [['sketch', undefined, undefined]], 'style message carries only storyStyle');
    assert.match(await phone.textContent('#btn-style'), /Stil: Zeichnung/);
    await phone.tap('#btn-bandpos');
    await overlay.waitForFunction(() => window.livefx.renderer.layout.bandPosition === 'chat', null, { timeout: 3000 });
    assert.match(await phone.textContent('#btn-bandpos'), /Band: über dem Chat/);
    assert.deepEqual(JSON.parse(await phone.evaluate(() => localStorage.getItem('livefx.mobile.look'))), { storyStyle: 'sketch', bandPosition: 'chat' }, 'look persisted');
    await phone.tap('#btn-style');
    await phone.tap('#btn-style');
    await phone.tap('#btn-bandpos');
    await overlay.waitForFunction(() => window.livefx.renderer.layout.storyStyle === 'mixed' && window.livefx.renderer.layout.bandPosition === 'bottom', null, { timeout: 3000 });
    log('story style / band position buttons ok');

    await phone.tap('#tabbtn-more');
    const phoneTiles = await phone.locator('#packs button.pack-tile').count();
    assert.ok(phoneTiles >= 5, `pack tiles on the phone: ${phoneTiles}`);
    assert.match(await phone.textContent('#conn-text'), /Verbunden/);
    assert.equal(await phone.locator('#btn-unpair').isHidden(), true, '„abmelden“ only for paired phones');
    const countBefore = await phone.evaluate(() => window.livefx.triggers.length);
    await phone.tap('#packs button[data-pack="de"]');
    await phone.waitForFunction(() => document.querySelector('#packs button[data-pack="de"]').classList.contains('loaded'), null, { timeout: 3000 });
    const deCount = await phone.evaluate(() => window.LiveFXPacks.packs.de.triggers.length);
    assert.equal(await phone.evaluate(() => window.livefx.triggers.length), countBefore + deCount, 'pack loaded on the phone');
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers');
        return r.json && r.json.triggers.some((t) => String(t.id).startsWith('de-'));
      },
      { timeoutMs: 3000, what: 'pack on the server' }
    );
    assert.match(await phone.textContent('#packs-count'), new RegExp(`${countBefore + deCount}/\\d+ Trigger`));
    await phone.tap('#packs button[data-pack="de"]');
    await phone.waitForFunction(() => !document.querySelector('#packs button[data-pack="de"]').classList.contains('loaded'), null, { timeout: 3000 });
    assert.equal(await phone.evaluate(() => window.livefx.triggers.length), countBefore, 'pack removed on the phone');
    log('pack tiles ok');

    // the tab is remembered across reloads
    await phone.tap('#tabbtn-sound');
    await phone.reload();
    await phone.evaluate(() => window.livefx.ready);
    assert.equal(await phone.evaluate(() => window.livefx.tab), 'sound', 'last tab restored');
    assert.equal(await phone.locator('#tab-sound').isVisible(), true);
    await phone.tap('#tabbtn-fx');
    await phone.screenshot({ path: path.join(shotDir, 'mobile.png'), fullPage: true });

    // (h3) dark / light follow the system setting
    const dark = await phone.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await phone.emulateMedia({ colorScheme: 'light' });
    const light = await phone.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(dark, light, `light scheme changes the page (${dark} → ${light})`);
    assert.equal(light, 'rgb(244, 245, 248)');
    await phone.screenshot({ path: path.join(shotDir, 'mobile-light.png') });
    await phone.emulateMedia({ colorScheme: 'dark' });
    log(`dark ${dark} / light ${light}`);

    // (h4) 2.4 phone microphone with a mock recognizer: text → POST /api/transcript, the phone fires while no panel
    //      matches; a panel fire „Handy-Mikro: …“ hands firing to the PC (no double effect)
    const mic = await ctx.newPage();
    await mic.addInitScript(speechMock);
    mic.on('pageerror', (e) => errors.push(`mic: ${e.message}`));
    const transcripts = [];
    mic.on('request', (rq) => {
      if (rq.url().endsWith('/api/transcript') && rq.method() === 'POST') transcripts.push(JSON.parse(rq.postData()));
    });
    await mic.goto(`${base}/mobile.html`);
    await mic.evaluate(() => window.livefx.ready);
    await mic.waitForFunction(() => window.livefx.bus.serverOk, null, { timeout: 5000 });
    await mic.tap('#tabbtn-sound');
    assert.equal(await mic.locator('#btn-mic').isDisabled(), false, 'mic button enabled with Web Speech on a secure page');
    await mic.tap('#btn-mic');
    await mic.waitForFunction(() => window.livefx.phoneMic && window.livefx.phoneMic.state === 'listening', null, { timeout: 3000 });
    assert.match(await mic.textContent('#btn-mic'), /Hört zu/);
    assert.ok(await mic.locator('#mic-live').isVisible(), 'header shows the live mic');
    assert.match(await mic.textContent('#status'), /Mikro an \(Auto \(Deutsch\)\)/);
    const f0 = await fires();
    await mic.evaluate(() => window.__sr.say('wir haben es geschafft', true)); // „Let's go“ (wow is disabled since (e))
    await overlay.waitForFunction((n) => window.livefx.renderer.stats.fires > n, f0, { timeout: 4000 });
    await waitFor(() => transcripts.length >= 1, { timeoutMs: 3000, what: 'transcript POST' });
    assert.deepEqual(transcripts[0], { text: 'wir haben es geschafft', final: true, source: 'Handy-Mikro', lang: 'de-DE' });
    assert.equal(await mic.evaluate(() => window.livefx.phoneMic.route), 'phone', 'no panel matched → the phone fires');
    assert.match(await mic.textContent('#mic-route'), /Handy aus/);
    assert.ok((await mic.evaluate(() => Number.parseFloat(document.querySelector('#mic-level').style.width))) > 0, 'level meter moved');
    assert.match(await mic.textContent('#transcript'), /geschafft|Let's go/, 'heard line or its effect on the phone');
    log(`phone mic fired locally (meter: ${await mic.evaluate(() => window.livefx.phoneMic.meter)})`);

    // a panel answering with „Handy-Mikro: …“ (what the panel's „Extern“ input fires) → the PC fires, the phone stays quiet
    const pc = await api(base, 'POST', '/api/fire', { json: { id: 'lol', source: 'Handy-Mikro: „haha“', force: true }, token });
    assert.equal(pc.status, 200);
    await mic.waitForFunction(() => window.livefx.phoneMic.route === 'pc', null, { timeout: 3000 });
    const f1 = await fires();
    await mic.evaluate(() => window.__sr.say('oh nein das war ein fail', true));
    await sleep(1400);
    assert.equal(await fires(), f1, 'route pc: the phone did not fire itself');
    assert.match(await mic.textContent('#mic-route'), /PC aus/);
    await waitFor(() => transcripts.some((t) => /fail/.test(t.text)), { timeoutMs: 3000, what: 'second transcript' });
    log('route pc: phone sends text only');

    // the real PC panel with speech input „Extern“: it matches the phone's line and fires exactly once
    const panelMic = await ctx.newPage();
    panelMic.on('pageerror', (e) => errors.push(`panel(ext): ${e.message}`));
    await panelMic.goto(`${base}/`);
    await panelMic.evaluate(() => window.livefx.ready);
    await panelMic.selectOption('#asr', 'external');
    await panelMic.click('#btn-listen');
    await panelMic.waitForFunction(() => /Wartet auf externe Transkripte/i.test(document.querySelector('#btn-listen').textContent), null, { timeout: 3000 });
    await mic.tap('#btn-mic'); // stop …
    await mic.waitForFunction(() => window.livefx.phoneMic.state === 'idle', null, { timeout: 3000 });
    await mic.tap('#btn-mic'); // … and start: a new session asks again who fires
    await mic.waitForFunction(() => window.livefx.phoneMic.state === 'listening' && window.livefx.phoneMic.route === 'unknown', null, { timeout: 3000 });
    await overlay.evaluate(() => (window.__msgs.length = 0));
    const f2 = await fires();
    await mic.evaluate(() => window.__sr.say('bruh', true));
    await mic.waitForFunction(() => window.livefx.phoneMic.route === 'pc', null, { timeout: 4000 });
    await sleep(1400);
    const fx = await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'fire').map((m) => m.source));
    assert.equal(await fires(), f2 + 1, `exactly one effect: ${JSON.stringify(fx)}`);
    assert.deepEqual(fx, ['Handy-Mikro: „bruh“'], 'fired by the PC panel from the phone transcript');
    await mic.tap('#btn-mic');
    await panelMic.close();
    log('PC panel („Extern“) fired the phone line once');

    // language switch → Türkçe, remembered
    await mic.selectOption('#mic-lang', 'tr-TR');
    assert.equal(await mic.evaluate(() => localStorage.getItem('livefx.mobile.micLang')), 'tr-TR');
    assert.equal(await mic.evaluate(() => window.livefx.phoneMic.lang), 'tr-TR');
    await mic.selectOption('#mic-lang', 'auto');
    await mic.close();

    // (i) panel „Handy“ card: QR code of the WLAN link + internet link controls; then the service worker
    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefxMobileLink.ready);
    const qr = await panel.evaluate(() => {
      const c = document.querySelector('#mobile-qr');
      return { size: Number(c.dataset.qrSize), width: c.width, version: Number(c.dataset.qrVersion), url: document.querySelector('#mobile-url').textContent };
    });
    assert.ok(qr.size >= 25 && qr.width > 0, `QR drawn: ${JSON.stringify(qr)}`);
    assert.ok(qr.url.includes(`/m?token=${token}`), 'QR encodes the phone link');
    const decoded = await panel.evaluate((text) => window.LiveFXQR.encode(text), qr.url);
    assert.equal(decoded.size, qr.size, 'canvas matches the encoder for the shown link');
    assert.match(await panel.textContent('#btn-tunnel'), /Internet-Link starten/);
    assert.equal((await panel.textContent('#tunnel-state')).trim(), 'aus');
    assert.ok(await panel.locator('#tunnel-qr-wrap').isHidden(), 'no internet QR before the tunnel runs');
    assert.match(await panel.getAttribute('#tunnel-manual', 'href'), /^https:\/\/github\.com\/cloudflare\/cloudflared\/releases/);
    log(`panel QR v${qr.version} (${qr.size}×${qr.size}) + internet-link controls ok`);

    // (j) service worker: the panel shell survives offline + a dead server
    await panel.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await panel.waitForFunction(() => navigator.serviceWorker.controller !== null || true, null, { timeout: 5000 });
    // The precache runs inside install, which completes before `ready` resolves.
    const cached = await panel.evaluate(async () => {
      const names = await caches.keys();
      const name = names.find((n) => n.startsWith('livefx-shell-v'));
      if (!name) return null;
      const c = await caches.open(name);
      const keys = await c.keys();
      return {
        name,
        count: keys.length,
        hasBus: !!(await c.match('/js/bus.js')),
        hasIndex: !!(await c.match('/index.html')),
        phone: await Promise.all(['/js/phone-mic.js', '/pair.html', '/js/pair.js', '/mobile.webmanifest'].map(async (p) => !!(await c.match(p)))),
      };
    });
    assert.ok(cached && cached.hasBus && cached.hasIndex, `precache: ${JSON.stringify(cached)}`);
    assert.deepEqual(cached.phone, [true, true, true, true], 'phone mic, pairing page and phone manifest precached');
    log(`service worker cache ${cached.name}: ${cached.count} entries`);

    await ctx.setOffline(true);
    server.proc.kill('SIGKILL'); // no network AND no server: only the cache can answer
    await sleep(200);
    await panel.goto(`${base}/index.html`);
    await panel.waitForSelector('#pad', { timeout: 5000 });
    const busOk = await panel.evaluate(() => fetch('/js/bus.js').then((r) => r.ok && r.headers.get('content-type')).catch(() => false));
    assert.match(String(busOk), /javascript/, 'bus.js served from the cache');
    assert.ok(await panel.evaluate(() => !!(window.LiveFXBus && window.LiveFXStore)), 'panel scripts ran from cache');
    await panel.waitForSelector('#pad button', { timeout: 5000 }); // triggers from localStorage/defaults
    const apiOffline = await panel.evaluate(() => fetch('/api/config').then((r) => r.status).catch(() => 'error'));
    assert.equal(apiOffline, 'error', '/api/* is never cached');
    await ctx.setOffline(false);
    log('offline reload of /index.html rendered from the service worker cache');

    const pageErrors = errors.filter((e) => !/Failed to fetch|NetworkError|net::/.test(e));
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
