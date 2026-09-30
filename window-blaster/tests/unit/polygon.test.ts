import { describe, expect, it } from 'vitest';
import type { Quad } from '../../src/core/types';
import { lineIntersection, pointInPolygon, quadArea, quadBottomY, quadIoU, rectInQuadFraction, rectToQuad } from '../../src/core/math/polygon';

const q: Quad = [
  { x: 100, y: 100 },
  { x: 500, y: 80 },
  { x: 520, y: 400 },
  { x: 80, y: 420 },
];

describe('polygon', () => {
  it('pointInPolygon for both windings', () => {
    expect(pointInPolygon({ x: 300, y: 250 }, q)).toBe(true);
    expect(pointInPolygon({ x: 10, y: 10 }, q)).toBe(false);
    const rev = [...q].reverse();
    expect(pointInPolygon({ x: 300, y: 250 }, rev)).toBe(true);
  });
  it('rectInQuadFraction', () => {
    expect(rectInQuadFraction({ x: 200, y: 200, w: 100, h: 100 }, q)).toBe(1);
    expect(rectInQuadFraction({ x: 600, y: 600, w: 50, h: 50 }, q)).toBe(0);
    const half = rectInQuadFraction({ x: 40, y: 200, w: 120, h: 50 }, q);
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(0.8);
  });
  it('quadIoU and area', () => {
    expect(quadIoU(q, q)).toBe(1);
    const shifted = q.map((p) => ({ x: p.x + 1000, y: p.y })) as Quad;
    expect(quadIoU(q, shifted)).toBe(0);
    expect(quadArea(rectToQuad({ x: 0, y: 0, w: 10, h: 20 }))).toBe(200);
  });
  it('lineIntersection', () => {
    const p = lineIntersection({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 10 }, { x: 1, y: -1 });
    expect(p).toEqual({ x: 5, y: 5 });
    expect(lineIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 })).toBeNull();
  });
  it('quadBottomY interpolates the bottom edge', () => {
    expect(quadBottomY(q, 80)).toBeCloseTo(420);
    expect(quadBottomY(q, 520)).toBeCloseTo(400);
    expect(quadBottomY(q, 300)).toBeCloseTo(410);
  });
});
