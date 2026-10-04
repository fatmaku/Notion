// Cat Me If You Can – kleine Helfer ohne Abhängigkeiten.

/** Fachlicher Fehler mit HTTP-Status; der Server gibt {error: code, message, ...details} zurück. */
export class GameError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.name = 'GameError';
    this.status = status;
    this.code = code;
    this.details = details || null;
  }
}

export const fail = (status, code, message, details) => {
  throw new GameError(status, code, message, details);
};

function rngBytes(n) {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
/** Kollisionsarme, sortierbare IDs: Präfix + Zeit (base36) + 8 Zufallszeichen. */
export function makeIdFactory(randomBytes = rngBytes, now = () => Date.now()) {
  return (prefix) => {
    const b = randomBytes(8);
    let r = '';
    for (const x of b) r += ID_ALPHABET[x % 36];
    return `${prefix}_${now().toString(36)}${r}`;
  };
}

/** Gutscheincodes ohne verwechselbare Zeichen (kein 0/O, 1/I/L): CAT-XXXX-XXXX ≈ 40 Bit. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeCode(randomBytes = rngBytes) {
  const b = randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return `CAT-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Eingabe vom Café (abgetippt oder aus dem QR-Code) → kanonischer Code oder null. */
export function normalizeCode(input) {
  if (typeof input !== 'string') return null;
  let s = input.toUpperCase().trim().replace(/^CATME:/, '').replace(/[^A-Z0-9]/g, '');
  if (s.length === 11 && s.startsWith('CAT')) s = s.slice(3);
  if (s.length !== 8) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return `CAT-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Spitznamen/Katzennamen: 2–24 Zeichen, Buchstaben (inkl. ç ğ ı ö ş ü), Ziffern, Leerzeichen, . _ - ' */
export function cleanName(input, { min = 2, max = 24 } = {}) {
  if (typeof input !== 'string') return null;
  // Halbabstand (ZWNJ, U+200C) gehört zu vielen persischen Namen („گربه‌دوست“); neben Leerzeichen
  // und am Rand ist er sinnlos. Andere unsichtbare Zeichen bleiben verboten.
  const s = input
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/\u200c+/g, '\u200c')
    .replace(/\u200c*( )\u200c*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/^[ \u200c]+|[ \u200c]+$/g, '');
  if (s.length < min || s.length > max) return null;
  if (!/^[\p{L}\p{M}\p{N} ._'\u200c-]+$/u.test(s)) return null;
  if (/^\p{M}|\p{M}{3,}/u.test(s)) return null; // kein Zeichen-Turm aus Akzenten („Zalgo“)
  return s;
}

export function cleanText(input, max = 500) {
  if (typeof input !== 'string') return '';
  return input.normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max);
}

export const byNewest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
