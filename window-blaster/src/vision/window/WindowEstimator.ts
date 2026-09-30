import type { Quad, Vec2 } from '../../core/types';
import { lineIntersection } from '../../core/math/polygon';
import { median } from '../../core/math/filters';

export interface WindowEstimate {
  /** Quad in the coordinate system of the analysed gray image. */
  quad: Quad;
  /** 0..1 */
  confidence: number;
  /** Fraction of the image covered by the bright region. */
  coverage: number;
  /** Otsu threshold and class contrast for diagnostics. */
  threshold: number;
  contrast: number;
  kind: 'window' | 'fullframe' | 'none';
}

/** Otsu's threshold on an 8-bit histogram. */
export function otsu(gray: Uint8Array): { threshold: number; contrast: number } {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let runStart = 128;
  let runEnd = 128;
  let mB = 0;
  let mF = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mb = sumB / wB;
    const mf = (sum - sumB) / wF;
    const between = wB * wF * (mb - mf) * (mb - mf);
    if (between > best * (1 + 1e-9)) {
      best = between;
      runStart = t;
      runEnd = t;
      mB = mb;
      mF = mf;
    } else if (between >= best * (1 - 1e-9) && runEnd === t - 1) {
      runEnd = t; // plateau between two separated classes: take its middle
    }
  }
  return { threshold: Math.round((runStart + runEnd) / 2), contrast: (mF - mB) / 255 };
}

/**
 * Robust line through points: Theil–Sen (median of pairwise slopes, ~29%
 * breakdown) followed by an outlier-trimmed total-least-squares refit.
 * Returned as point + unit direction. Handles near-vertical lines.
 */
export function fitLine(points: readonly Vec2[]): { p: Vec2; d: Vec2; residual: number } | null {
  const n = points.length;
  if (n < 2) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const swap = maxY - minY > maxX - minX; // independent variable = y for steep lines
  const u = points.map((p) => (swap ? p.y : p.x));
  const v = points.map((p) => (swap ? p.x : p.y));
  const slopes: number[] = [];
  const stride = n > 90 ? Math.ceil(n / 90) : 1; // cap pair count
  for (let i = 0; i < n; i += stride) {
    for (let j = i + stride; j < n; j += stride) {
      const du = u[j] - u[i];
      if (Math.abs(du) < 1e-6) continue;
      slopes.push((v[j] - v[i]) / du);
    }
  }
  if (!slopes.length) return null;
  const m = median(slopes);
  const b = median(u.map((ui, i) => v[i] - m * ui));
  const norm = Math.sqrt(1 + m * m);
  const res = u.map((ui, i) => Math.abs(v[i] - (m * ui + b)) / norm);
  const mad = median(res);
  const gate = Math.max(0.75, mad * 3);
  const keep = points.filter((_, i) => res[i] <= gate);
  const pts = keep.length >= 2 ? keep : points;
  // total least squares refit
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= pts.length;
  my /= pts.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const d = { x: Math.cos(theta), y: Math.sin(theta) };
  const finalRes = pts.map((p) => Math.abs((p.x - mx) * -d.y + (p.y - my) * d.x));
  return { p: { x: mx, y: my }, d, residual: median(finalRes) };
}

/** Largest 4-connected component of a binary mask (returns labels + best label + size). */
function largestComponent(mask: Uint8Array, w: number, h: number): { labels: Int32Array; best: number; size: number } {
  const labels = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  let best = -1;
  let bestSize = 0;
  let next = 0;
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || labels[s] >= 0) continue;
    const id = next++;
    let size = 0;
    stack.push(s);
    labels[s] = id;
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w;
      const y = (i / w) | 0;
      if (x > 0 && mask[i - 1] && labels[i - 1] < 0) {
        labels[i - 1] = id;
        stack.push(i - 1);
      }
      if (x < w - 1 && mask[i + 1] && labels[i + 1] < 0) {
        labels[i + 1] = id;
        stack.push(i + 1);
      }
      if (y > 0 && mask[i - w] && labels[i - w] < 0) {
        labels[i - w] = id;
        stack.push(i - w);
      }
      if (y < h - 1 && mask[i + w] && labels[i + w] < 0) {
        labels[i + w] = id;
        stack.push(i + w);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }
  return { labels, best, size: bestSize };
}

/**
 * Estimates the window pane as the largest bright region (daylight outside vs.
 * dark interior) and fits four straight edges to its boundary.
 *
 * A single Otsu threshold can lump dark asphalt together with the interior, so
 * a second Otsu split of the dark class is tried as well and the candidate with
 * the better-supported quad wins.
 */
export function estimateWindow(gray: Uint8Array, w: number, h: number): WindowEstimate {
  const { threshold, contrast } = otsu(gray);
  const none: WindowEstimate = { quad: fullQuad(w, h), confidence: 0, coverage: 0, threshold, contrast, kind: 'none' };
  if (contrast < 0.12) return { ...none, kind: 'fullframe', coverage: 1, confidence: Math.max(0, contrast) };
  const candidates = [threshold];
  // second level: split the dark class (interior vs. road/asphalt)
  const darkPixels: number[] = [];
  for (let i = 0; i < gray.length; i++) if (gray[i] < threshold) darkPixels.push(gray[i]);
  if (darkPixels.length > gray.length * 0.2) {
    const sub = otsu(Uint8Array.from(darkPixels));
    if (sub.contrast >= 0.14 && sub.threshold < threshold - 8) candidates.push(sub.threshold);
  }
  let best: WindowEstimate | null = null;
  for (const thr of candidates) {
    const est = estimateWithThreshold(gray, w, h, thr, contrast);
    const score = est.kind === 'window' ? est.confidence * Math.sqrt(est.coverage) : est.kind === 'fullframe' ? 0.3 : 0;
    const bestScore = best ? (best.kind === 'window' ? best.confidence * Math.sqrt(best.coverage) : best.kind === 'fullframe' ? 0.3 : 0) : -1;
    if (!best || score > bestScore) best = est;
  }
  return best ?? none;
}

function estimateWithThreshold(gray: Uint8Array, w: number, h: number, threshold: number, contrast: number): WindowEstimate {
  const none: WindowEstimate = { quad: fullQuad(w, h), confidence: 0, coverage: 0, threshold, contrast, kind: 'none' };
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = gray[i] >= threshold ? 1 : 0;
  const { labels, best, size } = largestComponent(mask, w, h);
  const coverage = size / (w * h);
  if (best < 0 || coverage < 0.06) return none;
  if (coverage > 0.9) return { ...none, kind: 'fullframe', coverage, confidence: 0.8 };

  // boundary samples per row/column
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  const top: Vec2[] = [];
  const bottom: Vec2[] = [];
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    let lx = -1;
    let rx = -1;
    for (let x = 0; x < w; x++) {
      if (labels[y * w + x] === best) {
        if (lx < 0) lx = x;
        rx = x;
      }
    }
    if (lx >= 0) {
      left.push({ x: lx, y });
      right.push({ x: rx + 1, y });
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (lx < x0) x0 = lx;
      if (rx > x1) x1 = rx;
    }
  }
  for (let x = 0; x < w; x++) {
    let ty = -1;
    let by = -1;
    for (let y = 0; y < h; y++) {
      if (labels[y * w + x] === best) {
        if (ty < 0) ty = y;
        by = y;
      }
    }
    if (ty >= 0) {
      top.push({ x, y: ty });
      bottom.push({ x, y: by + 1 });
    }
  }
  // use the central 80% of each side to avoid rounded corners / pillars
  const trim = <T extends Vec2>(pts: T[], key: 'x' | 'y', lo: number, hi: number) => {
    const span = hi - lo;
    return pts.filter((p) => p[key] >= lo + span * 0.1 && p[key] <= hi - span * 0.1);
  };
  const L = fitLine(trim(left, 'y', y0, y1));
  const R = fitLine(trim(right, 'y', y0, y1));
  const Tt = fitLine(trim(top, 'x', x0, x1));
  const B = fitLine(trim(bottom, 'x', x0, x1));
  if (!L || !R || !Tt || !B) return none;
  const tl = lineIntersection(Tt.p, Tt.d, L.p, L.d);
  const tr = lineIntersection(Tt.p, Tt.d, R.p, R.d);
  const br = lineIntersection(B.p, B.d, R.p, R.d);
  const bl = lineIntersection(B.p, B.d, L.p, L.d);
  if (!tl || !tr || !br || !bl) return none;
  const quad: Quad = [tl, tr, br, bl];
  const qa = Math.abs(polyArea(quad));
  const solidity = qa > 0 ? Math.min(1, size / qa) : 0;
  const straightness = Math.max(0, 1 - (L.residual + R.residual + Tt.residual + B.residual) / 8);
  const confidence = Math.max(0, Math.min(1, Math.min(1, contrast * 3) * solidity * (0.5 + 0.5 * straightness)));
  return { quad, confidence, coverage, threshold, contrast, kind: 'window' };
}

function polyArea(q: Quad): number {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function fullQuad(w: number, h: number): Quad {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}
