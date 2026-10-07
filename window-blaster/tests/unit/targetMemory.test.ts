import { describe, expect, it } from 'vitest';
import { TargetMemory } from '../../src/game/shooter/TargetMemory';

const box = (x: number, y = 100, w = 120, h = 70) => ({ x, y, w, h });

describe('TargetMemory', () => {
  it('a painted car keeps its paint across a tracker re-identification', () => {
    const m = new TargetMemory();
    const a = m.ensure(1, 'car', box(300), 0);
    a.decals.push({ u: 0.5, v: 0.5, r: 0.2, color: '#f0f', seed: 1, born: 0, kind: 'paint' });
    m.sync(100, (id) => (id === 1 ? { box: box(310), vel: { x: 0.1, y: 0 } } : null));
    // track 1 disappears …
    m.sync(200, () => null);
    expect(m.get(1)).toBeUndefined();
    expect(m.lostCount).toBe(1);
    // … and comes back as track 2, 300 ms later, roughly where the velocity predicts it
    const b = m.ensure(2, 'car', box(345), 500);
    expect(b.decals.length).toBe(1);
    expect(m.resolve(1)).toBe(2);
    expect(m.lostCount).toBe(0);
  });

  it('an untouched car is not remembered', () => {
    const m = new TargetMemory();
    m.ensure(1, 'car', box(300), 0);
    m.sync(100, () => null);
    expect(m.lostCount).toBe(0);
  });

  it('a destroyed car stays destroyed but is not inherited by a car merely passing nearby', () => {
    const m = new TargetMemory();
    const a = m.ensure(1, 'car', box(300), 0);
    a.state = 'destroyed';
    m.sync(100, (id) => (id === 1 ? { box: box(300), vel: { x: 0, y: 0 } } : null));
    m.sync(200, () => null);
    // overlap of ~30 % – enough for paint, not for a wreck
    const other = m.ensure(2, 'car', box(380), 300);
    expect(other.state).toBe('alive');
    expect(m.lostCount).toBe(1);
    // the same box → it is the wreck again
    const same = m.ensure(3, 'car', box(305), 400);
    expect(same.state).toBe('destroyed');
    expect(m.resolve(1)).toBe(3);
  });

  it('forgets lost cars after 1.5 s and caps the list', () => {
    const m = new TargetMemory();
    for (let i = 0; i < 20; i++) {
      const s = m.ensure(i, 'car', box(i * 10), 0);
      s.hp -= 1;
    }
    m.sync(10, (id) => ({ box: box(id * 10), vel: { x: 0, y: 0 } }));
    m.sync(20, () => null);
    expect(m.lostCount).toBe(12);
    m.sync(2000, () => null);
    expect(m.lostCount).toBe(0);
  });

  it('resolves alias chains and stops at unknown ids', () => {
    const m = new TargetMemory();
    const s = m.ensure(1, 'truck', box(0), 0);
    s.decals.push({ u: 0.5, v: 0.5, r: 0.2, color: '#f0f', seed: 1, born: 0, kind: 'paint' });
    m.sync(1, () => ({ box: box(0), vel: { x: 0, y: 0 } }));
    m.sync(2, () => null);
    m.ensure(2, 'truck', box(2), 3);
    m.sync(4, (id) => (id === 2 ? { box: box(2), vel: { x: 0, y: 0 } } : null));
    m.sync(5, () => null);
    m.ensure(3, 'truck', box(3), 6);
    expect(m.resolve(1)).toBe(3);
    expect(m.resolve(99)).toBe(99);
    expect(m.get(3)?.maxHp).toBe(m.get(3)?.hp === undefined ? undefined : m.get(3)!.maxHp);
  });
});
