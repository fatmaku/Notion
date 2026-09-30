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

/** Point test against slightly enlarged boxes (detection boxes are tight). */
export function targetAt(p: Vec2, targets: readonly HitTarget[], slack = 0.06): HitTarget | null {
  let best: HitTarget | null = null;
  for (const t of targets) {
    if (containsPoint(expand(t.box, t.box.w * slack, t.box.h * slack), p)) best = best ? nearer(best, t) : t;
  }
  return best;
}

/** Distance from point to the nearest edge of a rect (0 if inside). */
export function distToRect(p: Vec2, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Snap an aim point onto the closest target within `radius` px (returns original point otherwise). */
export function aimAssist(p: Vec2, targets: readonly HitTarget[], radius: number): { point: Vec2; target: HitTarget | null } {
  const direct = targetAt(p, targets);
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
