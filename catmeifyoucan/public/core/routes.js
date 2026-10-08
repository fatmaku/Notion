// Cat Me If You Can – Katzen-Spaziergänge („Kedi rotaları“): Länge, Dauer, Karten-Link und Live-Zahlen
// zu den Wegen aus config/routes.js. Läuft im Server und im Browser (Demo-Modus) und wird in
// engine.js per Object.assign angehängt (engine.walkRoutes(), engine.walkRoute(id)).
//
// Tierschutz: Katzen werden nur über GERUNDETE Positionen gezählt (dieselbe Rundung wie die
// öffentliche Karte, ~100 m). Die Antworten enthalten nie Koordinaten von Katzen oder Sichtungen –
// nur Zahlen, gerundete Hitzeflecken (wie /api/map) und öffentliche Orte (Wegpunkte, Partner-Cafés).

import { WALKS, WALK_RULES } from '../config/routes.js';
import { haversine, fuzz, isValidLatLon, pointInPolygon } from './geo.js';
import { effectiveStatus } from './cats.js';
import { resolveCatId, isCounted } from './progress.js';
import { fail } from './util.js';

const DAY = 86400000;
const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
/** Erlaubte Weg-IDs in Adressen – alles andere ist sofort „nicht gefunden“. */
export const WALK_ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
/** Öffentliche Fotos sind nur Ausschnitte (Server) oder kleine Bilder im Browser-Demo. */
const PUBLIC_PHOTO_RE = /^(\/photos\/[0-9a-f]{20}_c\.jpg|data:image\/jpeg;base64,[A-Za-z0-9+/=]+)$/;

// ---------------------------------------------------------------- Geometrie

/** Länge jedes Abschnitts (m, Luftlinie/Haversine). */
export function legLengthsM(points) {
  const out = [];
  for (let i = 1; i < points.length; i++) out.push(haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  return out;
}

/** Länge der Linie (m, Luftlinie). */
export function pathLengthM(points) {
  return legLengthsM(points).reduce((s, x) => s + x, 0);
}

/** Ungefährer Fußweg (m): Luftlinie × Straßenfaktor. */
export function walkDistanceM(points, rules = WALK_RULES) {
  return pathLengthM(points) * rules.streetFactor;
}

/** Dauer in Minuten: Gehzeit bei rules.speedKmh + Pausen, aufgerundet auf 5 Minuten. */
export function walkMinutes(distanceM, stops, rules = WALK_RULES) {
  const raw = (Math.max(0, distanceM) / 1000 / rules.speedKmh) * 60 + Math.max(0, stops) * rules.stopMin;
  return Math.max(5, Math.ceil(raw / 5 - 1e-9) * 5);
}

/** Kürzester Abstand (m) eines Punkts zur Linie (lokale Projektion, wie geo.distanceToPolygonM). */
export function distanceToPathM(lat, lon, points) {
  if (!points.length) return Infinity;
  if (points.length === 1) return haversine(lat, lon, points[0][0], points[0][1]);
  const kx = Math.cos((lat * Math.PI) / 180) * 111320;
  const ky = 110574;
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const ax = (points[i - 1][1] - lon) * kx;
    const ay = (points[i - 1][0] - lat) * ky;
    const bx = (points[i][1] - lon) * kx;
    const by = (points[i][0] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/** Höchstens max Einträge, gleichmäßig verteilt (Reihenfolge bleibt). */
export function pickEvenly(list, max) {
  if (list.length <= max) return list.slice();
  if (max <= 0) return [];
  const idx = new Set();
  for (let k = 0; k < max; k++) idx.add(Math.min(list.length - 1, Math.max(0, Math.round(((k + 1) * (list.length + 1)) / (max + 1)) - 1)));
  return [...idx].sort((a, b) => a - b).map((i) => list[i]);
}

const coord = ([lat, lon]) => `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
const validPoint = (p) => Array.isArray(p) && isValidLatLon(Number(p[0]), Number(p[1]));

/**
 * Google-Maps-Fußweg (Maps URLs, ohne API-Schlüssel): Start, bis zu maxWaypoints Zwischenpunkte, Ziel.
 * destination (z. B. das Partner-Café am Ende) ersetzt das Ziel; das Wegziel bleibt dann
 * Zwischenpunkt, wenn es nicht direkt daneben liegt.
 */
export function mapsUrl(points, { destination = null, maxWaypoints = WALK_RULES.mapsWaypoints } = {}) {
  const pts = (points || []).filter(validPoint);
  if (!pts.length || (pts.length < 2 && !validPoint(destination))) return null;
  const origin = pts[0];
  let dest = pts[pts.length - 1];
  let via = pts.slice(1, -1);
  if (validPoint(destination)) {
    if (pts.length > 1 && haversine(dest[0], dest[1], destination[0], destination[1]) > 150) via.push(dest);
    dest = destination;
  }
  via = pickEvenly(via, maxWaypoints);
  const q = new URLSearchParams({ api: '1', travelmode: 'walking', origin: coord(origin), destination: coord(dest) });
  if (via.length) q.set('waypoints', via.map(coord).join('|'));
  return `https://www.google.com/maps/dir/?${q}`;
}

/** Prüft einen Weg gegen die Regeln aus config/routes.js. Rückgabe: Liste der Probleme (leer = gut). */
export function validateWalk(walk, regions, rules = WALK_RULES) {
  const problems = [];
  const where = `Weg ${walk && walk.id}`;
  if (!walk || typeof walk.id !== 'string' || !WALK_ID_RE.test(walk.id)) problems.push(`${where}: ungültige id`);
  const region = regions.find((r) => r.id === (walk && walk.regionId));
  if (!region) problems.push(`${where}: unbekannte Region`);
  for (const f of ['name', 'story', 'start', 'finish']) {
    for (const l of LANGS) {
      if (!walk[f] || typeof walk[f][l] !== 'string' || !walk[f][l].trim()) problems.push(`${where}: ${f}.${l} fehlt`);
    }
  }
  const pts = Array.isArray(walk.waypoints) ? walk.waypoints : [];
  if (pts.length < 3 || pts.length > 2 + rules.mapsWaypoints) problems.push(`${where}: 3–${2 + rules.mapsWaypoints} Wegpunkte nötig, ${pts.length} da`);
  pts.forEach((p, i) => {
    if (!validPoint(p)) {
      problems.push(`${where}: Punkt ${i} ungültig`);
      return;
    }
    if (region && !pointInPolygon(p[0], p[1], region.polygon)) problems.push(`${where}: Punkt ${i} liegt nicht in ${region.name}`);
    const withPoly = region ? region.districts.filter((d) => Array.isArray(d.polygon) && d.polygon.length > 2) : [];
    if (withPoly.length && !withPoly.some((d) => pointInPolygon(p[0], p[1], d.polygon))) problems.push(`${where}: Punkt ${i} liegt in keinem Viertel`);
  });
  if (pts.every(validPoint)) {
    legLengthsM(pts).forEach((m, i) => {
      if (m >= rules.maxLegM) problems.push(`${where}: Abschnitt ${i}→${i + 1} ist ${Math.round(m)} m lang (max. ${rules.maxLegM})`);
      if (m < 30) problems.push(`${where}: Punkte ${i} und ${i + 1} liegen fast aufeinander`);
    });
  }
  return problems;
}

// ---------------------------------------------------------------- Live-Zahlen

export function routesApi(ctx, api, { walks = WALKS, rules = WALK_RULES } = {}) {
  const { store, game } = ctx;

  function activeWalks() {
    return walks.filter((w) => ctx.regions.some((r) => r.id === w.regionId) && Array.isArray(w.waypoints) && w.waypoints.length >= 2 && w.waypoints.every(validPoint));
  }

  function partnerCafes(regionId) {
    return store.places
      .where('type', 'partner')
      .filter((p) => p.status === 'approved' && p.active !== false && p.regionId === regionId && isValidLatLon(p.lat, p.lon));
  }

  /**
   * Sichtungen der letzten Tage – nur mit GERUNDETER Position (wie die öffentliche Karte).
   * Exakte Koordinaten werden hier verworfen und kommen in keiner Rechnung danach vor.
   */
  function recentSightings(t) {
    const since = t - rules.days * DAY;
    const dec = game.publicLocationDecimals;
    const out = [];
    for (const o of store.observations.all()) {
      if (!(o.createdAt >= since) || o.createdAt > t + 60000 || o.status === 'rejected') continue;
      const lat = fuzz(o.lat, dec);
      const lon = fuzz(o.lon, dec);
      if (lat == null || lon == null) continue;
      const catId = resolveCatId(store, o.catId);
      const cat = store.cats.get(catId);
      if (!cat || cat.removed || cat.mergedInto) continue;
      out.push({ catId, at: o.createdAt, lat, lon, regionId: o.regionId });
    }
    return out;
  }

  function publicCafe({ p, d, dEnd }) {
    return {
      id: p.id,
      name: p.name,
      address: p.address || '',
      hours: p.hours || '',
      lat: p.lat,
      lon: p.lon,
      reward: p.reward ? { discountPct: Number(p.reward.discountPct) || 0, minCats: Number(p.reward.minCats) || game.dailyGoal } : null,
      demo: !!p.demo,
      distM: Math.round(d / 10) * 10,
      endM: Math.round(dEnd / 10) * 10,
    };
  }

  /** Verschiedene Katzen, die die Spielerin / der Spieler heute entlang des Wegs gezählt fotografiert hat. */
  function mineToday(walk, player, t) {
    const region = ctx.regionOf(walk.regionId);
    const day = ctx.day(t, region);
    const seen = new Set();
    for (const o of store.observations.where('playerId', player.id)) {
      if (o.dayKey !== day || !isCounted(o) || (o.regionId && o.regionId !== walk.regionId) || !isValidLatLon(o.lat, o.lon)) continue;
      if (distanceToPathM(o.lat, o.lon, walk.waypoints) <= rules.catRadiusM) seen.add(resolveCatId(store, o.catId));
    }
    return seen.size;
  }

  function summarize(walk, req, { detail = false } = {}) {
    const { t, sightings, player } = req;
    const pts = walk.waypoints.map(([a, b]) => [Number(a), Number(b)]);
    const finish = pts[pts.length - 1];
    const distanceM = Math.round(walkDistanceM(pts, rules));
    const stops = Math.max(0, pts.length - 2);

    const cats = new Map(); // catId → letzte Sichtung nahe am Weg
    const heat = new Map(); // gerundete Zelle → Anzahl Sichtungen
    for (const s of sightings) {
      if (s.regionId && s.regionId !== walk.regionId) continue;
      const d = distanceToPathM(s.lat, s.lon, pts);
      if (d <= rules.catRadiusM) cats.set(s.catId, Math.max(cats.get(s.catId) || 0, s.at));
      if (detail && d <= rules.heatRadiusM) {
        const k = `${s.lat},${s.lon}`;
        heat.set(k, (heat.get(k) || 0) + 1);
      }
    }
    let needHelp = 0;
    let score = 0;
    for (const [id, at] of cats) {
      if (effectiveStatus(store.cats.get(id), t, game) === 'needs_help') needHelp++;
      score += at >= t - 2 * DAY ? 2 : 1; // frische Sichtungen zählen doppelt („gerade jetzt“)
    }

    const cafesAll = partnerCafes(walk.regionId).map((p) => ({ p, d: distanceToPathM(p.lat, p.lon, pts), dEnd: haversine(p.lat, p.lon, finish[0], finish[1]) }));
    const end = cafesAll.filter((x) => x.dEnd <= rules.cafeEndM).sort((a, b) => a.dEnd - b.dEnd)[0] || null;
    const cafes = cafesAll.filter((x) => x === end || x.d <= rules.cafeRadiusM).sort((a, b) => a.dEnd - b.dEnd);
    const km = distanceM / 1000;

    const out = {
      id: walk.id,
      regionId: walk.regionId,
      icon: walk.icon || '🐾',
      name: walk.name,
      story: walk.story,
      start: walk.start,
      finish: walk.finish,
      waypoints: pts,
      distanceM,
      durationMin: walkMinutes(distanceM, stops, rules),
      stops,
      cats: cats.size,
      needHelp,
      density: km ? Math.round((cats.size / km) * 10) / 10 : 0,
      cafes: cafes.map(publicCafe),
      cafeAtEnd: end ? publicCafe(end) : null,
      mapsUrl: mapsUrl(pts, { destination: end ? [end.p.lat, end.p.lon] : null, maxWaypoints: rules.mapsWaypoints }),
      mine: player ? { today: mineToday(walk, player, t) } : null,
      best: false,
    };
    Object.defineProperty(out, 'score', { value: km ? score / km : 0, enumerable: false });
    if (detail) {
      out.heat = [...heat.entries()].map(([k, n]) => {
        const [la, lo] = k.split(',').map(Number);
        return [la, lo, n];
      });
      out.catList = [...cats.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, rules.maxCats)
        .map(([id, at]) => {
          const c = store.cats.get(id);
          const p = c.profile || {};
          return {
            id: c.id,
            name: c.name || null,
            pattern: p.pattern || 'diger',
            profile: { pattern: p.pattern || 'diger', eye_color: p.eye_color || null, ear_tip: p.ear_tip || null },
            photoUrl: c.photoUrl && PUBLIC_PHOTO_RE.test(c.photoUrl) ? c.photoUrl : null,
            status: effectiveStatus(c, t, game),
            rarity: c.rarity || 'common',
            demo: !!c.demo,
            seenAt: at,
          };
        });
    }
    return out;
  }

  function request(player) {
    const t = ctx.now();
    return { t, sightings: recentSightings(t), player: player && !player.banned ? player : null };
  }

  function markBest(list) {
    let best = null;
    for (const r of list) if (r.score > 0 && (!best || r.score > best.score)) best = r;
    if (best) best.best = true;
    return best;
  }

  /** Alle Wege mit Live-Zahlen. Der beste Weg („gerade die meisten Katzen“) steht oben. */
  function walkRoutes({ player = null } = {}) {
    const req = request(player);
    const list = activeWalks().map((w) => summarize(w, req));
    const best = markBest(list);
    return {
      days: rules.days,
      generatedAt: req.t,
      best: best ? best.id : null,
      routes: best ? [best, ...list.filter((r) => r !== best)] : list,
    };
  }

  /** Ein Weg mit Hitzeflecken (gerundet) und den Katzen, die diese Woche dort gesehen wurden. */
  function walkRoute(id, { player = null } = {}) {
    if (typeof id !== 'string' || !WALK_ID_RE.test(id)) fail(404, 'route_not_found', 'Weg nicht gefunden');
    const all = activeWalks();
    const walk = all.find((w) => w.id === id);
    if (!walk) fail(404, 'route_not_found', 'Weg nicht gefunden');
    const req = request(player);
    const best = markBest(all.map((w) => summarize(w, { ...req, player: null })));
    const out = summarize(walk, req, { detail: true });
    out.best = !!best && best.id === walk.id;
    out.days = rules.days;
    out.generatedAt = req.t;
    return out;
  }

  return { walkRoutes, walkRoute };
}
