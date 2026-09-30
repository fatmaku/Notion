import type { Rect } from '../../core/types';
import type { Rng } from '../../core/rng';

/** A paint/milkshake splat stored in box-relative coordinates so it rides along with the vehicle. */
export interface Decal {
  u: number;
  v: number;
  /** radius relative to box width */
  r: number;
  color: string;
  seed: number;
  born: number;
  kind: 'paint' | 'shake';
}

export const PAINT_COLORS = ['#ff2d95', '#00e5ff', '#ffe600', '#7cff00', '#ff6a00', '#b84dff'];

export function makeDecal(box: Rect, x: number, y: number, kind: Decal['kind'], rng: Rng, now: number, color?: string): Decal {
  return {
    u: (x - box.x) / box.w,
    v: (y - box.y) / box.h,
    r: kind === 'paint' ? rng.range(0.09, 0.16) : rng.range(0.16, 0.24),
    color: color ?? (kind === 'paint' ? rng.pick(PAINT_COLORS) : '#fff1e0'),
    seed: Math.floor(rng.next() * 1e9),
    born: now,
    kind,
  };
}

/** Approximate covered fraction of the box by sampling a grid against decal discs. */
export function coverage(decals: readonly Decal[], n = 10): number {
  if (!decals.length) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = (i + 0.5) / n;
      const v = (j + 0.5) / n;
      for (const d of decals) {
        const dx = (u - d.u) / d.r;
        const dy = (v - d.v) / (d.r * 1.6); // box is wider than tall; decals are ~round in px, use aspect ~1.6
        if (dx * dx + dy * dy <= 1.3) {
          hit++;
          break;
        }
      }
    }
  }
  return hit / (n * n);
}

export function drawDecal(ctx: CanvasRenderingContext2D, box: Rect, d: Decal, now: number): void {
  const cx = box.x + d.u * box.w;
  const cy = box.y + d.v * box.h;
  const r = d.r * box.w;
  const age = Math.min(1, (now - d.born) / 180);
  const s = 0.6 + 0.4 * age;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = d.color;
  ctx.globalAlpha = d.kind === 'paint' ? 0.92 : 0.85;
  // main blob + pseudo-random satellites from the seed
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  let sd = d.seed;
  for (let i = 0; i < 6; i++) {
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const a = (sd / 0x7fffffff) * Math.PI * 2;
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const dist = r * (0.6 + (sd / 0x7fffffff) * 0.7);
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const rr = r * (0.15 + (sd / 0x7fffffff) * 0.35);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // drips
  ctx.globalAlpha *= 0.9;
  for (let i = 0; i < 2; i++) {
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const dx = (sd / 0x7fffffff - 0.5) * r;
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const len = r * (0.5 + (sd / 0x7fffffff) * 1.2) * age;
    ctx.fillRect(dx - r * 0.08, 0, r * 0.16, len);
    ctx.beginPath();
    ctx.arc(dx, len, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
