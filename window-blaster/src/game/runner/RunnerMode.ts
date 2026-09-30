import type { Rect, Vec2 } from '../../core/types';
import { PAINTABLE_ONLY } from '../../core/types';
import { intersect } from '../../core/math/rect';
import { quadBottomY } from '../../core/math/polygon';
import type { GameCtx, GameMode, ModeActions, PointerEv, RoundEvent, RoundResult } from '../GameMode';
import { EffectSystem, Popup } from '../effects/EffectSystem';
import { Shake } from '../effects/Shake';
import { Combo } from '../scoring/Combo';
import { Missions } from '../scoring/Missions';
import { RUNNER, runnerObstaclePoints } from '../../../shared/scoring';
import { FxRenderer } from '../../render/FxRenderer';
import { HudRenderer, type HudState } from '../../render/HudRenderer';
import { RunnerPhysics, defaultParams } from './RunnerPhysics';
import { collides, mapObstacle, platformUnder, type Obstacle } from './ObstacleMapper';
import { PoleDetector } from './PoleDetector';

interface ObstacleMemo {
  cleared: boolean;
  hit: boolean;
  coinTaken: boolean;
}

interface Coin {
  id: string;
  x: number;
  /** height above ground */
  h: number;
  vx: number;
  taken: boolean;
  born: number;
  attachedTo: number | null;
}

/** Side-window endless runner over real passing objects. */
export class RunnerMode implements GameMode {
  readonly id = 'side-runner' as const;
  private ctx!: GameCtx;
  private phys!: RunnerPhysics;
  private effects!: EffectSystem;
  private readonly shake = new Shake();
  private readonly combo = new Combo(6000);
  private missions!: Missions;
  private readonly events: RoundEvent[] = [];
  private readonly memo = new Map<number | string, ObstacleMemo>();
  private readonly feed: { text: string; born: number; color: string }[] = [];
  private coins: Coin[] = [];
  private poles = new PoleDetector();
  private fx!: FxRenderer;
  private hud!: HudRenderer;

  private score = 0;
  private cleared = 0;
  private coinsTaken = 0;
  private lives = 3;
  private hitsTaken = 0;
  private missionPoints = 0;
  private startedAt = 0;
  private startWall = 0;
  private pausedAt: number | null = null;
  private pausedMs = 0;
  private lastNow = 0;
  private ended = false;
  private invulnUntil = 0;
  private lastHurtAt = 0;
  private lastCoinAt = 0;
  private dir = 1;
  private dirVotes = 0;
  private flowSpeed = 420;
  private R = 80;
  private obstacles: Obstacle[] = [];
  private runPhase = 0;
  private duckHeld = false;
  private timeAcc = 0;
  bestScore = 0;

  enter(ctx: GameCtx): void {
    this.ctx = ctx;
    this.effects = new EffectSystem(ctx.rng);
    this.missions = new Missions(this.id, [], ctx.session.seed);
    this.fx = new FxRenderer(ctx.layers.fx);
    this.hud = new HudRenderer(ctx.layers);
    this.dir = ctx.session.side === 'left' ? -1 : 1;
    const now = ctx.now();
    this.startedAt = now;
    this.startWall = Date.now();
    this.lastNow = now;
    this.lastCoinAt = now;
    this.lastHurtAt = now;
    this.R = this.runnerHeight();
    this.phys = new RunnerPhysics(defaultParams(this.R));
  }

  private t(now: number): number {
    return now - this.pausedMs;
  }

  pause(): void {
    if (this.pausedAt === null) this.pausedAt = performance.now();
  }

  resume(): void {
    if (this.pausedAt !== null) {
      this.pausedMs += performance.now() - this.pausedAt;
      this.pausedAt = null;
    }
  }

  actions(): ModeActions {
    return {
      jump: () => this.phys.jumpPress(this.t(performance.now())),
      jumpRelease: () => this.phys.jumpRelease(),
      duck: () => {
        this.duckHeld = true;
        this.phys.duck(true);
      },
      duckRelease: () => {
        this.duckHeld = false;
        this.phys.duck(false);
      },
      recenter: true,
    };
  }

  // ------------------------------------------------------------------ geometry

  /** Play area: the window quad, or the visible frame in free mode. */
  private area(): { quad: [Vec2, Vec2, Vec2, Vec2]; free: boolean } {
    const w = this.ctx.window();
    if (w.mode === 'tracking' || w.mode === 'degraded') return { quad: w.quad, free: false };
    const v = this.ctx.layers.visibleRect();
    return {
      quad: [
        { x: v.x, y: v.y },
        { x: v.x + v.w, y: v.y },
        { x: v.x + v.w, y: v.y + v.h },
        { x: v.x, y: v.y + v.h },
      ],
      free: true,
    };
  }

  private groundLine(): [Vec2, Vec2] {
    const a = this.area();
    if (!a.free) {
      const g = this.ctx.ground();
      if (g) return g;
    }
    const q = a.quad;
    const v = 0.8;
    return [
      { x: q[0].x + (q[3].x - q[0].x) * v, y: q[0].y + (q[3].y - q[0].y) * v },
      { x: q[1].x + (q[2].x - q[1].x) * v, y: q[1].y + (q[2].y - q[1].y) * v },
    ];
  }

  private groundY(x: number): number {
    const [a, b] = this.groundLine();
    if (Math.abs(b.x - a.x) < 1e-6) return a.y;
    const t = (x - a.x) / (b.x - a.x);
    return a.y + (b.y - a.y) * t;
  }

  private runnerHeight(): number {
    const q = this.area().quad;
    const hgt = Math.max(quadBottomY(q, q[0].x) - q[0].y, quadBottomY(q, q[1].x) - q[1].y);
    return Math.max(30, hgt * 0.16);
  }

  private runnerX(): number {
    const q = this.area().quad;
    const left = Math.min(q[0].x, q[3].x);
    const right = Math.max(q[1].x, q[2].x);
    return left + (right - left) * (this.dir > 0 ? 0.68 : 0.32);
  }

  // -------------------------------------------------------------------- update

  private updateDirection(): void {
    const vx = this.ctx.tracker.meanVx();
    if (Math.abs(vx) > 60 && this.ctx.tracker.active.length >= 1) {
      const s = vx > 0 ? 1 : -1;
      this.dirVotes = Math.max(-40, Math.min(40, this.dirVotes + s));
      if (s !== this.dir && Math.abs(this.dirVotes) >= 30 && Math.sign(this.dirVotes) === s) {
        this.dir = s;
        this.pushFeed(this.dir > 0 ? 'Richtung: → ' : 'Richtung: ←', '#38bdf8');
      }
      const speeds = this.ctx.tracker.active.map((t) => Math.abs(t.vel.x) * 1000).filter((v) => v > 40);
      if (speeds.length) {
        speeds.sort((a, b) => a - b);
        const med = speeds[speeds.length >> 1];
        this.flowSpeed = this.flowSpeed * 0.9 + Math.min(1800, med) * 0.1;
      }
    }
  }

  private buildObstacles(now: number): void {
    const vt = now - this.ctx.settings.data.cameraLatencyMs;
    const p = { R: this.R, groundY: (x: number) => this.groundY(x) };
    const out: Obstacle[] = [];
    const boxes: Rect[] = [];
    for (const tr of this.ctx.tracker.active) {
      const box = tr.predict(vt);
      boxes.push(box);
      const o = mapObstacle(tr.id, tr.cls, box, tr.vel.x * 1000, p);
      if (o) out.push(o);
      // coins ride on signs / lights
      if (PAINTABLE_ONLY.has(tr.cls) && !this.coins.some((c) => c.attachedTo === tr.id)) {
        const gy = this.groundY(box.x + box.w / 2);
        this.coins.push({ id: `c${tr.id}`, x: box.x + box.w / 2, h: Math.max(this.R * 0.6, gy - (box.y + box.h / 2)), vx: tr.vel.x * 1000, taken: false, born: now, attachedTo: tr.id });
      }
    }
    if (this.ctx.settings.data.poleDetector) {
      const g = this.ctx.grayFrame();
      const a = this.area();
      if (g && !a.free) {
        const [ga, gb] = this.groundLine();
        const gy = (ga.y + gb.y) / 2;
        this.poles.update(g, { x: 0, y: gy - 1.5 * this.R, w: 0, h: 1.4 * this.R }, a.quad, boxes, this.dir, this.flowSpeed);
        for (const pl of this.poles.poles) {
          if (!pl.confirmed) continue;
          const o = mapObstacle(pl.id, 'pole', { x: pl.x - pl.width / 2, y: this.groundY(pl.x) - 1.1 * this.R, w: Math.max(14, pl.width), h: 1.1 * this.R }, pl.vx, p);
          if (o) out.push(o);
        }
      }
    }
    this.obstacles = out;
  }

  private updateCoins(dt: number, now: number, runner: Rect): void {
    const q = this.area().quad;
    const left = Math.min(q[0].x, q[3].x);
    const right = Math.max(q[1].x, q[2].x);
    // virtual coins keep sparse traffic fun
    if (now - this.lastCoinAt > 5000) {
      this.lastCoinAt = now;
      const x = this.dir > 0 ? left - 30 : right + 30;
      this.coins.push({ id: `v${now}`, x, h: this.R * this.ctx.rng.range(0.7, 2.2), vx: this.dir * this.flowSpeed, taken: false, born: now, attachedTo: null });
    }
    for (const c of this.coins) {
      if (c.attachedTo !== null) {
        const tr = this.ctx.tracker.byId(c.attachedTo);
        if (tr) {
          const b = tr.predict(now - this.ctx.settings.data.cameraLatencyMs);
          c.x = b.x + b.w / 2;
        } else c.x += c.vx * dt;
      } else c.x += c.vx * dt;
      if (!c.taken) {
        const cy = this.groundY(c.x) - c.h;
        const r = this.R * 0.22;
        if (intersect(runner, { x: c.x - r, y: cy - r, w: 2 * r, h: 2 * r })) {
          c.taken = true;
          this.coinsTaken++;
          this.lastCoinAt = now;
          this.addPoints(RUNNER.perCoin, { x: c.x, y: cy - r }, '#ffe066', 20);
          this.effects.particles.sparks({ x: c.x, y: cy }, 10, 220, ['#ffe066', '#fff']);
          this.ctx.sfx.play('coin');
          this.record({ t: Math.round(this.t(now) - this.startedAt), kind: 'coin', points: RUNNER.perCoin }, now);
        }
      }
    }
    this.coins = this.coins.filter((c) => !c.taken && c.x > left - 80 && c.x < right + 80 && now - c.born < 20000);
  }

  update(dt: number, now: number): void {
    if (this.ended) return;
    this.lastNow = now;
    const t = this.t(now);
    this.shake.update(dt);
    this.updateDirection();
    this.R = this.R * 0.95 + this.runnerHeight() * 0.05;
    this.phys.p = defaultParams(this.R);
    this.buildObstacles(now);

    const rx = this.runnerX();
    const gy = this.groundY(rx);
    const before = this.phys.rect(rx, gy);
    const plat = platformUnder(before, this.obstacles);
    this.phys.step(dt, t, plat);
    const runner = this.phys.rect(rx, gy);
    this.runPhase += dt * (this.phys.grounded ? 10 + this.flowSpeed / 120 : 4);

    // collisions and clearing
    for (const o of this.obstacles) {
      let m = this.memo.get(o.id);
      if (!m) {
        m = { cleared: false, hit: false, coinTaken: false };
        this.memo.set(o.id, m);
      }
      if (!m.hit && t >= this.invulnUntil && collides(runner, o, this.phys.h)) {
        m.hit = true;
        this.hurt(now, o);
      }
      const passed = this.dir > 0 ? o.box.x > runner.x + runner.w : o.box.x + o.box.w < runner.x;
      if (!m.cleared && !m.hit && passed) {
        m.cleared = true;
        this.cleared++;
        const c = this.combo.bump(1, t);
        const pts = runnerObstaclePoints(c);
        this.addPoints(pts, { x: runner.x + runner.w / 2, y: runner.y - 10 }, c >= 3 ? '#ffb020' : '#fff', 22);
        this.record({ t: Math.round(t - this.startedAt), kind: 'obstacle', cls: String(o.cls), points: pts, combo: c }, now);
        if (c > 1 && c % 5 === 0) {
          this.pushFeed(`${c}er-Combo!`, '#ffb020');
          this.ctx.sfx.play('combo', { pitch: 1 + c * 0.04 });
        }
      }
    }
    for (const id of [...this.memo.keys()]) if (!this.obstacles.some((o) => o.id === id)) this.memo.delete(id);

    this.updateCoins(dt, now, runner);

    // survival points
    this.timeAcc += dt;
    while (this.timeAcc >= 1) {
      this.timeAcc -= 1;
      this.score += RUNNER.perSecond;
      const unhurt = Math.floor((t - this.lastHurtAt) / 1000);
      this.record({ t: Math.round(t - this.startedAt), kind: 'bonus', id: 'unhurt', size: unhurt, points: 0 }, now);
    }
    this.combo.update(t);
    this.effects.update(dt, now, () => null);

    const d = this.ctx.diag;
    d.set('obstacles', this.obstacles.length);
    d.set('flow', `${this.dir > 0 ? '→' : '←'} ${this.flowSpeed.toFixed(0)}px/s`);
    d.set('runnerH', this.phys.h);
  }

  private hurt(now: number, o: Obstacle): void {
    const t = this.t(now);
    this.lives--;
    this.hitsTaken++;
    this.lastHurtAt = t;
    this.invulnUntil = t + 1500;
    this.combo.break();
    this.shake.add(8);
    this.ctx.sfx.play('ouch');
    this.ctx.haptics.heavy();
    const rx = this.runnerX();
    this.effects.add(new Popup('AUTSCH!', { x: rx, y: this.groundY(rx) - this.R * 1.4 }, now, '#ef4444', 30));
    this.effects.particles.sparks({ x: rx, y: this.groundY(rx) - this.R * 0.5 }, 12, 300, ['#ef4444', '#fff']);
    this.record({ t: Math.round(t - this.startedAt), kind: 'life', cls: String(o.cls), points: 0 }, now);
    if (this.lives <= 0) this.finish(now);
  }

  pointer(e: PointerEv): void {
    if (this.ended || this.pausedAt !== null) return;
    if (e.type === 'down') {
      this.pointerStart = { x: e.x, y: e.y, t: e.t };
      this.phys.jumpPress(this.t(e.t));
    } else if (e.type === 'move' && this.pointerStart) {
      if (e.y - this.pointerStart.y > this.R * 0.6 && !this.duckHeld) {
        this.duckHeld = true;
        this.phys.duck(true);
      }
    } else if (e.type === 'up' || e.type === 'cancel') {
      this.phys.jumpRelease();
      if (this.duckHeld) {
        this.duckHeld = false;
        this.phys.duck(false);
      }
      this.pointerStart = null;
    }
  }
  private pointerStart: { x: number; y: number; t: number } | null = null;

  private addPoints(pts: number, at: Vec2, color: string, size: number): void {
    this.score += pts;
    this.effects.add(new Popup(`+${pts}`, at, this.lastNow, color, size));
  }

  private record(ev: RoundEvent, now: number): void {
    if (ev.kind !== 'bonus') this.events.push(ev);
    for (const m of this.missions.onEvent(ev)) {
      this.missionPoints += m.reward;
      this.score += m.reward;
      const v = this.ctx.layers.visibleRect();
      this.effects.add(new Popup(`MISSION ✓ +${m.reward}`, { x: v.x + v.w / 2, y: v.y + v.h * 0.3 }, now, '#22c55e', 30, 1400));
      this.pushFeed(`Mission: ${m.text}`, '#22c55e');
      this.ctx.sfx.play('mission');
      this.events.push({ t: ev.t, kind: 'mission', id: m.id, points: m.reward });
    }
  }

  private pushFeed(text: string, color: string): void {
    this.feed.push({ text, born: this.lastNow, color });
    if (this.feed.length > 6) this.feed.shift();
  }

  // -------------------------------------------------------------------- render

  render(): void {
    const L = this.ctx.layers;
    const c = L.fx;
    const now = this.lastNow;
    const t = this.t(now);
    const off = this.shake.offset();
    c.translate(off.x, off.y);
    const a = this.area();
    if (!a.free) this.fx.outsideQuadDim(a.quad, L.frameRect(), 0.3);

    // ground line
    const [ga, gb] = this.groundLine();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3;
    c.setLineDash([16, 12]);
    c.lineDashOffset = -((t / 1000) * this.flowSpeed * this.dir) % 28;
    c.beginPath();
    c.moveTo(ga.x, ga.y);
    c.lineTo(gb.x, gb.y);
    c.stroke();
    c.setLineDash([]);

    // speed lines
    const q = a.quad;
    const left = Math.min(q[0].x, q[3].x);
    const right = Math.max(q[1].x, q[2].x);
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = q[0].y + (quadBottomY(q, left) - q[0].y) * (0.15 + i * 0.12);
      const len = 30 + this.flowSpeed * 0.12;
      const x = left + ((((t / 1000) * this.flowSpeed * this.dir + i * 173) % (right - left)) + (right - left)) % (right - left);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - this.dir * len, y);
      c.stroke();
    }

    // obstacles
    for (const o of this.obstacles) {
      const m = this.memo.get(o.id);
      c.strokeStyle = m?.hit ? 'rgba(239,68,68,0.8)' : o.kind === 'overhead' ? 'rgba(56,189,248,0.8)' : 'rgba(255,176,32,0.8)';
      c.lineWidth = 3;
      c.setLineDash(o.kind === 'overhead' ? [8, 6] : []);
      c.strokeRect(o.box.x, o.box.y, o.box.w, o.box.h);
      c.setLineDash([]);
      if (o.kind === 'ground') {
        c.fillStyle = 'rgba(255,176,32,0.25)';
        c.fillRect(o.box.x, o.box.y, o.box.w, 6);
      }
    }
    // coins
    for (const coin of this.coins) {
      const cy = this.groundY(coin.x) - coin.h;
      const r = this.R * 0.22;
      const wob = Math.sin(t / 120 + coin.x * 0.01);
      c.fillStyle = '#ffd233';
      c.beginPath();
      c.ellipse(coin.x, cy, r * Math.abs(wob) * 0.8 + r * 0.2, r, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#b8860b';
      c.lineWidth = 2;
      c.stroke();
    }

    // runner
    const rx = this.runnerX();
    const gy = this.groundY(rx);
    const r = this.phys.rect(rx, gy);
    const blink = t < this.invulnUntil && Math.floor(t / 100) % 2 === 0;
    if (!blink) this.drawRunner(c, r);

    this.effects.drawOver(c, now, this.ctx.frame.video);

    const hs: HudState = {
      score: this.score,
      best: this.bestScore,
      timeLeft: null,
      elapsed: (t - this.startedAt) / 1000,
      combo: this.combo.value,
      comboLeft: this.combo.timeLeft(t),
      weapon: { icon: '🏃', name: 'Runner', ammo: `${this.cleared} übersprungen`, reload: 1, empty: false },
      missions: this.missions.results().map((m) => ({ text: m.text, progress: m.progress, goal: m.goal, done: m.done })),
      feed: this.feed,
      hint: a.free ? 'Frei-Modus (keine Scheibe erkannt)' : this.obstacles.length === 0 && t - this.startedAt > 5000 ? 'Warte auf Hindernisse …' : null,
      windowMode: this.ctx.window().mode,
      lives: this.lives,
      extra: `🪙 ${this.coinsTaken}`,
    };
    this.hud.draw(hs, now);
  }

  private drawRunner(c: CanvasRenderingContext2D, r: Rect): void {
    const R = this.R;
    const facing = -this.dir; // faces oncoming obstacles
    const cx = r.x + r.w / 2;
    const feet = r.y + r.h;
    const air = !this.phys.grounded;
    const duck = this.phys.ducking && this.phys.grounded;
    const ph = this.runPhase;
    c.save();
    c.translate(cx, feet);
    c.scale(facing, 1);
    const s = r.h / R; // squash when ducking
    // legs
    c.strokeStyle = '#1e3a8a';
    c.lineWidth = Math.max(3, R * 0.11);
    c.lineCap = 'round';
    const legA = air ? 0.5 : Math.sin(ph) * 0.9;
    const legB = air ? -0.4 : Math.sin(ph + Math.PI) * 0.9;
    for (const [a, side] of [
      [legA, -1],
      [legB, 1],
    ] as const) {
      c.beginPath();
      c.moveTo(side * R * 0.06, -R * 0.42 * s);
      c.lineTo(side * R * 0.06 + Math.sin(a) * R * 0.22, -R * 0.42 * s + Math.cos(a) * R * 0.4 * s);
      c.stroke();
    }
    // body
    c.fillStyle = '#ef4444';
    c.beginPath();
    c.ellipse(0, -R * 0.55 * s, R * 0.2, R * 0.26 * s, 0, 0, Math.PI * 2);
    c.fill();
    // arms
    c.strokeStyle = '#fcd9b6';
    c.lineWidth = Math.max(3, R * 0.09);
    const arm = air ? -1.2 : Math.sin(ph + Math.PI) * 0.8;
    c.beginPath();
    c.moveTo(0, -R * 0.68 * s);
    c.lineTo(Math.cos(arm) * R * 0.28, -R * 0.68 * s + Math.sin(arm) * R * 0.2);
    c.stroke();
    // head + cap
    c.fillStyle = '#fcd9b6';
    c.beginPath();
    c.arc(R * 0.04, -R * 0.9 * s, R * 0.16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ef4444';
    c.beginPath();
    c.arc(R * 0.04, -R * 0.93 * s, R * 0.17, Math.PI, Math.PI * 2);
    c.fill();
    c.fillRect(R * 0.04, -R * 0.95 * s, R * 0.3, R * 0.06);
    // eye
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(R * 0.12, -R * 0.9 * s, R * 0.03, 0, Math.PI * 2);
    c.fill();
    c.restore();
    void duck;
  }

  visualOffset(): Vec2 {
    const o = this.shake.offset();
    return { x: o.x * this.ctx.layers.scale, y: o.y * this.ctx.layers.scale };
  }

  // -------------------------------------------------------------------- finish

  private buildResult(now: number): RoundResult {
    const t = this.t(now);
    return {
      mode: this.id,
      vehicle: this.ctx.session.vehicle,
      weapons: [],
      score: this.score,
      kills: this.cleared,
      hits: this.cleared + this.coinsTaken,
      shots: this.phys.jumps,
      maxCombo: this.combo.max,
      durationSec: Math.round((t - this.startedAt) / 100) / 10,
      missions: this.missions.results(),
      events: this.events,
      seed: this.ctx.session.seed,
      startedAt: this.startWall,
      source: this.ctx.session.source,
      extra: { missionPoints: this.missionPoints, coins: this.coinsTaken, hitsTaken: this.hitsTaken, roundSeconds: 0 },
    };
  }

  private finish(now: number): void {
    if (this.ended) return;
    this.ended = true;
    this.ctx.sfx.play('roundEnd');
    this.ctx.end(this.buildResult(now));
  }

  abort(): RoundResult {
    this.ended = true;
    return this.buildResult(performance.now());
  }

  snapshot(): Record<string, number | string | boolean> {
    const rx = this.runnerX();
    let nearest = Infinity;
    for (const o of this.obstacles) {
      const d = this.dir > 0 ? rx - (o.box.x + o.box.w) : o.box.x - rx;
      if (d > -o.box.w && d < nearest) nearest = d;
    }
    return {
      score: this.score,
      cleared: this.cleared,
      coins: this.coinsTaken,
      lives: this.lives,
      combo: this.combo.value,
      obstacles: this.obstacles.length,
      nextObstacle: Number.isFinite(nearest) ? Math.round(nearest) : -1,
      grounded: this.phys.grounded,
      dir: this.dir,
      ended: this.ended,
      runnerH: Math.round(this.phys.h),
    };
  }
}
