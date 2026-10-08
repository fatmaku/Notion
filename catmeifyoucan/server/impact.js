// Cat Me If You Can – Wirkung & Dank auf dem Server: Dank-Feed, „Deine Wirkung“ und die schnellen
// Hilfe-Aktionen der Freiwilligen (Logik und Rechte: public/core/impact.js).

import { readJson } from './http.js';
import { createLimiter } from './ratelimit.js';

/**
 * Hängt die Endpunkte an den Router. player(req) = angemeldete Person (wirft 401/403),
 * writeLimiter = gemeinsame Begrenzung für Schreibzugriffe pro IP.
 */
export function mountImpact({ r, engine, player, writeLimiter = null, now = () => Date.now() }) {
  // Pro Person zusätzlich zur IP: Freiwillige im selben Café-WLAN sollen sich nicht gegenseitig bremsen,
  // ein einzelnes Konto aber auch nicht im Sekundentakt Dank an alle Melder:innen verschicken.
  const careLimiter = createLimiter({ perMinute: 12, burst: 20, now });
  const readLimiter = createLimiter({ perMinute: 30, burst: 20, now });

  r.get('/api/me/feed', ({ req, url }) => {
    const p = player(req);
    if (url.searchParams.get('count') === '1') return engine.feedCount(p);
    return engine.myFeed(p, { limit: Number(url.searchParams.get('limit')) || 50 });
  });
  r.post('/api/me/feed/read', async ({ req }) => {
    const p = player(req);
    readLimiter.take(p.id);
    const body = await readJson(req);
    return engine.markFeedRead(p, { upTo: body.upTo });
  });
  r.get('/api/me/impact', ({ req }) => engine.myImpact(player(req)));
  r.post('/api/cats/:id/care', async ({ req, params, ip }) => {
    const p = player(req);
    if (writeLimiter) writeLimiter.take(ip);
    careLimiter.take(p.id);
    const body = await readJson(req);
    return { status: 201, body: engine.careAction(p, params.id, { action: body.action, note: body.note }) };
  });
}
