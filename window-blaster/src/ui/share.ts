import type { RoundResult } from '../game/GameMode';
import { MODES } from './i18n/de';
import { fmtScore } from './dom';

/**
 * Composes the live frame (camera/demo video + effect layer) into one image.
 * Returns a JPEG data URL, downscaled to at most `maxW` px wide – small enough to keep
 * in a round result and to share.
 */
export interface FrameLayers {
  video: HTMLVideoElement;
  fxCanvas: HTMLCanvasElement;
  /** CSS px per video px and the video's offset on the stage (object-fit: cover) */
  scale: number;
  offX: number;
  offY: number;
  dpr: number;
}

export function composeFrame(L: FrameLayers, maxW = 960): string | null {
  const { video, fxCanvas: fx } = L;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const s = Math.min(1, maxW / vw);
  const c = document.createElement('canvas');
  c.width = Math.round(vw * s);
  c.height = Math.round(vh * s);
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, c.width, c.height);
    // the fx canvas is in stage pixels; take the part that covers the whole video frame
    ctx.drawImage(fx, L.offX * L.dpr, L.offY * L.dpr, vw * L.scale * L.dpr, vh * L.scale * L.dpr, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draws the result card: photo (or dark background), score, mode and stats. */
export async function renderResultCard(r: RoundResult, best: number): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  const img = r.photo ? await loadImage(r.photo) : null;
  if (img) {
    const s = Math.max(W / img.width, (H * 0.68) / img.height);
    const w = img.width * s;
    const h = img.height * s;
    ctx.drawImage(img, (W - w) / 2, 0, w, h);
    const g = ctx.createLinearGradient(0, H * 0.4, 0, H);
    g.addColorStop(0, 'rgba(11,15,20,0)');
    g.addColorStop(0.5, 'rgba(11,15,20,0.85)');
    g.addColorStop(1, 'rgba(11,15,20,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, 800);
    g.addColorStop(0, '#1f2a3d');
    g.addColorStop(1, '#0b0f14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const text = (t: string, x: number, y: number, size: number, color = '#fff', weight = 900, align: CanvasTextAlign = 'left') => {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = size * 0.12;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  };
  text('🚗 Window', 60, 110, 56, '#fff');
  text('Blaster', 60 + ctx.measureText('🚗 Window ').width, 110, 56, '#ffb020');
  const mode = MODES[r.mode];
  text(`${mode.icon} ${mode.name}`, W - 60, 110, 40, '#9aa7b8', 700, 'right');
  text(fmtScore(r.score), W / 2, H * 0.74, 170, '#ffb020', 900, 'center');
  text('PUNKTE', W / 2, H * 0.74 + 56, 40, '#fff', 800, 'center');
  const runner = r.mode === 'side-runner';
  const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
  const stats = runner ? [`${r.kills} übersprungen`, `${r.extra.coins ?? 0} Münzen`, `Combo ×${r.maxCombo}`] : [`${r.kills} ausgeschaltet`, `${acc} % Treffer`, `Combo ×${r.maxCombo}`];
  text(stats.join('   ·   '), W / 2, H * 0.74 + 130, 38, '#e2e8f0', 700, 'center');
  if (r.score >= best && best > 0) text('★ NEUER BESTWERT', W / 2, H * 0.74 + 200, 40, '#22c55e', 900, 'center');
  text(`${r.weapons.length ? r.weapons.join(' + ') : ''}  ·  Nur als Fahrgast gespielt`, W / 2, H - 50, 28, '#64748b', 600, 'center');
  return c;
}

function dataUrlToBlob(url: string): Blob {
  const [head, data] = url.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/png';
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/**
 * Shares an image through the system share sheet (iOS/Android) or downloads it.
 * Returns what happened, for the toast.
 */
export async function shareImage(source: HTMLCanvasElement | string, filename: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled' | 'failed'> {
  let blob: Blob | null = null;
  if (typeof source === 'string') blob = dataUrlToBlob(source);
  else blob = await new Promise<Blob | null>((resolve) => source.toBlob((b) => resolve(b), 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // fall through to download
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
