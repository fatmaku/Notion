// Print PDFs (with 3 mm bleed) from marketing/print.html:
//   marketing/Ladeklar_Flyer_A4.pdf (2 pages) and marketing/Ladeklar_Postkarte_A6.pdf (2 pages)
// Contact data, website and QR target: marketing/print-config.json
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const b = await chromium.launch();
const p = await b.newPage();
for (const [doc, w, h, out] of [['flyer', '216mm', '303mm', 'Ladeklar_Flyer_A4.pdf'], ['postcard', '111mm', '154mm', 'Ladeklar_Postkarte_A6.pdf']]) {
  await p.goto(`${base}/marketing/print.html?doc=${doc}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 20000 });
  await p.pdf({ path: path.join(ROOT, 'marketing', out), width: w, height: h, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await p.setViewportSize({ width: doc === 'flyer' ? 816 : 420, height: doc === 'flyer' ? 1145 : 582 });
  await p.screenshot({ path: path.join(ROOT, 'marketing', out.replace('.pdf', '-vorschau.png')), fullPage: true });
  console.log('  ', out);
}
await b.close(); srv.close();
