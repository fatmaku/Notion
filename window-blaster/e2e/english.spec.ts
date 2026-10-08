import { expect, test } from '@playwright/test';
import { snapshot, waitForPlay } from './helpers';

// The whole menu flow in English (?lang=en) – every screen must render English labels.
test('English: start → safety → mode → weapons → calibrate → play → results', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?test=1&noshake=1&lang=en');
  await page.getByRole('button', { name: /Demo without camera/ }).click();
  await expect(page.getByText('Passengers only')).toBeVisible();
  await page.getByRole('button', { name: /Train \/ rail/ }).click();
  const hold = page.getByRole('button', { name: /I am not driving/ });
  await hold.scrollIntoViewIfNeeded();
  const box = (await hold.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up();
  await expect(page.getByText('What do you want to play?')).toBeVisible();
  await page.getByRole('button', { name: /Front Shooter/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Pick your weapons')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Measure the window')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Looks good/ }).click();
  await waitForPlay(page);
  await page.waitForTimeout(1500);
  const s = await snapshot(page);
  expect(String(s.screen)).toContain('play');
  await page.locator('.hud-btn.pause').click();
  await expect(page.getByText('Paused')).toBeVisible();
  await page.getByRole('button', { name: 'End round' }).click();
  await expect(page.getByText('Round over')).toBeVisible();
  await page.screenshot({ path: 'test-results/english-results.png' });
  // no German words left on the results screen
  const text = await page.locator('.screen .card').innerText();
  expect(text).not.toMatch(/Runde|Punkte|Treffer|Teilen|Bestwert|Nochmal|Menü|Rangliste|Guthaben/);
});

test('English: settings, shop, stats, challenges and duel screens are translated', async ({ page }) => {
  await page.goto('/?demo=1&test=1&lang=en');
  const german = /Einstellungen|Sprache|Lautstärke|Rundenl|Freischalten|Guthaben|Statistik|Runden|Spielzeit|Challenges · Tag|Wochen|Spieler|Duell/;
  await page.getByRole('button', { name: '⚙️' }).click();
  expect(await page.locator('.screen .card').innerText()).not.toMatch(german);
  await page.locator('.screen .card button').last().click();
  await page.getByRole('button', { name: '📊' }).click();
  expect(await page.locator('.screen .card').innerText()).not.toMatch(german);
  await page.locator('.screen .card button').last().click();
  await page.getByRole('button', { name: /Challenges/ }).click();
  expect(await page.locator('.screen .card').innerText()).not.toMatch(german);
  await page.locator('.screen .card button').last().click();
  await page.getByRole('button', { name: /Duel/ }).click();
  expect(await page.locator('.screen .card').innerText()).not.toMatch(german);
});
