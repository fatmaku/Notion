/** Monotonic clock (ms). Tests can substitute a manual clock. */
export interface Clock {
  now(): number;
}

export const perfClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};

export class ManualClock implements Clock {
  constructor(private t = 0) {}
  now(): number {
    return this.t;
  }
  advance(ms: number): number {
    this.t += ms;
    return this.t;
  }
  set(ms: number): void {
    this.t = ms;
  }
}
