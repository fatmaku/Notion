import type { Quad, Rect } from '../../core/types';
import type { GrayFrame } from '../../vision/window/FrameGrabber';
import { median } from '../../core/math/filters';

export interface Pole {
  id: string;
  /** center x, video px */
  x: number;
  /** px/s */
  vx: number;
  width: number;
  hits: number;
  misses: number;
  lastT: number;
  confirmed: boolean;
}

export interface PoleDetectorOptions {
  /** minimum darkness below the band median (0..255) */
  minDelta?: number;
  minWidthPx?: number;
  maxWidthPx?: number;
  confirmHits?: number;
}

/**
 * Experimental: finds thin dark vertical structures (poles, trunks, sign posts)
 * in the ground band of the window by per-column luminance, and tracks them
 * over time so they can act as runner obstacles. COCO detectors know no trees.
 */
export class PoleDetector {
  readonly poles: Pole[] = [];
  private next = 1;
  private readonly o: Required<PoleDetectorOptions>;
  constructor(opts: PoleDetectorOptions = {}) {
    this.o = { minDelta: opts.minDelta ?? 40, minWidthPx: opts.minWidthPx ?? 4, maxWidthPx: opts.maxWidthPx ?? 45, confirmHits: opts.confirmHits ?? 3 };
  }

  /**
   * @param band vertical band (video px) to analyse, typically ground line − 1.5R … ground line − 0.1R
   * @param quad window quad; columns outside are ignored
   * @param exclude boxes (tracked vehicles) whose columns are ignored
   */
  update(frame: GrayFrame, band: Rect, quad: Quad, exclude: readonly Rect[], dir: number, flowSpeed: number): void {
    const s = frame.scale;
    const x0 = Math.max(0, Math.floor(Math.min(quad[0].x, quad[3].x) / s));
    const x1 = Math.min(frame.w - 1, Math.ceil(Math.max(quad[1].x, quad[2].x) / s));
    const y0 = Math.max(0, Math.floor(band.y / s));
    const y1 = Math.min(frame.h - 1, Math.ceil((band.y + band.h) / s));
    if (x1 - x0 < 8 || y1 - y0 < 2) return;
    const cols = new Float32Array(x1 - x0 + 1);
    for (let x = x0; x <= x1; x++) {
      let sum = 0;
      for (let y = y0; y <= y1; y++) sum += frame.gray[y * frame.w + x];
      cols[x - x0] = sum / (y1 - y0 + 1);
    }
    const med = median(Array.from(cols));
    const cand: { x: number; w: number }[] = [];
    let run = -1;
    for (let i = 0; i <= cols.length; i++) {
      const dark = i < cols.length && cols[i] < med - this.o.minDelta;
      if (dark && run < 0) run = i;
      if (!dark && run >= 0) {
        const wPx = (i - run) * s;
        const cx = (x0 + (run + i) / 2) * s;
        if (wPx >= this.o.minWidthPx && wPx <= this.o.maxWidthPx && !exclude.some((b) => cx > b.x - 10 && cx < b.x + b.w + 10)) cand.push({ x: cx, w: wPx });
        run = -1;
      }
    }
    // associate with existing poles (predicted position)
    const dt = this.poles.length ? Math.max(0, (frame.t - this.poles[0].lastT) / 1000) : 0;
    const used = new Set<number>();
    for (const p of this.poles) {
      const pred = p.x + p.vx * dt;
      let bi = -1;
      let bd = Math.max(25, Math.abs(p.vx) * dt * 0.6 + 20);
      cand.forEach((c, i) => {
        const d = Math.abs(c.x - pred);
        if (!used.has(i) && d < bd) {
          bd = d;
          bi = i;
        }
      });
      if (bi >= 0) {
        const c = cand[bi];
        used.add(bi);
        if (dt > 0) p.vx = p.vx * 0.6 + ((c.x - p.x) / dt) * 0.4;
        p.x = c.x;
        p.width = p.width * 0.7 + c.w * 0.3;
        p.hits++;
        p.misses = 0;
        p.lastT = frame.t;
        if (p.hits >= this.o.confirmHits) p.confirmed = true;
      } else {
        p.x = pred;
        p.misses++;
        p.lastT = frame.t;
      }
    }
    cand.forEach((c, i) => {
      if (!used.has(i)) this.poles.push({ id: `pole${this.next++}`, x: c.x, vx: dir * flowSpeed, width: c.w, hits: 1, misses: 0, lastT: frame.t, confirmed: false });
    });
    for (let i = this.poles.length - 1; i >= 0; i--) {
      const p = this.poles[i];
      const inside = p.x > Math.min(quad[0].x, quad[3].x) - 40 && p.x < Math.max(quad[1].x, quad[2].x) + 40;
      if (p.misses > 4 || (!p.confirmed && p.misses > 1) || !inside) this.poles.splice(i, 1);
    }
  }

  clear(): void {
    this.poles.length = 0;
  }
}
