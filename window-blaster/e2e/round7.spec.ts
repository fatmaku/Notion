import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, waitForPlay } from './helpers';
import { weeklyChallenge } from '../src/game/scoring/Challenges';

// Round 7: runner power-ups, weekly challenge, English UI.

test('runner: power-up pickups appear and get collected; the x2 bonus verifies', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto('/?demo=1&seed=4&skipTo=play&test=1&mode=side-runner&noshake=1&lives=9');
  await waitForPlay(page);
  // play along: jump over ground obstacles, duck under birds – until a power-up has been collected
  const jump = page.locator('.hud-btn.jump');
  const duck = page.locator('.hud-btn.duck');
  const started = Date.now();
  let s = await snapshot(page);
  let ducking = false;
  while (Date.now() - started < 150_000 && Number(s.powerups) < 1 && Number(s.lives) > 0 && String(s.screen).includes('play')) {
    const o = Number(s.nextObstacle);
    const b = Number(s.nextBird);
    if (b >= 0 && b < 260 && !ducking) {
      await duck.dispatchEvent('pointerdown');
      ducking = true;
    } else if (ducking && (b < 0 || b > 300)) {
      await duck.dispatchEvent('pointerup');
      ducking = false;
    }
    if (!ducking && o > 0 && o < 220) {
      await jump.dispatchEvent('pointerdown');
      await page.waitForTimeout(350);
      await jump.dispatchEvent('pointerup');
    }
    await page.waitForTimeout(80);
    s = await snapshot(page);
  }
  if (ducking && String(s.screen).includes('play')) await duck.dispatchEvent('pointerup');
  expect(Number(s.lives), 'runner survived').toBeGreaterThan(0);
  expect(Number(s.powerups)).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/powerup.png' });
  // end the round via the pause menu and check the event log still verifies (x2 bonuses included)
  await page.locator('.hud-btn.pause').click();
  await page.getByRole('button', { name: 'Runde beenden' }).click();
  await expect(page.getByText('Runde vorbei')).toBeVisible();
  const v = await page.evaluate(() => (window as unknown as { __wb: { verifyLast(): { ok: boolean; reason?: string } } }).__wb.verifyLast());
  expect(v.ok, v.reason).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('weekly challenge: fixed mode and loadout, mode/weapon screens skipped, weekly best recorded', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?demo=1&test=1&round=8&noshake=1');
  await page.getByRole('button', { name: /Challenges/ }).click();
  await expect(page.getByText(/Wochen-Challenge/)).toBeVisible();
  const weekly = weeklyChallenge();
  await page.getByRole('button', { name: '▶ Spielen' }).nth(1).click();
  const hold = page.getByRole('button', { name: /Ich bin nicht am Steuer/ });
  await hold.scrollIntoViewIfNeeded();
  const box = (await hold.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2400);
  await page.mouse.up();
  // no mode / weapon choice: straight to calibration
  await expect(page.getByText('Scheibe vermessen')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Was willst du spielen?')).toHaveCount(0);
  await page.getByRole('button', { name: /Passt so/ }).click();
  await waitForPlay(page);
  const s = await snapshot(page);
  if (weekly.mode === 'side-runner') expect(String(s.screen)).toContain('play');
  else expect(weekly.weapons).toContain(String(s.weapon));
  await expect(page.getByText('Runde vorbei')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/Wochen-Challenge · diese Woche/)).toBeVisible();
});

test('English UI via ?lang=en and via the settings switch', async ({ page }) => {
  await page.goto('/?demo=1&test=1&lang=en');
  await expect(page.getByRole('button', { name: /Demo without camera/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^🎥 Play$/ })).toBeVisible();
  // settings switch back to German
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: 'Deutsch' }).click();
  await expect(page.getByText('Einstellungen')).toBeVisible();
  await page.locator('.screen .card button').last().click(); // back/done
  await expect(page.getByRole('button', { name: /Demo ohne Kamera/ })).toBeVisible();
});
