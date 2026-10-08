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
import { POWERUP, POWERUP_ICON, PowerUps } from './PowerUps';
import { T, tf } from '../../ui/i18n';

interface ObstacleMemo {
  cleared: boolean;
  hit: boolean;
  coinTaken: boolean;
}

interface Bird {
  id: string;
  x: number;
  /** center height above ground */
  h: number;
  vx: number;
  golden: boolean;
  phase: number;
  born: number;
  done: boolean;
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
  private birds: Bird[] = [];
  private nextBirdAt = 0;
  private goldenCaught = 0;
  private birdsDodged = 0;
  private poles = new PoleDetector();
  private power!: PowerUps;
  private shieldsUsed = 0;
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
  private photo: string | null = null;
  private photoAt = -1e9;
  private photoDue = 0;
  private secondsAwarded = 0;
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
    this.nextBirdAt = now + 6000;
    this.R = this.runnerHeight();
    this.phys = new RunnerPhysics(defaultParams(this.R));
    this.power = new PowerUps(ctx.rng, now);
    if (ctx.testLives) this.lives = ctx.testLives;
    ctx.music.start('runner');
    if (ctx.settings.data.battery) this.effects.maxOver = 24;
  }

  /** A moment worth keeping: golden bird caught or a combo milestone (rate-limited). */
  private takePhoto(now: number): void {
    if (now - this.photoAt < 4000) return;
    this.photoAt = now;
    this.photoDue = now + 120;
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
        this.pushFeed(this.dir > 0 ? T.runDirRight : T.runDirLeft, '#38bdf8');
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

  /** Birds fly in at head height – duck under them. A rare golden bird flies high: catch it with a jump. */
  private updateBirds(dt: number, now: number, runner: Rect): void {
    const q = this.area().quad;
    const left = Math.min(q[0].x, q[3].x);
    const right = Math.max(q[1].x, q[2].x);
    const elapsed = (this.t(now) - this.startedAt) / 1000;
    if (now >= this.nextBirdAt) {
      const golden = this.ctx.rng.chance(0.18);
      const speed = this.flowSpeed * 1.05 + 90;
      this.birds.push({
        id: `b${now}`,
        x: this.dir > 0 ? left - 40 : right + 40,
        h: golden ? this.R * this.ctx.rng.range(2.0, 2.5) : this.R * 0.82,
        vx: this.dir * speed,
        golden,
        phase: this.ctx.rng.range(0, 6.28),
        born: now,
        done: false,
      });
      this.ctx.sfx.play(golden ? 'golden' : 'bird');
      // difficulty ramp: 7 s → 2.5 s between birds over two minutes
      const diff = this.ctx.settings.data.difficulty;
      const gap = Math.max(2500, 7000 - elapsed * 37) * (diff <= 0 ? 1.5 : diff >= 2 ? 0.7 : 1);
      this.nextBirdAt = now + gap * this.ctx.rng.range(0.7, 1.3);
    }
    for (const b of this.birds) {
      b.x += b.vx * dt;
      b.phase += dt * 14;
      if (b.done) continue;
      const r = this.R * 0.18;
      const cy = this.groundY(b.x) - b.h;
      const bbox = { x: b.x - r * 1.3, y: cy - r * 0.7, w: r * 2.6, h: r * 1.4 };
      if (b.golden) {
        if (intersect(runner, bbox)) {
          b.done = true;
          this.goldenCaught++;
          this.addPoints(300, { x: b.x, y: cy - r }, '#ffd233', 26);
          this.effects.particles.sparks({ x: b.x, y: cy }, 18, 260, ['#ffd233', '#fff7c0']);
          this.ctx.sfx.play('coin');
          this.pushFeed(T.runGoldenBird, '#ffd233');
          this.record({ t: Math.round(this.t(now) - this.startedAt), kind: 'bonus', id: 'goldbird', points: 300 }, now);
          this.takePhoto(now);
        }
      }
    }
    this.birds = this.birds.filter((b) => b.x > left - 120 && b.x < right + 120 && now - b.born < 30000);
  }

  private birdObstacles(): Obstacle[] {
    const out: Obstacle[] = [];
    for (const b of this.birds) {
      if (b.golden || b.done) continue;
      const r = this.R * 0.18;
      const cy = this.groundY(b.x) - b.h;
      out.push({ id: b.id, cls: 'bird', kind: 'overhead', box: { x: b.x - r * 1.1, y: cy - r * 0.6, w: r * 2.2, h: r * 1.2 }, top: 0, vx: b.vx, raw: { x: b.x - r, y: cy - r, w: 2 * r, h: 2 * r } });
    }
    return out;
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
        // magnet: coins in reach fly to the hand
        const pull = this.power.magnetPull(this.t(now), { x: c.x, y: this.groundY(c.x) - c.h }, { x: runner.x + runner.w / 2, y: runner.y + runner.h / 2 }, this.R);
        if (pull.x || pull.y) {
          c.x += pull.x * dt;
          c.h -= pull.y * dt;
        }
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
    this.obstacles.push(...this.birdObstacles());

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
        if (o.cls === 'bird') this.birdsDodged++;
        const c = this.combo.bump(1, t);
        const pts = runnerObstaclePoints(c);
        this.addPoints(pts, { x: runner.x + runner.w / 2, y: runner.y - 10 }, c >= 3 ? '#ffb020' : '#fff', 22);
        this.record({ t: Math.round(t - this.startedAt), kind: 'obstacle', cls: String(o.cls), points: pts, combo: c }, now);
        if (this.power.doubleActive(t)) {
          // double points: a second, equal bonus the server can mirror
          this.addPoints(pts, { x: runner.x + runner.w / 2, y: runner.y - 40 }, '#f59e0b', 24);
          this.record({ t: Math.round(t - this.startedAt), kind: 'bonus', id: 'x2', points: pts, combo: c }, now);
        }
        if (c > 1 && c % 5 === 0) {
          this.takePhoto(now);
          this.pushFeed(tf(T.runComboFeed, { n: c }), '#ffb020');
          this.ctx.sfx.play('combo', { pitch: 1 + c * 0.04 });
        }
      }
    }
    for (const id of [...this.memo.keys()]) if (!this.obstacles.some((o) => o.id === id)) this.memo.delete(id);

    this.updateCoins(dt, now, runner);
    this.updatePowerUps(dt, now, runner);
    this.updateBirds(dt, now, runner);
    this.ctx.music.setIntensity(0.3 + Math.min(0.45, Math.max(0, this.flowSpeed - 400) / 1800) + (this.lives <= 1 ? 0.25 : 0));

    // survival points follow the round clock, not summed frame dt: at low frame rates dt is
    // clamped and would fall behind the duration the server recomputes the score from
    const secs = Math.floor((t - this.startedAt) / 1000);
    while (this.secondsAwarded < secs) {
      this.secondsAwarded++;
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

  private updatePowerUps(dt: number, now: number, runner: Rect): void {
    const t = this.t(now);
    const q = this.area().quad;
    const left = Math.min(q[0].x, q[3].x);
    const right = Math.max(q[1].x, q[2].x);
    this.power.spawn(t, this.dir > 0 ? left - 30 : right + 30, this.dir, this.flowSpeed, this.R);
    this.power.update(dt, t, left, right);
    for (const p of this.power.pickups) {
      if (p.taken) continue;
      const cy = this.groundY(p.x) - p.h;
      const r = this.R * 0.3;
      if (!intersect(runner, { x: p.x - r, y: cy - r, w: 2 * r, h: 2 * r })) continue;
      this.power.collect(p, t);
      const text = p.kind === 'magnet' ? T.runPowerMagnet : p.kind === 'shield' ? T.runPowerShield : T.runPowerDouble;
      const color = p.kind === 'magnet' ? '#38bdf8' : p.kind === 'shield' ? '#a78bfa' : '#f59e0b';
      this.effects.add(new Popup(`${POWERUP_ICON[p.kind]} ${text}`, { x: p.x, y: cy - r * 2 }, now, color, 30));
      this.pushFeed(`${POWERUP_ICON[p.kind]} ${text}`, color);
      this.effects.particles.sparks({ x: p.x, y: cy }, 16, 260, [color, '#fff']);
      this.ctx.sfx.play('golden');
      this.ctx.haptics.medium();
    }
  }

  private hurt(now: number, o: Obstacle): void {
    const t = this.t(now);
    if (this.power.absorb()) {
      // the shield takes this one
      this.shieldsUsed++;
      this.invulnUntil = t + 1200;
      this.shake.add(4);
      this.ctx.sfx.play('pow');
      this.ctx.haptics.medium();
      const sx = this.runnerX();
      this.effects.add(new Popup(`🛡️ ${T.runPowerShield}`, { x: sx, y: this.groundY(sx) - this.R * 1.4 }, now, '#a78bfa', 28));
      this.effects.particles.sparks({ x: sx, y: this.groundY(sx) - this.R * 0.6 }, 20, 320, ['#a78bfa', '#fff']);
      return;
    }
    this.lives--;
    this.hitsTaken++;
    this.lastHurtAt = t;
    this.invulnUntil = t + 1500;
    this.combo.break();
    this.shake.add(8);
    this.ctx.sfx.play('ouch');
    this.ctx.haptics.heavy();
    const rx = this.runnerX();
    this.effects.add(new Popup(o.cls === 'bird' ? T.runHitBird : T.runHitOuch, { x: rx, y: this.groundY(rx) - this.R * 1.4 }, now, '#ef4444', 30));
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
    // 'unhurt' ticks only feed the survive mission; every other bonus (goldbird, x2) is scored and replayed
    if (ev.kind !== 'bonus' || ev.id !== 'unhurt') this.events.push(ev);
    for (const m of this.missions.onEvent(ev)) {
      this.missionPoints += m.reward;
      this.score += m.reward;
      const v = this.ctx.layers.visibleRect();
      this.effects.add(new Popup(tf(T.runMissionPopup, { n: m.reward }), { x: v.x + v.w / 2, y: v.y + v.h * 0.3 }, now, '#22c55e', 30, 1400));
      this.pushFeed(tf(T.runMissionFeed, { text: m.text }), '#22c55e');
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
      if (o.cls === 'bird') continue;
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

    // power-up pickups: bobbing icon in a glowing bubble
    for (const p of this.power.pickups) {
      if (p.taken) continue;
      const cy = this.groundY(p.x) - p.h + Math.sin(t / 160 + p.x * 0.02) * this.R * 0.08;
      const r = this.R * 0.3;
      const color = p.kind === 'magnet' ? 'rgba(56,189,248,' : p.kind === 'shield' ? 'rgba(167,139,250,' : 'rgba(245,158,11,';
      c.fillStyle = `${color}0.25)`;
      c.beginPath();
      c.arc(p.x, cy, r * 1.25, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = `${color}0.9)`;
      c.lineWidth = 2;
      c.stroke();
      c.font = `${Math.round(r * 1.5)}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#fff';
      c.fillText(POWERUP_ICON[p.kind], p.x, cy + 1);
    }

    // birds (+ warning arrow shortly before they enter)
    for (const b of this.birds) {
      const cy = this.groundY(b.x) - b.h;
      const inside = b.x > left && b.x < right;
      if (!inside && !b.done) {
        const ax = this.dir > 0 ? left + 18 : right - 18;
        c.fillStyle = b.golden ? 'rgba(255,210,51,0.9)' : 'rgba(239,68,68,0.9)';
        c.beginPath();
        c.moveTo(ax + this.dir * 14, cy);
        c.lineTo(ax - this.dir * 6, cy - 12);
        c.lineTo(ax - this.dir * 6, cy + 12);
        c.closePath();
        c.fill();
        continue;
      }
      if (b.done) continue;
      this.drawBird(c, b, cy);
    }

    // runner
    const rx = this.runnerX();
    const gy = this.groundY(rx);
    const r = this.phys.rect(rx, gy);
    const blink = t < this.invulnUntil && Math.floor(t / 100) % 2 === 0;
    if (!blink) this.drawRunner(c, r);
    if (this.power.shield) {
      // shield bubble
      c.strokeStyle = `rgba(167,139,250,${0.6 + 0.3 * Math.sin(t / 150)})`;
      c.lineWidth = 3;
      c.fillStyle = 'rgba(167,139,250,0.12)';
      c.beginPath();
      c.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.85, r.h * 0.7, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    const activePower = this.power.active(t);
    if (activePower === 'magnet') {
      c.strokeStyle = `rgba(56,189,248,${0.25 + 0.15 * Math.sin(t / 120)})`;
      c.lineWidth = 2;
      c.setLineDash([8, 10]);
      c.beginPath();
      c.arc(r.x + r.w / 2, r.y + r.h / 2, POWERUP.magnetRange * this.R, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
    }

    this.effects.drawOver(c, now, this.ctx.frame.video);

    const hs: HudState = {
      score: this.score,
      best: this.bestScore,
      timeLeft: null,
      elapsed: (t - this.startedAt) / 1000,
      combo: this.combo.value,
      comboLeft: this.combo.timeLeft(t),
      weapon: { icon: '🏃', name: T.runHudName, ammo: tf(T.runHudCleared, { n: this.cleared }), reload: 1, empty: false },
      missions: this.missions.results().map((m) => ({ text: m.text, progress: m.progress, goal: m.goal, done: m.done })),
      feed: this.feed,
      hint: a.free ? T.runHintFree : t - this.startedAt < 4000 ? T.runHintControls : this.obstacles.length === 0 && t - this.startedAt > 5000 ? T.runHintWaiting : null,
      windowMode: this.ctx.window().mode,
      lives: this.lives,
      extra: `${activePower ? `${POWERUP_ICON[activePower]} ${Math.ceil(this.power.timeLeft(t) * POWERUP.durationMs / 1000)} s · ` : ''}${this.power.shield ? '🛡️ · ' : ''}🪙 ${this.coinsTaken}`,
    };
    this.hud.draw(hs, now);
    if (this.photoDue && now >= this.photoDue) {
      this.photoDue = 0;
      this.photo = this.ctx.capture() ?? this.photo;
    }
  }

  private drawBird(c: CanvasRenderingContext2D, b: Bird, cy: number): void {
    const r = this.R * 0.18;
    const flap = Math.sin(b.phase);
    c.save();
    c.translate(b.x, cy);
    c.scale(b.vx > 0 ? 1 : -1, 1);
    // shadow on the ground
    c.restore();
    c.save();
    c.globalAlpha = 0.25;
    c.fillStyle = '#000';
    c.beginPath();
    c.ellipse(b.x, this.groundY(b.x), r * 1.1, r * 0.25, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.save();
    c.translate(b.x, cy);
    c.scale(b.vx > 0 ? 1 : -1, 1);
    const body = b.golden ? '#ffd233' : '#2b2b2b';
    const wing = b.golden ? '#ffb020' : '#444';
    // wings
    c.fillStyle = wing;
    c.beginPath();
    c.moveTo(-r * 0.2, 0);
    c.quadraticCurveTo(-r * 1.4, -r * (0.2 + flap * 1.1), -r * 2.2, -r * flap * 1.4);
    c.quadraticCurveTo(-r * 1.2, r * 0.3, -r * 0.2, r * 0.25);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(r * 0.1, 0);
    c.quadraticCurveTo(r * 0.9, -r * (0.2 + flap * 1.1), r * 1.7, -r * flap * 1.4);
    c.quadraticCurveTo(r * 0.8, r * 0.3, r * 0.1, r * 0.25);
    c.closePath();
    c.fill();
    // body + head + beak
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(0, 0, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(r * 0.95, -r * 0.2, r * 0.35, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.moveTo(r * 1.25, -r * 0.2);
    c.lineTo(r * 1.7, -r * 0.1);
    c.lineTo(r * 1.25, r * 0.02);
    c.closePath();
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(r * 1.02, -r * 0.28, r * 0.09, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /**
   * The runner is a hand "walking" on index and middle finger – the classic
   * childhood hand puppet. Palm = body, two fingers = legs, thumb up front,
   * ring + pinky curled at the back, a shirt cuff at the wrist.
   */
  private drawRunner(c: CanvasRenderingContext2D, r: Rect): void {
    const R = this.R;
    const facing = -this.dir; // faces oncoming obstacles
    const cx = r.x + r.w / 2;
    const feet = r.y + r.h;
    const air = !this.phys.grounded;
    const duck = this.phys.ducking && this.phys.grounded;
    const ph = this.runPhase;
    const skin = this.skin.color;
    const shade = this.skin.shade;
    const sq = duck ? 0.62 : 1; // squash when ducking
    c.save();
    c.translate(cx, feet);
    c.scale(facing, sq);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const legLen = R * 0.42;
    const knee = R * 0.22;
    const fw = Math.max(3, R * 0.11); // finger width
    // legs = index (front) and middle (back) finger, two segments each
    const legs: [number, number][] = air ? [[0.9, -0.6], [-0.7, 0.9]] : [[Math.sin(ph) * 0.9, Math.max(0, Math.sin(ph + 1.2)) * 1.1], [Math.sin(ph + Math.PI) * 0.9, Math.max(0, Math.sin(ph + Math.PI + 1.2)) * 1.1]];
    const hipY = -legLen - knee * 0.4;
    legs.forEach(([swing, bend], i) => {
      const hx = (i === 0 ? 0.09 : -0.09) * R;
      const kx = hx + Math.sin(swing) * knee;
      const ky = hipY + Math.cos(swing) * knee;
      const fx = kx + Math.sin(swing - bend) * legLen;
      const fy = Math.min(0, ky + Math.cos(swing - bend) * legLen);
      c.strokeStyle = i === 0 ? skin : shade;
      c.lineWidth = fw;
      c.beginPath();
      c.moveTo(hx, hipY);
      c.lineTo(kx, ky);
      c.lineTo(fx, fy);
      c.stroke();
      // fingernail
      c.fillStyle = '#f9e0d2';
      c.beginPath();
      c.arc(fx + Math.sin(swing - bend) * fw * 0.3, fy, fw * 0.36, 0, Math.PI * 2);
      c.fill();
    });
    // palm
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(0, hipY - R * 0.24, R * 0.26, R * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    // curled ring + pinky at the back
    c.fillStyle = shade;
    c.beginPath();
    c.arc(-R * 0.22, hipY - R * 0.05, fw * 0.75, 0, Math.PI * 2);
    c.arc(-R * 0.3, hipY - R * 0.16, fw * 0.6, 0, Math.PI * 2);
    c.fill();
    // thumb up front (arm-like, swings while running)
    const thumb = air ? -1.3 : -0.9 + Math.sin(ph) * 0.35;
    c.strokeStyle = skin;
    c.lineWidth = fw * 1.05;
    c.beginPath();
    c.moveTo(R * 0.16, hipY - R * 0.3);
    c.lineTo(R * 0.16 + Math.cos(thumb) * R * 0.28, hipY - R * 0.3 + Math.sin(thumb) * R * 0.28);
    c.stroke();
    // shirt cuff at the wrist (top)
    c.fillStyle = this.skin.cuff;
    c.fillRect(-R * 0.2, hipY - R * 0.62, R * 0.4, R * 0.12);
    c.fillStyle = '#e5e7eb';
    c.fillRect(-R * 0.2, hipY - R * 0.66, R * 0.4, R * 0.05);
    // googly eye on the palm
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(R * 0.1, hipY - R * 0.3, R * 0.07, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(R * 0.12, hipY - R * 0.3, R * 0.035, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** Hand skin (colours) – selectable in the shop. */
  skin: { color: string; shade: string; cuff: string } = { color: '#f2c9a8', shade: '#d9a684', cuff: '#2563eb' };

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
      extra: { missionPoints: this.missionPoints, coins: this.coinsTaken, hitsTaken: this.hitsTaken, roundSeconds: 0, powerups: this.power.collected.magnet + this.power.collected.shield + this.power.collected.double, shields: this.shieldsUsed },
      photo: this.photo ?? undefined,
    };
  }

  private finish(now: number): void {
    if (this.ended) return;
    this.ended = true;
    this.ctx.music.stop(1.2);
    this.ctx.sfx.play('roundEnd');
    this.ctx.end(this.buildResult(now));
  }

  abort(): RoundResult {
    // quitting from the pause menu: the open pause must not count as played time
    if (this.pausedAt !== null) this.resume();
    this.ended = true;
    this.ctx.music.stop(0.4);
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
      powerup: this.power.active(this.t(this.lastNow)) ?? 'none',
      shield: this.power.shield,
      powerups: this.power.collected.magnet + this.power.collected.shield + this.power.collected.double,
      pickups: this.power.pickups.length,
      score: this.score,
      cleared: this.cleared,
      coins: this.coinsTaken,
      lives: this.lives,
      combo: this.combo.value,
      obstacles: this.obstacles.length,
      nextObstacle: Number.isFinite(nearest) ? Math.round(nearest) : -1,
      nextBird: (() => {
        let d = Infinity;
        for (const b of this.birds) {
          if (b.golden || b.done) continue;
          const dd = this.dir > 0 ? rx - b.x : b.x - rx;
          if (dd > -40 && dd < d) d = dd;
        }
        return Number.isFinite(d) ? Math.round(d) : -1;
      })(),
      grounded: this.phys.grounded,
      dir: this.dir,
      ended: this.ended,
      runnerH: Math.round(this.phys.h),
    };
  }
}
