// Cat Me If You Can – Moderation: Prüfliste, Katzen zusammenführen/abtrennen, Sichtungen ablehnen,
// Legenden, Rollen, Partner und Ortsvorschläge.

import { recomputeCat, publicCat, publicObservation } from './cats.js';
import { resolveCatId } from './progress.js';
import { rarityOf } from './analysis.js';
import { findRegion, isValidLatLon } from './geo.js';
import { ROLES, PLACE_TYPES } from './taxonomy.js';
import { fail, cleanName, cleanText } from './util.js';

export function adminApi(ctx, api) {
  const { store } = ctx;

  function requireAdmin(actor) {
    if (!actor || actor.role !== 'admin') fail(403, 'forbidden', 'Nur für Moderation');
  }

  function event(catId, type, by, extra = {}) {
    store.events.insert({ id: ctx.newId('e'), catId, type, by: by || null, at: ctx.now(), ...extra });
  }

  function reviewQueue(actor) {
    requireAdmin(actor);
    const cats = store.cats.all().filter((c) => c.needsReview && !c.mergedInto && !c.removed).map((c) => ({
      cat: publicCat(ctx, c, { precise: true }),
      possibleDuplicates: (c.possibleDuplicates || []).map((id) => store.cats.get(resolveCatId(store, id))).filter((x) => x && !x.removed).map((x) => publicCat(ctx, x, { precise: true })),
    }));
    const disputes = store.disputes.all().filter((d) => !d.resolved).map((d) => {
      const o = store.observations.get(d.observationId);
      const p = store.players.get(d.playerId);
      return { id: d.id, reason: d.reason, createdAt: d.createdAt, by: p ? p.nickname : null, observation: o ? publicObservation(ctx, o, { precise: true }) : null };
    });
    const flagged = store.observations.all()
      .filter((o) => o.status !== 'rejected' && !o.reviewed && (o.flags || []).some((f) => ['impossible_travel', 'stale_photo', 'status_conflict'].includes(f)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
      .map((o) => ({ ...publicObservation(ctx, o, { precise: true }), flags: o.flags, playerId: o.playerId }));
    const places = store.places.all().filter((p) => p.status === 'pending').map((p) => api.publicPlace(p));
    return { cats, disputes, flagged, places };
  }

  function mergeCats(actor, sourceId, targetId) {
    requireAdmin(actor);
    const src = store.cats.get(resolveCatId(store, sourceId));
    const dst = store.cats.get(resolveCatId(store, targetId));
    if (!src || !dst || src.removed || dst.removed) fail(404, 'cat_not_found');
    if (src.id === dst.id) fail(400, 'same_cat');
    for (const o of store.observations.where('catId', src.id)) store.observations.update(o.id, { catId: dst.id });
    for (const e of store.events.where('catId', src.id)) store.events.update(e.id, { catId: dst.id });
    const patch = { mergedInto: dst.id, needsReview: false };
    store.cats.update(src.id, patch);
    const keep = {
      name: dst.name || src.name,
      namedBy: dst.name ? dst.namedBy : src.namedBy,
      legendary: dst.legendary || src.legendary,
      title: dst.title || src.title,
      discoveredBy: (src.discoveredAt || Infinity) < (dst.discoveredAt || Infinity) ? src.discoveredBy : dst.discoveredBy,
      discoveredAt: Math.min(src.discoveredAt || Infinity, dst.discoveredAt || Infinity),
      needsReview: false,
      possibleDuplicates: [],
    };
    store.cats.update(dst.id, keep);
    // Nur die frühere Sichtung bleibt „Entdeckung“
    const obs = store.observations.where('catId', dst.id).sort((a, b) => a.createdAt - b.createdAt);
    obs.forEach((o, i) => {
      if (o.isDiscovery && i > 0) store.observations.update(o.id, { isDiscovery: false });
    });
    recomputeCat(ctx, dst.id);
    event(dst.id, 'merged', actor.id, { note: src.id });
    return publicCat(ctx, store.cats.get(dst.id), { precise: true });
  }

  /** Eine falsch zugeordnete Sichtung wird zu einer eigenen (neuen) Katze. */
  function splitObservation(actor, observationId) {
    requireAdmin(actor);
    const o = store.observations.get(observationId);
    if (!o) fail(404, 'observation_not_found');
    const oldId = resolveCatId(store, o.catId);
    if (store.observations.where('catId', oldId).filter((x) => x.status !== 'rejected').length <= 1) fail(400, 'only_observation', 'Einzige Sichtung dieser Katze');
    const cat = {
      id: ctx.newId('c'),
      regionId: o.regionId,
      district: o.district,
      name: null,
      namedBy: null,
      title: null,
      legendary: false,
      discoveredBy: o.playerId,
      discoveredAt: o.createdAt,
      createdAt: ctx.now(),
      lastSeenAt: o.createdAt,
      lastLat: o.lat,
      lastLon: o.lon,
      profile: {},
      fingerprint: o.fingerprint ? { colors: o.fingerprint.colors } : { colors: null },
      photoId: o.photoId,
      photoUrl: o.photoUrl,
      status: 'active',
      rarity: rarityOf(o.analysis),
      observationCount: 0,
      catcherIds: [],
      needsReview: false,
      possibleDuplicates: [],
    };
    store.cats.insert(cat);
    store.observations.update(o.id, { catId: cat.id, isDiscovery: true, reviewed: true });
    recomputeCat(ctx, cat.id);
    recomputeCat(ctx, oldId);
    for (const d of store.disputes.where('observationId', o.id)) store.disputes.update(d.id, { resolved: true, resolution: 'split', resolvedAt: ctx.now() });
    event(cat.id, 'split', actor.id, { note: oldId });
    return publicCat(ctx, store.cats.get(cat.id), { precise: true });
  }

  /** Sichtung ablehnen (Betrug, keine Katze …): zählt nicht mehr, XP werden zurückgebucht. */
  function rejectObservation(actor, observationId, reason) {
    requireAdmin(actor);
    const o = store.observations.get(observationId);
    if (!o) fail(404, 'observation_not_found');
    if (o.status === 'rejected') return { ok: true };
    store.observations.update(o.id, { status: 'rejected', rejectReason: cleanText(reason, 200), reviewed: true });
    const player = store.players.get(o.playerId);
    const xpOfObs = store.xp.where('playerId', o.playerId).filter((x) => x.observationId === o.id).reduce((s, x) => s + x.amount, 0);
    if (player && xpOfObs) api.addXp(player, -xpOfObs, 'rejected', { observationId: o.id, regionId: o.regionId });
    recomputeCat(ctx, resolveCatId(store, o.catId));
    for (const d of store.disputes.where('observationId', o.id)) store.disputes.update(d.id, { resolved: true, resolution: 'rejected', resolvedAt: ctx.now() });
    return { ok: true };
  }

  function resolveDispute(actor, disputeId, resolution) {
    requireAdmin(actor);
    const d = store.disputes.get(disputeId);
    if (!d) fail(404, 'dispute_not_found');
    store.disputes.update(d.id, { resolved: true, resolution: cleanText(resolution, 50) || 'kept', resolvedAt: ctx.now() });
    return { ok: true };
  }

  function markReviewed(actor, { catId, observationId } = {}) {
    requireAdmin(actor);
    if (catId) store.cats.update(resolveCatId(store, catId), { needsReview: false, possibleDuplicates: [] });
    if (observationId) store.observations.update(observationId, { reviewed: true });
    return { ok: true };
  }

  function setLegendary(actor, catId, { legendary, title } = {}) {
    requireAdmin(actor);
    const id = resolveCatId(store, catId);
    const cat = store.cats.get(id);
    if (!cat) fail(404, 'cat_not_found');
    store.cats.update(id, { legendary: !!legendary, title: legendary ? cleanText(title, 60) || null : null });
    recomputeCat(ctx, id);
    event(id, legendary ? 'legend' : 'legend_removed', actor.id, { note: title || '' });
    return publicCat(ctx, store.cats.get(id), { precise: true });
  }

  function renameCat(actor, catId, name) {
    requireAdmin(actor);
    const id = resolveCatId(store, catId);
    if (!store.cats.get(id)) fail(404, 'cat_not_found');
    const clean = name === null || name === '' ? null : cleanName(name, { min: 2, max: 20 });
    if (name && !clean) fail(400, 'invalid_name');
    store.cats.update(id, { name: clean });
    event(id, 'renamed', actor.id, { note: clean || '' });
    return publicCat(ctx, store.cats.get(id), { precise: true });
  }

  function setRole(actor, playerId, role) {
    requireAdmin(actor);
    if (!ROLES.includes(role)) fail(400, 'invalid_role');
    const p = store.players.get(playerId);
    if (!p) fail(404, 'player_not_found');
    store.players.update(p.id, { role });
    return api.publicPlayer(store.players.get(p.id));
  }

  function setBanned(actor, playerId, banned) {
    requireAdmin(actor);
    const p = store.players.get(playerId);
    if (!p) fail(404, 'player_not_found');
    store.players.update(p.id, { banned: !!banned });
    return { ok: true };
  }

  function listPlayers(actor, { q } = {}) {
    requireAdmin(actor);
    const needle = (q || '').toLocaleLowerCase('tr');
    return store.players.all()
      .filter((p) => !needle || p.nickname.toLocaleLowerCase('tr').includes(needle))
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .slice(0, 200)
      .map((p) => ({ ...api.publicPlayer(p), banned: !!p.banned, observations: store.observations.where('playerId', p.id).length }));
  }

  /**
   * Partner (Café) anlegen/ändern. pinHash berechnet der Server (scrypt) – die Engine sieht nie
   * die PIN. reward: {minCats, discountPct, maxPerDay?, text?: {tr,de,en}}
   */
  function upsertPlace(actor, data = {}) {
    requireAdmin(actor);
    const existing = data.id ? store.places.get(data.id) : null;
    const type = data.type || (existing && existing.type) || 'partner';
    if (!PLACE_TYPES[type]) fail(400, 'invalid_type');
    const name = data.name !== undefined ? cleanText(data.name, 60) : existing && existing.name;
    if (!name || name.length < 2) fail(400, 'invalid_name');
    const lat = data.lat !== undefined ? Number(data.lat) : existing && existing.lat;
    const lon = data.lon !== undefined ? Number(data.lon) : existing && existing.lon;
    if (!isValidLatLon(lat, lon)) fail(400, 'invalid_location');
    const region = findRegion(ctx.regions, lat, lon);
    if (!region) fail(422, 'outside_region');
    const doc = {
      type,
      name,
      lat,
      lon,
      regionId: region.id,
      address: data.address !== undefined ? cleanText(data.address, 120) : existing ? existing.address : '',
      hours: data.hours !== undefined ? cleanText(data.hours, 80) : existing ? existing.hours : '',
      description: data.description !== undefined ? sanitizeI18n(data.description) : existing ? existing.description : null,
      status: data.status || (existing && existing.status) || 'approved',
      active: data.active !== undefined ? !!data.active : existing ? existing.active : true,
    };
    if (type === 'partner') {
      const r = data.reward || (existing && existing.reward) || {};
      const minCats = Math.round(Number(r.minCats));
      const discountPct = Math.round(Number(r.discountPct));
      doc.reward = {
        minCats: Number.isFinite(minCats) && minCats >= 1 && minCats <= 200 ? minCats : ctx.game.dailyGoal,
        discountPct: Number.isFinite(discountPct) && discountPct >= 1 && discountPct <= 100 ? discountPct : 20,
        maxPerDay: Number(r.maxPerDay) > 0 ? Math.round(Number(r.maxPerDay)) : null,
        text: r.text ? sanitizeI18n(r.text) : null,
      };
      if (data.pinHash) doc.pinHash = data.pinHash;
      else if (!existing || !existing.pinHash) fail(400, 'pin_required', 'Partner brauchen eine PIN');
    }
    if (existing) return api.publicPlace(store.places.update(existing.id, doc), { withStats: true });
    const p = { id: ctx.newId('pl'), ...doc, createdBy: actor.id, createdAt: ctx.now() };
    store.places.insert(p);
    return api.publicPlace(p, { withStats: true });
  }

  function sanitizeI18n(v) {
    if (typeof v === 'string') return { tr: cleanText(v, 300), de: cleanText(v, 300), en: cleanText(v, 300) };
    if (!v || typeof v !== 'object') return null;
    return { tr: cleanText(v.tr, 300), de: cleanText(v.de, 300), en: cleanText(v.en, 300) };
  }

  function reviewPlace(actor, placeId, approve) {
    requireAdmin(actor);
    const p = store.places.get(placeId);
    if (!p) fail(404, 'place_not_found');
    store.places.update(p.id, { status: approve ? 'approved' : 'rejected' });
    return api.publicPlace(store.places.get(p.id));
  }

  return {
    reviewQueue, mergeCats, splitObservation, rejectObservation, resolveDispute, markReviewed,
    setLegendary, renameCat, setRole, setBanned, listPlayers, upsertPlace, reviewPlace,
  };
}
