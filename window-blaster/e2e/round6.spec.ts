import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, targetCss, waitForPlay } from './helpers';

// Round 6: frenzy, results photo + share, duel flow, stats.

test('frenzy: a kill streak starts 8 s of unlimited fire and verifies as a bonus', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await page.goto('/?demo=1&seed=3&skipTo=play&test=1&mode=front-shooter&weapons=smg,smg&noshake=1&round=90');
  await waitForPlay(page);
  await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });
  let frenzies = 0;
  const started = Date.now();
  // hold the trigger and sweep the aim over whatever target is live
  let down = false;
  while (Date.now() - started < 75_000 && !frenzies) {
    const p = await targetCss(page);
    if (p) {
      await page.mouse.move(p.x, p.y);
      if (!down) {
        await page.mouse.down();
        down = true;
      }
    }
    await page.waitForTimeout(120);
    const s = await snapshot(page);
    frenzies = Number(s.frenzies);
    if (frenzies) expect(s.frenzy).toBe(true);
  }
  if (down) await page.mouse.up();
  expect(frenzies).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/frenzy.png' });
  // during the frenzy the magazine reads ∞
  const sf = await snapshot(page);
  if (sf.frenzy) expect(String(sf.ammoText)).toBe('∞');
  await page.waitForFunction(() => (window as unknown as { __wb: { snapshot(): { frenzy: boolean } } }).__wb.snapshot().frenzy === false, null, { timeout: 12_000 });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('results show the best-moment photo and the share button downloads a card', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?demo=1&seed=5&skipTo=play&test=1&mode=front-shooter&weapons=smg,grenade&noshake=1&round=12');
  await waitForPlay(page);
  await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });
  for (let i = 0; i < 25; i++) {
    const p = await targetCss(page);
    if (p) {
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.waitForTimeout(350);
      await page.mouse.up();
    } else await page.waitForTimeout(200);
    if (Number((await snapshot(page)).kills) >= 1) break;
  }
  expect(Number((await snapshot(page)).kills)).toBeGreaterThan(0);
  await expect(page.getByText('Runde vorbei')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.photo img')).toBeVisible();
  const src = await page.locator('.photo img').getAttribute('src');
  expect(src).toMatch(/^data:image\/jpeg/);
  const dl = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByRole('button', { name: /Ergebnis teilen/ }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toMatch(/window-blaster-\d+\.png/);
});

test('duel: two players alternate, the board ranks them and announces a result', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await page.goto('/?demo=1&seed=7&test=1&round=8&mode=front-shooter&weapons=smg,grenade&noshake=1');
  await page.getByRole('button', { name: /Duell/ }).click();
  await expect(page.getByText('Runden pro Spieler')).toBeVisible();
  await page.getByRole('button', { name: /Los geht/ }).click();
  // safety hold
  const hold = page.getByRole('button', { name: /Ich bin nicht am Steuer/ });
  await hold.scrollIntoViewIfNeeded();
  const box = (await hold.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2400);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Weiter' }).click(); // mode
  await page.getByRole('button', { name: 'Weiter' }).click(); // weapons
  await page.getByRole('button', { name: /Passt so/ }).click({ timeout: 30_000 });
  await waitForPlay(page);
  await expect(page.getByText('Runde vorbei')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/Runde von Spieler 1/)).toBeVisible();
  await page.getByRole('button', { name: /Zum Duell-Stand/ }).click();
  await expect(page.getByText(/Duell · Runde 1 \/ 2/)).toBeVisible();
  await page.getByRole('button', { name: /Spieler 2 spielt/ }).click();
  await waitForPlay(page);
  await expect(page.getByText('Runde vorbei')).toBeVisible({ timeout: 40_000 });
  await page.getByRole('button', { name: /Zum Duell-Stand/ }).click();
  await expect(page.getByText(/gewinnt!|Unentschieden/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Revanche/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/duel-board.png' });
  await page.getByRole('button', { name: /Zum Menü/ }).click();
  await expect(page.getByRole('button', { name: /Duell/ })).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('stats screen opens from the start screen', async ({ page }) => {
  await page.goto('/?demo=1&test=1');
  await page.getByRole('button', { name: '📊' }).click();
  await expect(page.getByText('Statistik')).toBeVisible();
  await expect(page.getByText('Bestwerte')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByRole('button', { name: /Spielen/ }).first()).toBeVisible();
});
