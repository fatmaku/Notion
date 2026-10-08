import type { Rng } from '../../core/rng';
import type { Vec2 } from '../../core/types';

export type PowerUpKind = 'magnet' | 'shield' | 'double';

export interface PowerUpPickup {
  id: string;
  kind: PowerUpKind;
  /** position along the flow (video px) and height above ground */
  x: number;
  h: number;
  vx: number;
  born: number;
  taken: boolean;
}

export const POWERUP = {
  /** active time for timed power-ups (ms) */
  durationMs: 8000,
  /** seconds between pickups (randomised ±30 %) */
  spawnEveryS: 14,
  firstSpawnS: 9,
  /** magnet reach as a multiple of the runner height */
  magnetRange: 2.8,
  /** coin pull speed as a multiple of the runner height per second */
  magnetPull: 7,
};

export const POWERUP_ICON: Record<PowerUpKind, string> = { magnet: '🧲', shield: '🛡️', double: '⭐' };

/**
 * Pickups that float along the ground line like coins. Timed ones (magnet, double points)
 * run for POWERUP.durationMs; the shield lasts until it absorbs a hit. Pure logic – the
 * mode draws and collects.
 */
export class PowerUps {
  readonly pickups: PowerUpPickup[] = [];
  private nextSpawnAt: number;
  private activeKind: PowerUpKind | null = null;
  private activeUntil = 0;
  private shieldOn = false;
  private counter = 0;
  /** how many pickups were collected, per kind */
  readonly collected: Record<PowerUpKind, number> = { magnet: 0, shield: 0, double: 0 };

  constructor(
    private readonly rng: Rng,
    startT: number,
  ) {
    this.nextSpawnAt = startT + POWERUP.firstSpawnS * 1000;
  }

  /** Timed power-up currently running (null if none). */
  active(t: number): PowerUpKind | null {
    if (this.activeKind && t >= this.activeUntil) this.activeKind = null;
    return this.activeKind;
  }

  /** 0..1 of the timed power-up remaining. */
  timeLeft(t: number): number {
    return this.active(t) ? Math.max(0, (this.activeUntil - t) / POWERUP.durationMs) : 0;
  }

  get shield(): boolean {
    return this.shieldOn;
  }

  /** Spawns a pickup when due. `edgeX` is where things enter the window; `dir` the flow direction. */
  spawn(t: number, edgeX: number, dir: number, speed: number, runnerH: number): PowerUpPickup | null {
    if (t < this.nextSpawnAt) return null;
    this.nextSpawnAt = t + POWERUP.spawnEveryS * 1000 * this.rng.range(0.7, 1.3);
    // shield is rarer and never offered while one is up
    const roll = this.rng.next();
    const kind: PowerUpKind = roll < 0.42 ? 'magnet' : roll < 0.84 || this.shieldOn ? 'double' : 'shield';
    const p: PowerUpPickup = { id: `p${this.counter++}`, kind, x: edgeX, h: runnerH * this.rng.range(0.45, 1.05), vx: dir * speed, born: t, taken: false };
    this.pickups.push(p);
    return p;
  }

  /** Moves pickups and drops the ones that left the window. */
  update(dt: number, t: number, left: number, right: number): void {
    for (const p of this.pickups) p.x += p.vx * dt;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.taken || p.x < left - 120 || p.x > right + 120 || t - p.born > 30000) this.pickups.splice(i, 1);
    }
  }

  /** Activates a collected pickup. */
  collect(p: PowerUpPickup, t: number): void {
    p.taken = true;
    this.collected[p.kind]++;
    if (p.kind === 'shield') this.shieldOn = true;
    else {
      this.activeKind = p.kind;
      this.activeUntil = t + POWERUP.durationMs;
    }
  }

  /** The shield takes a hit instead of a life. Returns whether it did. */
  absorb(): boolean {
    if (!this.shieldOn) return false;
    this.shieldOn = false;
    return true;
  }

  /** Velocity to add to a coin at `coin` while the magnet runs (zero vector otherwise). */
  magnetPull(t: number, coin: Vec2, runner: Vec2, runnerH: number): Vec2 {
    if (this.active(t) !== 'magnet') return { x: 0, y: 0 };
    const dx = runner.x - coin.x;
    const dy = runner.y - coin.y;
    const d = Math.hypot(dx, dy);
    const range = POWERUP.magnetRange * runnerH;
    if (d > range || d < 1) return { x: 0, y: 0 };
    const v = POWERUP.magnetPull * runnerH * (1.2 - d / range);
    return { x: (dx / d) * v, y: (dy / d) * v };
  }

  /** Double points running at round time t (expiry applied). */
  doubleActive(t: number): boolean {
    return this.active(t) === 'double';
  }
}
