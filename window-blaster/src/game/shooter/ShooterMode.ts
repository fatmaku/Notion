import type { GameModeId, Rect, TargetClass, Vec2, WeaponId } from '../../core/types';
import { PAINTABLE_ONLY, SHOOTABLE } from '../../core/types';
import { center, centerness, iou } from '../../core/math/rect';
import { rectInQuadFraction } from '../../core/math/polygon';
import type { GameCtx, GameMode, ModeActions, PointerEv, RoundEvent, RoundResult } from '../GameMode';
import { HP, WEAPONS, type HitEffect, type WeaponConfig } from '../weapons/configs';
import { Weapon } from '../weapons/Weapon';
import { ProjectileSystem, type Detonation } from '../Projectile';
import { aimAssist, applySpread, blast, distToRect, segmentHitsRect, targetAt, type HitTarget } from '../HitResolver';
import { CoverPatch, Dissolve, EffectSystem, Fireball, Hitmarker, Popup, Shatter, Skid, SplashRing, Wreck } from '../effects/EffectSystem';
import { HitStop, Shake } from '../effects/Shake';
import { captureRegion } from '../effects/snapshot';
import { PAINT_COLORS, bakeDecals, coverage, drawDecal, makeDecal, type Decal } from '../effects/Decals';
import type { Unlocks } from '../../app/Unlocks';
import { CARWASH_BONUS } from '../../../shared/scoring';
import type { ProjectileKind } from '../Projectile';
import { Combo } from '../scoring/Combo';
import { Missions } from '../scoring/Missions';
import { COVERAGE_BONUS, hitPoints, type ScoreClass } from '../../../shared/scoring';
import { FxRenderer } from '../../render/FxRenderer';
import { HudRenderer, type HudState } from '../../render/HudRenderer';
import { WEAPON_TEXT, T } from '../../ui/i18n/de';

interface TargetState {
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


const SKID_TEXT: Partial<Record<WeaponId, string>> = { milkshake: 'WEGGERUTSCHT!', banana: 'BANANE! AUSGERUTSCHT!', snowball: 'EINGEFROREN & WEGGERUTSCHT!' };

const KILL_TEXT: Record<string, string[]> = {
  car: ['AUTO ZERLEGT!', 'VOLLTREFFER!', 'BOOM!'],
  truck: ['LKW GESPRENGT!', 'DICKER FISCH!'],
  bus: ['BUS ERLEDIGT!'],
  train: ['ZUG GESTOPPT!'],
};

const TIME_PER_KILL_MS = 3000;
const LOCK_MS = 350;

export class ShooterMode implements GameMode {
  private ctx!: GameCtx;
  private weapons!: [Weapon, Weapon];
  private slot = 0;
  private readonly projectiles = new ProjectileSystem();
  private effects!: EffectSystem;
  private readonly shake = new Shake();
  private readonly hitStop = new HitStop();
  private readonly combo = new Combo(2500);
  private missions!: Missions;
  private readonly events: RoundEvent[] = [];
  private readonly targets = new Map<number, TargetState>();
  private readonly lost: LostState[] = [];
  /** old track id → new track id after a re-identification, so wrecks and cover patches keep following */
  private readonly alias = new Map<number, number>();
  private readonly feed: { text: string; born: number; color: string }[] = [];
  private fx!: FxRenderer;
  private hud!: HudRenderer;

  private score = 0;
  private kills = 0;
  private hits = 0;
  private shots = 0;
  private missionPoints = 0;
  private startedAt = 0;
  private startWall = 0;
  private endsAt: number | null = null;
  private capAt = 0;
  private extraSec = 0;
  private ended = false;
  private pausedAt: number | null = null;
  private pausedMs = 0;
  private unit = 1;
  private lastNow = 0;
  private lastTargetSeen = 0;
  private lastEmptySfx = 0;
  private cachedTargets: HitTarget[] = [];

  /** Deferred actions (chain skids etc.) driven by the update loop, discarded on round end. */
  private readonly delayed: { at: number; run: () => void }[] = [];
  private palette: readonly string[] = PAINT_COLORS;
  private laserBeam: { from: Vec2; to: Vec2; until: number } | null = null;
  private readonly pows: { at: Vec2; size: number; born: number }[] = [];
  private aim: Vec2 | null = null;
  private aimDown = false;
  private aimShownUntil = 0;
  private lockId: number | null = null;
  private lockStart = 0;
  private lastKillAt = -1e9;
  private lastCountdownSec = -1;

  constructor(readonly id: GameModeId) {}

  // ------------------------------------------------------------------ lifecycle

  enter(ctx: GameCtx): void {
    this.ctx = ctx;
    const [a, b] = ctx.session.weapons;
    this.weapons = [new Weapon(WEAPONS[a]), new Weapon(WEAPONS[b])];
    this.effects = new EffectSystem(ctx.rng);
    this.missions = new Missions(this.id, [...new Set(ctx.session.weapons)], ctx.session.seed);
    this.fx = new FxRenderer(ctx.layers.fx);
    this.hud = new HudRenderer(ctx.layers);
    this.unit = (ctx.layers.videoH || 720) / 720;
    const now = ctx.now();
    this.startedAt = now;
    this.startWall = Date.now();
    this.lastNow = now;
    this.lastTargetSeen = now;
    if (ctx.roundSeconds > 0) {
      this.endsAt = now + ctx.roundSeconds * 1000;
      this.capAt = now + ctx.roundSeconds * 2000;
    }
    ctx.music.start('action');
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

  /** Round clock: wall time minus time spent paused. */
  private t(now: number): number {
    return now - this.pausedMs;
  }

  private timeLeft(now: number): number | null {
    if (this.endsAt === null) return null;
    return (this.endsAt - this.t(now)) / 1000;
  }

  /** Selected crosshair / paint palette from the shop. */
  applyUnlocks(u: Unlocks): void {
    this.fx.crosshairStyle = u.selected('crosshair')?.crosshair ?? 'classic';
    this.palette = u.selected('palette')?.palette ?? PAINT_COLORS;
  }

  /** Difficulty scales aim assistance: 0 relaxed, 1 normal, 2 hard. */
  private assistScale(): number {
    const d = this.ctx.settings.data.difficulty;
    return d <= 0 ? 1.5 : d >= 2 ? 0.7 : 1;
  }

  actions(): ModeActions {
    return {
      swap: () => this.swap(),
      reload: () => {
        const w = this.weapons[this.slot];
        if (w.startReload(this.t(performance.now()))) this.ctx.sfx.play('reload');
      },
      recenter: true,
    };
  }

  private swap(): void {
    if (this.weapons[0].cfg.id === this.weapons[1].cfg.id) return;
    this.slot ^= 1;
    this.aimDown = false;
    this.lockId = null;
    this.ctx.sfx.play('tick');
    this.pushFeed(`${WEAPON_TEXT[this.weapons[this.slot].cfg.id].icon} ${WEAPON_TEXT[this.weapons[this.slot].cfg.id].name}`, '#fff');
  }

  // --------------------------------------------------------------------- update

  private visualTime(now: number): number {
    return now - this.ctx.settings.data.cameraLatencyMs;
  }

  private readonly boxOf = (id: number): Rect | null => {
    for (let i = 0; i < 8; i++) {
      const next = this.alias.get(id);
      if (next === undefined) break;
      id = next;
    }
    const tr = this.ctx.tracker.byId(id);
    return tr ? tr.predict(this.visualTime(this.lastNow)) : null;
  };

  private state(id: number, cls: TargetClass): TargetState {
    let s = this.targets.get(id);
    if (!s) {
      // a vehicle the tracker lost for a moment and re-identified keeps its paint and damage
      const tr = this.ctx.tracker.byId(id);
      const box = tr?.predict(this.visualTime(this.lastNow));
      let adopted: TargetState | null = null;
      if (box) {
        let bestI = -1;
        let bestScore = 0.2;
        for (let i = 0; i < this.lost.length; i++) {
          const l = this.lost[i];
          if (!l.st.lastBox) continue;
          const dt = this.lastNow - l.lostAt;
          const pb = { ...l.st.lastBox, x: l.st.lastBox.x + l.st.lastVel.x * dt, y: l.st.lastBox.y + l.st.lastVel.y * dt };
          const score = iou(pb, box);
          // a destroyed car must not be "inherited" by the next car in the lane: demand a closer match
          if (score > bestScore && (l.st.state === 'alive' || score > 0.45)) {
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
    }
    return s;
  }

  /** Remember boxes of decorated targets; move vanished tracks to the lost list for 1.5 s. */
  private syncTargetMemory(now: number): void {
    const vt = this.visualTime(now);
    for (const [id, st] of this.targets) {
      const tr = this.ctx.tracker.byId(id);
      if (tr) {
        st.lastBox = tr.predict(vt);
        st.lastVel = { ...tr.vel };
      } else {
        this.targets.delete(id);
        // keep damaged, painted and destroyed cars in mind: a re-detected wreck must not come back to life
        if (st.state !== 'alive' || st.decals.length || st.hp < st.maxHp) this.lost.push({ id, st, lostAt: now });
      }
    }
    while (this.lost.length && now - this.lost[0].lostAt > 1500) this.lost.shift();
    if (this.lost.length > 12) this.lost.splice(0, this.lost.length - 12);
  }

  private liveTargets(now: number): HitTarget[] {
    const vt = this.visualTime(now);
    const win = this.ctx.window();
    const filter = win.mode === 'tracking' || win.mode === 'degraded';
    const out: HitTarget[] = [];
    for (const tr of this.ctx.tracker.active) {
      if (!SHOOTABLE.has(tr.cls) && !PAINTABLE_ONLY.has(tr.cls)) continue;
      const st = this.targets.get(tr.id);
      if (st && st.state !== 'alive') continue;
      const box = tr.predict(vt);
      if (filter && rectInQuadFraction(box, win.quad) < 0.5) continue;
      out.push({ id: tr.id, box, cls: tr.cls });
    }
    return out;
  }

  update(dt: number, now: number): void {
    if (this.ended) return;
    this.lastNow = now;
    const t = this.t(now);
    const tl = this.timeLeft(now);
    if (tl !== null && tl <= 0) {
      this.finish(now);
      return;
    }
    this.ctx.loop.timeScale = this.hitStop.scale(t);
    this.shake.update(dt);
    // music follows the action: combo, kills in the last seconds, final countdown
    this.ctx.music.setIntensity(0.25 + Math.min(0.5, this.combo.value * 0.09) + (tl !== null && tl < 12 ? 0.3 : 0) + (now - this.lastKillAt < 3000 ? 0.15 : 0));
    if (tl !== null && tl <= 5 && Math.ceil(tl) !== this.lastCountdownSec) {
      this.lastCountdownSec = Math.ceil(tl);
      this.ctx.sfx.play('countdown', { pitch: tl <= 3 ? 1.5 : 1 });
    }
    for (const w of this.weapons) w.update(t);
    this.cachedTargets = this.liveTargets(now);
    if (this.cachedTargets.length) this.lastTargetSeen = now;

    const w = this.weapons[this.slot];
    if (this.aimDown && this.aim) {
      if (w.cfg.auto) this.fire(this.aim, now);
      if (w.cfg.homing) this.updateLock(this.aim, now);
    }

    const dets = this.projectiles.update(dt, now, this.boxOf, (p, proj) => {
      const direct = targetAt(p, this.cachedTargets, 0.12);
      if (direct) return direct.id;
      for (const tg of this.cachedTargets) if (segmentHitsRect(proj.prev, p, tg.box)) return tg.id;
      return null;
    });
    for (const d of dets) this.detonate(d, now);
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      if (now >= this.delayed[i].at) {
        const job = this.delayed.splice(i, 1)[0];
        job.run();
      }
    }

    this.effects.update(dt, now, this.boxOf);
    this.combo.update(t);
    this.syncTargetMemory(now);

    const d = this.ctx.diag;
    d.set('targets', this.cachedTargets.length);
    d.set('score', this.score);
    d.set('effects', this.effects.count);
    d.set('projectiles', this.projectiles.list.length);
  }

  private updateLock(aim: Vec2, now: number): void {
    const w = this.weapons[this.slot];
    let best: HitTarget | null = null;
    let bestD = w.cfg.aimAssist * this.unit * 1.5;
    for (const tg of this.cachedTargets) {
      if (!SHOOTABLE.has(tg.cls)) continue;
      const dd = distToRect(aim, tg.box);
      if (dd < bestD) {
        bestD = dd;
        best = tg;
      }
    }
    const id = best?.id ?? null;
    if (id !== this.lockId) {
      this.lockId = id;
      this.lockStart = now;
      if (id !== null) this.ctx.sfx.play('lock');
    }
  }

  private lockProgress(now: number): number {
    return this.lockId === null ? 0 : Math.min(1, (now - this.lockStart) / LOCK_MS);
  }

  // ----------------------------------------------------------------------- input

  pointer(e: PointerEv): void {
    if (this.ended || this.pausedAt !== null) return;
    const w = this.weapons[this.slot];
    switch (e.type) {
      case 'down':
        this.aim = { x: e.x, y: e.y };
        this.aimDown = true;
        this.aimShownUntil = Infinity;
        if (w.cfg.homing) {
          this.cachedTargets = this.liveTargets(e.t);
          this.updateLock(this.aim, e.t);
        } else this.fire(this.aim, e.t);
        break;
      case 'move':
        if (this.aimDown) this.aim = { x: e.x, y: e.y };
        break;
      case 'up':
      case 'cancel':
        if (this.aimDown && w.cfg.homing && this.aim && e.type === 'up') this.fire(this.aim, e.t);
        this.aimDown = false;
        this.lockId = null;
        this.aimShownUntil = e.t + 400;
        break;
    }
  }

  private launchPoint(): Vec2 {
    const v = this.ctx.layers.visibleRect();
    return { x: v.x + v.w * 0.62, y: v.y + v.h * 1.03 };
  }

  private pxPerDeg(): number {
    const W = this.ctx.layers.videoW || 1280;
    const f = W / 2 / Math.tan((this.ctx.settings.data.hfovDeg * Math.PI) / 360);
    return (f * Math.PI) / 180;
  }

  private fire(aim: Vec2, now: number): void {
    const w = this.weapons[this.slot];
    const t = this.t(now);
    const r = w.tryFire(t);
    if (r !== 'fired') {
      if ((r === 'empty' || r === 'reloading') && now - this.lastEmptySfx > 250 && !w.cfg.auto) {
        this.lastEmptySfx = now;
        this.ctx.sfx.play(r === 'empty' ? 'empty' : 'tick');
      }
      return;
    }
    this.shots++;
    this.shake.add(w.cfg.recoil);
    this.ctx.haptics.light();
    const targets = this.cachedTargets.length ? this.cachedTargets : this.liveTargets(now);
    // assist radius grows with target speed: fast side-window traffic is hard to tap precisely
    const fastest = targets.reduce((m, tg) => Math.max(m, this.ctx.tracker.byId(tg.id)?.speed ?? 0), 0);
    const assist = aimAssist(aim, targets, w.cfg.aimAssist * this.unit * this.assistScale() * (1 + Math.min(1.5, fastest / 600)));

    if (w.cfg.kind === 'hitscan') {
      const point = applySpread(assist.point, w.cfg.spreadDeg, this.pxPerDeg(), this.ctx.rng);
      const target = targetAt(point, targets);
      if (w.cfg.id === 'laser') {
        this.laserBeam = { from: this.launchPoint(), to: point, until: now + 80 };
        if (this.shots % 6 === 1) this.ctx.sfx.play('lock', { pitch: 0.5 + this.ctx.rng.next() * 0.1 });
      } else if (w.cfg.id === 'glove') this.ctx.sfx.play('pow');
      else this.ctx.sfx.play(w.cfg.id === 'paint' ? 'paint' : 'shot', { pitch: 0.9 + this.ctx.rng.next() * 0.2 });
      if (target) this.applyHit(target, w.cfg, point, now, 1, 1);
      else {
        this.effects.add(new Hitmarker(point, now, 6 * this.unit, 'rgba(255,255,255,0.5)'));
        this.effects.particles.sparks(point, 2, 120 * this.unit, ['#ddd']);
        // a near miss pings off the bodywork
        if (w.cfg.id !== 'paint' && w.cfg.id !== 'laser' && targets.some((tg) => distToRect(point, tg.box) < tg.box.w * 0.6) && this.ctx.rng.chance(0.5)) this.ctx.sfx.play('ricochet', { pitch: 0.8 + this.ctx.rng.next() * 0.5 });
        this.events.push({ t: Math.round(t - this.startedAt), kind: 'miss', weapon: w.cfg.id, points: 0 });
      }
      return;
    }

    const start = this.launchPoint();
    const flightS = w.cfg.flightS ?? 0.9;
    // lead: aim where the target will be when the projectile arrives
    let aimPoint = assist.point;
    if (assist.target) {
      const tr = this.ctx.tracker.byId(assist.target.id);
      if (tr) {
        const future = tr.predict(this.visualTime(now) + flightS * 1000);
        const cur = assist.target.box;
        aimPoint = { x: assist.point.x + (future.x + future.w / 2 - (cur.x + cur.w / 2)), y: assist.point.y + (future.y + future.h / 2 - (cur.y + cur.h / 2)) };
      }
    }
    if (w.cfg.id === 'rocket') {
      const homingId = this.lockProgress(now) >= 1 ? this.lockId : (assist.target?.id ?? null);
      this.projectiles.spawnRocket(w.cfg.id, start, aimPoint, flightS, homingId, w.cfg.homing ?? 0, now);
      this.ctx.sfx.play('rocket');
      this.ctx.haptics.medium();
    } else {
      this.projectiles.spawnBallistic((w.cfg.sprite ?? 'grenade') as ProjectileKind, w.cfg.id, start, aimPoint, flightS, (w.cfg.gravityPx ?? 1400) * this.unit, now, assist.target?.id ?? null);
      this.ctx.sfx.play('throw');
      this.ctx.sfx.play('whoosh');
    }
  }

  // ---------------------------------------------------------------- resolution

  private detonate(d: Detonation, now: number): void {
    const cfg = WEAPONS[d.p.weapon];
    const t = this.t(now);
    const targets = this.cachedTargets;
    if (cfg.blastR > 0) {
      const R = cfg.blastR * this.unit;
      const hitsHere = blast(d.at, R, targets).filter((h) => SHOOTABLE.has(h.target.cls) || PAINTABLE_ONLY.has(h.target.cls));
      this.effects.add(new Fireball(d.at, R * (cfg.id === 'rocket' ? 1.25 : 1), now));
      this.effects.particles.fire(d.at, 26, R * 0.22);
      this.effects.particles.smoke(d.at, 14, R * 0.35, R * 0.3, 80);
      this.effects.particles.sparks(d.at, 30, 700 * this.unit);
      this.effects.particles.debris(d.at, 14, 500 * this.unit);
      this.shake.add(cfg.recoil * 2.2);
      this.ctx.sfx.play(cfg.id === 'rocket' ? 'bigExplosion' : 'explosion');
      this.ctx.haptics.heavy();
      this.hitStop.trigger(t, cfg.hitStopMs);
      const multi = hitsHere.filter((h) => SHOOTABLE.has(h.target.cls)).length;
      if (!hitsHere.length) this.events.push({ t: Math.round(t - this.startedAt), kind: 'miss', weapon: cfg.id, points: 0 });
      for (const h of hitsHere) this.applyHit(h.target, cfg, d.at, now, h.factor, Math.max(1, multi));
      return;
    }
    // thrown item: point impact
    const target = (d.contactId !== null ? targets.find((x) => x.id === d.contactId) : null) ?? targetAt(d.at, targets);
    const col = cfg.splatColor ?? '#fff1e0';
    this.ctx.sfx.play(cfg.effect === 'freeze' ? 'hit' : 'splat', { pitch: cfg.effect === 'freeze' ? 1.6 : 1 });
    this.effects.particles.drops(d.at, 22, 420 * this.unit, [col, '#ffffff']);
    if (cfg.id === 'egg') this.effects.particles.debris(d.at, 10, 260 * this.unit, '#fbf3e0');
    if (target) this.applyHit(target, cfg, d.at, now, 1, 1);
    else {
      this.effects.add(new Popup('Daneben', d.at, now, '#ffc2d9', 22 * this.unit, 600));
      this.events.push({ t: Math.round(t - this.startedAt), kind: 'miss', weapon: cfg.id, points: 0 });
    }
  }

  private scoreClass(cls: TargetClass): ScoreClass {
    return cls === 'car' || cls === 'truck' || cls === 'bus' || cls === 'train' || cls === 'sign' || cls === 'light' ? cls : 'other';
  }

  private applyHit(target: HitTarget, cfg: WeaponConfig, point: Vec2, now: number, factor: number, multi: number): void {
    const st = this.state(target.id, target.cls);
    if (st.state !== 'alive') return;
    const t = this.t(now);
    const box = target.box;
    const size = Math.round((box.h / (this.ctx.layers.videoH || 720)) * 100) / 100;
    const centered = centerness(box, point) < 0.35;
    const shootable = SHOOTABLE.has(target.cls);
    const eff: HitEffect = cfg.effect;
    let kill = false;
    st.lastHitAt = t;

    if (eff === 'wash' && shootable) {
      // water balloon: big splash, washes paint off (car wash bonus if it was dirty)
      const removed = st.decals.length;
      st.decals = [];
      st.coverage = 0;
      st.coverageStep = 0;
      this.effects.add(new SplashRing(point, box.w * 0.6, cfg.splatColor ?? '#7dd3fc', now, 450));
      this.effects.particles.drops(point, 40, 520 * this.unit, ['#7dd3fc', '#bae6fd', '#ffffff']);
      this.hits++;
      this.combo.bump(cfg.comboWeight, t);
      this.pushFeed(removed >= 3 ? 'AUTOWÄSCHE!' : 'PLATSCH!', '#7dd3fc');
      if (removed >= 3) {
        this.addPoints(CARWASH_BONUS, center(box), '#7dd3fc', 24);
        this.record({ t: Math.round(t - this.startedAt), kind: 'bonus', id: 'carwash', points: CARWASH_BONUS, cls: target.cls, weapon: cfg.id }, now);
      }
    } else if (eff === 'paint' || eff === 'splat' || eff === 'wrap' || !shootable) {
      // sticky stuff: paint, egg/tomato splats, toilet paper – or a harmless chip on signs/lights
      const kind: Decal['kind'] = !shootable ? (eff === 'explode' || eff === 'punch' ? 'shake' : eff === 'wrap' ? 'tp' : eff === 'paint' ? 'paint' : 'splat') : eff === 'paint' ? 'paint' : eff === 'wrap' ? 'tp' : 'splat';
      const decal = makeDecal(box, point.x, point.y, kind, this.ctx.rng, now, eff === 'paint' ? undefined : cfg.splatColor, this.palette);
      const sticky = eff === 'paint' || eff === 'splat' || eff === 'wrap';
      if (sticky && st.coverageStep < 100) {
        st.decals.push(decal);
        if (eff === 'wrap') for (let i = 0; i < 2; i++) st.decals.push(makeDecal(box, box.x + this.ctx.rng.range(0.1, 0.9) * box.w, box.y + this.ctx.rng.range(0.15, 0.85) * box.h, 'tp', this.ctx.rng, now + i * 60, cfg.splatColor));
        if (st.decals.length > 40) st.decals.splice(0, st.decals.length - 40);
      }
      if (sticky) this.effects.add(new SplashRing(point, decal.r * box.w * 0.9, decal.color, now));
      this.effects.particles.drops(point, sticky ? 10 : 3, 300 * this.unit, [decal.color]);
      if (!sticky) this.effects.particles.sparks(point, 4, 200 * this.unit);
      this.hits++;
      this.combo.bump(cfg.comboWeight, t);
      if (sticky && shootable) this.checkCoverage(st, target, now);
      if (eff === 'splat') this.pushFeed(cfg.id === 'egg' ? 'EI DRAUF!' : 'TOMATE!', decal.color);
    } else if (eff === 'skid' || eff === 'freeze') {
      if (st.pendingSkid) return;
      st.pendingSkid = true;
      kill = true;
      this.kills++;
      this.hits++;
      // 1) the item lands: a splat (or frost patch) that visibly sticks to the moving car
      const col = cfg.splatColor ?? '#fff1e0';
      const splat = makeDecal(box, point.x, point.y, eff === 'freeze' ? 'ice' : 'shake', this.ctx.rng, now, col);
      st.decals.push(splat);
      this.effects.add(new SplashRing(point, splat.r * box.w, col, now, 380));
      this.effects.particles.drops(point, 24, 420 * this.unit, [col, '#ffffff']);
      this.ctx.haptics.medium();
      this.hitStop.trigger(t, cfg.hitStopMs);
      if (eff === 'freeze') {
        this.pushFeed('EINGEFROREN!', '#dff6ff');
        this.ctx.sfx.play('freeze');
      }
      // 2) a moment later the car loses grip and slides away with its splat baked in
      const tid = target.id;
      const dir = point.x < box.x + box.w / 2 ? 1 : -1;
      this.delayed.push({
        at: now + (cfg.skidDelayMs ?? 350),
        run: () => {
          const s2 = this.targets.get(tid);
          const b2 = this.boxOf(tid) ?? box;
          if (s2) s2.state = 'skidding';
          const snap = captureRegion(this.ctx.frame.video, b2);
          if (snap) {
            bakeDecals(snap.canvas, snap.box, b2, s2?.decals ?? [splat], this.lastNow);
            this.effects.add(new Skid(snap.canvas, snap.box, dir, this.lastNow, this.effects.particles));
          }
          this.afterKill({ id: tid, box: b2, cls: target.cls }, cfg, this.lastNow);
          this.ctx.sfx.play('skid');
          this.pushFeed(SKID_TEXT[cfg.id] ?? 'WEGGERUTSCHT!', '#ffc2d9');
        },
      });
      this.combo.bump(1, t);
      // chain: a neighbour slips on the same puddle
      const neighbour = this.cachedTargets.find((o) => o.id !== target.id && SHOOTABLE.has(o.cls) && this.targets.get(o.id)?.state !== 'skidding' && distToRect(center(box), o.box) < box.w * 1.5);
      if (neighbour && multi < 2) {
        const nid = neighbour.id;
        this.delayed.push({
          at: now + 160,
          run: () => {
            const live = this.cachedTargets.find((o) => o.id === nid);
            if (live) this.applyHit(live, cfg, center(live.box), this.lastNow, 1, 2);
          },
        });
      }
    } else {
      // explode / punch / laser heat: chip damage, then destruction
      st.hp -= cfg.damage * factor;
      this.hits++;
      if (eff === 'punch') {
        this.pows.push({ at: point, size: Math.max(60, box.h * 0.8), born: now });
        if (this.pows.length > 6) this.pows.shift();
        this.shake.add(5);
        this.effects.particles.sparks(point, 12, 380 * this.unit, ['#ffd233', '#fff']);
      } else if (cfg.id === 'laser') {
        if (this.shots % 3 === 0) this.effects.particles.sparks(point, 3, 160 * this.unit, ['#ff6a6a', '#fff']);
      } else {
        this.effects.add(new Hitmarker(point, now, 10 * this.unit));
        this.effects.particles.sparks(point, 6, 260 * this.unit);
      }
      if (st.hp <= 0.001) {
        st.state = 'destroyed';
        kill = true;
        this.kills++;
        this.lastKillAt = now;
        this.ctx.music.duck();
        const snap = captureRegion(this.ctx.frame.video, box);
        const c = center(box);
        const R = Math.max(box.w, box.h) * 0.7;
        if (snap) bakeDecals(snap.canvas, snap.box, box, st.decals, now);
        if (snap && cfg.after !== 'vanish') this.effects.add(new Shatter(snap.canvas, snap.box, point, 320 * this.unit + R * 2, this.ctx.rng, now));
        if (cfg.blastR === 0) {
          this.effects.add(new Fireball(c, R, now));
          this.effects.particles.fire(c, 16, R * 0.25);
          this.effects.particles.smoke(c, 10, R * 0.3, R * 0.3);
          this.effects.particles.debris(c, 10, 400 * this.unit);
          this.ctx.sfx.play('explosion');
          this.ctx.haptics.heavy();
          this.shake.add(6);
          this.hitStop.trigger(t, 40);
        }
        this.afterKill(target, cfg, now, snap?.canvas ?? null, snap?.box ?? null, point);
        this.combo.bump(1, t);
        const texts = KILL_TEXT[target.cls] ?? KILL_TEXT.car;
        this.pushFeed(multi > 1 ? `MEHRFACHTREFFER ×${multi}` : this.ctx.rng.pick(texts), multi > 1 ? '#ffb020' : '#fff');
      } else {
        this.combo.bump(cfg.comboWeight, t);
        if (cfg.id !== 'laser') this.ctx.sfx.play('hit', { pitch: 1 + Math.min(6, this.combo.value) * 0.08 });
      }
    }

    const pts = hitPoints({ weapon: cfg.id, cls: this.scoreClass(target.cls), size, centered, combo: this.combo.value, multi, kill });
    this.addPoints(pts, { x: box.x + box.w / 2, y: box.y - 6 }, kill ? '#ffb020' : '#fff', kill ? 30 : 22);
    const ev: RoundEvent = { t: Math.round(t - this.startedAt), kind: kill ? 'kill' : 'hit', weapon: cfg.id, cls: target.cls, size, centered, multi, points: pts, combo: this.combo.value };
    this.record(ev, now);
    if (kill) this.extendTime(now);
    if (kill && centered) this.pushFeed('VOLLTREFFER ×1,5', '#ffb020');
    if (this.combo.value >= 3 && kill) this.ctx.sfx.play('combo', { pitch: 1 + this.combo.value * 0.05 });
    if (kill && this.combo.value >= 5 && Math.floor(this.combo.value) % 5 === 0) this.ctx.sfx.play('streak', { pitch: 1 + this.combo.value * 0.02 });
  }

  private afterKill(target: HitTarget, cfg: WeaponConfig, now: number, snap: HTMLCanvasElement | null = null, snapBox: Rect | null = null, impact: Vec2 | null = null): void {
    const after = cfg.after;
    const cover = this.ctx.settings.data.stretchFill;
    if (after === 'wreck') {
      const s = snap && snapBox ? { canvas: snap, box: snapBox } : captureRegion(this.ctx.frame.video, target.box);
      if (s) this.effects.add(new Wreck(target.id, s.canvas, s.box, now, this.effects.particles));
      else if (cover) this.effects.add(new CoverPatch(target.id, target.box, now));
    } else if (after === 'vanish') {
      // the real car must not stay visible: the patch covers it from the first frame,
      // the dissolve animation plays on top (skid types already slid their snapshot away)
      if (cover) this.effects.add(new CoverPatch(target.id, target.box, now));
      if (cfg.effect !== 'skid' && cfg.effect !== 'freeze') {
        const s = snap && snapBox ? { canvas: snap, box: snapBox } : captureRegion(this.ctx.frame.video, target.box);
        if (s) this.effects.add(new Dissolve(s.canvas, s.box, impact ?? center(target.box), this.ctx.rng, now, this.effects.particles));
      }
      this.ctx.sfx.play('vanish');
    }
  }

  private checkCoverage(st: TargetState, target: HitTarget, now: number): void {
    st.coverage = coverage(st.decals);
    for (const thr of [25, 50, 100]) {
      if (st.coverage * 100 >= (thr === 100 ? 92 : thr) && st.coverageStep < thr) {
        st.coverageStep = thr;
        const bonus = COVERAGE_BONUS[thr];
        this.addPoints(bonus, center(target.box), '#ff2d95', 26);
        this.pushFeed(`LACKIERT ${thr} %  +${bonus}`, '#ff2d95');
        this.ctx.sfx.play('combo', { pitch: 1 + thr / 100 });
        this.record({ t: Math.round(this.t(now) - this.startedAt), kind: 'bonus', id: `coverage${thr}`, points: bonus, cls: target.cls, weapon: 'paint' }, now);
      }
    }
  }

  private extendTime(now: number): void {
    if (this.endsAt === null) return;
    const before = this.endsAt;
    this.endsAt = Math.min(this.capAt, this.endsAt + TIME_PER_KILL_MS);
    const gained = (this.endsAt - before) / 1000;
    if (gained > 0) {
      this.extraSec += gained;
      const v = this.ctx.layers.visibleRect();
      this.effects.add(new Popup(`+${gained.toFixed(0)} s`, { x: v.x + v.w / 2, y: v.y + v.h * 0.16 }, now, '#38bdf8', 22 * this.unit, 700));
    }
  }

  private addPoints(pts: number, at: Vec2, color: string, size: number): void {
    if (pts <= 0) return;
    this.score += pts;
    this.effects.add(new Popup(`+${pts}`, at, this.lastNow, color, size * this.unit));
  }

  private record(ev: RoundEvent, now: number): void {
    this.events.push(ev);
    for (const m of this.missions.onEvent(ev)) {
      this.missionPoints += m.reward;
      this.score += m.reward;
      const v = this.ctx.layers.visibleRect();
      this.effects.add(new Popup(`MISSION ✓ +${m.reward}`, { x: v.x + v.w / 2, y: v.y + v.h * 0.3 }, now, '#22c55e', 30 * this.unit, 1400));
      this.pushFeed(`Mission: ${m.text}`, '#22c55e');
      this.ctx.sfx.play('mission');
      this.ctx.haptics.medium();
      this.events.push({ t: ev.t, kind: 'mission', id: m.id, points: m.reward });
    }
  }

  private pushFeed(text: string, color: string): void {
    this.feed.push({ text, born: this.lastNow, color });
    if (this.feed.length > 6) this.feed.shift();
  }

  // ---------------------------------------------------------------------- render

  render(): void {
    const L = this.ctx.layers;
    const c = L.fx;
    const now = this.lastNow;
    const off = this.shake.offset();
    c.translate(off.x, off.y);
    const win = this.ctx.window();
    if (win.mode === 'tracking' || win.mode === 'degraded') this.fx.outsideQuadDim(win.quad, L.frameRect(), win.mode === 'tracking' ? 0.3 : 0.15);
    this.effects.drawUnder(c, now, this.ctx.frame.video);

    // decals ride on every tracked vehicle that carries them, even outside the target filter
    const vt = this.visualTime(now);
    const tsec = now / 1000;
    const inTargets = new Set(this.cachedTargets.map((tg) => tg.id));
    for (const [id, st] of this.targets) {
      if (!st.decals.length || inTargets.has(id) || st.state !== 'alive') continue;
      const b = this.boxOf(id);
      if (b) for (const d of st.decals) drawDecal(c, b, d, now);
    }
    for (const tg of this.cachedTargets) {
      const st = this.targets.get(tg.id);
      if (st) for (const d of st.decals) drawDecal(c, tg.box, d, now);
      const color = SHOOTABLE.has(tg.cls) ? (tg.cls === 'car' ? 'rgba(255,255,255,0.55)' : 'rgba(255,176,32,0.7)') : 'rgba(56,189,248,0.5)';
      this.fx.bracket(tg.box, color, 2 * this.unit, tsec);
      if (st && st.hp < st.maxHp) this.fx.hpBar(tg.box, st.hp, st.maxHp);
    }
    // decals on skidding/destroyed still tracked (e.g. painted then destroyed) are handled by their effects
    if (this.lockId !== null) {
      const b = this.boxOf(this.lockId);
      if (b) this.fx.lockRing(b, this.lockProgress(now), tsec);
    }
    for (const p of this.projectiles.list) this.fx.projectile(p);
    if (this.laserBeam && now < this.laserBeam.until) this.fx.beam(this.laserBeam.from, this.laserBeam.to, now / 1000);
    for (let i = this.pows.length - 1; i >= 0; i--) {
      const pw = this.pows[i];
      const age = (now - pw.born) / 500;
      if (age >= 1) this.pows.splice(i, 1);
      else this.fx.pow(pw.at, pw.size, age);
    }
    this.effects.drawOver(c, now, this.ctx.frame.video);

    if (this.ctx.settings.data.showBoxes) for (const tr of this.ctx.tracker.tracks) this.fx.debugTrack(tr, tr.predict(vt));

    // crosshair
    const aimVisible = this.aim && now < this.aimShownUntil;
    const v = L.visibleRect();
    const p = aimVisible && this.aim ? this.aim : { x: v.x + v.w / 2, y: v.y + v.h / 2 };
    this.fx.crosshair(p, (aimVisible ? 26 : 16) * this.unit, aimVisible ? 'rgba(255,176,32,0.95)' : 'rgba(255,255,255,0.5)', !!aimVisible);

    // HUD
    const w = this.weapons[this.slot];
    const w2 = this.weapons[this.slot ^ 1];
    const t = this.t(now);
    const hs: HudState = {
      score: this.score,
      best: this.bestScore,
      timeLeft: this.timeLeft(now),
      elapsed: (t - this.startedAt) / 1000,
      combo: this.combo.value,
      comboLeft: this.combo.timeLeft(t),
      weapon: { icon: WEAPON_TEXT[w.cfg.id].icon, name: WEAPON_TEXT[w.cfg.id].name, ammo: w.ammoText(), reload: w.reloadProgress(t), empty: w.empty },
      weapon2: w2.cfg.id !== w.cfg.id ? { icon: WEAPON_TEXT[w2.cfg.id].icon, name: WEAPON_TEXT[w2.cfg.id].name, ammo: w2.ammoText(), reload: 1, empty: w2.empty } : undefined,
      missions: this.missions.results().map((m) => ({ text: m.text, progress: m.progress, goal: m.goal, done: m.done })),
      feed: this.feed,
      hint: now - this.lastTargetSeen > 4000 ? T.noTargets : win.mode === 'off' ? T.windowLost : null,
      windowMode: win.mode,
    };
    this.hud.draw(hs, now);
  }

  bestScore = 0;

  /** Pixel offset the app applies to the video element so the camera image shakes too. */
  visualOffset(): Vec2 {
    const o = this.shake.offset();
    return { x: o.x * this.ctx.layers.scale, y: o.y * this.ctx.layers.scale };
  }

  // ---------------------------------------------------------------------- finish

  private buildResult(now: number): RoundResult {
    const t = this.t(now);
    return {
      mode: this.id,
      vehicle: this.ctx.session.vehicle,
      weapons: [...new Set(this.ctx.session.weapons)],
      score: this.score,
      kills: this.kills,
      hits: this.hits,
      shots: this.shots,
      maxCombo: this.combo.max,
      durationSec: Math.round((t - this.startedAt) / 100) / 10,
      missions: this.missions.results(),
      events: this.events,
      seed: this.ctx.session.seed,
      startedAt: this.startWall,
      source: this.ctx.session.source,
      extra: { missionPoints: this.missionPoints, extraSec: this.extraSec, roundSeconds: this.ctx.roundSeconds },
    };
  }

  private finish(now: number): void {
    if (this.ended) return;
    this.ended = true;
    this.ctx.loop.timeScale = 1;
    this.ctx.music.stop(1.2);
    this.ctx.sfx.play('roundEnd');
    this.ctx.end(this.buildResult(now));
  }

  abort(): RoundResult {
    this.ended = true;
    this.delayed.length = 0;
    this.ctx.loop.timeScale = 1;
    this.ctx.music.stop(0.4);
    return this.buildResult(performance.now());
  }

  snapshot(): Record<string, number | string | boolean> {
    return {
      score: this.score,
      kills: this.kills,
      hits: this.hits,
      shots: this.shots,
      combo: this.combo.value,
      maxCombo: this.combo.max,
      targets: this.cachedTargets.length,
      timeLeft: this.timeLeft(this.lastNow) ?? -1,
      ended: this.ended,
      weapon: this.weapons[this.slot].cfg.id,
      ammo: this.weapons[this.slot].ammo,
      effects: this.effects.count,
    };
  }
}
