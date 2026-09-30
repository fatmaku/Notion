import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, targetCss, waitForPlay } from './helpers';

test.describe('demo mode (synthetic scene + mock detector)', () => {
  test('front shooter: targets are tracked, taps score points, HUD renders', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?demo=1&seed=42&skipTo=play&test=1&round=60&mode=front-shooter&weapons=smg,grenade&noshake=1');
    await waitForPlay(page);
    await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });

    let taps = 0;
    for (let i = 0; i < 40 && taps < 25; i++) {
      const p = await targetCss(page);
      if (p) {
        await page.mouse.click(p.x, p.y);
        taps++;
      }
      await page.waitForTimeout(110);
    }
    expect(taps).toBeGreaterThan(5);
    const s = await snapshot(page);
    expect(Number(s.shots)).toBeGreaterThan(5);
    expect(Number(s.hits)).toBeGreaterThan(0);
    expect(Number(s.score)).toBeGreaterThan(0);
    expect(Number(s.fps)).toBeGreaterThan(4); // software rendering in CI; phones run 30-60
    expect(Number(s.detHz)).toBeGreaterThan(1.5);
    await page.screenshot({ path: 'test-results/front-shooter.png' });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('grenade kill and round end → results screen with score', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?demo=1&seed=7&skipTo=play&test=1&round=8&mode=front-shooter&weapons=grenade,grenade&noshake=1');
    await waitForPlay(page);
    await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { targets: number } } }).__wb.snapshot().targets) >= 1, null, { timeout: 20_000 });
    for (let i = 0; i < 6; i++) {
      const p = await targetCss(page);
      if (p) await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(1100);
    }
    const mid = await snapshot(page);
    expect(Number(mid.kills)).toBeGreaterThan(0);
    await expect(page.locator('.screen .title')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText('Runde vorbei')).toBeVisible();
    // the event log must replay to exactly the displayed score (leaderboard anti-cheat contract)
    const v = await page.evaluate(() => (window as unknown as { __wb: { verifyLast(): { ok: boolean; reason?: string } } }).__wb.verifyLast());
    expect(v.ok, v.reason).toBe(true);
    await page.screenshot({ path: 'test-results/results.png' });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('side shooter tracks fast passing vehicles', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?demo=1&seed=3&skipTo=play&test=1&round=60&mode=side-shooter&weapons=smg,paint&noshake=1');
    await waitForPlay(page);
    await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { tracks: number } } }).__wb.snapshot().tracks) >= 1, null, { timeout: 20_000 });
    await page.waitForTimeout(3000);
    const s = await snapshot(page);
    expect(Number(s.tracks)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: 'test-results/side-shooter.png' });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('menu flow: start → safety hold → mode → weapons → play', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?test=1&noshake=1');
    await page.getByRole('button', { name: /Demo ohne Kamera/ }).click();
    await expect(page.getByText('Nur als Fahrgast')).toBeVisible();
    await page.getByRole('button', { name: /Zug \/ Bahn/ }).click();
    const hold = page.getByRole('button', { name: /Ich bin nicht am Steuer/ });
    const box = (await hold.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2300);
    await page.mouse.up();
    await expect(page.getByText('Was willst du spielen?')).toBeVisible();
    await page.getByRole('button', { name: /Front-Shooter/ }).click();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Wähle deine Waffen')).toBeVisible();
    await page.getByRole('button', { name: /Raketenwerfer/ }).click();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Scheibe vermessen')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Passt so/ }).click();
    await waitForPlay(page);
    const s = await snapshot(page);
    expect(['grenade', 'rocket']).toContain(String(s.weapon)); // smg was replaced by the third pick
    // pause menu
    await page.locator('.hud-btn.pause').click();
    await expect(page.getByText('Pause')).toBeVisible();
    await page.getByRole('button', { name: 'Runde beenden' }).click();
    await expect(page.getByText('Runde vorbei')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
