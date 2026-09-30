/** Vibration wrapper; silently no-ops where unsupported (iOS Safari). */
export class Haptics {
  enabled = true;
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  private last = 0;

  pulse(pattern: number | number[]): void {
    if (!this.enabled || !this.supported) return;
    const now = performance.now();
    if (now - this.last < 30) return;
    this.last = now;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
  light(): void {
    this.pulse(12);
  }
  medium(): void {
    this.pulse(30);
  }
  heavy(): void {
    this.pulse([50, 30, 60]);
  }
}
