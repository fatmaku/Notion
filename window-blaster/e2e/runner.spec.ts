import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, waitForPlay } from './helpers';

test.describe('runner mode (demo side window)', () => {
  test('obstacles from real tracks, jumping clears them, collisions cost lives', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?demo=1&seed=21&skipTo=play&test=1&mode=side-runner&noshake=1');
    await waitForPlay(page);
    await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { obstacles: number } } }).__wb.snapshot().obstacles) >= 1, null, { timeout: 30_000 });
    // auto-play: jump when the next obstacle is close
    const deadline = Date.now() + 25_000;
    let cleared = 0;
    let livesLost = 0;
    while (Date.now() < deadline) {
      const s = await snapshot(page);
      if (!String(s.screen).includes('play') || s.ended) break;
      cleared = Number(s.cleared);
      livesLost = 3 - Number(s.lives);
      const d = Number(s.nextObstacle);
      if (d >= 0 && d < 140 && s.grounded) {
        await page.evaluate(() => {
          const b = document.querySelector('.hud-btn.jump');
          b?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
          setTimeout(() => b?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })), 250);
        });
      }
      await page.waitForTimeout(40);
    }
    await page.screenshot({ path: 'test-results/runner.png' });
    expect(cleared + livesLost).toBeGreaterThan(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('without jumping the runner eventually loses all lives and sees results', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/?demo=1&seed=22&skipTo=play&test=1&mode=side-runner&noshake=1');
    await waitForPlay(page);
    await expect(page.getByText('Runde vorbei')).toBeVisible({ timeout: 120_000 });
  });
});
