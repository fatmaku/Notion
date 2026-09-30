import { expect, test } from '@playwright/test';
import { snapshot, waitForPlay } from './helpers';

// Install once, then play without any network: service worker + Cache Storage.
test('offline preparation caches model + wasm; app and detector start with the network cut', async ({ page, context }) => {
  test.setTimeout(240_000);
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: /Für offline vorbereiten/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Für offline vorbereiten/ }).click();
  await expect(page.getByText(/Offline bereit/)).toBeVisible({ timeout: 120_000 });
  // give the service worker time to install + precache the shell
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.goto('/?test=1&skipTo=play&round=20&mode=front-shooter&weapons=smg,paint');
  await waitForPlay(page, 120_000);
  const s = await snapshot(page);
  expect(String(s.detector)).toContain('mediapipe'); // model + wasm came from the cache
  await page.goto('/?test=1');
  await expect(page.getByText(/Offline bereit/)).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
});
