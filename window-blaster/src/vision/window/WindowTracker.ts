import type { Quad, Vec2 } from '../../core/types';
import { OneEuro2 } from '../../core/math/filters';
import { quadCenter, quadIoU } from '../../core/math/polygon';
import { rotateAround } from '../../core/math/vec';
import { FocalCalibrator } from '../../sensors/FocalCalibrator';
import type { RotationSample } from '../../sensors/Motion';
import { estimateWindow, fullQuad, type WindowEstimate } from './WindowEstimator';
import { DEFAULT_SNAP, snapQuad } from './EdgeSnapper';
import type { GrayFrame } from './FrameGrabber';
import type { WindowMode, WindowState } from './types';

export interface WindowTrackerOptions {
  frameW: number;
  frameH: number;
  hfovDeg: number;
  /** Camera pipeline latency: gyro is integrated up to now − latency. */
  latencyMs: number;
  estimateEveryMs?: number;
}

/**
 * Keeps the window pane quad locked on the glass while the phone moves:
 * gyro prediction → edge-snap measurement → One-Euro smoothing, with a slow
 * brightness-based observer for (re-)initialisation and a confidence state.
 */
/** How far edge snapping may reshape a hand-placed corner in total / per observation (video px at 720p). */
const MANUAL_MAX_DRIFT_PX = 8;
const MANUAL_SHAPE_STEP_PX = 1.5;

export class WindowTracker {
  /** Unfiltered estimate (video px). */
  private quad: Quad;
  private filtered: Quad;
  private readonly filters: OneEuro2[] = [];
  private mode: WindowMode = 'fullframe';
  private confidence = 0;
  private manual = false;
  private manualQuad: Quad | null = null;
  /** The user is dragging corners: no gyro, no snapping, no smoothing until released. */
  private editing = false;
  private lastEstimateAt = -Infinity;
  private lastGoodSnapAt = -Infinity;
  private mismatchSince: number | null = null;
  private fullSince: number | null = null;
  private lastGray: GrayFrame | null = null;
  private lastSnapCenter: Vec2 | null = null;
  private panSinceSnap = 0;
  private tiltSinceSnap = 0;
  private accumSince = 0;
  private lastMotionT: number | null = null;
  /** Pending gyro motion not yet applied (integrated up to now − latency). */
  private readonly motionQueue: RotationSample[] = [];
  readonly focal: FocalCalibrator;
  lastEstimate: WindowEstimate | null = null;
  groundV = 0.82;
  motionAlive = false;
  private o: Required<WindowTrackerOptions>;

  constructor(opts: WindowTrackerOptions) {
    this.o = { estimateEveryMs: 500, ...opts };
    const f0 = opts.frameW / 2 / Math.tan((opts.hfovDeg * Math.PI) / 360);
    this.focal = new FocalCalibrator(f0, opts.frameW * 0.6, opts.frameW * 1.6);
    this.quad = fullQuad(opts.frameW, opts.frameH);
    this.filtered = this.quad;
    for (let i = 0; i < 4; i++) this.filters.push(new OneEuro2(1.2, 0.03));
  }

  setHfov(deg: number): void {
    this.focal.reset(this.o.frameW / 2 / Math.tan((deg * Math.PI) / 360));
  }

  setLatency(ms: number): void {
    this.o.latencyMs = ms;
  }

  /** User confirmed corners (video px). */
  setManual(q: Quad): void {
    this.quad = q.map((p) => ({ ...p })) as Quad;
    this.manual = true;
    this.lockedFull = false;
    this.manualQuad = this.quad;
    this.mode = 'tracking';
    this.confidence = 1;
    this.resetFilters();
    this.lastSnapCenter = quadCenter(this.quad);
    this.panSinceSnap = 0;
    this.tiltSinceSnap = 0;
  }

  private lockedFull = false;

  /** Start of a manual adjustment: the quad follows the finger exactly. */
  beginEdit(): void {
    this.editing = true;
    this.motionQueue.length = 0;
    this.lastMotionT = null;
  }

  /** Finger lifted: keep the manual quad, from now on only refine it gently. */
  endEdit(): void {
    this.editing = false;
    this.lastMotionT = null;
    this.resetFilters();
  }

  get isEditing(): boolean {
    return this.editing;
  }

  /** Whole frame is the play area – no tracking. `lock` = explicit user choice (observer won't re-init). */
  setFullFrame(lock = false): void {
    this.quad = fullQuad(this.o.frameW, this.o.frameH);
    this.manual = false;
    this.manualQuad = null;
    this.lockedFull = lock;
    this.mode = 'fullframe';
    this.confidence = 1;
    this.resetFilters();
  }

  private resetFilters(): void {
    for (const f of this.filters) f.reset();
    this.filtered = this.quad;
  }

  /** Re-detect from the latest frame; fall back to the manual quad. */
  recenter(): boolean {
    this.lockedFull = false;
    if (this.lastGray) {
      const est = estimateWindow(this.lastGray.gray, this.lastGray.w, this.lastGray.h);
      this.lastEstimate = est;
      if (est.kind === 'window' && est.confidence >= 0.35) {
        this.quad = est.quad.map((p) => ({ x: p.x * this.lastGray!.scale, y: p.y * this.lastGray!.scale })) as Quad;
        this.mode = 'tracking';
        this.confidence = est.confidence;
        this.resetFilters();
        this.lastSnapCenter = quadCenter(this.quad);
        return true;
      }
      if (est.kind === 'fullframe') {
        this.setFullFrame();
        return true;
      }
    }
    if (this.manualQuad) {
      this.setManual(this.manualQuad);
      return true;
    }
    return false;
  }

  onMotion(s: RotationSample): void {
    this.motionAlive = true;
    this.motionQueue.push(s);
    if (this.motionQueue.length > 400) this.motionQueue.shift();
  }

  /** Apply queued gyro samples whose timestamp is older than now − latency. */
  private applyMotion(now: number): void {
    if (this.mode === 'fullframe') {
      this.motionQueue.length = 0;
      return;
    }
    const until = now - this.o.latencyMs;
    while (this.motionQueue.length && this.motionQueue[0].t <= until) {
      const s = this.motionQueue.shift()!;
      if (this.lastMotionT !== null) {
        const dt = Math.min(0.1, Math.max(0, (s.t - this.lastMotionT) / 1000));
        // Right-hand-rule derivation: camera pans left ⇒ scene (and the window
        // frame) moves right in the image, so dx = +f·pan·dt; same for tilt.
        // `sign` corrects devices whose sensor axes disagree.
        const sign = this.focal.sign === 0 ? 1 : this.focal.sign;
        const f = this.focal.f;
        const dx = sign * f * s.pan * dt;
        const dy = sign * f * s.tilt * dt;
        const roll = s.roll * dt;
        this.panSinceSnap += s.pan * dt;
        this.tiltSinceSnap += s.tilt * dt;
        const c = { x: this.o.frameW / 2, y: this.o.frameH / 2 };
        const move = (p: Vec2): Vec2 => {
          const r = Math.abs(roll) > 1e-5 ? rotateAround(p, c, roll) : p;
          return { x: r.x + dx, y: r.y + dy };
        };
        this.quad = this.quad.map(move) as Quad;
        // the hand-placed anchor rotates with the phone too
        if (this.manual && this.manualQuad) this.manualQuad = this.manualQuad.map(move) as Quad;
      }
      this.lastMotionT = s.t;
    }
  }

  /** Feed a downsampled gray frame (~10–20 Hz). */
  observe(frame: GrayFrame): void {
    this.lastGray = frame;
    const now = frame.t;
    if (this.editing) {
      this.motionQueue.length = 0;
      this.filtered = this.quad;
      return;
    }
    this.applyMotion(now);
    const s = frame.scale;

    // slow observer
    if (now - this.lastEstimateAt >= this.o.estimateEveryMs) {
      this.lastEstimateAt = now;
      const est = estimateWindow(frame.gray, frame.w, frame.h);
      this.lastEstimate = est;
      const estVideo = est.quad.map((p) => ({ x: p.x * s, y: p.y * s })) as Quad;
      if (est.kind === 'fullframe' && !this.manual) {
        this.fullSince ??= now;
        if (now - this.fullSince > 1500 && this.mode !== 'fullframe') this.setFullFrame();
      } else this.fullSince = null;
      if (est.kind === 'window' && est.confidence >= 0.45 && !this.lockedFull) {
        if (this.mode === 'fullframe' || this.mode === 'off') {
          if (!this.manual) {
            this.quad = estVideo;
            this.mode = 'degraded';
            this.confidence = est.confidence;
            this.resetFilters();
            this.lastSnapCenter = quadCenter(this.quad);
          }
        } else if (quadIoU(estVideo, this.quad) < 0.5) {
          this.mismatchSince ??= now;
          if (now - this.mismatchSince > 1500 && !this.manual) {
            this.quad = estVideo;
            this.resetFilters();
            this.mismatchSince = null;
          }
        } else this.mismatchSince = null;
      }
    }

    if (this.mode === 'fullframe') {
      this.filtered = this.quad;
      return;
    }

    // measurement: edge snap on the (gyro-predicted) quad
    const qGray = this.quad.map((p) => ({ x: p.x / s, y: p.y / s })) as Quad;
    // a hand-placed quad is only refined within a few pixels – the user's corners win
    const opts = { ...DEFAULT_SNAP, radius: this.manual ? 5 : this.motionAlive ? 8 : 14 };
    const snap = snapQuad(frame.gray, frame.w, frame.h, qGray, opts);
    if (snap.confidence >= 0.35) {
      const snapped = snap.quad.map((p) => ({ x: p.x * s, y: p.y * s })) as Quad;
      const k = Math.min(0.85, 0.35 + snap.confidence * 0.6);
      if (this.manual && this.manualQuad) {
        // Hand-placed quad: follow the COMMON motion of all corners (the window really moved, or the
        // gyro was off), but keep the SHAPE the user set – a single corner may only creep a few
        // pixels, never over to another edge. The median translation ignores one outlier corner.
        const d = this.quad.map((p, i) => ({ x: (snapped[i].x - p.x) * k, y: (snapped[i].y - p.y) * k }));
        const med = (vs: number[]) => {
          const a = [...vs].sort((u, v) => u - v);
          return (a[1] + a[2]) / 2;
        };
        const common = { x: med(d.map((v) => v.x)), y: med(d.map((v) => v.y)) };
        const unit = this.o.frameH / 720;
        const perStep = MANUAL_SHAPE_STEP_PX * unit;
        const maxDrift = MANUAL_MAX_DRIFT_PX * unit;
        const anchor = this.manualQuad.map((p) => ({ x: p.x + common.x, y: p.y + common.y })) as Quad;
        this.manualQuad = anchor;
        this.quad = this.quad.map((p, i) => {
          let rx = d[i].x - common.x;
          let ry = d[i].y - common.y;
          const rl = Math.hypot(rx, ry);
          if (rl > perStep) {
            rx *= perStep / rl;
            ry *= perStep / rl;
          }
          const nx = p.x + common.x + rx;
          const ny = p.y + common.y + ry;
          const ax = nx - anchor[i].x;
          const ay = ny - anchor[i].y;
          const al = Math.hypot(ax, ay);
          return al > maxDrift ? { x: anchor[i].x + (ax * maxDrift) / al, y: anchor[i].y + (ay * maxDrift) / al } : { x: nx, y: ny };
        }) as Quad;
      } else {
        this.quad = this.quad.map((p, i) => ({ x: p.x + (snapped[i].x - p.x) * k, y: p.y + (snapped[i].y - p.y) * k })) as Quad;
      }
      this.lastGoodSnapAt = now;
      this.confidence = this.confidence * 0.7 + snap.confidence * 0.3;
      // focal / sign calibration: measured window shift vs. integrated gyro pan,
      // accumulated across snaps until the rotation is large enough to be meaningful
      const c = quadCenter(snapped);
      if (!this.lastSnapCenter || !this.motionAlive) {
        this.lastSnapCenter = c;
        this.panSinceSnap = 0;
        this.tiltSinceSnap = 0;
        this.accumSince = now;
      } else if (Math.abs(this.panSinceSnap) >= 0.012 || now - this.accumSince > 1200) {
        if (Math.abs(this.panSinceSnap) >= 0.012) this.focal.addPair(this.panSinceSnap, c.x - this.lastSnapCenter.x);
        this.lastSnapCenter = c;
        this.panSinceSnap = 0;
        this.tiltSinceSnap = 0;
        this.accumSince = now;
      }
    } else {
      this.confidence *= 0.9;
    }

    // state machine
    const sinceGood = now - this.lastGoodSnapAt;
    if (this.confidence >= 0.5 && sinceGood < 400) this.mode = 'tracking';
    else if (this.confidence >= 0.2 || this.manual || sinceGood < 2000) this.mode = 'degraded';
    else this.mode = 'off';

    // smoothing
    const t = now / 1000;
    this.filtered = this.quad.map((p, i) => this.filters[i].filter(p.x, p.y, t)) as Quad;
  }

  get(): WindowState {
    // while a finger drags, everything drawn must follow the finger without filter lag
    return { quad: this.editing ? this.quad : this.filtered, confidence: this.confidence, mode: this.mode };
  }

  /** Ground line endpoints (video px) for the runner. */
  ground(): [Vec2, Vec2] {
    const q = this.filtered;
    const v = this.groundV;
    return [
      { x: q[0].x + (q[3].x - q[0].x) * v, y: q[0].y + (q[3].y - q[0].y) * v },
      { x: q[1].x + (q[2].x - q[1].x) * v, y: q[1].y + (q[2].y - q[1].y) * v },
    ];
  }

  get rawQuad(): Quad {
    return this.quad;
  }
}
