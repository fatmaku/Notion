import type { GameModeId, WeaponId } from '../core/types';

/** URL query parameters used for demos, debugging and end-to-end tests. */
export interface Params {
  demo: boolean;
  mock: boolean;
  debug: boolean;
  seed: number | null;
  skipTo: 'play' | 'calibrate' | null;
  mode: GameModeId | null;
  weapons: WeaponId[] | null;
  night: boolean;
  noShake: boolean;
  round: number | null;
  /** e2e: deterministic scheduler timing, no audio. */
  test: boolean;
}

export function readParams(search = typeof location !== 'undefined' ? location.search : ''): Params {
  const q = new URLSearchParams(search);
  const flag = (k: string) => q.has(k) && q.get(k) !== '0' && q.get(k) !== 'false';
  const modes: GameModeId[] = ['front-shooter', 'side-shooter', 'side-runner'];
  const weaponIds: WeaponId[] = ['smg', 'grenade', 'rocket', 'milkshake', 'paint'];
  const mode = q.get('mode');
  const w = q.get('weapons');
  const skip = q.get('skipTo');
  return {
    demo: flag('demo'),
    mock: flag('mock') || flag('demo'),
    debug: flag('debug'),
    seed: q.has('seed') ? Number(q.get('seed')) : null,
    skipTo: skip === 'play' || skip === 'calibrate' ? skip : null,
    mode: mode && (modes as string[]).includes(mode) ? (mode as GameModeId) : null,
    weapons: w ? (w.split(',').filter((x) => (weaponIds as string[]).includes(x)) as WeaponId[]) : null,
    night: flag('night'),
    noShake: flag('noshake'),
    round: q.has('round') ? Number(q.get('round')) : null,
    test: flag('test'),
  };
}
