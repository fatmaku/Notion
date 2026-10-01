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
  kind: 'paint' | 'shake' | 'splat' | 'ice' | 'tp';
}

export const PAINT_COLORS = ['#ff2d95', '#00e5ff', '#ffe600', '#7cff00', '#ff6a00', '#b84dff'];

export function makeDecal(box: Rect, x: number, y: number, kind: Decal['kind'], rng: Rng, now: number, color?: string, palette: readonly string[] = PAINT_COLORS): Decal {
  const r = kind === 'paint' ? rng.range(0.12, 0.2) : kind === 'tp' ? rng.range(0.3, 0.5) : kind === 'ice' ? rng.range(0.3, 0.4) : rng.range(0.18, 0.26);
  return {
    u: (x - box.x) / box.w,
    v: (y - box.y) / box.h,
    r,
    color: color ?? (kind === 'paint' ? rng.pick(palette) : '#fff1e0'),
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
  if (d.kind === 'tp') return drawTp(ctx, box, d, cx, cy, r, now);
  if (d.kind === 'ice') return drawIce(ctx, box, d, cx, cy, r, now);
  const life = Math.max(0, now - d.born);
  const age = Math.min(1, life / 180);
  if (!(r > 0) || !Number.isFinite(cx + cy)) return;
  // pop with overshoot, then settle
  const s = age < 1 ? 0.5 + 0.7 * age : 1.2 - 0.2 * Math.min(1, (life - 180) / 220);
  const drip = Math.min(1, life / 1500);
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
  // drips grow over ~1.5 s
  ctx.globalAlpha *= 0.9;
  for (let i = 0; i < 3; i++) {
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const dx = (sd / 0x7fffffff - 0.5) * r * 1.2;
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    const len = r * (0.6 + (sd / 0x7fffffff) * 1.6) * drip;
    const w = r * (0.1 + 0.08 * (i % 2));
    ctx.fillRect(dx - w / 2, 0, w, len);
    ctx.beginPath();
    ctx.arc(dx, len, w * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // gloss highlight
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draws decals into a snapshot canvas so fragments, wrecks and skids carry their paint. */
export function bakeDecals(canvas: HTMLCanvasElement, snapBox: Rect, targetBox: Rect, decals: readonly Decal[], now: number): void {
  const c = canvas.getContext('2d');
  if (!c || !decals.length) return;
  const local: Rect = { x: targetBox.x - snapBox.x, y: targetBox.y - snapBox.y, w: targetBox.w, h: targetBox.h };
  for (const d of decals) drawDecal(c, local, d, now + 5000);
}

/** Toilet-paper streamer: a wavy white band across the vehicle. */
function drawTp(ctx: CanvasRenderingContext2D, box: Rect, d: Decal, cx: number, cy: number, r: number, now: number): void {
  const age = Math.max(0, Math.min(1, (now - d.born) / 250));
  let sd = d.seed;
  sd = (sd * 1103515245 + 12345) & 0x7fffffff;
  const ang = ((sd / 0x7fffffff) - 0.5) * 0.9;
  const len = Math.min(box.w * 1.1, r * 3.2) * age;
  const w = Math.max(3, box.h * 0.12);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.moveTo(-len / 2, -w / 2);
  for (let i = 0; i <= 8; i++) ctx.lineTo(-len / 2 + (len * i) / 8, -w / 2 + Math.sin(i * 1.3 + d.seed) * w * 0.25);
  for (let i = 8; i >= 0; i--) ctx.lineTo(-len / 2 + (len * i) / 8, w / 2 + Math.sin(i * 1.3 + d.seed + 1) * w * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(-len / 2 + (len * i) / 8, -w / 2);
    ctx.lineTo(-len / 2 + (len * i) / 8, w / 2);
    ctx.stroke();
  }
  // loose end fluttering
  ctx.beginPath();
  ctx.moveTo(len / 2, 0);
  ctx.quadraticCurveTo(len / 2 + w, w * (0.8 + Math.sin(now / 90) * 0.4), len / 2 + w * 0.6, w * 2.2);
  ctx.lineWidth = w * 0.6;
  ctx.strokeStyle = d.color;
  ctx.stroke();
  ctx.restore();
}

/** Frost patch: translucent pale blue with crystal spikes. */
function drawIce(ctx: CanvasRenderingContext2D, _box: Rect, d: Decal, cx: number, cy: number, r: number, now: number): void {
  const age = Math.max(0, Math.min(1, (now - d.born) / 400));
  const rr = r * (0.4 + 0.6 * age);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.75;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
  g.addColorStop(0, 'rgba(240,250,255,0.95)');
  g.addColorStop(1, 'rgba(160,220,255,0.15)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, rr * 0.06);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + d.seed * 0.001;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * rr * 0.95, Math.sin(a) * rr * 0.95);
    ctx.moveTo(Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5);
    ctx.lineTo(Math.cos(a + 0.5) * rr * 0.7, Math.sin(a + 0.5) * rr * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}
