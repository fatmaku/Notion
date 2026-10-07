import { describe, expect, it } from 'vitest';
import { weekKey, weeklyChallenge } from '../../src/game/scoring/Challenges';

describe('weekly challenge', () => {
  it('computes ISO week keys', () => {
    expect(weekKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-W01');
    expect(weekKey(new Date(Date.UTC(2026, 9, 7)))).toBe('2026-W41');
    expect(weekKey(new Date(Date.UTC(2024, 11, 30)))).toBe('2025-W01'); // Monday of the ISO week that belongs to 2025
    expect(weekKey(new Date(Date.UTC(2027, 0, 3)))).toBe('2026-W53');
  });

  it('is deterministic per week, valid and uses two different free weapons', () => {
    const a = weeklyChallenge('2026-W41');
    const b = weeklyChallenge('2026-W41');
    expect(a).toEqual(b);
    expect(['front-shooter', 'side-shooter', 'side-runner']).toContain(a.mode);
    expect(a.weapons[0]).not.toBe(a.weapons[1]);
    expect(a.week).toBe(41);
    // different weeks vary
    const kinds = new Set(Array.from({ length: 12 }, (_, i) => weeklyChallenge(`2026-W${String(i + 1).padStart(2, '0')}`).mode));
    expect(kinds.size).toBeGreaterThan(1);
  });
});
