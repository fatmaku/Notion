// Pure scoring formulas shared by the client and the leaderboard worker, so the
// server can replay a round's event log and verify the claimed score.

export type ScoreWeapon = 'smg' | 'grenade' | 'rocket' | 'milkshake' | 'paint' | 'egg' | 'tomato' | 'snowball' | 'waterballoon' | 'banana' | 'tp' | 'laser' | 'glove';
export type ScoreClass = 'car' | 'truck' | 'bus' | 'train' | 'sign' | 'light' | 'other';

export const BASE_POINTS: Record<ScoreWeapon, { hit: number; kill: number }> = {
  smg: { hit: 15, kill: 120 },
  grenade: { hit: 150, kill: 100 },
  rocket: { hit: 250, kill: 150 },
  milkshake: { hit: 120, kill: 80 },
  paint: { hit: 6, kill: 0 },
  egg: { hit: 60, kill: 0 },
  tomato: { hit: 70, kill: 0 },
  snowball: { hit: 130, kill: 90 },
  waterballoon: { hit: 90, kill: 0 },
  banana: { hit: 140, kill: 90 },
  tp: { hit: 40, kill: 0 },
  laser: { hit: 4, kill: 150 },
  glove: { hit: 40, kill: 120 },
};

export const CLASS_FACTOR: Record<ScoreClass, number> = {
  car: 1,
  truck: 1.3,
  bus: 1.3,
  train: 1.5,
  sign: 0.6,
  light: 0.6,
  other: 0.5,
};

/** Smaller apparent size ⇒ farther ⇒ harder ⇒ up to ×3. `size` = box height / frame height, quantised to 0.01. */
export function distanceFactor(size: number): number {
  const s = Math.min(0.35, Math.max(0.06, size));
  return 1 + ((0.35 - s) / (0.35 - 0.06)) * 2;
}

/** Combo multiplier ×1 … ×5. */
export function comboMultiplier(combo: number): number {
  return Math.min(5, 1 + 0.5 * Math.max(0, combo - 1));
}

export interface HitPointsInput {
  weapon: ScoreWeapon;
  cls: ScoreClass;
  /** box height / frame height (0..1), quantised to 2 decimals by the client */
  size: number;
  centered: boolean;
  combo: number;
  /** number of targets hit by the same blast (≥1) */
  multi: number;
  kill: boolean;
}

export function hitPoints(i: HitPointsInput): number {
  const base = BASE_POINTS[i.weapon];
  const raw = (base.hit + (i.kill ? base.kill : 0)) * distanceFactor(i.size) * CLASS_FACTOR[i.cls] * (i.centered ? 1.5 : 1) * comboMultiplier(i.combo) * (i.multi > 1 ? 2 : 1);
  return Math.round(raw / 5) * 5;
}

export const COVERAGE_BONUS: Record<number, number> = { 25: 50, 50: 150, 100: 500 };
export const CARWASH_BONUS = 100;
export const GOLDBIRD_BONUS = 300;
/** Awarded once when a combo of FRENZY_COMBO kills starts a frenzy (8 s of unlimited, faster fire). */
export const FRENZY_BONUS = 250;
export const FRENZY_COMBO = 5;
export const FRENZY_MS = 8000;
export const FRENZY_COOLDOWN_MS = 15000;
export const MISSION_REWARD_DEFAULT = 500;

/** Runner scoring. */
export const RUNNER = {
  perObstacle: 100,
  perCoin: 50,
  perSecond: 10,
  comboStep: 0.5,
  comboMax: 5,
};

export function runnerObstaclePoints(combo: number): number {
  return Math.round(RUNNER.perObstacle * Math.min(RUNNER.comboMax, 1 + RUNNER.comboStep * Math.max(0, combo - 1)));
}

/** Sanity bounds used by the server to reject absurd claims. */
export const LIMITS = {
  maxPointsPerSecond: 1500,
  maxEventsPerSecond: 25,
  maxRoundSeconds: 200,
  maxKillsPerSecond: 3,
};
