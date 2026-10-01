import type { Rect, TargetClass, Vec2 } from '../core/types';
import { center, containsPoint, expand } from '../core/math/rect';
import type { Rng } from '../core/rng';

export interface HitTarget {
  id: number;
  box: Rect;
  cls: TargetClass;
}

/** Nearest-in-depth heuristic: lower on screen ⇒ closer ⇒ occludes. */
function nearer(a: HitTarget, b: HitTarget): HitTarget {
  return a.box.y + a.box.h >= b.box.y + b.box.h ? a : b;
}

/** Point test against slightly enlarged boxes (detection boxes are tight; small far boxes get a minimum size). */
export function targetAt(p: Vec2, targets: readonly HitTarget[], slack = 0.1, minSize = 28): HitTarget | null {
  let best: HitTarget | null = null;
  for (const t of targets) {
    const px = Math.max(t.box.w * slack, (minSize - t.box.w) / 2);
    const py = Math.max(t.box.h * slack, (minSize - t.box.h) / 2);
    if (containsPoint(expand(t.box, px, py), p)) best = best ? nearer(best, t) : t;
  }
  return best;
}

/** Does the segment a→b cross rect r (slab test)? */
export function segmentHitsRect(a: Vec2, b: Vec2, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, a.x - r.x) && clip(dx, r.x + r.w - a.x) && clip(-dy, a.y - r.y) && clip(dy, r.y + r.h - a.y);
}

/** Distance from point to the nearest edge of a rect (0 if inside). */
export function distToRect(p: Vec2, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Snap an aim point onto the closest target within `radius` px (returns original point otherwise). */
export function aimAssist(p: Vec2, targets: readonly HitTarget[], radius: number, slack = 0.1): { point: Vec2; target: HitTarget | null } {
  const direct = targetAt(p, targets, slack);
  if (direct) return { point: p, target: direct };
  let best: HitTarget | null = null;
  let bestD = radius;
  for (const t of targets) {
    const d = distToRect(p, t.box);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  if (!best) return { point: p, target: null };
  // move the point to the nearest point on the box, nudged towards the center
  const c = center(best.box);
  const nx = Math.min(Math.max(p.x, best.box.x), best.box.x + best.box.w);
  const ny = Math.min(Math.max(p.y, best.box.y), best.box.y + best.box.h);
  return { point: { x: nx + (c.x - nx) * 0.35, y: ny + (c.y - ny) * 0.35 }, target: best };
}

/** Apply angular spread to a hitscan aim point. `pxPerDeg` converts degrees to pixels at this focal length. */
export function applySpread(p: Vec2, spreadDeg: number, pxPerDeg: number, rng: Rng): Vec2 {
  if (spreadDeg <= 0) return p;
  const r = Math.abs(rng.gauss(0, spreadDeg * 0.5)) * pxPerDeg;
  const a = rng.range(0, Math.PI * 2);
  return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
}

export interface BlastHit {
  target: HitTarget;
  /** 1 at the center, →0 at the radius edge. */
  factor: number;
}

/** Targets inside a blast radius with linear falloff measured to the box edge. */
export function blast(at: Vec2, radius: number, targets: readonly HitTarget[]): BlastHit[] {
  const out: BlastHit[] = [];
  for (const t of targets) {
    const d = distToRect(at, t.box);
    if (d <= radius) out.push({ target: t, factor: 1 - (d / radius) * 0.6 });
  }
  return out.sort((a, b) => b.factor - a.factor);
}
