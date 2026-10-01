import { expect, test } from '@playwright/test';
import { snapshot, targetCss, waitForPlay } from './helpers';

// Visual checks: hand runner with birds, sticky paint splats on moving cars.
test('runner shows the hand character and birds', async ({ page }) => {
  await page.goto('/?demo=1&seed=5&skipTo=play&test=1&mode=side-runner&noshake=1');
  await waitForPlay(page);
  await page.waitForTimeout(6500);
  await page.screenshot({ path: 'test-results/runner-hand.png' });
  const s = await snapshot(page);
  expect(Number(s.lives)).toBeGreaterThanOrEqual(0);
});

test('paint splats stick to a moving car', async ({ page }) => {
  await page.goto('/?demo=1&seed=9&skipTo=play&test=1&mode=front-shooter&weapons=paint,milkshake&noshake=1&round=60');
  await waitForPlay(page);
  await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });
  for (let i = 0; i < 12; i++) {
    const p = await targetCss(page);
    if (p) await page.mouse.click(p.x + (i % 3) * 6 - 6, p.y + (i % 2) * 8 - 4);
    await page.waitForTimeout(230);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/paint.png' });
  const s = await snapshot(page);
  expect(Number(s.hits)).toBeGreaterThan(3);
  // swap to milkshake and throw
  await page.locator('.hud-btn.swap').dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  const p = await targetCss(page);
  if (p) await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/milkshake.png' });
});

test('new weapons: egg splat, toilet paper, POW and laser beam render', async ({ page }) => {
  await page.goto('/?demo=1&seed=13&skipTo=play&test=1&mode=front-shooter&weapons=egg,tp&noshake=1&round=60');
  await waitForPlay(page);
  await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });
  for (let i = 0; i < 5; i++) {
    const p = await targetCss(page);
    if (p) await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(700);
  }
  await page.locator('.hud-btn.swap').dispatchEvent('pointerdown');
  for (let i = 0; i < 4; i++) {
    const p = await targetCss(page);
    if (p) await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/egg-tp.png' });
  await page.goto('/?demo=1&seed=14&skipTo=play&test=1&mode=front-shooter&weapons=glove,laser&noshake=1&round=60');
  await waitForPlay(page);
  await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });
  const p = await targetCss(page);
  if (p) await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'test-results/pow.png' });
  await page.locator('.hud-btn.swap').dispatchEvent('pointerdown');
  const p2 = await targetCss(page);
  if (p2) {
    await page.mouse.move(p2.x, p2.y);
    await page.mouse.down();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/laser.png' });
    await page.mouse.up();
  }
  const s = await snapshot(page);
  expect(Number(s.hits)).toBeGreaterThan(0);
});
