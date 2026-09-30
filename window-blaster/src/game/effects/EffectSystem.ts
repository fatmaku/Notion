import type { Rect, Vec2 } from '../../core/types';
import type { Rng } from '../../core/rng';
import { Particles } from './Particles';

export type BoxOf = (trackId: number) => Rect | null;

export interface Effect {
  /** 'under' = drawn beneath everything (patches, wrecks), 'over' = on top. */
  layer: 'under' | 'over';
  update(dt: number, now: number, boxOf: BoxOf): boolean;
  draw(ctx: CanvasRenderingContext2D, now: number, video: HTMLVideoElement): void;
}

const ease = (t: number) => 1 - (1 - t) * (1 - t);

/** Real-pixel patch that hides a vehicle by stretching the road/scenery from its sides over it. */
export class StretchFill implements Effect {
  layer = 'under' as const;
  private last: Rect;
  private lostAt = 0;
  private born: number;
  private readonly tmp = document.createElement('canvas');
  constructor(
    readonly trackId: number,
    box: Rect,
    now: number,
    private readonly maxLifeMs = 20000,
  ) {
    this.last = { ...box };
    this.born = now;
  }
  update(_dt: number, now: number, boxOf: BoxOf): boolean {
    const b = boxOf(this.trackId);
    if (b) {
      this.last = b;
      this.lostAt = 0;
    } else if (!this.lostAt) this.lostAt = now;
    if (this.lostAt && now - this.lostAt > 450) return false;
    return now - this.born < this.maxLifeMs;
  }
  draw(ctx: CanvasRenderingContext2D, now: number, video: HTMLVideoElement): void {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw) return;
    const b = this.last;
    const pad = 0.08;
    const x = Math.max(0, b.x - b.w * pad);
    const y = Math.max(0, b.y - b.h * pad);
    const w = Math.min(vw - x, b.w * (1 + 2 * pad));
    const h = Math.min(vh - y, b.h * (1 + 2 * pad));
    if (w < 4 || h < 4) return;
    const strip = Math.max(6, Math.min(40, w * 0.18));
    const lx = x - strip;
    const rx = x + w;
    const hasL = lx >= 0;
    const hasR = rx + strip <= vw;
    if (!hasL && !hasR) return;
    const t = this.tmp;
    const W = Math.max(2, Math.round(w));
    const H = Math.max(2, Math.round(h));
    if (t.width !== W || t.height !== H) {
      t.width = W;
      t.height = H;
    }
    const c = t.getContext('2d');
    if (!c) return;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    try {
      if (hasL) c.drawImage(video, lx, y, strip, h, 0, 0, W, H);
      if (hasR) {
        if (hasL) {
          const g = c.createLinearGradient(0, 0, W, 0);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(0,0,0,1)');
          // draw right strip through a gradient mask
          const m = document.createElement('canvas');
          m.width = W;
          m.height = H;
          const mc = m.getContext('2d')!;
          mc.drawImage(video, rx, y, strip, h, 0, 0, W, H);
          mc.globalCompositeOperation = 'destination-in';
          mc.fillStyle = g;
          mc.fillRect(0, 0, W, H);
          c.drawImage(m, 0, 0);
        } else c.drawImage(video, rx, y, strip, h, 0, 0, W, H);
      }
    } catch {
      return;
    }
    // feather edges
    c.globalCompositeOperation = 'destination-in';
    const fx = Math.max(2, W * 0.12);
    const fy = Math.max(2, H * 0.12);
    const gx = c.createLinearGradient(0, 0, W, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)');
    gx.addColorStop(fx / W, 'rgba(0,0,0,1)');
    gx.addColorStop(1 - fx / W, 'rgba(0,0,0,1)');
    gx.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gx;
    c.fillRect(0, 0, W, H);
    const gy = c.createLinearGradient(0, 0, 0, H);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(fy / H, 'rgba(0,0,0,1)');
    gy.addColorStop(1 - fy / H, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gy;
    c.fillRect(0, 0, W, H);
    const fade = this.lostAt ? Math.max(0, 1 - (now - this.lostAt) / 450) : 1;
    const fadeIn = Math.min(1, (now - this.born) / 250);
    ctx.globalAlpha = fade * fadeIn;
    ctx.drawImage(t, x, y, w, h);
    ctx.globalAlpha = 1;
  }
}

/** The vehicle's own pixels broken into tiles that fly apart. */
export class Shatter implements Effect {
  layer = 'over' as const;
  private tiles: { sx: number; sy: number; sw: number; sh: number; x: number; y: number; vx: number; vy: number; rot: number; vrot: number }[] = [];
  private readonly born: number;
  private readonly life = 1.0;
  constructor(
    private readonly snap: HTMLCanvasElement,
    box: Rect,
    center: Vec2,
    power: number,
    rng: Rng,
    now: number,
  ) {
    this.born = now;
    const cols = 4;
    const rows = 3;
    const sw = snap.width / cols;
    const sh = snap.height / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = box.x + (i + 0.5) * (box.w / cols);
        const y = box.y + (j + 0.5) * (box.h / rows);
        let dx = x - center.x;
        let dy = y - center.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const s = power * rng.range(0.5, 1.2);
        this.tiles.push({ sx: i * sw, sy: j * sh, sw, sh, x, y, vx: dx * s + rng.gauss(0, s * 0.2), vy: dy * s - s * 0.7 + rng.gauss(0, s * 0.2), rot: 0, vrot: rng.gauss(0, 7) });
      }
    }
  }
  update(dt: number, now: number): boolean {
    for (const t of this.tiles) {
      t.vy += 1500 * dt;
      t.vx *= 1 - 0.8 * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.rot += t.vrot * dt;
    }
    return (now - this.born) / 1000 < this.life;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const t = (now - this.born) / 1000 / this.life;
    ctx.globalAlpha = Math.max(0, 1 - t * t);
    const k = this.snap.width / (this.tiles[0]?.sw * 4 || 1);
    void k;
    for (const tile of this.tiles) {
      ctx.save();
      ctx.translate(tile.x, tile.y);
      ctx.rotate(tile.rot);
      const scale = 1 - t * 0.35;
      const w = tile.sw * scale;
      const h = tile.sh * scale;
      ctx.drawImage(this.snap, tile.sx, tile.sy, tile.sw, tile.sh, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/** Expanding fireball + shockwave ring + flash. */
export class Fireball implements Effect {
  layer = 'over' as const;
  private readonly born: number;
  constructor(
    private readonly at: Vec2,
    private readonly radius: number,
    now: number,
    private readonly lifeMs = 650,
  ) {
    this.born = now;
  }
  update(_dt: number, now: number): boolean {
    return now - this.born < this.lifeMs;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const t = Math.min(1, (now - this.born) / this.lifeMs);
    const r = this.radius * (0.3 + 0.7 * ease(t));
    const g = ctx.createRadialGradient(this.at.x, this.at.y, 0, this.at.x, this.at.y, r);
    g.addColorStop(0, `rgba(255,255,220,${(1 - t) * 0.95})`);
    g.addColorStop(0.35, `rgba(255,170,40,${(1 - t) * 0.9})`);
    g.addColorStop(0.7, `rgba(230,60,10,${(1 - t) * 0.6})`);
    g.addColorStop(1, 'rgba(60,20,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.at.x, this.at.y, r, 0, Math.PI * 2);
    ctx.fill();
    // shockwave ring
    ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.7})`;
    ctx.lineWidth = Math.max(1, 6 * (1 - t));
    ctx.beginPath();
    ctx.arc(this.at.x, this.at.y, this.radius * (0.5 + 1.1 * ease(t)), 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Burnt-out vehicle: darkened real pixels + smoke, following the track. */
export class Wreck implements Effect {
  layer = 'under' as const;
  private last: Rect;
  private lostAt = 0;
  private smokeAcc = 0;
  private readonly born: number;
  constructor(
    readonly trackId: number,
    private readonly snap: HTMLCanvasElement,
    box: Rect,
    now: number,
    private readonly particles: Particles,
    private readonly maxLifeMs = 20000,
  ) {
    this.last = { ...box };
    this.born = now;
  }
  update(dt: number, now: number, boxOf: BoxOf): boolean {
    const b = boxOf(this.trackId);
    if (b) {
      this.last = b;
      this.lostAt = 0;
    } else if (!this.lostAt) this.lostAt = now;
    if (this.lostAt && now - this.lostAt > 500) return false;
    this.smokeAcc += dt;
    const rate = 0.09;
    while (this.smokeAcc > rate) {
      this.smokeAcc -= rate;
      const b2 = this.last;
      this.particles.smoke({ x: b2.x + b2.w * (0.3 + Math.random() * 0.4), y: b2.y + b2.h * 0.25 }, 1, Math.max(6, b2.w * 0.09), b2.w * 0.1, 40 + b2.h * 0.3, 'rgba(40,40,40,0.5)');
      if (Math.random() < 0.5) this.particles.fire({ x: b2.x + b2.w * (0.3 + Math.random() * 0.4), y: b2.y + b2.h * 0.35 }, 1, Math.max(4, b2.w * 0.06));
    }
    return now - this.born < this.maxLifeMs;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const b = this.last;
    const fade = this.lostAt ? Math.max(0, 1 - (now - this.lostAt) / 500) : 1;
    ctx.globalAlpha = fade;
    ctx.save();
    try {
      ctx.filter = 'grayscale(1) brightness(0.35) contrast(1.2)';
    } catch {
      /* unsupported */
    }
    ctx.drawImage(this.snap, b.x - b.w * 0.04, b.y - b.h * 0.04, b.w * 1.08, b.h * 1.08);
    ctx.restore();
    ctx.globalAlpha = fade * 0.45;
    ctx.fillStyle = '#000';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
  }
}

/** Vehicle pixels sliding off sideways with a wobble (milkshake hit). */
export class Skid implements Effect {
  layer = 'over' as const;
  private readonly born: number;
  private smokeAcc = 0;
  constructor(
    private readonly snap: HTMLCanvasElement,
    private readonly box: Rect,
    private readonly dir: number,
    now: number,
    private readonly particles: Particles,
    private readonly lifeMs = 950,
  ) {
    this.born = now;
  }
  update(dt: number, now: number): boolean {
    this.smokeAcc += dt;
    const t = (now - this.born) / this.lifeMs;
    while (this.smokeAcc > 0.04 && t < 0.7) {
      this.smokeAcc -= 0.04;
      const b = this.box;
      const dx = this.dir * ease(t) * b.w * 1.6;
      this.particles.smoke({ x: b.x + dx + b.w * (this.dir > 0 ? 0.15 : 0.85), y: b.y + b.h * 0.95 }, 1, Math.max(5, b.w * 0.08), b.w * 0.08, 20, 'rgba(230,230,230,0.6)');
    }
    return t < 1;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const t = Math.min(1, (now - this.born) / this.lifeMs);
    const b = this.box;
    const dx = this.dir * ease(t) * b.w * 1.6;
    const rot = this.dir * Math.sin(t * Math.PI) * 0.35 + this.dir * t * 0.25;
    ctx.save();
    ctx.globalAlpha = 1 - t * t;
    ctx.translate(b.x + b.w / 2 + dx, b.y + b.h / 2 + Math.sin(t * 9) * 3);
    ctx.rotate(rot);
    ctx.drawImage(this.snap, -b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/** Vehicle shrinks and spins away into nothing (vanish). */
export class ShrinkVanish implements Effect {
  layer = 'over' as const;
  private readonly born: number;
  constructor(
    private readonly snap: HTMLCanvasElement,
    private readonly box: Rect,
    now: number,
    private readonly lifeMs = 520,
  ) {
    this.born = now;
  }
  update(_dt: number, now: number): boolean {
    return now - this.born < this.lifeMs;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const t = Math.min(1, (now - this.born) / this.lifeMs);
    const s = 1 - ease(t);
    const b = this.box;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2 - t * b.h * 0.4);
    ctx.rotate(t * 2.5);
    ctx.scale(s, s);
    ctx.drawImage(this.snap, -b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/** Rising score / message text. */
export class Popup implements Effect {
  layer = 'over' as const;
  private readonly born: number;
  constructor(
    private readonly text: string,
    private readonly at: Vec2,
    now: number,
    private readonly color = '#ffffff',
    private readonly size = 28,
    private readonly lifeMs = 900,
  ) {
    this.born = now;
  }
  update(_dt: number, now: number): boolean {
    return now - this.born < this.lifeMs;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const t = Math.min(1, (now - this.born) / this.lifeMs);
    const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - (t - 0.15) * 0.1;
    ctx.save();
    ctx.globalAlpha = 1 - t * t;
    ctx.translate(this.at.x, this.at.y - t * 60);
    ctx.scale(pop, pop);
    ctx.font = `900 ${this.size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(this.text, 0, 0);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

/** Small "X" at a bullet impact. */
export class Hitmarker implements Effect {
  layer = 'over' as const;
  private readonly born: number;
  constructor(
    private readonly at: Vec2,
    now: number,
    private readonly size = 12,
    private readonly color = '#fff',
  ) {
    this.born = now;
  }
  update(_dt: number, now: number): boolean {
    return now - this.born < 140;
  }
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const t = (now - this.born) / 140;
    const s = this.size * (1 + t * 0.6);
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ctx.moveTo(this.at.x + dx * s * 0.35, this.at.y + dy * s * 0.35);
      ctx.lineTo(this.at.x + dx * s, this.at.y + dy * s);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Container that owns particles and all effect instances. */
export class EffectSystem {
  readonly particles: Particles;
  private readonly under: Effect[] = [];
  private readonly over: Effect[] = [];
  constructor(rng: Rng) {
    this.particles = new Particles(rng);
  }
  add(e: Effect): void {
    (e.layer === 'under' ? this.under : this.over).push(e);
  }
  update(dt: number, now: number, boxOf: BoxOf): void {
    for (const list of [this.under, this.over]) {
      for (let i = list.length - 1; i >= 0; i--) if (!list[i].update(dt, now, boxOf)) list.splice(i, 1);
    }
    this.particles.update(dt);
  }
  drawUnder(ctx: CanvasRenderingContext2D, now: number, video: HTMLVideoElement): void {
    for (const e of this.under) e.draw(ctx, now, video);
  }
  drawOver(ctx: CanvasRenderingContext2D, now: number, video: HTMLVideoElement): void {
    this.particles.draw(ctx);
    for (const e of this.over) e.draw(ctx, now, video);
  }
  get count(): number {
    return this.under.length + this.over.length + this.particles.items.length;
  }
  clear(): void {
    this.under.length = 0;
    this.over.length = 0;
    this.particles.clear();
  }
}
