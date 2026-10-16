// Renders slide backgrounds (ink + glow + route net) for the pitch deck.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'business/deck-assets');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
fs.writeFileSync(path.join(ROOT, 'tools/.deckbg.html'), `<!doctype html><html><body style="margin:0"><div id="bg" style="position:relative;width:1920px;height:1080px;overflow:hidden"></div><script type="module">
import { routeNet } from '/web/js/routenet.js';
window.paint = (v) => {
  const bg = document.getElementById('bg');
  const glows = { a: 'radial-gradient(70% 80% at 92% 0%, rgba(200,164,92,.28), transparent 60%), radial-gradient(60% 70% at 0% 100%, rgba(14,124,123,.22), transparent 60%)', b: 'radial-gradient(60% 70% at 100% 100%, rgba(200,164,92,.22), transparent 60%), radial-gradient(50% 60% at 0% 0%, rgba(14,124,123,.18), transparent 60%)', c: 'radial-gradient(80% 90% at 50% 120%, rgba(200,164,92,.35), transparent 60%)' };
  bg.innerHTML = '<canvas style="position:absolute;' + (v === 'c' ? 'left:560px;top:40px;width:800px;height:1000px' : 'right:-60px;top:-40px;width:900px;height:1160px') + '"></canvas>';
  bg.style.background = glows[v] + ', #0b1622';
  const n = routeNet(bg.querySelector('canvas'), { accent: '#e6cd92', trucks: 18, alpha: v === 'c' ? 0.55 : 0.4, pad: 20 });
  n.drawAt(7.3);
};
window.ready = true;
</script></body></html>`);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(base + '/tools/.deckbg.html');
await p.waitForFunction(() => window.ready);
for (const v of ['a', 'b', 'c']) { await p.evaluate((v) => window.paint(v), v); await p.locator('#bg').screenshot({ path: path.join(OUT, `bg-${v}.png`) }); }
await b.close(); srv.close(); fs.unlinkSync(path.join(ROOT, 'tools/.deckbg.html'));
console.log('backgrounds ok');
