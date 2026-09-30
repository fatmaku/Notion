import type { Rect } from '../../core/types';

/**
 * Copies a region of the live video into an offscreen canvas (video px).
 * Effects use these real pixels so explosions/skids look like AR, not stickers.
 */
export function captureRegion(video: HTMLVideoElement, box: Rect, pad = 0.04): { canvas: HTMLCanvasElement; box: Rect } | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const px = box.w * pad;
  const py = box.h * pad;
  const x = Math.max(0, Math.floor(box.x - px));
  const y = Math.max(0, Math.floor(box.y - py));
  const w = Math.min(vw - x, Math.ceil(box.w + 2 * px));
  const h = Math.min(vh - y, Math.ceil(box.h + 2 * py));
  if (w < 2 || h < 2) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(video, x, y, w, h, 0, 0, w, h);
  } catch {
    return null;
  }
  return { canvas: c, box: { x, y, w, h } };
}
