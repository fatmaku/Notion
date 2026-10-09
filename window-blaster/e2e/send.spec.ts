import { expect, test, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { collectErrors } from './helpers';

const PUB = 'https://fatmaku.github.io/Notion/window-blaster/';

/** Reads the QR SVG on the page back into modules and decodes it with jsQR. */
async function decodeQr(page: Page, sel: string): Promise<string | null> {
  const { n, d } = await page.locator(`${sel} svg`).evaluate((svg) => ({
    n: Number(svg.getAttribute('viewBox')!.split(' ')[2]),
    d: svg.querySelector('path')!.getAttribute('d')!,
  }));
  const m: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  for (const cmd of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, run] = [Number(cmd[1]), Number(cmd[2]), Number(cmd[3])];
    for (let i = 0; i < run; i++) m[y][x + i] = true;
  }
  const px = 4;
  const size = n * px;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = m[Math.floor(y / px)][Math.floor(x / px)] ? 0 : 255;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  return jsQR(data, size, size)?.data ?? null;
}

test('send screen: online, Meta Quest and Mac QR codes decode to the right addresses', async ({ page }) => {
  const errors = collectErrors(page);
  // the public copy is "live" and a Mac launcher serves this page (both simulated)
  await page.route(`${PUB}wb-meta.json`, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"version":"0.8.0"}' }));
  await page.route('**/wb-status', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, setupUrl: 'http://192.168.1.5:8080/handy', publicUrl: PUB }) }));
  await page.goto('/?demo=1&test=1');
  await page.locator('button[data-send-open]').click();
  await expect(page.getByRole('heading', { name: /Auf anderes Gerät/ })).toBeVisible();
  await expect(page.locator('[data-send-qr="online"]')).toBeVisible();
  expect(await decodeQr(page, '[data-send-qr="online"]')).toBe(PUB);
  await page.screenshot({ path: 'test-results/send-online.png' });
  await page.locator('[data-send-tab="quest"]').click();
  expect(await decodeQr(page, '[data-send-qr="quest"]')).toBe(`https://www.oculus.com/open_url/?url=${encodeURIComponent(PUB)}`);
  await page.locator('[data-send-tab="mac"]').click();
  expect(await decodeQr(page, '[data-send-qr="mac"]')).toBe('http://192.168.1.5:8080/handy');
  await expect(page.locator('[data-send-url="mac"]')).toHaveText('http://192.168.1.5:8080/handy');
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.locator('[data-screen="start"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('send screen without a public copy or Mac explains what to do', async ({ page }) => {
  await page.route(`${PUB}wb-meta.json`, (r) => r.fulfill({ status: 404, body: 'not found' }));
  await page.goto('/?demo=1&test=1');
  await page.locator('button[data-send-open]').click();
  await expect(page.locator('[data-send="none"]')).toBeVisible();
});

test('glasses screen without a headset browser links to the address QR', async ({ page }) => {
  await page.route('**/wb-status', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, setupUrl: 'http://192.168.1.5:8080/handy', publicUrl: '' }) }));
  await page.route(`${PUB}wb-meta.json`, (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto('/?demo=1&test=1');
  await page.locator('button[data-glasses]').click();
  await page.locator('.gl-section button[data-send-open]').click();
  await expect(page.locator('[data-send-qr="mac"]')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByRole('heading', { name: /Brillen & Headsets/ })).toBeVisible();
});
