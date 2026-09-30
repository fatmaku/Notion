import type { Detection, TargetClass } from '../core/types';

export interface DetectorInfo {
  name: string;
  delegate: 'GPU' | 'CPU' | 'none';
  model?: string;
}

/** Object detector abstraction: MediaPipe on device, a mock in tests/demo. */
export interface Detector {
  readonly info: DetectorInfo;
  init(onProgress?: (fraction: number, label: string) => void): Promise<void>;
  /** Detect on the current frame. `ts` is the capture time (performance.now(), ms). */
  detect(src: TexImageSource, ts: number): Detection[] | Promise<Detection[]>;
  dispose(): void;
}

/** COCO label → game class. Anything not listed is ignored. */
export const COCO_TO_CLASS: Readonly<Record<string, TargetClass>> = {
  car: 'car',
  truck: 'truck',
  bus: 'bus',
  train: 'train',
  'stop sign': 'sign',
  'traffic light': 'light',
  'fire hydrant': 'other',
  bench: 'other',
  person: 'person',
  bicycle: 'bike',
  motorcycle: 'bike',
};

export const COCO_ALLOWLIST: readonly string[] = Object.keys(COCO_TO_CLASS);
