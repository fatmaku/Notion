import type { Quad, Rect, Vec2 } from '../types';
import { cross, sub } from './vec';

/** Convex polygon containment (works for both windings). */
export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const c = cross(sub(b, a), sub(p, a));
    if (c > 0) pos++;
    else if (c < 0) neg++;
    if (pos && neg) return false;
  }
  return true;
}

export const quadBounds = (q: Quad): Rect => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of q) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export const quadArea = (q: Quad): number => {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
};

export const quadCenter = (q: Quad): Vec2 => ({
  x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4,
  y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4,
});

export const rectToQuad = (r: Rect): Quad => [
  { x: r.x, y: r.y },
  { x: r.x + r.w, y: r.y },
  { x: r.x + r.w, y: r.y + r.h },
  { x: r.x, y: r.y + r.h },
];

/** Approximate fraction of rect `r` lying inside quad `q` using an n×n sample grid. */
export function rectInQuadFraction(r: Rect, q: Quad, n = 4): number {
  let inside = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p = { x: r.x + ((i + 0.5) / n) * r.w, y: r.y + ((j + 0.5) / n) * r.h };
      if (pointInPolygon(p, q)) inside++;
    }
  }
  return inside / (n * n);
}

/** IoU of two quads approximated by rasterised sampling over their union bounds. */
export function quadIoU(a: Quad, b: Quad, n = 24): number {
  const ba = quadBounds(a);
  const bb = quadBounds(b);
  const x0 = Math.min(ba.x, bb.x);
  const y0 = Math.min(ba.y, bb.y);
  const x1 = Math.max(ba.x + ba.w, bb.x + bb.w);
  const y1 = Math.max(ba.y + ba.h, bb.y + bb.h);
  let inter = 0;
  let uni = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p = { x: x0 + ((i + 0.5) / n) * (x1 - x0), y: y0 + ((j + 0.5) / n) * (y1 - y0) };
      const ia = pointInPolygon(p, a);
      const ib = pointInPolygon(p, b);
      if (ia && ib) inter++;
      if (ia || ib) uni++;
    }
  }
  return uni ? inter / uni : 0;
}

/** Intersection of two infinite lines given by point+direction; null if parallel. */
export function lineIntersection(p1: Vec2, d1: Vec2, p2: Vec2, d2: Vec2): Vec2 | null {
  const den = cross(d1, d2);
  if (Math.abs(den) < 1e-9) return null;
  const t = cross(sub(p2, p1), d2) / den;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

/** Bottom edge (BL→BR) of the quad as a y-value at a given x, by linear interpolation. */
export function quadBottomY(q: Quad, x: number): number {
  const a = q[3];
  const b = q[2];
  if (Math.abs(b.x - a.x) < 1e-6) return (a.y + b.y) / 2;
  const t = (x - a.x) / (b.x - a.x);
  return a.y + (b.y - a.y) * t;
}
