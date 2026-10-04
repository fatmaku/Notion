// Cat Me If You Can – Zensus: Katzenliste, Katzenprofil, Status/Hilfe, Orte (Futterstellen, Partner).

import { publicCat, publicObservation, effectiveStatus, severityRank } from './cats.js';
import { resolveCatId } from './progress.js';
import { CAT_STATUS, PLACE_TYPES, PATTERNS, SEVERITY } from './taxonomy.js';
import { findRegion, fuzz, isValidLatLon } from './geo.js';
import { fail, cleanText, cleanName } from './util.js';
import { checkName } from './moderation.js';

/** Freitexte (Hilfe-Meldungen, Ortsvorschläge) sind öffentlich sichtbar → gleicher Wortfilter. */
function assertCleanText(text) {
  if (text && !checkName(text).ok) fail(400, 'text_not_allowed', 'Bitte ohne Schimpfwörter');
}

const SETTABLE_STATUS = ['active', 'needs_help', 'in_care', 'adopted', 'deceased'];
const SUGGESTABLE_PLACES = ['feeding', 'water', 'shelter'];

export function censusApi(ctx) {
  const { store, game } = ctx;

  function visibleCats(regionId) {
    return store.cats.all().filter((c) => !c.mergedInto && !c.removed && (!regionId || c.regionId === regionId));
  }

  function listCats({ regionId, district, status, pattern, severity, q, sort = 'recent', limit = 60, offset = 0 } = {}) {
    const t = ctx.now();
    let list = visibleCats(regionId);
    if (district) list = list.filter((c) => c.district === district);
    if (status) list = list.filter((c) => effectiveStatus(c, t, game) === status);
    if (pattern) list = list.filter((c) => c.profile && c.profile.pattern === pattern);
    if (severity) list = list.filter((c) => c.latest && c.latest.health_severity === severity);
    if (q) {
      const needle = String(q).toLocaleLowerCase('tr').slice(0, 40);
      list = list.filter((c) => (c.name || '').toLocaleLowerCase('tr').includes(needle) || (c.title || '').toLocaleLowerCase('tr').includes(needle));
    }
    const sorters = {
      recent: (a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0),
      popular: (a, b) => (b.observationCount || 0) - (a.observationCount || 0),
      newest: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      rarity: (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || (b.lastSeenAt || 0) - (a.lastSeenAt || 0),
      name: (a, b) => (a.name || '￿').localeCompare(b.name || '￿', 'tr'),
    };
    list.sort(sorters[sort] || sorters.recent);
    const total = list.length;
    const lim = Math.max(1, Math.min(200, Number(limit) || 60));
    const off = Math.max(0, Number(offset) || 0);
    return { total, items: list.slice(off, off + lim).map((c) => publicCat(ctx, c)) };
  }

  function rarityRank(r) {
    return ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(r);
  }

  function getCat(catId, { precise = false } = {}) {
    const id = resolveCatId(store, catId);
    const cat = store.cats.get(id);
    if (!cat || cat.removed) fail(404, 'cat_not_found', 'Katze nicht gefunden');
    const obs = store.observations.where('catId', id).filter((o) => o.status !== 'rejected').sort((a, b) => b.createdAt - a.createdAt);
    const events = store.events.where('catId', id).sort((a, b) => b.at - a.at).slice(0, 50).map((e) => {
      const p = e.by ? store.players.get(e.by) : null;
      return { type: e.type, at: e.at, from: e.from || null, to: e.to || null, note: e.note || '', by: p ? p.nickname : null };
    });
    const history = obs
      .slice()
      .reverse()
      .map((o) => ({
        at: o.createdAt,
        bcs: o.analysis.body_condition_score,
        weightMin: o.analysis.weight_kg_min,
        weightMax: o.analysis.weight_kg_max,
        severity: o.analysis.health_severity,
      }));
    const byPlayer = new Map();
    for (const o of obs) {
      const e = byPlayer.get(o.playerId) || { times: 0, first: o.createdAt, discoverer: false };
      e.times++;
      e.first = Math.min(e.first, o.createdAt);
      if (o.isDiscovery) e.discoverer = true;
      byPlayer.set(o.playerId, e);
    }
    const catchers = [...byPlayer.entries()]
      .map(([pid, e]) => {
        const p = store.players.get(pid);
        return { nickname: p ? p.nickname : '?', times: e.times, firstAt: e.first, discoverer: e.discoverer || cat.discoveredBy === pid, namer: cat.namedBy === pid };
      })
      .sort((a, b) => Number(b.discoverer) - Number(a.discoverer) || b.times - a.times || a.firstAt - b.firstAt)
      .slice(0, 20);
    return {
      cat: publicCat(ctx, cat, { precise }),
      catchers,
      observations: obs.slice(0, 60).map((o) => publicObservation(ctx, o, { precise })),
      events,
      history,
    };
  }

  function requireRole(actor, roles) {
    if (!actor || actor.banned || !roles.includes(actor.role)) fail(403, 'forbidden', 'Keine Berechtigung');
  }

  /** Freiwillige/Moderation setzen den Status (z. B. „in Behandlung“, „adoptiert“). */
  function setCatStatus(actor, catId, status, note) {
    requireRole(actor, ['volunteer', 'admin']);
    if (!SETTABLE_STATUS.includes(status)) fail(400, 'invalid_status', `Status: ${SETTABLE_STATUS.join(', ')}`);
    const id = resolveCatId(store, catId);
    const cat = store.cats.get(id);
    if (!cat || cat.removed) fail(404, 'cat_not_found');
    const t = ctx.now();
    const from = effectiveStatus(cat, t, game);
    store.cats.update(id, { status, statusAt: t, statusBy: actor.id });
    store.events.insert({ id: ctx.newId('e'), catId: id, type: 'status', by: actor.id, at: t, from, to: status, note: cleanText(note, 500) });
    return publicCat(ctx, store.cats.get(id));
  }

  /** Jede:r Spieler:in kann melden, dass eine Katze Hilfe braucht. */
  function reportHelp(player, catId, note) {
    if (!player || player.banned) fail(403, 'banned');
    const id = resolveCatId(store, catId);
    const cat = store.cats.get(id);
    if (!cat || cat.removed) fail(404, 'cat_not_found');
    const t = ctx.now();
    const region = ctx.regionOf(cat.regionId);
    const day = ctx.day(t, region);
    const mine = store.events.where('by', player.id).filter((e) => e.type === 'help_report');
    if (mine.filter((e) => ctx.day(e.at, region) === day).length >= game.maxHelpReportsPerDay) fail(429, 'help_limit', 'Tageslimit für Meldungen erreicht');
    if (mine.some((e) => e.catId === id && ctx.day(e.at, region) === day)) fail(409, 'already_reported', 'Heute schon gemeldet');
    const text = cleanText(note, 500);
    if (text.length < 3) fail(400, 'note_required', 'Bitte kurz beschreiben, was los ist');
    assertCleanText(text);
    const from = effectiveStatus(cat, t, game);
    store.events.insert({ id: ctx.newId('e'), catId: id, type: 'help_report', by: player.id, at: t, from, to: from === 'in_care' ? 'in_care' : 'needs_help', note: text });
    if (['active', 'missing'].includes(from)) store.cats.update(id, { status: 'needs_help', statusAt: t, statusBy: player.id });
    return publicCat(ctx, store.cats.get(id));
  }

  /** Hilfe-Radar: Katzen, die Hilfe brauchen oder in Behandlung sind. */
  function helpList({ regionId } = {}) {
    const t = ctx.now();
    const list = visibleCats(regionId)
      .filter((c) => ['needs_help', 'in_care'].includes(c.status))
      .map((c) => {
        const lastReport = store.events.where('catId', c.id).filter((e) => e.type === 'help_report' || e.type === 'auto_flag').sort((a, b) => b.at - a.at)[0];
        return { cat: publicCat(ctx, c), severity: (c.latest && c.latest.health_severity) || 'none', lastReport: lastReport ? { at: lastReport.at, note: lastReport.note, type: lastReport.type } : null };
      });
    list.sort((a, b) => (a.cat.status === 'needs_help' ? 0 : 1) - (b.cat.status === 'needs_help' ? 0 : 1) || severityRank(b.severity) - severityRank(a.severity) || (b.cat.lastSeenAt || 0) - (a.cat.lastSeenAt || 0));
    return { total: list.length, items: list, now: t };
  }

  // ---------------------------------------------------------------- Orte

  function publicPlace(p, { withStats = false } = {}) {
    const out = {
      id: p.id,
      type: p.type,
      regionId: p.regionId,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      address: p.address || '',
      hours: p.hours || '',
      description: p.description || null,
      reward: p.type === 'partner' ? p.reward || null : null,
      demo: !!p.demo,
      status: p.status,
      active: p.active !== false,
    };
    if (withStats && p.type === 'partner') out.redemptions = store.vouchers.all().filter((v) => v.partnerId === p.id).length;
    return out;
  }

  function listPlaces({ regionId, type, includePending = false } = {}) {
    return store.places
      .all()
      .filter((p) => (!regionId || p.regionId === regionId) && (!type || p.type === type) && (includePending || (p.status === 'approved' && p.active !== false)))
      .sort((a, b) => (a.type === 'partner' ? 0 : 1) - (b.type === 'partner' ? 0 : 1) || a.name.localeCompare(b.name, 'tr'))
      .map((p) => publicPlace(p, { withStats: includePending }));
  }

  function suggestPlace(player, { type, name, lat, lon, note } = {}) {
    if (!player || player.banned) fail(403, 'banned');
    if (!SUGGESTABLE_PLACES.includes(type)) fail(400, 'invalid_type', `Typ: ${SUGGESTABLE_PLACES.join(', ')}`);
    const nm = cleanName(name, { min: 3, max: 60 }) || (PLACE_TYPES[type] && PLACE_TYPES[type].label.tr);
    assertCleanText(nm);
    assertCleanText(cleanText(note, 300));
    const la = Number(lat);
    const lo = Number(lon);
    if (!isValidLatLon(la, lo)) fail(400, 'invalid_location');
    const region = findRegion(ctx.regions, la, lo);
    if (!region) fail(422, 'outside_region');
    const pending = store.places.all().filter((p) => p.createdBy === player.id && p.status === 'pending');
    if (pending.length >= 10) fail(429, 'too_many_pending', 'Zu viele offene Vorschläge');
    const p = {
      id: ctx.newId('pl'),
      type,
      regionId: region.id,
      name: nm,
      lat: la,
      lon: lo,
      description: { tr: cleanText(note, 300), de: cleanText(note, 300), en: cleanText(note, 300) },
      status: 'pending',
      active: true,
      createdBy: player.id,
      createdAt: ctx.now(),
    };
    store.places.insert(p);
    return publicPlace(p);
  }

  // ---------------------------------------------------------------- Karte

  /** Leichte Kartendaten: Katzen (gerundet) + Orte + Hitzepunkte der letzten 30 Tage. */
  function mapData({ regionId, days = 30 } = {}) {
    const t = ctx.now();
    const dec = game.publicLocationDecimals;
    const cats = visibleCats(regionId).map((c) => ({
      id: c.id,
      name: c.name,
      lat: fuzz(c.lastLat, dec),
      lon: fuzz(c.lastLon, dec),
      pattern: c.profile && c.profile.pattern,
      colors: c.profile && c.profile.coat_colors,
      status: effectiveStatus(c, t, game),
      severity: c.latest && c.latest.health_severity,
      rarity: c.rarity,
      lastSeenAt: c.lastSeenAt,
      photoUrl: c.photoUrl || null,
    }));
    const since = t - days * 86400000;
    const heat = new Map();
    for (const o of store.observations.all()) {
      if (o.createdAt < since || o.status === 'rejected' || (regionId && o.regionId !== regionId)) continue;
      const k = `${fuzz(o.lat, 3)},${fuzz(o.lon, 3)}`;
      heat.set(k, (heat.get(k) || 0) + 1);
    }
    return {
      cats,
      places: listPlaces({ regionId }),
      heat: [...heat.entries()].map(([k, n]) => {
        const [la, lo] = k.split(',').map(Number);
        return [la, lo, n];
      }),
    };
  }

  /** Alle sichtbaren Katzen (öffentlich, gerundet) – für den Datenexport, ohne Seitenbegrenzung. */
  function exportCats({ regionId } = {}) {
    return visibleCats(regionId).sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0)).map((c) => publicCat(ctx, c));
  }

  return { listCats, exportCats, getCat, setCatStatus, reportHelp, helpList, listPlaces, publicPlace, suggestPlace, mapData, visibleCats };
}

export const VALID = { SETTABLE_STATUS, SUGGESTABLE_PLACES, CAT_STATUS, PATTERNS, SEVERITY };
