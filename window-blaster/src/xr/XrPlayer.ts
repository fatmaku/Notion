import type { GameMode, PointerEv } from '../game/GameMode';
import type { GameLoop } from '../app/GameLoop';
import type { Layers } from '../render/Layers';
import type { FrameSource } from '../camera/FrameSource';
import { XrRenderer } from './XrRenderer';
import { lazyFollow, localQuad, multiply, overlaySize, panelInFront, poseYaw, rayOf, rayQuadHit, type Mat4, type PanelPose, type V3 } from './xrMath';

/**
 * Headset play (Meta Quest 3/3S, Android XR, Pico, …) through WebXR.
 *
 * - "screen": a big floating screen with camera image + effects + HUD, world-placed with lazy
 *   follow (it glides back in front when you look away for a while – also absorbs tracking drift
 *   in vehicles). Works in immersive-ar (passthrough around it) and immersive-vr.
 * - "overlay": immersive-ar only, with the headset's own camera feeding the detector: the effect
 *   layer is head-locked at the camera's field of view so explosions sit on the real cars seen
 *   through passthrough. Alignment with the thumbsticks.
 *
 * Controller trigger / hand pinch = shoot (or jump), grip = swap weapon (or duck),
 * A/X = reload (or jump), B/Y = pause (leaves the headset view), thumbstick click = re-centre.
 */
export type XrKind = 'immersive-ar' | 'immersive-vr';
export type XrView = 'screen' | 'overlay';

export interface XrSupport {
  ar: boolean;
  vr: boolean;
  /** a headset (not a phone with ARCore): immersive-vr, or AR on a headset browser */
  headset: boolean;
}

export async function xrSupport(): Promise<XrSupport> {
  const xr = typeof navigator !== 'undefined' ? navigator.xr : undefined;
  if (!xr) return { ar: false, vr: false, headset: false };
  const ask = (m: XRSessionMode) => xr.isSessionSupported(m).catch(() => false);
  const [ar, vr] = await Promise.all([ask('immersive-ar'), ask('immersive-vr')]);
  const headsetUa = /OculusBrowser|Quest|Pico|Wolvic|HoloLens|Magic ?Leap|XR/i.test(navigator.userAgent);
  return { ar, vr, headset: vr || (ar && headsetUa) };
}

export interface XrCal {
  k: number;
  dx: number;
  dy: number;
}

export interface XrHost {
  readonly layers: Layers;
  readonly loop: GameLoop;
  readonly mode: GameMode | null;
  readonly paused: boolean;
  readonly frame: FrameSource | null;
  togglePause(force?: boolean): void;
  hfovDeg(): number;
  xrCal(): XrCal;
  saveXrCal(c: XrCal): void;
  /** the session ended (button, system menu, error); `reason` is shown as a toast in 2D */
  onXrEnd(reason: 'user' | 'pause' | 'camera' | 'error' | 'system'): void;
}

const SCREEN_DIST = 1.8;
const SCREEN_WIDTH = 1.7;
const OVERLAY_DIST = 3;
const RAY_LEN = 4;

interface SourceState {
  id: number;
  selecting: boolean;
  hit: { u: number; v: number; dist: number } | null;
  ray: { origin: V3; dir: V3 } | null;
  buttons: boolean[];
}

export class XrPlayer {
  session: XRSession | null = null;
  kind: XrKind = 'immersive-vr';
  view: XrView = 'screen';
  private gl: WebGL2RenderingContext | null = null;
  private renderer: XrRenderer | null = null;
  private ref: XRReferenceSpace | null = null;
  private panel: PanelPose | null = null;
  private follow = { awayFor: 0, moving: false };
  private gameCb: ((now: number) => void) | null = null;
  private readonly sources = new Map<XRInputSource, SourceState>();
  private nextId = 101;
  private lastT = 0;
  private aligning = false;
  private cal: XrCal = { k: 1, dx: 0, dy: 0 };
  private pausedByVisibility = false;
  private endReason: 'user' | 'pause' | 'camera' | 'error' | 'system' = 'system';
  private lastVideoT = -1;
  private videoStuckSince = 0;
  /** last primary aim on the panel (uv), e2e + cursor */
  aimUv: { u: number; v: number } | null = null;
  frames = 0;

  constructor(private readonly host: XrHost) {}

  get active(): boolean {
    return !!this.session;
  }

  /** Must run inside a user gesture (a click), like every WebXR session request. */
  async enter(kind: XrKind, view: XrView): Promise<void> {
    if (this.session) return;
    const xr = navigator.xr;
    if (!xr) throw new Error('WebXR unavailable');
    const session = await xr.requestSession(kind, { requiredFeatures: ['local'], optionalFeatures: ['hand-tracking'] });
    this.kind = kind;
    this.view = kind === 'immersive-ar' ? view : 'screen';
    this.cal = { ...this.host.xrCal() };
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { xrCompatible: true, alpha: true, antialias: false, premultipliedAlpha: true, depth: false }) as WebGL2RenderingContext | null;
      if (!gl) throw new Error('WebGL2 unavailable');
      this.gl = gl;
      this.renderer = new XrRenderer(gl);
      await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl, { alpha: true, antialias: false }), depthNear: 0.05, depthFar: 100 });
      this.ref = await session.requestReferenceSpace('local');
    } catch (e) {
      await session.end().catch(() => undefined);
      this.cleanup();
      throw e;
    }
    this.session = session;
    this.panel = null;
    this.follow = { awayFor: 0, moving: false };
    this.aligning = false;
    this.endReason = 'system';
    this.frames = 0;
    this.lastVideoT = -1;
    this.videoStuckSince = 0;
    // the effect layer is drawn without the phone-glasses calibration in the headset
    this.host.layers.setCal(null);
    session.addEventListener('end', () => this.onEnd());
    session.addEventListener('selectstart', (e) => this.onSelect(e as XRInputSourceEvent, 'down'));
    session.addEventListener('selectend', (e) => this.onSelect(e as XRInputSourceEvent, 'up'));
    session.addEventListener('squeezestart', (e) => this.onSqueeze(e as XRInputSourceEvent, true));
    session.addEventListener('squeezeend', (e) => this.onSqueeze(e as XRInputSourceEvent, false));
    session.addEventListener('inputsourceschange', (e) => {
      for (const s of (e as XRInputSourcesChangeEvent).removed) {
        const st = this.sources.get(s);
        if (st?.selecting) this.pointer('cancel', st);
        this.sources.delete(s);
      }
    });
    session.addEventListener('visibilitychange', () => {
      const visible = session.visibilityState === 'visible';
      if (!visible && this.host.mode && !this.host.paused) {
        this.pausedByVisibility = true;
        this.host.togglePause(true);
      } else if (visible && this.pausedByVisibility) {
        this.pausedByVisibility = false;
        if (this.host.mode && this.host.paused) this.host.togglePause(false);
      }
    });
    // the game loop runs on the session's frames (window.requestAnimationFrame stops on headsets)
    this.host.loop.setScheduler({
      request: (cb) => {
        this.gameCb = cb;
        return 1;
      },
      cancel: () => {
        this.gameCb = null;
      },
    });
    session.requestAnimationFrame(this.onFrame);
  }

  /** Leaves the headset view (results and menus are shown in the 2D browser window). */
  async exit(reason: 'user' | 'pause' | 'camera' | 'error' = 'user'): Promise<void> {
    if (!this.session) return;
    this.endReason = reason;
    await this.session.end().catch(() => this.onEnd());
  }

  private onEnd(): void {
    if (!this.gl && !this.session) return;
    const reason = this.endReason;
    for (const st of this.sources.values()) if (st.selecting) this.pointer('cancel', st);
    this.sources.clear();
    this.host.mode?.setCursor?.(null);
    this.cleanup();
    this.host.loop.setScheduler(null);
    this.host.onXrEnd(reason);
  }

  private cleanup(): void {
    this.renderer?.dispose();
    this.renderer = null;
    this.gl = null;
    this.session = null;
    this.ref = null;
    this.gameCb = null;
    this.aimUv = null;
  }

  private state(src: XRInputSource): SourceState {
    let st = this.sources.get(src);
    if (!st) {
      st = { id: this.nextId++, selecting: false, hit: null, ray: null, buttons: [] };
      this.sources.set(src, st);
    }
    return st;
  }

  /** Panel uv → video px through the stage mapping. */
  private toVideo(u: number, v: number): { x: number; y: number } {
    const L = this.host.layers;
    return L.toVideo(u * L.cssW, v * L.cssH);
  }

  private pointer(type: PointerEv['type'], st: SourceState): void {
    const m = this.host.mode;
    if (!m) return;
    const uv = st.hit ?? { u: 0.5, v: 0.5 };
    const p = this.toVideo(uv.u, uv.v);
    m.pointer({ type, x: p.x, y: p.y, t: performance.now(), id: st.id });
  }

  private onSelect(e: XRInputSourceEvent, kind: 'down' | 'up'): void {
    const st = this.state(e.inputSource);
    if (kind === 'down') {
      // refresh the hit for this exact moment, then press
      if (this.ref) this.updateRay(e.frame, e.inputSource, st);
      st.selecting = true;
      if (this.host.mode && !this.host.paused) this.pointer('down', st);
    } else if (st.selecting) {
      st.selecting = false;
      if (this.host.mode && !this.host.paused) this.pointer('up', st);
    }
  }

  private onSqueeze(_e: XRInputSourceEvent, down: boolean): void {
    const m = this.host.mode;
    if (!m || this.host.paused) return;
    const acts = m.actions();
    if (m.id === 'side-runner') {
      if (down) acts.duck?.();
      else acts.duckRelease?.();
    } else if (down) acts.swap?.();
  }

  private panelModel(head: Mat4): Mat4 {
    const L = this.host.layers;
    const aspect = L.cssH / Math.max(1, L.cssW);
    if (this.view === 'overlay') {
      const videoCssW = (L.videoW || 1280) * L.scale;
      const s = overlaySize(OVERLAY_DIST, this.host.hfovDeg(), L.cssW, L.cssH, videoCssW, this.cal.k);
      return multiply(head, localQuad({ x: this.cal.dx * s.w, y: -this.cal.dy * s.h, z: -OVERLAY_DIST }, s.w, s.h));
    }
    const p = this.panel!;
    return multiply(poseYaw(p.pos, p.yaw), localQuad({ x: 0, y: 0, z: 0 }, SCREEN_WIDTH, SCREEN_WIDTH * aspect));
  }

  private updateRay(frame: XRFrame, src: XRInputSource, st: SourceState, model?: Mat4): void {
    if (!this.ref) return;
    let pose: XRPose | undefined;
    try {
      pose = frame.getPose(src.targetRaySpace, this.ref);
    } catch {
      pose = undefined;
    }
    if (!pose) {
      st.ray = null;
      st.hit = null;
      return;
    }
    st.ray = rayOf(pose.transform.matrix);
    const m = model ?? this.lastModel;
    st.hit = m ? rayQuadHit(st.ray.origin, st.ray.dir, m) : null;
  }

  private lastModel: Mat4 | null = null;

  /** Thumbstick / button handling (polled – XR gamepads fire no DOM events). */
  private pollButtons(src: XRInputSource, st: SourceState, dt: number): void {
    const gp = src.gamepad;
    if (!gp) return;
    const pressed = (i: number) => !!gp.buttons[i]?.pressed;
    const edge = (i: number) => pressed(i) && !st.buttons[i];
    const m = this.host.mode;
    if (edge(3)) {
      // thumbstick click: overlay → toggle alignment; screen → bring the screen back in front
      if (this.view === 'overlay') {
        this.aligning = !this.aligning;
        if (!this.aligning) this.host.saveXrCal(this.cal);
      } else this.panel = null;
    }
    if (m && !this.host.paused) {
      const acts = m.actions();
      if (edge(4)) {
        if (m.id === 'side-runner') acts.jump?.();
        else acts.reload?.();
      }
      if (m.id === 'side-runner' && !pressed(4) && st.buttons[4]) acts.jumpRelease?.();
    }
    if (edge(5)) void this.exit('pause');
    if (this.aligning) {
      const x = gp.axes[2] ?? 0;
      const y = gp.axes[3] ?? 0;
      const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
      if (src.handedness === 'right') this.cal = { ...this.cal, k: Math.max(0.3, Math.min(4, this.cal.k * Math.exp(-dead(y) * dt * 0.6))) };
      else this.cal = { ...this.cal, dx: clamp(this.cal.dx + dead(x) * dt * 0.15, -0.6, 0.6), dy: clamp(this.cal.dy + dead(y) * dt * 0.15, -0.6, 0.6) };
    }
    st.buttons = gp.buttons.map((b) => b.pressed);
  }

  private readonly onFrame = (t: number, frame: XRFrame): void => {
    const session = this.session;
    if (!session) return;
    session.requestAnimationFrame(this.onFrame);
    const dt = this.lastT ? Math.min(0.1, (t - this.lastT) / 1000) : 0;
    this.lastT = t;
    this.frames++;
    // 1) game step (draws the effect layer and HUD canvases)
    const cb = this.gameCb;
    this.gameCb = null;
    try {
      cb?.(t);
    } catch (e) {
      console.error(e);
    }
    const gl = this.gl;
    const r = this.renderer;
    const layer = session.renderState.baseLayer;
    if (!gl || !r || !layer || !this.ref) return;
    const pose = frame.getViewerPose(this.ref);
    if (!pose) return;
    const head = pose.transform.matrix as unknown as Mat4;
    // 2) place the screen (lazy follow)
    if (this.view === 'screen') {
      const target = panelInFront(head, SCREEN_DIST);
      if (!this.panel) this.panel = target;
      else {
        const f = lazyFollow(this.panel, target, dt, this.follow);
        this.panel = f.pose;
        this.follow = { awayFor: f.awayFor, moving: f.moving };
      }
    }
    const model = this.panelModel(head);
    this.lastModel = model;
    // 3) input: rays, held triggers follow the aim, buttons
    let primary: SourceState | null = null;
    for (const src of session.inputSources) {
      const st = this.state(src);
      this.updateRay(frame, src, st, model);
      this.pollButtons(src, st, dt);
      if (st.selecting && st.hit && this.host.mode && !this.host.paused) this.pointer('move', st);
      if (st.hit && (!primary || st.selecting || src.handedness === 'right')) primary = st;
    }
    this.aimUv = primary?.hit ? { u: primary.hit.u, v: primary.hit.v } : null;
    const m = this.host.mode;
    if (m?.setCursor) m.setCursor(this.aimUv ? this.toVideo(this.aimUv.u, this.aimUv.v) : null);
    // 4) camera watchdog: some browsers stop camera frames inside immersive sessions
    const video = this.host.layers.video;
    if (this.host.frame?.kind === 'camera' && !this.host.paused) {
      if (video.currentTime !== this.lastVideoT) {
        this.lastVideoT = video.currentTime;
        this.videoStuckSince = t;
      } else if (this.videoStuckSince && t - this.videoStuckSince > 3500) {
        this.videoStuckSince = 0;
        void this.exit('camera');
        return;
      }
    }
    // 5) textures
    const L = this.host.layers;
    const showVideo = this.view === 'screen' || this.aligning;
    const hasVideo = showVideo && r.upload('video', video);
    r.upload('fx', L.fxCanvas);
    r.upload('hud', L.hudCanvas);
    const vis = L.visibleRect();
    const vw = L.videoW || 1;
    const vh = L.videoH || 1;
    const vidUv: [number, number, number, number] = [vis.x / vw, vis.y / vh, vis.w / vw, vis.h / vh];
    // 6) draw both eyes
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    const passthrough = this.kind === 'immersive-ar';
    gl.clearColor(passthrough ? 0 : 0.02, passthrough ? 0 : 0.03, passthrough ? 0 : 0.05, passthrough ? 0 : 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const view of pose.views) {
      const vp = layer.getViewport(view);
      if (!vp) continue;
      r.beginView(vp, null);
      const viewProj = multiply(view.projectionMatrix, view.transform.inverse.matrix);
      if (hasVideo) r.quad(viewProj, model, 'video', this.view === 'overlay' ? 0.45 : 1, vidUv);
      r.quad(viewProj, model, 'fx');
      r.quad(viewProj, model, 'hud');
      for (const st of this.sources.values()) {
        if (!st.ray) continue;
        const len = st.hit ? st.hit.dist : RAY_LEN;
        const end = { x: st.ray.origin.x + st.ray.dir.x * len, y: st.ray.origin.y + st.ray.dir.y * len, z: st.ray.origin.z + st.ray.dir.z * len };
        r.line(viewProj, st.ray.origin, end, st.selecting ? [1, 0.69, 0.13, 1] : [1, 1, 1, 0.6]);
      }
      if (this.aligning) r.line(viewProj, { x: model[12] - 0.05, y: model[13], z: model[14] }, { x: model[12] + 0.05, y: model[13], z: model[14] }, [0.22, 0.74, 0.97, 1]);
    }
  };

  /** e2e / diagnostics */
  snapshot(): Record<string, number | string | boolean> {
    return {
      xr: this.active,
      xrKind: this.kind,
      xrView: this.view,
      xrFrames: this.frames,
      xrAimU: this.aimUv?.u ?? -1,
      xrAimV: this.aimUv?.v ?? -1,
      xrSources: this.sources.size,
      xrAligning: this.aligning,
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
