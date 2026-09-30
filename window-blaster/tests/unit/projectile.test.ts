import { describe, expect, it } from 'vitest';
import { ProjectileSystem, ballisticAt, solveBallistic } from '../../src/game/Projectile';
import { Weapon } from '../../src/game/weapons/Weapon';
import { WEAPONS } from '../../src/game/weapons/configs';
import { Combo } from '../../src/game/scoring/Combo';
import { Missions } from '../../src/game/scoring/Missions';
import { aimAssist, blast, targetAt } from '../../src/game/HitResolver';

describe('ballistics', () => {
  it('solved arc reaches the target exactly at T and rises above the chord', () => {
    const s = { x: 700, y: 760 };
    const d = { x: 500, y: 300 };
    const g = 1400;
    const v0 = solveBallistic(s, d, 0.9, g);
    const end = ballisticAt(s, v0, g, 0.9);
    expect(end.x).toBeCloseTo(d.x, 6);
    expect(end.y).toBeCloseTo(d.y, 6);
    const mid = ballisticAt(s, v0, g, 0.45);
    expect(mid.y).toBeLessThan((s.y + d.y) / 2);
  });

  it('projectile system detonates on arrival and on contact, rockets home in', () => {
    const ps = new ProjectileSystem();
    ps.spawnBallistic('grenade', 'grenade', { x: 700, y: 760 }, { x: 500, y: 300 }, 0.9, 1400, 0);
    let dets = ps.update(0.45, 450, () => null, () => null);
    expect(dets).toHaveLength(0);
    dets = ps.update(0.5, 950, () => null, () => null);
    expect(dets).toHaveLength(1);
    expect(dets[0].reason).toBe('arrived');
    expect(dets[0].at).toEqual({ x: 500, y: 300 });

    ps.spawnRocket('rocket', { x: 700, y: 760 }, { x: 300, y: 300 }, 0.75, 7, 6, 1000);
    // the target moved: homing steers towards its live box
    const box = { x: 900, y: 250, w: 100, h: 60 };
    let contactAt = -1;
    for (let i = 1; i <= 60 && contactAt < 0; i++) {
      const now = 1000 + i * 16;
      const d = ps.update(0.016, now, (id) => (id === 7 ? box : null), (p) => (p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h ? 7 : null));
      if (d.length) contactAt = now;
    }
    expect(contactAt).toBeGreaterThan(0);
  });
});

describe('Weapon state machine', () => {
  it('fires at rpm, reloads when empty, respects per-round ammo', () => {
    const w = new Weapon(WEAPONS.rocket); // mag 1, 3 per round
    expect(w.tryFire(0)).toBe('fired');
    expect(w.reloading).toBe(true);
    expect(w.tryFire(100)).toBe('reloading');
    w.update(2000);
    expect(w.tryFire(2000)).toBe('fired');
    w.update(4000);
    expect(w.tryFire(4000)).toBe('fired');
    w.update(6000);
    expect(w.empty).toBe(true);
    expect(w.tryFire(6000)).toBe('empty');
    const smg = new Weapon(WEAPONS.smg);
    expect(smg.tryFire(0)).toBe('fired');
    expect(smg.tryFire(10)).toBe('cooldown');
    expect(smg.tryFire(100)).toBe('fired');
    expect(smg.ammoText()).toBe('28/∞');
  });
});

describe('Combo / Missions / HitResolver', () => {
  it('combo accumulates fractional weights and decays', () => {
    const c = new Combo(2000);
    expect(c.bump(0.25, 0)).toBe(0);
    expect(c.bump(1, 100)).toBe(1);
    expect(c.bump(1, 200)).toBe(2);
    c.update(2500);
    expect(c.value).toBe(0);
    expect(c.max).toBe(2);
  });
  it('missions are deterministic per seed and complete', () => {
    const a = new Missions('front-shooter', ['smg', 'grenade'], 123);
    const b = new Missions('front-shooter', ['smg', 'grenade'], 123);
    expect(a.results().map((m) => m.id)).toEqual(b.results().map((m) => m.id));
    expect(a.results()).toHaveLength(3);
    const m = new Missions('side-runner', [], 5);
    for (const def of m.active) expect(def.def.modes === 'all' || def.def.modes.includes('side-runner')).toBe(true);
  });
  it('aim assist snaps to nearby targets, blast falls off with distance', () => {
    const targets = [
      { id: 1, box: { x: 100, y: 100, w: 100, h: 60 }, cls: 'car' as const },
      { id: 2, box: { x: 400, y: 100, w: 100, h: 60 }, cls: 'truck' as const },
    ];
    expect(targetAt({ x: 150, y: 130 }, targets)?.id).toBe(1);
    expect(aimAssist({ x: 215, y: 130 }, targets, 30).target?.id).toBe(1);
    expect(aimAssist({ x: 300, y: 130 }, targets, 30).target).toBeNull();
    const hits = blast({ x: 150, y: 130 }, 300, targets);
    expect(hits[0].target.id).toBe(1);
    expect(hits[0].factor).toBe(1);
    expect(hits[1].factor).toBeLessThan(1);
  });
});
