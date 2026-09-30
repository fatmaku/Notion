import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, waitForPlay } from './helpers';

// The demo scene renders a real bright window pane inside a dark interior with
// simulated hand shake, so this exercises the estimator + edge snapper end to end.
test('window is auto-detected on the demo scene, calibration confirms, tracking stays on during play', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo=1&seed=11&skipTo=calibrate&test=1&round=20&mode=front-shooter&weapons=smg,paint');
  await expect(page.getByText('Scheibe vermessen')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.badge.ok')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/calibrate.png' });
  // corners must sit near the demo window frame (known geometry: TL≈(140,80) … BL≈(80,600) in 1280×720 video px)
  const quad = await page.evaluate(() => (window as unknown as { __wb: { app: { windowState: { quad: { x: number; y: number }[] } } } }).__wb.app.windowState.quad);
  const truth = [
    { x: 140, y: 80 },
    { x: 1140, y: 80 },
    { x: 1200, y: 600 },
    { x: 80, y: 600 },
  ];
  for (let i = 0; i < 4; i++) {
    const d = Math.hypot(quad[i].x - truth[i].x, quad[i].y - truth[i].y);
    expect(d, `corner ${i} off by ${d.toFixed(0)}px`).toBeLessThan(40);
  }
  await page.getByRole('button', { name: /Passt so/ }).click();
  await waitForPlay(page);
  await page.waitForTimeout(2500);
  const s = await snapshot(page);
  expect(String(s.win)).toMatch(/^tracking/);
  await page.screenshot({ path: 'test-results/play-tracked.png' });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('"Ganzes Bild" switches to fullframe and "Automatisch" re-detects', async ({ page }) => {
  await page.goto('/?demo=1&seed=12&skipTo=calibrate&test=1&mode=side-shooter');
  await expect(page.locator('.badge.ok')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Ganzes Bild/ }).click();
  await page.waitForTimeout(800);
  let s = await snapshot(page);
  expect(String(s.win)).toMatch(/^fullframe/);
  await page.getByRole('button', { name: /Automatisch/ }).click();
  await expect(page.locator('.badge.ok')).toBeVisible({ timeout: 10_000 });
  s = await snapshot(page);
  expect(String(s.win)).toMatch(/^tracking/);
});
