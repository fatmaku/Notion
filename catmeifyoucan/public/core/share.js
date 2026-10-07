// Cat Me If You Can – öffentliche Katzenseiten (/c/<id>) und Sitemap.
//
// Liefert nur Daten, die ohnehin öffentlich sind: Name, Typ, Mahalle, Seltenheit, Status,
// Spitznamen (wie in der Rangliste, gesperrte Konten nie) und das Ausschnitt-Foto. Keine
// Koordinaten – auch keine gerundeten –, keine einzelnen Sichtungen, keine Notizen.
//
// Läuft im Server und im Browser (Demo-Modus) und wird in engine.js per Object.assign angehängt.

import { effectiveStatus, districtName } from './cats.js';
import { resolveCatId } from './progress.js';
import { fail } from './util.js';

/** Erlaubte Katzen-IDs in Adressen (c_<zeit><zufall>); alles andere ist sofort „nicht gefunden“. */
export const CAT_ID_RE = /^[a-z0-9][a-z0-9_-]{2,63}$/i;
/** Öffentliche Fotos sind nur Ausschnitte (server/photos.js) – alles andere wird nie verlinkt. */
export const PUBLIC_PHOTO_RE = /^\/photos\/[0-9a-f]{20}_c\.jpg$/;

const KNOWN = (v) => v != null && v !== '' && v !== 'unknown' && v !== 'not_visible';

/** Letzte Änderung einer Katze (für ETag-freundliche Seiten und lastmod in der Sitemap). */
export function catUpdatedAt(cat) {
  return Math.max(cat.lastSeenAt || 0, cat.statusAt || 0, cat.createdAt || 0, (cat.lastReport && cat.lastReport.at) || 0);
}

export function shareApi(ctx) {
  const { store, game } = ctx;

  /** Spitzname nur, wenn das Konto nicht gesperrt ist (wie in der Rangliste). */
  function nickname(playerId) {
    const p = playerId ? store.players.get(playerId) : null;
    return p && !p.banned ? p.nickname : null;
  }

  /**
   * Daten für die öffentliche Katzenseite. Unbekannt, entfernt oder ungültig → 404.
   * Zusammengeführte Katzen: {redirect: true, id: <Ziel>} – die Adresse soll umleiten.
   */
  function publicCatPage(catId) {
    if (typeof catId !== 'string' || !CAT_ID_RE.test(catId)) fail(404, 'cat_not_found', 'Katze nicht gefunden');
    const id = resolveCatId(store, catId);
    const cat = store.cats.get(id);
    if (!cat || cat.removed || cat.mergedInto) fail(404, 'cat_not_found', 'Katze nicht gefunden');
    if (id !== catId) return { redirect: true, id };
    const region = ctx.regionOf(cat.regionId);
    const p = cat.profile || {};
    const latest = cat.latest || {};
    const ageGroup = KNOWN(latest.age_group) ? latest.age_group : KNOWN(p.age_group) ? p.age_group : null;
    const discoveredBy = nickname(cat.discoveredBy);
    const namedBy = cat.name ? nickname(cat.namedBy) : null;
    return {
      redirect: false,
      id: cat.id,
      name: cat.name || null,
      title: cat.title || null,
      legendary: !!cat.legendary,
      demo: !!cat.demo,
      rarity: cat.rarity || 'common',
      status: effectiveStatus(cat, ctx.now(), game),
      pattern: p.pattern || 'diger',
      // nur die Felder, die der gezeichnete Avatar braucht
      look: { id: cat.id, pattern: p.pattern || 'diger', eye_color: p.eye_color || null, ear_tip: p.ear_tip || null },
      ageGroup,
      earTipped: p.ear_tip === 'tipped',
      district: cat.district || null,
      districtName: districtName(region, cat.district),
      districtAka: ((region.districts || []).find((d) => d.id === cat.district) || {}).aka || null, // „Moda“ kennen Gäste eher als „Caferağa“
      regionName: region.name,
      observationCount: cat.observationCount || 0,
      catcherCount: (cat.catcherIds || []).length,
      firstSeenAt: cat.firstSeenAt || cat.createdAt || null,
      lastSeenAt: cat.lastSeenAt || null,
      discoveredBy,
      namedBy: namedBy && namedBy !== discoveredBy ? namedBy : null,
      photoUrl: cat.photoUrl && PUBLIC_PHOTO_RE.test(cat.photoUrl) ? cat.photoUrl : null,
      updatedAt: catUpdatedAt(cat),
    };
  }

  /** Benannte, sichtbare, echte (keine Demo-)Katzen für /sitemap.xml – zuletzt geänderte zuerst. */
  function sitemapCats({ limit = 49000 } = {}) {
    return store.cats
      .all()
      .filter((c) => c.name && !c.removed && !c.mergedInto && !c.demo && CAT_ID_RE.test(c.id))
      .map((c) => ({ id: c.id, updatedAt: catUpdatedAt(c) }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, Math.max(0, limit));
  }

  return { publicCatPage, sitemapCats };
}
