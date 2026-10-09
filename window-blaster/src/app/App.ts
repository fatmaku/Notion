import type { GameMode, RoundResult } from '../game/GameMode';
import { ShooterMode } from '../game/shooter/ShooterMode';
import { RunnerMode } from '../game/runner/RunnerMode';
import { Records, todayKey } from '../game/scoring/Records';
import { weeklyChallenge } from '../game/scoring/Challenges';
import { ChallengesScreen } from '../ui/screens/ChallengesScreen';
import { detectLang, setLang, T, tf, type Lang } from '../ui/i18n';
import { DemoSource } from '../camera/DemoSource';
import { CameraSource, explainCameraError } from '../camera/CameraSource';
import { Motion } from '../sensors/Motion';
import { CameraScreen } from '../ui/screens/CameraScreen';
import { videoReady, type FrameSource } from '../camera/FrameSource';
import type { Detector } from '../vision/Detector';
import { MockDetector } from '../vision/MockDetector';
import { DetectionScheduler } from '../vision/DetectionScheduler';
import { Tracker } from '../vision/Tracker';
import { fullFrameState, type WindowState } from '../vision/window/types';
import { WindowTracker } from '../vision/window/WindowTracker';
import { FrameGrabber, type GrayFrame } from '../vision/window/FrameGrabber';
import { CalibrateScreen, type CalibrateScreenApi } from '../ui/screens/CalibrateScreen';
import { Layers } from '../render/Layers';
import { FxRenderer } from '../render/FxRenderer';
import { Diagnostics } from '../debug/Diagnostics';
import { DebugOverlay } from '../debug/DebugOverlay';
import { Sfx } from '../audio/Sfx';
import { Music } from '../audio/Music';
import { Haptics } from '../sensors/Haptics';
import { WakeLock } from '../sensors/WakeLock';
import { Rng, hashString } from '../core/rng';
import { Router } from '../ui/Router';
import { toast } from '../ui/dom';
import { StartScreen } from '../ui/screens/StartScreen';
import { SafetyScreen } from '../ui/screens/SafetyScreen';
import { ModeScreen } from '../ui/screens/ModeScreen';
import { WeaponScreen } from '../ui/screens/WeaponScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { PlayScreen, setPauseVisible } from '../ui/screens/PlayScreen';
import { ResultsScreen } from '../ui/screens/ResultsScreen';
import { LeaderboardScreen } from '../ui/screens/LeaderboardScreen';
import { Leaderboard, ensurePlayerId, type SubmitResponse } from '../net/Leaderboard';
import { verifyRound } from '../../shared/verify';
import { OfflinePrep } from './OfflinePrep';
import { ErrorLog } from '../debug/ErrorLog';
import { Unlocks } from './Unlocks';
import { ShopScreen } from '../ui/screens/ShopScreen';
import { StatsScreen } from '../ui/screens/StatsScreen';
import { PartyBoardScreen, PartySetupScreen } from '../ui/screens/PartyScreen';
import type { Party } from './Party';
import { composeFrame, shareImage } from '../ui/share';
import type { Quad } from '../core/types';
import { GameLoop } from './GameLoop';
import { Settings } from './Settings';
import { Storage } from './Storage';
import { defaultSession, type Session } from './Session';
import type { Params } from './params';
import type { WeaponId } from '../core/types';
import { InputHub } from '../input/InputHub';
import { GlassesAlignScreen, type GlassesAlignApi } from '../ui/screens/GlassesAlignScreen';
import { GlassesScreen } from '../ui/screens/GlassesScreen';
import { SendScreen } from '../ui/screens/SendScreen';
import { XrPlayer, xrSupport, type XrCal, type XrSupport } from '../xr/XrPlayer';
import { landscapeFullscreen } from '../ui/dom';

export class App {
  readonly storage = new Storage();
  readonly settings = new Settings(this.storage);
  readonly records = new Records(this.storage);
  readonly diag = new Diagnostics();
  readonly sfx = new Sfx();
  readonly music = new Music(() => this.sfx.audio);
  readonly haptics = new Haptics();
  readonly wakeLock = new WakeLock();
  readonly motion = new Motion();
  readonly layers: Layers;
  readonly router: Router;
  readonly overlay: DebugOverlay;
  readonly loop: GameLoop;
  readonly leaderboard: Leaderboard;
  readonly offline = new OfflinePrep(import.meta.env.BASE_URL);
  readonly errors = new ErrorLog();
  readonly unlocks = new Unlocks(this.storage);
  online = typeof navigator === 'undefined' ? true : navigator.onLine;
  /** Android/Chrome install prompt (beforeinstallprompt), shown as a button on the start screen. */
  installPrompt: (Event & { prompt(): Promise<void> }) | null = null;
  /** A new app version took over (service worker): reload at the next safe moment. */
  private pendingReload = false;
  session: Session = defaultSession();
  /** Hot-seat duel in progress (null = normal play). */
  party: Party | null = null;

  frame: FrameSource | null = null;
  detector: Detector | null = null;
  scheduler: DetectionScheduler | null = null;
  tracker = new Tracker();
  windowTracker: WindowTracker | null = null;
  private readonly grabber = new FrameGrabber(240);
  private lastGrabAt = 0;
  private lastGray: GrayFrame | null = null;
  private calibrating: CalibrateScreenApi | null = null;
  mode: GameMode | null = null;
  paused = false;
  lastResult: RoundResult | null = null;
  private playEl: HTMLElement | null = null;
  private fxDebug: FxRenderer;
  /** gamepad, keyboard and touchpad input (glasses players can't tap on targets) */
  readonly input: InputHub;
  /** per-frame hook of the glasses alignment screen */
  private aligning: GlassesAlignApi | null = null;
  /** WebXR headset view (Quest, Android XR, Pico, …) */
  readonly xr: XrPlayer = new XrPlayer(this);
  xrSupport: XrSupport = { ar: false, vr: false, headset: false };

  constructor(readonly params: Params) {
    // language: ?lang= → the player's saved choice → the device language (English phones start in English)
    const savedLang = this.storage.get<{ lang?: Lang }>('settings.v1', {}).lang;
    this.settings.data.lang = params.lang ?? savedLang ?? detectLang();
    setLang(this.settings.data.lang);
    const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
    this.layers = new Layers($('stage'), $<HTMLVideoElement>('cam'), $<HTMLCanvasElement>('fx'), $<HTMLCanvasElement>('hud'));
    this.router = new Router($('ui'));
    this.input = new InputHub(this, $('ui'));
    this.overlay = new DebugOverlay($('debug'), this.diag);
    this.loop = new GameLoop((dt, now) => this.tick(dt, now));
    this.errors.install();
    this.loop.onError = (e) => {
      this.errors.push('tick', e);
      this.diag.set('tickErrors', this.loop.errors);
      if (this.loop.errors === 1) toast(T.appErrorCaught, 2500);
    };
    this.fxDebug = new FxRenderer(this.layers.fx);
    const pid = ensurePlayerId(
      () => this.storage.get<string | null>('playerId', null),
      (v) => this.storage.set('playerId', v),
    );
    this.leaderboard = new Leaderboard(import.meta.env.VITE_LEADERBOARD_URL || undefined, pid);
    this.motion.events.on('sample', (s) => this.windowTracker?.onMotion(s));
    window.addEventListener('online', () => {
      this.online = true;
      void this.leaderboard.flush().then((n) => n && toast(tf(T.appScoresFlushed, { n })));
      if (this.offline.state === 'missing' || this.offline.state === 'error') void this.offline.check();
    });
    window.addEventListener('offline', () => {
      this.online = false;
    });
    this.settings.onChange = () => this.applySettings();
    this.applySettings();
  }

  /** Video + effects of this moment as a small JPEG (null without a frame). */
  capture(): string | null {
    return this.layers.hasVideo ? composeFrame(this.layers) : null;
  }

  /** Pause menu: share the current view as a photo. */
  async sharePhoto(): Promise<void> {
    const url = this.capture();
    if (!url) {
      toast(T.appNoImage);
      return;
    }
    const res = await shareImage(url, `window-blaster-${Date.now()}.jpg`, T.appName);
    toast(res === 'shared' ? T.appShared : res === 'downloaded' ? T.appPhotoSaved : res === 'cancelled' ? T.appShareCancelled : T.appShareFailed);
  }

  showStats(): void {
    this.router.show(StatsScreen(this));
  }

  // ------------------------------------------------------------------ duel

  showPartySetup(): void {
    this.router.show(PartySetupScreen(this));
  }

  /** Starts a duel: the usual flow (safety → mode → weapons → camera) once, then turns alternate. */
  beginParty(party: Party): void {
    this.party = party;
    this.session.daily = false;
    this.beginFlow(this.params.demo ? 'demo' : 'camera');
  }

  showPartyBoard(): void {
    if (!this.party) return this.showStart();
    this.router.show(PartyBoardScreen(this, this.party));
  }

  /** Next player's turn: same mode, weapons and calibration. */
  partyPlayNext(): void {
    if (!this.party || this.party.done) return this.showPartyBoard();
    toast(tf(T.appPartyTurn, { name: this.party.current ?? '' }), 1800);
    this.startRound();
  }

  endParty(): void {
    this.party = null;
    this.showStart();
  }

  // ------------------------------------------------------- calibration memory

  private calibKey(): string {
    return `${this.session.mode}:${this.session.side}:${this.layers.videoW}x${this.layers.videoH}`;
  }

  /** Remembers the confirmed window per mode/side, so the next ride starts with it. */
  private rememberCalibration(): void {
    const wt = this.windowTracker;
    if (!wt || !this.layers.hasVideo || this.session.source !== 'camera') return;
    const s = wt.get();
    const all = this.storage.get<Record<string, { quad: Quad; groundV: number; full: boolean; at: number }>>('calib.v1', {});
    all[this.calibKey()] = { quad: s.mode === 'fullframe' ? wt.rawQuad : s.quad, groundV: wt.groundV, full: s.mode === 'fullframe', at: Date.now() };
    const keys = Object.keys(all).sort((a, b) => all[a].at - all[b].at);
    while (keys.length > 12) delete all[keys.shift()!];
    this.storage.set('calib.v1', all);
  }

  /** Restores the last confirmed window for this mode/side; returns whether one was applied. */
  private restoreCalibration(): boolean {
    const wt = this.windowTracker;
    if (!wt || !this.layers.hasVideo || this.session.source !== 'camera') return false;
    const saved = this.storage.get<Record<string, { quad: Quad; groundV: number; full: boolean; at: number }>>('calib.v1', {})[this.calibKey()];
    if (!saved) return false;
    if (saved.full) wt.setFullFrame(true);
    else wt.setManual(saved.quad);
    wt.groundV = saved.groundV;
    return true;
  }

  get windowState(): WindowState {
    return this.windowTracker?.get() ?? fullFrameState(this.layers.videoW || 1280, this.layers.videoH || 720);
  }

  touchpadEnabled(): boolean {
    return this.settings.data.touchpad;
  }

  /**
   * See-through glasses are in effect: switched on (or forced with ?glasses=1 for this visit) and the
   * real camera is the source – the demo street stays visible, and a headset session draws on its own.
   */
  get seeThrough(): boolean {
    if (this.xr.active) return false;
    return this.params.glasses || (this.settings.data.glasses && this.session.source === 'camera');
  }

  /** Black is transparent in see-through glasses: hide the camera image and align the effects with the real view. */
  applyGlasses(): void {
    const on = this.seeThrough;
    document.body.classList.toggle('glasses', on);
    this.layers.setCal(on ? this.settings.data.glassesCal : null);
  }

  /** The saved glasses alignment is missing, or was made in the other screen orientation. */
  get glassesNeedAlign(): boolean {
    const s = this.settings.data;
    if (!s.glassesAligned) return true;
    const aspect = this.layers.cssW / Math.max(1, this.layers.cssH);
    return s.glassesAspect > 0 && (s.glassesAspect > 1) !== (aspect > 1);
  }

  cursorOwnedElsewhere(): boolean {
    return this.xr.active;
  }

  // ------------------------------------------------------------- headset (WebXR)

  hfovDeg(): number {
    return this.settings.data.hfovDeg;
  }

  xrCal(): XrCal {
    return this.settings.data.xrCal;
  }

  saveXrCal(c: XrCal): void {
    this.settings.patch({ xrCal: { k: c.k, dx: c.dx, dy: c.dy } });
  }

  /** Is the next round played in the headset view? */
  get wantsXr(): boolean {
    return this.settings.data.headset && this.xrSupport.headset;
  }

  /** Enters the headset view – call from a click (WebXR needs a user gesture). */
  enterXr(): void {
    if (this.xr.active || !this.xrSupport.headset) return;
    // browsers only open a headset session from a real tap/click (a gamepad button or auto-start is not one)
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (ua && !ua.isActive) {
      toast(T.xrNeedsTap, 4000);
      return;
    }
    const kind = this.xrSupport.ar ? 'immersive-ar' : 'immersive-vr';
    this.xr.enter(kind, this.settings.data.xrView).catch((e: unknown) => {
      console.error(e);
      toast(tf(T.xrFailed, { err: String((e as Error)?.message ?? e) }), 4000);
    });
  }

  onXrEnd(reason: 'user' | 'pause' | 'camera' | 'error' | 'system'): void {
    this.applyGlasses(); // restores the glasses calibration of the 2D view
    if (reason === 'camera') toast(T.xrCameraStopped, 6000);
    else if (reason === 'error') toast(T.xrError, 4000);
    // left the headset in the middle of a round (B/Y button, system menu): show the pause menu
    if (this.mode && reason !== 'user' && !this.paused) this.togglePause(true);
  }

  applySettings(): void {
    const s = this.settings.data;
    setLang(s.lang);
    document.body.classList.toggle('left-handed', s.leftHanded);
    this.applyGlasses();
    this.sfx.enabled = s.sound && !this.params.test;
    this.sfx.volume = s.sfxVolume / 100;
    this.music.enabled = s.music && !this.params.test;
    this.music.volume = 0.5 * (s.musicVolume / 100);
    if (!this.music.enabled) this.music.stop();
    this.loop.minFrameMs = s.battery ? 33 : 0;
    this.scheduler?.configure(this.detectorOptions());
    this.haptics.enabled = s.haptics;
    this.motion.invertPan = s.invertPan;
    this.motion.invertTilt = s.invertTilt;
    this.windowTracker?.setHfov(s.hfovDeg);
    this.windowTracker?.setLatency(s.cameraLatencyMs);
    if (s.debug || this.params.debug) this.overlay.show();
    else this.overlay.hide();
  }

  /** Android browser tab (not the installed app): offline data may be evicted, and there is no icon to start from. */
  get androidBrowserTab(): boolean {
    return /Android/.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches && !matchMedia('(display-mode: fullscreen)').matches;
  }

  /** iPhone/iPad Safari tab (not the home-screen app): offline storage would not carry over to the app. */
  get iosBrowserTab(): boolean {
    const nav = navigator as Navigator & { standalone?: boolean };
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && nav.standalone === false;
  }

  async boot(): Promise<void> {
    if (import.meta.env.PROD && 'serviceWorker' in navigator && !this.params.nosw) {
      const hadController = !!navigator.serviceWorker.controller;
      this.registerWorker(1);
      // a new version activated: the running page may still reference old, now-deleted files → reload when safe
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) return; // first install claiming the page – nothing stale
        this.pendingReload = true;
        this.reloadIfSafe();
      });
      // a deferred update is applied as soon as an offline download ends
      this.offline.events.on('change', (s) => {
        if (s !== 'downloading' && s !== 'checking') this.reloadIfSafe();
      });
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as Event & { prompt(): Promise<void> };
      if (!this.mode && this.router.active?.el.dataset.screen === 'start') this.router.show(StartScreen(this));
    });
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      if (!this.mode && this.router.active?.el.dataset.screen === 'start') this.router.show(StartScreen(this));
    });
    void this.offline.check().then((st) => {
      // auto-prepare on connections that are not metered (desktop / Wi-Fi); phones on mobile data get a button.
      // In an iPhone Safari tab the download would land in Safari's storage, not the home-screen app's → skip.
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string } }).connection;
      const metered = conn?.saveData || conn?.type === 'cellular';
      if (st === 'missing' && this.online && !metered && !this.params.test && !this.iosBrowserTab) void this.offline.prepare();
    });
    void this.leaderboard.flush();
    const p = this.params;
    if (p.mode) this.session.mode = p.mode;
    if (p.weapons?.length) this.session.weapons = [p.weapons[0], p.weapons[1] ?? p.weapons[0]];
    if (p.seed !== null) this.session.seed = p.seed;
    if (p.mode && p.mode !== 'front-shooter') this.session.side = 'right';
    (window as unknown as { __wb: unknown }).__wb = {
      app: this,
      snapshot: () => ({ ...this.diag.snapshot(), ...(this.mode?.snapshot() ?? {}), ...this.xr.snapshot(), screen: this.router.active?.el.className ?? '', paused: this.paused }),
      /** e2e: the client's event log must replay to the same score the server would compute. */
      verifyLast: () => (this.lastResult ? verifyRound({ ...this.lastResult, source: 'camera' }) : { ok: false, verifiedScore: 0, reason: 'no-round' }),
    };
    this.diag.set('version', __APP_VERSION__);
    void xrSupport().then((x) => {
      this.xrSupport = x;
      this.diag.set('xr', `${x.ar ? 'ar' : ''}${x.vr ? 'vr' : ''}${x.headset ? ' headset' : ''}` || 'none');
      if (!this.mode && this.router.active?.el.dataset.screen === 'start') this.router.show(StartScreen(this));
    });
    if (p.skipTo) {
      this.session.source = p.demo ? 'demo' : 'camera';
      try {
        await this.startSource();
        if (p.skipTo === 'calibrate') this.showCalibrate();
        else this.startRound();
      } catch (e) {
        console.error(e);
        toast(String((e as Error).message ?? e));
        this.showStart();
      }
      return;
    }
    this.showStart();
  }

  // ------------------------------------------------------------------ navigation

  showStart(): void {
    this.mode = null;
    this.paused = false;
    this.wakeLock.release();
    if (this.reloadIfSafe(true)) return;
    this.router.show(StartScreen(this));
  }

  /**
   * Registers the service worker. An install that fails (e.g. Wi-Fi dropped) is retried once;
   * after that the start screen stops promising offline play.
   */
  private registerWorker(retries: number): void {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        const watch = (w: ServiceWorker | null) =>
          w?.addEventListener('statechange', () => {
            if (w.state === 'activated') void this.offline.check();
            if (w.state === 'redundant' && !reg.active) {
              if (retries > 0) setTimeout(() => this.registerWorker(retries - 1), 4000);
              else this.offline.markServiceWorkerBroken();
            }
          });
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
      })
      .catch(() => this.offline.markServiceWorkerBroken());
  }

  /**
   * Reload into the new version only at a clean point: on the start screen (or while going there),
   * never during a round, calibration, a download or the setup screens.
   */
  private reloadIfSafe(goingToStart = false): boolean {
    const onStart = goingToStart || this.router.active?.el.dataset.screen === 'start';
    if (!this.pendingReload || !onStart || this.mode || this.offline.state === 'downloading' || this.calibrating) return false;
    toast(T.appNewVersionReload, 1500);
    setTimeout(() => location.reload(), 300);
    return true;
  }

  showChallenges(): void {
    this.router.show(ChallengesScreen(this));
  }

  beginFlow(source: 'camera' | 'demo', challenge: 'none' | 'daily' | 'weekly' = 'none'): void {
    this.session.source = source;
    this.session.daily = challenge === 'daily';
    this.session.weekly = challenge === 'weekly';
    this.applyGlasses();
    if (this.session.weekly) {
      // fixed setup for the whole week – chosen for everyone by the week key
      const wk = weeklyChallenge();
      this.session.mode = wk.mode;
      this.session.weapons = wk.weapons;
      this.session.side = wk.mode === 'front-shooter' ? 'front' : 'right';
    }
    this.sfx.unlock();
    this.router.show(SafetyScreen(this));
  }

  afterSafety(): void {
    // the weekly challenge fixes mode and weapons: straight on to the camera
    if (this.session.weekly) this.afterWeapons();
    else this.showModeScreen();
  }

  showModeScreen(): void {
    this.router.show(ModeScreen(this));
  }

  afterMode(): void {
    if (this.session.mode === 'side-runner') this.afterWeapons();
    else this.router.show(WeaponScreen(this));
  }

  afterWeapons(): void {
    if (this.session.source === 'camera') this.router.show(CameraScreen(this));
    else void this.prepareAndPlay();
  }

  /** Camera + detector are running; continue to calibration. */
  afterCamera(): void {
    // see-through glasses: line the view up first, so the window can be marked on the aligned (faint) camera image
    if (this.seeThrough && this.glassesNeedAlign) this.showGlassesAlign(() => this.showCalibrate(), () => this.showModeScreen());
    else this.showCalibrate();
  }

  showCalibrate(): void {
    this.mode = null;
    if (this.restoreCalibration()) toast(T.appCalibRestored, 2500);
    const screen = CalibrateScreen(this);
    this.calibrating = screen;
    this.router.show({
      el: screen.el,
      // with see-through glasses the window is marked on the faint camera image
      enter: () => document.body.classList.toggle('glasses-ghost', this.seeThrough),
      exit: () => {
        if (this.calibrating === screen) this.calibrating = null;
        document.body.classList.remove('glasses-ghost');
      },
    });
  }

  afterCalibrate(): void {
    this.calibrating = null;
    this.rememberCalibration();
    this.startRound();
  }

  showGlasses(): void {
    this.router.show(GlassesScreen(this));
  }

  /** QR codes that bring the game onto another device. */
  showSend(onBack?: () => void): void {
    this.router.show(SendScreen(this, onBack));
  }

  /** Glasses alignment; starts the camera (or demo) itself when nothing is running yet. */
  showGlassesAlign(onDone: () => void, onBack: () => void): void {
    this.mode = null;
    const screen = GlassesAlignScreen(this, onDone, onBack);
    this.aligning = screen;
    this.router.show({
      el: screen.el,
      enter: () => screen.enter?.(),
      exit: () => {
        if (this.aligning === screen) this.aligning = null;
        screen.exit?.();
      },
    });
  }

  showSettings(): void {
    const back = () => {
      if (this.mode && this.playEl) {
        this.router.show(PlayScreen(this, this.mode));
        this.playEl = this.router.active!.el;
        this.paused = true;
        this.mode.pause();
        setPauseVisible(this.playEl, true);
      } else this.showStart();
    };
    this.router.show(SettingsScreen(this, back));
  }

  showLeaderboard(): void {
    this.router.show(LeaderboardScreen(this));
  }

  showShop(onBack?: () => void): void {
    this.router.show(ShopScreen(this, onBack ?? (() => this.showStart())));
  }

  /** Push selected skins / crosshair / palette into the running mode and body classes. */
  applyUnlocks(): void {
    document.body.classList.toggle('left-handed', this.settings.data.leftHanded);
    const m = this.mode as (GameMode & { skin?: { color: string; shade: string; cuff: string }; applyUnlocks?: (u: Unlocks) => void }) | null;
    const skin = this.unlocks.selected('skin')?.skin;
    if (m && skin && 'skin' in m) m.skin = skin;
    m?.applyUnlocks?.(this.unlocks);
  }

  // ------------------------------------------------------------------- pipeline

  private async prepareAndPlay(): Promise<void> {
    try {
      await this.startSource();
    } catch (e) {
      console.error(e);
      toast(String((e as Error).message ?? e), 4000);
      this.showStart();
      return;
    }
    this.showCalibrate();
  }

  /** Starts (or reuses) the frame source + detector pipeline for the current session. */
  async startSource(onProgress?: (f: number, label: string) => void): Promise<void> {
    const wantDemo = this.session.source === 'demo';
    const sideMode = this.session.mode !== 'front-shooter';
    if (!wantDemo && this.frame?.kind === 'camera' && this.scheduler) return;
    this.stopSource();
    const video = this.layers.video;
    if (wantDemo) {
      const demo = new DemoSource(video, {
        mode: sideMode ? 'side' : 'front',
        seed: this.session.seed,
        night: this.params.night,
        shake: this.params.noShake ? 0 : 6,
        dir: this.session.side === 'left' ? -1 : 1,
      });
      this.frame = demo;
      this.detector = new MockDetector(() => demo.truth(), { seed: this.session.seed, frame: { w: demo.width, h: demo.height } });
    } else {
      this.frame = new CameraSource(video, { deviceId: this.settings.data.cameraId || undefined });
      // lazy: keeps the MediaPipe loader out of the initial bundle (demo mode never needs it)
      let MediaPipeDetector: typeof import('../vision/MediaPipeDetector').MediaPipeDetector;
      try {
        ({ MediaPipeDetector } = await import('../vision/MediaPipeDetector'));
      } catch (e) {
        // the page belongs to an older version whose files are gone → reload once into the current one
        if (!sessionStorage.getItem('wb.chunkReload')) {
          sessionStorage.setItem('wb.chunkReload', '1');
          location.reload();
        }
        throw new Error(T.appChunkMissing);
      }
      sessionStorage.removeItem('wb.chunkReload');
      this.detector = new MediaPipeDetector({
        wasmBase: `${import.meta.env.BASE_URL}mediapipe/wasm`,
        modelPath: `${import.meta.env.BASE_URL}models/efficientdet_lite0.tflite`,
        preferGpu: true,
      });
    }
    try {
      await this.frame.start();
    } catch (e) {
      this.frame = null;
      throw new Error(explainCameraError(e));
    }
    onProgress?.(0.01, T.appCameraRunning);
    const t0 = performance.now();
    while (!videoReady(video) && performance.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 30));
    if (!videoReady(video)) throw new Error(T.appNoVideo);
    this.layers.beginFrame();
    const w = video.videoWidth;
    const h = video.videoHeight;
    this.windowTracker = new WindowTracker({ frameW: w, frameH: h, hfovDeg: this.settings.data.hfovDeg, latencyMs: this.settings.data.cameraLatencyMs });
    this.tracker = new Tracker({ frame: { w, h }, confirmHits: 2 });
    await this.detector.init((f, label) => {
      this.diag.set('model', `${label} ${(f * 100).toFixed(0)}%`);
      onProgress?.(f, label);
    });
    this.diag.set('detector', `${this.detector.info.name}/${this.detector.info.delegate}`);
    if (this.frame.kind === 'camera') {
      const st = (this.frame as CameraSource).settings();
      if (st) this.diag.set('camera', `${st.width}x${st.height}@${st.frameRate ?? '?'}`);
      this.motion.invertPan = this.settings.data.invertPan;
      this.motion.invertTilt = this.settings.data.invertTilt;
      this.motion.start();
    }
    const det = this.detector;
    this.scheduler = new DetectionScheduler(
      det,
      () => (videoReady(video) ? video : null),
      (dets, ts, cost) => {
        this.tracker.update(dets, ts);
        this.diag.set('detMs', cost);
        this.diag.set('detHz', this.scheduler?.stats.hz ?? 0);
        this.diag.set('dets', dets.length);
      },
      this.detectorOptions(),
    );
    this.scheduler.start();
    this.applyGlasses();
    this.frame.onEnded(() => {
      this.diag.set('source', 'ended');
      if (this.mode && !this.paused) this.togglePause(true);
    });
    this.loop.start();
  }

  /** Detection cadence: e2e wants it fast and deterministic, battery mode wants it lazy. */
  private detectorOptions(): { minIntervalMs: number; maxDuty: number } {
    if (this.params.test) return { minIntervalMs: 40, maxDuty: 0.6 };
    return this.settings.data.battery ? { minIntervalMs: 130, maxDuty: 0.25 } : { minIntervalMs: 50, maxDuty: 0.4 };
  }

  stopSource(): void {
    this.scheduler?.stop();
    this.scheduler = null;
    this.frame?.stop();
    this.frame = null;
    this.detector?.dispose();
    this.detector = null;
    this.tracker.clear();
  }

  // ---------------------------------------------------------------------- rounds

  startRound(): void {
    if (!this.frame) {
      void this.prepareAndPlay();
      return;
    }
    this.session.seed = this.params.seed ?? (this.session.weekly ? weeklyChallenge().seed : this.session.daily ? hashString(`${todayKey()}:${this.session.mode}`) : (Date.now() % 1000003) | 0);
    // URL params may name locked weapons (tests / links); allow them only when unlocked or in test mode
    if (!this.params.test) this.session.weapons = this.session.weapons.map((w) => (this.unlocks.weaponUnlocked(w) ? w : 'smg')) as [WeaponId, WeaponId];
    const mode: GameMode = this.session.mode === 'side-runner' ? new RunnerMode() : new ShooterMode(this.session.mode);
    this.mode = mode;
    this.paused = false;
    const roundSeconds = this.params.round ?? this.settings.data.roundSeconds;
    mode.enter({
      layers: this.layers,
      tracker: this.tracker,
      frame: this.frame,
      session: this.session,
      settings: this.settings,
      diag: this.diag,
      rng: new Rng(this.session.seed),
      loop: this.loop,
      sfx: this.sfx,
      music: this.music,
      haptics: this.haptics,
      window: () => this.windowState,
      ground: () => {
        const ws = this.windowState;
        return this.windowTracker && (ws.mode === 'tracking' || ws.mode === 'degraded') ? this.windowTracker.ground() : null;
      },
      grayFrame: () => this.lastGray,
      now: () => performance.now(),
      end: (r) => this.endRound(r),
      recenter: () => this.recenter(),
      capture: () => this.capture(),
      seeThrough: () => this.seeThrough,
      testLives: this.params.test && this.params.lives ? this.params.lives : undefined,
      roundSeconds,
    });
    if (mode instanceof ShooterMode || mode instanceof RunnerMode) mode.bestScore = this.records.best(mode.id);
    this.applyUnlocks();
    const screen = PlayScreen(this, mode);
    this.router.show(screen);
    this.playEl = screen.el;
    void this.wakeLock.request();
    if (this.settings.data.glasses) landscapeFullscreen();
    if (this.wantsXr) this.enterXr();
  }

  endRound(r: RoundResult): void {
    if (!this.mode) return;
    this.mode = null;
    // results, sharing and the leaderboard are 2D pages
    if (this.xr.active) void this.xr.exit('user');
    this.music.stop(1.2);
    this.paused = false;
    this.loop.timeScale = 1;
    this.layers.setShake(null);
    this.lastResult = r;
    this.party?.record(r.score);
    const flags = this.records.save(r, { weekly: this.session.weekly });
    const before = this.unlocks.balance;
    this.unlocks.earn(r.score);
    const newlyAffordable = this.unlocks.newlyAffordable(before);
    this.wakeLock.release();
    this.router.show(ResultsScreen(this, r, { ...flags, newlyAffordable }));
  }

  abortRound(): void {
    if (!this.mode) return;
    const r = this.mode.abort();
    this.endRound(r);
  }

  togglePause(force?: boolean): void {
    // Settings opened from the pause menu: the round stays paused behind it
    if (!this.mode || !this.playEl || this.router.active?.el !== this.playEl) return;
    this.paused = force ?? !this.paused;
    if (this.paused) {
      this.mode.pause();
      this.music.pause();
    } else {
      this.mode.resume();
      this.music.resume();
    }
    setPauseVisible(this.playEl, this.paused);
  }

  recenter(): void {
    const ok = this.windowTracker?.recenter() ?? false;
    toast(ok ? T.appRecentered : T.appNoWindowFullFrame, 1500);
    if (!ok) this.windowTracker?.setFullFrame();
  }

  async submitScore(r: RoundResult): Promise<void> {
    const pre = verifyRound(r);
    if (!pre.ok) {
      toast(pre.reason === 'endless' ? T.appEndlessNotRanked : pre.reason === 'demo' ? T.appDemoNotRanked : tf(T.appRoundInvalid, { reason: pre.reason ?? '' }), 3000);
      return;
    }
    const name = this.settings.data.nickname || tf(T.appDefaultNickname, { n: Math.floor(Math.random() * 1000) });
    // the photo stays on the device
    const payload: RoundResult = { ...r, photo: undefined };
    if (!this.leaderboard.configured) {
      toast(T.appLeaderboardNotConfigured);
      return;
    }
    if (!this.online) {
      this.leaderboard.enqueue(name, payload);
      toast(T.queuedScore, 3000);
      return;
    }
    const res: SubmitResponse = await this.leaderboard.submit(name, payload).catch(() => ({ ok: false, error: 'network' }) as SubmitResponse);
    if (res.ok) toast(`${tf(T.appSubmittedAs, { name })}${res.rank ? ` – ${tf(T.appSubmittedRank, { rank: res.rank })}` : ''}${res.dailyRank ? `, ${tf(T.appSubmittedDailyRank, { rank: res.dailyRank })}` : ''}`);
    else if (res.error === 'network') {
      this.leaderboard.enqueue(name, payload);
      toast(T.queuedScore, 3000);
    } else toast(tf(T.appSubmitRejected, { error: res.error ?? T.appErrorFallback }));
  }

  // ------------------------------------------------------------------------ loop

  private tick(dt: number, now: number): void {
    const L = this.layers;
    L.beginFrame();
    if (this.windowTracker && now - this.lastGrabAt >= 66 && videoReady(L.video)) {
      this.lastGrabAt = now;
      const g = this.grabber.grab(L.video, now);
      if (g) {
        this.lastGray = g;
        this.windowTracker.observe(g);
      }
      const ws = this.windowTracker.get();
      this.diag.set('win', `${ws.mode} ${(ws.confidence * 100).toFixed(0)}%`);
      this.diag.set('focal', `${this.windowTracker.focal.f.toFixed(0)}px s${this.windowTracker.focal.sign} n${this.windowTracker.focal.samples}`);
      this.diag.set('gyro', `${this.motion.status} ${this.motion.samples}`);
    }
    if (this.calibrating) {
      const ws = this.windowState;
      if (ws.mode !== 'fullframe') this.fxDebug.outsideQuadDim(ws.quad, L.frameRect(), 0.35);
      this.fxDebug.quad(ws.quad, ws.mode === 'tracking' ? '#22c55e' : ws.mode === 'degraded' ? '#f59e0b' : '#94a3b8', 3, ws.mode === 'fullframe' ? [12, 10] : []);
      if (this.session.mode === 'side-runner' && this.windowTracker) {
        const [a, b] = this.windowTracker.ground();
        L.fx.strokeStyle = '#38bdf8';
        L.fx.lineWidth = 3;
        L.fx.setLineDash([14, 8]);
        L.fx.beginPath();
        L.fx.moveTo(a.x, a.y);
        L.fx.lineTo(b.x, b.y);
        L.fx.stroke();
        L.fx.setLineDash([]);
      }
      for (const t of this.tracker.active) this.fxDebug.bracket(t.predict(now - this.settings.data.cameraLatencyMs), 'rgba(255,255,255,0.4)', 2);
      this.calibrating.onFrame();
    }
    this.aligning?.onFrame(now);
    if (this.mode) {
      if (!this.paused) this.mode.update(dt, now);
      if (!this.mode) return;
      this.mode.render();
      const off = (this.mode as { visualOffset?: () => { x: number; y: number } }).visualOffset?.();
      // see-through glasses: the real world does not shake, so neither may the effects
      if (off) L.setShake(this.seeThrough ? null : off);
    } else if (this.settings.data.showBoxes || this.params.debug) {
      const vt = now - this.settings.data.cameraLatencyMs;
      for (const t of this.tracker.tracks) this.fxDebug.debugTrack(t, t.predict(vt));
    }
    this.diag.set('fps', this.loop.fps);
    this.diag.set('tracks', this.tracker.tracks.length);
    this.diag.set('video', `${L.videoW}x${L.videoH}`);
  }
}
