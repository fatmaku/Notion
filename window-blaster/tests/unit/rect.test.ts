import { describe, expect, it } from 'vitest';
import { centerness, expand, intersect, iou, overlapFraction, rect, scaleAbout, union } from '../../src/core/math/rect';

describe('rect', () => {
  it('iou of identical rects is 1, disjoint is 0', () => {
    const a = rect(0, 0, 10, 10);
    expect(iou(a, a)).toBe(1);
    expect(iou(a, rect(20, 20, 5, 5))).toBe(0);
  });
  it('iou of half overlap', () => {
    expect(iou(rect(0, 0, 10, 10), rect(5, 0, 10, 10))).toBeCloseTo(50 / 150, 6);
  });
  it('overlapFraction is asymmetric', () => {
    const big = rect(0, 0, 100, 100);
    const small = rect(10, 10, 10, 10);
    expect(overlapFraction(small, big)).toBe(1);
    expect(overlapFraction(big, small)).toBeCloseTo(0.01);
  });
  it('intersect/union/expand/scaleAbout', () => {
    expect(intersect(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(5, 5, 5, 5));
    expect(union(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(0, 0, 15, 15));
    expect(expand(rect(5, 5, 10, 10), 2)).toEqual(rect(3, 3, 14, 14));
    expect(scaleAbout(rect(0, 0, 10, 10), 2)).toEqual(rect(-5, -5, 20, 20));
  });
  it('centerness is 0 at center and ~1 at a corner', () => {
    const r = rect(0, 0, 100, 50);
    expect(centerness(r, { x: 50, y: 25 })).toBe(0);
    expect(centerness(r, { x: 0, y: 0 })).toBeCloseTo(1, 5);
  });
});
