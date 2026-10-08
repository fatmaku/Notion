import { expect, test, type Page } from '@playwright/test';
import { collectErrors, snapshot, targetCss, waitForPlay } from './helpers';

type W = {
  __wb: {
    app: {
      settings: { data: Record<string, unknown>; patch(p: Record<string, unknown>): void };
      layers: { cal: { k: number; dx: number; dy: number } | null; offX: number; scale: number };
      input: { cursor: { x: number; y: number } | null; testPad: unknown };
      xr: { active: boolean };
      xrSupport: { headset: boolean };
      startRound(): void;
      enterXr(): void;
    };
  };
};

const pad = (pressed: number[] = [], axes = [0, 0, 0, 0]) => ({
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
  axes,
  mapping: 'standard',
  connected: true,
});

async function setPad(page: Page, pressed: number[] = [], axes = [0, 0, 0, 0]): Promise<void> {
  await page.evaluate((p) => {
    (window as unknown as W).__wb.app.input.testPad = p;
  }, pad(pressed, axes));
}

test('glasses screen: see-through mode hides the camera image, alignment moves and zooms the overlay', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo=1&test=1&mode=front-shooter');
  await page.locator('button[data-glasses]').click();
  await expect(page.getByRole('heading', { name: /Brillen & Headsets/ })).toBeVisible();
  await page.locator('input[data-setting="glasses"]').check();
  await expect(page.locator('body')).toHaveClass(/glasses/);
  await page.getByRole('button', { name: /Brille ausrichten/ }).click();
  await expect(page.getByText('Brille ausrichten').first()).toBeVisible();
  // the demo source starts, the faint camera image shows for alignment
  await page.waitForFunction(() => (window as unknown as W).__wb.app.layers.scale > 0 && document.body.classList.contains('glasses-ghost'));
  expect(await page.locator('#cam').evaluate((v) => getComputedStyle(v).opacity)).toBe('0.45');
  const before = await page.evaluate(() => (window as unknown as W).__wb.app.layers.offX);
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  // drag on the pane moves it too
  await page.mouse.move(480, 270);
  await page.mouse.down();
  await page.mouse.move(520, 290, { steps: 4 });
  await page.mouse.up();
  const cal = await page.evaluate(() => (window as unknown as W).__wb.app.layers.cal);
  expect(cal!.dx).toBeGreaterThan(0.02);
  expect(cal!.dy).toBeGreaterThan(0.01);
  expect(cal!.k).toBeGreaterThan(1);
  expect(await page.evaluate(() => (window as unknown as W).__wb.app.layers.offX)).not.toBe(before);
  await page.screenshot({ path: 'test-results/glasses-align.png' });
  await page.getByRole('button', { name: /Passt/ }).click();
  await expect(page.getByRole('heading', { name: /Brillen & Headsets/ })).toBeVisible();
  const saved = await page.evaluate(() => (window as unknown as W).__wb.app.settings.data);
  expect(saved.glassesAligned).toBe(true);
  expect((saved.glassesCal as { dx: number }).dx).toBeCloseTo(cal!.dx, 5);
  // camera image hidden again outside the alignment
  expect(await page.locator('#cam').evaluate((v) => getComputedStyle(v).opacity)).toBe('0');
  expect(errors).toEqual([]);
});

test('glasses round: calibrated mapping, taps still hit, no camera image', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('wb.settings.v1', JSON.stringify({ glasses: true, glassesAligned: true, glassesCal: { k: 1.2, dx: 0.03, dy: -0.02 }, safetyAcceptedAt: Date.now() }));
  });
  await page.goto('/?demo=1&test=1&skipTo=play&mode=front-shooter&weapons=smg&noshake=1&seed=7');
  await waitForPlay(page);
  expect(await page.locator('#cam').evaluate((v) => getComputedStyle(v).opacity)).toBe('0');
  expect(await page.locator('#cam').evaluate((v) => (v as HTMLVideoElement).style.transform)).toContain('scale(1.2');
  let hits = 0;
  for (let i = 0; i < 40 && hits === 0; i++) {
    const p = await targetCss(page);
    if (p) await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(150);
    hits = Number((await snapshot(page)).hits) + Number((await snapshot(page)).kills);
  }
  expect(hits).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/glasses-play.png' });
  expect(errors).toEqual([]);
});

test('keyboard and gamepad drive the shooter: aim, fire, swap, pause', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo=1&test=1&skipTo=play&mode=front-shooter&weapons=smg,grenade&noshake=1');
  await waitForPlay(page);
  await page.waitForTimeout(500);
  // keyboard: arrows move the crosshair, space fires, E swaps
  const c0 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const c1 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  expect(c1!.x).toBeGreaterThan(c0!.x + 20);
  const shots0 = Number((await snapshot(page)).shots);
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  expect(Number((await snapshot(page)).shots)).toBeGreaterThan(shots0);
  await page.keyboard.press('KeyE');
  await expect.poll(async () => (await snapshot(page)).weapon).toBe('grenade');
  // gamepad (stubbed Gamepad API object): Y swaps back, A fires, stick aims, Start pauses / resumes
  await setPad(page, [3]);
  await page.waitForTimeout(450);
  await setPad(page);
  await expect.poll(async () => (await snapshot(page)).weapon).toBe('smg');
  const shots1 = Number((await snapshot(page)).shots);
  await setPad(page, [0]);
  await page.waitForTimeout(400);
  await setPad(page);
  expect(Number((await snapshot(page)).shots)).toBeGreaterThan(shots1);
  const c2 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  await setPad(page, [], [-1, 0, 0, 0]);
  await page.waitForTimeout(400);
  await setPad(page);
  const c3 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  expect(c3!.x).toBeLessThan(c2!.x - 20);
  await setPad(page, [9]);
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  await expect(page.locator('.play .card')).toBeVisible();
  await setPad(page);
  await page.waitForTimeout(450);
  await setPad(page, [9]);
  await expect.poll(async () => (await snapshot(page)).paused).toBe(false);
  await setPad(page);
  expect(errors).toEqual([]);
});

test('touchpad: drag aims the crosshair, tap fires at it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wb.settings.v1', JSON.stringify({ touchpad: true })));
  await page.goto('/?demo=1&test=1&skipTo=play&mode=front-shooter&weapons=smg&noshake=1');
  await waitForPlay(page);
  const c0 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(380, 260, { steps: 6 });
  await page.mouse.up();
  const c1 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  expect(c1!.x).toBeGreaterThan(c0!.x + 40);
  expect(c1!.y).toBeLessThan(c0!.y - 20);
  const shots0 = Number((await snapshot(page)).shots);
  await page.mouse.click(700, 400); // the tap position does not matter, the shot goes to the crosshair
  await expect.poll(async () => Number((await snapshot(page)).shots)).toBeGreaterThan(shots0);
  const c2 = await page.evaluate(() => (window as unknown as W).__wb.app.input.cursor);
  expect(c2).toEqual(c1);
});

test('runner: space jumps, arrow down ducks', async ({ page }) => {
  await page.goto('/?demo=1&test=1&skipTo=play&mode=side-runner&noshake=1&lives=9');
  await waitForPlay(page);
  await page.waitForTimeout(600);
  expect((await snapshot(page)).grounded).toBe(true);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await snapshot(page)).grounded, { timeout: 2000 }).toBe(false);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await snapshot(page)).grounded, { timeout: 4000 }).toBe(true);
});

test('gamepad navigates the menus: d-pad moves the focus, A presses', async ({ page }) => {
  await page.goto('/?demo=1&test=1');
  await expect(page.locator('[data-screen="start"]')).toBeVisible();
  // focus walks through the start screen buttons; A on the glasses button opens that screen
  for (let i = 0; i < 12; i++) {
    const isGlasses = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.glasses === '1');
    if (isGlasses) break;
    await setPad(page, [13]);
    await page.waitForTimeout(250);
    await setPad(page);
    await page.waitForTimeout(250);
  }
  expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.glasses)).toBe('1');
  await setPad(page, [0]);
  await page.waitForTimeout(250);
  await setPad(page);
  await expect(page.getByRole('heading', { name: /Brillen & Headsets/ })).toBeVisible();
  // B = back
  await setPad(page, [1]);
  await page.waitForTimeout(250);
  await setPad(page);
  await expect(page.locator('[data-screen="start"]')).toBeVisible();
});
