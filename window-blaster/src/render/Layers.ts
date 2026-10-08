import type { Rect, Vec2 } from '../core/types';

export interface GlassesCal {
  k: number;
  dx: number;
  dy: number;
}

/** Applies a glasses calibration to an object-fit: cover mapping (pure, unit-tested). */
export function calibrateMapping(
  m: { scale: number; offX: number; offY: number },
  cssW: number,
  cssH: number,
  cal: GlassesCal | null,
): { scale: number; offX: number; offY: number } {
  if (!cal) return m;
  const cx = cssW / 2;
  const cy = cssH / 2;
  return { scale: m.scale * cal.k, offX: cx + (m.offX - cx) * cal.k + cal.dx * cssW, offY: cy + (m.offY - cy) * cal.k + cal.dy * cssH };
}

/** CSS transform for the video element that matches `calibrateMapping` (plus an optional shake offset in CSS px). */
export function videoTransform(cal: GlassesCal | null, cssW: number, cssH: number, shake?: Vec2 | null): string {
  const sx = shake?.x ?? 0;
  const sy = shake?.y ?? 0;
  if (!cal) return sx || sy ? `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)` : '';
  return `translate(${(cal.dx * cssW + sx).toFixed(1)}px, ${(cal.dy * cssH + sy).toFixed(1)}px) scale(${cal.k.toFixed(4)})`;
}

/**
 * Owns the three stacked layers (video, FX canvas, HUD canvas) and the single
 * mapping between VIDEO pixels and CSS pixels. The video is displayed with
 * object-fit: cover; the FX canvas is drawn in video-pixel space through a
 * matching transform so all game code can ignore screen geometry.
 */
export class Layers {
  cssW = 1;
  cssH = 1;
  dpr = 1;
  videoW = 0;
  videoH = 0;
  /** CSS px per video px. */
  scale = 1;
  offX = 0;
  offY = 0;
  /**
   * Display-glasses alignment (see-through overlay): extra zoom `k` around the stage centre and a
   * shift by (dx, dy) fractions of the stage size. Applied inside the mapping, so drawing, touch
   * input and the (faint) video stay consistent. null = plain object-fit: cover.
   */
  cal: GlassesCal | null = null;
  readonly fx: CanvasRenderingContext2D;
  readonly hud: CanvasRenderingContext2D;
  private ro: ResizeObserver | null = null;

  constructor(
    readonly stage: HTMLElement,
    readonly video: HTMLVideoElement,
    readonly fxCanvas: HTMLCanvasElement,
    readonly hudCanvas: HTMLCanvasElement,
  ) {
    const fx = fxCanvas.getContext('2d');
    const hud = hudCanvas.getContext('2d');
    if (!fx || !hud) throw new Error('canvas 2d unavailable');
    this.fx = fx;
    this.hud = hud;
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(stage);
    }
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 50));
  }

  resize(): void {
    const w = Math.max(1, this.stage.clientWidth || window.innerWidth);
    const h = Math.max(1, this.stage.clientHeight || window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === this.cssW && h === this.cssH && dpr === this.dpr && this.fxCanvas.width === Math.round(w * dpr)) {
      this.computeMapping();
      return;
    }
    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
    for (const c of [this.fxCanvas, this.hudCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    this.computeMapping();
  }

  /** Call once per frame before drawing; picks up video size changes. */
  beginFrame(): void {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    if ((vw && vw !== this.videoW) || (vh && vh !== this.videoH)) {
      this.videoW = vw;
      this.videoH = vh;
      this.computeMapping();
    }
    this.fx.setTransform(1, 0, 0, 1, 0, 0);
    this.fx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
    this.hud.setTransform(1, 0, 0, 1, 0, 0);
    this.hud.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
    this.useVideoSpace(this.fx);
    this.useCssSpace(this.hud);
  }

  private computeMapping(): void {
    if (!this.videoW || !this.videoH) {
      this.scale = 1;
      this.offX = 0;
      this.offY = 0;
      return;
    }
    const scale = Math.max(this.cssW / this.videoW, this.cssH / this.videoH);
    const m = calibrateMapping({ scale, offX: (this.cssW - this.videoW * scale) / 2, offY: (this.cssH - this.videoH * scale) / 2 }, this.cssW, this.cssH, this.cal);
    this.scale = m.scale;
    this.offX = m.offX;
    this.offY = m.offY;
    this.applyVideoTransform();
  }

  private shakeCss: Vec2 | null = null;

  /** Sets (or clears) the glasses calibration; the video element follows. */
  setCal(cal: GlassesCal | null): void {
    this.cal = cal ? { k: cal.k, dx: cal.dx, dy: cal.dy } : null;
    this.computeMapping();
  }

  /** Camera shake in CSS px (the effect layer shakes through its own transform). */
  setShake(off: Vec2 | null): void {
    const same = (off?.x ?? 0) === (this.shakeCss?.x ?? 0) && (off?.y ?? 0) === (this.shakeCss?.y ?? 0);
    this.shakeCss = off && (off.x || off.y) ? off : null;
    if (!same) this.applyVideoTransform();
  }

  private applyVideoTransform(): void {
    const tf = videoTransform(this.cal, this.cssW, this.cssH, this.shakeCss);
    if (this.video.style.transform !== tf) this.video.style.transform = tf;
  }

  /** Transform so that subsequent drawing uses video px. */
  useVideoSpace(ctx: CanvasRenderingContext2D): void {
    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.offX * this.dpr, this.offY * this.dpr);
  }

  /** Transform so that subsequent drawing uses CSS px. */
  useCssSpace(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  toVideo(cssX: number, cssY: number): Vec2 {
    return { x: (cssX - this.offX) / this.scale, y: (cssY - this.offY) / this.scale };
  }

  toCss(p: Vec2): Vec2 {
    return { x: p.x * this.scale + this.offX, y: p.y * this.scale + this.offY };
  }

  /** Full video frame rect (video px). */
  frameRect(): Rect {
    return { x: 0, y: 0, w: this.videoW || 1, h: this.videoH || 1 };
  }

  /** Portion of the video actually visible on screen (video px). */
  visibleRect(): Rect {
    const tl = this.toVideo(0, 0);
    const br = this.toVideo(this.cssW, this.cssH);
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  }

  get hasVideo(): boolean {
    return this.videoW > 0 && this.videoH > 0;
  }
}
