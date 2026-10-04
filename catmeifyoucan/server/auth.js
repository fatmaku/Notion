// Cat Me If You Can – Anmeldung.
//
// Spieler:innen: kein Passwort. Beim ersten Start bekommt das Handy ein zufälliges Token
// (32 Byte), der Server speichert nur dessen SHA-256. Wer das Token verliert, fängt neu an –
// bewusst simpel für ein Straßenspiel. (Ausbau: Login per E-Mail-Link / Telefon.)
//
// Cafés: Partner-ID + PIN (scrypt-Hash in der Datenbank) → Sitzungstoken für 12 Stunden.
// Moderation: ADMIN_TOKEN aus der Umgebung – oder ein Spielerkonto mit Rolle „admin“.

import crypto from 'node:crypto';
import { HttpError } from './http.js';

export const newToken = () => crypto.randomBytes(32).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export function hashPin(pin) {
  if (typeof pin !== 'string' || !/^\d{6,12}$/.test(pin)) throw new HttpError(400, 'invalid_pin', 'PIN: 6–12 Ziffern');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin, stored) {
  if (typeof pin !== 'string' || typeof stored !== 'string') return false;
  const [kind, saltHex, hashHex] = stored.split('$');
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function bearer(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+([A-Za-z0-9_\-.~+/=]{16,200})$/.exec(h);
  return m ? m[1] : null;
}

/** Sitzungen der Cafés (im Speicher – nach Neustart einfach neu anmelden). */
export function createPartnerSessions({ ttlMs = 12 * 3600000, now = () => Date.now() } = {}) {
  const sessions = new Map();
  return {
    create(partnerId) {
      const token = newToken();
      sessions.set(sha256(token), { partnerId, exp: now() + ttlMs });
      return token;
    },
    get(token) {
      if (!token) return null;
      const key = sha256(token);
      const s = sessions.get(key);
      if (!s) return null;
      if (s.exp < now()) {
        sessions.delete(key);
        return null;
      }
      return s.partnerId;
    },
    revoke(token) {
      if (token) sessions.delete(sha256(token));
    },
  };
}
