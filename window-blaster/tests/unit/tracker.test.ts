import { describe, expect, it } from 'vitest';
import type { Detection } from '../../src/core/types';
import { Tracker } from '../../src/vision/Tracker';

const det = (x: number, y: number, w: number, h: number, ts: number, cls: Detection['cls'] = 'car'): Detection => ({
  box: { x, y, w, h },
  cls,
  score: 0.8,
  ts,
});

describe('Tracker', () => {
  it('confirms after 2 hits and keeps one id for a moving car', () => {
    const tr = new Tracker();
    let id = -1;
    for (let i = 0; i < 10; i++) {
      tr.update([det(100 + i * 20, 300, 200, 100, i * 100)], i * 100);
      if (i === 0) {
        expect(tr.tracks[0].state).toBe('tentative');
        id = tr.tracks[0].id;
      }
      if (i >= 1) expect(tr.tracks[0].state).toBe('confirmed');
    }
    expect(tr.tracks).toHaveLength(1);
    expect(tr.tracks[0].id).toBe(id);
  });

  it('survives 3 consecutive dropouts and re-associates', () => {
    const tr = new Tracker();
    const id = (() => {
      tr.update([det(100, 300, 200, 100, 0)], 0);
      tr.update([det(120, 300, 200, 100, 100)], 100);
      return tr.tracks[0].id;
    })();
    tr.update([], 200);
    tr.update([], 300);
    tr.update([], 400);
    expect(tr.tracks).toHaveLength(1);
    expect(tr.tracks[0].state).toBe('coasting');
    tr.update([det(200, 300, 200, 100, 500)], 500);
    expect(tr.tracks).toHaveLength(1);
    expect(tr.tracks[0].id).toBe(id);
    expect(tr.tracks[0].state).toBe('confirmed');
  });

  it('extrapolates a constant-velocity target within 5% of its width', () => {
    const tr = new Tracker();
    const vx = 0.4; // px/ms = 400 px/s
    for (let i = 0; i <= 8; i++) tr.update([det(100 + vx * i * 100, 300, 200, 100, i * 100)], i * 100);
    const t = 800 + 150;
    const pred = tr.tracks[0].predict(t);
    const truth = 100 + vx * t;
    expect(Math.abs(pred.x - truth)).toBeLessThan(200 * 0.05);
  });

  it('does not swap two vehicles passing at different heights', () => {
    const tr = new Tracker();
    const ids: number[] = [];
    for (let i = 0; i < 12; i++) {
      const ts = i * 100;
      const a = det(100 + i * 60, 300, 180, 90, ts); // moving right
      const b = det(900 - i * 60, 420, 180, 90, ts); // moving left, lower
      tr.update([a, b], ts);
      if (i === 1) ids.push(...tr.tracks.map((t) => t.id));
    }
    expect(tr.tracks).toHaveLength(2);
    const a = tr.tracks.find((t) => t.id === ids[0])!;
    const b = tr.tracks.find((t) => t.id === ids[1])!;
    expect(a.box.y).toBeLessThan(b.box.y);
    expect(a.vel.x).toBeGreaterThan(0);
    expect(b.vel.x).toBeLessThan(0);
  });

  it('drops stale tracks after maxCoastMs and never mixes classes', () => {
    const tr = new Tracker({ maxCoastMs: 500 });
    tr.update([det(100, 300, 200, 100, 0)], 0);
    tr.update([det(100, 300, 200, 100, 100)], 100);
    tr.update([det(100, 300, 200, 100, 700, 'sign')], 700);
    // car track is stale, sign is a new tentative track
    expect(tr.tracks.map((t) => t.cls)).toEqual(['sign']);
  });

  it('votes on class (car→truck after repeated truck detections)', () => {
    const tr = new Tracker();
    tr.update([det(100, 300, 200, 100, 0, 'car')], 0);
    for (let i = 1; i < 5; i++) tr.update([det(100, 300, 200, 100, i * 100, 'truck')], i * 100);
    expect(tr.tracks[0].cls).toBe('truck');
  });

  it('meanVx reports world flow direction', () => {
    const tr = new Tracker();
    for (let i = 0; i < 6; i++) tr.update([det(100 + i * 50, 300, 100, 60, i * 100), det(500 + i * 50, 380, 100, 60, i * 100)], i * 100);
    expect(tr.meanVx()).toBeGreaterThan(200);
  });
});
