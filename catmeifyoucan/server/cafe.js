// Cat Me If You Can – Café-QR auf dem Server: Empfehlungs-Cookie, Zuordnung bei der Anmeldung und
// die Endpunkte für Café-Zahlen, Druckvorlage und Moderation (Logik: public/core/cafe.js).
//
// Ablauf: Gast scannt den QR-Code am Tisch → „/?ref=ABC234“. Gehört der Code zu einem freigegebenen,
// aktiven Partner-Café, setzt der Server ein eigenes Cookie catme_ref (30 Tage, HttpOnly,
// SameSite=Lax, bei HTTPS Secure). Legt der Gast danach ein Konto an (POST /api/players), wird das
// Café als Herkunft gespeichert und das Cookie gelöscht. Keine IP, keine weiteren Daten.

import { REF_COOKIE, REF_DAYS, normalizeRefCode } from '../public/core/cafe.js';

const PAGES = new Set(['/', '/index.html', '/app.html']);
const MAX_AGE = REF_DAYS * 86400;

/** Wert eines Cookies aus dem Cookie-Header (erster gültiger Eintrag) oder null. */
export function readCookie(header, name) {
  const h = String(header || '');
  if (!h || h.length > 8192) return null;
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i < 0 || part.slice(0, i).trim() !== name) continue;
    const v = part.slice(i + 1).trim();
    if (v) return v;
  }
  return null;
}

/** HTTPS direkt (eigenes Zertifikat) oder hinter einem vertrauenswürdigen Proxy (X-Forwarded-Proto). */
export function isHttps(req, trustProxy = 0) {
  if (req.socket && req.socket.encrypted) return true;
  if (!trustProxy) return false;
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase() === 'https';
}

export function refCookie(code, { secure = false } = {}) {
  return `${REF_COOKIE}=${code}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`;
}

export function clearRefCookie({ secure = false } = {}) {
  return `${REF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`;
}

/** Hängt einen Set-Cookie-Header an, ohne andere (z. B. von weiteren Erweiterungen) zu verlieren. */
function addCookie(res, cookie) {
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
}

export function mountCafe({ r, engine, partner, admin, publicUrl = '', trustProxy = 0, log = () => {} }) {
  const pub = String(publicUrl || '').replace(/\/+$/, '') || null;
  const refFrom = (req) => normalizeRefCode(readCookie(req.headers.cookie, REF_COOKIE));

  // Café (nach Anmeldung mit PIN): eigener Code und Zahlen
  r.get('/api/partner/stats', ({ req }) => ({ ...engine.partnerStats(partner(req)), publicUrl: pub }));
  // Druckvorlage: öffentliche Café-Daten (Name, Code, Rabatt) – ohne ?cafe die allgemeine Version
  r.get('/api/cafe/kit', ({ url }) => ({ ...engine.cafeKit(url.searchParams.get('cafe') || null), publicUrl: pub }));
  // „Willkommen von Café X“ für Startseite/App: ?code=… oder das eigene Cookie
  r.get('/api/cafe/ref', ({ req, url }) => engine.refWelcome(url.searchParams.get('code') || refFrom(req)));
  // Moderation: Code und Zahlen je Café
  r.get('/api/admin/cafe/referrals', ({ req }) => engine.referralOverview(admin(req)));

  return {
    /** Seitenaufruf mit ?ref=<Code> → Cookie setzen (nur Startseite/App, nur freigegebene Cafés). */
    onPage(req, res, url) {
      try {
        if (!PAGES.has(url.pathname) || !url.searchParams.has('ref')) return;
        const place = engine.refPartner(url.searchParams.get('ref'));
        if (!place) return;
        if (engine.refPartner(refFrom(req))) return; // erster Kontakt zählt – vorhandenes Cookie bleibt
        addCookie(res, refCookie(place.refCode, { secure: isHttps(req, trustProxy) }));
      } catch (e) {
        log('cafe.onPage:', e && e.message);
      }
    },
    /** Neues Konto: Herkunft speichern (erster Kontakt) und das Cookie löschen. */
    onRegister(req, res, player) {
      try {
        const raw = readCookie(req.headers.cookie, REF_COOKIE);
        if (!raw) return null;
        addCookie(res, clearRefCookie({ secure: isHttps(req, trustProxy) }));
        return engine.attributeReferral(player, raw);
      } catch (e) {
        log('cafe.onRegister:', e && e.message);
        return null;
      }
    },
  };
}
