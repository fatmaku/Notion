import type { Diagnostics } from './Diagnostics';

/** Small always-on-top text panel (enable with ?debug=1 or 5 taps top-left). */
export class DebugOverlay {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    private readonly el: HTMLElement,
    private readonly diag: Diagnostics,
  ) {}

  show(): void {
    this.el.hidden = false;
    if (this.timer) return;
    this.timer = setInterval(() => this.render(), 250);
    this.render();
  }

  hide(): void {
    this.el.hidden = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  toggle(): void {
    if (this.el.hidden) this.show();
    else this.hide();
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  private render(): void {
    const s = this.diag.snapshot();
    const lines = Object.keys(s)
      .sort()
      .map((k) => {
        const v = s[k];
        return `${k.padEnd(14)} ${typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v)}`;
      });
    this.el.textContent = lines.join('\n');
  }
}
