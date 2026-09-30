import type { Vec2 } from '../../core/types';
import type { Rng } from '../../core/rng';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  gravity: number;
  drag: number;
  color: string;
  kind: 'dot' | 'smoke' | 'spark' | 'drop' | 'shard';
  rot: number;
  vrot: number;
  alpha: number;
}

/** Simple pooled particle system drawn in video px. */
export class Particles {
  readonly items: Particle[] = [];
  constructor(
    private readonly rng: Rng,
    readonly cap = 900,
  ) {}

  private push(p: Particle): void {
    if (this.items.length >= this.cap) this.items.shift();
    this.items.push(p);
  }

  sparks(at: Vec2, n: number, speed: number, colors = ['#ffd166', '#ff9f1c', '#ffffff']): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(speed * 0.3, speed);
      this.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.2,
        life: 0,
        max: this.rng.range(0.25, 0.6),
        size: this.rng.range(2, 5),
        grow: 0,
        gravity: 900,
        drag: 1.5,
        color: this.rng.pick(colors),
        kind: 'spark',
        rot: 0,
        vrot: 0,
        alpha: 1,
      });
    }
  }

  smoke(at: Vec2, n: number, size: number, spread: number, rise = 60, color = 'rgba(70,70,70,0.55)'): void {
    for (let i = 0; i < n; i++) {
      this.push({
        x: at.x + this.rng.gauss(0, spread),
        y: at.y + this.rng.gauss(0, spread * 0.5),
        vx: this.rng.gauss(0, 25),
        vy: -rise + this.rng.gauss(0, 15),
        life: 0,
        max: this.rng.range(0.8, 1.8),
        size: size * this.rng.range(0.6, 1.2),
        grow: size * 0.9,
        gravity: -20,
        drag: 0.8,
        color,
        kind: 'smoke',
        rot: this.rng.range(0, 6.28),
        vrot: this.rng.gauss(0, 0.6),
        alpha: 0.7,
      });
    }
  }

  fire(at: Vec2, n: number, size: number): void {
    for (let i = 0; i < n; i++) {
      this.push({
        x: at.x + this.rng.gauss(0, size * 0.4),
        y: at.y + this.rng.gauss(0, size * 0.3),
        vx: this.rng.gauss(0, 40),
        vy: -this.rng.range(60, 160),
        life: 0,
        max: this.rng.range(0.25, 0.6),
        size: size * this.rng.range(0.4, 1),
        grow: -size * 0.5,
        gravity: -100,
        drag: 1,
        color: this.rng.pick(['#ff6a00', '#ffb020', '#ff3b00', '#ffe066']),
        kind: 'dot',
        rot: 0,
        vrot: 0,
        alpha: 0.95,
      });
    }
  }

  drops(at: Vec2, n: number, speed: number, colors: string[]): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(-Math.PI, 0);
      const s = this.rng.range(speed * 0.2, speed);
      this.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: this.rng.range(0.4, 0.9),
        size: this.rng.range(3, 9),
        grow: 0,
        gravity: 1300,
        drag: 0.5,
        color: this.rng.pick(colors),
        kind: 'drop',
        rot: 0,
        vrot: 0,
        alpha: 1,
      });
    }
  }

  debris(at: Vec2, n: number, speed: number, color = '#333'): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(speed * 0.2, speed);
      this.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.5,
        life: 0,
        max: this.rng.range(0.6, 1.3),
        size: this.rng.range(3, 10),
        grow: 0,
        gravity: 1100,
        drag: 0.6,
        color,
        kind: 'shard',
        rot: this.rng.range(0, 6.28),
        vrot: this.rng.gauss(0, 8),
        alpha: 1,
      });
    }
  }

  update(dt: number): void {
    const arr = this.items;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life += dt;
      if (p.life >= p.max) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        continue;
      }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size = Math.max(0.5, p.size + p.grow * dt);
      p.rot += p.vrot * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const t = p.life / p.max;
      const a = p.alpha * (p.kind === 'smoke' ? (1 - t) * (1 - t) : 1 - t * t);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      switch (p.kind) {
        case 'smoke':
        case 'dot':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
          ctx.stroke();
          break;
        }
        case 'drop':
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'shard':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.items.length = 0;
  }
}
