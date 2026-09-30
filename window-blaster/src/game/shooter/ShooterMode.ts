import type { GameModeId, Rect, TargetClass, Vec2, WeaponId } from '../../core/types';
import { PAINTABLE_ONLY, SHOOTABLE } from '../../core/types';
import { center, centerness } from '../../core/math/rect';
import { rectInQuadFraction } from '../../core/math/polygon';
import type { GameCtx, GameMode, ModeActions, PointerEv, RoundEvent, RoundResult } from '../GameMode';
import { HP, WEAPONS, type HitEffect, type WeaponConfig } from '../weapons/configs';
import { Weapon } from '../weapons/Weapon';
import { ProjectileSystem, type Detonation } from '../Projectile';
import { aimAssist, applySpread, blast, distToRect, targetAt, type HitTarget } from '../HitResolver';
import { EffectSystem, Fireball, Hitmarker, Popup, Shatter, ShrinkVanish, Skid, StretchFill, Wreck } from '../effects/EffectSystem';
import { HitStop, Shake } from '../effects/Shake';
import { captureRegion } from '../effects/snapshot';
import { coverage, drawDecal, makeDecal, type Decal } from '../effects/Decals';
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
}

/** What happens to the vehicle after it is "killed" by this weapon. */
const AFTER: Record<WeaponId, 'wreck' | 'vanish' | 'none'> = { smg: 'wreck', grenade: 'vanish', rocket: 'wreck', milkshake: 'vanish', paint: 'none' };

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

  private aim: Vec2 | null = null;
  private aimDown = false;
  private aimShownUntil = 0;
  private lockId: number | null = null;
  private lockStart = 0;

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
    const tr = this.ctx.tracker.byId(id);
    return tr ? tr.predict(this.visualTime(this.lastNow)) : null;
  };

  private state(id: number, cls: TargetClass): TargetState {
    let s = this.targets.get(id);
    if (!s) {
      const hp = HP[cls] ?? 3;
      s = { hp, maxHp: hp, state: 'alive', decals: [], coverage: 0, coverageStep: 0, lastHitAt: 0 };
      this.targets.set(id, s);
    }
    return s;
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
    for (const w of this.weapons) w.update(t);
    this.cachedTargets = this.liveTargets(now);
    if (this.cachedTargets.length) this.lastTargetSeen = now;

    const w = this.weapons[this.slot];
    if (this.aimDown && this.aim) {
      if (w.cfg.auto) this.fire(this.aim, now);
      if (w.cfg.homing) this.updateLock(this.aim, now);
    }

    const dets = this.projectiles.update(dt, now, this.boxOf, (p) => targetAt(p, this.cachedTargets)?.id ?? null);
    for (const d of dets) this.detonate(d, now);

    this.effects.update(dt, now, this.boxOf);
    this.combo.update(t);
    for (const id of [...this.targets.keys()]) if (!this.ctx.tracker.byId(id)) this.targets.delete(id);

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
    const assist = aimAssist(aim, targets, w.cfg.aimAssist * this.unit);

    if (w.cfg.kind === 'hitscan') {
      const point = applySpread(assist.point, w.cfg.spreadDeg, this.pxPerDeg(), this.ctx.rng);
      const target = targetAt(point, targets);
      this.ctx.sfx.play(w.cfg.id === 'paint' ? 'paint' : 'shot', { pitch: 0.9 + this.ctx.rng.next() * 0.2 });
      if (target) this.applyHit(target, w.cfg, point, now, 1, 1);
      else {
        this.effects.add(new Hitmarker(point, now, 6 * this.unit, 'rgba(255,255,255,0.5)'));
        this.effects.particles.sparks(point, 2, 120 * this.unit, ['#ddd']);
        this.events.push({ t: Math.round(t - this.startedAt), kind: 'miss', weapon: w.cfg.id, points: 0 });
      }
      return;
    }

    const start = this.launchPoint();
    if (w.cfg.id === 'rocket') {
      const homingId = this.lockProgress(now) >= 1 ? this.lockId : (assist.target?.id ?? null);
      this.projectiles.spawnRocket(w.cfg.id, start, assist.point, w.cfg.flightS ?? 0.8, homingId, w.cfg.homing ?? 0, now);
      this.ctx.sfx.play('rocket');
      this.ctx.haptics.medium();
    } else {
      this.projectiles.spawnBallistic(w.cfg.id as 'grenade' | 'milkshake', w.cfg.id, start, assist.point, w.cfg.flightS ?? 0.9, (w.cfg.gravityPx ?? 1400) * this.unit, now);
      this.ctx.sfx.play('throw');
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
    // milkshake: point impact
    const target = (d.contactId !== null ? targets.find((x) => x.id === d.contactId) : null) ?? targetAt(d.at, targets);
    this.ctx.sfx.play('splat');
    this.effects.particles.drops(d.at, 22, 420 * this.unit, ['#fff1e0', '#ffc2d9', '#ffe4ec']);
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

    if (eff === 'paint' || !shootable) {
      // paint splat (paint gun) or harmless chip on signs/lights
      const decal = makeDecal(box, point.x, point.y, eff === 'paint' ? 'paint' : 'shake', this.ctx.rng, now);
      if (eff !== 'explode') st.decals.push(decal);
      this.effects.particles.drops(point, eff === 'paint' ? 6 : 3, 260 * this.unit, [decal.color]);
      if (eff !== 'paint') this.effects.particles.sparks(point, 4, 200 * this.unit);
      this.hits++;
      this.combo.bump(cfg.comboWeight, t);
      if (eff === 'paint' && shootable) this.checkCoverage(st, target, now);
    } else if (eff === 'skid') {
      st.state = 'skidding';
      kill = true;
      this.kills++;
      const snap = captureRegion(this.ctx.frame.video, box);
      const dir = point.x < box.x + box.w / 2 ? 1 : -1;
      if (snap) {
        const sc = snap.canvas.getContext('2d');
        if (sc) {
          const local = { x: point.x - snap.box.x, y: point.y - snap.box.y };
          const d = makeDecal({ x: 0, y: 0, w: snap.box.w, h: snap.box.h }, local.x, local.y, 'shake', this.ctx.rng, now - 300);
          drawDecal(sc, { x: 0, y: 0, w: snap.box.w, h: snap.box.h }, d, now);
        }
        this.effects.add(new Skid(snap.canvas, snap.box, dir, now, this.effects.particles));
      }
      this.afterKill(target, cfg, now);
      this.combo.bump(1, t);
      this.ctx.sfx.play('skid');
      this.ctx.haptics.medium();
      this.hitStop.trigger(t, cfg.hitStopMs);
      this.pushFeed('WEGGERUTSCHT!', '#ffc2d9');
      // chain: a neighbour slips on the same puddle
      const neighbour = this.cachedTargets.find((o) => o.id !== target.id && SHOOTABLE.has(o.cls) && this.targets.get(o.id)?.state !== 'skidding' && distToRect(center(box), o.box) < box.w * 1.5);
      if (neighbour && multi < 2) setTimeout(() => !this.ended && this.applyHit(neighbour, cfg, center(neighbour.box), this.lastNow, 1, 2), 160);
    } else {
      // explode: chip damage, then destruction
      st.hp -= cfg.damage * factor;
      this.hits++;
      this.effects.add(new Hitmarker(point, now, 10 * this.unit));
      this.effects.particles.sparks(point, 6, 260 * this.unit);
      if (st.hp <= 0.001) {
        st.state = 'destroyed';
        kill = true;
        this.kills++;
        const snap = captureRegion(this.ctx.frame.video, box);
        const c = center(box);
        const R = Math.max(box.w, box.h) * 0.7;
        if (snap) this.effects.add(new Shatter(snap.canvas, snap.box, point, 320 * this.unit + R * 2, this.ctx.rng, now));
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
        this.afterKill(target, cfg, now, snap?.canvas ?? null, snap?.box ?? null);
        this.combo.bump(1, t);
        const texts = KILL_TEXT[target.cls] ?? KILL_TEXT.car;
        this.pushFeed(multi > 1 ? `MEHRFACHTREFFER ×${multi}` : this.ctx.rng.pick(texts), multi > 1 ? '#ffb020' : '#fff');
      } else {
        this.combo.bump(cfg.comboWeight, t);
        this.ctx.sfx.play('hit', { pitch: 1 + Math.min(6, this.combo.value) * 0.08 });
      }
    }

    const pts = hitPoints({ weapon: cfg.id, cls: this.scoreClass(target.cls), size, centered, combo: this.combo.value, multi, kill });
    this.addPoints(pts, { x: box.x + box.w / 2, y: box.y - 6 }, kill ? '#ffb020' : '#fff', kill ? 30 : 22);
    const ev: RoundEvent = { t: Math.round(t - this.startedAt), kind: kill ? 'kill' : 'hit', weapon: cfg.id, cls: target.cls, size, centered, multi, points: pts, combo: this.combo.value };
    this.record(ev, now);
    if (kill) this.extendTime(now);
    if (kill && centered) this.pushFeed('VOLLTREFFER ×1,5', '#ffb020');
    if (this.combo.value >= 3 && kill) this.ctx.sfx.play('combo', { pitch: 1 + this.combo.value * 0.05 });
  }

  private afterKill(target: HitTarget, cfg: WeaponConfig, now: number, snap: HTMLCanvasElement | null = null, snapBox: Rect | null = null): void {
    const after = AFTER[cfg.id];
    const front = this.id === 'front-shooter';
    if (after === 'wreck') {
      const s = snap && snapBox ? { canvas: snap, box: snapBox } : captureRegion(this.ctx.frame.video, target.box);
      if (s) this.effects.add(new Wreck(target.id, s.canvas, s.box, now, this.effects.particles));
      else if (front && this.ctx.settings.data.stretchFill) this.effects.add(new StretchFill(target.id, target.box, now));
    } else if (after === 'vanish') {
      if (!snap) {
        const s = captureRegion(this.ctx.frame.video, target.box);
        if (s && cfg.effect !== 'skid') this.effects.add(new ShrinkVanish(s.canvas, s.box, now));
      }
      if (front && this.ctx.settings.data.stretchFill) this.effects.add(new StretchFill(target.id, target.box, now));
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

    // decals + brackets on live targets
    const vt = this.visualTime(now);
    const tsec = now / 1000;
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
      best: this.ctx.session.source === 'demo' ? this.bestScore : this.bestScore,
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
      extra: { missionPoints: this.missionPoints, extraSec: this.extraSec },
    };
  }

  private finish(now: number): void {
    if (this.ended) return;
    this.ended = true;
    this.ctx.loop.timeScale = 1;
    this.ctx.sfx.play('roundEnd');
    this.ctx.end(this.buildResult(now));
  }

  abort(): RoundResult {
    this.ended = true;
    this.ctx.loop.timeScale = 1;
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
    };
  }
}
