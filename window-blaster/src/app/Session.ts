import type { GameModeId, VehicleType, WeaponId, WindowSide } from '../core/types';

/** Choices made on the way into a round. */
export interface Session {
  vehicle: VehicleType;
  mode: GameModeId;
  weapons: [WeaponId, WeaponId];
  side: WindowSide;
  source: 'camera' | 'demo';
  seed: number;
  /** Daily challenge: missions seeded by the date, so everyone plays the same set. */
  daily: boolean;
  /** Weekly challenge: mode, weapons and missions fixed for the ISO week. */
  weekly: boolean;
}

export const defaultSession = (): Session => ({
  vehicle: 'car',
  mode: 'front-shooter',
  weapons: ['smg', 'grenade'],
  side: 'front',
  source: 'camera',
  seed: (Date.now() % 100000) | 0,
  daily: false,
  weekly: false,
});
