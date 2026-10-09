// Cat Me If You Can – kleine QR-Werkzeuge für alle Seiten (Erweiterung qr-setup): QR-Code als SVG
// (public/vendor/qrcode.js, erst bei Bedarf geladen), Link kopieren, Teilen (Web Share), Adresse für
// „Auf dem Handy öffnen“. Ohne Texte und ohne i18n – die Seiten bringen ihre eigenen Wörter mit.

let qrLib = null;
/** qrcode-generator nachladen (ein <script>, CSP script-src 'self'). */
export function loadQrLib() {
  if (typeof window !== 'undefined' && window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLib) {
    qrLib = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../vendor/qrcode.js', import.meta.url).href;
      s.onload = () => resolve(window.qrcode);
      s.onerror = reject;
      document.head.append(s);
    }).catch(() => {
      qrLib = null;
      return null;
    });
  }
  return qrLib;
}

/**
 * QR-Code als skalierbares SVG (schwarz auf weiß, Ruhezone 4 Module). ECC M: für Bildschirme genug und
 * weniger dicht als Q – größere Module lassen sich vom Handy aus besser lesen.
 */
export async function qrSvg(text, { ecc = 'M', margin = 4 } = {}) {
  const qrcode = await loadQrLib();
  if (!qrcode) return '';
  const qr = qrcode(0, ecc);
  qr.addData(String(text), 'Byte');
  qr.make();
  return qr.createSvgTag({ cellSize: 1, margin, scalable: true }).replace('<svg ', '<svg shape-rendering="crispEdges" aria-hidden="true" focusable="false" ');
}

/** Text in die Zwischenablage (ohne HTTPS: Rückfall über ein markiertes Eingabefeld). */
export async function copyText(text, input) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Rückfall unten */
  }
  if (!input) return false;
  input.focus();
  input.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

export const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** Web Share (Handy: WhatsApp, Mail …). Abbrechen ist kein Fehler. */
export async function shareLink({ title, text, url }) {
  if (!canShare()) return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false;
  }
}

/**
 * Adresse dieser Seite für das Handy: ohne Fragment und ohne Query – außer ?lang und ?ref
 * (Sprache und Café-Herkunft sollen mitkommen, alles andere nicht).
 */
export function phoneUrl(href = location.href) {
  const u = new URL(href);
  const keep = new URLSearchParams();
  for (const k of ['lang', 'ref']) {
    const v = u.searchParams.get(k);
    if (v && /^[A-Za-z0-9_-]{1,32}$/.test(v)) keep.set(k, v);
  }
  const q = keep.toString();
  return `${u.origin}${u.pathname}${q ? `?${q}` : ''}`;
}

/** Code aus dem Fragment (#setup=… / #invite=…) lesen und sofort aus der Adresszeile entfernen. */
export function takeFragmentCode(name) {
  const m = new RegExp(`^#${name}=([A-Za-z0-9_-]{22,64})$`).exec(location.hash || '');
  if (!m) return null;
  try {
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  } catch {
    location.hash = '';
  }
  return m[1];
}

/**
 * Leicht zu ratende PIN? (000000, 123456, 654321, 121212, 123123, 12341234, 112233 …) – der Server prüft
 * dasselbe (server/setup-codes.js importiert diese Funktion) und lehnt sie bei der Café-Einrichtung ab.
 */
export function weakPin(pin) {
  const s = String(pin || '');
  if (!/^\d{6,12}$/.test(s)) return false; // das Format prüft jemand anders
  if (/^(\d)\1+$/.test(s)) return true;
  if ('01234567890123456789'.includes(s) || '98765432109876543210'.includes(s)) return true;
  for (const n of [2, 3, 4]) if (s.length % n === 0 && s === s.slice(0, n).repeat(s.length / n)) return true;
  return /^(\d)\1(\d)\2(\d)\3$/.test(s);
}

/** Restzeit kurz: „9:41“ unter einer Stunde, sonst „3 h 12 min“ bzw. „6 d 4 h“ mit eigenen Einheiten. */
export function fmtLeft(ms, units = { d: 'd', h: 'h', min: 'min' }) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  // „7 Tage“ statt „7 Tage 0 Std“ – Nullen weglassen; units.d darf eine Funktion sein (1 Tag / 7 Tage)
  const days = (n) => (typeof units.d === 'function' ? units.d(n) : `${n} ${units.d}`);
  if (h < 24) return m ? `${h} ${units.h} ${m} ${units.min}` : `${h} ${units.h}`;
  return h % 24 ? `${days(Math.floor(h / 24))} ${h % 24} ${units.h}` : days(Math.floor(h / 24));
}
