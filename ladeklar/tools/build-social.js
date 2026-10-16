// Social-media images (1080×1350) for the five LinkedIn posts in business/WERBETEXTE.md:
//   marketing/social/Ladeklar_Post_1.png … _5.png
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const out = path.join(ROOT, 'marketing/social');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (let n = 1; n <= 5; n++) {
  await p.goto(`${base}/marketing/social.html?post=${n}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 20000 });
  await p.screenshot({ path: path.join(out, `Ladeklar_Post_${n}.png`) });
  console.log('  marketing/social/Ladeklar_Post_' + n + '.png');
}
await b.close(); srv.close();
