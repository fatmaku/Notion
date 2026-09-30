import type { Detection, Rect, TargetClass, Vec2 } from '../core/types';
import { center, iou, scaleAbout } from '../core/math/rect';

export interface TrackerConfig {
  /** IoU needed to associate a detection with a track's predicted box. */
  iouGate: number;
  /** Fallback gate on 1.6× expanded boxes (fast movers / small boxes). */
  expandedGate: number;
  confirmHits: number;
  maxMisses: number;
  /** Drop a track that has not been matched for this long (ms). */
  maxCoastMs: number;
  /** Alpha-beta filter gains. */
  posAlpha: number;
  velBeta: number;
  sizeAlpha: number;
  maxTracks: number;
  frame: { w: number; h: number };
}

export const DEFAULT_TRACKER: TrackerConfig = {
  iouGate: 0.25,
  expandedGate: 0.12,
  confirmHits: 2,
  maxMisses: 8,
  maxCoastMs: 700,
  posAlpha: 0.6,
  velBeta: 0.35,
  sizeAlpha: 0.4,
  maxTracks: 24,
  frame: { w: 1280, h: 720 },
};

export type TrackState = 'tentative' | 'confirmed' | 'coasting';

const GROUP: Record<TargetClass, string> = {
  car: 'vehicle',
  truck: 'vehicle',
  bus: 'vehicle',
  train: 'vehicle',
  sign: 'sign',
  light: 'light',
  person: 'person',
  bike: 'bike',
  other: 'other',
};

export class Track {
  box: Rect;
  /** px per ms */
  vel: Vec2 = { x: 0, y: 0 };
  hits = 1;
  misses = 0;
  state: TrackState = 'tentative';
  score: number;
  lastTs: number;
  lastMatchTs: number;
  readonly firstTs: number;
  private votes = new Map<TargetClass, number>();
  cls: TargetClass;

  constructor(
    readonly id: number,
    det: Detection,
  ) {
    this.box = { ...det.box };
    this.cls = det.cls;
    this.score = det.score;
    this.lastTs = det.ts;
    this.lastMatchTs = det.ts;
    this.firstTs = det.ts;
    this.votes.set(det.cls, det.score);
  }

  /** Extrapolated box at time t (ms). Extrapolation is capped to keep coasting sane. */
  predict(t: number): Rect {
    const dt = Math.max(-100, Math.min(900, t - this.lastTs));
    return { x: this.box.x + this.vel.x * dt, y: this.box.y + this.vel.y * dt, w: this.box.w, h: this.box.h };
  }

  get center(): Vec2 {
    return center(this.box);
  }

  get confirmed(): boolean {
    return this.state !== 'tentative';
  }

  /** Age since first seen (ms) at time t. */
  age(t: number): number {
    return t - this.firstTs;
  }

  /** Speed in px/s. */
  get speed(): number {
    return Math.hypot(this.vel.x, this.vel.y) * 1000;
  }

  /** @internal */
  applyMatch(det: Detection, cfg: TrackerConfig): void {
    const dt = Math.max(8, det.ts - this.lastTs);
    const pred = this.predict(det.ts);
    const rx = det.box.x + det.box.w / 2 - (pred.x + pred.w / 2);
    const ry = det.box.y + det.box.h / 2 - (pred.y + pred.h / 2);
    // alpha-beta on the center, EMA on the size
    const w = pred.w + (det.box.w - pred.w) * cfg.sizeAlpha;
    const h = pred.h + (det.box.h - pred.h) * cfg.sizeAlpha;
    const cx = pred.x + pred.w / 2 + rx * cfg.posAlpha;
    const cy = pred.y + pred.h / 2 + ry * cfg.posAlpha;
    this.vel = { x: this.vel.x + (cfg.velBeta * rx) / dt, y: this.vel.y + (cfg.velBeta * ry) / dt };
    // clamp absurd velocities (> 3 frame widths per second)
    const vmax = (cfg.frame.w * 3) / 1000;
    this.vel.x = Math.max(-vmax, Math.min(vmax, this.vel.x));
    this.vel.y = Math.max(-vmax, Math.min(vmax, this.vel.y));
    this.box = { x: cx - w / 2, y: cy - h / 2, w, h };
    this.lastTs = det.ts;
    this.lastMatchTs = det.ts;
    this.hits++;
    this.misses = 0;
    this.score = det.score;
    this.votes.set(det.cls, (this.votes.get(det.cls) ?? 0) + det.score);
    let best: TargetClass = this.cls;
    let bestV = -1;
    for (const [c, v] of this.votes) {
      if (v > bestV) {
        bestV = v;
        best = c;
      }
    }
    this.cls = best;
    if (this.hits >= cfg.confirmHits) this.state = 'confirmed';
  }

  /** @internal */
  applyMiss(ts: number): void {
    this.box = this.predict(ts);
    this.lastTs = ts;
    this.misses++;
    // bleed velocity while coasting so lost tracks don't fly off
    this.vel = { x: this.vel.x * 0.85, y: this.vel.y * 0.85 };
    if (this.state === 'confirmed') this.state = 'coasting';
  }
}

export interface TrackerUpdate {
  matched: number;
  created: number;
  removed: Track[];
}

/**
 * Multi-object tracker: greedy IoU association on predicted boxes, alpha-beta
 * smoothing, class voting, confirmation after N hits and bounded coasting so
 * game effects can stay attached to a vehicle between (sparse) detections.
 */
export class Tracker {
  readonly tracks: Track[] = [];
  private nextId = 1;
  readonly cfg: TrackerConfig;

  constructor(cfg: Partial<TrackerConfig> = {}) {
    this.cfg = { ...DEFAULT_TRACKER, ...cfg };
  }

  update(dets: readonly Detection[], ts: number): TrackerUpdate {
    const cfg = this.cfg;
    const preds = this.tracks.map((t) => t.predict(ts));
    type Pair = { ti: number; di: number; s: number };
    const pairs: Pair[] = [];
    for (let ti = 0; ti < this.tracks.length; ti++) {
      const tr = this.tracks[ti];
      const pb = preds[ti];
      const pbx = scaleAbout(pb, 1.6);
      for (let di = 0; di < dets.length; di++) {
        const d = dets[di];
        if (GROUP[d.cls] !== GROUP[tr.cls]) continue;
        const s = iou(pb, d.box);
        if (s >= cfg.iouGate) {
          pairs.push({ ti, di, s: 1 + s });
        } else {
          const se = iou(pbx, scaleAbout(d.box, 1.6));
          if (se >= cfg.expandedGate) pairs.push({ ti, di, s: se });
        }
      }
    }
    pairs.sort((a, b) => b.s - a.s);
    const usedT = new Set<number>();
    const usedD = new Set<number>();
    let matched = 0;
    for (const p of pairs) {
      if (usedT.has(p.ti) || usedD.has(p.di)) continue;
      usedT.add(p.ti);
      usedD.add(p.di);
      this.tracks[p.ti].applyMatch(dets[p.di], cfg);
      matched++;
    }
    for (let ti = 0; ti < this.tracks.length; ti++) if (!usedT.has(ti)) this.tracks[ti].applyMiss(ts);

    let created = 0;
    for (let di = 0; di < dets.length; di++) {
      if (usedD.has(di)) continue;
      if (this.tracks.length >= cfg.maxTracks) break;
      this.tracks.push(new Track(this.nextId++, dets[di]));
      created++;
    }

    const removed: Track[] = [];
    const W = cfg.frame.w;
    const H = cfg.frame.h;
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const t = this.tracks[i];
      const b = t.box;
      const offscreen = b.x + b.w < -b.w || b.x > W + b.w || b.y + b.h < -b.h || b.y > H + b.h;
      const tooManyMisses = t.misses > cfg.maxMisses || (t.state === 'tentative' && t.misses > 2);
      const stale = ts - t.lastMatchTs > cfg.maxCoastMs;
      if (offscreen || tooManyMisses || stale) removed.push(...this.tracks.splice(i, 1));
    }
    return { matched, created, removed };
  }

  /** Confirmed + coasting tracks (what the game should consider real objects). */
  get active(): Track[] {
    return this.tracks.filter((t) => t.state !== 'tentative');
  }

  byId(id: number): Track | undefined {
    return this.tracks.find((t) => t.id === id);
  }

  remove(id: number): void {
    const i = this.tracks.findIndex((t) => t.id === id);
    if (i >= 0) this.tracks.splice(i, 1);
  }

  clear(): void {
    this.tracks.length = 0;
  }

  /** Mean horizontal velocity (px/s) of confirmed tracks, used to infer world flow direction. */
  meanVx(): number {
    const a = this.active;
    if (!a.length) return 0;
    return (a.reduce((s, t) => s + t.vel.x, 0) / a.length) * 1000;
  }
}
