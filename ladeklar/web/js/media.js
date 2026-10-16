// Media helpers: shrink photos before upload (saves mobile data abroad), turn a logo into a
// clean PNG plus a square app icon, a signature pad, QR codes, and a little notification sound.
import qrcode from '../vendor/qrcode.mjs';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    img.src = src;
  });
}
const toBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob((b) => r(b), type, q));
export const blobToDataUrl = (blob) => new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(blob); });

/** Photo → JPEG, long side ≤ max px. PDFs pass through unchanged. */
export async function compressPhoto(file, { max = 1400, quality = 0.72 } = {}) {
  if (file.type === 'application/pdf') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    return await toBlob(c, 'image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}

/** Render any image source (data URL / svg) into a JPEG blob – used for demo delivery notes. */
export async function rasterize(src, { width = 900, quality = 0.7 } = {}) {
  const img = await loadImage(src);
  const ratio = (img.naturalHeight || 1000) / (img.naturalWidth || 800);
  const c = document.createElement('canvas'); c.width = width; c.height = Math.round(width * ratio);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return toBlob(c, 'image/jpeg', quality);
}

/** Logo upload → { logo: PNG (max 640×240, transparent), icon: PNG 512×512 for the home screen } */
export async function processLogo(file, color = '#0e7c7b') {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const iw = img.naturalWidth || 600, ih = img.naturalHeight || 240;
    const s = Math.min(1, 640 / iw, 240 / ih) || 1;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(iw * s)); c.height = Math.max(1, Math.round(ih * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const logo = await toBlob(c, 'image/png');
    const ic = document.createElement('canvas'); ic.width = 512; ic.height = 512;
    const g = ic.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
    g.fillStyle = color; g.fillRect(0, 452, 512, 60);
    const fit = Math.min(360 / iw, 300 / ih);
    const w = iw * fit, h = ih * fit;
    g.drawImage(img, (512 - w) / 2, (452 - h) / 2, w, h);
    const icon = await toBlob(ic, 'image/png');
    return { logo, icon };
  } finally { URL.revokeObjectURL(url); }
}

/** Signature pad on a canvas. Returns { clear(), isEmpty(), toBlob() , destroy() } */
export function signaturePad(canvas) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const resize = () => { const r = canvas.getBoundingClientRect(); canvas.width = r.width * ratio; canvas.height = r.height * ratio; const g = canvas.getContext('2d'); g.scale(ratio, ratio); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1f3fa8'; };
  resize();
  let drawing = false, empty = true, last = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e) => { drawing = true; last = pos(e); canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); };
  const move = (e) => {
    if (!drawing) return;
    const p = pos(e); const g = canvas.getContext('2d');
    g.beginPath(); g.moveTo(last.x, last.y); g.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2); g.lineTo(p.x, p.y); g.stroke();
    last = p; empty = false; e.preventDefault();
  };
  const up = () => { drawing = false; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  return {
    clear() { const g = canvas.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.restore(); empty = true; },
    isEmpty: () => empty,
    toBlob: () => toBlob(canvas, 'image/png'),
    destroy() { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); },
  };
}

/** QR code as inline SVG markup. */
export function qrSvg(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#0b1622"/></svg>`;
}

let audio = null;
/** Short two-tone chime (Web Audio, no file). */
export function chime(high = false) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    const notes = high ? [880, 660, 880] : [784, 1175];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.16, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
      o.connect(g).connect(audio.destination); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.4);
    });
  } catch { /* audio not allowed yet */ }
}
export function buzz(pattern = [40]) { try { navigator.vibrate?.(pattern); } catch { /* not supported */ } }
