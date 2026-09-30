import type { Rect, Vec2 } from '../core/types';

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
    this.scale = Math.max(this.cssW / this.videoW, this.cssH / this.videoH);
    this.offX = (this.cssW - this.videoW * this.scale) / 2;
    this.offY = (this.cssH - this.videoH * this.scale) / 2;
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
