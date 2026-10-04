// Einzelbilder zum Prüfen: node trailer/preview.js --lang en --format 16x9 --t 1.5,5,9,14.5,19.5,24.5 --out /tmp/frames
import path from 'node:path';
import fs from 'node:fs';
import { startServer } from './serve.js';
import { loadPlaywright, launchOptions } from '../test/helpers/playwright.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const langs = (args.lang || 'en').split(',');
const formats = (args.format || '16x9').split(',');
const times = (args.t || '1.5,5,9,14.5,19.5,24.5').split(',').map(Number);
const out = args.out || path.join(process.cwd(), 'preview');
fs.mkdirSync(out, { recursive: true });

const { server, port } = await startServer(0);
const pw = await loadPlaywright();
const browser = await pw.chromium.launch(launchOptions());
try {
  for (const lang of langs) {
    for (const format of formats) {
      const [w, h] = format === '9x16' ? [1080, 1920] : [1920, 1080];
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(`http://127.0.0.1:${port}/trailer/scene.html?lang=${lang}&format=${format}`);
      await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 30000 });
      const err = await page.evaluate(() => window.__error);
      if (err) throw new Error(err);
      for (const t of times) {
        await page.evaluate((tt) => window.renderAt(tt), t);
        const file = path.join(out, `${lang}-${format}-t${String(Math.round(t * 1000)).padStart(5, '0')}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
        console.log(file);
      }
      console.log(JSON.stringify(await page.evaluate(() => window.__meta)), errors.length ? errors : '');
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
