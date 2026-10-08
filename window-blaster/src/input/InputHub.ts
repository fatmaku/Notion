import type { Vec2 } from '../core/types';
import type { GameMode, PointerEv } from '../game/GameMode';
import type { Layers } from '../render/Layers';
import { GAME_KEYS, edges, keyIntents, mergeIntents, noIntents, padIntents, type Intents, type ModeKind, type PadLike } from './bindings';
import { MenuNav } from './MenuNav';
import { Touchpad, type PadCmd } from './Touchpad';

/** What the hub needs from the app (kept narrow so it can be tested with a stub). */
export interface InputHost {
  readonly layers: Layers;
  readonly mode: GameMode | null;
  readonly paused: boolean;
  togglePause(force?: boolean): void;
  recenter(): void;
  /** touchpad aiming switched on in the settings */
  touchpadEnabled(): boolean;
  /** another input owns the crosshair right now (the headset controller ray) */
  cursorOwnedElsewhere(): boolean;
}

/** Synthetic pointer id for controller / keyboard / touchpad shots. */
export const CURSOR_POINTER_ID = -2;
/** Cursor speed at full stick deflection, in visible-image widths per second. */
const CURSOR_SPEED = 1.1;
/** A controller-aimed crosshair stays visible this long after the last use. */
const CURSOR_SHOW_MS = 6000;

/**
 * Gamepad + keyboard + touchpad → game. Owns the virtual crosshair (video px) for players who
 * can't tap directly on a target – display-glasses players look at the glasses, not the phone.
 * Runs its own frame poll so the menus are controllable before any round has started.
 */
export class InputHub {
  readonly touchpad = new Touchpad();
  readonly menu: MenuNav;
  cursor: Vec2 | null = null;
  /** last device that produced input (shown in settings, used for hints) */
  device: 'touch' | 'gamepad' | 'keyboard' = 'touch';
  padId = '';
  private keys = new Set<string>();
  /** keys pressed since the last frame – a quick tap between two (slow) frames still counts */
  private tapped = new Set<string>();
  private prev: Intents = noIntents();
  private cursorUntil = 0;
  private fireHeld = false;
  private lastNow = 0;
  private attached: GameMode | null = null;
  private raf = 0;
  private running = false;
  /** e2e: a fake pad that replaces navigator.getGamepads() */
  testPad: PadLike | null = null;

  constructor(
    private readonly host: InputHost,
    uiRoot: HTMLElement,
  ) {
    this.menu = new MenuNav(uiRoot);
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', (e) => {
      this.padId = (e as GamepadEvent).gamepad?.id ?? 'gamepad';
      this.start();
    });
    this.start();
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    const frame = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(frame);
      try {
        this.update(now);
      } catch (e) {
        console.error(e);
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private kind(m: GameMode | null): ModeKind {
    return m?.id === 'side-runner' ? 'runner' : 'shooter';
  }

  private inPlay(): boolean {
    return !!this.host.mode && !this.host.paused;
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
    if (!down) {
      this.keys.delete(e.code);
      return;
    }
    if (this.host.mode && this.host.paused) {
      // in the pause menu only Escape / P resume; Space and Enter press the focused button
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (!e.repeat) this.host.togglePause(false);
      }
      return;
    }
    if (!this.inPlay() || !GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    this.keys.add(e.code);
    this.tapped.add(e.code);
    this.device = 'keyboard';
  }

  /** First connected gamepad (or the e2e stub). */
  pad(): PadLike | null {
    if (this.testPad) return this.testPad;
    let pads: (Gamepad | null)[] = [];
    try {
      pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch {
      return null; // blocked by a permissions policy
    }
    const gp = pads.find((p) => p && p.connected) ?? null;
    if (gp) this.padId = gp.id;
    return gp;
  }

  /** A new round (or none): resets cursor and held state. */
  attach(mode: GameMode | null): void {
    // a trigger still held on the previous round is released there, not on the new one
    if (this.attached && this.fireHeld) this.firePointer('cancel', this.lastNow, this.attached);
    this.fireHeld = false;
    this.attached = mode;
    this.keys.clear();
    this.tapped.clear();
    this.touchpad.cancel();
    this.cursor = mode ? this.center() : null;
    this.cursorUntil = 0;
    this.menu.release();
    this.justAttached = true;
  }

  /** the first frame of a round: buttons still held from the menu are not new presses */
  private justAttached = false;

  private center(): Vec2 {
    const v = this.host.layers.visibleRect();
    return { x: v.x + v.w / 2, y: v.y + v.h / 2 };
  }

  private clampCursor(p: Vec2): Vec2 {
    const v = this.host.layers.visibleRect();
    return { x: Math.max(v.x, Math.min(v.x + v.w, p.x)), y: Math.max(v.y, Math.min(v.y + v.h, p.y)) };
  }

  private firePointer(type: PointerEv['type'], now: number, target?: GameMode): void {
    const m = target ?? this.host.mode;
    if (!m) return;
    const c = this.cursor ?? this.center();
    m.pointer({ type, x: c.x, y: c.y, t: now, id: CURSOR_POINTER_ID });
  }

  private moveCursor(dxVideo: number, dyVideo: number, now: number): void {
    if (!dxVideo && !dyVideo) return;
    this.cursor = this.clampCursor({ x: (this.cursor ?? this.center()).x + dxVideo, y: (this.cursor ?? this.center()).y + dyVideo });
    this.cursorUntil = now + CURSOR_SHOW_MS;
    if (this.fireHeld) this.firePointer('move', now);
  }

  /** Is the touchpad scheme active for this mode? (the runner keeps its tap = jump controls) */
  touchpadActive(mode: GameMode): boolean {
    return this.host.touchpadEnabled() && this.kind(mode) === 'shooter';
  }

  /** Touch events from the play overlay while the touchpad scheme is on (CSS px). */
  touch(type: PointerEv['type'], id: number, cssX: number, cssY: number, now: number): void {
    this.device = 'touch';
    const cmds = type === 'down' ? this.touchpad.down(id, cssX, cssY, now) : type === 'move' ? this.touchpad.move(id, cssX, cssY, now) : type === 'up' ? this.touchpad.up(id, now) : this.touchpad.cancel();
    this.apply(cmds, now);
  }

  private apply(cmds: PadCmd[], now: number): void {
    const s = this.host.layers.scale || 1;
    for (const c of cmds) {
      if (c.kind === 'move') this.moveCursor(c.dx / s, c.dy / s, now);
      else if (c.kind === 'fireDown') {
        this.fireHeld = true;
        this.firePointer('down', now);
      } else if (c.kind === 'fireUp') {
        if (this.fireHeld) this.firePointer('up', now);
        this.fireHeld = false;
      } else if (c.kind === 'tap') {
        this.firePointer('down', now);
        this.firePointer('up', now);
      }
    }
  }

  get cursorVisible(): boolean {
    return !!this.cursor && (this.lastNow < this.cursorUntil || (!!this.attached && this.touchpadActive(this.attached)));
  }

  update(now: number): void {
    const dt = this.lastNow ? Math.min(0.05, Math.max(0, (now - this.lastNow) / 1000)) : 0;
    this.lastNow = now;
    const mode = this.host.mode;
    if (mode !== this.attached) this.attach(mode);
    const gp = this.pad();
    const pausedBefore = this.host.paused;
    // the menu always sees the pad (so a held button is not a new press later), but only acts in menus
    this.menu.update(gp, now, !mode || pausedBefore);
    const kind = this.kind(mode);
    const fromPad = gp ? padIntents(gp, kind) : noIntents();
    const fromKeys = keyIntents(this.tapped.size ? new Set([...this.keys, ...this.tapped]) : this.keys, kind);
    this.tapped.clear();
    const it = mergeIntents(fromPad, fromKeys);
    const ed = edges(this.prev, it);
    this.prev = it;
    if (!mode) return;
    // A on "Resume" must not also fire; buttons held from the menu do not act on the first frame of a round
    if (this.justAttached || this.host.paused !== pausedBefore) {
      this.justAttached = false;
      return;
    }
    if (gp && (ed.pressed.length || fromPad.aim.x || fromPad.aim.y)) this.device = 'gamepad';
    // Start / Escape toggle the pause, also from inside the pause menu
    if (ed.pressed.includes('pause') && fromPad.pause) this.host.togglePause();
    else if (ed.pressed.includes('pause') && !this.host.paused) this.host.togglePause(true);
    if (this.host.paused) {
      if (this.fireHeld) {
        this.firePointer('cancel', now);
        this.fireHeld = false;
      }
      return;
    }
    const acts = mode.actions();
    for (const k of ed.pressed) {
      if (k === 'recenter' && acts.recenter) this.host.recenter();
      else if (k === 'swap') acts.swap?.();
      else if (k === 'reload') acts.reload?.();
      else if (k === 'jump') acts.jump?.();
      else if (k === 'duck') acts.duck?.();
      else if (k === 'fire') {
        if (!this.cursor) this.cursor = this.center();
        this.cursorUntil = now + CURSOR_SHOW_MS;
        this.fireHeld = true;
        this.firePointer('down', now);
      }
    }
    for (const k of ed.released) {
      if (k === 'jump') acts.jumpRelease?.();
      else if (k === 'duck') acts.duckRelease?.();
      else if (k === 'fire' && this.fireHeld) {
        this.fireHeld = false;
        this.firePointer('up', now);
      }
    }
    if (kind === 'shooter') {
      const v = this.host.layers.visibleRect();
      const speed = CURSOR_SPEED * v.w * dt;
      this.moveCursor(it.aim.x * speed, it.aim.y * speed, now);
      this.apply(this.touchpad.tick(now), now);
      if (!this.host.cursorOwnedElsewhere()) mode.setCursor?.(this.cursorVisible ? this.cursor : null);
    }
  }
}
