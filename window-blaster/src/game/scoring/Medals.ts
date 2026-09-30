import type { GameModeId } from '../../core/types';

export type Medal = 'none' | 'bronze' | 'silver' | 'gold';

const THRESHOLDS: Record<GameModeId, [number, number, number]> = {
  'front-shooter': [2500, 6000, 12000],
  'side-shooter': [2000, 5000, 10000],
  'side-runner': [1500, 4000, 8000],
};

export function medalFor(mode: GameModeId, score: number): Medal {
  const [b, s, g] = THRESHOLDS[mode];
  return score >= g ? 'gold' : score >= s ? 'silver' : score >= b ? 'bronze' : 'none';
}

export function nextMedal(mode: GameModeId, score: number): { medal: Medal; missing: number } | null {
  const [b, s, g] = THRESHOLDS[mode];
  if (score < b) return { medal: 'bronze', missing: b - score };
  if (score < s) return { medal: 'silver', missing: s - score };
  if (score < g) return { medal: 'gold', missing: g - score };
  return null;
}

export const MEDAL_ICON: Record<Medal, string> = { none: '—', bronze: '🥉', silver: '🥈', gold: '🥇' };
