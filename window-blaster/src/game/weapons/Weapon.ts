import type { WeaponConfig } from './configs';

/** Ammo / cooldown / reload state machine for one weapon slot. */
export class Weapon {
  ammo: number;
  reserve: number;
  reloadEnd = 0;
  nextShotAt = 0;
  triggerHeld = false;
  constructor(readonly cfg: WeaponConfig) {
    this.ammo = cfg.mag;
    this.reserve = cfg.perRound === undefined ? Infinity : Math.max(0, cfg.perRound - cfg.mag);
  }

  get reloading(): boolean {
    return this.reloadEnd > 0;
  }

  get empty(): boolean {
    return this.ammo <= 0 && this.reserve <= 0;
  }

  reloadProgress(now: number): number {
    if (!this.reloading) return 1;
    return 1 - Math.max(0, this.reloadEnd - now) / this.cfg.reloadMs;
  }

  update(now: number): void {
    if (this.reloading && now >= this.reloadEnd) {
      const take = Math.min(this.cfg.mag, this.reserve);
      this.ammo = take;
      this.reserve -= take;
      this.reloadEnd = 0;
    }
  }

  startReload(now: number): boolean {
    if (this.reloading || this.ammo >= this.cfg.mag || this.reserve <= 0) return false;
    this.reloadEnd = now + this.cfg.reloadMs;
    return true;
  }

  canFire(now: number): boolean {
    return !this.reloading && this.ammo > 0 && now >= this.nextShotAt;
  }

  /** Returns 'fired' | 'cooldown' | 'empty' | 'reloading'. */
  tryFire(now: number): 'fired' | 'cooldown' | 'empty' | 'reloading' {
    if (this.reloading) return 'reloading';
    if (this.ammo <= 0) {
      if (!this.startReload(now)) return 'empty';
      return 'reloading';
    }
    if (now < this.nextShotAt) return 'cooldown';
    this.ammo--;
    this.nextShotAt = now + 60000 / this.cfg.rpm;
    if (this.ammo <= 0) this.startReload(now + 120);
    return 'fired';
  }

  ammoText(): string {
    const res = this.reserve === Infinity ? '∞' : String(this.reserve);
    return `${this.ammo}/${res}`;
  }
}
