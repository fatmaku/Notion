import { describe, expect, it } from 'vitest';
import { Party } from '../../src/app/Party';

describe('Party (hot-seat duel)', () => {
  it('rotates turns round-robin and finishes after roundsEach per player', () => {
    const p = new Party(['Anna', 'Ben', ''], 2);
    expect(p.players).toEqual(['Anna', 'Ben', 'Spieler 3']);
    const order: string[] = [];
    while (!p.done) {
      order.push(p.current!);
      p.record(100);
    }
    expect(order).toEqual(['Anna', 'Ben', 'Spieler 3', 'Anna', 'Ben', 'Spieler 3']);
    expect(p.current).toBeNull();
    expect(p.playedRounds).toBe(6);
    expect(p.totalRounds).toBe(6);
  });

  it('ranks by total, breaks ties by best round, shares equal ranks', () => {
    const p = new Party(['A', 'B', 'C'], 2);
    p.record(500); // A
    p.record(300); // B
    p.record(800); // C
    p.record(500); // A → 1000
    p.record(700); // B → 1000
    p.record(100); // C → 900
    const s = p.standings();
    expect(s.map((r) => r.player)).toEqual(['B', 'A', 'C']); // B wins the tie with the better single round
    expect(s[0].rank).toBe(1);
    expect(s[1].rank).toBe(2);
    expect(p.winners()).toEqual(['B']);
    const q = new Party(['X', 'Y'], 1);
    q.record(400);
    q.record(400);
    expect(q.winners()).toEqual(['X', 'Y']);
    expect(q.standings().map((r) => r.rank)).toEqual([1, 1]);
  });

  it('rejects fewer than two players and ignores records after the end', () => {
    expect(() => new Party(['solo'])).toThrow();
    const p = new Party(['A', 'B'], 1);
    p.record(1);
    p.record(2);
    p.record(3);
    expect(p.standings().map((r) => r.total)).toEqual([2, 1]);
    const r = p.rematch();
    expect(r.done).toBe(false);
    expect(r.players).toEqual(['A', 'B']);
  });
});
