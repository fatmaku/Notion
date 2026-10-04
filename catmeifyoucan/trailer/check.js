// Prüft das Layout aller Sprachen/Formate, ohne Video zu rendern:
//  · kein Text außerhalb des Bildes (Rand 24 px)
//  · 9:16: kein Text in den oberen 220 px und unteren 380 px und nicht näher als 100 px am Seitenrand
//    (Bedienelemente von Reels/TikTok/Shorts)
//  · Zustands-Chips liegen ganz in ihrer Karte
//  · Überschriften nicht kleiner als 60 px, keine Überlappung von Textblock und Bild-Elementen
// Aufruf: node trailer/check.js   (Exit-Code 1 bei Fehlern)
import { startServer } from './serve.js';
import { LANGS } from './texts.js';
import { loadPlaywright, launchOptions } from '../test/helpers/playwright.js';

// Zeitpunkte, an denen in jeder Szene aller Text sichtbar ist
const MOMENTS = { s1: 2.7, s2: 6.8, s3: 10.6, s4: 15.6, s5: 20.7, s6: 25.5 };
const { server, port } = await startServer(0);
const pw = await loadPlaywright();
const browser = await pw.chromium.launch(launchOptions());
const problems = [];
try {
  for (const lang of LANGS) {
    for (const format of ['16x9', '9x16']) {
      const [w, h] = format === '9x16' ? [1080, 1920] : [1920, 1080];
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`http://127.0.0.1:${port}/trailer/scene.html?lang=${lang}&format=${format}`);
      await page.waitForFunction(() => window.__ready || window.__error);
      for (const [scene, t] of Object.entries(MOMENTS)) {
        const res = await page.evaluate(
          ({ scene, t, w, h, f9 }) => {
            window.renderAt(t);
            const root = document.getElementById(scene);
            const sel = '.copy .ln > span, .copy .sub, .newcat, .counter, .chip, .plus1, .bubble, .word .wl > span, .play, .rules, .maker, .namefield';
            const out = [];
            for (const el of root.querySelectorAll(sel)) {
              const r = el.getBoundingClientRect();
              if (!r.width || getComputedStyle(el).opacity === '0') continue;
              const name = el.className.baseVal ?? el.className;
              const txt = (el.innerText || '').trim().slice(0, 40);
              const pad = 24;
              if (r.left < pad || r.right > w - pad || r.top < pad || r.bottom > h - pad) out.push(`${name} „${txt}“ außerhalb des Bildes (${r.left | 0},${r.top | 0} – ${r.right | 0},${r.bottom | 0})`);
              if (f9 && (r.top < 220 || r.bottom > h - 380)) out.push(`${name} „${txt}“ außerhalb der 9:16-Schutzzone (${r.top | 0}–${r.bottom | 0})`);
              if (f9 && (r.left < 100 || r.right > w - 100)) out.push(`${name} „${txt}“ zu nah am Seitenrand (${r.left | 0}–${r.right | 0})`);
              const pop = el.classList.contains('chip') && el.closest('.pop');
              if (pop) {
                const pr = pop.getBoundingClientRect();
                if (r.left < pr.left - 1 || r.right > pr.right + 1) out.push(`Chip „${txt}“ ragt aus der Karte (${r.left | 0}–${r.right | 0} statt ${pr.left | 0}–${pr.right | 0})`);
                if (el.scrollWidth > el.clientWidth + 1) out.push(`Chip „${txt}“: Text breiter als der Chip`);
              }
              if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.push(`${name} „${txt}“ abgeschnitten`);
            }
            const hEl = root.querySelector('.copy .h');
            if (hEl && parseFloat(hEl.style.fontSize) < 60) out.push(`Überschrift nur ${hEl.style.fontSize}`);
            // Textblock gegen Bildbereich (nur Überschrift/Unterzeile gegen .vis-Inhalt in 9:16)
            const copy = root.querySelector('.copy');
            const vis = root.querySelector('.vis');
            if (copy && vis && f9) {
              const lines = [...copy.querySelectorAll('.ln > span, .sub')].map((e) => e.getBoundingClientRect());
              const top = Math.min(...lines.map((r) => r.top));
              const items = [...vis.querySelectorAll('.phone, .card, .grid, .cup, .map, .pop')].map((e) => e.getBoundingClientRect());
              const bottom = Math.max(...items.map((r) => r.bottom));
              if (bottom > top + 4) out.push(`Bild (${bottom | 0}) überlappt Text (${top | 0})`);
            }
            return out;
          },
          { scene, t, w, h, f9: format === '9x16' },
        );
        for (const p of res) problems.push(`${lang} ${format} ${scene}: ${p}`);
      }
      const sizes = await page.evaluate(() => window.__meta.sizes.join(' '));
      console.log(`${lang} ${format}: Überschriften ${sizes}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log('Layout ok: alle Texte im Bild und in der Schutzzone.');
