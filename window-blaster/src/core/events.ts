/** Minimal typed event emitter. */
export class Emitter<E extends Record<string, unknown>> {
  private readonly map = new Map<keyof E, Set<(p: never) => void>>();

  on<K extends keyof E>(k: K, fn: (p: E[K]) => void): () => void {
    let set = this.map.get(k);
    if (!set) {
      set = new Set();
      this.map.set(k, set);
    }
    set.add(fn as (p: never) => void);
    return () => set!.delete(fn as (p: never) => void);
  }

  emit<K extends keyof E>(k: K, p: E[K]): void {
    const set = this.map.get(k);
    if (!set) return;
    for (const fn of [...set]) (fn as (p: E[K]) => void)(p);
  }

  clear(): void {
    this.map.clear();
  }
}
