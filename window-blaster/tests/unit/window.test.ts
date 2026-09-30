import { describe, expect, it } from 'vitest';
import type { Quad } from '../../src/core/types';
import { pointInPolygon, quadCenter } from '../../src/core/math/polygon';
import { Rng } from '../../src/core/rng';
import { estimateWindow, otsu } from '../../src/vision/window/WindowEstimator';
import { snapQuad } from '../../src/vision/window/EdgeSnapper';
import { WindowTracker } from '../../src/vision/window/WindowTracker';
import { FocalCalibrator } from '../../src/sensors/FocalCalibrator';

const W = 240;
const H = 135;
const SCALE = 1280 / W;

interface SynthOpts {
  bright?: number;
  dark?: number;
  noise?: number;
  seed?: number;
  /** dark rectangles inside the window (cars) in gray px */
  cars?: { x: number; y: number; w: number; h: number }[];
}

function synth(quad: Quad, o: SynthOpts = {}): Uint8Array {
  const bright = o.bright ?? 200;
  const dark = o.dark ?? 30;
  const rng = new Rng(o.seed ?? 1);
  const g = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = pointInPolygon({ x: x + 0.5, y: y + 0.5 }, quad);
      let v = inside ? bright : dark;
      if (inside && o.cars) for (const c of o.cars) if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) v = 60;
      v += rng.gauss(0, o.noise ?? 3);
      g[y * W + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  return g;
}

const truth: Quad = [
  { x: 40, y: 20 },
  { x: 205, y: 17 },
  { x: 210, y: 118 },
  { x: 36, y: 122 },
];

const shift = (q: Quad, dx: number, dy: number): Quad => q.map((p) => ({ x: p.x + dx, y: p.y + dy })) as Quad;
const maxCornerErr = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));

describe('WindowEstimator', () => {
  it('otsu separates two classes', () => {
    const g = synth(truth);
    const { threshold, contrast } = otsu(g);
    expect(threshold).toBeGreaterThan(40);
    expect(threshold).toBeLessThan(190);
    expect(contrast).toBeGreaterThan(0.5);
  });

  it('finds the bright window quad within 3 gray px on a daylight frame', () => {
    const est = estimateWindow(synth(truth), W, H);
    expect(est.kind).toBe('window');
    expect(est.confidence).toBeGreaterThan(0.5);
    expect(maxCornerErr(est.quad, truth)).toBeLessThan(3);
  });

  it('is robust to dark vehicles inside the window', () => {
    const est = estimateWindow(synth(truth, { cars: [{ x: 90, y: 80, w: 50, h: 30 }, { x: 150, y: 95, w: 40, h: 26 }] }), W, H);
    expect(est.kind).toBe('window');
    expect(maxCornerErr(est.quad, truth)).toBeLessThan(4);
  });

  it('separates the interior from mid-gray asphalt inside the window', () => {
    // road strip (luminance ~95) spanning the lower part of the window down to its bottom edge
    const rng = new Rng(3);
    const g = synth(truth, { seed: 9 });
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (y > 85 && pointInPolygon({ x: x + 0.5, y: y + 0.5 }, truth) && Math.abs(x - 122) < (y - 60) * 1.1) g[y * W + x] = Math.max(0, Math.min(255, Math.round(95 + rng.gauss(0, 3))));
      }
    }
    const est = estimateWindow(g, W, H);
    expect(est.kind).toBe('window');
    expect(maxCornerErr(est.quad, truth)).toBeLessThan(4);
  });

  it('reports low confidence / fullframe at night (no contrast)', () => {
    const est = estimateWindow(synth(truth, { bright: 45, dark: 30, noise: 2 }), W, H);
    expect(est.kind === 'fullframe' || est.confidence < 0.3).toBe(true);
  });

  it('detects phone-at-the-glass as fullframe', () => {
    const full: Quad = [
      { x: -5, y: -5 },
      { x: W + 5, y: -5 },
      { x: W + 5, y: H + 5 },
      { x: -5, y: H + 5 },
    ];
    const g = synth(full, { cars: [{ x: 100, y: 60, w: 40, h: 20 }] });
    const est = estimateWindow(g, W, H);
    expect(est.kind).toBe('fullframe');
  });
});

describe('EdgeSnapper', () => {
  it('recovers a 6 px shift to within 1 px', () => {
    const g = synth(truth, { noise: 3 });
    const start = shift(truth, 6, -4);
    const res = snapQuad(g, W, H, start);
    expect(res.confidence).toBeGreaterThan(0.4);
    expect(maxCornerErr(res.quad, truth)).toBeLessThan(1.0);
  });

  it('gives low confidence when there is no edge', () => {
    const g = synth(truth, { bright: 32, dark: 30, noise: 1 });
    const res = snapQuad(g, W, H, shift(truth, 3, 3));
    expect(res.confidence).toBeLessThan(0.3);
  });
});

describe('WindowTracker', () => {
  const mk = () => new WindowTracker({ frameW: 1280, frameH: 720, hfovDeg: 69, latencyMs: 0 });
  const toVideo = (q: Quad): Quad => q.map((p) => ({ x: p.x * SCALE, y: p.y * SCALE })) as Quad;

  it('follows a translating window with edge snapping only', () => {
    const tr = mk();
    tr.setManual(toVideo(truth));
    let err = 0;
    for (let i = 0; i <= 45; i++) {
      const t = i * 66;
      const dx = 9 * Math.sin(t / 1000);
      const dy = 5 * Math.cos(t / 800);
      const q = shift(truth, dx, dy);
      tr.observe({ gray: synth(q, { seed: i }), w: W, h: H, scale: SCALE, t });
      if (i > 15) {
        const c = quadCenter(tr.get().quad);
        const ct = quadCenter(toVideo(q));
        err = Math.max(err, Math.hypot(c.x - ct.x, c.y - ct.y));
      }
    }
    expect(tr.get().mode).toBe('tracking');
    expect(err).toBeLessThan(2 * SCALE);
  });

  it('auto-initialises from the brightness observer without manual corners', () => {
    const tr = mk();
    for (let i = 0; i < 12; i++) tr.observe({ gray: synth(truth, { seed: i }), w: W, h: H, scale: SCALE, t: i * 66 });
    const s = tr.get();
    expect(s.mode === 'tracking' || s.mode === 'degraded').toBe(true);
    expect(maxCornerErr(s.quad, toVideo(truth))).toBeLessThan(3 * SCALE);
  });

  it('uses gyro prediction for fast pans and self-corrects an inverted axis', () => {
    for (const inverted of [false, true]) {
      const tr = mk();
      tr.setManual(toVideo(truth));
      const f = tr.focal.f; // px/rad
      let prevDx = 0;
      let err = 0;
      for (let i = 0; i <= 60; i++) {
        const t = i * 66;
        const dxGray = 12 * Math.sin(t / 700); // up to ~±12 gray px, faster than snap-only can follow reliably
        const dxVideo = dxGray * SCALE;
        // gyro samples at 100 Hz between frames, consistent with the shift
        const steps = 6;
        for (let k = 1; k <= steps; k++) {
          const ts = t - 66 + (66 * k) / steps;
          const rate = ((dxVideo - prevDx) / f / 0.066) * (inverted ? -1 : 1);
          tr.onMotion({ pan: rate, tilt: 0, roll: 0, t: ts });
        }
        prevDx = dxVideo;
        const q = shift(truth, dxGray, 0);
        tr.observe({ gray: synth(q, { seed: i }), w: W, h: H, scale: SCALE, t });
        if (i > 30) {
          const c = quadCenter(tr.get().quad);
          const ct = quadCenter(toVideo(q));
          err = Math.max(err, Math.abs(c.x - ct.x));
        }
      }
      if (inverted) expect(tr.focal.sign).toBe(-1);
      else expect(tr.focal.sign).toBe(1);
      expect(err).toBeLessThan(3 * SCALE);
      expect(tr.get().mode).not.toBe('off');
    }
  });

  it('recenter() re-detects the window and fullframe locks tracking off', () => {
    const tr = mk();
    tr.observe({ gray: synth(truth), w: W, h: H, scale: SCALE, t: 0 });
    tr.setFullFrame();
    expect(tr.get().mode).toBe('fullframe');
    expect(tr.recenter()).toBe(true);
    expect(tr.get().mode).toBe('tracking');
    expect(maxCornerErr(tr.get().quad, toVideo(truth))).toBeLessThan(3 * SCALE);
  });
});

describe('FocalCalibrator', () => {
  it('recovers f within 15% despite 30% outliers and detects sign', () => {
    const rng = new Rng(5);
    const cal = new FocalCalibrator(931, 700, 2000);
    const fTrue = 1200;
    for (let i = 0; i < 40; i++) {
      const dA = rng.range(0.02, 0.08) * (rng.chance(0.5) ? 1 : -1);
      const dPx = rng.chance(0.3) ? rng.range(-300, 300) : dA * fTrue + rng.gauss(0, 4);
      cal.addPair(dA, dPx);
    }
    expect(Math.abs(cal.f - fTrue) / fTrue).toBeLessThan(0.15);
    expect(cal.sign).toBe(1);
  });
});
