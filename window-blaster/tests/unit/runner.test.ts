import { describe, expect, it } from 'vitest';
import { RunnerPhysics, defaultParams } from '../../src/game/runner/RunnerPhysics';
import { collides, mapObstacle, platformUnder } from '../../src/game/runner/ObstacleMapper';
import { PoleDetector } from '../../src/game/runner/PoleDetector';
import type { Quad } from '../../src/core/types';

const R = 80;

function simulate(p: RunnerPhysics, ms: number, platform: (h: number) => number | null = () => null, from = 0): number {
  let t = from;
  const dt = 1 / 120;
  let maxH = 0;
  while (t < from + ms) {
    p.step(dt, t, platform(p.h));
    maxH = Math.max(maxH, p.h);
    t += dt * 1000;
  }
  return maxH;
}

describe('RunnerPhysics', () => {
  it('jump apex is about 2 R and lands back on the ground', () => {
    const p = new RunnerPhysics(defaultParams(R));
    p.jumpPress(0);
    const apex = simulate(p, 1500);
    expect(apex).toBeGreaterThan(1.8 * R);
    expect(apex).toBeLessThan(2.2 * R);
    expect(p.grounded).toBe(true);
    expect(p.h).toBe(0);
  });

  it('releasing early gives a shorter jump', () => {
    const p = new RunnerPhysics(defaultParams(R));
    p.jumpPress(0);
    simulate(p, 80);
    p.jumpRelease();
    const apex = simulate(p, 1500, () => null, 80);
    expect(apex).toBeLessThan(1.4 * R);
  });

  it('coyote time allows a jump shortly after leaving a platform', () => {
    const p = new RunnerPhysics(defaultParams(R));
    // stand on a platform, then it disappears
    p.h = 40;
    p.platform = 40;
    p.grounded = true;
    p.step(1 / 60, 0, 40);
    p.step(1 / 60, 17, null); // platform gone → falling
    expect(p.grounded).toBe(false);
    p.jumpPress(60); // within 90 ms coyote window
    expect(p.vy).toBeGreaterThan(0);
  });

  it('lands on a platform when falling onto it', () => {
    const p = new RunnerPhysics(defaultParams(R));
    p.jumpPress(0);
    simulate(p, 2000, (h) => (h < 100 ? 60 : 60));
    expect(p.grounded).toBe(true);
    expect(p.h).toBeCloseTo(60, 0);
  });

  it('duck halves the body height only on the ground', () => {
    const p = new RunnerPhysics(defaultParams(R));
    p.duck(true);
    expect(p.rect(100, 500).h).toBeCloseTo(R * 0.55);
    p.jumpPress(0);
    p.step(1 / 60, 0, null);
    expect(p.rect(100, 500).h).toBeCloseTo(R);
  });
});

describe('ObstacleMapper', () => {
  const p = { R, groundY: () => 500 };
  it('ground vehicle becomes a hurdle with a capped roof', () => {
    const o = mapObstacle(1, 'car', { x: 200, y: 340, w: 300, h: 165 }, -400, p)!;
    expect(o.kind).toBe('ground');
    expect(o.top).toBeCloseTo(1.3 * R);
    expect(o.box.w).toBeLessThan(300);
  });
  it('high sign becomes an overhead bar', () => {
    const o = mapObstacle(2, 'sign', { x: 300, y: 300, w: 50, h: 50 }, -400, p)!;
    expect(o.kind).toBe('overhead');
    expect(o.box.y + o.box.h).toBeCloseTo(350);
  });
  it('ignores things far below or far above the ground line', () => {
    expect(mapObstacle(3, 'car', { x: 0, y: 520, w: 100, h: 60 }, 0, p)).toBeNull();
    expect(mapObstacle(4, 'sign', { x: 0, y: -600, w: 50, h: 50 }, 0, p)).toBeNull();
  });
  it('platformUnder and collision semantics', () => {
    const car = mapObstacle(1, 'car', { x: 200, y: 340, w: 300, h: 165 }, -400, p)!;
    const runnerOnGround = { x: 330, y: 420, w: 40, h: 80 }; // inside the car body
    expect(collides(runnerOnGround, car, 0)).toBe(true);
    const runnerOnRoof = { x: 330, y: 500 - car.top - 80, w: 40, h: 80 };
    expect(collides(runnerOnRoof, car, car.top)).toBe(false);
    expect(platformUnder(runnerOnRoof, [car])).toBeCloseTo(car.top);
    expect(platformUnder({ x: 900, y: 420, w: 40, h: 80 }, [car])).toBeNull();
  });
});

describe('PoleDetector', () => {
  it('finds two thin dark columns in a bright band and confirms them over frames', () => {
    const w = 240;
    const h = 135;
    const scale = 1280 / w;
    const quad: Quad = [
      { x: 0, y: 0 },
      { x: 1280, y: 0 },
      { x: 1280, y: 720 },
      { x: 0, y: 720 },
    ];
    const det = new PoleDetector();
    for (let f = 0; f < 4; f++) {
      const gray = new Uint8Array(w * h).fill(170);
      const poles = [60 + f * 2, 150 + f * 2];
      for (const px of poles) for (let y = 0; y < h; y++) for (let x = px; x < px + 2; x++) gray[y * w + x] = 40;
      det.update({ gray, w, h, scale, t: f * 66 }, { x: 0, y: 380, w: 0, h: 100 }, quad, [], 1, 400);
    }
    const confirmed = det.poles.filter((p) => p.confirmed);
    expect(confirmed).toHaveLength(2);
    expect(Math.abs(confirmed[0].x - 67 * scale)).toBeLessThan(2 * scale);
    expect(confirmed[0].vx).toBeGreaterThan(50);
  });
});
