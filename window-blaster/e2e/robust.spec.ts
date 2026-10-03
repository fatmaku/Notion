import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Failure paths a phone hits in practice: reset without the Mac, a slow first load,
// launcher pages under the game's service worker.
const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'launcher', 'dist', 'windowblaster-linux-amd64');
const PORT = 18780;
const base = `http://localhost:${PORT}/`;
let proc: ChildProcess | null = null;

test.beforeAll(async () => {
  test.skip(!existsSync(BIN), 'launcher not built');
  const tmp = mkdtempSync(join(tmpdir(), 'wb-robust-'));
  proc = spawn(BIN, ['--app', join(HERE, '..', 'dist'), '--data', tmp, '--http', String(PORT), '--https', String(PORT + 363), '--open=false', '--quiet'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
});
test.afterAll(() => proc?.kill('SIGINT'));

test('reset without the Mac deletes nothing and the offline app still starts', async ({ page, context }) => {
  test.setTimeout(180_000);
  await page.goto(base + '?test=1');
  await page.getByRole('button', { name: /Für offline vorbereiten/ }).click();
  await expect(page.getByText(/Offline bereit/)).toBeVisible({ timeout: 120_000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });
  await context.setOffline(true);
  const outcome = await page.evaluate(
    () => new Promise<string>((resolve) => (window as unknown as { __wbReset: (d: () => void, o: () => void) => void }).__wbReset(() => resolve('wiped'), () => resolve('offline'))),
  );
  expect(outcome).toBe('offline');
  await page.goto(base + '?test=1');
  await expect(page.getByText(/Offline bereit/)).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
});

test('launcher pages and status are never answered from the game cache', async ({ page }) => {
  await page.goto(base + '?test=1');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });
  await page.goto(base + 'verbinden');
  await expect(page.getByText('Handy einrichten')).toBeVisible();
  await page.waitForTimeout(2000); // a few status polls
  const cached = await page.evaluate(async () => {
    const hits: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) if (/wb-status|verbinden|wbping/.test(r.url)) hits.push(r.url);
    return hits;
  });
  expect(cached).toEqual([]);
});

test('a slow first load withdraws the "startet nicht" screen once the app runs', async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.clock.install();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(/\/assets\/main-.*\.js$/, async (route) => {
    await gate;
    await route.continue();
  });
  // module scripts hold back DOMContentLoaded – wait for the inline watchdog instead
  await page.goto(base + '?test=1', { waitUntil: 'commit' });
  await page.waitForFunction(() => typeof (window as unknown as { __wbReset?: unknown }).__wbReset === 'function');
  await page.clock.runFor(31_000);
  await expect(page.getByText('Window Blaster startet nicht')).toBeVisible();
  release();
  await page.waitForFunction(() => (window as unknown as { __wbBooted?: boolean }).__wbBooted === true, null, { timeout: 30_000 });
  await expect(page.locator('#wbBootFail')).toHaveCount(0);
  await ctx.close();
});
