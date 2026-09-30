import { describe, expect, it } from 'vitest';
import { Ema, OneEuro, median } from '../../src/core/math/filters';
import { Rng } from '../../src/core/rng';

describe('filters', () => {
  it('OneEuro reduces jitter on a static signal', () => {
    const f = new OneEuro(1, 0.02);
    const rng = new Rng(1);
    let rawVar = 0;
    let outVar = 0;
    const n = 600;
    for (let i = 0; i < n; i++) {
      const t = i / 60;
      const raw = 100 + rng.gauss(0, 3);
      const out = f.filter(raw, t);
      if (i > 60) {
        rawVar += (raw - 100) ** 2;
        outVar += (out - 100) ** 2;
      }
    }
    expect(outVar).toBeLessThan(rawVar * 0.25);
  });
  it('OneEuro follows a fast ramp with small lag thanks to beta', () => {
    const f = new OneEuro(1, 0.05);
    let out = 0;
    let x = 0;
    for (let i = 0; i < 120; i++) {
      const t = i / 60;
      x = i * 10; // 600 px/s
      out = f.filter(x, t);
    }
    expect(Math.abs(out - x)).toBeLessThan(40);
  });
  it('Ema and median', () => {
    const e = new Ema(0.5);
    e.push(0);
    expect(e.push(10)).toBe(5);
    expect(median([5, 1, 9])).toBe(5);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
