/** Key/value diagnostics shown by the debug overlay and exposed for e2e tests. */
export class Diagnostics {
  private readonly values = new Map<string, string | number | boolean>();
  set(key: string, value: string | number | boolean): void {
    this.values.set(key, value);
  }
  get(key: string): string | number | boolean | undefined {
    return this.values.get(key);
  }
  snapshot(): Record<string, string | number | boolean> {
    return Object.fromEntries(this.values);
  }
}
