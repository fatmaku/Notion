// Cat Me If You Can – Geometrie ohne Abhängigkeiten (läuft im Browser und in Node).
// Koordinaten immer als [lat, lon] bzw. {lat, lon}.

const R = 6371008.8; // mittlerer Erdradius in Metern
const rad = (d) => (d * Math.PI) / 180;

export function haversine(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Ray casting; polygon = [[lat, lon], ...]. */
export function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const hit = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Abstand Punkt → Polygonrand in Metern (lokale äquirektangulare Projektion, für Stadtteile genau genug). */
export function distanceToPolygonM(lat, lon, polygon) {
  const kx = Math.cos(rad(lat)) * 111320;
  const ky = 110574;
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ax = (polygon[j][1] - lon) * kx;
    const ay = (polygon[j][0] - lat) * ky;
    const bx = (polygon[i][1] - lon) * kx;
    const by = (polygon[i][0] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const px = ax + t * dx;
    const py = ay + t * dy;
    best = Math.min(best, Math.hypot(px, py));
  }
  return best;
}

export function isValidLatLon(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Region, in der der Punkt liegt (oder innerhalb von bufferM am Rand), sonst null. */
export function findRegion(regions, lat, lon) {
  if (!isValidLatLon(lat, lon)) return null;
  for (const r of regions) {
    if (pointInPolygon(lat, lon, r.polygon)) return r;
  }
  for (const r of regions) {
    if (distanceToPolygonM(lat, lon, r.polygon) <= (r.bufferM || 0)) return r;
  }
  return null;
}

/** Mahalle: erst echte Polygone (falls hinterlegt), sonst nächstes Zentrum. */
export function findDistrict(region, lat, lon) {
  if (!region || !Array.isArray(region.districts) || !region.districts.length) return null;
  for (const d of region.districts) {
    if (Array.isArray(d.polygon) && d.polygon.length > 2 && pointInPolygon(lat, lon, d.polygon)) return d;
  }
  let best = null;
  let bestD = Infinity;
  for (const d of region.districts) {
    const dist = haversine(lat, lon, d.center[0], d.center[1]);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

/** Öffentliche Koordinaten: gerundet, damit niemand eine Katze auf den Meter genau aufspüren kann. */
export function fuzz(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function bboxOf(polygon) {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [la, lo] of polygon) {
    minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la);
    minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo);
  }
  return { minLat, maxLat, minLon, maxLon };
}

/** Zufallspunkt im Polygon (für Demo-Daten und Standort-Simulation). rng: () => [0,1). */
export function randomPointInPolygon(polygon, rng = Math.random) {
  const b = bboxOf(polygon);
  for (let i = 0; i < 1000; i++) {
    const lat = b.minLat + rng() * (b.maxLat - b.minLat);
    const lon = b.minLon + rng() * (b.maxLon - b.minLon);
    if (pointInPolygon(lat, lon, polygon)) return [lat, lon];
  }
  return [(b.minLat + b.maxLat) / 2, (b.minLon + b.maxLon) / 2];
}

/** Punkt in der Nähe (Meter) – für Demo-Daten. */
export function jitter(lat, lon, meters, rng = Math.random) {
  const a = rng() * 2 * Math.PI;
  const d = Math.sqrt(rng()) * meters;
  return [lat + (Math.sin(a) * d) / 110574, lon + (Math.cos(a) * d) / (111320 * Math.cos(rad(lat)))];
}
