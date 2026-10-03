import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Update path: version A installed + offline data downloaded → server switches to version B →
// the phone gets B on the next launch, keeps the 30 MB offline data, and still works offline.
const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'launcher', 'dist', 'windowblaster-linux-amd64');
const DIST = join(HERE, '..', 'dist');
const PORT = 18680;
let proc: ChildProcess | null = null;
let served = '';

function publish(variant: 'A' | 'B'): void {
  rmSync(served, { recursive: true, force: true });
  cpSync(DIST, served, { recursive: true });
  const idx = join(served, 'index.html');
  writeFileSync(idx, readFileSync(idx, 'utf8').replace('<head>', `<head><meta name="wb-variant" content="${variant}">`));
  if (variant === 'B') {
    // a new build: different service-worker cache name, same offline files
    const swp = join(served, 'sw.js');
    writeFileSync(swp, readFileSync(swp, 'utf8').replace(/wb-([0-9.]+)-([a-z0-9]+)/, 'wb-$1-$2b'));
  }
}

test.beforeAll(async () => {
  test.skip(!existsSync(BIN), 'launcher not built');
  const tmp = mkdtempSync(join(tmpdir(), 'wb-update-'));
  served = join(tmp, 'app');
  publish('A');
  proc = spawn(BIN, ['--app', served, '--data', join(tmp, 'ca'), '--http', String(PORT), '--https', String(PORT + 363), '--open=false', '--quiet'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
});
test.afterAll(() => proc?.kill('SIGINT'));

test('update A → B keeps offline data and still runs offline', async ({ page, context }) => {
  test.setTimeout(240_000);
  const base = `http://localhost:${PORT}/`;
  await page.goto(base + '?test=1');
  await page.getByRole('button', { name: /Für offline vorbereiten/ }).click();
  await expect(page.getByText(/Offline bereit/)).toBeVisible({ timeout: 120_000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });
  const keysA = await page.evaluate(() => caches.keys());
  expect(keysA.filter((k) => k.startsWith('wb-'))).toHaveLength(1);

  publish('B');
  await page.goto(base + '?test=1'); // network-first navigation → B's index right away
  expect(await page.locator('meta[name="wb-variant"]').getAttribute('content')).toBe('B');
  // the new service worker installs, carries over the offline data and drops A's cache
  await page.waitForFunction(async () => {
    const ks = (await caches.keys()).filter((k) => k.startsWith('wb-'));
    if (ks.length !== 1 || !ks[0].endsWith('b')) return false;
    const c = await caches.open(ks[0]);
    return !!(await c.match(new URL('models/efficientdet_lite0.tflite', location.href).href));
  }, null, { timeout: 60_000 });
  await page.waitForLoadState('load');
  await expect(page.getByText(/Offline bereit/)).toBeVisible({ timeout: 30_000 });

  await context.setOffline(true);
  await page.goto(base + '?test=1&skipTo=play&round=20&mode=front-shooter&weapons=smg,paint');
  expect(await page.locator('meta[name="wb-variant"]').getAttribute('content')).toBe('B');
  await page.waitForFunction(() => String((window as unknown as { __wb?: { snapshot(): { screen: string } } }).__wb?.snapshot().screen).includes('play'), null, { timeout: 120_000 });
  const det = await page.evaluate(() => (window as unknown as { __wb: { snapshot(): { detector: string } } }).__wb.snapshot().detector);
  expect(String(det)).toContain('mediapipe');
  await context.setOffline(false);
});
