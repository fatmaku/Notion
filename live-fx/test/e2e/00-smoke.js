// Smoke: panel + overlay load, a simulated utterance renders the matching card in the overlay via SSE.
'use strict';

const path = require('path');

async function run({ browser, startServer, shotDir }) {
  const server = await startServer();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const overlay = await ctx.newPage();
    await overlay.goto(`${server.base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    const panel = await ctx.newPage();
    await panel.goto(`${server.base}/`);
    await panel.waitForSelector('#pad button');
    await panel.fill('#sim', 'oh nein das war ein fail');
    await panel.click('#btn-sim');

    await overlay.waitForSelector('.fx-card', { timeout: 3000 });
    const text = await overlay.textContent('.fx-card .fx-text');
    if (!text.includes('wah')) throw new Error('unexpected card ' + text);
    await overlay.screenshot({ path: path.join(shotDir, 'smoke-overlay.png') });
    await panel.screenshot({ path: path.join(shotDir, 'smoke-panel.png'), fullPage: true });
    await ctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
