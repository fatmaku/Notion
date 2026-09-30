import { describe, expect, it } from 'vitest';
import { Rng, hashString } from '../../src/core/rng';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });
  it('range/int/pick stay in bounds', () => {
    const r = new Rng(9);
    for (let i = 0; i < 500; i++) {
      const x = r.int(2, 5);
      expect(x).toBeGreaterThanOrEqual(2);
      expect(x).toBeLessThanOrEqual(5);
    }
    expect(['a', 'b']).toContain(r.pick(['a', 'b']));
  });
  it('hashString is stable', () => {
    expect(hashString('2026-09-30')).toBe(hashString('2026-09-30'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
