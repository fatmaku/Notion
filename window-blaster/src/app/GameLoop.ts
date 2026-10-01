/** requestAnimationFrame loop with clamped dt, time scale (hit-stop) and fps stats. */
export class GameLoop {
  private raf = 0;
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

  constructor(private readonly tick: (dt: number, now: number, gameTime: number) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.fpsT = this.last;
    const frame = (now: number) => {
      if (!this.running) return;
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
      this.raf = requestAnimationFrame(frame);
      try {
        this.tick(scaled, now, this.gameTime);
      } catch (e) {
        this.errors++;
        this.onError?.(e);
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  get isRunning(): boolean {
    return this.running;
  }
}
