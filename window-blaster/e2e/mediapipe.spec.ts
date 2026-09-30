import { expect, test } from '@playwright/test';
import { collectErrors, snapshot, waitForPlay } from './helpers';

// Real detector on Chromium's fake camera: proves the self-hosted WASM + model load and run.
test('MediaPipe EfficientDet initialises and produces detection cycles', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto('/?skipTo=play&test=1&round=30&mode=front-shooter&weapons=smg,paint&noshake=1');
  await waitForPlay(page, 200_000);
  const s = await snapshot(page);
  expect(String(s.detector)).toContain('mediapipe');
  await page.waitForFunction(() => Number((window as unknown as { __wb: { snapshot(): { detHz: number } } }).__wb.snapshot().detHz) > 0, null, { timeout: 90_000 });
  const s2 = await snapshot(page);
  console.log('detector:', s2.detector, 'detMs:', s2.detMs, 'detHz:', s2.detHz, 'video:', s2.video);
  expect(Number(s2.detMs)).toBeGreaterThan(0);
  const fatal = errors.filter((e) => !/WebGL|GPU|swiftshader|GL_|delegate/i.test(e));
  expect(fatal, fatal.join('\n')).toEqual([]);
});
