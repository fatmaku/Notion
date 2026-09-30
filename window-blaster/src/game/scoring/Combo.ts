/** Combo meter: fractional increments, decays after a quiet window. */
export class Combo {
  private acc = 0;
  private lastAt = -Infinity;
  max = 0;
  constructor(public windowMs = 2500) {}

  get value(): number {
    return Math.floor(this.acc);
  }

  bump(weight: number, now: number): number {
    if (now - this.lastAt > this.windowMs) this.acc = 0;
    this.acc += weight;
    this.lastAt = now;
    if (this.value > this.max) this.max = this.value;
    return this.value;
  }

  /** Keeps the combo alive without increasing it (e.g. SMG chip damage). */
  touch(now: number): void {
    if (now - this.lastAt <= this.windowMs) this.lastAt = now;
  }

  update(now: number): void {
    if (this.acc > 0 && now - this.lastAt > this.windowMs) this.acc = 0;
  }

  break(): void {
    this.acc = 0;
  }

  /** 0..1 fraction of the window remaining. */
  timeLeft(now: number): number {
    if (this.acc <= 0) return 0;
    return Math.max(0, 1 - (now - this.lastAt) / this.windowMs);
  }
}
