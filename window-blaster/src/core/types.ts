// Shared primitive types. All geometry is expressed in VIDEO pixels (the camera
// frame's intrinsic size); the renderer maps to CSS pixels in exactly one place.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Corners in order TL, TR, BR, BL (video px). */
export type Quad = [Vec2, Vec2, Vec2, Vec2];

export type TargetClass = 'car' | 'truck' | 'bus' | 'train' | 'sign' | 'light' | 'person' | 'bike' | 'other';

/** Classes the shooter may fire at. People and two-wheelers are never targets. */
export const SHOOTABLE: ReadonlySet<TargetClass> = new Set<TargetClass>(['car', 'truck', 'bus', 'train']);
/** Classes that only accept paint (harmless decoration targets). */
export const PAINTABLE_ONLY: ReadonlySet<TargetClass> = new Set<TargetClass>(['sign', 'light']);

export interface Detection {
  box: Rect;
  cls: TargetClass;
  score: number;
  /** Capture timestamp (performance.now() domain, ms). */
  ts: number;
}

export type GameModeId = 'front-shooter' | 'side-shooter' | 'side-runner';
export type VehicleType = 'car' | 'train' | 'bus' | 'other';
export type WeaponId = 'smg' | 'grenade' | 'rocket' | 'milkshake' | 'paint' | 'egg' | 'tomato' | 'snowball' | 'waterballoon' | 'banana' | 'tp' | 'laser' | 'glove';
export const ALL_WEAPONS: readonly WeaponId[] = ['smg', 'grenade', 'rocket', 'milkshake', 'paint', 'egg', 'tomato', 'snowball', 'waterballoon', 'banana', 'tp', 'laser', 'glove'];
export type WindowSide = 'left' | 'right' | 'front';
