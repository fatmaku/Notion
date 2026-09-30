// Core transport: no double-fire across BroadcastChannel + SSE, overlay reconnects after a server restart.
'use strict';

const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, waitFor, shotDir, log }) {
  let server = await startServer();
  const port = new URL(server.base).port;
  const dataDir = server.dataDir;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    const overlay = await ctx.newPage();
    await overlay.goto(`${server.base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    const panel = await ctx.newPage();
    await panel.goto(`${server.base}/`);
    await panel.waitForSelector('#pad button');
    const iframe = panel.frameLocator('#preview');
    await panel.waitForFunction(() => {
      const f = document.querySelector('#preview');
      return f && f.contentWindow && f.contentWindow.livefx && f.contentWindow.livefx.bus.serverOk;
    }, null, { timeout: 5000 });

    // One utterance -> exactly one card in the separate overlay tab AND in the preview iframe.
    await panel.fill('#sim', 'das ist ja krass');
    await panel.click('#btn-sim');
    await sleep(900);
    const tabCards = await overlay.locator('.fx-card').count();
    const iframeCards = await iframe.locator('.fx-card').count();
    log(`cards: overlay tab=${tabCards}, preview iframe=${iframeCards}`);
    if (tabCards !== 1) throw new Error(`expected exactly 1 card in overlay tab, got ${tabCards}`);
    if (iframeCards !== 1) throw new Error(`expected exactly 1 card in preview iframe, got ${iframeCards}`);
    const stats = await overlay.evaluate(() => (window.livefx.renderer.stats ? window.livefx.renderer.stats.fires : null));
    if (stats !== null && stats !== 1) throw new Error(`renderer.stats.fires = ${stats}`);
    await overlay.screenshot({ path: path.join(shotDir, 'core-single-fire.png') });

    // Server restart on the same port: the overlay must come back on its own and keep working.
    await server.stop();
    await overlay.waitForFunction(() => !window.livefx.bus.serverOk, null, { timeout: 10000 });
    server = await startServer({ env: { PORT: port, LIVEFX_DATA_DIR: dataDir } });
    await overlay.waitForFunction(() => window.livefx.bus.serverOk, null, { timeout: 15000 });
    await panel.waitForFunction(() => window.livefx.bus.serverOk, null, { timeout: 15000 });
    await sleep(3000); // let any stale cards expire
    await panel.fill('#sim', 'bruh');
    await panel.click('#btn-sim');
    await overlay.waitForSelector('.fx-card', { timeout: 4000 });
    const text = await overlay.textContent('.fx-card .fx-text');
    if (!/BRUH/i.test(text)) throw new Error(`unexpected card after reconnect: ${text}`);
    log('overlay recovered after server restart');
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
