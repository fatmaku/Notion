import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { POWERUP, PowerUps } from '../../src/game/runner/PowerUps';

describe('runner power-ups', () => {
  it('spawns on schedule, flows with the traffic and expires off-screen', () => {
    const p = new PowerUps(new Rng(1), 0);
    expect(p.spawn(1000, 0, 1, 400, 80)).toBeNull();
    const first = p.spawn(POWERUP.firstSpawnS * 1000 + 1, 0, 1, 400, 80);
    expect(first).not.toBeNull();
    expect(p.spawn(POWERUP.firstSpawnS * 1000 + 2, 0, 1, 400, 80)).toBeNull(); // not again right away
    p.update(1, 10000, 0, 1280);
    expect(p.pickups[0].x).toBeCloseTo(400);
    p.update(5, 15000, 0, 1280); // far outside → dropped
    expect(p.pickups.length).toBe(0);
  });

  it('timed power-ups run for the duration, the shield absorbs exactly one hit', () => {
    const p = new PowerUps(new Rng(2), 0);
    p.collect({ id: 'a', kind: 'magnet', x: 0, h: 0, vx: 0, born: 0, taken: false }, 1000);
    expect(p.active(1000)).toBe('magnet');
    expect(p.timeLeft(5000)).toBeCloseTo(0.5);
    expect(p.active(1000 + POWERUP.durationMs + 1)).toBeNull();
    p.collect({ id: 'b', kind: 'shield', x: 0, h: 0, vx: 0, born: 0, taken: false }, 2000);
    expect(p.shield).toBe(true);
    expect(p.absorb()).toBe(true);
    expect(p.shield).toBe(false);
    expect(p.absorb()).toBe(false);
    p.collect({ id: 'c', kind: 'double', x: 0, h: 0, vx: 0, born: 0, taken: false }, 3000);
    expect(p.doubleActive).toBe(true);
    expect(p.collected).toEqual({ magnet: 1, shield: 1, double: 1 });
  });

  it('the magnet pulls coins within range toward the runner and ignores far ones', () => {
    const p = new PowerUps(new Rng(3), 0);
    p.collect({ id: 'a', kind: 'magnet', x: 0, h: 0, vx: 0, born: 0, taken: false }, 0);
    const near = p.magnetPull(100, { x: 100, y: 0 }, { x: 0, y: 0 }, 80);
    expect(near.x).toBeLessThan(0);
    expect(Math.abs(near.y)).toBeLessThan(1e-9);
    const far = p.magnetPull(100, { x: 1000, y: 0 }, { x: 0, y: 0 }, 80);
    expect(far).toEqual({ x: 0, y: 0 });
    expect(p.magnetPull(POWERUP.durationMs + 1, { x: 100, y: 0 }, { x: 0, y: 0 }, 80)).toEqual({ x: 0, y: 0 });
  });

  it('never offers a second shield while one is up', () => {
    const p = new PowerUps(new Rng(4), 0);
    p.collect({ id: 's', kind: 'shield', x: 0, h: 0, vx: 0, born: 0, taken: false }, 0);
    let t = POWERUP.firstSpawnS * 1000;
    for (let i = 0; i < 40; i++) {
      const s = p.spawn(t, 0, 1, 400, 80);
      if (s) expect(s.kind).not.toBe('shield');
      t += POWERUP.spawnEveryS * 1000 * 1.4;
    }
  });
});
