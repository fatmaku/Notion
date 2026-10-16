// Renders the Ladeklar app icons (PNG) from SVG with the bundled Chromium.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = new URL('../web/icons/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const mark = (pad, bg = '#0b1622', round = 22) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="${round}" fill="${bg}"/><g transform="translate(${pad} ${pad}) scale(${(100 - 2 * pad) / 100})"><rect x="12" y="12" width="76" height="76" rx="20" fill="#c8a45c"/><path d="M33 31v38h22" stroke="#0b1622" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m53 56 9 9 15-21" stroke="#0b1622" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30 24v50h26" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m55 58 10 10 18-26" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
fs.writeFileSync(out + 'favicon.svg', mark(0, '#0b1622', 24));
fs.writeFileSync(out + 'mark.svg', mark(0, 'none', 0));
const b = await chromium.launch();
const p = await b.newPage();
const shot = async (svg, size, file, transparent = false) => {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#0b1622'}">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: out + file, omitBackground: transparent });
};
await shot(mark(0, '#0b1622', 0), 512, 'icon-512.png');
await shot(mark(0, '#0b1622', 0), 192, 'icon-192.png');
await shot(mark(14, '#0b1622', 0), 512, 'icon-maskable-512.png');
await shot(mark(0, '#0b1622', 0), 180, 'apple-touch-icon.png');
await shot(badge, 96, 'badge-96.png', true);
await b.close();
console.log('icons written to', out);
