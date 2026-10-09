// Easy setup – QR everywhere: start assistant step 0 „📱 Handy verbinden“ (big pairing QR with quiet zone, 6-digit code,
// live status), the QR image decodes to the pairing link (canvas pixels = encoder matrix of the payload), the status
// turns green when a second browser context (the phone) redeems the link, the „anderes Netz?“ hint appears after the
// timeout (?setupTimeout=2000) and its ONE button swaps the QR to the tunnel pairing link, devices can be removed,
// the OBS step shows the LAN overlay URL as a small QR, the „📱 Handy“ card and the header dialog show the same pairing
// QR, the printable setup card renders two QR codes (+ PNG export), first-run mode (?firstrun=1) and the collapsible
// assistant. Runs against the real server (HOST=0.0.0.0, GET /api/setup); falls back to a mocked /api/setup when the
// route is missing or the machine has no LAN address.
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const QR = require('../../js/qr.js');
const Setup = require('../../js/setup-card.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TUNNEL = 'https://brave-otter-test.trycloudflare.com';

/** Samples a QR canvas at every module centre (+ the quiet zone and the two colours) – runs in the page. */
function readQr(page, sel) {
  return page.evaluate((s) => {
    const c = document.querySelector(s);
    if (!c || !c.dataset.qrPayload || !c.width) return null;
    const size = Number(c.dataset.qrSize);
    const margin = Number(c.dataset.qrMargin);
    const mod = Number(c.dataset.qrModule);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const at = (x, y) => (Math.floor(y) * c.width + Math.floor(x)) * 4;
    const bits = [];
    for (let r = 0; r < size; r++) for (let col = 0; col < size; col++) bits.push(d[at((col + margin + 0.5) * mod, (r + margin + 0.5) * mod)] < 128 ? 1 : 0);
    let quiet = true;
    const band = margin * mod;
    for (let y = 0; y < c.height; y += 2) {
      for (let x = 0; x < c.width; x += 2) {
        const inBand = x < band || y < band || x >= c.width - band || y >= c.height - band;
        if (inBand && d[at(x, y)] !== 255) quiet = false;
      }
    }
    const colours = new Set();
    for (let i = 0; i < d.length; i += 4 * 7) colours.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    const rect = c.getBoundingClientRect();
    return { payload: c.dataset.qrPayload, size, margin, mod, bits: bits.join(''), quiet, colours: [...colours].sort(), css: rect.width, cssH: rect.height, visible: rect.width > 0 && getComputedStyle(c).display !== 'none' };
  }, sel);
}

/** The picture is the QR code of `expected`: same matrix as the encoder, 4-module white quiet zone, pure black / white. */
function verifyQr(q, expected, what) {
  assert.ok(q, `${what}: QR drawn`);
  assert.equal(q.payload, expected, `${what}: payload`);
  const ref = QR.encode(expected);
  assert.equal(q.size, ref.size, `${what}: matrix size`);
  assert.equal(q.bits, Array.from(ref.modules).join(''), `${what}: canvas pixels decode to the payload (encoder matrix)`);
  assert.ok(q.margin >= 4 && q.quiet, `${what}: quiet zone of ${q.margin} modules`);
  assert.deepEqual(q.colours, ['0,0,0', '255,255,255'], `${what}: high contrast (pure black on white)`);
}

/** Mocked setup backend (servers without /api/setup or machines without a LAN address): same shape as the real route. */
function installMock(ctx, base) {
  const port = new URL(base).port;
  const lan = `http://192.168.178.23:${port}`;
  const m = { seq: 0, posts: 0, deletes: [], devices: [], tunnel: { state: 'idle', url: null, error: null, pairingUrl: null }, lan };
  const newCode = () => {
    m.seq++;
    const secret = `mocksecret${m.seq}xyzxyz`;
    return { url: `${lan}/p#${secret}`, lanUrl: `${lan}/p#${secret}`, tunnelUrl: null, manualUrl: `${lan}/p`, code: String(482912 + m.seq), expiresAt: new Date(Date.now() + 600000).toISOString(), via: 'lan', reason: null };
  };
  m.pairing = newCode();
  const body = () => ({
    ok: true,
    version: '2.3.0',
    panelUrl: `${base}/`,
    lanUrls: [`${lan}/`],
    bestLanUrl: `${lan}/`,
    overlayUrls: { local: `${base}/overlay.html`, localPortrait: `${base}/overlay.html?layout=portrait`, lan: `${lan}/overlay.html?key=mockkey123`, lanPortrait: `${lan}/overlay.html?layout=portrait&key=mockkey123`, key: 'mockkey123' },
    tunnel: m.tunnel,
    pairing: m.pairing,
    devices: m.devices,
    lan: { listening: true, bind: '0.0.0.0', reason: null },
  });
  m.body = body;
  m.redeem = (name) => {
    m.devices.push({ id: `dev${m.devices.length + 1}`, name, via: 'lan', createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() });
    m.pairing = newCode();
  };
  return Promise.all([
    ctx.route('**/api/setup', (r) => r.fulfill({ json: body() })),
    ctx.route('**/api/pairing', (r) => {
      m.posts++;
      m.pairing = newCode();
      return r.fulfill({ json: { ok: true, pairing: m.pairing } });
    }),
    ctx.route('**/api/devices/*', (r) => {
      const id = decodeURIComponent(r.request().url().split('/').pop());
      m.deletes.push(id);
      m.devices = m.devices.filter((d) => d.id !== id);
      return r.fulfill({ json: { ok: true, revoked: id } });
    }),
  ]).then(() => m);
}

async function run({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer({ env: { HOST: '0.0.0.0' } });
  const { base, token } = server;
  const probe = await api(base, 'GET', '/api/setup', { token });
  const realRoute = probe.status === 200 && probe.json && probe.json.ok;
  // SETUP_MOCK=1 forces the mocked backend (checks the fallback path on machines where the real one works)
  const mode = process.env.SETUP_MOCK !== '1' && realRoute && probe.json.pairing && probe.json.pairing.lanUrl ? 'real' : 'mock';
  const why = process.env.SETUP_MOCK === '1' ? ' (SETUP_MOCK=1)' : !realRoute ? ` (GET /api/setup → ${probe.status})` : mode === 'mock' ? ' (no LAN address on this machine)' : '';
  log(`setup backend: ${mode}${why}`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: IPHONE_UA });
  const errors = [];
  let tunnelOn = false;
  try {
    const mock = mode === 'mock' ? await installMock(ctx, base) : null;
    if (mock) {
      await pctx.route(`${mock.lan}/**`, (r) => {
        mock.redeem('iPhone · Safari');
        return r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>gekoppelt</title><p>✔ gekoppelt</p>' });
      });
    }
    await ctx.route('**/api/tunnel/start', (r) => {
      tunnelOn = true;
      if (mock) mock.tunnel = { state: 'online', url: TUNNEL, error: null, pairingUrl: Setup.withOrigin(mock.pairing.lanUrl, TUNNEL) };
      return r.fulfill({ json: { ok: true, status: 'online', url: TUNNEL, hostname: new URL(TUNNEL).hostname, phoneUrl: null } });
    });
    if (!mock) {
      // the real server cannot open a tunnel here: once „started“, its /api/setup answer gets the tunnel fields
      await ctx.route('**/api/setup*', async (r) => {
        if (!tunnelOn) return r.continue();
        const j = (await api(base, 'GET', '/api/setup', { token })).json;
        if (j && j.pairing) {
          const link = Setup.withOrigin(j.pairing.lanUrl || j.pairing.url, TUNNEL);
          j.tunnel = { state: 'online', url: TUNNEL, error: null, pairingUrl: link };
          j.pairing = { ...j.pairing, url: link, tunnelUrl: link, via: 'tunnel' };
        }
        return r.fulfill({ json: j });
      });
    }

    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await page.goto(`${base}/?setupTimeout=2000`);
    await page.waitForSelector('#pad button');
    await page.evaluate(() => window.livefx.ready);
    await page.waitForFunction(() => window.livefx.setup.pairing && window.livefx.setup.pairing.state.url, null, { timeout: 8000 }).catch(async (e) => {
      throw new Error(`${e.message} state=${JSON.stringify(await page.evaluate(() => window.livefx.setup.pairing && window.livefx.setup.pairing.state))}`);
    });

    // (a) step 0 is the first and most prominent step: big pairing QR (≥ 260 px, quiet zone, black on white), code
    const firstStep = await page.evaluate(() => document.querySelector('.wizard-step').id);
    assert.equal(firstStep, 'wiz-phone', 'step 0 comes first');
    assert.equal(await page.locator('.wizard-step').count(), 4, 'step 0 + the three steps');
    assert.match(await page.textContent('#wiz-phone .wizard-title'), /Handy verbinden/);
    assert.equal(await page.locator('#wiz-phone-hint').isHidden(), true, 'no hint right away');
    const st0 = await page.evaluate(() => window.livefx.setup.pairing.state);
    const lanData = await page.evaluate(() => window.livefx.setup.pairing.data);
    const lanLink = lanData.pairing.lanUrl;
    assert.equal(st0.via, 'lan');
    assert.equal(st0.url, lanLink, 'the QR shows the LAN pairing link');
    assert.match(lanLink, /^http:\/\/[\d.]+:\d+\/p/, 'pairing link on the LAN address');
    assert.ok(!lanLink.includes(token), 'the master token is never in the QR');
    const q0 = await readQr(page, '#wiz-phone-qr');
    verifyQr(q0, lanLink, 'step 0');
    assert.ok(q0.css >= 260 && Math.abs(q0.css - q0.cssH) < 1, `step 0 QR is big and square (${q0.css} px)`);
    const code = (await page.textContent('#wiz-phone-code')).trim();
    assert.match(code, /^\d{3} \d{3}$/, `6-digit code as text fallback: ${code}`);
    assert.equal(code.replace(' ', ''), lanData.pairing.code);
    const urlLine = await page.textContent('#wiz-phone-url-line');
    assert.ok(urlLine.includes('/p') && urlLine.includes(code), `typed fallback names the page + code: ${urlLine}`);
    assert.match(await page.textContent('#wiz-phone-expiry'), /Code gilt noch \d+:\d\d min/);
    assert.match(await page.textContent('#wiz-phone-state'), /Warte auf dein Handy/);
    log(`step 0 QR v${QR.encode(lanLink).version} ${Math.round(q0.css)} px, code ${code}`);

    // (b) OBS step: small QR of the LAN overlay URL (2nd PC / phone streaming app), follows the format
    const overlayLan = lanData.overlay.lan.landscape;
    assert.match(overlayLan, /\/overlay\.html/);
    assert.ok(!/127\.0\.0\.1/.test(overlayLan), 'overlay QR uses the LAN address');
    verifyQr(await readQr(page, '#wiz-obs-qr'), overlayLan, 'OBS step');
    assert.equal(await page.textContent('#wiz-obs-lan-url'), overlayLan);
    assert.equal(await page.inputValue('#wiz-overlay-url'), `${base}/overlay.html`, 'copy field keeps the local URL');
    await page.selectOption('#wiz-format', 'portrait');
    verifyQr(await readQr(page, '#wiz-obs-qr'), lanData.overlay.lan.portrait, 'OBS step portrait');
    assert.match(lanData.overlay.lan.portrait, /layout=portrait/);
    await page.selectOption('#wiz-format', 'landscape');
    log('OBS step overlay QR ok');

    // (c) „📱 Handy“ card: the same pairing QR; the 2.2 token link is hidden
    assert.ok(await page.locator('#mobile-card').evaluate((c) => c.classList.contains('has-pairing')), 'Handy card in pairing mode');
    verifyQr(await readQr(page, '#mobile-pair-qr'), lanLink, 'Handy card');
    assert.equal(await page.locator('#mobile-card .legacy-link').isVisible(), false, 'token link hidden');

    // (d) header pill → dialog with the same QR from anywhere
    await page.click('#pill-phone');
    await page.waitForSelector('#phone-dialog[open]');
    verifyQr(await readQr(page, '#dlg-phone-qr'), lanLink, 'header dialog');
    await page.locator('#phone-dialog').screenshot({ path: path.join(shotDir, '38-setup-dialog.png') });
    await page.click('#phone-dialog-close');
    assert.equal(await page.locator('#phone-dialog[open]').count(), 0, 'dialog closed');
    log('Handy card + header dialog show the same QR');

    // (e) no phone within the timeout → the „anderes Netz?“ hint with ONE tunnel button
    await page.waitForSelector('#wiz-phone-hint:not([hidden])', { timeout: 7000 });
    assert.match(await page.textContent('#wiz-phone-hint'), /anderen Netz.*mobile Daten.*Internet-Link/s);
    assert.equal(await page.locator('#wiz-phone-hint button').count(), 1, 'one button');
    assert.match(await page.textContent('#wiz-phone-tunnel'), /Internet-Link starten/);
    await page.screenshot({ path: path.join(shotDir, '38-setup-wizard-1280.png') });
    log('tunnel hint after the timeout');

    // (f) the phone redeems the pairing link → green „✔ Handy verbunden: <name>“ (+ step done, header dot, new code)
    const phone = await pctx.newPage();
    await phone.goto(lanLink);
    if (!mock) await phone.waitForURL(/\/mobile\.html/, { timeout: 8000 });
    await page.waitForFunction(() => /Handy verbunden/.test(document.querySelector('#wiz-phone-state').textContent), null, { timeout: 8000 });
    assert.equal((await page.textContent('#wiz-phone-state')).trim(), '✔ Handy verbunden: iPhone · Safari');
    assert.ok(await page.locator('#wiz-phone').evaluate((s) => s.classList.contains('done')), 'step 0 done');
    assert.ok(await page.locator('#wiz-phone-dot').evaluate((d) => d.classList.contains('on')), 'status dot green');
    assert.ok(await page.locator('#dot-phone').evaluate((d) => d.classList.contains('on')), 'header dot green');
    assert.equal(await page.locator('#wiz-phone-hint').isHidden(), true, 'hint gone once connected');
    assert.equal(await page.locator('#wiz-phone-devices li').count(), 1);
    assert.match(await page.textContent('#wiz-phone-devices'), /iPhone · Safari/);
    await page.waitForFunction((old) => window.livefx.setup.pairing.state.url !== old, lanLink, { timeout: 5000 });
    const nextLink = await page.evaluate(() => window.livefx.setup.pairing.state.url);
    verifyQr(await readQr(page, '#wiz-phone-qr'), nextLink, 'next code after the single use');
    await page.locator('#wizard-card').screenshot({ path: path.join(shotDir, '38-setup-connected.png') });
    log(`phone paired (${mock ? 'mock' : phone.url()}), QR moved on to a fresh code`);

    // (g) „entfernen“ revokes the device
    const devId = await page.getAttribute('#wiz-phone-devices button[data-pair-act="remove"]', 'data-id');
    await page.click('#wiz-phone-devices button[data-pair-act="remove"]');
    await page.waitForFunction(() => document.querySelector('#wiz-phone-devices').hidden, null, { timeout: 5000 });
    if (mock) assert.deepEqual(mock.deletes, [devId]);
    else {
      const devs = await api(base, 'GET', '/api/devices', { token });
      assert.deepEqual(devs.json.devices, [], 'server forgot the device');
    }
    assert.doesNotMatch(await page.textContent('#wiz-phone-state'), /verbunden/);
    log('device removed');

    // (h) the hint's button starts the tunnel and swaps the QR to the tunnel pairing link (and back)
    await page.waitForSelector('#wiz-phone-hint:not([hidden])', { timeout: 7000 });
    await page.click('#wiz-phone-tunnel');
    await page.waitForFunction((t) => (document.querySelector('#wiz-phone-qr').dataset.qrPayload || '').startsWith(`${t}/p`), TUNNEL, { timeout: 6000 });
    const tunnelLink = await page.evaluate(() => window.livefx.setup.pairing.state.url);
    assert.equal(await page.evaluate(() => window.livefx.setup.pairing.state.via), 'tunnel');
    verifyQr(await readQr(page, '#wiz-phone-qr'), tunnelLink, 'tunnel QR');
    assert.match(await page.textContent('#wiz-phone-state'), /Internet-QR aktiv/);
    assert.equal(await page.locator('#wiz-phone-hint').isHidden(), true);
    assert.ok(await page.locator('#wiz-phone-lan').isVisible(), '„WLAN-Code zeigen“ offered');
    assert.match(await page.textContent('#wiz-phone-url-line'), new RegExp(`${TUNNEL.replace(/[.]/g, '\\.')}/p`));
    await page.click('#wiz-phone-lan');
    await page.waitForFunction(() => window.livefx.setup.pairing.state.via === 'lan', null, { timeout: 3000 });
    log('tunnel button swaps the QR to the internet link and back');

    // (i) printable setup card: two QR codes (pairing + overlay), DE / TR / EN lines, A6 / A5, PNG export
    const pairingNow = await page.evaluate(() => window.livefx.setup.pairing.state.url);
    const [card] = await Promise.all([ctx.waitForEvent('page'), page.click('#wiz-phone-card')]);
    await card.waitForSelector('#card [data-qr-payload]');
    const payloads = await card.$$eval('#card [data-qr-payload]', (els) => els.map((e) => ({ p: e.dataset.qrPayload, svg: !!e.querySelector('svg path') })));
    assert.deepEqual(
      payloads.map((x) => x.p),
      [pairingNow, overlayLan],
      'card: pairing QR + overlay QR'
    );
    assert.ok(payloads.every((x) => x.svg), 'both QR codes drawn as SVG');
    const cardText = await card.textContent('#card');
    for (const re of [/DE\s*①/, /TR\s*①/, /EN\s*①/, /Code \d{3} \d{3}/]) assert.match(cardText, re);
    assert.match(await card.textContent('#card-page'), /148mm 105mm/, 'A6 page size');
    await card.screenshot({ path: path.join(shotDir, '38-setup-card.png'), fullPage: true });
    await card.selectOption('#card-size', 'a5');
    assert.equal(await card.evaluate(() => document.body.dataset.size), 'a5');
    assert.match(await card.textContent('#card-page'), /210mm 148mm/, 'A5 page size');
    const [download] = await Promise.all([card.waitForEvent('download'), card.click('#card-png')]);
    const pngPath = path.join(shotDir, '38-setup-card-image.png');
    await download.saveAs(pngPath);
    const png = fs.readFileSync(pngPath);
    assert.equal(png.subarray(1, 4).toString(), 'PNG', 'PNG export');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1480, 1050], 'A6 card picture (10 px/mm)');
    assert.equal(download.suggestedFilename(), 'LiveFX-Einrichtungskarte.png');
    await card.close();
    log(`setup card: 2 QR codes, A6/A5, PNG ${png.length} bytes`);

    // (j) the assistant at 820 px (one column) + collapsible assistant
    await page.setViewportSize({ width: 820, height: 1000 });
    await sleep(300);
    await page.locator('#wizard-card').screenshot({ path: path.join(shotDir, '38-setup-wizard-820.png') });
    const q820 = await readQr(page, '#wiz-phone-qr');
    assert.ok(q820.css >= 260, `QR stays ≥ 260 px at 820 px (${q820.css})`);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    assert.ok(sw, 'no horizontal scroll at 820 px');
    await page.click('#btn-wizard-toggle');
    assert.equal(await page.locator('#wizard-steps').isVisible(), false, 'assistant collapsed');
    assert.equal(await page.evaluate(() => localStorage.getItem('livefx.wizard.collapsed')), '1');
    await page.click('#btn-wizard-toggle');
    assert.ok(await page.locator('#wiz-phone').isVisible(), 'assistant expanded again');
    log('820 px layout + collapse ok');

    // (k) first-run mode (fresh install): assistant expanded, step 0 focused, everything else collapsed until „Fertig“
    const fctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      if (mock) await installMock(fctx, base);
      const fresh = await fctx.newPage();
      fresh.on('pageerror', (e) => errors.push(`first run: ${e.message}`));
      await fresh.goto(`${base}/?firstrun=1`);
      await fresh.evaluate(() => window.livefx.ready);
      assert.equal(await fresh.evaluate(() => document.body.classList.contains('first-run')), true, 'first-run mode');
      assert.equal(await fresh.locator('#panel-grid').isVisible(), false, 'other cards collapsed');
      assert.ok(await fresh.locator('#btn-show-panel').isVisible(), 'one bar to show them');
      assert.ok(await fresh.locator('#wiz-phone').isVisible() && (await fresh.locator('#wiz-mic-test').isVisible()), 'assistant expanded');
      assert.equal(await fresh.evaluate(() => document.activeElement && document.activeElement.id), 'wiz-phone', 'step 0 focused');
      assert.equal(await fresh.locator('#btn-wizard-toggle').isVisible(), false, 'no collapsing during the first run');
      await fresh.waitForFunction(() => window.livefx.setup.pairing.state.url, null, { timeout: 8000 });
      await fresh.screenshot({ path: path.join(shotDir, '38-setup-first-run.png') });
      await fresh.click('#btn-setup-done');
      assert.ok(await fresh.locator('#panel-grid').isVisible(), 'all cards back');
      assert.equal(await fresh.evaluate(() => localStorage.getItem('livefx.setup.done')), '1');
      assert.equal(await fresh.evaluate(() => localStorage.getItem('livefx.setup.firstrun')), null);
      await fresh.goto(`${base}/`);
      await fresh.evaluate(() => window.livefx.ready);
      assert.equal(await fresh.evaluate(() => document.body.classList.contains('first-run')), false, 'done stays done');
    } finally {
      await fctx.close();
    }
    // automation (navigator.webdriver) never gets the first-run mode without ?firstrun=1 – the other e2e tests rely on it
    assert.equal(await page.evaluate(() => window.livefx.setup.firstRun), false);
    // a real user (webdriver false) with a fresh browser on a fresh install gets it without any parameter; once the
    // streamer has saved triggers on the server, a new browser does not
    const asUser = async () => {
      const uctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await uctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
      if (mock) await installMock(uctx, base);
      const p = await uctx.newPage();
      p.on('pageerror', (e) => errors.push(`user: ${e.message}`));
      await p.goto(`${base}/`);
      await p.evaluate(() => window.livefx.ready);
      const on = await p.evaluate(() => ({ firstRun: window.livefx.setup.firstRun, cls: document.body.classList.contains('first-run') }));
      await uctx.close();
      return on;
    };
    assert.deepEqual(await asUser(), { firstRun: true, cls: true }, 'fresh install + fresh browser → first-run mode');
    const saved = await api(base, 'GET', '/api/triggers', { token });
    const put = await api(base, 'PUT', '/api/triggers', { token, json: { triggers: saved.json.triggers.slice(1), removed: [saved.json.triggers[0].id] } });
    assert.equal(put.status, 200, put.text);
    assert.deepEqual(await asUser(), { firstRun: false, cls: false }, 'server with saved triggers → no first-run mode');
    log('first-run mode ok (forced, real fresh install, not after saving)');

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await pctx.close();
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
