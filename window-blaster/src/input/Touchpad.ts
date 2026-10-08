/**
 * The phone as a touchpad (for display glasses, where you look at the glasses, not at the phone):
 *
 * - drag with one finger      → move the crosshair (relative, like a laptop touchpad)
 * - quick tap                 → one shot at the crosshair
 * - touch and hold still      → keep firing (rockets: lock on) until you lift the finger;
 *                               dragging while holding keeps firing and aims
 * - second finger down        → fire while it stays down (the first finger keeps aiming)
 *
 * Pure state machine (no DOM, unit-tested). Coordinates are CSS px, times ms.
 */
export type PadCmd = { kind: 'move'; dx: number; dy: number } | { kind: 'fireDown' } | { kind: 'fireUp' } | { kind: 'tap' };

export const TAP_MS = 260;
export const HOLD_MS = 320;
export const SLOP_PX = 10;

export class Touchpad {
  /** Pointer speed multiplier (CSS px of cursor per CSS px of finger). */
  gain = 1.6;
  private aimId: number | null = null;
  private last = { x: 0, y: 0 };
  private downAt = 0;
  private travel = 0;
  /** 'aim' finger turned into a fire-hold finger */
  private holdFiring = false;
  private fireId: number | null = null;

  get firing(): boolean {
    return this.holdFiring || this.fireId !== null;
  }

  down(id: number, x: number, y: number, t: number): PadCmd[] {
    if (this.aimId === null) {
      this.aimId = id;
      this.last = { x, y };
      this.downAt = t;
      this.travel = 0;
      this.holdFiring = false;
      return [];
    }
    if (this.fireId === null && id !== this.aimId) {
      this.fireId = id;
      return this.holdFiring ? [] : [{ kind: 'fireDown' }];
    }
    return [];
  }

  move(id: number, x: number, y: number, t: number): PadCmd[] {
    const out = this.tick(t);
    if (id !== this.aimId) return out;
    const dx = x - this.last.x;
    const dy = y - this.last.y;
    this.last = { x, y };
    this.travel += Math.hypot(dx, dy);
    if (dx || dy) out.push({ kind: 'move', dx: dx * this.gain, dy: dy * this.gain });
    return out;
  }

  /** Call every frame: turns a still, held finger into continuous fire. */
  tick(t: number): PadCmd[] {
    if (this.aimId !== null && !this.holdFiring && this.travel < SLOP_PX && t - this.downAt >= HOLD_MS) {
      this.holdFiring = true;
      return this.fireId === null ? [{ kind: 'fireDown' }] : [];
    }
    return [];
  }

  up(id: number, t: number): PadCmd[] {
    if (id === this.fireId) {
      this.fireId = null;
      return this.holdFiring ? [] : [{ kind: 'fireUp' }];
    }
    if (id !== this.aimId) return [];
    this.aimId = null;
    if (this.holdFiring) {
      this.holdFiring = false;
      return this.fireId === null ? [{ kind: 'fireUp' }] : [];
    }
    return this.travel < SLOP_PX && t - this.downAt < TAP_MS && this.fireId === null ? [{ kind: 'tap' }] : [];
  }

  cancel(): PadCmd[] {
    const wasFiring = this.firing;
    this.aimId = null;
    this.fireId = null;
    this.holdFiring = false;
    return wasFiring ? [{ kind: 'fireUp' }] : [];
  }
}
