// Demo page: loads without devices (getUserMedia rejects -> German notice, black background),
// fires render in the DOM and on the canvas, a canvas recording produces a WebM blob,
// the portrait toggle resizes the canvas, and bus `fire` messages render locally.
'use strict';

const path = require('path');

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // The harness runs Chromium with a fake camera/mic (recognition tests); this scenario is about the
    // "no devices" path, so make getUserMedia reject like a machine without a webcam.
    await page.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Requested device not found', 'NotFoundError'));
      }
    });
    await page.goto(`${server.base}/demo.html`);
    await page.waitForFunction(() => window.livefxDemo && window.livefxDemo.state.ready, null, { timeout: 8000 });

    // No camera in headless Chromium -> German notice, page keeps working.
    const noticeText = await page.textContent('#notice');
    if (!/Kamera/.test(noticeText)) throw new Error('expected a camera notice, got: ' + noticeText);
    const cam = await page.evaluate(() => window.livefxDemo.state.camera);
    if (cam !== false) throw new Error('state.camera should be false without devices');

    // Soundboard shows the first 8 triggers.
    const padCount = await page.locator('#pad button').count();
    if (padCount !== 8) throw new Error('expected 8 pad buttons, got ' + padCount);

    // fire('wow') -> DOM card + canvas effect.
    await page.evaluate(() => {
      const t = window.livefxDemo.state.triggers.find((x) => x.id === 'wow');
      window.livefxDemo.fire(t);
    });
    await page.waitForSelector('#stage .fx-card', { timeout: 2000 });
    const cardText = await page.textContent('#stage .fx-card .fx-text');
    if (!/KRASS/.test(cardText)) throw new Error('unexpected card text ' + cardText);
    const active = await page.evaluate(() => window.livefxDemo.canvasFx.active.length);
    if (active < 1) throw new Error('canvasFx.active is empty after fire');

    // Recording: start, fire a rain while recording, stop -> WebM blob.
    await page.evaluate(() => window.livefxDemo.startRecording());
    const recState = await page.evaluate(() => ({ recording: window.livefxDemo.state.recording, audio: window.livefxDemo.state.audio }));
    if (!recState.recording) throw new Error('state.recording not set');
    log('recording started, audio track:', recState.audio);
    if (await page.locator('#rec-badge').isHidden()) throw new Error('REC badge hidden while recording');
    await page.evaluate(() => {
      const t = window.livefxDemo.state.triggers.find((x) => x.id === 'lol');
      window.livefxDemo.fire(t);
    });
    await page.waitForSelector('#stage .fx-rain', { state: 'attached', timeout: 2000 });
    await page.waitForTimeout(1200);
    const blobInfo = await page.evaluate(async () => {
      const blob = await window.livefxDemo.stopRecording();
      return { size: blob.size, type: blob.type };
    });
    log('blob', blobInfo);
    if (!(blobInfo.size > 0)) throw new Error('empty recording blob');
    if (!String(blobInfo.type).startsWith('video/webm')) throw new Error('unexpected blob type ' + blobInfo.type);
    if (await page.locator('#result').isHidden()) throw new Error('result dialog not shown');
    const href = await page.getAttribute('#btn-download', 'href');
    const dl = await page.getAttribute('#btn-download', 'download');
    if (!/^blob:/.test(href || '')) throw new Error('download link missing, href=' + href);
    if (!/^livefx-demo-\d{8}-\d{6}\.webm$/.test(dl || '')) throw new Error('unexpected download name ' + dl);
    await page.screenshot({ path: path.join(shotDir, 'demo-result.png') });
    await page.click('#btn-close-result');

    // Portrait toggle -> body class + 720x1280 canvas.
    await page.click('#fmt-portrait');
    const portrait = await page.evaluate(() => ({
      cls: document.body.classList.contains('layout-portrait'),
      w: document.getElementById('rec-canvas').width,
      h: document.getElementById('rec-canvas').height,
      frame: document.getElementById('frame').getBoundingClientRect(),
    }));
    if (!portrait.cls) throw new Error('body.layout-portrait missing');
    if (portrait.w !== 720 || portrait.h !== 1280) throw new Error(`canvas is ${portrait.w}x${portrait.h}, expected 720x1280`);
    if (Math.abs(portrait.frame.width / portrait.frame.height - 9 / 16) > 0.02) throw new Error('frame is not 9:16');

    // A fire message from the bus (control panel / API) renders too.
    await page.evaluate(() => {
      const t = window.livefxDemo.state.triggers.find((x) => x.id === 'no');
      window.livefxDemo.bus._emit({ id: 'd1', type: 'fire', ts: Date.now(), trigger: t, source: 'Test' });
    });
    await page.waitForFunction(() => [...document.querySelectorAll('#stage .fx-card .fx-text')].some((e) => /NEIN/.test(e.textContent)), null, { timeout: 2000 });
    await page.screenshot({ path: path.join(shotDir, 'demo.png') });

    // Transcript highlighting through the same path the ASR uses.
    await page.evaluate(() => window.livefxDemo.handleText('ey digga das war knapp', true, { source: 'Test' }));
    const markCount = await page.locator('#transcript mark').count();
    if (markCount !== 1) throw new Error('expected one <mark> in transcript, got ' + markCount);

    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    await ctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
