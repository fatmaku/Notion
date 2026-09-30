import type { Rect } from '../../core/types';

export interface RunnerParams {
  /** Runner height in video px. */
  R: number;
  gravity: number; // px/s² (positive = down)
  jumpV: number; // px/s
  coyoteMs: number;
  bufferMs: number;
}

export function defaultParams(R: number): RunnerParams {
  // apex ≈ 2.0 R, air time ≈ 0.8 s independent of window size
  const gravity = 25 * R;
  const jumpV = Math.sqrt(2 * gravity * 2.0 * R);
  return { R, gravity, jumpV, coyoteMs: 90, bufferMs: 120 };
}

/**
 * Vertical runner physics in "height above ground" space (h ≥ 0 is up).
 * Supports coyote time, jump buffering, variable jump height and landing on
 * platforms (roofs of long vehicles).
 */
export class RunnerPhysics {
  /** feet height above the ground line (px) */
  h = 0;
  /** vertical speed, positive = up */
  vy = 0;
  grounded = true;
  platform: number | null = null;
  ducking = false;
  private lastGroundedAt = 0;
  private bufferedAt = -Infinity;
  private rising = false;
  jumps = 0;

  constructor(public p: RunnerParams) {}

  jumpPress(now: number): void {
    this.bufferedAt = now;
    this.tryJump(now);
  }

  jumpRelease(): void {
    if (this.rising && this.vy > 0) this.vy *= 0.45;
    this.rising = false;
  }

  duck(on: boolean): void {
    this.ducking = on;
  }

  private tryJump(now: number): boolean {
    const canJump = this.grounded || now - this.lastGroundedAt <= this.p.coyoteMs;
    if (!canJump || now - this.bufferedAt > this.p.bufferMs) return false;
    this.vy = this.p.jumpV;
    this.grounded = false;
    this.platform = null;
    this.rising = true;
    this.bufferedAt = -Infinity;
    this.jumps++;
    return true;
  }

  /**
   * @param platformTop height of a platform under the runner's feet (px above ground) or null
   */
  step(dt: number, now: number, platformTop: number | null): void {
    if (this.grounded) {
      this.lastGroundedAt = now;
      // platform vanished / ended underneath us → fall
      if (this.platform !== null && (platformTop === null || Math.abs(platformTop - this.platform) > this.p.R * 0.5)) {
        this.grounded = false;
        this.platform = null;
      } else if (this.platform !== null && platformTop !== null) this.h = this.platform = platformTop;
      else if (this.platform === null && platformTop !== null && platformTop <= this.p.R * 0.35) {
        // low step: walk up onto it
        this.h = this.platform = platformTop;
      }
      if (this.grounded) {
        this.tryJump(now);
        return;
      }
    }
    const prevH = this.h;
    this.vy -= this.p.gravity * dt;
    this.h += this.vy * dt;
    if (this.vy <= 0) this.rising = false;
    // landing on platform (falling through its top surface)
    if (platformTop !== null && this.vy <= 0 && prevH >= platformTop - 2 && this.h <= platformTop) {
      this.h = platformTop;
      this.vy = 0;
      this.grounded = true;
      this.platform = platformTop;
      this.lastGroundedAt = now;
      this.tryJump(now);
      return;
    }
    if (this.h <= 0) {
      this.h = 0;
      this.vy = 0;
      this.grounded = true;
      this.platform = null;
      this.lastGroundedAt = now;
      this.tryJump(now);
    }
  }

  /** Body rect in video px given the runner's x (center) and the ground y at that x. */
  rect(x: number, groundY: number): Rect {
    const R = this.p.R;
    const hgt = this.ducking && this.grounded ? R * 0.55 : R;
    const w = R * 0.5;
    const feetY = groundY - this.h;
    return { x: x - w / 2, y: feetY - hgt, w, h: hgt };
  }

  reset(): void {
    this.h = 0;
    this.vy = 0;
    this.grounded = true;
    this.platform = null;
    this.ducking = false;
    this.rising = false;
  }
}
