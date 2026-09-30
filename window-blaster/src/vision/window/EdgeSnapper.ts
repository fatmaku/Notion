import type { Quad, Vec2 } from '../../core/types';
import { lineIntersection, quadCenter } from '../../core/math/polygon';
import { fitLine } from './WindowEstimator';

export interface SnapOptions {
  samples: number;
  /** search radius perpendicular to the edge (gray px) */
  radius: number;
  /** minimal gradient magnitude (gray levels per px) to accept a sample */
  minContrast: number;
  /** maximum corner displacement accepted per snap (gray px) */
  maxMove: number;
}

export const DEFAULT_SNAP: SnapOptions = { samples: 16, radius: 8, minContrast: 6, maxMove: 12 };

export interface SnapResult {
  quad: Quad;
  /** overall 0..1 */
  confidence: number;
  perEdge: number[];
}

function sample(gray: Uint8Array, w: number, h: number, x: number, y: number): number {
  // bilinear
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) {
    const cx = Math.min(w - 1, Math.max(0, Math.round(x)));
    const cy = Math.min(h - 1, Math.max(0, Math.round(y)));
    return gray[cy * w + cx];
  }
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * w + x0;
  const a = gray[i];
  const b = gray[i + 1];
  const c = gray[i + w];
  const d = gray[i + w + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/**
 * Refines a quad by searching, along each edge, for the strongest dark→bright
 * transition perpendicular to it (bright = inside the window), fitting a robust
 * line per edge and intersecting the lines. Sub-pixel via parabolic peak fit.
 */
export function snapQuad(gray: Uint8Array, w: number, h: number, quad: Quad, o: SnapOptions = DEFAULT_SNAP): SnapResult {
  const c = quadCenter(quad);
  const lines: ({ p: Vec2; d: Vec2 } | null)[] = [];
  const perEdge: number[] = [];
  for (let e = 0; e < 4; e++) {
    const a = quad[e];
    const b = quad[(e + 1) % 4];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len = Math.hypot(ex, ey) || 1;
    const dx = ex / len;
    const dy = ey / len;
    // inward normal
    let nx = -dy;
    let ny = dx;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if ((c.x - mx) * nx + (c.y - my) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const pts: Vec2[] = [];
    let gradSum = 0;
    const R = o.radius;
    const profile = new Float32Array(2 * R + 1);
    for (let s = 0; s < o.samples; s++) {
      const f = 0.08 + (0.84 * (s + 0.5)) / o.samples;
      const px = a.x + ex * f;
      const py = a.y + ey * f;
      for (let k = -R; k <= R; k++) profile[k + R] = sample(gray, w, h, px + nx * k, py + ny * k);
      let bestK = 0;
      let bestG = 0;
      for (let k = -R + 1; k <= R - 1; k++) {
        const g = profile[k + R + 1] - profile[k + R - 1]; // increasing towards inside
        if (g > bestG) {
          bestG = g;
          bestK = k;
        }
      }
      if (bestG / 2 < o.minContrast) continue;
      // parabolic sub-pixel refinement on the gradient peak
      const gm = profile[bestK + R] - profile[bestK + R - 2 < 0 ? 0 : bestK + R - 2];
      const gp = profile[bestK + R + 2 > 2 * R ? 2 * R : bestK + R + 2] - profile[bestK + R];
      const den = gm - 2 * bestG + gp;
      const off = Math.abs(den) > 1e-6 ? Math.max(-1, Math.min(1, (0.5 * (gm - gp)) / den)) : 0;
      const kk = bestK + off;
      pts.push({ x: px + nx * kk, y: py + ny * kk });
      gradSum += bestG / 2;
    }
    if (pts.length < 5) {
      lines.push(null);
      perEdge.push(0);
      continue;
    }
    const fit = fitLine(pts);
    if (!fit || fit.residual > 2.5) {
      lines.push(null);
      perEdge.push(0);
      continue;
    }
    lines.push({ p: fit.p, d: fit.d });
    perEdge.push(Math.min(1, pts.length / o.samples) * Math.min(1, gradSum / pts.length / 25) * Math.max(0.3, 1 - fit.residual / 3));
  }
  const out: Quad = [quad[0], quad[1], quad[2], quad[3]];
  for (let i = 0; i < 4; i++) {
    const prev = lines[(i + 3) % 4]; // edge ending at corner i
    const cur = lines[i]; // edge starting at corner i
    let p: Vec2 | null = null;
    if (prev && cur) p = lineIntersection(prev.p, prev.d, cur.p, cur.d);
    else if (cur) p = projectOnto(quad[i], cur);
    else if (prev) p = projectOnto(quad[i], prev);
    if (p && Math.hypot(p.x - quad[i].x, p.y - quad[i].y) <= o.maxMove) out[i] = p;
  }
  const confidence = perEdge.reduce((s, v) => s + v, 0) / 4;
  return { quad: out, confidence, perEdge };
}

function projectOnto(p: Vec2, l: { p: Vec2; d: Vec2 }): Vec2 {
  const t = (p.x - l.p.x) * l.d.x + (p.y - l.p.y) * l.d.y;
  return { x: l.p.x + l.d.x * t, y: l.p.y + l.d.y * t };
}
