import type { Rect, Vec2 } from '../types';

export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
export const area = (r: Rect): number => Math.max(0, r.w) * Math.max(0, r.h);
export const center = (r: Rect): Vec2 => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const right = (r: Rect): number => r.x + r.w;
export const bottom = (r: Rect): number => r.y + r.h;
export const containsPoint = (r: Rect, p: Vec2): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export const expand = (r: Rect, px: number, py = px): Rect => ({ x: r.x - px, y: r.y - py, w: r.w + 2 * px, h: r.h + 2 * py });
/** Scale a rect about its center. */
export const scaleAbout = (r: Rect, s: number): Rect => {
  const c = center(r);
  return { x: c.x - (r.w * s) / 2, y: c.y - (r.h * s) / 2, w: r.w * s, h: r.h * s };
};
export const intersect = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w);
  const btm = Math.min(a.y + a.h, b.y + b.h);
  if (r <= x || btm <= y) return null;
  return { x, y, w: r - x, h: btm - y };
};
export const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
export const iou = (a: Rect, b: Rect): number => {
  const i = intersect(a, b);
  if (!i) return 0;
  const ia = area(i);
  const u = area(a) + area(b) - ia;
  return u > 0 ? ia / u : 0;
};
/** Fraction of `a` covered by `b`. */
export const overlapFraction = (a: Rect, b: Rect): number => {
  const i = intersect(a, b);
  const aa = area(a);
  return i && aa > 0 ? area(i) / aa : 0;
};
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});
export const clampRect = (r: Rect, bounds: Rect): Rect => {
  const x = Math.max(bounds.x, r.x);
  const y = Math.max(bounds.y, r.y);
  const rx = Math.min(bounds.x + bounds.w, r.x + r.w);
  const by = Math.min(bounds.y + bounds.h, r.y + r.h);
  return { x, y, w: Math.max(0, rx - x), h: Math.max(0, by - y) };
};
/** Distance from point to rect center normalised by half-diagonal (0 = dead center, 1 = corner). */
export const centerness = (r: Rect, p: Vec2): number => {
  const c = center(r);
  const dx = (p.x - c.x) / Math.max(1, r.w / 2);
  const dy = (p.y - c.y) / Math.max(1, r.h / 2);
  return Math.min(1, Math.hypot(dx, dy) / Math.SQRT2);
};
