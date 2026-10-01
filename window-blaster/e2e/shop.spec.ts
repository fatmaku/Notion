import { expect, test } from '@playwright/test';
import { targetCss, waitForPlay } from './helpers';

test('points earned in a round unlock the egg in the shop and it becomes selectable', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?demo=1&seed=31&skipTo=play&test=1&round=8&mode=front-shooter&weapons=grenade,rocket&noshake=1');
  await waitForPlay(page);
  for (let i = 0; i < 8; i++) {
    const p = await targetCss(page);
    if (p) await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(900);
  }
  await expect(page.getByText('Runde vorbei')).toBeVisible({ timeout: 30_000 });
  // top up the wallet deterministically for the test, then shop
  await page.evaluate(() => (window as unknown as { __wb: { app: { unlocks: { earn(n: number): void } } } }).__wb.app.unlocks.earn(5000));
  await page.getByRole('button', { name: /Shop/ }).click();
  await expect(page.getByText('Freischalten')).toBeVisible();
  await page.getByRole('button', { name: '🔓 1.500' }).first().click();
  await page.getByRole('button', { name: /Ja, für 1\.500/ }).click();
  const eggCard = page.locator('.choice').filter({ has: page.getByText('Ei', { exact: true }) }).first();
  await expect(eggCard.getByText('Freigeschaltet')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await page.getByRole('button', { name: /Demo ohne Kamera/ }).click();
  const hold = page.getByRole('button', { name: /Ich bin nicht am Steuer/ });
  await hold.scrollIntoViewIfNeeded();
  const box = (await hold.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up();
  await page.getByRole('button', { name: /Front-Shooter/ }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  const egg = page.locator('.choice').filter({ has: page.getByText('Ei', { exact: true }) }).first();
  await expect(egg).not.toHaveClass(/locked/);
  const tomato = page.locator('.choice').filter({ has: page.getByText('Tomate', { exact: true }) }).first();
  await expect(tomato).toHaveClass(/locked/);
});
