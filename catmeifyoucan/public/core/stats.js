// Cat Me If You Can – Statistik für die öffentliche Seite (Zensus der Straßenkatzen) und Bestenlisten.

import { effectiveStatus } from './cats.js';
import { addDays, localHour } from './time.js';
import { PATTERNS, AGE_GROUPS, SEVERITY, HEALTH_FLAGS, BCS_CLASSES, CAT_STATUS, CONDITION_TAGS } from './taxonomy.js';

const zeroMap = (table) => Object.fromEntries(Object.keys(table).map((k) => [k, 0]));

export function computeStats(ctx, { regionId, days = 30 } = {}) {
  const { store, game } = ctx;
  const region = ctx.regionOf(regionId);
  const tz = region.timezone;
  const t = ctx.now();
  const today = ctx.day(t, region);
  const cats = store.cats.all().filter((c) => !c.mergedInto && !c.removed && c.regionId === region.id);
  const obs = store.observations.all().filter((o) => o.status !== 'rejected' && o.regionId === region.id);

  const status = zeroMap(CAT_STATUS);
  const patterns = zeroMap(PATTERNS);
  const ages = zeroMap(AGE_GROUPS);
  const severity = zeroMap(SEVERITY);
  const bcs = zeroMap(BCS_CLASSES);
  const flags = zeroMap(HEALTH_FLAGS);
  let tipped = 0, earKnown = 0, bcsSum = 0, bcsN = 0, seen7 = 0, seen30 = 0, new7 = 0;
  const byDistrict = new Map(region.districts.map((d) => [d.id, { id: d.id, name: d.name, cats: 0, observations: 0, needsHelp: 0, tipped: 0, earKnown: 0, bcsSum: 0, bcsN: 0 }]));

  for (const c of cats) {
    const st = effectiveStatus(c, t, game);
    status[st] = (status[st] || 0) + 1;
    const p = c.profile || {};
    const l = c.latest || {};
    if (p.pattern) patterns[p.pattern] = (patterns[p.pattern] || 0) + 1;
    ages[l.age_group || 'unknown'] = (ages[l.age_group || 'unknown'] || 0) + 1;
    if (!['adopted', 'deceased'].includes(st) && l.health_assessed !== false) {
      severity[l.health_severity || 'none'] += 1;
      bcs[l.body_condition || 'unknown'] = (bcs[l.body_condition || 'unknown'] || 0) + 1;
      for (const f of l.health_flags || []) flags[f] = (flags[f] || 0) + 1;
    }
    if (p.ear_tip === 'tipped' || p.ear_tip === 'none') {
      earKnown++;
      if (p.ear_tip === 'tipped') tipped++;
    }
    if (Number.isFinite(l.body_condition_score)) {
      bcsSum += l.body_condition_score;
      bcsN++;
    }
    if (c.lastSeenAt && t - c.lastSeenAt <= 7 * 86400000) seen7++;
    if (c.lastSeenAt && t - c.lastSeenAt <= 30 * 86400000) seen30++;
    if ((c.firstSeenAt || c.createdAt) && t - (c.firstSeenAt || c.createdAt) <= 7 * 86400000) new7++;
    const d = byDistrict.get(c.district);
    if (d) {
      d.cats++;
      if (st === 'needs_help') d.needsHelp++;
      if (p.ear_tip === 'tipped' || p.ear_tip === 'none') {
        d.earKnown++;
        if (p.ear_tip === 'tipped') d.tipped++;
      }
      if (Number.isFinite(l.body_condition_score)) {
        d.bcsSum += l.body_condition_score;
        d.bcsN++;
      }
    }
  }

  const dayKeys = [];
  for (let i = days - 1; i >= 0; i--) dayKeys.push(addDays(today, -i));
  const perDay = new Map(dayKeys.map((k) => [k, { day: k, observations: 0, newCats: 0, players: new Set() }]));
  const hours = new Array(24).fill(0);
  const activeToday = new Set();
  for (const o of obs) {
    const d = byDistrict.get(o.district);
    if (d) d.observations++;
    const pd = perDay.get(o.dayKey);
    if (pd) {
      pd.observations++;
      if (o.isDiscovery) pd.newCats++;
      pd.players.add(o.playerId);
    }
    if (o.dayKey === today) activeToday.add(o.playerId);
    if (t - o.createdAt <= days * 86400000) hours[localHour(o.createdAt, tz)]++;
  }

  // Von Spieler:innen gemeldete Zustände (Fang-Meldungen + Meldungen vom Katzenprofil)
  const reports = zeroMap(CONDITION_TAGS);
  const catIds = new Set(cats.map((c) => c.id));
  let reports30 = 0, fed30 = 0, hungry7 = 0;
  for (const e of store.events.all()) {
    if (!Array.isArray(e.tags) || !e.tags.length || !catIds.has(e.catId) || t - e.at > days * 86400000) continue;
    reports30++;
    for (const tag of e.tags) if (tag in reports) reports[tag]++;
    if (e.tags.includes('fed')) fed30++;
    if ((e.tags.includes('hungry') || e.tags.includes('thirsty')) && t - e.at <= 7 * 86400000) hungry7++;
  }

  const vouchers = store.vouchers.all().filter((v) => v.regionId === region.id);
  return {
    region: { id: region.id, name: region.name },
    generatedAt: t,
    totals: {
      cats: cats.length,
      observations: obs.length,
      players: new Set(obs.map((o) => o.playerId)).size,
      activePlayersToday: activeToday.size,
      seen7d: seen7,
      seen30d: seen30,
      newCats7d: new7,
      needsHelp: status.needs_help || 0,
      inCare: status.in_care || 0,
      adopted: status.adopted || 0,
      missing: status.missing || 0,
      tnrPct: earKnown ? Math.round((tipped / earKnown) * 100) : null,
      tnrKnown: earKnown,
      avgBcs: bcsN ? Math.round((bcsSum / bcsN) * 10) / 10 : null,
      reports30d: reports30,
      fed30d: fed30,
      hungry7d: hungry7,
      vouchersRedeemed: vouchers.filter((v) => v.redeemedAt).length,
      vouchersIssued: vouchers.length,
    },
    status,
    patterns,
    ages,
    severity,
    bcs,
    healthFlags: flags,
    reports,
    perDay: [...perDay.values()].map((d) => ({ day: d.day, observations: d.observations, newCats: d.newCats, players: d.players.size })),
    hours,
    districts: [...byDistrict.values()].map((d) => ({
      id: d.id,
      name: d.name,
      cats: d.cats,
      observations: d.observations,
      needsHelp: d.needsHelp,
      tnrPct: d.earKnown ? Math.round((d.tipped / d.earKnown) * 100) : null,
      avgBcs: d.bcsN ? Math.round((d.bcsSum / d.bcsN) * 10) / 10 : null,
    })),
  };
}

/**
 * Bestenliste im Zeitraum (day | week | all) nach
 *   xp          – Erfahrungspunkte
 *   discoveries – Erstfunde (wer eine neue Katze als Erste:r gefunden hat, durfte sie benennen)
 *   cats        – verschiedene gefangene Katzen
 */
export function leaderboard(ctx, { period = 'week', regionId, limit = 20, metric = 'xp' } = {}) {
  const { store } = ctx;
  const region = ctx.regionOf(regionId);
  const t = ctx.now();
  const today = ctx.day(t, region);
  const from = period === 'day' ? today : period === 'week' ? addDays(today, -6) : null;
  const sums = new Map();
  if (metric === 'xp') {
    for (const x of store.xp.all()) {
      if (x.regionId && x.regionId !== region.id) continue;
      if (from && x.dayKey < from) continue;
      sums.set(x.playerId, (sums.get(x.playerId) || 0) + x.amount);
    }
  } else {
    const sets = new Map();
    for (const o of store.observations.all()) {
      if (o.regionId !== region.id || o.status === 'rejected' || !o.counted) continue;
      if (from && o.dayKey < from) continue;
      if (metric === 'discoveries') {
        if (o.isDiscovery) sums.set(o.playerId, (sums.get(o.playerId) || 0) + 1);
      } else {
        let set = sets.get(o.playerId);
        if (!set) sets.set(o.playerId, (set = new Set()));
        set.add(o.catId);
      }
    }
    for (const [pid, set] of sets) sums.set(pid, set.size);
  }
  const rows = [];
  for (const [pid, value] of sums) {
    const p = store.players.get(pid);
    if (!p || p.banned || value <= 0) continue;
    rows.push({ playerId: pid, nickname: p.nickname, value, xp: metric === 'xp' ? value : undefined });
  }
  rows.sort((a, b) => b.value - a.value || a.nickname.localeCompare(b.nickname, 'tr'));
  return { period, metric: ['xp', 'discoveries', 'cats'].includes(metric) ? metric : 'xp', from, items: rows.slice(0, Math.max(1, Math.min(100, limit))).map((r, i) => ({ rank: i + 1, ...r })) };
}
