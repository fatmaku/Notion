import type { Vec2 } from '../../core/types';

/** Camera shake with exponential decay; sampled per frame as a pixel offset. */
export class Shake {
  private amp = 0;
  private t = 0;
  add(amount: number): void {
    this.amp = Math.min(40, this.amp + amount);
  }
  update(dt: number): void {
    this.t += dt;
    this.amp *= Math.max(0, 1 - 6 * dt);
    if (this.amp < 0.05) this.amp = 0;
  }
  offset(): Vec2 {
    if (this.amp <= 0) return { x: 0, y: 0 };
    return { x: Math.sin(this.t * 61) * this.amp, y: Math.cos(this.t * 47) * this.amp * 0.7 };
  }
}

/** Hit-stop: briefly slows game time for punchy impacts. */
export class HitStop {
  private until = 0;
  trigger(now: number, ms: number): void {
    if (ms > 0) this.until = Math.max(this.until, now + ms);
  }
  scale(now: number): number {
    return now < this.until ? 0.08 : 1;
  }
}
