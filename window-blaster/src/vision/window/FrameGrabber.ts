export interface GrayFrame {
  gray: Uint8Array;
  w: number;
  h: number;
  /** video px per gray px */
  scale: number;
  t: number;
}

/** Downsamples the live video to a small grayscale buffer for window tracking (~0.5 ms). */
export class FrameGrabber {
  private readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = null;
  private buf: Uint8Array | null = null;

  constructor(private readonly width = 240) {}

  grab(video: HTMLVideoElement, t: number): GrayFrame | null {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const w = this.width;
    const h = Math.max(2, Math.round((vh / vw) * w));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.buf = new Uint8Array(w * h);
    }
    if (!this.ctx || !this.buf) return null;
    try {
      this.ctx.drawImage(video, 0, 0, w, h);
      const d = this.ctx.getImageData(0, 0, w, h).data;
      const g = this.buf;
      for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    } catch {
      return null;
    }
    return { gray: this.buf, w, h, scale: vw / w, t };
  }
}
