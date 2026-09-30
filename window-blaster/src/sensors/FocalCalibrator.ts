import { median } from '../core/math/filters';

/**
 * Estimates the camera focal length in px/rad online by comparing gyro pan
 * increments with the measured horizontal shift of the tracked window, and
 * detects an inverted axis (negative ratio).
 */
export class FocalCalibrator {
  private ratios: number[] = [];
  private signVotes = 0;
  constructor(
    public f: number,
    private readonly minF: number,
    private readonly maxF: number,
    private readonly minAngle = 0.012,
    private readonly maxSamples = 40,
  ) {}

  /** @param dAngle gyro increment (rad) @param dPixels measured shift (px) over the same interval */
  addPair(dAngle: number, dPixels: number): void {
    if (Math.abs(dAngle) < this.minAngle) return;
    const r = dPixels / dAngle;
    this.signVotes = Math.max(-12, Math.min(12, this.signVotes + (r < 0 ? -1 : 1)));
    this.ratios.push(Math.abs(r));
    if (this.ratios.length > this.maxSamples) this.ratios.shift();
    if (this.ratios.length >= 6) {
      const m = median(this.ratios);
      if (Number.isFinite(m)) this.f = Math.min(this.maxF, Math.max(this.minF, m));
    }
  }

  /** +1 normal, -1 inverted axis, 0 undecided */
  get sign(): number {
    return this.signVotes >= 4 ? 1 : this.signVotes <= -4 ? -1 : 0;
  }

  get samples(): number {
    return this.ratios.length;
  }

  get confidence(): number {
    return Math.min(1, this.ratios.length / 15);
  }

  reset(f: number): void {
    this.f = f;
    this.ratios = [];
    this.signVotes = 0;
  }
}
