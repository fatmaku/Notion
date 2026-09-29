// node test/e2e.js  – starts server.js, opens panel + overlay in Chromium, simulates speech.
const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const port = 8799;
  const server = spawn('node', [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(port) } });
  await new Promise((r) => server.stdout.once('data', r));
  const base = `http://localhost:${port}`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const overlay = await ctx.newPage();
    await overlay.goto(`${base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    const panel = await ctx.newPage();
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.fill('#sim', 'oh nein das war ein fail');
    await panel.click('#btn-sim');

    await overlay.waitForSelector('.fx-card', { timeout: 3000 });
    const text = await overlay.textContent('.fx-card .fx-text');
    if (!text.includes('wah')) throw new Error('unexpected card ' + text);

    // hotkey → rain effect via SSE
    await panel.keyboard.press('4'); // lol → rain
    await overlay.waitForSelector('.fx-drop', { timeout: 3000 });
    await overlay.screenshot({ path: path.join(process.env.SHOT_DIR || __dirname, 'overlay.png') });

    const logs = await panel.textContent('#log');
    if (!logs.includes('Fail') || !logs.includes('LOL')) throw new Error('panel log missing entries: ' + logs);
    await panel.screenshot({ path: path.join(process.env.SHOT_DIR || __dirname, 'panel.png'), fullPage: true });
    console.log('e2e: OK');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
