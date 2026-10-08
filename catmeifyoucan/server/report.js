// Cat Me If You Can – Monatsbericht auf dem Server: GET /api/report?month=YYYY-MM (öffentlich).
// Rechnet die Engine (public/core/report.js) und speichert das Ergebnis je Monat zwischen:
// laufender Monat kurz, abgeschlossene Monate länger (Moderation kann alte Fotos noch ablehnen).
// Antwort mit ETag und Cache-Control: public – sie enthält nur Summen, keine persönlichen Daten.

import crypto from 'node:crypto';
import { isMonthKey } from '../public/core/report.js';
import { sendJson, HttpError } from './http.js';

export const CACHE_CURRENT_MS = 2 * 60 * 1000;
export const CACHE_PAST_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 300; // Monate seit 2024 × Regionen – reicht lange

export function mountReport({ r, engine, now = () => Date.now() }) {
  const cache = new Map(); // `${region}:${month|default}` → {at, ttl, etag, body}

  function build(month, regionId) {
    const body = engine.report({ month, regionId });
    const json = JSON.stringify(body);
    const etag = `"r-${crypto.createHash('sha1').update(json).digest('base64url').slice(0, 16)}"`;
    const ttl = body.partial ? CACHE_CURRENT_MS : CACHE_PAST_MS;
    return { at: now(), ttl, etag, body };
  }

  function get(month, regionId) {
    // ohne Monat: Standardmonat – kurz merken, er hängt vom Datum und von den Daten ab
    const key = `${regionId || ''}:${month || 'default'}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < hit.ttl) return hit;
    const entry = build(month, regionId);
    if (!month) entry.ttl = CACHE_CURRENT_MS;
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, entry);
    return entry;
  }

  r.get('/api/report', ({ req, res, url }) => {
    const raw = url.searchParams.get('month');
    // Ungültige Monate gar nicht erst zwischenspeichern (die Engine prüft auch: nicht zu früh, nicht in der Zukunft)
    if (raw != null && raw !== '' && !isMonthKey(raw)) throw new HttpError(400, 'invalid_month', 'Monat bitte als JJJJ-MM');
    const regionParam = url.searchParams.get('region');
    const regionId = regionParam && engine.ctx.regions.some((x) => x.id === regionParam) ? regionParam : undefined;
    const entry = get(raw || undefined, regionId);
    const left = Math.max(0, Math.round((entry.ttl - (now() - entry.at)) / 1000));
    const headers = { 'Cache-Control': `public, max-age=${Math.min(left, entry.body.partial ? 120 : 600)}`, ETag: entry.etag };
    if (req.headers['if-none-match'] === entry.etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    sendJson(res, 200, entry.body, headers);
  });

  return { clear: () => cache.clear(), size: () => cache.size };
}
