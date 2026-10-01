import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, targetCss, waitForPlay } from './helpers';

// Soak test: several rounds with every weapon pair, continuous firing. No page errors,
// no swallowed tick errors, frame rate and effect counts stay bounded.
const PAIRS: [string, string][] = [
  ['smg', 'paint'],
  ['grenade', 'rocket'],
  ['milkshake', 'egg'],
  ['tomato', 'snowball'],
  ['banana', 'waterballoon'],
  ['tp', 'laser'],
  ['glove', 'smg'],
];

test('soak: all weapons, front + side, no errors and bounded effects', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  let minFps = Infinity;
  let maxEffects = 0;
  for (const [i, [a, b]] of PAIRS.entries()) {
    const mode = i % 2 ? 'side-shooter' : 'front-shooter';
    await page.goto(`/?demo=1&seed=${100 + i}&skipTo=play&test=1&round=30&mode=${mode}&weapons=${a},${b}&noshake=1`);
    await waitForPlay(page);
    const until = Date.now() + 26_000;
    let swapped = false;
    while (Date.now() < until) {
      const s = await snapshot(page);
      if (!String(s.screen).includes('play')) break;
      if (!swapped && Date.now() > until - 13_000) {
        swapped = true;
        await page.locator('.hud-btn.swap').dispatchEvent('pointerdown');
      }
      const p = await targetCss(page);
      if (p) {
        // hold briefly for auto weapons, tap for the rest
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        await page.waitForTimeout(90);
        await page.mouse.up();
      }
      minFps = Math.min(minFps, Number(s.fps) || minFps);
      maxEffects = Math.max(maxEffects, Number(s.effects) || 0);
      expect(Number(s.tickErrors ?? 0), `tick errors with ${a}/${b}`).toBe(0);
      await page.waitForTimeout(60);
    }
    const s = await snapshot(page);
    console.log(`${mode} ${a}/${b}: score ${s.score} hits ${s.hits} kills ${s.kills} fps ${Number(s.fps).toFixed(0)} effects ${s.effects}`);
    expect(Number(s.hits) + Number(s.kills), `${a}/${b} should register hits`).toBeGreaterThan(0);
  }
  console.log('min fps', minFps.toFixed(1), 'max effects', maxEffects);
  expect(maxEffects).toBeLessThan(1200);
  expect(errors, errors.join('\n')).toEqual([]);
});
