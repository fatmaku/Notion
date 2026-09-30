/** A source of video frames: the real camera or the synthetic demo scene. */
export interface FrameSource {
  readonly kind: 'camera' | 'demo';
  readonly video: HTMLVideoElement;
  /** Intrinsic frame size in video px (valid after start()). */
  readonly width: number;
  readonly height: number;
  start(): Promise<void>;
  stop(): void;
  /** Called when the stream ends unexpectedly (backgrounding on iOS, device change). */
  onEnded(cb: () => void): () => void;
}

export function videoReady(v: HTMLVideoElement): boolean {
  return v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;
}
