import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';
import type { Detection } from '../core/types';
import { COCO_ALLOWLIST, COCO_TO_CLASS, type Detector, type DetectorInfo } from './Detector';

export interface MediaPipeOptions {
  /** Directory containing vision_wasm_internal.js/.wasm (self-hosted). */
  wasmBase: string;
  modelPath: string;
  scoreThreshold?: number;
  maxResults?: number;
  preferGpu?: boolean;
  /** Frames are downscaled to this width before inference (model input is 320²). */
  inputWidth?: number;
}

async function fetchWithProgress(url: string, onProgress: (f: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Modell nicht ladbar (${res.status})`);
  const total = Number(res.headers.get('content-length') ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.byteLength;
    if (total) onProgress(got / total);
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  onProgress(1);
  return out;
}

/** EfficientDet-Lite0 via MediaPipe Tasks Vision, GPU delegate with CPU fallback. */
export class MediaPipeDetector implements Detector {
  readonly info: DetectorInfo = { name: 'mediapipe/efficientdet-lite0', delegate: 'none' };
  private det: ObjectDetector | null = null;
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private cctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private scaleBack = 1;
  private lastTs = -1;

  constructor(private readonly o: MediaPipeOptions) {}

  async init(onProgress?: (f: number, label: string) => void): Promise<void> {
    onProgress?.(0.02, 'Laufzeit');
    const vision = await FilesetResolver.forVisionTasks(this.o.wasmBase);
    onProgress?.(0.15, 'Modell');
    const model = await fetchWithProgress(this.o.modelPath, (f) => onProgress?.(0.15 + 0.65 * f, 'Modell'));
    const make = (delegate: 'GPU' | 'CPU') =>
      ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: model, delegate },
        runningMode: 'VIDEO',
        scoreThreshold: this.o.scoreThreshold ?? 0.35,
        maxResults: this.o.maxResults ?? 12,
        categoryAllowlist: [...COCO_ALLOWLIST],
      });
    onProgress?.(0.85, 'Start');
    if (this.o.preferGpu !== false) {
      try {
        this.det = await make('GPU');
        this.info.delegate = 'GPU';
      } catch (e) {
        console.warn('[mediapipe] GPU delegate failed, falling back to CPU', e);
      }
    }
    if (!this.det) {
      this.det = await make('CPU');
      this.info.delegate = 'CPU';
    }
    onProgress?.(1, 'Bereit');
  }

  private prepare(src: TexImageSource): TexImageSource {
    const w = (src as HTMLVideoElement).videoWidth ?? (src as HTMLCanvasElement).width ?? 0;
    const h = (src as HTMLVideoElement).videoHeight ?? (src as HTMLCanvasElement).height ?? 0;
    const target = this.o.inputWidth ?? 512;
    if (!w || !h || w <= target) {
      this.scaleBack = 1;
      return src;
    }
    const cw = target;
    const ch = Math.round((h / w) * target);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.cctx = (this.canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: this.info.delegate === 'CPU' });
    }
    if (!this.cctx) {
      this.scaleBack = 1;
      return src;
    }
    this.cctx.drawImage(src as CanvasImageSource, 0, 0, cw, ch);
    this.scaleBack = w / cw;
    return this.canvas as HTMLCanvasElement;
  }

  detect(src: TexImageSource, ts: number): Detection[] {
    if (!this.det) return [];
    const input = this.prepare(src);
    let stamp = Math.round(ts);
    if (stamp <= this.lastTs) stamp = this.lastTs + 1;
    this.lastTs = stamp;
    const res = this.det.detectForVideo(input, stamp);
    const k = this.scaleBack;
    const out: Detection[] = [];
    for (const d of res.detections) {
      const bb = d.boundingBox;
      const cat = d.categories[0];
      if (!bb || !cat) continue;
      const cls = COCO_TO_CLASS[cat.categoryName];
      if (!cls) continue;
      out.push({ box: { x: bb.originX * k, y: bb.originY * k, w: bb.width * k, h: bb.height * k }, cls, score: cat.score, ts });
    }
    return out;
  }

  dispose(): void {
    this.det?.close();
    this.det = null;
  }
}
