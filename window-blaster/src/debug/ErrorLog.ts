/** Ring buffer of runtime errors; persisted so a frozen round can be reported after a restart. */
export interface LoggedError {
  at: number;
  where: string;
  message: string;
  stack?: string;
}

const KEY = 'wb.errors';

export class ErrorLog {
  readonly items: LoggedError[] = [];
  private listeners = new Set<(e: LoggedError) => void>();

  constructor(private readonly max = 20) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.items.push(...(JSON.parse(raw) as LoggedError[]));
    } catch {
      /* ignore */
    }
  }

  install(): void {
    window.addEventListener('error', (e) => this.push('window', e.error ?? e.message));
    window.addEventListener('unhandledrejection', (e) => this.push('promise', e.reason));
  }

  push(where: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 4).join('\n') : undefined;
    const last = this.items[this.items.length - 1];
    if (last && last.message === message && Date.now() - last.at < 2000) return; // collapse repeats
    const item: LoggedError = { at: Date.now(), where, message, stack };
    this.items.push(item);
    if (this.items.length > this.max) this.items.shift();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.items));
    } catch {
      /* ignore */
    }
    console.error(`[${where}]`, err);
    for (const l of this.listeners) l(item);
  }

  onError(fn: (e: LoggedError) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get last(): LoggedError | null {
    return this.items[this.items.length - 1] ?? null;
  }

  clear(): void {
    this.items.length = 0;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  asText(): string {
    return this.items.map((e) => `${new Date(e.at).toISOString()} [${e.where}] ${e.message}${e.stack ? '\n' + e.stack : ''}`).join('\n\n');
  }
}
