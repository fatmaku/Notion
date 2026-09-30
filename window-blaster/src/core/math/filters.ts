// Signal filters used for jitter-free tracking.

/** Exponential moving average. */
export class Ema {
  private v: number | null = null;
  constructor(private readonly alpha: number) {}
  push(x: number): number {
    this.v = this.v === null ? x : this.v + this.alpha * (x - this.v);
    return this.v;
  }
  get value(): number | null {
    return this.v;
  }
  reset(): void {
    this.v = null;
  }
}

class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  get last(): number | null {
    return this.y;
  }
  reset(): void {
    this.y = null;
  }
}

/**
 * One-Euro filter (Casiez et al. 2012): adaptive low-pass that suppresses jitter
 * at low speed while keeping latency low for fast motion.
 */
export class OneEuro {
  private readonly x = new LowPass();
  private readonly dx = new LowPass();
  private tPrev: number | null = null;
  constructor(
    public minCutoff = 1.0,
    public beta = 0.0,
    public dCutoff = 1.0,
  ) {}

  private static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** @param t time in seconds */
  filter(value: number, t: number): number {
    if (this.tPrev === null) {
      this.tPrev = t;
      this.dx.filter(0, 1);
      return this.x.filter(value, 1);
    }
    const dt = Math.max(1e-4, t - this.tPrev);
    this.tPrev = t;
    const prev = this.x.last ?? value;
    const rate = (value - prev) / dt;
    const edx = this.dx.filter(rate, OneEuro.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, OneEuro.alpha(cutoff, dt));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.tPrev = null;
  }
}

/** One-Euro on a 2-D point. */
export class OneEuro2 {
  private readonly fx: OneEuro;
  private readonly fy: OneEuro;
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.fx = new OneEuro(minCutoff, beta, dCutoff);
    this.fy = new OneEuro(minCutoff, beta, dCutoff);
  }
  filter(x: number, y: number, t: number): { x: number; y: number } {
    return { x: this.fx.filter(x, t), y: this.fy.filter(y, t) };
  }
  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}

/** Median of a numeric array (copy, non-destructive). */
export function median(values: readonly number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
