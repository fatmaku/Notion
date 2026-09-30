import type { Rect, TargetClass } from '../../core/types';
import { intersect } from '../../core/math/rect';

export type ObstacleKind = 'ground' | 'overhead' | 'coin';

export interface Obstacle {
  id: number | string;
  cls: TargetClass | 'pole' | 'coin';
  kind: ObstacleKind;
  /** hit box in video px (already shrunk) */
  box: Rect;
  /** platform top height above ground (px), ground obstacles only */
  top: number;
  /** velocity x px/s */
  vx: number;
  raw: Rect;
}

export interface MapperParams {
  R: number;
  /** ground y at x */
  groundY: (x: number) => number;
}

/**
 * Turns a tracked real-world box into a runner obstacle: objects standing on
 * the ground become hurdles (with a platform roof capped at 1.3 R), objects
 * hanging high become overhead bars that must be ducked under.
 */
export function mapObstacle(id: number | string, cls: TargetClass | 'pole', box: Rect, vx: number, p: MapperParams): Obstacle | null {
  const R = p.R;
  const cx = box.x + box.w / 2;
  const gy = p.groundY(cx);
  const bottomAbove = gy - (box.y + box.h); // px above ground (negative = below the line)
  const topAbove = gy - box.y;
  if (topAbove < R * 0.25) return null; // entirely below the ground line
  if (bottomAbove > 6 * R) return null; // far above: irrelevant
  const shrinkX = box.w * 0.12;
  const hx = box.x + shrinkX;
  const hw = Math.max(4, box.w - 2 * shrinkX);
  if (bottomAbove >= R * 0.8 && topAbove > bottomAbove) {
    // overhead bar: duck under it
    const bottom = gy - bottomAbove;
    const top = Math.max(box.y, bottom - 1.0 * R);
    return { id, cls, kind: 'overhead', box: { x: hx, y: top, w: hw, h: bottom - top }, top: 0, vx, raw: box };
  }
  const roof = Math.min(topAbove, 1.3 * R);
  const y = gy - roof;
  return { id, cls, kind: 'ground', box: { x: hx, y, w: hw, h: roof + Math.min(0, bottomAbove) * -1 * 0 + 2 }, top: roof, vx, raw: box };
}

/** Platform top under the runner (px above ground) if a ground obstacle spans the runner's x. */
export function platformUnder(runner: Rect, obstacles: readonly Obstacle[], margin = 0): number | null {
  let best: number | null = null;
  const cx = runner.x + runner.w / 2;
  for (const o of obstacles) {
    if (o.kind !== 'ground') continue;
    if (cx >= o.box.x - margin && cx <= o.box.x + o.box.w + margin) best = best === null ? o.top : Math.max(best, o.top);
  }
  return best;
}

/** True when the runner rect collides with an obstacle's side / body (not standing on it). */
export function collides(runner: Rect, o: Obstacle, feetHeight: number): boolean {
  const i = intersect(runner, o.box);
  if (!i) return false;
  if (o.kind === 'ground') {
    // standing on / skimming the roof is fine
    if (feetHeight >= o.top - 3) return false;
    return i.h > 4 && i.w > 3;
  }
  return i.h > 4 && i.w > 3;
}
