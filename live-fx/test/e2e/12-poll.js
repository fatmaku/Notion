// 2.4 long-poll transport (GET /events/poll) – what keeps the Internet link alive: Cloudflare Quick Tunnels do not
// pass Server-Sent Events. (a) Forced with ?transport=poll on this PC: /api/fire → overlay effect, a phone-mic style
// POST /api/transcript → the PC panel (speech input „Extern“, polling) matches and fires → the polling overlay shows it;
// no page opens an EventSource. (b) Automatic on a *.trycloudflare.com host (a real https server behind a host-resolver
// rule – exactly what the tunnel looks like to the browser and to server/auth.js): the OBS overlay with its key and a
// phone paired through the "tunnel" by the 6-digit code both long-poll by themselves, get live events (fire, transcript)
// and the phone's test effect reaches the overlay.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const { chromium } = require('../resolve-playwright');
const auth = require('../../server/auth');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TUNNEL_HOST = 'e2e-poll-otter.trycloudflare.com';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'de-DE', userAgent: IPHONE_UA };

/** Remembers every /events request of a page's main frame (the panel's preview iframe keeps its own SSE). */
function watchEvents(page) {
  const seen = { sse: 0, poll: 0 };
  page.on('request', (rq) => {
    if (rq.frame() !== page.mainFrame()) return;
    const u = new URL(rq.url());
    if (u.pathname === '/events') seen.sse++;
    if (u.pathname === '/events/poll') seen.poll++;
  });
  return seen;
}

function selfSigned(dir) {
  const cert = path.join(dir, 'cert.pem');
  const key = path.join(dir, 'key.pem');
  const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', `/CN=${TUNNEL_HOST}`, '-addext', `subjectAltName=DNS:${TUNNEL_HOST},IP:127.0.0.1`, '-keyout', key, '-out', cert], { encoding: 'utf8' });
  return r.status === 0 ? { cert, key } : null;
}

async function forced({ browser, startServer, api, waitFor, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const errors = [];
  const obs = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pc = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const overlay = await obs.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    const ovSeen = watchEvents(overlay);
    await overlay.goto(`${base}/overlay.html?transport=poll`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk && window.livefx.bus.status().sse === 'open', null, { timeout: 5000 });
    assert.equal(await overlay.evaluate(() => window.livefx.bus.status().transport), 'poll');
    await overlay.evaluate(() => {
      window.__msgs = [];
      window.livefx.bus.onMessage((m) => window.__msgs.push(m));
    });
    const health = await api(base, 'GET', '/health');
    assert.ok(health.json.overlays >= 1, `the polling overlay counts as connected (${JSON.stringify(health.json)})`);

    // fire → overlay (only the server can deliver it: separate browser context, no BroadcastChannel)
    const fire = await api(base, 'POST', '/api/fire', { json: { id: 'lol', source: 'e2e-poll' }, token });
    assert.equal(fire.status, 200, fire.text);
    await overlay.waitForSelector('.fx-rain[data-emoji="😂"]', { state: 'attached', timeout: 4000 });
    log('fire → overlay over long-poll');

    // transcript → PC panel (polling, „Extern“) → matcher → overlay
    const panel = await pc.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    const pnSeen = watchEvents(panel);
    await panel.goto(`${base}/?transport=poll`);
    await panel.evaluate(() => window.livefx.ready);
    await panel.waitForFunction(() => window.livefx.bus.status().transport === 'poll' && window.livefx.bus.status().sse === 'open', null, { timeout: 5000 });
    await panel.selectOption('#asr', 'external');
    await panel.click('#btn-listen');
    await panel.waitForFunction(() => /Wartet auf externe Transkripte/i.test(document.querySelector('#btn-listen').textContent), null, { timeout: 3000 });
    await sleep(300);
    const before = await overlay.evaluate(() => window.livefx.renderer.stats.fires);
    const tr = await api(base, 'POST', '/api/transcript', { json: { text: 'bruh', final: true, source: 'Handy-Mikro', lang: 'de-DE' }, token });
    assert.equal(tr.status, 200, tr.text);
    assert.ok(tr.json.panels >= 1, `the polling panel counts (${tr.text})`);
    await panel.waitForFunction(() => /bruh/i.test(document.querySelector('#transcript').textContent), null, { timeout: 4000 });
    await overlay.waitForFunction((n) => window.livefx.renderer.stats.fires > n, before, { timeout: 4000 });
    await sleep(800);
    const fx = await overlay.evaluate(() => window.__msgs.filter((m) => m.type === 'fire').map((m) => m.source));
    assert.deepEqual(fx.slice(-1), ['Handy-Mikro: „bruh“'], `panel fired from the transcript: ${JSON.stringify(fx)}`);
    assert.equal(fx.filter((s) => /bruh/.test(s)).length, 1, 'exactly once');
    await overlay.screenshot({ path: path.join(shotDir, '12-poll-overlay.png') });
    log('transcript → panel matcher → overlay over long-poll');

    assert.equal(ovSeen.sse, 0, 'overlay opened no EventSource');
    assert.equal(pnSeen.sse, 0, 'panel opened no EventSource');
    assert.ok(ovSeen.poll >= 2 && pnSeen.poll >= 2, `polled (${ovSeen.poll} / ${pnSeen.poll})`);
    assert.deepEqual(errors, []);
  } finally {
    await obs.close();
    await pc.close();
    await server.stop();
  }
}

async function tunnelHost({ startServer, api, waitFor, shotDir, log }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-poll-'));
  const pem = selfSigned(dir);
  if (!pem) {
    log('openssl fehlt – Tunnel-Teil übersprungen');
    return;
  }
  const server = await startServer({ https: true, env: { LIVEFX_TLS_CERT: pem.cert, LIVEFX_TLS_KEY: pem.key, LIVEFX_ALLOWED_HOSTS: TUNNEL_HOST } });
  const port = new URL(server.base).port;
  const local = server.base; // https://127.0.0.1:<port>
  const T = `https://${TUNNEL_HOST}:${port}`;
  const { token } = server;
  const errors = [];
  // --proxy-server=direct://: the fake tunnel host must never go to a real (system / env) proxy.
  const tb = await chromium.launch({ args: [`--host-resolver-rules=MAP ${TUNNEL_HOST} 127.0.0.1`, '--proxy-server=direct://', '--autoplay-policy=no-user-gesture-required'] });
  // Node's fetch refuses self-signed certs: talk to the API through the browser's request context instead.
  const apiCtx = await tb.newContext({ ignoreHTTPSErrors: true });
  const call = async (method, p, json) => {
    const r = await apiCtx.request.fetch(`${local}${p}`, { method, headers: { authorization: `Bearer ${token}` }, data: json });
    return { status: r.status(), json: await r.json().catch(() => null) };
  };
  try {
    const obs = await tb.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
    const overlay = await obs.newPage();
    overlay.on('pageerror', (e) => errors.push(`overlay: ${e.message}`));
    const ovSeen = watchEvents(overlay);
    const key = auth.overlayKeyFor(token);
    await overlay.goto(`${T}/overlay.html?key=${key}`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.status().sse === 'open', null, { timeout: 8000 });
    const ov = await overlay.evaluate(() => ({ transport: window.livefx.bus.status().transport, reason: window.livefx.bus.transportReason }));
    assert.deepEqual(ov, { transport: 'poll', reason: 'tunnel' }, 'a trycloudflare host long-polls by itself');
    const fire = await call('POST', '/api/fire', { id: 'lol', source: 'e2e-tunnel' });
    assert.equal(fire.status, 200);
    await overlay.waitForSelector('.fx-rain[data-emoji="😂"]', { state: 'attached', timeout: 4000 });
    log('overlay through the "tunnel" host: key + long-poll, fire arrives');

    // phone: /p through the tunnel host, typed code → paired → remote, polling by itself
    const setup = await call('GET', '/api/setup');
    assert.equal(setup.status, 200);
    const code = setup.json.pairing.code;
    const phoneCtx = await tb.newContext({ ...PHONE, ignoreHTTPSErrors: true });
    const phone = await phoneCtx.newPage();
    phone.on('pageerror', (e) => errors.push(`phone: ${e.message}`));
    const phSeen = watchEvents(phone);
    await phone.goto(`${T}/mobile.html`);
    await phone.waitForURL(/\/p(\?|$|#)/, { timeout: 5000 }); // not paired → pairing page
    await phone.fill('#pair-code', code);
    await phone.waitForURL(/\/mobile\.html/, { timeout: 10000 });
    await phone.evaluate(() => window.livefx.ready);
    await phone.waitForFunction(() => window.livefx.bus.status().transport === 'poll' && window.livefx.bus.status().sse === 'open', null, { timeout: 8000 });
    const sess = await phone.evaluate(() => window.livefx.session);
    assert.equal(sess.state, 'paired', JSON.stringify(sess));
    assert.equal(sess.device.via, 'tunnel');
    await phone.waitForFunction(() => /verbunden/i.test(document.querySelector('#status').dataset.conn || ''), null, { timeout: 5000 });
    const tr = await call('POST', '/api/transcript', { text: 'grüße durch den tunnel', final: true });
    assert.equal(tr.status, 200);
    await phone.waitForFunction(() => document.querySelector('#transcript').textContent.includes('grüße durch den tunnel'), null, { timeout: 5000 });
    log('phone paired through the tunnel host, transcript arrives over long-poll');

    // the phone's test effect (POST /fire with the device cookie) → overlay
    const before = await overlay.evaluate(() => window.livefx.renderer.stats.fires);
    if (await phone.evaluate(() => window.livefx.setup.isOpen)) await phone.evaluate(() => window.livefx.setup.close());
    await phone.evaluate(() => window.livefx.fire(window.livefx.TEST_TRIGGER, 'Handy'));
    await overlay.waitForFunction((n) => window.livefx.renderer.stats.fires > n, before, { timeout: 5000 });
    await overlay.waitForSelector('.fx-card', { timeout: 3000 });
    assert.match(await overlay.textContent('.fx-card'), /HANDY/);
    await phone.screenshot({ path: path.join(shotDir, '12-poll-phone-tunnel.png') });
    log('phone test effect → overlay through the tunnel host');

    assert.equal(ovSeen.sse + phSeen.sse, 0, `no EventSource on a trycloudflare host (${ovSeen.sse}/${phSeen.sse})`);
    assert.ok(ovSeen.poll >= 2 && phSeen.poll >= 2);
    const devs = await call('GET', '/api/devices');
    await call('DELETE', `/api/devices/${encodeURIComponent(devs.json.devices[0].id)}`);
    assert.deepEqual(errors, []);
    await sleep(100);
  } finally {
    await tb.close();
    await server.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function run(ctx) {
  await forced(ctx);
  await tunnelHost(ctx);
}

module.exports = { run };
