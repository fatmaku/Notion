// Cat Me If You Can – Katzen-Datensätze: Profil aus Sichtungen ableiten, öffentliche Ansicht, Status.

import { blendColors } from './fingerprint.js';
import { fuzz, findDistrict } from './geo.js';
import { rarityOf } from './analysis.js';
import { SEVERITY } from './taxonomy.js';
import { resolveCatId } from './progress.js';

const UNKNOWN = new Set([undefined, null, '', 'unknown', 'diger', 'not_visible']);

/** Profilfelder, die sich nicht (schnell) ändern – aus allen Sichtungen zusammengeführt. */
export const PROFILE_FIELDS = ['pattern', 'coat_colors', 'long_hair', 'eye_color', 'breed_guess', 'sex_guess', 'ear_tip', 'distinctive_marks'];

export function mergeProfile(profile, analysis) {
  const p = { ...(profile || {}) };
  for (const f of PROFILE_FIELDS) {
    const v = analysis[f];
    if (f === 'ear_tip') {
      // „gekerbt“ bleibt gekerbt; sonst gewinnt der erste sichtbare Befund.
      if (v === 'tipped' || p.ear_tip === undefined || (UNKNOWN.has(p.ear_tip) && !UNKNOWN.has(v))) p.ear_tip = v;
      continue;
    }
    if (f === 'coat_colors') {
      if ((!p.coat_colors || !p.coat_colors.length) && Array.isArray(v) && v.length) p.coat_colors = v;
      continue;
    }
    if (f === 'long_hair') {
      if (p.long_hair == null) p.long_hair = !!v;
      continue;
    }
    if (p[f] === undefined || (UNKNOWN.has(p[f]) && !UNKNOWN.has(v))) p[f] = v;
  }
  if (!UNKNOWN.has(analysis.age_group)) p.age_group = analysis.age_group; // Katzen altern
  return p;
}

export function latestFrom(analysis, at) {
  return {
    at,
    age_group: analysis.age_group,
    age_months_min: analysis.age_months_min,
    age_months_max: analysis.age_months_max,
    weight_kg_min: analysis.weight_kg_min,
    weight_kg_max: analysis.weight_kg_max,
    body_condition_score: analysis.body_condition_score,
    body_condition: analysis.body_condition,
    health_severity: analysis.health_severity,
    health_assessed: analysis.health_assessed !== false,
    health_flags: analysis.health_flags,
    health_notes: analysis.health_notes,
    behavior: analysis.behavior,
  };
}

/**
 * Leitet alle zusammenfassenden Felder einer Katze neu aus ihren (nicht abgelehnten)
 * Sichtungen ab. Wird nach jedem Fang und nach Moderation aufgerufen.
 */
export function recomputeCat(ctx, catId) {
  const { store } = ctx;
  const cat = store.cats.get(catId);
  if (!cat) return null;
  const obs = store.observations.where('catId', catId).filter((o) => o.status !== 'rejected').sort((a, b) => a.createdAt - b.createdAt);
  if (!obs.length) {
    return store.cats.update(catId, { removed: true, observationCount: 0 });
  }
  let profile = {};
  let colors = null;
  let n = 0;
  const catchers = new Set();
  let photo = null;
  for (const o of obs) {
    profile = mergeProfile(profile, o.analysis);
    if (o.fingerprint && o.fingerprint.colors) {
      colors = blendColors(colors, o.fingerprint.colors, Math.min(n, 9));
      n++;
    }
    catchers.add(o.playerId);
    if (o.photoUrl && (!photo || (photo.analysis.photo_quality !== 'good' && o.analysis.photo_quality === 'good'))) photo = o;
  }
  const last = obs[obs.length - 1];
  const region = ctx.regionOf(cat.regionId);
  const district = findDistrict(region, last.lat, last.lon);
  const patch = {
    removed: false,
    profile,
    fingerprint: { colors },
    latest: latestFrom(last.analysis, last.createdAt),
    lastSeenAt: last.createdAt,
    lastLat: last.lat,
    lastLon: last.lon,
    district: district ? district.id : cat.district,
    firstSeenAt: obs[0].createdAt,
    observationCount: obs.length,
    catcherIds: [...catchers],
    rarity: rarityOf({ ...last.analysis, ...profile }, { legendary: !!cat.legendary }),
  };
  if (photo) {
    patch.photoId = photo.photoId;
    patch.photoUrl = photo.photoUrl;
  }
  return store.cats.update(catId, patch);
}

export function effectiveStatus(cat, now, game) {
  if (cat.status === 'active' && cat.lastSeenAt && now - cat.lastSeenAt > game.missingAfterDays * 86400000) return 'missing';
  return cat.status || 'active';
}

export function districtName(region, id) {
  const d = region && region.districts.find((x) => x.id === id);
  return d ? d.name : null;
}

/** Öffentliche Sicht auf eine Katze. precise=false rundet die Koordinaten (Tierschutz). */
export function publicCat(ctx, cat, { precise = false } = {}) {
  if (!cat) return null;
  const { game } = ctx;
  const dec = game.publicLocationDecimals;
  const region = ctx.regionOf(cat.regionId);
  const discoverer = cat.discoveredBy ? ctx.store.players.get(cat.discoveredBy) : null;
  return {
    id: cat.id,
    name: cat.name || null,
    title: cat.title || null,
    legendary: !!cat.legendary,
    regionId: cat.regionId,
    district: cat.district,
    districtName: districtName(region, cat.district),
    lat: precise ? cat.lastLat : fuzz(cat.lastLat, dec),
    lon: precise ? cat.lastLon : fuzz(cat.lastLon, dec),
    firstSeenAt: cat.firstSeenAt || cat.createdAt,
    lastSeenAt: cat.lastSeenAt,
    status: effectiveStatus(cat, ctx.now(), game),
    rarity: cat.rarity,
    profile: cat.profile,
    latest: cat.latest,
    photoUrl: cat.photoUrl || null,
    observationCount: cat.observationCount || 0,
    catcherCount: (cat.catcherIds || []).length,
    discoveredBy: discoverer ? discoverer.nickname : null,
    needsReview: !!cat.needsReview,
    demo: !!cat.demo,
  };
}

export function publicObservation(ctx, o, { precise = false } = {}) {
  const dec = ctx.game.publicLocationDecimals;
  const p = ctx.store.players.get(o.playerId);
  const a = o.analysis || {};
  return {
    id: o.id,
    catId: resolveCatId(ctx.store, o.catId),
    at: o.createdAt,
    district: o.district,
    lat: precise ? o.lat : fuzz(o.lat, dec),
    lon: precise ? o.lon : fuzz(o.lon, dec),
    photoUrl: o.photoUrl || null,
    by: p ? p.nickname : null,
    source: o.source,
    analyzer: a.analyzer,
    analysis: {
      pattern: a.pattern,
      age_group: a.age_group,
      age_months_min: a.age_months_min,
      age_months_max: a.age_months_max,
      weight_kg_min: a.weight_kg_min,
      weight_kg_max: a.weight_kg_max,
      body_condition_score: a.body_condition_score,
      body_condition: a.body_condition,
      health_severity: a.health_severity,
      health_flags: a.health_flags,
      health_notes: a.health_notes,
      behavior: a.behavior,
      setting: a.setting,
      ear_tip: a.ear_tip,
      summary: a.summary,
    },
    isDiscovery: !!o.isDiscovery,
  };
}

export function severityRank(sev) {
  return (SEVERITY[sev] || SEVERITY.none).rank;
}
