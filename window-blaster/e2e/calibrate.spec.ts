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

test('dragging a corner follows the finger exactly and stays put after release', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo=1&seed=11&skipTo=calibrate&test=1&mode=front-shooter&weapons=smg,paint');
  await expect(page.locator('.badge.ok')).toBeVisible({ timeout: 20_000 });
  const corner = page.locator('.handle.corner').nth(0);
  const box = (await corner.boundingBox())!;
  const scale = await page.evaluate(() => (window as unknown as { __wb: { app: { layers: { scale: number } } } }).__wb.app.layers.scale);
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // the tracker refines live until the finger lands – reference the corner at touch-down
  const before = await page.evaluate(() => (window as unknown as { __wb: { app: { windowTracker: { rawQuad: { x: number; y: number }[] } } } }).__wb.app.windowTracker.rawQuad[0]);
  for (let i = 1; i <= 10; i++) await page.mouse.move(sx + i * 6, sy + i * 4);
  // while the finger is down the tracker is frozen: the corner sits exactly where it was dragged
  const during = await page.evaluate(() => {
    const wt = (window as unknown as { __wb: { app: { windowTracker: { rawQuad: { x: number; y: number }[]; isEditing: boolean } } } }).__wb.app.windowTracker;
    return { rawQuad: wt.rawQuad.map((p) => ({ ...p })), isEditing: wt.isEditing };
  });
  expect(during.isEditing).toBe(true);
  expect(Math.abs(during.rawQuad[0].x - (before.x + 60 / scale))).toBeLessThan(2);
  expect(Math.abs(during.rawQuad[0].y - (before.y + 40 / scale))).toBeLessThan(2);
  await expect(page.locator('.loupe')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.loupe')).toBeHidden();
  await page.waitForTimeout(1500);
  // afterwards only gentle refinement: no jump back to the auto-detected frame
  const after = await page.evaluate(() => (window as unknown as { __wb: { app: { windowState: { quad: { x: number; y: number }[] } } } }).__wb.app.windowState.quad[0]);
  expect(Math.hypot(after.x - during.rawQuad[0].x, after.y - during.rawQuad[0].y)).toBeLessThan(14);
  // one finger inside the pane moves the whole quad
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.down();
  const q0 = await page.evaluate(() => (window as unknown as { __wb: { app: { windowTracker: { rawQuad: { x: number; y: number }[] } } } }).__wb.app.windowTracker.rawQuad.map((p) => ({ ...p })));
  for (let i = 1; i <= 8; i++) await page.mouse.move(vp.width / 2 - i * 5, vp.height / 2 + i * 3);
  const q1 = await page.evaluate(() => (window as unknown as { __wb: { app: { windowTracker: { rawQuad: { x: number; y: number }[] } } } }).__wb.app.windowTracker.rawQuad);
  await page.mouse.up();
  for (let i = 0; i < 4; i++) {
    expect(Math.abs(q1[i].x - q0[i].x + 40 / scale)).toBeLessThan(2);
    expect(Math.abs(q1[i].y - q0[i].y - 24 / scale)).toBeLessThan(2);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});
