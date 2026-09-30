/** Keeps the screen on during play (Screen Wake Lock API, iOS 16.4+). */
export class WakeLock {
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.acquire();
    });
  }

  async request(): Promise<void> {
    this.wanted = true;
    await this.acquire();
  }

  private async acquire(): Promise<void> {
    try {
      if (!('wakeLock' in navigator)) return;
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
    } catch {
      this.sentinel = null;
    }
  }

  release(): void {
    this.wanted = false;
    void this.sentinel?.release();
    this.sentinel = null;
  }
}
