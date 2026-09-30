import type { Quad } from '../../core/types';

export type WindowMode = 'tracking' | 'degraded' | 'fullframe' | 'off';

export interface WindowState {
  quad: Quad;
  /** 0..1 — how much the image evidence supports the quad. */
  confidence: number;
  mode: WindowMode;
}

export const fullFrameState = (w: number, h: number): WindowState => ({
  quad: [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ],
  confidence: 1,
  mode: 'fullframe',
});
