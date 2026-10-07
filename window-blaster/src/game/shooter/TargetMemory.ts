import type { Rect, TargetClass, Vec2 } from '../../core/types';
import { iou } from '../../core/math/rect';
import type { Decal } from '../effects/Decals';
import { HP } from '../weapons/configs';

export interface TargetState {
  hp: number;
  maxHp: number;
  state: 'alive' | 'destroyed' | 'skidding' | 'gone';
  decals: Decal[];
  coverage: number;
  coverageStep: number;
  lastHitAt: number;
  /** last known box / velocity so paint survives a tracker re-identification */
  lastBox: Rect | null;
  lastVel: Vec2;
  pendingSkid: boolean;
}

interface LostState {
  id: number;
  st: TargetState;
  lostAt: number;
}

/** What the memory needs to know about a live track. */
export interface TrackView {
  box: Rect;
  vel: Vec2;
}

export const LOST_TTL_MS = 1500;
export const LOST_MAX = 12;
/** IoU needed to hand a lost state to a new track: painted/damaged cars are lenient, destroyed ones strict. */
export const ADOPT_IOU_ALIVE = 0.2;
export const ADOPT_IOU_DESTROYED = 0.45;

/**
 * Per-vehicle game state keyed by tracker id, with memory across re-identifications:
 * when the tracker loses a car for a moment and gives it a new id, the paint, damage
 * and destroyed state carry over, and effects that follow the old id keep following
 * through the alias map.
 */
export class TargetMemory {
  readonly targets = new Map<number, TargetState>();
  private readonly lost: LostState[] = [];
  private readonly alias = new Map<number, number>();

  get(id: number): TargetState | undefined {
    return this.targets.get(id);
  }

  /** Follows old ids to the track that replaced them. */
  resolve(id: number): number {
    for (let i = 0; i < 8; i++) {
      const next = this.alias.get(id);
      if (next === undefined) break;
      id = next;
    }
    return id;
  }

  /** State for a track; a fresh track may adopt the state of a recently lost one it overlaps with. */
  ensure(id: number, cls: TargetClass, box: Rect | null, now: number): TargetState {
    let s = this.targets.get(id);
    if (s) return s;
    let adopted: TargetState | null = null;
    if (box) {
      let bestI = -1;
      let bestScore = ADOPT_IOU_ALIVE;
      for (let i = 0; i < this.lost.length; i++) {
        const l = this.lost[i];
        if (!l.st.lastBox) continue;
        const dt = now - l.lostAt;
        const pb = { ...l.st.lastBox, x: l.st.lastBox.x + l.st.lastVel.x * dt, y: l.st.lastBox.y + l.st.lastVel.y * dt };
        const score = iou(pb, box);
        // a destroyed car must not be "inherited" by the next car in the lane: demand a closer match
        if (score > bestScore && (l.st.state === 'alive' || score > ADOPT_IOU_DESTROYED)) {
          bestScore = score;
          bestI = i;
        }
      }
      if (bestI >= 0) {
        const l = this.lost.splice(bestI, 1)[0];
        adopted = l.st;
        this.alias.set(l.id, id);
        if (this.alias.size > 64) this.alias.delete(this.alias.keys().next().value as number);
      }
    }
    const hp = HP[cls] ?? 3;
    s = adopted ?? { hp, maxHp: hp, state: 'alive', decals: [], coverage: 0, coverageStep: 0, lastHitAt: 0, lastBox: null, lastVel: { x: 0, y: 0 }, pendingSkid: false };
    this.targets.set(id, s);
    return s;
  }

  /** Remember boxes of known targets; move vanished tracks worth remembering to the lost list. */
  sync(now: number, view: (id: number) => TrackView | null): void {
    for (const [id, st] of this.targets) {
      const tr = view(id);
      if (tr) {
        st.lastBox = tr.box;
        st.lastVel = { ...tr.vel };
      } else {
        this.targets.delete(id);
        // keep damaged, painted and destroyed cars in mind: a re-detected wreck must not come back to life
        if (st.state !== 'alive' || st.decals.length || st.hp < st.maxHp) this.lost.push({ id, st, lostAt: now });
      }
    }
    while (this.lost.length && now - this.lost[0].lostAt > LOST_TTL_MS) this.lost.shift();
    if (this.lost.length > LOST_MAX) this.lost.splice(0, this.lost.length - LOST_MAX);
  }

  get lostCount(): number {
    return this.lost.length;
  }
}
