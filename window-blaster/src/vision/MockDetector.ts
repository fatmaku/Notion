import type { Detection, Rect, TargetClass } from '../core/types';
import { Rng } from '../core/rng';
import type { Detector, DetectorInfo } from './Detector';

export interface MockTruthObject {
  box: Rect;
  cls: TargetClass;
  detectable: boolean;
}

export interface MockDetectorOptions {
  seed?: number;
  /** Box jitter as a fraction of box size (sd). */
  noise?: number;
  /** Probability that a visible object is missed in a given frame. */
  dropout?: number;
  /** Probability of car↔truck confusion. */
  confusion?: number;
  /** Minimum box area (px²) to be detected, mimics small-object recall loss. */
  minArea?: number;
  /** Frame size used to clip and to compute visibility. */
  frame: { w: number; h: number };
  /** Busy-wait to emulate inference cost (tests the scheduler's duty cycle). */
  simulatedCostMs?: number;
}

/** Deterministic detector fed by scene ground truth, with realistic imperfections. */
export class MockDetector implements Detector {
  readonly info: DetectorInfo = { name: 'mock', delegate: 'none' };
  private readonly rng: Rng;
  private readonly o: Required<MockDetectorOptions>;

  constructor(
    private readonly truth: () => readonly MockTruthObject[],
    options: MockDetectorOptions,
  ) {
    this.o = {
      seed: options.seed ?? 7,
      noise: options.noise ?? 0.03,
      dropout: options.dropout ?? 0.08,
      confusion: options.confusion ?? 0.04,
      minArea: options.minArea ?? 500,
      frame: options.frame,
      simulatedCostMs: options.simulatedCostMs ?? 0,
    };
    this.rng = new Rng(this.o.seed);
  }

  async init(onProgress?: (f: number, label: string) => void): Promise<void> {
    onProgress?.(1, 'mock');
  }

  detect(_src: TexImageSource, ts: number): Detection[] {
    if (this.o.simulatedCostMs > 0) {
      const end = performance.now() + this.o.simulatedCostMs;
      while (performance.now() < end) {
        /* emulate blocking inference */
      }
    }
    const out: Detection[] = [];
    const { w: W, h: H } = this.o.frame;
    for (const t of this.truth()) {
      if (!t.detectable) continue;
      const b = t.box;
      // visible part
      const x0 = Math.max(0, b.x);
      const y0 = Math.max(0, b.y);
      const x1 = Math.min(W, b.x + b.w);
      const y1 = Math.min(H, b.y + b.h);
      if (x1 <= x0 || y1 <= y0) continue;
      const visArea = (x1 - x0) * (y1 - y0);
      if (visArea < this.o.minArea || visArea / (b.w * b.h) < 0.35) continue;
      if (this.rng.chance(this.o.dropout)) continue;
      const n = this.o.noise;
      const jx = this.rng.gauss(0, n * b.w);
      const jy = this.rng.gauss(0, n * b.h);
      const jw = this.rng.gauss(0, n * b.w);
      const jh = this.rng.gauss(0, n * b.h);
      let cls = t.cls;
      if (this.rng.chance(this.o.confusion)) {
        if (cls === 'car') cls = 'truck';
        else if (cls === 'truck') cls = 'car';
      }
      out.push({
        box: { x: x0 + jx, y: y0 + jy, w: Math.max(4, x1 - x0 + jw), h: Math.max(4, y1 - y0 + jh) },
        cls,
        score: this.rng.range(0.45, 0.95),
        ts,
      });
    }
    return out;
  }

  dispose(): void {
    /* nothing */
  }
}
