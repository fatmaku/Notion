/** Where frames come from: the window (default) or a WebXR session while it is presenting. */
export interface FrameScheduler {
  request(cb: (now: number) => void): number;
  cancel(handle: number): void;
}

const windowScheduler: FrameScheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (h) => cancelAnimationFrame(h),
};

/** requestAnimationFrame loop with clamped dt, time scale (hit-stop) and fps stats. */
export class GameLoop {
  private raf = 0;
  private scheduler: FrameScheduler = windowScheduler;
  private frameFn: ((now: number) => void) | null = null;
  private running = false;
  private last = 0;
  timeScale = 1;
  fps = 0;
  private frames = 0;
  private fpsT = 0;
  /** Game time in ms (affected by timeScale). */
  gameTime = 0;

  errors = 0;
  onError: ((e: unknown) => void) | null = null;
  /** Battery mode: skip frames so at most one tick runs per this many ms (0 = every frame). */
  minFrameMs = 0;

  constructor(private readonly tick: (dt: number, now: number, gameTime: number) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.fpsT = this.last;
    const frame = (now: number) => {
      if (!this.running) return;
      if (this.minFrameMs > 0 && now - this.last < this.minFrameMs - 2) {
        this.raf = this.scheduler.request(frame);
        return;
      }
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.05) dt = 0.05;
      if (dt < 0) dt = 0;
      const scaled = dt * this.timeScale;
      this.gameTime += scaled * 1000;
      this.frames++;
      if (now - this.fpsT >= 500) {
        this.fps = (this.frames * 1000) / (now - this.fpsT);
        this.frames = 0;
        this.fpsT = now;
      }
      // schedule first so a throwing frame can never end the loop
      this.raf = this.scheduler.request(frame);
      try {
        this.tick(scaled, now, this.gameTime);
      } catch (e) {
        this.errors++;
        this.onError?.(e);
      }
    };
    this.frameFn = frame;
    this.raf = this.scheduler.request(frame);
  }

  stop(): void {
    this.running = false;
    this.scheduler.cancel(this.raf);
  }

  /** Switches the frame source (WebXR sessions do not run window.requestAnimationFrame on headsets). */
  setScheduler(s: FrameScheduler | null): void {
    const next = s ?? windowScheduler;
    if (next === this.scheduler) return;
    if (this.running) this.scheduler.cancel(this.raf);
    this.scheduler = next;
    if (this.running && this.frameFn) this.raf = this.scheduler.request(this.frameFn);
  }

  get isRunning(): boolean {
    return this.running;
  }
}
