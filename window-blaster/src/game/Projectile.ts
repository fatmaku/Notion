import type { Rect, Vec2, WeaponId } from '../core/types';
import { center } from '../core/math/rect';

export type ProjectileKind = 'grenade' | 'rocket' | 'milkshake' | 'egg' | 'tomato' | 'snowball' | 'balloon' | 'banana' | 'tp';

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  weapon: WeaponId;
  pos: Vec2;
  /** Launch point (ballistic arcs are evaluated analytically from here). */
  start: Vec2;
  vel: Vec2;
  gravity: number;
  born: number;
  flightMs: number;
  /** Aim point (video px). */
  target: Vec2;
  /** Track to home in on (rockets). */
  homingId: number | null;
  /** Track this projectile was aimed at (lead-corrected); checked on arrival. */
  targetId: number | null;
  /** Position at the previous step, for sweep tests. */
  prev: Vec2;
  homing: number;
  trail: Vec2[];
  /** 1 at launch → ~0.35 near the target: fakes perspective. */
  scale: number;
  spin: number;
}

export interface Detonation {
  p: Projectile;
  at: Vec2;
  reason: 'arrived' | 'contact';
  contactId: number | null;
}

/** Solve for the initial velocity so a ballistic projectile reaches `target` after `T` seconds. */
export function solveBallistic(start: Vec2, target: Vec2, T: number, gravity: number): Vec2 {
  return { x: (target.x - start.x) / T, y: (target.y - start.y) / T - 0.5 * gravity * T };
}

/** Position on the analytic arc at time t (s). */
export function ballisticAt(start: Vec2, v0: Vec2, gravity: number, t: number): Vec2 {
  return { x: start.x + v0.x * t, y: start.y + v0.y * t + 0.5 * gravity * t * t };
}

/**
 * Screen-space projectile simulation. Arcs are analytic (deterministic), rockets
 * steer towards a tracked target each step. Contact tests are delegated to the
 * mode, which knows the live target boxes.
 */
export class ProjectileSystem {
  readonly list: Projectile[] = [];
  private nextId = 1;

  spawnBallistic(kind: ProjectileKind, weapon: WeaponId, start: Vec2, target: Vec2, flightS: number, gravity: number, now: number, targetId: number | null = null): Projectile {
    const p: Projectile = {
      id: this.nextId++,
      kind,
      weapon,
      pos: { ...start },
      start: { ...start },
      prev: { ...start },
      vel: solveBallistic(start, target, flightS, gravity),
      gravity,
      born: now,
      flightMs: flightS * 1000,
      target: { ...target },
      homingId: null,
      targetId,
      homing: 0,
      trail: [],
      scale: 1,
      spin: 0,
    };
    this.list.push(p);
    return p;
  }

  spawnRocket(weapon: WeaponId, start: Vec2, target: Vec2, flightS: number, homingId: number | null, homing: number, now: number): Projectile {
    const p: Projectile = {
      id: this.nextId++,
      kind: 'rocket',
      weapon,
      pos: { ...start },
      start: { ...start },
      prev: { ...start },
      vel: { x: (target.x - start.x) / flightS, y: (target.y - start.y) / flightS },
      gravity: 0,
      born: now,
      flightMs: flightS * 1000,
      target: { ...target },
      homingId,
      targetId: homingId,
      homing,
      trail: [],
      scale: 1,
      spin: 0,
    };
    this.list.push(p);
    return p;
  }

  /**
   * Advance all projectiles.
   * @param boxOf  live box of a track id (null if lost) — used for homing
   * @param contact returns the id of a target touched at position p (or null)
   */
  update(dt: number, now: number, boxOf: (id: number) => Rect | null, contact: (p: Vec2, proj: Projectile) => number | null): Detonation[] {
    const out: Detonation[] = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      const age = now - p.born;
      const f = Math.min(1, age / p.flightMs);
      p.scale = 1 - 0.65 * f;
      p.spin += dt * 9;
      p.prev = { ...p.pos };
      if (p.kind === 'rocket') {
        if (p.homingId !== null) {
          const b = boxOf(p.homingId);
          if (b) {
            p.target = center(b);
            const dx = p.target.x - p.pos.x;
            const dy = p.target.y - p.pos.y;
            const d = Math.hypot(dx, dy) || 1;
            const speed = Math.hypot(p.vel.x, p.vel.y);
            const k = Math.min(1, p.homing * dt);
            p.vel.x += ((dx / d) * speed - p.vel.x) * k;
            p.vel.y += ((dy / d) * speed - p.vel.y) * k;
          }
        }
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
      } else {
        p.pos = ballisticAt(p.start, p.vel, p.gravity, age / 1000);
      }
      if (p.trail.length > 18) p.trail.shift();
      p.trail.push({ ...p.pos });

      // contact: only in the second half of the flight (the arc passes "over" nearer traffic before that)
      const hitId = f > 0.45 ? contact(p.pos, p) : null;
      if (hitId !== null) {
        out.push({ p, at: { ...p.pos }, reason: 'contact', contactId: hitId });
        this.list.splice(i, 1);
        continue;
      }
      if (age >= p.flightMs) {
        // arrival: if we were aimed at a tracked target, land on where it is now
        const tb = p.targetId !== null ? boxOf(p.targetId) : null;
        const at = tb ? { x: Math.min(Math.max(p.target.x, tb.x), tb.x + tb.w), y: Math.min(Math.max(p.target.y, tb.y), tb.y + tb.h) } : { ...p.target };
        out.push({ p, at, reason: 'arrived', contactId: tb ? p.targetId : null });
        this.list.splice(i, 1);
      }
    }
    return out;
  }

  clear(): void {
    this.list.length = 0;
  }
}
