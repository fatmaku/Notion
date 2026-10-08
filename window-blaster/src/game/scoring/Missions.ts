import type { GameModeId, WeaponId } from '../../core/types';
import { Rng } from '../../core/rng';
import type { MissionResult, RoundEvent } from '../GameMode';
import { T } from '../../ui/i18n';

export interface MissionDef {
  id: string;
  text: string;
  goal: number;
  reward: number;
  modes: GameModeId[] | 'all';
  /** Only offered when one of these weapons is equipped. */
  needsWeapon?: WeaponId[];
  /** Progress contribution of one event (0 if irrelevant). Return 'set:<n>' via setProgress for max-type goals. */
  step: (e: RoundEvent) => number;
  /** For "reach X" goals: derive progress from the event instead of accumulating. */
  absolute?: boolean;
}

const shooter: GameModeId[] = ['front-shooter', 'side-shooter'];

export const MISSION_POOL: MissionDef[] = [
  { id: 'kill3', get text() { return T.missionKill3; }, goal: 3, reward: 500, modes: shooter, step: (e) => (e.kind === 'kill' ? 1 : 0) },
  { id: 'kill6', get text() { return T.missionKill6; }, goal: 6, reward: 900, modes: shooter, step: (e) => (e.kind === 'kill' ? 1 : 0) },
  { id: 'hits15', get text() { return T.missionHits15; }, goal: 15, reward: 400, modes: shooter, step: (e) => (e.kind === 'hit' || e.kind === 'kill' ? 1 : 0) },
  { id: 'truck2', get text() { return T.missionTruck2; }, goal: 2, reward: 500, modes: shooter, step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && (e.cls === 'truck' || e.cls === 'bus' || e.cls === 'train') ? 1 : 0) },
  { id: 'combo5', get text() { return T.missionCombo5; }, goal: 5, reward: 600, modes: 'all', absolute: true, step: (e) => e.combo ?? 0 },
  { id: 'far3', get text() { return T.missionFar3; }, goal: 3, reward: 600, modes: shooter, step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && (e.size ?? 1) <= 0.12 ? 1 : 0) },
  { id: 'center5', get text() { return T.missionCenter5; }, goal: 5, reward: 500, modes: shooter, step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && e.centered ? 1 : 0) },
  { id: 'paint50', get text() { return T.missionPaint50; }, goal: 1, reward: 500, modes: shooter, needsWeapon: ['paint'], step: (e) => (e.kind === 'bonus' && e.id === 'coverage50' ? 1 : 0) },
  { id: 'paintFull', get text() { return T.missionPaintFull; }, goal: 1, reward: 800, modes: shooter, needsWeapon: ['paint'], step: (e) => (e.kind === 'bonus' && e.id === 'coverage100' ? 1 : 0) },
  { id: 'shake2', get text() { return T.missionShake2; }, goal: 2, reward: 500, modes: shooter, needsWeapon: ['milkshake'], step: (e) => (e.kind === 'kill' && e.weapon === 'milkshake' ? 1 : 0) },
  { id: 'multi', get text() { return T.missionMulti; }, goal: 1, reward: 700, modes: shooter, needsWeapon: ['grenade'], step: (e) => (e.kind === 'kill' && e.weapon === 'grenade' && (e.multi ?? 1) >= 2 ? 1 : 0) },
  { id: 'rocket1', get text() { return T.missionRocket1; }, goal: 1, reward: 500, modes: shooter, needsWeapon: ['rocket'], step: (e) => (e.kind === 'kill' && e.weapon === 'rocket' ? 1 : 0) },
  { id: 'smg2', get text() { return T.missionSmg2; }, goal: 2, reward: 500, modes: shooter, needsWeapon: ['smg'], step: (e) => (e.kind === 'kill' && e.weapon === 'smg' ? 1 : 0) },
  { id: 'egg3', get text() { return T.missionEgg3; }, goal: 3, reward: 400, modes: shooter, needsWeapon: ['egg'], step: (e) => (e.kind === 'hit' && e.weapon === 'egg' ? 1 : 0) },
  { id: 'wash1', get text() { return T.missionWash1; }, goal: 1, reward: 400, modes: shooter, needsWeapon: ['waterballoon'], step: (e) => (e.kind === 'bonus' && e.id === 'carwash' ? 1 : 0) },
  { id: 'freeze2', get text() { return T.missionFreeze2; }, goal: 2, reward: 500, modes: shooter, needsWeapon: ['snowball'], step: (e) => (e.kind === 'kill' && e.weapon === 'snowball' ? 1 : 0) },
  { id: 'pow3', get text() { return T.missionPow3; }, goal: 3, reward: 500, modes: shooter, needsWeapon: ['glove'], step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && e.weapon === 'glove' && e.centered ? 1 : 0) },
  { id: 'jump10', get text() { return T.missionJump10; }, goal: 10, reward: 500, modes: ['side-runner'], step: (e) => (e.kind === 'obstacle' ? 1 : 0) },
  { id: 'jump25', get text() { return T.missionJump25; }, goal: 25, reward: 900, modes: ['side-runner'], step: (e) => (e.kind === 'obstacle' ? 1 : 0) },
  { id: 'coins8', get text() { return T.missionCoins8; }, goal: 8, reward: 400, modes: ['side-runner'], step: (e) => (e.kind === 'coin' ? 1 : 0) },
  { id: 'survive45', get text() { return T.missionSurvive45; }, goal: 45, reward: 700, modes: ['side-runner'], absolute: true, step: (e) => (e.kind === 'bonus' && e.id === 'unhurt' ? e.size ?? 0 : 0) },
  { id: 'duck5', get text() { return T.missionDuck5; }, goal: 5, reward: 500, modes: ['side-runner'], step: (e) => (e.kind === 'obstacle' && e.cls === 'bird' ? 1 : 0) },
  { id: 'gold2', get text() { return T.missionGold2; }, goal: 2, reward: 600, modes: ['side-runner'], step: (e) => (e.kind === 'bonus' && e.id === 'goldbird' ? 1 : 0) },
];

export class Missions {
  readonly active: { def: MissionDef; progress: number; done: boolean }[] = [];

  constructor(mode: GameModeId, weapons: WeaponId[], seed: number, count = 3) {
    const rng = new Rng(seed ^ 0x5eed);
    const pool = MISSION_POOL.filter((m) => (m.modes === 'all' || m.modes.includes(mode)) && (!m.needsWeapon || m.needsWeapon.some((w) => weapons.includes(w))));
    const chosen: MissionDef[] = [];
    const copy = [...pool];
    while (chosen.length < count && copy.length) {
      const i = Math.floor(rng.next() * copy.length);
      chosen.push(copy.splice(i, 1)[0]);
    }
    for (const def of chosen) this.active.push({ def, progress: 0, done: false });
  }

  /** Feed an event; returns missions completed by it. */
  onEvent(e: RoundEvent): MissionDef[] {
    const completed: MissionDef[] = [];
    for (const m of this.active) {
      if (m.done) continue;
      const s = m.def.step(e);
      if (m.def.absolute) m.progress = Math.max(m.progress, s);
      else m.progress += s;
      if (m.progress >= m.def.goal) {
        m.progress = m.def.goal;
        m.done = true;
        completed.push(m.def);
      }
    }
    return completed;
  }

  results(): MissionResult[] {
    return this.active.map((m) => ({ id: m.def.id, text: m.def.text, done: m.done, progress: m.progress, goal: m.def.goal, reward: m.def.reward }));
  }
}
