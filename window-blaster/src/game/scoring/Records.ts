import type { GameModeId } from '../../core/types';
import type { Storage } from '../../app/Storage';
import type { RoundResult } from '../GameMode';

export interface RecordSummary {
  score: number;
  at: number;
  mode: GameModeId;
  weapons: string[];
  vehicle: string;
  kills: number;
  maxCombo: number;
  durationSec: number;
  source: 'camera' | 'demo';
}

export interface Totals {
  rounds: number;
  kills: number;
  hits: number;
  shots: number;
  seconds: number;
  bestCombo: number;
}

export const todayKey = (d = new Date()): string => d.toISOString().slice(0, 10);

/** Local persistence of best scores, daily bests, totals and recent rounds. */
export class Records {
  constructor(private readonly storage: Storage) {}

  best(mode: GameModeId): number {
    return this.storage.get<Record<string, number>>('best.v1', {})[mode] ?? 0;
  }

  dailyBest(mode: GameModeId, day = todayKey()): number {
    return this.storage.get<Record<string, number>>('daily.v1', {})[`${day}:${mode}`] ?? 0;
  }

  totals(): Totals {
    return this.storage.get<Totals>('totals.v1', { rounds: 0, kills: 0, hits: 0, shots: 0, seconds: 0, bestCombo: 0 });
  }

  recent(): RecordSummary[] {
    return this.storage.get<RecordSummary[]>('recent.v1', []);
  }

  /** Stores a finished round. Returns whether it is a new all-time best for the mode. */
  save(r: RoundResult): { newBest: boolean; newDaily: boolean } {
    const best = this.storage.get<Record<string, number>>('best.v1', {});
    const daily = this.storage.get<Record<string, number>>('daily.v1', {});
    const newBest = r.score > (best[r.mode] ?? 0);
    const dk = `${todayKey()}:${r.mode}`;
    const newDaily = r.score > (daily[dk] ?? 0);
    if (newBest) best[r.mode] = r.score;
    if (newDaily) daily[dk] = r.score;
    // keep the daily map small
    const keys = Object.keys(daily).sort();
    while (keys.length > 60) delete daily[keys.shift()!];
    this.storage.set('best.v1', best);
    this.storage.set('daily.v1', daily);
    const t = this.totals();
    t.rounds++;
    t.kills += r.kills;
    t.hits += r.hits;
    t.shots += r.shots;
    t.seconds += Math.round(r.durationSec);
    t.bestCombo = Math.max(t.bestCombo, r.maxCombo);
    this.storage.set('totals.v1', t);
    const recent = this.recent();
    recent.unshift({
      score: r.score,
      at: Date.now(),
      mode: r.mode,
      weapons: r.weapons,
      vehicle: r.vehicle,
      kills: r.kills,
      maxCombo: r.maxCombo,
      durationSec: r.durationSec,
      source: r.source,
    });
    this.storage.set('recent.v1', recent.slice(0, 30));
    return { newBest, newDaily };
  }
}
