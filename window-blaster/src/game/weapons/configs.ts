import type { WeaponId } from '../../core/types';

export type WeaponKind = 'hitscan' | 'projectile';
export type HitEffect = 'explode' | 'skid' | 'paint';

export interface WeaponConfig {
  id: WeaponId;
  kind: WeaponKind;
  /** HP removed per hit (0 for paint). */
  damage: number;
  rpm: number;
  auto: boolean;
  mag: number;
  reloadMs: number;
  /** Total shots per round (undefined = unlimited). */
  perRound?: number;
  /** Hitscan spread in degrees. */
  spreadDeg: number;
  /** Projectile flight time to the aim point (s). */
  flightS?: number;
  /** Screen-space gravity for ballistic arcs (px/s² at 720p). */
  gravityPx?: number;
  /** Blast radius (px at 720p); 0 = point hit. */
  blastR: number;
  /** Rocket steering strength (0 = none). */
  homing?: number;
  effect: HitEffect;
  basePoints: number;
  killBonus: number;
  /** Fractional combo increment per hit. */
  comboWeight: number;
  recoil: number;
  hitStopMs: number;
  /** Radius (px at 720p) in which a tap snaps onto a target. */
  aimAssist: number;
  ui: { damage: number; rate: number; area: number };
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  smg: {
    id: 'smg',
    kind: 'hitscan',
    damage: 1,
    rpm: 600,
    auto: true,
    mag: 30,
    reloadMs: 1500,
    spreadDeg: 1.3,
    blastR: 0,
    effect: 'explode',
    basePoints: 15,
    killBonus: 120,
    comboWeight: 0.25,
    recoil: 2,
    hitStopMs: 0,
    aimAssist: 28,
    ui: { damage: 0.25, rate: 1, area: 0.05 },
  },
  grenade: {
    id: 'grenade',
    kind: 'projectile',
    damage: 8,
    rpm: 70,
    auto: false,
    mag: 6,
    reloadMs: 2400,
    spreadDeg: 0,
    flightS: 0.9,
    gravityPx: 1400,
    blastR: 95,
    effect: 'explode',
    basePoints: 150,
    killBonus: 100,
    comboWeight: 1,
    recoil: 4,
    hitStopMs: 45,
    aimAssist: 60,
    ui: { damage: 0.8, rate: 0.25, area: 0.7 },
  },
  rocket: {
    id: 'rocket',
    kind: 'projectile',
    damage: 12,
    rpm: 40,
    auto: false,
    mag: 1,
    reloadMs: 1500,
    perRound: 3,
    spreadDeg: 0,
    flightS: 0.75,
    gravityPx: 0,
    blastR: 140,
    homing: 6,
    effect: 'explode',
    basePoints: 250,
    killBonus: 150,
    comboWeight: 1,
    recoil: 8,
    hitStopMs: 70,
    aimAssist: 90,
    ui: { damage: 1, rate: 0.15, area: 1 },
  },
  milkshake: {
    id: 'milkshake',
    kind: 'projectile',
    damage: 0,
    rpm: 80,
    auto: false,
    mag: 5,
    reloadMs: 2000,
    spreadDeg: 0,
    flightS: 0.7,
    gravityPx: 1600,
    blastR: 0,
    effect: 'skid',
    basePoints: 120,
    killBonus: 80,
    comboWeight: 1,
    recoil: 3,
    hitStopMs: 40,
    aimAssist: 55,
    ui: { damage: 0.5, rate: 0.3, area: 0.2 },
  },
  paint: {
    id: 'paint',
    kind: 'hitscan',
    damage: 0,
    rpm: 300,
    auto: true,
    mag: 40,
    reloadMs: 1800,
    spreadDeg: 0.9,
    blastR: 0,
    effect: 'paint',
    basePoints: 6,
    killBonus: 0,
    comboWeight: 0.2,
    recoil: 1,
    hitStopMs: 0,
    aimAssist: 24,
    ui: { damage: 0.05, rate: 0.6, area: 0.15 },
  },
};

/** Hit points per target class (SMG rounds to destroy). */
export const HP: Record<string, number> = { car: 3, truck: 6, bus: 8, train: 10, sign: 2, light: 2 };
