import type { GameMode, RoundResult } from '../game/GameMode';
import { ShooterMode } from '../game/shooter/ShooterMode';
import { RunnerMode } from '../game/runner/RunnerMode';
import { Records, todayKey } from '../game/scoring/Records';
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
import { T } from '../ui/i18n/de';
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
import { GameLoop } from './GameLoop';
import { Settings } from './Settings';
import { Storage } from './Storage';
import { defaultSession, type Session } from './Session';
import type { Params } from './params';
import type { WeaponId } from '../core/types';

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

  constructor(readonly params: Params) {
    const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
    this.layers = new Layers($('stage'), $<HTMLVideoElement>('cam'), $<HTMLCanvasElement>('fx'), $<HTMLCanvasElement>('hud'));
    this.router = new Router($('ui'));
    this.overlay = new DebugOverlay($('debug'), this.diag);
    this.loop = new GameLoop((dt, now) => this.tick(dt, now));
    this.errors.install();
    this.loop.onError = (e) => {
      this.errors.push('tick', e);
      this.diag.set('tickErrors', this.loop.errors);
      if (this.loop.errors === 1) toast('Fehler abgefangen – Spiel läuft weiter (Details im Menü)', 2500);
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
      void this.leaderboard.flush().then((n) => n && toast(`${n} Ranglisten-Eintrag/-Einträge nachgereicht`));
      if (this.offline.state === 'missing' || this.offline.state === 'error') void this.offline.check();
    });
    window.addEventListener('offline', () => {
      this.online = false;
    });
    this.applySettings();
  }

  get windowState(): WindowState {
    return this.windowTracker?.get() ?? fullFrameState(this.layers.videoW || 1280, this.layers.videoH || 720);
  }

  applySettings(): void {
    const s = this.settings.data;
    document.body.classList.toggle('left-handed', s.leftHanded);
    this.sfx.enabled = s.sound && !this.params.test;
    this.music.enabled = s.music && !this.params.test;
    if (!this.music.enabled) this.music.stop();
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
      snapshot: () => ({ ...this.diag.snapshot(), ...(this.mode?.snapshot() ?? {}), screen: this.router.active?.el.className ?? '', paused: this.paused }),
      /** e2e: the client's event log must replay to the same score the server would compute. */
      verifyLast: () => (this.lastResult ? verifyRound({ ...this.lastResult, source: 'camera' }) : { ok: false, verifiedScore: 0, reason: 'no-round' }),
    };
    this.diag.set('version', __APP_VERSION__);
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
    toast('Neue Version – lädt neu …', 1500);
    setTimeout(() => location.reload(), 300);
    return true;
  }

  beginFlow(source: 'camera' | 'demo', daily = false): void {
    this.session.source = source;
    this.session.daily = daily;
    this.sfx.unlock();
    this.router.show(SafetyScreen(this));
  }

  afterSafety(): void {
    this.showModeScreen();
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
    this.showCalibrate();
  }

  showCalibrate(): void {
    this.mode = null;
    const screen = CalibrateScreen(this);
    this.calibrating = screen;
    this.router.show({
      el: screen.el,
      exit: () => {
        if (this.calibrating === screen) this.calibrating = null;
      },
    });
  }

  afterCalibrate(): void {
    this.calibrating = null;
    this.startRound();
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
      this.frame = new CameraSource(video);
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
        throw new Error('Ein Programmteil fehlt (alte Version im Zwischenspeicher). Bitte die Seite neu laden.');
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
    onProgress?.(0.01, 'Kamera läuft');
    const t0 = performance.now();
    while (!videoReady(video) && performance.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 30));
    if (!videoReady(video)) throw new Error('Kein Videobild (Kamera blockiert?)');
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
      this.params.test ? { minIntervalMs: 40, maxDuty: 0.6 } : {},
    );
    this.scheduler.start();
    this.frame.onEnded(() => {
      this.diag.set('source', 'ended');
      if (this.mode && !this.paused) this.togglePause(true);
    });
    this.loop.start();
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
    this.session.seed = this.params.seed ?? (this.session.daily ? hashString(`${todayKey()}:${this.session.mode}`) : (Date.now() % 1000003) | 0);
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
      roundSeconds,
    });
    if (mode instanceof ShooterMode || mode instanceof RunnerMode) mode.bestScore = this.records.best(mode.id);
    this.applyUnlocks();
    const screen = PlayScreen(this, mode);
    this.router.show(screen);
    this.playEl = screen.el;
    void this.wakeLock.request();
  }

  endRound(r: RoundResult): void {
    if (!this.mode) return;
    this.mode = null;
    this.music.stop(1.2);
    this.paused = false;
    this.loop.timeScale = 1;
    this.layers.video.style.transform = '';
    this.lastResult = r;
    const flags = this.records.save(r);
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
    if (!this.mode || !this.playEl) return;
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
    toast(ok ? 'Scheibe neu zentriert' : 'Keine Scheibe erkannt – ganzes Bild aktiv', 1500);
    if (!ok) this.windowTracker?.setFullFrame();
  }

  async submitScore(r: RoundResult): Promise<void> {
    const pre = verifyRound(r);
    if (!pre.ok) {
      toast(pre.reason === 'endless' ? 'Endlos-Runden zählen nicht für die Rangliste.' : pre.reason === 'demo' ? 'Demo-Runden zählen nicht für die Rangliste.' : `Runde nicht gültig (${pre.reason}).`, 3000);
      return;
    }
    const name = this.settings.data.nickname || `Fahrgast${Math.floor(Math.random() * 1000)}`;
    if (!this.leaderboard.configured) {
      toast('Weltweite Rangliste nicht eingerichtet.');
      return;
    }
    if (!this.online) {
      this.leaderboard.enqueue(name, r);
      toast(T.queuedScore, 3000);
      return;
    }
    const res: SubmitResponse = await this.leaderboard.submit(name, r).catch(() => ({ ok: false, error: 'network' }) as SubmitResponse);
    if (res.ok) toast(`Eingetragen als ${name}${res.rank ? ` – Platz ${res.rank}` : ''}${res.dailyRank ? `, heute Platz ${res.dailyRank}` : ''}`);
    else if (res.error === 'network') {
      this.leaderboard.enqueue(name, r);
      toast(T.queuedScore, 3000);
    } else toast(`Eintragen abgelehnt (${res.error ?? 'Fehler'}).`);
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
    if (this.mode) {
      if (!this.paused) this.mode.update(dt, now);
      if (!this.mode) return;
      this.mode.render();
      const off = (this.mode as { visualOffset?: () => { x: number; y: number } }).visualOffset?.();
      if (off) L.video.style.transform = off.x || off.y ? `translate(${off.x.toFixed(1)}px, ${off.y.toFixed(1)}px)` : '';
    } else if (this.settings.data.showBoxes || this.params.debug) {
      const vt = now - this.settings.data.cameraLatencyMs;
      for (const t of this.tracker.tracks) this.fxDebug.debugTrack(t, t.predict(vt));
    }
    this.diag.set('fps', this.loop.fps);
    this.diag.set('tracks', this.tracker.tracks.length);
    this.diag.set('video', `${L.videoW}x${L.videoH}`);
  }
}
