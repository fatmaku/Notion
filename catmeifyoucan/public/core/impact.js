// Cat Me If You Can – Wirkung & Dank (die ernste Seite): schnelle Hilfe-Aktionen für Freiwillige
// („gefüttert“, „Wasser gegeben“, „beim Tierarzt“, „wieder gut“), der Dank-Feed für alle, die die
// Katze vorher gemeldet haben, und „Deine Wirkung“ (Meldungen, geholfene Katzen, Erstfunde, Sichtungen).
//
// Der Feed wird nicht als eigene Sammlung gespeichert, sondern aus den Katzen-Ereignissen (store.events)
// berechnet: Eine Hilfe-Aktion auf Katze K ergibt für jede Person P (außer der Helfer:in) einen
// Eintrag, wenn P die Katze in den 14 Tagen davor gemeldet hat. Das bleibt bei Zusammenführungen
// richtig (die Ereignisse ziehen mit um) und braucht keine Änderung am Speicher. Gelesen-Stand:
// player.feedReadAt (Zeitpunkt).

import { publicCat, effectiveStatus } from './cats.js';
import { resolveCatId } from './progress.js';
import { SEVERITY } from './taxonomy.js';
import { checkName } from './moderation.js';
import { fail, cleanText } from './util.js';
import { startOfDay, endOfDay } from './time.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;

/**
 * Schnelle Hilfe-Aktionen. to = neuer Status (null = bleibt), from = erlaubte Ausgangsstatus,
 * cooldownH = dieselbe Person, dieselbe Katze, dieselbe Aktion frühestens wieder nach x Stunden.
 */
export const CARE_ACTIONS = {
  fed: { type: 'care_fed', icon: '🥣', to: null, from: ['active', 'needs_help', 'in_care', 'missing'], cooldownH: 3 },
  water: { type: 'care_water', icon: '💧', to: null, from: ['active', 'needs_help', 'in_care', 'missing'], cooldownH: 3 },
  vet: { type: 'care_vet', icon: '🩺', to: 'in_care', from: ['active', 'needs_help', 'in_care', 'missing'], cooldownH: 12 },
  ok: { type: 'care_ok', icon: '💚', to: 'active', from: ['needs_help', 'in_care'], cooldownH: 1 },
};
const ACTION_BY_TYPE = Object.fromEntries(Object.entries(CARE_ACTIONS).map(([k, v]) => [v.type, k]));

/** Meldungen zählen für den Dank so lange (Tage vor der Hilfe). */
export const FEED_WINDOW_DAYS = 14;
/** Hilfe-Aktionen pro Person und Tag (Freiwillige). */
export const MAX_CARE_PER_DAY = 60;
/** Gleiche Art von Dank für dieselbe Katze innerhalb dieser Zeit nur einmal (zwei Freiwillige füttern kurz nacheinander). */
const DEDUPE_MS = 6 * HOUR;
const FEED_MAX = 200;

/**
 * Zählt eine Meldung für den Dank? Hilfe-Meldungen (ab „Beobachten“), Zustands-Meldungen mit
 * hungrig/durstig (oder ab „Beobachten“) und KI-Gesundheitshinweise aus dem eigenen Foto.
 */
export function isThankableReport(e) {
  if (!e || !e.by || !e.catId) return false;
  if (e.type === 'help_report' || e.type === 'auto_flag') return true;
  if (e.type !== 'condition') return false;
  const tags = Array.isArray(e.tags) ? e.tags : [];
  if (tags.includes('hungry') || tags.includes('thirsty')) return true;
  return !!(SEVERITY[e.severity] && SEVERITY[e.severity].rank >= SEVERITY.attention.rank);
}

/** Art des Danks für ein Ereignis – oder null, wenn es keine Hilfe war. */
export function feedKind(e) {
  if (!e) return null;
  if (ACTION_BY_TYPE[e.type]) return ACTION_BY_TYPE[e.type];
  if (e.type === 'status') {
    if (e.to === 'in_care' && e.from !== 'in_care') return 'care';
    if (e.to === 'adopted' && e.from !== 'adopted') return 'adopted';
    if (e.to === 'active' && ['needs_help', 'in_care'].includes(e.from)) return 'ok';
  }
  return null;
}

/** Wer bekommt für die Hilfe-Aktion `action` (Ereignis) einen Dank? → Set von Spieler-IDs. */
export function thankedBy(store, action) {
  const out = new Set();
  if (!feedKind(action)) return out;
  for (const e of store.events.where('catId', action.catId)) {
    if (!isThankableReport(e) || e.by === action.by) continue;
    if (e.at <= action.at && action.at - e.at <= FEED_WINDOW_DAYS * DAY) out.add(e.by);
  }
  return out;
}

function feedCat(ctx, cat) {
  const p = cat.profile || {};
  return {
    id: cat.id,
    name: cat.name || null,
    photoUrl: cat.photoUrl || null,
    profile: { pattern: p.pattern || null, eye_color: p.eye_color || null, ear_tip: p.ear_tip || null, coat_colors: p.coat_colors || [] },
    status: effectiveStatus(cat, ctx.now(), ctx.game),
    demo: !!cat.demo,
  };
}

export function impactApi(ctx, api) {
  const { store } = ctx;

  function requireVolunteer(actor) {
    if (!actor || actor.banned) fail(403, 'banned', 'Konto gesperrt');
    if (!['volunteer', 'admin'].includes(actor.role)) fail(403, 'volunteers_only', 'Nur für Freiwillige');
  }

  /**
   * Freiwillige halten fest, was sie getan haben. Rückgabe: {cat, event, notified} – notified = so
   * viele Melder:innen bekommen einen Dank.
   */
  function careAction(actor, catId, { action, note } = {}) {
    requireVolunteer(actor);
    const def = Object.prototype.hasOwnProperty.call(CARE_ACTIONS, action) ? CARE_ACTIONS[action] : null;
    if (!def) fail(400, 'invalid_action', `Aktion: ${Object.keys(CARE_ACTIONS).join(', ')}`);
    const id = resolveCatId(store, catId);
    const cat = store.cats.get(id);
    if (!cat || cat.removed || cat.mergedInto) fail(404, 'cat_not_found', 'Katze nicht gefunden');
    const t = ctx.now();
    const from = effectiveStatus(cat, t, ctx.game);
    if (from === 'adopted' || from === 'deceased') fail(409, 'cat_closed', 'Diese Katze lebt nicht mehr auf der Straße');
    if (!def.from.includes(from)) fail(409, from === 'active' ? 'already_ok' : 'invalid_transition', 'Dieser Schritt passt nicht zum Status');
    const text = cleanText(note, 300);
    if (text && !checkName(text).ok) fail(400, 'text_not_allowed', 'Bitte ohne Schimpfwörter');

    const region = ctx.regionOf(cat.regionId);
    const day = ctx.day(t, region);
    // Tagesgrenzen einmal ausrechnen statt jedes frühere Ereignis per Intl zu formatieren
    // (nach einem Jahr Freiwilligen-Arbeit wären das zehntausende Aufrufe pro Tipp).
    const dayStart = startOfDay(day, region.timezone);
    const dayEnd = endOfDay(day, region.timezone);
    const mine = store.events.where('by', actor.id).filter((e) => ACTION_BY_TYPE[e.type]);
    if (mine.filter((e) => e.at >= dayStart && e.at <= dayEnd).length >= MAX_CARE_PER_DAY) fail(429, 'care_limit', 'Tageslimit für Hilfe-Aktionen erreicht');
    const last = mine.filter((e) => e.catId === id && e.type === def.type).reduce((m, e) => Math.max(m, e.at), 0);
    if (last && t - last < def.cooldownH * HOUR) {
      fail(409, 'care_too_soon', 'Schon gespeichert', { retryAfter: Math.ceil((def.cooldownH * HOUR - (t - last)) / 1000) });
    }

    // Gespeicherter Status ändert sich nur bei „beim Tierarzt“ (→ in Behandlung) und „wieder gut“
    // (→ draußen, gut). „Lange nicht gesehen“ wird beim Lesen berechnet und bleibt unberührt.
    const event = { id: ctx.newId('e'), catId: id, type: def.type, by: actor.id, at: t, from, to: def.to || from, note: text, action };
    if (actor.demo) event.demo = true;
    store.events.insert(event);
    if (def.to && def.to !== (cat.status || 'active')) store.cats.update(id, { status: def.to, statusAt: t, statusBy: actor.id });
    const notified = thankedBy(store, event).size;
    return {
      cat: publicCat(ctx, store.cats.get(id)),
      event: { type: event.type, action, at: t, from: event.from, to: event.to },
      notified,
    };
  }

  /** Alle Dank-Einträge einer Person, neueste zuerst (ohne Gelesen-Markierung). */
  function feedItems(player) {
    const reports = new Map(); // catId → [Zeitpunkte]
    for (const e of store.events.where('by', player.id)) {
      if (!isThankableReport(e)) continue;
      const id = resolveCatId(store, e.catId);
      if (!reports.has(id)) reports.set(id, []);
      reports.get(id).push(e.at);
    }
    const items = [];
    for (const [catId, times] of reports) {
      const cat = store.cats.get(catId);
      if (!cat || cat.removed || cat.mergedInto) continue;
      const actions = store.events.where('catId', catId).filter((e) => e.by !== player.id && feedKind(e)).sort((a, b) => b.at - a.at);
      const kept = [];
      for (const a of actions) {
        const reportedAt = times.filter((r) => r <= a.at && a.at - r <= FEED_WINDOW_DAYS * DAY).reduce((m, r) => Math.max(m, r), 0);
        if (!reportedAt) continue;
        const kind = feedKind(a);
        if (kept.some((k) => k.kind === kind && k.at - a.at < DEDUPE_MS)) continue;
        kept.push({ id: a.id, kind, at: a.at, reportedAt });
      }
      for (const k of kept) items.push({ ...k, cat: feedCat(ctx, cat) });
    }
    items.sort((a, b) => b.at - a.at);
    return items.slice(0, FEED_MAX);
  }

  /** Dank-Feed: {items (neueste zuerst), unread, total, readAt, now}. */
  function myFeed(player, { limit = 50 } = {}) {
    const p = store.players.get(player.id) || player;
    const readAt = p.feedReadAt || 0;
    const all = feedItems(p);
    const lim = Math.max(1, Math.min(FEED_MAX, Number(limit) || 50));
    return {
      items: all.slice(0, lim).map((x) => ({ ...x, unread: x.at > readAt })),
      unread: all.filter((x) => x.at > readAt).length,
      total: all.length,
      readAt,
      now: ctx.now(),
    };
  }

  /** Nur die Zahl für das Herz in der Kopfzeile. */
  function feedCount(player) {
    const p = store.players.get(player.id) || player;
    const readAt = p.feedReadAt || 0;
    return { unread: feedItems(p).filter((x) => x.at > readAt).length, now: ctx.now() };
  }

  /** Alles bis `upTo` (Zeitpunkt der gelesenen Liste, sonst jetzt) als gelesen markieren. */
  function markFeedRead(player, { upTo } = {}) {
    if (!player) fail(401, 'login_required');
    const t = ctx.now();
    const u = Number(upTo);
    const at = Number.isFinite(u) && u > 0 ? Math.min(u, t) : t;
    const p = store.players.get(player.id);
    if (!p) fail(404, 'player_not_found');
    if (at > (p.feedReadAt || 0)) store.players.update(p.id, { feedReadAt: at });
    return feedCount(p);
  }

  /** „Deine Wirkung“: freundliche Kennzahlen fürs Profil und die Startseite. */
  function myImpact(player) {
    const mine = store.events.where('by', player.id);
    const reports = mine.filter((e) => e.type === 'help_report' || e.type === 'condition').length;
    const careActions = mine.filter((e) => feedKind(e)).length;
    const thanks = feedItems(player);
    const helpedCats = new Set(thanks.map((x) => x.cat.id)).size;
    const found = api.visibleCats().filter((c) => c.discoveredBy === player.id);
    let seenByOthers = 0;
    for (const c of found) {
      for (const o of store.observations.where('catId', c.id)) if (o.playerId !== player.id && o.status !== 'rejected') seenByOthers++;
    }
    return { reports, helpedCats, foundFirst: found.length, seenByOthers, careActions, thanks: thanks.length };
  }

  /**
   * Nur Browser-Demo: Eine Demo-Freiwillige reagiert auf eigene Meldungen (ab minAgeMs alt), damit man
   * den Dank-Feed ausprobieren kann. Die Aktion ist als demo markiert. Rückgabe: Anzahl Aktionen.
   */
  function demoRespond(player, { minAgeMs = 60000, max = 1 } = {}) {
    const helper = store.players.all().find((p) => p.demo && p.role === 'volunteer' && !p.banned && p.id !== player.id);
    if (!helper) return 0;
    const t = ctx.now();
    let done = 0;
    const reports = store.events.where('by', player.id).filter((e) => isThankableReport(e) && t - e.at >= minAgeMs && t - e.at <= FEED_WINDOW_DAYS * DAY).sort((a, b) => a.at - b.at);
    for (const r of reports) {
      if (done >= max) break;
      const catId = resolveCatId(store, r.catId);
      const answered = store.events.where('catId', catId).some((e) => e.at >= r.at && e.by !== player.id && feedKind(e));
      if (answered) continue;
      const tags = r.tags || [];
      const serious = r.type !== 'condition' || (SEVERITY[r.severity] && SEVERITY[r.severity].rank >= SEVERITY.attention.rank);
      const action = serious ? 'vet' : tags.includes('thirsty') && !tags.includes('hungry') ? 'water' : 'fed';
      try {
        careAction(helper, catId, { action });
        done++;
      } catch {
        /* Katze passt nicht (adoptiert, schon versorgt …) → nächste Meldung */
      }
    }
    return done;
  }

  return { careAction, myFeed, feedCount, markFeedRead, myImpact, demoRespond };
}
