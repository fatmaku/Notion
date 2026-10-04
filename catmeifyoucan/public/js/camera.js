// Cat Me If You Can – Kamera mit AR-Sucher.
//
// - Live-Kamera (Rückkamera) im Vollbild
// - Katzenerkennung direkt auf dem Handy (COCO-SSD, TensorFlow.js): Rahmen um die Katze, der
//   Auslöser „rastet ein“. Läuft komplett lokal; nur das Modell wird einmal geladen.
// - Aufnahme: ganzes Foto (max. 1280 px) + quadratischer Ausschnitt um die Katze (max. 512 px)
//   + Fingerabdruck (Fellfarben, dHash) für Wiedererkennung und Duplikat-Schutz.

import { computeFingerprint } from '../core/fingerprint.js';

const loaded = new Map();
function loadScript(src) {
  if (loaded.has(src)) return loaded.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.head.append(s);
  });
  loaded.set(src, p);
  return p;
}

let modelPromise = null;
/** Lädt COCO-SSD einmal (TF.js + Modell). Gibt null zurück, wenn es nicht geht (offline, alt). */
export function loadDetector(ar) {
  if (!ar || !ar.tf || !ar.cocoSsd) return Promise.resolve(null);
  if (!modelPromise) {
    modelPromise = (async () => {
      // TF.js setzt beim Laden die globale Variable regeneratorRuntime; existiert sie nicht, weicht
      // es auf Function(...) aus – das verbietet unsere CSP (kein 'unsafe-eval'). Also vorher anlegen.
      if (!('regeneratorRuntime' in window)) window.regeneratorRuntime = undefined;
      await loadScript(ar.tf);
      await loadScript(ar.cocoSsd);
      if (!window.cocoSsd) return null;
      return window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })().catch(() => null);
  }
  return modelPromise;
}

/** Bester Katzen-Treffer aus einer Quelle (Video, Bild, Canvas). box normiert 0..1. */
export async function detectCat(model, source, w, h) {
  if (!model) return null;
  const preds = await model.detect(source, 6, 0.3);
  let best = null;
  for (const p of preds) if (p.class === 'cat' && (!best || p.score > best.score)) best = p;
  if (!best) return { score: 0, box: null, others: preds.length };
  const [x, y, bw, bh] = best.bbox;
  return { score: Math.round(best.score * 1000) / 1000, box: { x: x / w, y: y / h, w: bw / w, h: bh / h } };
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Baut die Aufnahme aus einer Bildquelle: Foto, Ausschnitt, Fingerabdruck.
 * box: normierter Katzenrahmen oder null (dann mittiger Ausschnitt).
 */
export function buildCapture(source, sw, sh, box) {
  const scale = Math.min(1, 1280 / Math.max(sw, sh));
  const full = canvasOf(Math.round(sw * scale), Math.round(sh * scale));
  full.getContext('2d').drawImage(source, 0, 0, full.width, full.height);
  const photo = full.toDataURL('image/jpeg', 0.82);

  let cx, cy, side;
  if (box && box.w > 0 && box.h > 0) {
    cx = (box.x + box.w / 2) * sw;
    cy = (box.y + box.h / 2) * sh;
    side = Math.max(box.w * sw, box.h * sh) * 1.25;
  } else {
    cx = sw / 2;
    cy = sh / 2;
    side = Math.min(sw, sh) * 0.75;
  }
  side = Math.min(side, sw, sh);
  const sx = Math.max(0, Math.min(sw - side, cx - side / 2));
  const sy = Math.max(0, Math.min(sh - side, cy - side / 2));
  const out = Math.min(512, Math.round(side));
  const crop = canvasOf(out, out);
  crop.getContext('2d').drawImage(source, sx, sy, side, side, 0, 0, out, out);
  const cropUrl = crop.toDataURL('image/jpeg', 0.85);

  const fp = canvasOf(64, 64);
  const fctx = fp.getContext('2d', { willReadFrequently: true });
  fctx.drawImage(crop, 0, 0, 64, 64);
  const data = fctx.getImageData(0, 0, 64, 64).data;
  return { photo, crop: cropUrl, fingerprint: computeFingerprint(data, 64, 64) };
}

export function createCamera({ video, overlay }) {
  let stream = null;
  let running = false;
  let model = null;
  let last = null;
  let loopTimer = null;
  let onDetect = () => {};

  function draw(det) {
    const ctx = overlay.getContext('2d');
    const cw = overlay.clientWidth;
    const ch = overlay.clientHeight;
    if (overlay.width !== cw * devicePixelRatio) {
      overlay.width = cw * devicePixelRatio;
      overlay.height = ch * devicePixelRatio;
    }
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (!det || !det.box) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const s = Math.max(cw / vw, ch / vh);
    const ox = (cw - vw * s) / 2;
    const oy = (ch - vh * s) / 2;
    const x = ox + det.box.x * vw * s;
    const y = oy + det.box.y * vh * s;
    const w = det.box.w * vw * s;
    const h = det.box.h * vh * s;
    const L = Math.min(w, h) * 0.22;
    ctx.strokeStyle = '#f28c28';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.moveTo(px, py + dy * L);
      ctx.lineTo(px, py);
      ctx.lineTo(px + dx * L, py);
    }
    ctx.stroke();
  }

  async function loop() {
    if (!running || !model || video.readyState < 2) {
      if (running) loopTimer = setTimeout(loop, 400);
      return;
    }
    try {
      last = await detectCat(model, video, video.videoWidth, video.videoHeight);
      draw(last);
      onDetect(last);
    } catch {
      /* einzelne Frames dürfen scheitern */
    }
    if (running) loopTimer = setTimeout(loop, 350);
  }

  return {
    get detection() {
      return last;
    },
    async start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no camera'), { code: window.isSecureContext ? 'no_camera' : 'insecure' });
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      video.muted = true;
      await video.play();
      running = true;
    },
    async enableDetection(ar, cb) {
      onDetect = cb || (() => {});
      model = await loadDetector(ar);
      if (model && running) loop();
      return !!model;
    },
    stop() {
      running = false;
      clearTimeout(loopTimer);
      if (stream) for (const tr of stream.getTracks()) tr.stop();
      stream = null;
      video.srcObject = null;
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    },
    /** Momentaufnahme des Videos inkl. Ausschnitt um die zuletzt erkannte Katze. */
    capture() {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) throw new Error('no frame');
      const det = last && last.box ? last : null;
      return { ...buildCapture(video, vw, vh, det && det.box), detector: model ? { score: last ? last.score : 0, box: det ? det.box : null } : null };
    },
  };
}

/** Aufnahme aus einer Datei (native Kamera-App oder Galerie). */
export async function captureFromFile(file, ar) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const model = await loadDetector(ar);
  let det = null;
  if (model) {
    const c = canvasOf(bmp.width, bmp.height);
    c.getContext('2d').drawImage(bmp, 0, 0);
    try {
      det = await detectCat(model, c, bmp.width, bmp.height);
    } catch {
      det = null;
    }
  }
  const cap = buildCapture(bmp, bmp.width, bmp.height, det && det.box);
  return { ...cap, detector: model ? { score: det ? det.score : 0, box: det ? det.box : null } : null, capturedAt: file.lastModified || Date.now() };
}

/** Standort beobachten. cb({lat, lon, accuracy}) oder cb(null, error). Rückgabe: stop(). */
export function watchLocation(cb) {
  if (!navigator.geolocation) {
    cb(null, { code: 'unsupported' });
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => cb({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp }),
    (e) => cb(null, e),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
