import type { Detection } from '../core/types';
import type { Detector } from './Detector';

export interface SchedulerOptions {
  /** Never run more often than this. */
  minIntervalMs?: number;
  /** Keep the main thread free: inference time / period ≤ maxDuty. */
  maxDuty?: number;
  /** Cap on the period so slow devices still get a few detections per second. */
  maxIntervalMs?: number;
}

export interface SchedulerStats {
  lastCostMs: number;
  avgCostMs: number;
  hz: number;
  runs: number;
  errors: number;
}

/**
 * Runs the detector asynchronously at an adaptive cadence, decoupled from the
 * render loop. Detection results are stamped with their *capture* time so the
 * tracker can compensate latency.
 */
export class DetectionScheduler {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private wake: (() => void) | null = null;
  private lastTs = -1;
  private hzWindow: number[] = [];
  readonly stats: SchedulerStats = { lastCostMs: 0, avgCostMs: 0, hz: 0, runs: 0, errors: 0 };
  private readonly o: Required<SchedulerOptions>;

  constructor(
    private readonly detector: Detector,
    private readonly source: () => TexImageSource | null,
    private readonly onResult: (dets: Detection[], captureTs: number, costMs: number) => void,
    options: SchedulerOptions = {},
  ) {
    this.o = {
      minIntervalMs: options.minIntervalMs ?? 50,
      maxDuty: options.maxDuty ?? 0.4,
      maxIntervalMs: options.maxIntervalMs ?? 400,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.wake?.();
    this.wake = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const src = this.source();
      let cost = 0;
      if (src) {
        let ts = performance.now();
        if (ts <= this.lastTs) ts = this.lastTs + 1; // MediaPipe VIDEO mode needs strictly increasing stamps
        this.lastTs = ts;
        const t0 = performance.now();
        try {
          const dets = await this.detector.detect(src, ts);
          cost = performance.now() - t0;
          this.record(cost, t0);
          if (this.running) this.onResult(dets, ts, cost);
        } catch (err) {
          this.stats.errors++;
          cost = performance.now() - t0;
          if (this.stats.errors <= 3) console.warn('[detector]', err);
        }
      }
      const byDuty = cost * (1 / this.o.maxDuty - 1);
      const wait = Math.min(this.o.maxIntervalMs, Math.max(this.o.minIntervalMs - cost, byDuty, 4));
      await new Promise<void>((res) => {
        this.wake = res;
        this.timer = setTimeout(res, wait);
      });
      this.wake = null;
    }
  }

  private record(cost: number, t0: number): void {
    const s = this.stats;
    s.runs++;
    s.lastCostMs = cost;
    s.avgCostMs = s.avgCostMs === 0 ? cost : s.avgCostMs * 0.9 + cost * 0.1;
    this.hzWindow.push(t0);
    while (this.hzWindow.length && this.hzWindow[0] < t0 - 2000) this.hzWindow.shift();
    s.hz = this.hzWindow.length / 2;
  }
}
