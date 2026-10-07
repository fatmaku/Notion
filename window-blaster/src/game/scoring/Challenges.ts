import type { GameModeId, WeaponId } from '../../core/types';
import { hashString } from '../../core/rng';

/** ISO week key, e.g. "2026-W41" – the same for everyone in the same week (UTC). */
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  date.setUTCDate(date.getUTCDate() + 4 - day); // Thursday decides the year
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface WeeklyChallenge {
  key: string;
  /** week number for display */
  week: number;
  mode: GameModeId;
  /** fixed loadout (always-free weapons, so everyone can play it); empty for the runner */
  weapons: [WeaponId, WeaponId];
  /** mission seed */
  seed: number;
}

const MODES: GameModeId[] = ['front-shooter', 'side-shooter', 'side-runner'];
const FREE: WeaponId[] = ['smg', 'grenade', 'rocket', 'milkshake', 'paint'];

/** Deterministic weekly setup: mode and weapon pair derived from the week key. */
export function weeklyChallenge(key = weekKey()): WeeklyChallenge {
  const h = hashString(`weekly:${key}`);
  const mode = MODES[h % MODES.length];
  const a = FREE[(h >>> 3) % FREE.length];
  let b = FREE[(h >>> 7) % FREE.length];
  if (b === a) b = FREE[((h >>> 7) + 1) % FREE.length];
  return { key, week: Number(key.slice(-2)), mode, weapons: [a, b], seed: hashString(`${key}:${mode}:weekly`) };
}
