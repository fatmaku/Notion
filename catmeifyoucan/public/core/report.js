// Cat Me If You Can – öffentlicher Monatsbericht „Straßenkatzen von Kadıköy“ (für Presse, Tierschutz,
// Stadtverwaltung). Läuft im Server und im Browser (Demo-Modus) und wird in engine.js per
// Object.assign angehängt.
//
// Alles zählt in Istanbul-Zeit (Zeitzone der Region): ein Monat beginnt am 1. um 00:00 Uhr vor Ort.
// Der Bericht enthält nur Summen – keine Koordinaten (auch keine gerundeten), keine Katzen-IDs,
// keine Spitznamen, keine Notizen. Mahalle-Zeilen sind die feinste Ebene.
//
// Gezählt werden Sichtungen, die nicht von der Moderation abgelehnt wurden und nicht von gesperrten
// Konten stammen. Zusammengeführte Katzen zählen einmal (unter der Ziel-Katze).

import { startOfDay, addDays } from './time.js';
import { resolveCatId } from './progress.js';
import { AGE_GROUPS, BCS_CLASSES, SEVERITY, CONDITION_TAGS } from './taxonomy.js';
import { CARE_ACTIONS } from './impact.js';
import { fail } from './util.js';

/** Frühester Monat, den der Bericht annimmt (vorher gab es das Spiel nicht). */
export const MIN_MONTH = '2024-01';
/** Weniger Fotos als das in einem Monat → Mahalle gilt als „wenig Daten“. */
export const LOW_DATA_PHOTOS = 10;
/** Kastrationsanteil je Mahalle erst ab so vielen Katzen mit sichtbaren Ohren. */
export const MIN_SAMPLE = 3;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const HELPED_FROM = new Set(['needs_help', 'in_care']);
const HELPED_TO = { in_care: 'toCare', active: 'resolved', adopted: 'adopted' };
/**
 * Schnelle Hilfe der Freiwilligen (Erweiterung impact), die den Status setzt: „beim Tierarzt“ → in
 * Behandlung, „wieder gut“ → draußen, gut. Das ist dieselbe Hilfe wie ein Statuswechsel per Hand.
 */
const CARE_STATUS_TYPES = new Set(Object.values(CARE_ACTIONS).filter((a) => a.to).map((a) => a.type));

export function isMonthKey(m) {
  return typeof m === 'string' && MONTH_RE.test(m);
}

/** 'YYYY-MM' ± n Monate. */
export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${String(Math.floor(i / 12)).padStart(4, '0')}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** Erster und letzter Millisekunden-Zeitpunkt des Monats in der Zeitzone. */
export function monthBounds(month, tz) {
  const start = startOfDay(`${month}-01`, tz);
  const end = startOfDay(`${addMonths(month, 1)}-01`, tz) - 1;
  return { start, end };
}

/** Tage des Monats als 'YYYY-MM-DD' (bis einschließlich lastDay, falls angegeben). */
function monthDays(month, lastDay = null) {
  const out = [];
  for (let d = `${month}-01`; d.slice(0, 7) === month; d = addDays(d, 1)) {
    out.push(d);
    if (lastDay && d >= lastDay) break;
  }
  return out;
}

const pctOf = (part, whole) => (whole ? Math.round((part / whole) * 100) : null);
const zeroMap = (table) => Object.fromEntries(Object.keys(table).map((k) => [k, 0]));

export function reportApi(ctx) {
  const { store, game } = ctx;

  /**
   * Alle Daten einer Region einmal vorbereiten: gültige Sichtungen je Katze (zeitlich sortiert),
   * Ereignisse je Katze. Wird pro Aufruf neu gebaut (der Server speichert das Ergebnis zwischen).
   */
  function prepare(region) {
    const banned = new Set(store.players.all().filter((p) => p.banned).map((p) => p.id));
    const catOk = new Map();
    const resolve = (id) => {
      if (!catOk.has(id)) {
        const rid = resolveCatId(store, id);
        const c = store.cats.get(rid);
        catOk.set(id, c && !c.removed && !c.mergedInto && c.regionId === region.id ? rid : null);
      }
      return catOk.get(id);
    };
    const obs = [];
    for (const o of store.observations.all()) {
      if (o.regionId !== region.id || o.status === 'rejected' || banned.has(o.playerId)) continue;
      const catId = resolve(o.catId);
      if (!catId) continue;
      obs.push({ id: o.id, catId, at: o.createdAt, day: o.dayKey || ctx.day(o.createdAt, region), playerId: o.playerId, district: o.district || null, a: o.analysis || {}, demo: !!o.demo });
    }
    obs.sort((x, y) => x.at - y.at);
    const byCat = new Map();
    for (const o of obs) {
      let list = byCat.get(o.catId);
      if (!list) byCat.set(o.catId, (list = []));
      list.push(o);
    }
    const obsById = new Map(obs.map((o) => [o.id, o]));
    const events = [];
    for (const e of store.events.all()) {
      const catId = resolve(e.catId);
      if (!catId || !byCat.has(catId)) continue;
      events.push({ ...e, catId, reportBanned: banned.has(e.by) });
    }
    events.sort((x, y) => x.at - y.at);
    const eventsByCat = new Map();
    for (const e of events) {
      let list = eventsByCat.get(e.catId);
      if (!list) eventsByCat.set(e.catId, (list = []));
      list.push(e);
    }
    return { obs, byCat, obsById, events, eventsByCat };
  }

  /** Hat ein Ereignis den Status wirklich geändert? (Meldungen bei adoptierten Katzen z. B. nicht.) */
  function applied(e) {
    if (!e.to) return false;
    if (e.type === 'status') return true;
    if (e.to === 'needs_help') return [undefined, null, 'active', 'missing', 'needs_help'].includes(e.from);
    return true;
  }

  /** Status einer Katze zum Zeitpunkt t (aus Statuszeit + Ereignisverlauf). */
  function statusAt(data, catId, t) {
    const cat = store.cats.get(catId);
    if (cat && cat.statusAt != null && cat.statusAt <= t) return cat.status || 'active';
    let st = null;
    for (const e of data.eventsByCat.get(catId) || []) {
      if (e.at > t) break;
      if (applied(e)) st = e.to;
    }
    return st === 'missing' ? 'active' : st || 'active';
  }

  /** Mahalle einer Katze zum Zeitpunkt t: aus der letzten Sichtung bis t (sonst der ersten). */
  function districtAt(data, catId, t) {
    const list = data.byCat.get(catId) || [];
    let d = list.length ? list[0].district : null;
    for (const o of list) {
      if (o.at > t) break;
      d = o.district;
    }
    return d;
  }

  /** Kastrationsmarke bis t: einmal gekerbt = gekerbt; sonst „keine“, wenn die Ohren zu sehen waren. */
  function earTipAt(data, catId, t) {
    let st = null;
    for (const o of data.byCat.get(catId) || []) {
      if (o.at > t) break;
      if (o.a.ear_tip === 'tipped') return 'tipped';
      if (o.a.ear_tip === 'none') st = 'none';
    }
    return st;
  }

  function computeMonth(data, region, month, { brief = false } = {}) {
    const t = ctx.now();
    const { start, end } = monthBounds(month, region.timezone);
    const today = ctx.day(t, region);
    const partial = today.slice(0, 7) === month;
    const days = monthDays(month, partial ? today : null);

    const monthObs = data.obs.filter((o) => o.at >= start && o.at <= end);
    const seen = new Map(); // catId → letzte Sichtung im Monat
    const players = new Set();
    const perDay = new Map(days.map((d) => [d, { day: d, observations: 0, newCats: 0 }]));
    let demo = false;
    for (const o of monthObs) {
      seen.set(o.catId, o);
      players.add(o.playerId);
      if (o.demo) demo = true;
      const pd = perDay.get(o.day);
      if (pd) pd.observations++;
    }
    let newCats = 0;
    for (const id of seen.keys()) {
      const first = data.byCat.get(id)[0];
      if (first.at >= start && first.at <= end) {
        newCats++;
        const pd = perDay.get(first.day);
        if (pd) pd.newCats++;
      }
    }

    // Kastration (Ohrmarke) – unter den Katzen des Monats, bei denen die Ohren zu sehen waren
    let tipped = 0;
    let earKnown = 0;
    const districts = new Map(region.districts.map((d) => [d.id, { id: d.id, name: d.name, cats: 0, observations: 0, needsHelp: 0, hungry: 0, tipped: 0, earKnown: 0 }]));
    const ear = new Map();
    for (const id of seen.keys()) {
      const e = earTipAt(data, id, end);
      ear.set(id, e);
      if (e) {
        earKnown++;
        if (e === 'tipped') tipped++;
      }
      const d = districts.get(seen.get(id).district);
      if (d) {
        d.cats++;
        if (e) {
          d.earKnown++;
          if (e === 'tipped') d.tipped++;
        }
      }
    }
    for (const o of monthObs) {
      const d = districts.get(o.district);
      if (d) d.observations++;
    }

    // Meldungen der Spieler:innen (Zustand) und Hilfe-Fälle
    const reports = zeroMap(CONDITION_TAGS);
    let reportCount = 0;
    let hungryCount = 0;
    let fedCount = 0;
    let opened = 0;
    const helpedCats = { toCare: new Set(), resolved: new Set(), adopted: new Set() };
    const helpedAny = new Set();
    const died = new Set();
    for (const e of data.events) {
      if (e.at < start) continue;
      if (e.at > end) break;
      if (Array.isArray(e.tags) && e.tags.length && !e.reportBanned) {
        reportCount++;
        for (const tag of e.tags) if (tag in reports) reports[tag]++;
        if (e.tags.includes('fed')) fedCount++;
        if (e.tags.includes('hungry') || e.tags.includes('thirsty')) {
          hungryCount++;
          const o = e.observationId ? data.obsById.get(e.observationId) : null;
          const d = districts.get(o ? o.district : districtAt(data, e.catId, e.at));
          if (d) d.hungry++;
        }
      }
      if (!applied(e)) continue;
      if (e.to === 'needs_help' && e.from !== 'needs_help') opened++;
      if (e.type === 'status' || CARE_STATUS_TYPES.has(e.type)) {
        if (HELPED_FROM.has(e.from) && HELPED_TO[e.to] && e.from !== e.to) {
          helpedCats[HELPED_TO[e.to]].add(e.catId);
          helpedAny.add(e.catId);
        }
        if (e.type === 'status' && e.to === 'deceased' && e.from !== 'deceased') died.add(e.catId);
      }
    }
    // Offen am Monatsende: alle Katzen, die es bis dahin gab und dann „braucht Hilfe“ hatten
    let stillOpen = 0;
    let inCare = 0;
    for (const [id, list] of data.byCat) {
      if (list[0].at > end) continue;
      const st = statusAt(data, id, end);
      if (st === 'needs_help') {
        stillOpen++;
        const d = districts.get(districtAt(data, id, end));
        if (d) d.needsHelp++;
      } else if (st === 'in_care') inCare++;
    }

    const totals = {
      cats: seen.size,
      newCats,
      observations: monthObs.length,
      players: players.size,
      tnrPct: pctOf(tipped, earKnown),
      tnrKnown: earKnown,
      tnrTipped: tipped,
      reports: reportCount,
      hungryReports: hungryCount,
      fedReports: fedCount,
      helpOpened: opened,
      helped: helpedAny.size,
      helpOpen: stillOpen,
      inCare,
    };
    const out = { month, hasData: monthObs.length > 0, partial, totals };
    if (brief) return out;

    // Verteilungen: jeweils der letzte Befund im Monat je Katze
    const bcs = zeroMap(BCS_CLASSES);
    const ages = zeroMap(AGE_GROUPS);
    const severity = zeroMap(SEVERITY);
    let assessed = 0;
    for (const o of seen.values()) {
      const a = o.a;
      ages[AGE_GROUPS[a.age_group] ? a.age_group : 'unknown']++;
      if (a.health_assessed === false) {
        bcs.unknown++;
        continue;
      }
      assessed++;
      bcs[BCS_CLASSES[a.body_condition] ? a.body_condition : 'unknown']++;
      if (SEVERITY[a.health_severity]) severity[a.health_severity]++;
    }

    const rows = [...districts.values()].map((d) => ({
      id: d.id,
      name: d.name,
      cats: d.cats,
      observations: d.observations,
      needsHelp: d.needsHelp,
      hungry: d.hungry,
      tnrKnown: d.earKnown,
      tnrPct: d.earKnown >= MIN_SAMPLE ? pctOf(d.tipped, d.earKnown) : null,
      coverage: d.observations === 0 ? 'none' : d.observations < LOW_DATA_PHOTOS ? 'low' : 'ok',
    }));
    const perDayList = [...perDay.values()];
    return {
      ...out,
      demo,
      throughDay: partial ? today : days[days.length - 1],
      start,
      end,
      help: {
        opened,
        helped: helpedAny.size,
        open: stillOpen,
        inCare,
        toCare: helpedCats.toCare.size,
        resolved: helpedCats.resolved.size,
        adopted: helpedCats.adopted.size,
        died: died.size,
      },
      reports,
      bcs,
      ages,
      severity,
      perDay: perDayList,
      districts: rows,
      coverage: {
        days: days.length,
        daysWithData: perDayList.filter((d) => d.observations > 0).length,
        districtsTotal: rows.length,
        districtsWithData: rows.filter((d) => d.coverage !== 'none').length,
        low: rows.filter((d) => d.coverage === 'low').map((d) => d.id),
        none: rows.filter((d) => d.coverage === 'none').map((d) => d.id),
        aiAssessedPct: pctOf(assessed, seen.size),
        earKnownPct: pctOf(earKnown, seen.size),
      },
    };
  }

  /** Monate mit Daten (neueste zuerst) – für die Monatsauswahl. */
  function monthsWithData(data) {
    const counts = new Map();
    for (const o of data.obs) {
      const m = o.day.slice(0, 7);
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    return counts;
  }

  /** Standard: letzter abgeschlossener Monat – oder der laufende, wenn es davor keine Daten gibt. */
  function pickDefault(counts, current) {
    const last = addMonths(current, -1);
    return counts.get(last) ? last : current;
  }

  function currentMonth(region) {
    return ctx.day(ctx.now(), region).slice(0, 7);
  }

  function defaultReportMonth({ regionId } = {}) {
    const region = ctx.regionOf(regionId);
    return pickDefault(monthsWithData(prepare(region)), currentMonth(region));
  }

  /**
   * Monatsbericht. month: 'YYYY-MM' (Istanbul-Zeit); leer = Standardmonat. Ungültig, zu früh oder
   * in der Zukunft → 400 invalid_month (details: {min, max}).
   */
  function report({ month, regionId } = {}) {
    const region = ctx.regionOf(regionId);
    const current = currentMonth(region);
    const given = !(month == null || month === '');
    // zuerst prüfen, dann rechnen (ungültige Anfragen kosten nichts)
    if (given && (!isMonthKey(month) || month < MIN_MONTH || month > current)) fail(400, 'invalid_month', 'Monat bitte als JJJJ-MM, nicht in der Zukunft', { min: MIN_MONTH, max: current });
    const data = prepare(region);
    const counts = monthsWithData(data);
    const m = given ? month : pickDefault(counts, current);
    const cur = computeMonth(data, region, m);
    const prevMonth = addMonths(m, -1);
    const prev = prevMonth >= MIN_MONTH ? computeMonth(data, region, prevMonth, { brief: true }) : { month: prevMonth, hasData: false, partial: false, totals: null };
    // Auswahl: vom ersten Monat mit Daten bis heute, lückenlos (neueste zuerst)
    const first = [...counts.keys()].sort()[0] || current;
    const months = [];
    for (let k = current; k >= first && k >= MIN_MONTH && months.length < 120; k = addMonths(k, -1)) months.push({ month: k, observations: counts.get(k) || 0 });
    return {
      region: { id: region.id, name: region.name, timezone: region.timezone },
      generatedAt: ctx.now(),
      ...cur,
      previous: prev,
      months,
      currentMonth: current,
      method: {
        timezone: region.timezone,
        lowDataPhotos: LOW_DATA_PHOTOS,
        minSample: MIN_SAMPLE,
        missingAfterDays: game.missingAfterDays,
      },
    };
  }

  return { report, defaultReportMonth };
}
