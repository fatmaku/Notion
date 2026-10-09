// Phone first setup (2.4): the pairing page pair.html (big states: verbinde … / ✔ verbunden / ✖ Code schon benutzt,
// typed 6-digit fallback, DE/TR/EN, home-screen tip, redirect), then a real phone in the WLAN (390×844, iPhone, via the
// LAN address – not loopback) opens a real pairing link from POST /api/pairing → /mobile.html → the setup assistant
// opens by itself (fresh device): ① verbunden ② choose a pack (reaches the server) ③ test effect (warns without an
// overlay, then reaches the overlay page and counts it) ④ how-to → done; re-open from „Mehr“. Plus: the phone mic on the
// plain-http WLAN link explains the internet link and its ONE button switches to the https pairing link, „Weiteres Handy
// koppeln“ shows a pairing QR that a second phone redeems, a revoked phone shows the „nicht gekoppelt“ banner, and
// „abmelden“ removes the device. Screenshots of every pair.html state and the four assistant steps at 390 px.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');
const QR = require('../../js/qr.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const TUNNEL = 'https://brave-otter-test.trycloudflare.com';
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'de-DE', colorScheme: 'dark' };

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer({ env: { HOST: '0.0.0.0' } });
  const { base, token } = server;
  const shot = (page, name, opts) => page.screenshot({ path: path.join(shotDir, `39-${name}.png`), ...(opts || {}) });
  const newCode = async (next) => {
    const r = await api(base, 'POST', '/api/pairing', { token, json: next ? { next } : {} });
    assert.equal(r.status, 200, r.text);
    return r.json.pairing;
  };
  const secretOf = (url) => String(url).split('#')[1];
  const errors = [];
  const pc = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pairCtx = await browser.newContext({ ...PHONE, userAgent: ANDROID_UA });
  const phoneCtx = await browser.newContext({ ...PHONE, userAgent: IPHONE_UA });
  const phone2Ctx = await browser.newContext({ ...PHONE, userAgent: ANDROID_UA });
  try {
    const first = await newCode();
    const lan = first.lanUrl ? first.lanUrl.replace(/\/p.*$/, '') : null;
    const pServes = lan ? await (await fetch(`${lan}/p`)).text() : '';
    log(`LAN ${lan || '– (no LAN address: local fallback)'}; /p serves ${/name="livefx-page" content="pair"/.test(pServes) ? 'pair.html' : 'the built-in pairing page'}`);

    // ------------------------------------------------------------ (a) pair.html states (on this PC, separate browser)
    const pp = await pairCtx.newPage();
    pp.on('pageerror', (e) => errors.push(`pair: ${e.message}`));
    // no secret on the PC itself → „Du bist am PC“ (+ the code form on request)
    await pp.goto(`${base}/pair.html`);
    await pp.waitForFunction(() => window.livefxPair && window.livefxPair.state !== 'busy');
    assert.equal(await pp.evaluate(() => window.livefxPair.state), 'local');
    assert.match(await pp.textContent('[data-state-view="local"] h1'), /Du bist am PC/);
    assert.equal(await pp.locator('#pair-form').isHidden(), true, 'no code form on the PC by default');
    await shot(pp, 'pair-local');

    // busy → ok: the QR link (#secret) is redeemed, the secret leaves the address bar, then the remote opens
    const c1 = await newCode();
    await pp.route('**/api/pair', async (r) => {
      await sleep(1200); // keep „Verbinde …“ on screen for the screenshot
      await r.continue().catch(() => {});
    });
    await pp.goto(`${base}/pair.html#${secretOf(c1.url)}`);
    await pp.waitForSelector('[data-state-view="busy"]:not([hidden])');
    assert.equal(new URL(pp.url()).hash, '', 'secret removed from the address bar at once');
    assert.match(await pp.textContent('[data-state-view="busy"] h1'), /Verbinde/);
    await shot(pp, 'pair-busy');
    await pp.waitForSelector('[data-state-view="ok"]:not([hidden])', { timeout: 5000 });
    await pp.unroute('**/api/pair');
    assert.match(await pp.textContent('#pair-ok-title'), /Verbunden!/);
    assert.match(await pp.textContent('#pair-device'), /Android · Chrome/);
    assert.equal(await pp.getAttribute('#pair-go', 'href'), '/mobile.html');
    assert.match(await pp.textContent('#pair-countdown'), /Geht in \d s automatisch weiter/);
    assert.ok(await pp.locator('#pair-a2hs').isVisible(), 'home-screen tip');
    assert.match(await pp.textContent('#pair-a2hs-text'), /⋮.*Zum Startbildschirm hinzufügen/);
    assert.ok(Number(await pp.evaluate(() => localStorage.getItem('livefx.mobile.justPaired'))) > 0, 'fresh pairing remembered for the assistant');
    await shot(pp, 'pair-ok');
    // tapping the tip pauses the automatic redirect; „Weiter“ opens the remote
    await pp.tap('#pair-a2hs');
    assert.match(await pp.textContent('#pair-countdown'), /Tippe auf „Weiter“/);
    await sleep(300);
    await pp.tap('#pair-go');
    await pp.waitForURL(/\/mobile\.html/, { timeout: 5000 });
    await pp.evaluate(() => window.livefx.ready);
    assert.equal(await pp.evaluate(() => window.livefx.setup.isOpen), true, 'assistant opens after a fresh pairing (justPaired)');
    assert.equal(await pp.evaluate(() => localStorage.getItem('livefx.mobile.justPaired')), null, 'flag consumed');
    log('pair.html: local → busy → ok → remote with assistant');

    // the same QR again → „schon benutzt“ with what to do, the code form below; Türkçe switch
    await pp.goto(`${base}/pair.html#${secretOf(c1.url)}`);
    await pp.waitForSelector('[data-state-view="error"]:not([hidden])', { timeout: 5000 });
    assert.equal(await pp.evaluate(() => window.livefxPair.error), 'used');
    assert.match(await pp.textContent('#pair-err-title'), /schon benutzt/);
    assert.match(await pp.textContent('#pair-err-text'), /Panel/);
    assert.ok(await pp.locator('#pair-form').isVisible(), 'code form offered after an error');
    await shot(pp, 'pair-error');
    await pp.tap('[data-lang="tr"]');
    assert.match(await pp.textContent('#pair-err-title'), /zaten kullanıldı/);
    assert.equal(await pp.evaluate(() => document.documentElement.lang), 'tr');
    await shot(pp, 'pair-error-tr');
    await pp.tap('[data-lang="en"]');
    assert.match(await pp.textContent('#pair-err-title'), /already used/);
    await pp.tap('[data-lang="de"]');

    // typed fallback: a wrong code → „Code stimmt nicht“; the right one (typed with a space) pairs and redirects
    await pp.fill('#pair-code', '');
    await pp.type('#pair-code', '12345');
    assert.equal(await pp.inputValue('#pair-code'), '123 45', 'digits grouped like in the panel');
    await pp.tap('#pair-submit');
    assert.match(await pp.textContent('#pair-msg'), /6 Ziffern/);
    const c2 = await newCode();
    const wrong = c2.code === '000000' ? '111111' : '000000';
    await pp.fill('#pair-code', wrong);
    await pp.waitForFunction(() => window.livefxPair.error === 'invalid_code', null, { timeout: 5000 });
    assert.match(await pp.textContent('#pair-err-title'), /Code stimmt nicht/);
    assert.equal(await pp.getAttribute('#pair-code', 'aria-invalid'), 'true');
    await pp.fill('#pair-code', '');
    await pp.type('#pair-code', `${c2.code.slice(0, 3)} ${c2.code.slice(3, 5)}`);
    await shot(pp, 'pair-code');
    await pp.type('#pair-code', c2.code.slice(5)); // the 6th digit submits by itself
    await pp.waitForSelector('[data-state-view="ok"]:not([hidden])', { timeout: 5000 });
    assert.match(await pp.textContent('#pair-ok-title'), /Wieder verbunden|Verbunden/);
    await pp.waitForURL(/\/mobile\.html/, { timeout: 8000 }); // automatic countdown
    log('pair.html: used / TR / EN / wrong code / typed code → redirect');

    // ------------------------------------------------------------ (b) the real phone in the WLAN
    const overlayPage = await pc.newPage();
    overlayPage.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    const phone = await phoneCtx.newPage();
    phone.on('pageerror', (e) => errors.push(`phone: ${e.message}`));
    phone.on('dialog', (d) => d.accept());
    const link = lan ? (await newCode()).lanUrl : null;
    if (link) {
      assert.ok(!link.includes(token), 'no master token in the pairing link');
      await phone.goto(link);
      await phone.waitForURL(/\/mobile\.html/, { timeout: 10000 });
    } else {
      await phone.goto(`${base}/mobile.html?setup=1`); // no LAN address on this machine
    }
    await phone.evaluate(() => window.livefx.ready);
    await phone.waitForFunction(() => window.livefx.bus.serverOk, null, { timeout: 5000 });
    const sess = await phone.evaluate(() => window.livefx.session);
    if (link) {
      assert.equal(sess.state, 'paired', 'phone holds a paired-device cookie');
      assert.equal(sess.device.name, 'iPhone · Safari');
      assert.equal(await phone.evaluate(() => window.isSecureContext), false, 'plain http in the WLAN');
    }
    // the assistant opened by itself (fresh device – even under automation)
    await phone.waitForSelector('#setup:not([hidden])', { timeout: 5000 });
    assert.equal(await phone.evaluate(() => window.livefx.setup.step), 0);
    await phone.waitForFunction(() => /Verbunden/.test(document.querySelector('#setup-conn-title').textContent), null, { timeout: 5000 });
    if (link) assert.match(await phone.textContent('#setup-device'), /Gekoppelt als „iPhone · Safari“/);
    const noScroll = await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    assert.ok(noScroll, 'no horizontal page scroll with the assistant open');
    assert.equal(await phone.locator('#setup-back').isHidden(), true, 'no „Zurück“ on step 1');
    await shot(phone, 'setup-1');

    // ② swipe → packs; choose Türkçe → loaded on the phone and on the server
    await phone.evaluate(() => {
      const t = document.querySelector('#setup-track');
      t.dispatchEvent(new Event('touchstart'));
      t.scrollTo({ left: t.clientWidth, behavior: 'instant' });
    });
    await phone.waitForFunction(() => window.livefx.setup.step === 1, null, { timeout: 3000 });
    assert.ok(await phone.locator('#setup-dots span:nth-child(2)').evaluate((d) => d.classList.contains('on')), 'dot 2 active');
    const packCount = await phone.locator('#setup-packs .pack-tile').count();
    assert.ok(packCount >= 5, `pack tiles in the assistant: ${packCount}`);
    await phone.tap('#setup-packs [data-pack="tr"]');
    await phone.waitForFunction(() => document.querySelector('#setup-packs [data-pack="tr"]').classList.contains('loaded'), null, { timeout: 3000 });
    assert.match(await phone.textContent('#setup-packs-count'), /1 Paket geladen/);
    await waitFor(
      async () => {
        const r = await api(base, 'GET', '/api/triggers', { token });
        return r.json && r.json.triggers.some((t) => String(t.id).startsWith('tr-'));
      },
      { timeoutMs: 4000, what: 'Türkçe pack on the server' }
    );
    await shot(phone, 'setup-2');
    log(`assistant ① → ② (swipe), Türkçe pack saved from the phone (${packCount} packs offered)`);

    // ③ test effect: first no overlay → warning; with the overlay page open → it shows „📱 HANDY ✔“
    await phone.tap('#setup-next');
    await phone.waitForFunction(() => window.livefx.setup.step === 2, null, { timeout: 3000 });
    await sleep(500); // smooth scroll
    await phone.tap('#setup-test');
    await phone.waitForFunction(() => document.querySelector('#setup-test-result').className.includes('warn'), null, { timeout: 4000 });
    assert.match(await phone.textContent('#setup-test-result'), /kein Overlay offen/);
    await overlayPage.goto(`${base}/overlay.html`);
    await overlayPage.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await sleep(300);
    await phone.tap('#setup-test');
    await overlayPage.waitForSelector('.fx-card', { timeout: 4000 });
    assert.match(await overlayPage.textContent('.fx-card'), /HANDY ✔/);
    await phone.waitForFunction(() => document.querySelector('#setup-test-result').className.includes('ok'), null, { timeout: 4000 });
    assert.match(await phone.textContent('#setup-test-result'), /Angekommen! Ein Overlay zeigt/);
    await shot(phone, 'setup-3');
    await overlayPage.screenshot({ path: path.join(shotDir, '39-overlay-test-effect.png') });
    log('assistant ③: warning without overlay, then the test effect reached the overlay');

    // ④ how-to → „Los geht’s“ closes for good
    await phone.tap('#setup-next');
    await phone.waitForFunction(() => window.livefx.setup.step === 3, null, { timeout: 3000 });
    await sleep(500);
    assert.match(await phone.textContent('#setup-next'), /Los geht/);
    assert.match(await phone.textContent('#setup-step-4'), /Lange drücken = ⭐ Favorit/);
    assert.match(await phone.textContent('#setup-a2hs'), /Teilen.*Zum Home-Bildschirm/, 'iPhone gets the Safari tip');
    await shot(phone, 'setup-4');
    await phone.tap('#setup-back');
    await phone.waitForFunction(() => window.livefx.setup.step === 2, null, { timeout: 3000 });
    await phone.tap('#setup-next');
    await phone.waitForFunction(() => window.livefx.setup.step === 3, null, { timeout: 3000 });
    await sleep(400);
    await phone.tap('#setup-next');
    await phone.waitForSelector('#setup', { state: 'hidden', timeout: 3000 });
    assert.equal(await phone.evaluate(() => localStorage.getItem('livefx.mobile.setup.done')), '1');
    assert.equal(await phone.evaluate(() => window.livefx.tab), 'fx');
    assert.match(await phone.textContent('#transcript'), /Fertig!/);
    // reload: stays closed; „Mehr“ → „Einrichtung nochmal zeigen“ re-opens it at step 1, „Überspringen“ closes
    await phone.reload();
    await phone.evaluate(() => window.livefx.ready);
    await sleep(300);
    assert.equal(await phone.evaluate(() => window.livefx.setup.isOpen), false, 'done stays done');
    await phone.tap('#tabbtn-more');
    assert.match(await phone.textContent('#conn-text'), link ? /gekoppelt als „iPhone · Safari“/ : /Verbunden/);
    await phone.tap('#btn-setup');
    await phone.waitForSelector('#setup:not([hidden])');
    assert.equal(await phone.evaluate(() => window.livefx.setup.step), 0, 're-opened at step 1');
    await phone.tap('#setup-skip');
    await phone.waitForSelector('#setup', { state: 'hidden' });
    assert.match(await phone.textContent('#transcript'), /übersprungen/);
    log('assistant ④ → done; reload keeps it closed; re-open from „Mehr“ + skip');

    if (link) {
      // ------------------------------------------------------------ (c) phone mic on plain http: the internet link
      await phone.tap('#tabbtn-sound');
      assert.equal(await phone.locator('#btn-mic').isDisabled(), true, 'mic needs https');
      assert.ok(await phone.locator('#mic-https').isVisible(), 'internet-link notice');
      assert.match(await phone.textContent('#mic-https'), /Für das Handy-Mikro: Internet-Link nutzen/);
      assert.match(await phone.textContent('#mic-https'), /https/);
      await phone.locator('#mic-card').scrollIntoViewIfNeeded();
      await shot(phone, 'mic-https');
      // the server cannot open a real tunnel here: the tunnel routes answer as an online tunnel would
      const upgradeSecret = 'upgradeSecretAbcdefgh12';
      await phone.route('**/api/tunnel', (r) => r.fulfill({ json: { ok: true, status: 'idle', url: null } }));
      await phone.route('**/api/tunnel/start', (r) => r.fulfill({ json: { ok: true, status: 'online', url: TUNNEL, hostname: new URL(TUNNEL).hostname } }));
      await phone.route('**/api/pairing', (r) => r.fulfill({ json: { ok: true, pairing: { url: `${TUNNEL}/p#${upgradeSecret}`, tunnelUrl: `${TUNNEL}/p#${upgradeSecret}`, lanUrl: null, code: '123456', expiresAt: new Date(Date.now() + 600000).toISOString() } } }));
      await phone.route(`${TUNNEL}/**`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>tunnel</title><p>Internet-Link</p>' }));
      await phone.tap('#btn-mic-upgrade');
      await phone.waitForURL(`${TUNNEL}/p#${upgradeSecret}`, { timeout: 5000 });
      log('phone mic on http → „Internet-Link“ button switched to the https pairing link');
      await phone.unrouteAll({ behavior: 'ignoreErrors' });
      await phone.goto(`${lan}/mobile.html`);
      await phone.evaluate(() => window.livefx.ready);

      // ------------------------------------------------------------ (d) pair another phone from this one (QR)
      await phone.tap('#tabbtn-more');
      await phone.tap('#btn-invite');
      await phone.waitForFunction(() => document.querySelector('#invite-qr').dataset.qrPayload, null, { timeout: 5000 });
      const invite = await phone.evaluate(() => ({ url: document.querySelector('#invite-qr').dataset.qrPayload, size: Number(document.querySelector('#invite-qr').dataset.qrSize), code: document.querySelector('#invite-code').textContent }));
      assert.ok(invite.url.startsWith(`${lan}/p#`), `invite QR = LAN pairing link: ${invite.url}`);
      assert.equal(invite.size, QR.encode(invite.url).size, 'QR matrix of the link');
      assert.match(invite.code, /^\d{3} \d{3}$/);
      assert.match(await phone.textContent('#invite-expiry'), /Gilt noch \d+:\d\d min/);
      await phone.locator('#invite-box').scrollIntoViewIfNeeded();
      await shot(phone, 'invite');
      const phone2 = await phone2Ctx.newPage();
      phone2.on('pageerror', (e) => errors.push(`phone2: ${e.message}`));
      await phone2.goto(invite.url);
      await phone2.waitForURL(/\/mobile\.html/, { timeout: 10000 });
      await phone.waitForFunction(() => /Gekoppelt: Android · Chrome/.test(document.querySelector('#invite-expiry').textContent), null, { timeout: 5000 });
      log('second phone paired with the QR shown on the first phone');

      // ------------------------------------------------------------ (e) revoked → banner; „abmelden“ removes the device
      const devs = (await api(base, 'GET', '/api/devices', { token })).json.devices;
      const second = devs.find((d) => d.name === 'Android · Chrome' && d.via === 'lan');
      assert.ok(second, `second phone listed: ${JSON.stringify(devs.map((d) => [d.name, d.via]))}`);
      await phone2.evaluate(() => window.livefx.ready);
      await phone2.waitForSelector('#setup:not([hidden])', { timeout: 5000 }); // freshly paired → assistant
      const del = await api(base, 'DELETE', `/api/devices/${second.id}`, { token });
      await phone2.waitForSelector('#setup-pair:not([hidden])', { timeout: 6000 });
      assert.match(await phone2.textContent('#setup-conn-title'), /Nicht gekoppelt/, 'assistant step 1 turns into „nicht gekoppelt“');
      assert.equal(await phone2.getAttribute('#setup-pair', 'href'), '/p');
      await shot(phone2, 'setup-unpaired');
      await phone2.tap('#setup-skip');
      assert.equal(del.status, 200, del.text);
      await phone2.waitForSelector('#auth-banner:not([hidden])', { timeout: 6000 });
      assert.equal(await phone2.evaluate(() => window.livefx.session.state), 'unpaired');
      assert.ok(await phone2.locator('#dot-server').evaluate((d) => d.classList.contains('err')), 'red dot, not a false green');
      assert.equal(await phone2.getAttribute('#auth-pair', 'href'), '/p');
      await shot(phone2, 'auth-banner');
      log('revoked phone shows „nicht gekoppelt“');

      assert.ok(await phone.locator('#btn-unpair').isVisible(), '„abmelden“ for the paired phone');
      const myId = (await phone.evaluate(() => window.livefx.session)).device.id;
      await phone.tap('#btn-unpair');
      await phone.waitForURL(/\/p(\?|$|#)/, { timeout: 5000 });
      const after = (await api(base, 'GET', '/api/devices', { token })).json.devices;
      assert.ok(!after.some((d) => d.id === myId), 'device removed on the server');
      const again = await phone.evaluate(() => fetch('/api/devices').then((r) => r.status));
      assert.equal(again, 401, 'cookie no longer valid');
      log('„abmelden“ removed the phone');
    }

    const pageErrors = errors.filter((e) => !/Failed to fetch|NetworkError|net::/.test(e));
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
  } finally {
    await phone2Ctx.close();
    await phoneCtx.close();
    await pairCtx.close();
    await pc.close();
    await server.stop();
  }
}

module.exports = { run };
