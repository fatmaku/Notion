// Renders public/icons/icon.svg to PNG sizes with the locally installed Playwright Chromium.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const svg = readFileSync(join(root, 'public/icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [size, name, maskable] of [
  [192, 'icon-192.png', false],
  [512, 'icon-512.png', false],
  [512, 'icon-512-maskable.png', true],
]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable ? `<div style="position:absolute;inset:0;background:#16324f"></div><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="position:absolute;left:10%;top:10%;width:80%;height:80%">` : `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:100%;height:100%;display:block">`;
  await page.setContent(`<html><body style="margin:0;background:transparent;position:relative;width:${size}px;height:${size}px">${inner}</body></html>`);
  const buf = await page.screenshot({ omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(join(root, 'public/icons', name), buf);
  console.log('wrote', name, buf.length, 'bytes');
}
await browser.close();
