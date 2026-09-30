import type { GameModeId, VehicleType, WeaponId } from '../core/types';
import type { Rng } from '../core/rng';
import type { FrameSource } from '../camera/FrameSource';
import type { Tracker } from '../vision/Tracker';
import type { WindowState } from '../vision/window/types';
import type { Layers } from '../render/Layers';
import type { Settings } from '../app/Settings';
import type { Session } from '../app/Session';
import type { Diagnostics } from '../debug/Diagnostics';
import type { GameLoop } from '../app/GameLoop';
import type { Sfx } from '../audio/Sfx';
import type { Haptics } from '../sensors/Haptics';

export interface PointerEv {
  type: 'down' | 'move' | 'up' | 'cancel';
  /** video px */
  x: number;
  y: number;
  t: number;
  id: number;
}

/** A single scoring-relevant event; the leaderboard server replays these to verify a score. */
export interface RoundEvent {
  t: number; // ms since round start
  kind: 'hit' | 'kill' | 'miss' | 'mission' | 'coin' | 'obstacle' | 'life' | 'bonus';
  weapon?: WeaponId;
  cls?: string;
  /** distance factor bucket, precision etc. — inputs to the scoring formula */
  size?: number;
  centered?: boolean;
  multi?: number;
  points: number;
  combo?: number;
  id?: string;
}

export interface MissionResult {
  id: string;
  text: string;
  done: boolean;
  progress: number;
  goal: number;
  reward: number;
}

export interface RoundResult {
  mode: GameModeId;
  vehicle: VehicleType;
  weapons: WeaponId[];
  score: number;
  kills: number;
  hits: number;
  shots: number;
  maxCombo: number;
  durationSec: number;
  missions: MissionResult[];
  events: RoundEvent[];
  seed: number;
  startedAt: number;
  source: 'camera' | 'demo';
  extra: Record<string, number>;
}

export interface GameCtx {
  layers: Layers;
  tracker: Tracker;
  frame: FrameSource;
  session: Session;
  settings: Settings;
  diag: Diagnostics;
  rng: Rng;
  loop: GameLoop;
  sfx: Sfx;
  haptics: Haptics;
  window: () => WindowState;
  now: () => number;
  /** Called by the mode when the round is over. */
  end: (r: RoundResult) => void;
  /** Ask the window tracker to re-center on the current frame. */
  recenter: () => void;
  roundSeconds: number;
}

/** Buttons the play overlay should show for this mode. */
export interface ModeActions {
  swap?: () => void;
  reload?: () => void;
  jump?: () => void;
  jumpRelease?: () => void;
  duck?: () => void;
  duckRelease?: () => void;
  recenter?: boolean;
}

export interface GameMode {
  readonly id: GameModeId;
  enter(ctx: GameCtx): void;
  update(dt: number, now: number): void;
  render(): void;
  pointer(e: PointerEv): void;
  pause(): void;
  resume(): void;
  /** Force-end (quit from pause menu). */
  abort(): RoundResult;
  actions(): ModeActions;
  /** Live numbers for HUD/diagnostics/e2e. */
  snapshot(): Record<string, number | string | boolean>;
}
