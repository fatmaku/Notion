import type { GameModeId, WeaponId } from '../../core/types';
import { Rng } from '../../core/rng';
import type { MissionResult, RoundEvent } from '../GameMode';

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
  { id: 'kill3', text: '3 Fahrzeuge ausschalten', goal: 3, reward: 500, modes: shooter, step: (e) => (e.kind === 'kill' ? 1 : 0) },
  { id: 'kill6', text: '6 Fahrzeuge ausschalten', goal: 6, reward: 900, modes: shooter, step: (e) => (e.kind === 'kill' ? 1 : 0) },
  { id: 'hits15', text: '15 Treffer landen', goal: 15, reward: 400, modes: shooter, step: (e) => (e.kind === 'hit' || e.kind === 'kill' ? 1 : 0) },
  { id: 'truck2', text: '2 LKW oder Busse treffen', goal: 2, reward: 500, modes: shooter, step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && (e.cls === 'truck' || e.cls === 'bus' || e.cls === 'train') ? 1 : 0) },
  { id: 'combo5', text: '5er-Combo erreichen', goal: 5, reward: 600, modes: 'all', absolute: true, step: (e) => e.combo ?? 0 },
  { id: 'far3', text: '3 Fernschüsse (kleine Ziele)', goal: 3, reward: 600, modes: shooter, step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && (e.size ?? 1) <= 0.12 ? 1 : 0) },
  { id: 'center5', text: '5 Volltreffer (mittig)', goal: 5, reward: 500, modes: shooter, step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && e.centered ? 1 : 0) },
  { id: 'paint50', text: 'Ein Fahrzeug zu 50 % lackieren', goal: 1, reward: 500, modes: shooter, needsWeapon: ['paint'], step: (e) => (e.kind === 'bonus' && e.id === 'coverage50' ? 1 : 0) },
  { id: 'paintFull', text: 'Ein Fahrzeug komplett lackieren', goal: 1, reward: 800, modes: shooter, needsWeapon: ['paint'], step: (e) => (e.kind === 'bonus' && e.id === 'coverage100' ? 1 : 0) },
  { id: 'shake2', text: '2 Autos mit Milkshake wegrutschen lassen', goal: 2, reward: 500, modes: shooter, needsWeapon: ['milkshake'], step: (e) => (e.kind === 'kill' && e.weapon === 'milkshake' ? 1 : 0) },
  { id: 'multi', text: 'Mehrfachtreffer mit einer Granate', goal: 1, reward: 700, modes: shooter, needsWeapon: ['grenade'], step: (e) => (e.kind === 'kill' && e.weapon === 'grenade' && (e.multi ?? 1) >= 2 ? 1 : 0) },
  { id: 'rocket1', text: 'Eine Rakete ins Ziel bringen', goal: 1, reward: 500, modes: shooter, needsWeapon: ['rocket'], step: (e) => (e.kind === 'kill' && e.weapon === 'rocket' ? 1 : 0) },
  { id: 'smg2', text: '2 Fahrzeuge nur mit der MP zerlegen', goal: 2, reward: 500, modes: shooter, needsWeapon: ['smg'], step: (e) => (e.kind === 'kill' && e.weapon === 'smg' ? 1 : 0) },
  { id: 'egg3', text: '3 Autos mit Eiern treffen', goal: 3, reward: 400, modes: shooter, needsWeapon: ['egg'], step: (e) => (e.kind === 'hit' && e.weapon === 'egg' ? 1 : 0) },
  { id: 'wash1', text: 'Eine Autowäsche mit der Wasserbombe', goal: 1, reward: 400, modes: shooter, needsWeapon: ['waterballoon'], step: (e) => (e.kind === 'bonus' && e.id === 'carwash' ? 1 : 0) },
  { id: 'freeze2', text: '2 Autos einfrieren', goal: 2, reward: 500, modes: shooter, needsWeapon: ['snowball'], step: (e) => (e.kind === 'kill' && e.weapon === 'snowball' ? 1 : 0) },
  { id: 'pow3', text: '3 Volltreffer mit dem Boxhandschuh', goal: 3, reward: 500, modes: shooter, needsWeapon: ['glove'], step: (e) => ((e.kind === 'hit' || e.kind === 'kill') && e.weapon === 'glove' && e.centered ? 1 : 0) },
  { id: 'jump10', text: '10 Hindernisse überspringen', goal: 10, reward: 500, modes: ['side-runner'], step: (e) => (e.kind === 'obstacle' ? 1 : 0) },
  { id: 'jump25', text: '25 Hindernisse überspringen', goal: 25, reward: 900, modes: ['side-runner'], step: (e) => (e.kind === 'obstacle' ? 1 : 0) },
  { id: 'coins8', text: '8 Münzen sammeln', goal: 8, reward: 400, modes: ['side-runner'], step: (e) => (e.kind === 'coin' ? 1 : 0) },
  { id: 'survive45', text: '45 Sekunden ohne Treffer', goal: 45, reward: 700, modes: ['side-runner'], absolute: true, step: (e) => (e.kind === 'bonus' && e.id === 'unhurt' ? e.size ?? 0 : 0) },
  { id: 'duck5', text: '5 Vögeln geduckt ausweichen', goal: 5, reward: 500, modes: ['side-runner'], step: (e) => (e.kind === 'obstacle' && e.cls === 'bird' ? 1 : 0) },
  { id: 'gold2', text: '2 goldene Vögel fangen', goal: 2, reward: 600, modes: ['side-runner'], step: (e) => (e.kind === 'bonus' && e.id === 'goldbird' ? 1 : 0) },
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
