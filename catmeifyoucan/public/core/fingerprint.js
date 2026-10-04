// Cat Me If You Can – Bild-Fingerabdruck (läuft im Browser auf dem Katzen-Ausschnitt).
//
// Zwei Teile:
//   colors – Anteile der typischen Fellfarben (schwarz, weiß, grau, orange, creme, braun),
//            mittig gewichtet, Hintergrundfarben (grün/blau …) ignoriert. Für Wiedererkennung.
//   hash   – 64-Bit-dHash (16 Hex-Zeichen) des Graustufenbilds. Erkennt dasselbe Foto erneut
//            hochgeladen (Betrug), nicht dieselbe Katze.
//
// Eingabe: RGBA-Pixel (Uint8ClampedArray wie aus canvas.getImageData), Breite, Höhe.

export const COLOR_KEYS = ['black', 'white', 'gray', 'orange', 'cream', 'brown'];

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

/** Ordnet ein Pixel einer Fellfarbe zu – oder null (Hintergrund). */
export function classifyPixel(r, g, b) {
  const [h, s, v] = rgbToHsv(r, g, b);
  if (v < 0.2) return 'black';
  if (s < 0.16) return v > 0.8 ? 'white' : v < 0.32 ? 'black' : 'gray';
  if (h >= 12 && h <= 48) {
    if (s > 0.42 && v > 0.42) return 'orange';
    if (v > 0.62 && s <= 0.42) return 'cream';
    return 'brown';
  }
  if ((h < 12 || h > 340) && s < 0.5) return 'brown';
  if (h > 48 && h <= 70 && s < 0.35) return v > 0.6 ? 'cream' : 'brown';
  if (s < 0.24 && h > 180 && h < 260) return v > 0.8 ? 'white' : 'gray'; // bläuliches Grau
  return null;
}

export function computeColors(rgba, width, height) {
  const sums = Object.fromEntries(COLOR_KEYS.map((k) => [k, 0]));
  let total = 0;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 4096)));
  const cx = width / 2;
  const cy = height / 2;
  const sx = width * 0.38;
  const sy = height * 0.38;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 128) continue;
      const k = classifyPixel(rgba[i], rgba[i + 1], rgba[i + 2]);
      if (!k) continue;
      const w = Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2) / 2);
      sums[k] += w;
      total += w;
    }
  }
  const out = {};
  for (const k of COLOR_KEYS) out[k] = total ? Math.round((sums[k] / total) * 1000) / 1000 : 0;
  return out;
}

/** Flächenmittelung auf w×h Graustufen. */
function downsampleGray(rgba, width, height, w, h) {
  const out = new Float64Array(w * h);
  for (let ty = 0; ty < h; ty++) {
    const y0 = Math.floor((ty * height) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / h));
    for (let tx = 0; tx < w; tx++) {
      const x0 = Math.floor((tx * width) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / w));
      let s = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          s += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
          n++;
        }
      }
      out[ty * w + tx] = n ? s / n : 0;
    }
  }
  return out;
}

export function dHash(rgba, width, height) {
  const g = downsampleGray(rgba, width, height, 9, 8);
  let hex = '';
  for (let row = 0; row < 8; row++) {
    let nibbleBits = 0;
    let bits = 0;
    for (let col = 0; col < 8; col++) {
      nibbleBits = (nibbleBits << 1) | (g[row * 9 + col] > g[row * 9 + col + 1] ? 1 : 0);
      bits++;
      if (bits === 4) {
        hex += nibbleBits.toString(16);
        nibbleBits = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

export function computeFingerprint(rgba, width, height) {
  return { colors: computeColors(rgba, width, height), hash: dHash(rgba, width, height) };
}

/** Hamming-Abstand zweier Hex-Hashes gleicher Länge (Bits). Ungültig → 64. */
export function hammingHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !/^[0-9a-f]+$/.test(a + b)) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** 1 = identische Farbverteilung, 0 = völlig verschieden. */
export function colorSimilarity(a, b) {
  if (!a || !b) return 0;
  let diff = 0;
  let sa = 0;
  let sb = 0;
  for (const k of COLOR_KEYS) {
    sa += a[k] || 0;
    sb += b[k] || 0;
  }
  if (!sa || !sb) return 0;
  for (const k of COLOR_KEYS) diff += Math.abs((a[k] || 0) / sa - (b[k] || 0) / sb);
  return Math.max(0, 1 - diff / 2);
}

/** Gleitender Mittelwert der Farben einer Katze über ihre Sichtungen. */
export function blendColors(prev, next, weightPrev) {
  if (!prev) return next;
  if (!next) return prev;
  const out = {};
  for (const k of COLOR_KEYS) out[k] = Math.round((((prev[k] || 0) * weightPrev + (next[k] || 0)) / (weightPrev + 1)) * 1000) / 1000;
  return out;
}

/** Sanity-Check von Client-Daten. */
export function sanitizeFingerprint(fp) {
  if (!fp || typeof fp !== 'object') return null;
  const colors = {};
  let sum = 0;
  for (const k of COLOR_KEYS) {
    const v = Number(fp.colors && fp.colors[k]);
    colors[k] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
    sum += colors[k];
  }
  const hash = typeof fp.hash === 'string' && /^[0-9a-f]{16}$/.test(fp.hash) ? fp.hash : null;
  return { colors: sum > 0 ? colors : null, hash };
}
