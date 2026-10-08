import { expect, test, type Page } from '@playwright/test';
import { collectErrors, snapshot } from './helpers';

/**
 * Headset play under Meta's Immersive Web Emulation Runtime (IWER, npm "iwer"): an emulated
 * Quest 3 with Touch Plus controllers replaces navigator.xr, so the real WebXR code path runs –
 * session, reference space, XRWebGLLayer, frame loop, input sources, select events, gamepad.
 */
type Ctl = { position: { set(x: number, y: number, z: number): void }; updateButtonValue(id: string, v: number): void };
type IwerWin = { __iwer: { controllers: { right: Ctl; left: Ctl } } };
type AppWin = { __wb: { app: { xrSupport: { headset: boolean; ar: boolean }; xr: { active: boolean } } } };

async function installIwer(page: Page, preset = 'metaQuest3'): Promise<void> {
  await page.addInitScript({ path: 'node_modules/iwer/build/iwer.min.js' });
  await page.addInitScript((name) => {
    const I = (window as unknown as { IWER: Record<string, unknown> & { XRDevice: new (cfg: unknown) => { installRuntime(o?: { forceInstall?: boolean }): void } } }).IWER;
    const d = new I.XRDevice(I[name]);
    // headless Chromium ships its own (device-less) navigator.xr – replace it with the emulated Quest
    d.installRuntime({ forceInstall: true });
    (window as unknown as { __iwer: unknown }).__iwer = d;
  }, preset);
}

async function press(page: Page, id: string, hand: 'right' | 'left' = 'right', holdMs = 350): Promise<void> {
  await page.evaluate(([b, h]) => (window as unknown as IwerWin).__iwer.controllers[h as 'right'].updateButtonValue(b, 1), [id, hand]);
  await page.waitForTimeout(holdMs);
  await page.evaluate(([b, h]) => (window as unknown as IwerWin).__iwer.controllers[h as 'right'].updateButtonValue(b, 0), [id, hand]);
}

test('headset (emulated Quest 3): the round runs in WebXR, the trigger shoots, B pauses back into 2D', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await installIwer(page);
  await page.addInitScript(() => localStorage.setItem('wb.settings.v1', JSON.stringify({ headset: true, safetyAcceptedAt: Date.now() })));
  await page.goto('/?demo=1&test=1&skipTo=calibrate&mode=front-shooter&weapons=smg&noshake=1&seed=3');
  await page.waitForFunction(() => (window as unknown as AppWin).__wb?.app.xrSupport.headset === true);
  expect(await page.evaluate(() => (window as unknown as AppWin).__wb.app.xrSupport.ar)).toBe(true);
  // "Passt so" is a real click → the session request has its user gesture
  await page.getByRole('button', { name: /Passt so/ }).click();
  await page.waitForFunction(() => (window as unknown as AppWin).__wb.app.xr.active, null, { timeout: 20_000 });
  const s0 = await snapshot(page);
  expect(s0.xrKind).toBe('immersive-ar');
  expect(s0.xrView).toBe('screen');
  // the game loop runs on the session's frames: XR frames and the round clock advance
  await page.waitForTimeout(1500);
  const s1 = await snapshot(page);
  expect(Number(s1.xrFrames)).toBeGreaterThan(Number(s0.xrFrames) + 3);
  expect(Number(s1.timeLeft)).toBeLessThan(Number(s0.timeLeft));
  // the right controller points at the floating screen (default pose: in front of the body, aiming down -Z)
  await expect.poll(async () => Number((await snapshot(page)).xrAimU), { timeout: 10_000 }).toBeGreaterThan(0);
  const aim = await snapshot(page);
  expect(Number(aim.xrAimU)).toBeGreaterThan(0.5); // right hand → right half of the screen
  expect(Number(aim.xrAimU)).toBeLessThan(1);
  await page.screenshot({ path: 'test-results/xr-headset.png' });
  // trigger = select = shoot
  const shots0 = Number(aim.shots);
  await press(page, 'trigger', 'right', 600);
  await expect.poll(async () => Number((await snapshot(page)).shots), { timeout: 10_000 }).toBeGreaterThan(shots0);
  // grip = swap (single weapon: no change, must not throw); A = reload
  await press(page, 'squeeze');
  await press(page, 'a-button');
  // B = pause: leaves the headset, the 2D pause menu appears with "continue in headset"
  await press(page, 'b-button');
  await page.waitForFunction(() => !(window as unknown as AppWin).__wb.app.xr.active, null, { timeout: 10_000 });
  await expect.poll(async () => (await snapshot(page)).paused).toBe(true);
  const resumeXr = page.getByRole('button', { name: /Weiter im Headset/ });
  await expect(resumeXr).toBeVisible();
  await page.screenshot({ path: 'test-results/xr-paused.png' });
  await resumeXr.click();
  await page.waitForFunction(() => (window as unknown as AppWin).__wb.app.xr.active, null, { timeout: 20_000 });
  expect((await snapshot(page)).paused).toBe(false);
  // the round end returns to the 2D results
  await press(page, 'b-button');
  await page.waitForFunction(() => !(window as unknown as AppWin).__wb.app.xr.active, null, { timeout: 10_000 });
  await page.getByRole('button', { name: /Runde beenden/ }).click();
  await expect(page.getByText('Runde vorbei')).toBeVisible();
  expect(errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e))).toEqual([]);
});

test('headset AR overlay: head-locked effect layer, alignment with the thumbsticks', async ({ page }) => {
  test.setTimeout(120_000);
  await installIwer(page);
  await page.addInitScript(() => localStorage.setItem('wb.settings.v1', JSON.stringify({ headset: true, xrView: 'overlay', safetyAcceptedAt: Date.now() })));
  await page.goto('/?demo=1&test=1&skipTo=calibrate&mode=front-shooter&weapons=smg&noshake=1&seed=3');
  await page.waitForFunction(() => (window as unknown as AppWin).__wb?.app.xrSupport.headset === true);
  await page.getByRole('button', { name: /Passt so/ }).click();
  await page.waitForFunction(() => (window as unknown as AppWin).__wb.app.xr.active, null, { timeout: 20_000 });
  expect((await snapshot(page)).xrView).toBe('overlay');
  // stick click toggles the alignment, the right stick zooms, a second click saves
  await press(page, 'thumbstick');
  await expect.poll(async () => (await snapshot(page)).xrAligning).toBe(true);
  await page.evaluate(() => (window as unknown as { __iwer: { controllers: { right: { updateAxes(id: string, x: number, y: number): void } } } }).__iwer.controllers.right.updateAxes('thumbstick', 0, -1));
  await page.waitForTimeout(1200);
  await page.evaluate(() => (window as unknown as { __iwer: { controllers: { right: { updateAxes(id: string, x: number, y: number): void } } } }).__iwer.controllers.right.updateAxes('thumbstick', 0, 0));
  await press(page, 'thumbstick');
  await expect.poll(async () => (await snapshot(page)).xrAligning).toBe(false);
  const k = await page.evaluate(() => ((window as unknown as { __wb: { app: { settings: { data: { xrCal: { k: number } } } } } }).__wb.app.settings.data.xrCal.k));
  expect(k).toBeGreaterThan(1.05);
});
