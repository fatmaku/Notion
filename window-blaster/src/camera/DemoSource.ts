import type { Quad, Rect, TargetClass } from '../core/types';
import { Rng } from '../core/rng';
import type { FrameSource } from './FrameSource';

export type DemoKind = 'car' | 'truck' | 'bus' | 'sign' | 'tree' | 'light';

export interface DemoObject {
  id: number;
  kind: DemoKind;
  cls: TargetClass;
  /** Ground-truth box in video px (what a perfect detector would report). */
  box: Rect;
  /** Velocity in px/s. */
  vx: number;
  vy: number;
  depth: number;
  color: string;
  lane: number;
  /** Detectable by a COCO-style detector? Trees are not. */
  detectable: boolean;
}

export interface DemoOptions {
  mode: 'front' | 'side';
  seed?: number;
  width?: number;
  height?: number;
  /** World speed multiplier. */
  speed?: number;
  /** Spawn density multiplier. */
  density?: number;
  night?: boolean;
  /** Simulated hand shake (px amplitude) applied to the whole frame. */
  shake?: number;
  /** Side mode: +1 = world flows left→right (right-hand window), -1 = right→left. */
  dir?: 1 | -1;
  fps?: number;
}

const KIND_CLASS: Record<DemoKind, TargetClass> = {
  car: 'car',
  truck: 'truck',
  bus: 'bus',
  sign: 'sign',
  tree: 'other',
  light: 'light',
};

const PALETTE = ['#c8312f', '#2d6cdf', '#e5e7eb', '#1f2937', '#9ca3af', '#f59e0b', '#10b981', '#7c3aed', '#f3f4f6', '#374151'];

/**
 * Synthetic "looking out of a vehicle window" scene rendered to a canvas and
 * exposed as a MediaStream-backed <video>, so the whole pipeline (detector
 * scheduler, tracker, effects, HUD) runs identically to the real camera.
 */
export class DemoSource implements FrameSource {
  readonly kind = 'demo' as const;
  readonly width: number;
  readonly height: number;
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rng: Rng;
  private readonly opts: Required<DemoOptions>;
  private objects: DemoObject[] = [];
  private nextId = 1;
  private raf = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tStart = 0;
  private tLast = 0;
  private spawnIn = 0;
  private stream: MediaStream | null = null;
  private endedCbs = new Set<() => void>();
  /** Current global frame offset from simulated hand shake. */
  shakeOffset = { x: 0, y: 0 };
  readonly horizonY: number;

  constructor(
    readonly video: HTMLVideoElement,
    options: DemoOptions,
  ) {
    this.opts = {
      mode: options.mode,
      seed: options.seed ?? 42,
      width: options.width ?? 1280,
      height: options.height ?? 720,
      speed: options.speed ?? 1,
      density: options.density ?? 1,
      night: options.night ?? false,
      shake: options.shake ?? 6,
      dir: options.dir ?? 1,
      fps: options.fps ?? 30,
    };
    this.width = this.opts.width;
    this.height = this.opts.height;
    this.rng = new Rng(this.opts.seed);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.horizonY = this.opts.mode === 'front' ? 330 : 380;
    this.spawnIn = 0.2;
    if (this.opts.mode === 'front') this.seedFront();
  }

  /** The true window quad of the scene (before shake offset). */
  windowQuad(): Quad {
    const o = this.shakeOffset;
    const q: Quad =
      this.opts.mode === 'front'
        ? [
            { x: 140, y: 80 },
            { x: 1140, y: 80 },
            { x: 1200, y: 600 },
            { x: 80, y: 600 },
          ]
        : [
            { x: 220, y: 110 },
            { x: 1080, y: 100 },
            { x: 1100, y: 620 },
            { x: 200, y: 640 },
          ];
    return q.map((p) => ({ x: p.x + o.x, y: p.y + o.y })) as Quad;
  }

  truth(): DemoObject[] {
    return this.objects;
  }

  async start(): Promise<void> {
    this.tStart = performance.now();
    this.tLast = this.tStart;
    this.draw(this.tStart);
    if (typeof this.canvas.captureStream !== 'function') throw new Error('captureStream unsupported');
    this.stream = this.canvas.captureStream(this.opts.fps);
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play().catch(() => undefined);
    const minDt = 1000 / this.opts.fps - 2;
    let lastDraw = 0;
    let lastRafAt = 0;
    const tick = (t: number) => {
      lastRafAt = t;
      if (t - lastDraw >= minDt) {
        lastDraw = t;
        this.draw(t);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    // Background tabs (and headsets during a WebXR session) stop window rAF; the timer then draws every tick.
    this.timer = setInterval(() => {
      const now = performance.now();
      if (document.hidden || now - lastRafAt > 3 * (1000 / this.opts.fps)) {
        lastDraw = now;
        this.draw(now);
      }
    }, 1000 / this.opts.fps);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video.srcObject) this.video.srcObject = null;
    for (const cb of this.endedCbs) cb();
  }

  onEnded(cb: () => void): () => void {
    this.endedCbs.add(cb);
    return () => this.endedCbs.delete(cb);
  }

  // ---------------------------------------------------------------- simulation

  private seedFront(): void {
    for (const lane of [-1, 0, 1]) {
      if (this.rng.chance(0.75)) this.objects.push(this.makeFrontCar(lane, this.rng.range(0.3, 0.8)));
    }
  }

  private makeFrontCar(lane: number, s: number): DemoObject {
    const kind: DemoKind = this.rng.chance(0.18) ? 'truck' : this.rng.chance(0.08) ? 'bus' : 'car';
    const o: DemoObject = {
      id: this.nextId++,
      kind,
      cls: KIND_CLASS[kind],
      box: { x: 0, y: 0, w: 0, h: 0 },
      vx: 0,
      vy: 0,
      depth: s,
      color: this.rng.pick(PALETTE),
      lane,
      detectable: true,
    };
    this.layoutFront(o);
    return o;
  }

  private layoutFront(o: DemoObject): void {
    const s = o.depth;
    const dims = o.kind === 'truck' ? [300, 330] : o.kind === 'bus' ? [320, 340] : [340, 240];
    const w = dims[0] * s;
    const h = dims[1] * s;
    const cx = 640 + o.lane * 230 * s;
    const bottom = this.horizonY + 300 * s;
    o.box = { x: cx - w / 2, y: bottom - h, w, h };
  }

  private spawnSide(): void {
    const r = this.rng.next();
    const kind: DemoKind = r < 0.42 ? 'car' : r < 0.54 ? 'truck' : r < 0.6 ? 'bus' : r < 0.75 ? 'sign' : r < 0.92 ? 'tree' : 'light';
    const depth = kind === 'tree' || kind === 'sign' || kind === 'light' ? this.rng.range(0.75, 1) : this.rng.range(0.45, 1);
    const groundY = this.horizonY + 200 * depth;
    const dims: Record<DemoKind, [number, number]> = {
      car: [330, 130],
      truck: [520, 200],
      bus: [600, 210],
      sign: [56, 56],
      tree: [140, 260],
      light: [40, 100],
    };
    const [bw, bh] = dims[kind];
    const w = bw * depth;
    const h = bh * depth;
    const speed = 520 * this.opts.speed * depth;
    const dir = this.opts.dir;
    const x = dir > 0 ? -w - 10 : this.width + 10;
    let y = groundY - h;
    if (kind === 'sign') y = groundY - 150 * depth - h;
    if (kind === 'light') y = groundY - 220 * depth - h;
    this.objects.push({
      id: this.nextId++,
      kind,
      cls: KIND_CLASS[kind],
      box: { x, y, w, h },
      vx: speed * dir,
      vy: 0,
      depth,
      color: this.rng.pick(PALETTE),
      lane: 0,
      detectable: kind !== 'tree',
    });
  }

  private step(dt: number): void {
    const t = (performance.now() - this.tStart) / 1000;
    // simulated hand shake: slow drift + small tremor
    const a = this.opts.shake;
    this.shakeOffset = {
      x: a * (Math.sin(t * 0.9) * 0.8 + Math.sin(t * 5.3) * 0.2),
      y: a * (Math.cos(t * 0.7) * 0.8 + Math.sin(t * 6.1) * 0.2),
    };
    if (this.opts.mode === 'side') {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawnSide();
        this.spawnIn = this.rng.range(0.5, 1.6) / this.opts.density;
      }
      for (const o of this.objects) o.box.x += o.vx * dt;
      this.objects = this.objects.filter((o) => o.box.x + o.box.w > -60 && o.box.x < this.width + 60);
    } else {
      for (const o of this.objects) {
        if (o.lane <= -2) {
          // oncoming traffic: grows quickly and passes on the left
          o.depth += 0.55 * this.opts.speed * dt * (0.3 + o.depth);
        } else if (o.lane >= 2) {
          o.depth += 0.5 * this.opts.speed * dt * (0.3 + o.depth);
        } else {
          // cars ahead: gentle random walk in depth, occasional lane drift
          o.depth += this.rng.gauss(0, 0.012) * this.opts.speed;
          if (o.depth < 0.22) o.depth = 0.22;
          if (o.depth > 0.95) o.depth = 0.95;
        }
        this.layoutFront(o);
      }
      this.objects = this.objects.filter((o) => o.depth < 1.6);
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawnIn = this.rng.range(1.2, 3) / this.opts.density;
        const r = this.rng.next();
        if (r < 0.45) {
          const o = this.makeFrontCar(-2.2, 0.12);
          this.objects.push(o);
        } else if (r < 0.75) {
          const ahead = this.objects.filter((o) => Math.abs(o.lane) <= 1);
          if (ahead.length < 4) this.objects.push(this.makeFrontCar(this.rng.int(-1, 1), 0.2));
        } else {
          const kind: DemoKind = r < 0.88 ? 'sign' : 'tree';
          const o: DemoObject = {
            id: this.nextId++,
            kind,
            cls: KIND_CLASS[kind],
            box: { x: 0, y: 0, w: 0, h: 0 },
            vx: 0,
            vy: 0,
            depth: 0.12,
            color: '#c8312f',
            lane: this.rng.chance(0.5) ? 2.6 : -2.6,
            detectable: kind !== 'tree',
          };
          this.objects.push(o);
        }
      }
      for (const o of this.objects) {
        if (Math.abs(o.lane) > 2 && (o.kind === 'sign' || o.kind === 'tree')) {
          const s = o.depth;
          const w = (o.kind === 'sign' ? 60 : 160) * s;
          const h = (o.kind === 'sign' ? 60 : 300) * s;
          const cx = 640 + o.lane * 230 * s;
          const bottom = this.horizonY + 300 * s - (o.kind === 'sign' ? 170 * s : 0);
          o.box = { x: cx - w / 2, y: bottom - h, w, h };
        }
      }
    }
  }

  // ------------------------------------------------------------------- drawing

  private draw(now: number): void {
    const dt = Math.min(0.1, Math.max(0, (now - this.tLast) / 1000));
    this.tLast = now;
    this.step(dt);
    const { ctx } = this;
    const W = this.width;
    const H = this.height;
    const night = this.opts.night;
    const o = this.shakeOffset;

    // interior
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, night ? '#2a2d33' : '#15181d');
    g.addColorStop(1, night ? '#1a1c20' : '#0b0d10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(o.x, o.y);
    // door / dashboard details
    ctx.fillStyle = night ? '#33363c' : '#1d2026';
    if (this.opts.mode === 'front') {
      ctx.fillRect(-40, 600, W + 80, 200);
      ctx.fillStyle = '#0f1114';
      ctx.fillRect(300, 640, 680, 60);
    } else {
      ctx.fillRect(-40, 640, W + 80, 200);
      ctx.fillStyle = '#0f1114';
      ctx.fillRect(1120, 300, 120, 60);
    }

    // outside, clipped to the window
    const q = this.windowQuad().map((p) => ({ x: p.x - o.x, y: p.y - o.y }));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y);
    ctx.closePath();
    ctx.clip();
    this.drawOutside();
    ctx.restore();

    // subtle window frame / reflection line
    ctx.strokeStyle = night ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawOutside(): void {
    const { ctx } = this;
    const W = this.width;
    const H = this.height;
    const night = this.opts.night;
    const hy = this.horizonY;
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, night ? '#0b1020' : '#7fb8ff');
    sky.addColorStop(1, night ? '#1b2440' : '#e6f2ff');
    ctx.fillStyle = sky;
    ctx.fillRect(-100, -100, W + 200, hy + 100);
    // distant hills
    ctx.fillStyle = night ? '#182238' : '#a7c7a0';
    ctx.beginPath();
    ctx.moveTo(-100, hy);
    for (let x = -100; x <= W + 100; x += 40) ctx.lineTo(x, hy - 25 - 20 * Math.sin(x / 130) - 10 * Math.sin(x / 47));
    ctx.lineTo(W + 100, hy);
    ctx.closePath();
    ctx.fill();
    // ground
    ctx.fillStyle = night ? '#141a14' : '#6f9a5a';
    ctx.fillRect(-100, hy, W + 200, H - hy + 100);
    const t = (performance.now() - this.tStart) / 1000;
    if (this.opts.mode === 'front') {
      // road trapezoid converging to the vanishing point
      ctx.fillStyle = night ? '#23262b' : '#5b5f66';
      ctx.beginPath();
      ctx.moveTo(640 - 60, hy);
      ctx.lineTo(640 + 60, hy);
      ctx.lineTo(640 + 900, H + 100);
      ctx.lineTo(640 - 900, H + 100);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = night ? '#9a9a7a' : '#e5e0c0';
      ctx.lineWidth = 3;
      for (const lane of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
          const phase = ((i + t * 1.6 * this.opts.speed) % 12) / 12;
          const s0 = 0.05 + phase * phase * 1.4;
          const s1 = s0 + 0.04 + phase * 0.05;
          ctx.beginPath();
          ctx.moveTo(640 + lane * 115 * s0, hy + 300 * s0);
          ctx.lineTo(640 + lane * 115 * s1, hy + 300 * s1);
          ctx.stroke();
        }
      }
    } else {
      // side road strip
      ctx.fillStyle = night ? '#23262b' : '#5b5f66';
      ctx.fillRect(-100, hy + 130, W + 200, 160);
      ctx.strokeStyle = night ? '#9a9a7a' : '#e5e0c0';
      ctx.lineWidth = 4;
      ctx.setLineDash([60, 50]);
      ctx.lineDashOffset = -((t * 520 * this.opts.speed * this.opts.dir) % 110);
      ctx.beginPath();
      ctx.moveTo(-100, hy + 210);
      ctx.lineTo(W + 100, hy + 210);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // objects back-to-front
    const sorted = [...this.objects].sort((a, b) => a.depth - b.depth);
    for (const o of sorted) this.drawObject(o);
  }

  private drawObject(o: DemoObject): void {
    const { ctx } = this;
    const b = o.box;
    const night = this.opts.night;
    const side = this.opts.mode === 'side' || Math.abs(o.lane) >= 2;
    switch (o.kind) {
      case 'car':
      case 'truck':
      case 'bus': {
        const wheelR = Math.max(3, b.h * (side ? 0.16 : 0.12));
        ctx.fillStyle = '#111';
        if (side) {
          ctx.beginPath();
          ctx.arc(b.x + b.w * 0.22, b.y + b.h - wheelR, wheelR, 0, Math.PI * 2);
          ctx.arc(b.x + b.w * 0.78, b.y + b.h - wheelR, wheelR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(b.x + b.w * 0.05, b.y + b.h - wheelR * 1.4, b.w * 0.16, wheelR * 1.4);
          ctx.fillRect(b.x + b.w * 0.79, b.y + b.h - wheelR * 1.4, b.w * 0.16, wheelR * 1.4);
        }
        ctx.fillStyle = o.color;
        const bodyTop = o.kind === 'car' ? b.y + b.h * 0.35 : b.y + b.h * 0.08;
        roundRect(ctx, b.x, bodyTop, b.w, b.y + b.h - wheelR * 0.9 - bodyTop, b.h * 0.08);
        ctx.fill();
        if (o.kind === 'car') {
          // cabin
          ctx.fillStyle = o.color;
          roundRect(ctx, b.x + b.w * (side ? 0.22 : 0.12), b.y, b.w * (side ? 0.5 : 0.76), b.h * 0.4, b.h * 0.1);
          ctx.fill();
          ctx.fillStyle = night ? '#4a5568' : '#bfe3ff';
          roundRect(ctx, b.x + b.w * (side ? 0.26 : 0.16), b.y + b.h * 0.05, b.w * (side ? 0.42 : 0.68), b.h * 0.28, b.h * 0.05);
          ctx.fill();
        } else {
          ctx.fillStyle = night ? '#4a5568' : '#bfe3ff';
          const n = o.kind === 'bus' ? 5 : 1;
          for (let i = 0; i < n; i++) {
            const ww = (b.w * 0.8) / n;
            ctx.fillRect(b.x + b.w * 0.1 + i * ww + ww * 0.1, b.y + b.h * 0.15, ww * 0.8, b.h * 0.25);
          }
        }
        // lights
        ctx.fillStyle = night ? '#ff5a5a' : '#e11d48';
        if (!side) {
          ctx.fillRect(b.x + b.w * 0.06, b.y + b.h * 0.62, b.w * 0.14, b.h * 0.08);
          ctx.fillRect(b.x + b.w * 0.8, b.y + b.h * 0.62, b.w * 0.14, b.h * 0.08);
        }
        break;
      }
      case 'sign': {
        ctx.fillStyle = '#8a8f98';
        ctx.fillRect(b.x + b.w / 2 - 3, b.y + b.h, 6, 150 * o.depth);
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.42, b.w * 0.6, b.h * 0.16);
        break;
      }
      case 'light': {
        ctx.fillStyle = '#8a8f98';
        ctx.fillRect(b.x + b.w / 2 - 3, b.y + b.h, 6, 220 * o.depth);
        ctx.fillStyle = '#222';
        roundRect(ctx, b.x, b.y, b.w, b.h, b.w * 0.2);
        ctx.fill();
        const cols = ['#ef4444', '#f59e0b', '#22c55e'];
        cols.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, b.y + b.h * (0.2 + i * 0.3), b.w * 0.28, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case 'tree': {
        ctx.fillStyle = '#5b3a1e';
        ctx.fillRect(b.x + b.w * 0.42, b.y + b.h * 0.45, b.w * 0.16, b.h * 0.55);
        ctx.fillStyle = night ? '#173d1f' : '#2f8f3a';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h * 0.32, b.w * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
