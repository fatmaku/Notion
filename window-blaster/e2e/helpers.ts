import type { Page } from '@playwright/test';

export interface Snap {
  [k: string]: number | string | boolean;
}

export const snapshot = (page: Page): Promise<Snap> => page.evaluate(() => (window as unknown as { __wb: { snapshot(): Snap } }).__wb.snapshot());

export async function waitForPlay(page: Page, timeout = 40_000): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as unknown as { __wb?: { snapshot(): { screen: string } } };
    return !!w.__wb && String(w.__wb.snapshot().screen).includes('play');
  }, null, { timeout });
}

/** CSS-pixel position of the first live shootable target (or null). */
export function targetCss(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __wb: { app: { tracker: { active: { cls: string; predict(t: number): { x: number; y: number; w: number; h: number } }[] }; layers: { toCss(p: { x: number; y: number }): { x: number; y: number } } } };
    };
    const app = w.__wb.app;
    const ts = app.tracker.active.filter((t) => ['car', 'truck', 'bus'].includes(t.cls));
    if (!ts.length) return null;
    const b = ts[0].predict(performance.now() - 80);
    return app.layers.toCss({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  });
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}
