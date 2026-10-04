// Cat Me If You Can – Fortschritt: Tageszähler, XP/Level, Abzeichen, Tagesaufgaben, Serien.
//
// Alles wird aus den Sichtungen (observations) berechnet statt in Zählern mitgeführt. So bleiben
// Zahlen nach Moderation (Sichtung abgelehnt, Katzen zusammengeführt) automatisch richtig.

import { RARITY } from './taxonomy.js';
import { addDays, daysBetween, seededRandom, localHour } from './time.js';

/** Sichtungen, die fürs Spiel zählen. */
export function isCounted(o) {
  return o.counted === true && o.status !== 'rejected';
}

/** Katzen-ID nach Zusammenführungen auflösen. */
export function resolveCatId(store, catId) {
  let id = catId;
  for (let i = 0; i < 10; i++) {
    const c = store.cats.get(id);
    if (!c || !c.mergedInto) return id;
    id = c.mergedInto;
  }
  return id;
}

/** Verschiedene Katzen, die der Spieler am Tag gezählt gefangen hat. */
export function todaysCats(store, playerId, day) {
  const ids = new Set();
  const list = [];
  const obs = store.observations.where('playerId', playerId).filter((o) => o.dayKey === day && isCounted(o));
  obs.sort((a, b) => a.createdAt - b.createdAt);
  for (const o of obs) {
    const id = resolveCatId(store, o.catId);
    if (!ids.has(id)) {
      ids.add(id);
      list.push({ catId: id, observationId: o.id, at: o.createdAt, district: o.district });
    }
  }
  return list;
}

export function levelFor(xp, levels) {
  let lvl = 1;
  for (let i = 0; i < levels.length; i++) if (xp >= levels[i]) lvl = i + 1;
  const next = levels[lvl] ?? null;
  const cur = levels[lvl - 1] ?? 0;
  return { level: lvl, xp, current: cur, next, progress: next ? (xp - cur) / (next - cur) : 1 };
}

export function levelTitle(level, titles) {
  const idx = Math.min(titles.length - 1, Math.floor((level - 1) / 3));
  return titles[Math.max(0, idx)];
}

/** Längste Serie aufeinanderfolgender Tage und aktuelle Serie (endet heute oder gestern). */
export function streaks(days, today) {
  const sorted = [...new Set(days)].sort();
  let max = 0;
  let run = 0;
  let prev = null;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    max = Math.max(max, run);
    prev = d;
  }
  let current = 0;
  if (prev && (prev === today || prev === addDays(today, -1))) {
    current = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (daysBetween(sorted[i], sorted[i + 1]) === 1) current++;
      else break;
    }
  }
  return { max, current };
}

/** Kennzahlen eines Spielers – Grundlage für Abzeichen und Profil. */
export function playerMetrics(store, playerId, { tz, today, dailyGoal }) {
  const obs = store.observations.where('playerId', playerId).filter(isCounted);
  const cats = new Set();
  const districts = new Set();
  const patterns = new Set();
  const days = [];
  const perDay = new Map();
  let discoveries = 0, nightCatches = 0, earlyCatches = 0, healthReports = 0, rareCatches = 0, legendaryCatches = 0;
  for (const o of obs) {
    const catId = resolveCatId(store, o.catId);
    cats.add(catId);
    if (o.district) districts.add(o.district);
    if (o.analysis && o.analysis.pattern && o.analysis.pattern !== 'diger') patterns.add(o.analysis.pattern);
    if (o.isDiscovery) discoveries++;
    const h = localHour(o.createdAt, tz);
    if (h >= 22 || h < 5) nightCatches++;
    if (h >= 5 && h < 8) earlyCatches++;
    if (o.analysis && ['attention', 'urgent'].includes(o.analysis.health_severity)) healthReports++;
    const cat = store.cats.get(catId);
    const rarity = (cat && cat.rarity) || o.rarity;
    if (rarity && RARITY[rarity] && RARITY[rarity].stars >= 3) rareCatches++;
    if (rarity === 'legendary') legendaryCatches++;
    days.push(o.dayKey);
    let set = perDay.get(o.dayKey);
    if (!set) perDay.set(o.dayKey, (set = new Set()));
    set.add(catId);
  }
  let goalDays = 0;
  for (const set of perDay.values()) if (set.size >= dailyGoal) goalDays++;
  const st = streaks(days, today);
  const helpEvents = store.events.where('by', playerId).filter((e) => e.type === 'help_report').length;
  return {
    catches: obs.length,
    uniqueCats: cats.size,
    discoveries,
    districts: districts.size,
    patterns: patterns.size,
    nightCatches,
    earlyCatches,
    healthReports: healthReports + helpEvents,
    rareCatches,
    legendaryCatches,
    goalDays,
    activeDays: perDay.size,
    maxStreak: st.max,
    currentStreak: st.current,
  };
}

export function earnedBadges(metrics, badges) {
  return badges.filter((b) => (metrics[b.metric] || 0) >= b.gte).map((b) => b.id);
}

/** Tagesaufgaben – für alle Spieler einer Region am selben Tag gleich. */
export function questsFor(day, region, game) {
  const rnd = seededRandom(`${region.id}:${day}`);
  const pool = game.quests.pool.map((q, i) => ({ ...q, i }));
  const picked = [];
  const usedKinds = new Set();
  let guard = 0;
  while (picked.length < game.quests.perDay && pool.length && guard++ < 100) {
    const idx = Math.floor(rnd() * pool.length);
    const q = pool.splice(idx, 1)[0];
    if (usedKinds.has(q.kind) && pool.some((p) => !usedKinds.has(p.kind))) continue;
    usedKinds.add(q.kind);
    const quest = { id: `${day}:${q.i}`, kind: q.kind, n: q.n, xp: game.quests.xp };
    if (q.pattern) quest.pattern = q.pattern;
    if (q.kind === 'district') {
      const d = region.districts[Math.floor(rnd() * region.districts.length)];
      quest.district = d.id;
    }
    picked.push(quest);
  }
  return picked;
}

/** Fortschritt einer Aufgabe anhand der heutigen gezählten Sichtungen. */
export function questProgress(quest, todaysObs, tz) {
  const distinct = (list) => new Set(list.map((o) => o.catId)).size;
  let value = 0;
  switch (quest.kind) {
    case 'count':
      value = distinct(todaysObs);
      break;
    case 'pattern':
      value = distinct(todaysObs.filter((o) => o.analysis && o.analysis.pattern === quest.pattern));
      break;
    case 'district':
      value = distinct(todaysObs.filter((o) => o.district === quest.district));
      break;
    case 'districts':
      value = new Set(todaysObs.map((o) => o.district).filter(Boolean)).size;
      break;
    case 'new':
      value = todaysObs.filter((o) => o.isDiscovery).length;
      break;
    case 'early':
      value = distinct(todaysObs.filter((o) => localHour(o.createdAt, tz) < 9));
      break;
    case 'evening':
      value = distinct(todaysObs.filter((o) => localHour(o.createdAt, tz) >= 19));
      break;
    default:
      value = 0;
  }
  return { value: Math.min(value, quest.n), done: value >= quest.n };
}
