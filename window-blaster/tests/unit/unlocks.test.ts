import { describe, expect, it } from 'vitest';
import { Unlocks } from '../../src/app/Unlocks';
import { CATALOG } from '../../src/game/unlocks/catalog';
import { WEAPONS } from '../../src/game/weapons/configs';
import { ALL_WEAPONS } from '../../src/core/types';
import { BASE_POINTS } from '../../shared/scoring';
import { verifyRound } from '../../shared/verify';

class MemStorage {
  private m = new Map<string, unknown>();
  get<T>(k: string, d: T): T {
    return (this.m.has(k) ? this.m.get(k) : d) as T;
  }
  set<T>(k: string, v: T): void {
    this.m.set(k, JSON.parse(JSON.stringify(v)));
  }
  remove(k: string): void {
    this.m.delete(k);
  }
}

describe('Unlocks', () => {
  it('earn, buy, select, persist', () => {
    const st = new MemStorage();
    const u = new Unlocks(st as never);
    expect(u.weaponUnlocked('smg')).toBe(true);
    expect(u.weaponUnlocked('egg')).toBe(false);
    expect(u.buy('weapon:egg')).toBe('poor');
    u.earn(1600);
    expect(u.buy('weapon:egg')).toBe('ok');
    expect(u.balance).toBe(100);
    expect(u.weaponUnlocked('egg')).toBe(true);
    expect(u.buy('weapon:egg')).toBe('owned');
    u.earn(2000);
    expect(u.buy('skin:dark')).toBe('ok');
    expect(u.selected('skin')?.id).toBe('skin:dark');
    const again = new Unlocks(st as never);
    expect(again.owns('weapon:egg')).toBe(true);
    expect(again.selected('skin')?.id).toBe('skin:dark');
    expect(again.nextGoal()?.item.price).toBeGreaterThan(again.balance);
  });
  it('catalog covers every priced weapon and scoring knows every weapon', () => {
    for (const w of ALL_WEAPONS) {
      expect(WEAPONS[w]).toBeDefined();
      expect(BASE_POINTS[w]).toBeDefined();
      if (WEAPONS[w].price > 0) expect(CATALOG.some((i) => i.weapon === w)).toBe(true);
    }
  });
  it('verify accepts hits from new weapons and car wash bonus', () => {
    const r = {
      mode: 'front-shooter',
      durationSec: 30,
      kills: 0,
      source: 'camera',
      events: [
        { t: 1000, kind: 'hit', weapon: 'egg', cls: 'car', size: 0.2, centered: false, multi: 1, combo: 0, points: 0 },
        { t: 1500, kind: 'bonus', id: 'carwash', points: 100 },
      ],
      score: 0,
    };
    // compute expected egg points via verify's own formula by trial: ask verify for the mismatch reason
    const bad = verifyRound(r as never);
    expect(bad.reason).toMatch(/hit-points 0≠(\d+)/);
    const pts = Number(/≠(\d+)/.exec(bad.reason!)![1]);
    r.events[0].points = pts;
    r.score = pts + 100;
    expect(verifyRound(r as never).ok).toBe(true);
  });
});
