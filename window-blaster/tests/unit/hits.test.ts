import { describe, expect, it } from 'vitest';
import { segmentHitsRect, targetAt } from '../../src/game/HitResolver';
import { ProjectileSystem } from '../../src/game/Projectile';

describe('hit registration on moving targets', () => {
  it('segmentHitsRect detects fast projectiles crossing a box between steps', () => {
    const r = { x: 100, y: 100, w: 50, h: 30 };
    expect(segmentHitsRect({ x: 0, y: 115 }, { x: 300, y: 115 }, r)).toBe(true);
    expect(segmentHitsRect({ x: 0, y: 10 }, { x: 300, y: 10 }, r)).toBe(false);
    expect(segmentHitsRect({ x: 125, y: 0 }, { x: 125, y: 400 }, r)).toBe(true);
  });

  it('targetAt gives tiny far boxes a minimum hit size', () => {
    const t = [{ id: 1, box: { x: 500, y: 300, w: 10, h: 8 }, cls: 'car' as const }];
    expect(targetAt({ x: 515, y: 304 }, t)).not.toBeNull(); // 10 px outside a 10 px box
    expect(targetAt({ x: 560, y: 304 }, t)).toBeNull();
  });

  it('a thrown projectile aimed at a tracked target lands on its current box at arrival', () => {
    const ps = new ProjectileSystem();
    // car moves right at 400 px/s; we aim (lead-corrected) 360 px ahead of its current center
    let carX = 300;
    const box = () => ({ x: carX, y: 400, w: 150, h: 70 });
    ps.spawnBallistic('grenade', 'grenade', { x: 700, y: 760 }, { x: 375 + 360, y: 435 }, 0.9, 1400, 0, 7);
    let det = null;
    for (let i = 1; i <= 60 && !det; i++) {
      carX = 300 + 400 * (i * 0.015);
      const d = ps.update(0.015, i * 15, (id) => (id === 7 ? box() : null), () => null);
      if (d.length) det = d[0];
    }
    expect(det).not.toBeNull();
    expect(det!.contactId).toBe(7);
    const b = box();
    expect(det!.at.x).toBeGreaterThanOrEqual(b.x);
    expect(det!.at.x).toBeLessThanOrEqual(b.x + b.w);
  });
});
