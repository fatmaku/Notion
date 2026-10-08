import type { Vec2 } from '../core/types';

/**
 * Pure input mappings for controllers and keyboards (unit-tested). Glasses players can't see the
 * phone's touch screen well, so every action is also reachable from a Bluetooth gamepad, a
 * keyboard or a presenter remote.
 */

/** What the player wants this frame. `aim` is a stick-like vector in -1..1 (shooter cursor). */
export interface Intents {
  fire: boolean;
  reload: boolean;
  swap: boolean;
  pause: boolean;
  recenter: boolean;
  jump: boolean;
  duck: boolean;
  aim: Vec2;
}

export type ModeKind = 'shooter' | 'runner';

export function noIntents(): Intents {
  return { fire: false, reload: false, swap: false, pause: false, recenter: false, jump: false, duck: false, aim: { x: 0, y: 0 } };
}

/** Minimal shape of a Gamepad (the browser object, or a test double). */
export interface PadLike {
  buttons: readonly { pressed: boolean; value: number }[];
  axes: readonly number[];
  mapping?: string;
  connected?: boolean;
}

/** Standard gamepad layout indices (https://w3c.github.io/gamepad/#remapping). */
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  LS: 10,
  RS: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

export const DEADZONE = 0.18;

/** Radial dead zone + squared response curve: small stick moves give fine aim, full deflection is fast. */
export function shapeStick(x: number, y: number, dead = DEADZONE): Vec2 {
  const m = Math.hypot(x, y);
  if (!(m > dead)) return { x: 0, y: 0 };
  const n = Math.min(1, (m - dead) / (1 - dead));
  const k = (n * n) / m;
  return { x: x * k, y: y * k };
}

function btn(gp: PadLike, i: number, threshold = 0.5): boolean {
  const b = gp.buttons[i];
  return !!b && (b.pressed || b.value > threshold);
}

/** Gamepad → intents. Shooter: A/RT fire, X reload, Y/LB/RB swap. Runner: A/RT/↑ jump, B/LT/↓ duck. */
export function padIntents(gp: PadLike, kind: ModeKind): Intents {
  const out = noIntents();
  out.pause = btn(gp, PAD.START);
  out.recenter = btn(gp, PAD.BACK) || btn(gp, PAD.RS);
  if (kind === 'runner') {
    out.jump = btn(gp, PAD.A) || btn(gp, PAD.RT, 0.4) || btn(gp, PAD.UP) || (gp.axes[1] ?? 0) < -0.6;
    out.duck = btn(gp, PAD.B) || btn(gp, PAD.LT, 0.4) || btn(gp, PAD.DOWN) || (gp.axes[1] ?? 0) > 0.6;
    return out;
  }
  out.fire = btn(gp, PAD.A) || btn(gp, PAD.RT, 0.4);
  out.reload = btn(gp, PAD.X);
  out.swap = btn(gp, PAD.Y) || btn(gp, PAD.LB) || btn(gp, PAD.RB);
  // left stick (or d-pad) moves the crosshair, the right stick adds a slower fine adjustment
  const ls = shapeStick(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
  const rs = shapeStick(gp.axes[2] ?? 0, gp.axes[3] ?? 0);
  const dx = (btn(gp, PAD.RIGHT) ? 1 : 0) - (btn(gp, PAD.LEFT) ? 1 : 0);
  const dy = (btn(gp, PAD.DOWN) ? 1 : 0) - (btn(gp, PAD.UP) ? 1 : 0);
  out.aim = { x: clamp1(ls.x + rs.x * 0.35 + dx * 0.6), y: clamp1(ls.y + rs.y * 0.35 + dy * 0.6) };
  return out;
}

/** Keyboard (KeyboardEvent.code values currently held) → intents. */
export function keyIntents(held: ReadonlySet<string>, kind: ModeKind): Intents {
  const out = noIntents();
  const any = (...codes: string[]) => codes.some((c) => held.has(c));
  out.pause = any('Escape', 'KeyP');
  out.recenter = any('KeyC');
  if (kind === 'runner') {
    out.jump = any('Space', 'Enter', 'NumpadEnter', 'ArrowUp', 'KeyW', 'PageUp');
    out.duck = any('ArrowDown', 'KeyS', 'ShiftLeft', 'ShiftRight', 'PageDown');
    return out;
  }
  // presenter remotes send PageUp/PageDown (or arrows): next page = fire, previous page = swap
  out.fire = any('Space', 'Enter', 'NumpadEnter', 'PageDown', 'KeyF');
  out.reload = any('KeyR');
  out.swap = any('KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight', 'PageUp');
  const ax = (any('ArrowRight', 'KeyD') ? 1 : 0) - (any('ArrowLeft', 'KeyA') ? 1 : 0);
  const ay = (any('ArrowDown', 'KeyS') ? 1 : 0) - (any('ArrowUp', 'KeyW') ? 1 : 0);
  const fine = any('AltLeft', 'AltRight') ? 0.3 : 0.75;
  out.aim = { x: ax * fine, y: ay * fine };
  return out;
}

/** Keys the game consumes during play (the browser must not scroll or activate buttons with them). */
export const GAME_KEYS = new Set([
  'Space',
  'Enter',
  'NumpadEnter',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyR',
  'KeyQ',
  'KeyE',
  'KeyF',
  'KeyC',
  'KeyP',
  'Escape',
]);

export function mergeIntents(a: Intents, b: Intents): Intents {
  return {
    fire: a.fire || b.fire,
    reload: a.reload || b.reload,
    swap: a.swap || b.swap,
    pause: a.pause || b.pause,
    recenter: a.recenter || b.recenter,
    jump: a.jump || b.jump,
    duck: a.duck || b.duck,
    aim: { x: clamp1(a.aim.x + b.aim.x), y: clamp1(a.aim.y + b.aim.y) },
  };
}

type Edge = Exclude<keyof Intents, 'aim'>;
const EDGES: Edge[] = ['fire', 'reload', 'swap', 'pause', 'recenter', 'jump', 'duck'];

/** Rising/falling edges between two frames. */
export function edges(prev: Intents, next: Intents): { pressed: Edge[]; released: Edge[] } {
  const pressed: Edge[] = [];
  const released: Edge[] = [];
  for (const k of EDGES) {
    if (next[k] && !prev[k]) pressed.push(k);
    else if (!next[k] && prev[k]) released.push(k);
  }
  return { pressed, released };
}

function clamp1(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
