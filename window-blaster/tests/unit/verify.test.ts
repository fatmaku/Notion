import { describe, expect, it } from 'vitest';
import { verifyRound, type VerifyEvent, type VerifyRound } from '../../shared/verify';
import { hitPoints, runnerObstaclePoints } from '../../shared/scoring';

const hit = (t: number, kill: boolean, combo: number, size = 0.2): VerifyEvent => ({
  t,
  kind: kill ? 'kill' : 'hit',
  weapon: 'smg',
  cls: 'car',
  size,
  centered: false,
  multi: 1,
  combo,
  points: hitPoints({ weapon: 'smg', cls: 'car', size, centered: false, combo, multi: 1, kill }),
});

function round(events: VerifyEvent[], over: Partial<VerifyRound> = {}): VerifyRound {
  return { mode: 'front-shooter', durationSec: 60, kills: events.filter((e) => e.kind === 'kill').length, source: 'camera', events, score: events.reduce((s, e) => s + e.points, 0), ...over };
}

describe('verifyRound', () => {
  it('accepts a consistent shooter round', () => {
    const r = round([hit(1000, false, 0), hit(1100, false, 0), hit(1200, true, 1), { t: 1300, kind: 'mission', id: 'kill3', points: 500 }]);
    expect(verifyRound(r)).toEqual({ ok: true, verifiedScore: r.score });
  });
  it('rejects tampered totals, points and demo rounds', () => {
    const r = round([hit(1000, true, 1)]);
    expect(verifyRound({ ...r, score: r.score + 5 }).ok).toBe(false);
    const bad = round([{ ...hit(1000, true, 1), points: 99999 }]);
    expect(verifyRound(bad).reason).toMatch(/hit-points/);
    expect(verifyRound({ ...r, source: 'demo' }).reason).toBe('demo');
    expect(verifyRound({ ...r, durationSec: 1 }).reason).toBe('too-short');
    expect(verifyRound({ ...r, extra: { roundSeconds: 0 } }).reason).toBe('endless');
  });
  it('accepts a runner round with survival points within tolerance', () => {
    const events: VerifyEvent[] = [
      { t: 2000, kind: 'obstacle', points: runnerObstaclePoints(1), combo: 1 },
      { t: 4000, kind: 'obstacle', points: runnerObstaclePoints(2), combo: 2 },
      { t: 5000, kind: 'coin', points: 50 },
      { t: 6000, kind: 'life', points: 0 },
    ];
    const sum = events.reduce((s, e) => s + e.points, 0);
    const r: VerifyRound = { mode: 'side-runner', durationSec: 30.4, kills: 0, source: 'camera', events, score: sum + 30 * 10 };
    expect(verifyRound(r).ok).toBe(true);
    expect(verifyRound({ ...r, score: r.score + 40 }).ok).toBe(false);
  });
  it('rejects absurd rates', () => {
    const many: VerifyEvent[] = [];
    for (let i = 0; i < 400; i++) many.push(hit(i * 10, true, 1));
    expect(verifyRound(round(many, { durationSec: 10 })).ok).toBe(false);
  });
});

describe('frenzy bonus', () => {
  const base = { mode: 'front-shooter', durationSec: 40, kills: 0, source: 'camera' as const, extra: { roundSeconds: 60 } };
  it('accepts the fixed frenzy bonus', () => {
    const r = { ...base, score: 250, events: [{ t: 5000, kind: 'bonus', id: 'frenzy', points: 250 }] };
    expect(verifyRound(r).ok).toBe(true);
  });
  it('rejects a wrong amount and a second frenzy inside the cooldown', () => {
    expect(verifyRound({ ...base, score: 300, events: [{ t: 5000, kind: 'bonus', id: 'frenzy', points: 300 }] }).reason).toBe('frenzy');
    const twice = [
      { t: 5000, kind: 'bonus', id: 'frenzy', points: 250 },
      { t: 9000, kind: 'bonus', id: 'frenzy', points: 250 },
    ];
    expect(verifyRound({ ...base, score: 500, events: twice }).reason).toBe('frenzy');
    const spaced = [
      { t: 5000, kind: 'bonus', id: 'frenzy', points: 250 },
      { t: 21000, kind: 'bonus', id: 'frenzy', points: 250 },
    ];
    expect(verifyRound({ ...base, score: 500, events: spaced }).ok).toBe(true);
  });
});
