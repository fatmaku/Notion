// Replays a round's event log with the shared scoring formulas. Used by the
// leaderboard worker to verify claimed scores and by the client's tests to
// make sure the event log it produces is complete and consistent.
import { CARWASH_BONUS, COVERAGE_BONUS, FRENZY_BONUS, FRENZY_COOLDOWN_MS, GOLDBIRD_BONUS, LIMITS, RUNNER, hitPoints, runnerObstaclePoints, type ScoreClass, type ScoreWeapon } from './scoring';

export interface VerifyEvent {
  t: number;
  kind: string;
  weapon?: string;
  cls?: string;
  size?: number;
  centered?: boolean;
  multi?: number;
  points: number;
  combo?: number;
  id?: string;
}

export interface VerifyRound {
  mode: string;
  score: number;
  durationSec: number;
  kills: number;
  events: VerifyEvent[];
  source?: string;
  extra?: Record<string, number>;
  missions?: { id: string; done: boolean; reward: number }[];
}

export interface VerifyResult {
  ok: boolean;
  verifiedScore: number;
  reason?: string;
}

const WEAPONS: ScoreWeapon[] = ['smg', 'grenade', 'rocket', 'milkshake', 'paint', 'egg', 'tomato', 'snowball', 'waterballoon', 'banana', 'tp', 'laser', 'glove'];
const CLASSES: ScoreClass[] = ['car', 'truck', 'bus', 'train', 'sign', 'light', 'other'];
const MISSION_REWARDS = new Set([300, 400, 500, 600, 700, 800, 900]);

export function verifyRound(r: VerifyRound): VerifyResult {
  if (!r || !Array.isArray(r.events)) return { ok: false, verifiedScore: 0, reason: 'malformed' };
  if (r.source && r.source !== 'camera') return { ok: false, verifiedScore: 0, reason: 'demo' };
  if (!(r.durationSec > 3)) return { ok: false, verifiedScore: 0, reason: 'too-short' };
  if (r.durationSec > LIMITS.maxRoundSeconds) return { ok: false, verifiedScore: 0, reason: 'too-long' };
  if (r.extra && r.extra.roundSeconds === 0 && r.mode !== 'side-runner') return { ok: false, verifiedScore: 0, reason: 'endless' };
  if (r.events.length > LIMITS.maxEventsPerSecond * r.durationSec + 20) return { ok: false, verifiedScore: 0, reason: 'event-rate' };

  let sum = 0;
  let kills = 0;
  let missions = 0;
  let lastT = -1;
  let lastFrenzyT = -Infinity;
  for (const e of r.events) {
    if (typeof e.t !== 'number' || e.t < lastT - 5 || e.t > r.durationSec * 1000 + 3000) return { ok: false, verifiedScore: 0, reason: 'timeline' };
    lastT = Math.max(lastT, e.t);
    switch (e.kind) {
      case 'hit':
      case 'kill': {
        const w = e.weapon as ScoreWeapon;
        const cls = (CLASSES.includes(e.cls as ScoreClass) ? e.cls : 'other') as ScoreClass;
        if (!WEAPONS.includes(w) || typeof e.size !== 'number') return { ok: false, verifiedScore: 0, reason: 'hit-fields' };
        const expected = hitPoints({ weapon: w, cls, size: e.size, centered: !!e.centered, combo: e.combo ?? 0, multi: e.multi ?? 1, kill: e.kind === 'kill' });
        if (expected !== e.points) return { ok: false, verifiedScore: 0, reason: `hit-points ${e.points}≠${expected}` };
        if ((e.combo ?? 0) > 60) return { ok: false, verifiedScore: 0, reason: 'combo' };
        if (e.kind === 'kill') kills++;
        break;
      }
      case 'bonus': {
        if (e.id === 'goldbird') {
          if (e.points !== GOLDBIRD_BONUS) return { ok: false, verifiedScore: 0, reason: 'bonus' };
          break;
        }
        if (e.id === 'carwash') {
          if (e.points !== CARWASH_BONUS) return { ok: false, verifiedScore: 0, reason: 'bonus' };
          break;
        }
        if (e.id === 'frenzy') {
          if (e.points !== FRENZY_BONUS || e.t - lastFrenzyT < FRENZY_COOLDOWN_MS) return { ok: false, verifiedScore: 0, reason: 'frenzy' };
          lastFrenzyT = e.t;
          break;
        }
        const m = /^coverage(\d+)$/.exec(e.id ?? '');
        if (!m || COVERAGE_BONUS[Number(m[1])] !== e.points) return { ok: false, verifiedScore: 0, reason: 'bonus' };
        break;
      }
      case 'mission':
        if (!MISSION_REWARDS.has(e.points)) return { ok: false, verifiedScore: 0, reason: 'mission-reward' };
        if (++missions > 3) return { ok: false, verifiedScore: 0, reason: 'missions' };
        break;
      case 'obstacle':
        if (e.points !== runnerObstaclePoints(e.combo ?? 0)) return { ok: false, verifiedScore: 0, reason: 'obstacle-points' };
        break;
      case 'coin':
        if (e.points !== RUNNER.perCoin) return { ok: false, verifiedScore: 0, reason: 'coin-points' };
        break;
      case 'miss':
      case 'life':
        if (e.points !== 0) return { ok: false, verifiedScore: 0, reason: 'zero-points' };
        break;
      default:
        return { ok: false, verifiedScore: 0, reason: `kind ${e.kind}` };
    }
    sum += e.points;
  }
  if (kills > LIMITS.maxKillsPerSecond * r.durationSec + 2) return { ok: false, verifiedScore: 0, reason: 'kill-rate' };
  let expected = sum;
  let tolerance = 0;
  if (r.mode === 'side-runner') {
    expected += Math.floor(r.durationSec) * RUNNER.perSecond;
    tolerance = 2 * RUNNER.perSecond;
  }
  if (Math.abs(expected - r.score) > tolerance) return { ok: false, verifiedScore: expected, reason: `score ${r.score}≠${expected}` };
  if (expected / r.durationSec > LIMITS.maxPointsPerSecond) return { ok: false, verifiedScore: expected, reason: 'points-rate' };
  return { ok: true, verifiedScore: expected };
}
