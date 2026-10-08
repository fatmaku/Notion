// Cat Me If You Can – Spiel-Engine. Läuft identisch auf dem Server und im Browser (Demo-Modus).
//
// Abhängigkeiten werden hineingereicht, die Engine selbst kennt weder HTTP noch Dateien noch KI:
//   store     – core/store.js (MemoryStore)
//   analyzer  – {analyze({images, fingerprint, detector, lang, region, district}) → Analyse}
//   verifier  – optional {compare({images, candidates}) → {matchId|null, confidence}} (KI-Vergleich)
//   moderator – optional {check(text, kind) → {ok, reason}} (KI-Namensprüfung, jede Sprache)
//   photos    – {save(images) → {photoId, photoUrl}, remove(photoId)}
//   now, randomBytes – für Tests deterministisch ersetzbar
//
// Ablauf eines Fangs: Vorprüfungen (Region, Abklingzeit, Duplikatfoto, Plausibilität) → Foto
// speichern → Analyse → Wiedererkennung → Katze anlegen/aktualisieren → Sichtung → XP,
// Tagesziel, Aufgaben, Abzeichen.

import { REGIONS } from '../config/regions.js';
import { GAME } from '../config/game.js';
import { findRegion, findDistrict, haversine, isValidLatLon } from './geo.js';
import { dayKey } from './time.js';
import { sanitizeFingerprint, hammingHex } from './fingerprint.js';
import { findCandidates, decide } from './reid.js';
import { rarityOf, fallbackSummary } from './analysis.js';
import { RARITY, LANGS } from './taxonomy.js';
import {
  isCounted, todaysCats, levelFor, levelTitle, playerMetrics, earnedBadges, questsFor, questProgress, resolveCatId,
} from './progress.js';
import { recomputeCat, publicCat, publicObservation, latestFrom, districtName } from './cats.js';
import { GameError, fail, makeIdFactory, makeCode, cleanName, cleanText } from './util.js';
import { checkName } from './moderation.js';
import { censusApi } from './census.js';
import { voucherApi } from './vouchers.js';
import { adminApi } from './admin.js';
// ── Erweiterung: share ──
import { shareApi } from './share.js';

// ── Erweiterung: cafe ──
import { cafeApi } from './cafe.js';

// ── Erweiterung: routes ──
import { routesApi } from './routes.js';

// ── Erweiterung: impact ──
import { impactApi } from './impact.js';

// ── Erweiterung: report ──
import { reportApi } from './report.js';

// ── Erweiterung: perf ──
import { computeStats, leaderboard } from './stats.js';

export { GameError };

export function createEngine(opts) {
  const {
    store,
    regions = REGIONS,
    game = GAME,
    analyzer,
    verifier = null,
    moderator = null,
    photos,
    now = () => Date.now(),
    randomBytes,
    log = () => {},
  } = opts;
  if (!store || !analyzer || !photos) throw new Error('createEngine: store, analyzer und photos sind Pflicht');

  const ctx = {
    store,
    regions,
    game,
    analyzer,
    verifier,
    photos,
    now,
    log,
    newId: makeIdFactory(randomBytes, now),
    newCode: () => makeCode(randomBytes),
    regionOf: (id) => regions.find((r) => r.id === id) || regions[0],
    day: (t, region) => dayKey(t, (region || regions[0]).timezone),
  };
  const inflight = new Set();
  // Jeder analysierte Versuch (auch „keine Katze“) startet die Abklingzeit – jede Analyse kostet.
  const attempts = new Map(); // playerId → {day, count, last}

  /** Namensprüfung: lokale Wortliste immer, KI zusätzlich (wenn vorhanden). */
  async function assertCleanName(name, kind) {
    const local = checkName(name, { kind });
    if (!local.ok) fail(400, local.reason === 'reserved' ? 'name_reserved' : 'name_not_allowed', 'Dieser Name ist nicht erlaubt');
    if (!moderator) return;
    let res;
    try {
      res = await moderator.check(name, kind);
    } catch (e) {
      log('moderator failed:', e && e.message);
      return;
    }
    if (res && res.ok === false) fail(400, 'name_not_allowed', 'Dieser Name ist nicht erlaubt');
  }
  ctx.assertCleanName = assertCleanName;

  // ---------------------------------------------------------------- Spieler

  function publicPlayer(p) {
    if (!p) return null;
    const lvl = levelFor(p.xp || 0, game.levels);
    return {
      id: p.id,
      nickname: p.nickname,
      lang: p.lang,
      role: p.role,
      xp: p.xp || 0,
      level: lvl.level,
      levelInfo: lvl,
      title: levelTitle(lvl.level, game.levelTitles),
      badges: p.badges || [],
      createdAt: p.createdAt,
    };
  }

  async function createPlayer({ nickname, lang, tokenHash }) {
    const nick = cleanName(nickname, { min: 2, max: 20 });
    if (!nick) fail(400, 'invalid_nickname', 'Spitzname: 2–20 Zeichen, Buchstaben/Ziffern');
    if (typeof tokenHash !== 'string' || tokenHash.length < 16) fail(500, 'token_hash_missing');
    const lower = nick.toLocaleLowerCase('tr');
    if (store.players.all().some((p) => p.nickname.toLocaleLowerCase('tr') === lower)) fail(409, 'nickname_taken', 'Spitzname vergeben');
    await assertCleanName(nick, 'player');
    if (store.players.all().some((p) => p.nickname.toLocaleLowerCase('tr') === lower)) fail(409, 'nickname_taken', 'Spitzname vergeben');
    const p = {
      id: ctx.newId('p'),
      nickname: nick,
      lang: LANGS.includes(lang) ? lang : 'tr',
      role: 'player',
      tokenHash,
      xp: 0,
      badges: [],
      badgeDates: {},
      questsDone: {},
      banned: false,
      createdAt: now(),
    };
    store.players.insert(p);
    return p;
  }

  function playerByTokenHash(hash) {
    if (!hash) return null;
    const p = store.players.where('tokenHash', hash)[0] || null;
    return p;
  }

  async function updatePlayer(player, { nickname, lang }) {
    if (player.banned) fail(403, 'banned', 'Konto gesperrt');
    const patch = {};
    if (nickname !== undefined) {
      const nick = cleanName(nickname, { min: 2, max: 20 });
      if (!nick) fail(400, 'invalid_nickname');
      const lower = nick.toLocaleLowerCase('tr');
      if (store.players.all().some((p) => p.id !== player.id && p.nickname.toLocaleLowerCase('tr') === lower)) fail(409, 'nickname_taken');
      await assertCleanName(nick, 'player');
      if (store.players.all().some((p) => p.id !== player.id && p.nickname.toLocaleLowerCase('tr') === lower)) fail(409, 'nickname_taken');
      patch.nickname = nick;
    }
    if (lang !== undefined) {
      if (!LANGS.includes(lang)) fail(400, 'invalid_lang');
      patch.lang = lang;
    }
    return publicPlayer(store.players.update(player.id, patch));
  }

  function addXp(player, amount, reason, refs = {}) {
    if (!amount) return null;
    const t = now();
    const region = ctx.regionOf(refs.regionId);
    const entry = { id: ctx.newId('x'), playerId: player.id, amount: Math.round(amount), reason, at: t, dayKey: ctx.day(t, region), regionId: region.id, ...refs };
    store.xp.insert(entry);
    store.players.update(player.id, { xp: (store.players.get(player.id).xp || 0) + entry.amount });
    return entry;
  }

  function homeRegion(player) {
    const mine = store.observations.where('playerId', player.id);
    let last = null;
    for (const o of mine) if (!last || o.createdAt > last.createdAt) last = o;
    return ctx.regionOf(last ? last.regionId : regions[0].id);
  }

  // ---------------------------------------------------------------- Fangen

  async function catchCat(player, input) {
    if (!player || player.banned) fail(403, 'banned', 'Konto gesperrt');
    if (inflight.has(player.id)) fail(429, 'busy', 'Ein Fang läuft noch');
    inflight.add(player.id);
    try {
      return await doCatch(player, input || {});
    } finally {
      inflight.delete(player.id);
    }
  }

  async function doCatch(player, input) {
    const t = now();
    const lat = Number(input.lat);
    const lon = Number(input.lon);
    if (!isValidLatLon(lat, lon)) fail(400, 'invalid_location', 'Standort fehlt');
    const region = findRegion(regions, lat, lon);
    if (!region) fail(422, 'outside_region', 'Außerhalb des Spielgebiets', { regions: regions.map((r) => r.name) });
    const day = ctx.day(t, region);
    const lang = LANGS.includes(input.lang) ? input.lang : player.lang || 'tr';

    const mine = store.observations.where('playerId', player.id).filter((o) => o.status !== 'rejected');
    let att = attempts.get(player.id);
    if (!att || att.day !== day) att = { day, count: 0, last: 0 };
    if (mine.filter((o) => o.dayKey === day).length >= game.maxCatchesPerDay || att.count >= game.maxCatchesPerDay * 2) fail(429, 'daily_limit', 'Tageslimit erreicht');
    let last = null;
    for (const o of mine) if (!last || o.createdAt > last.createdAt) last = o;
    const lastTry = Math.max(last ? last.createdAt : 0, att.last);
    if (lastTry && t - lastTry < game.catchCooldownSec * 1000) {
      const retryAfter = Math.ceil((game.catchCooldownSec * 1000 - (t - lastTry)) / 1000);
      fail(429, 'cooldown', 'Kurz warten', { retryAfter });
    }

    const fingerprint = sanitizeFingerprint(input.fingerprint) || { colors: null, hash: null };
    if (fingerprint.hash) {
      const since = t - 48 * 3600000;
      const dup = store.observations.all().find(
        (o) => o.fingerprint && o.fingerprint.hash && (o.playerId === player.id || o.createdAt >= since) &&
          hammingHex(o.fingerprint.hash, fingerprint.hash) <= game.duplicateHashBits,
      );
      if (dup) fail(409, 'duplicate_photo', 'Dieses Foto wurde schon verwendet');
    }

    const source = input.source === 'gallery' ? 'gallery' : 'camera';
    const flags = [];
    const capturedAt = Number(input.capturedAt) || t;
    if (source === 'camera' && Math.abs(t - capturedAt) > game.maxPhotoAgeSec * 1000) flags.push('stale_photo');
    const accuracy = Number(input.accuracy);
    if (!Number.isFinite(accuracy) || accuracy > game.maxGpsAccuracyM) flags.push('gps_inaccurate');
    if (last && last.dayKey === day) {
      const distM = haversine(last.lat, last.lon, lat, lon);
      const hours = Math.max((t - last.createdAt) / 3600000, 1 / 3600);
      if (distM > 300 && distM / 1000 / hours > game.maxSpeedKmh) flags.push('impossible_travel');
    }
    if (source === 'gallery') flags.push('gallery');

    const detector = input.detector && typeof input.detector === 'object' ? {
      score: Number.isFinite(Number(input.detector.score)) ? Math.max(0, Math.min(1, Number(input.detector.score))) : null,
      box: input.detector.box || null,
    } : null;

    const district = findDistrict(region, lat, lon);
    const saved = await photos.save(input.images || {});
    attempts.set(player.id, { day, count: att.count + 1, last: t });
    let analysis;
    try {
      analysis = await analyzer.analyze({ images: input.images || {}, fingerprint, detector, lang, region, district });
    } catch (e) {
      await photos.remove(saved.photoId);
      throw e;
    }
    if (!analysis.is_cat) {
      await photos.remove(saved.photoId);
      fail(422, 'no_cat', 'Auf dem Foto ist keine Katze zu erkennen', { summary: analysis.summary });
    }
    if (!analysis.is_live_photo) {
      await photos.remove(saved.photoId);
      fail(422, 'not_live_photo', 'Bitte eine echte Katze fotografieren, keinen Bildschirm/Ausdruck');
    }
    if (analysis.ownership === 'owned') {
      // Nur Straßenkatzen zählen – Hauskatzen (Halsband, Wohnung, Leine …) werden nicht erfasst.
      await photos.remove(saved.photoId);
      fail(422, 'pet_cat', 'Das sieht nach einer Hauskatze aus – hier zählen nur Straßenkatzen', { reason: analysis.ownership_reason });
    }
    for (const l of LANGS) if (!analysis.summary[l]) analysis.summary[l] = fallbackSummary(analysis, district && district.name, l);
    // KI ausgefallen → einfache Analyse hat übernommen: erfassen ja, fürs Spiel zählen nein
    // (sonst ließe sich mit kaputten Bildern, die die KI ablehnt, das Tagesziel erschummeln).
    if (analysis.aiError) flags.push('ai_unavailable');
    const counted = source === 'camera' && !flags.length;

    // ---- Wiedererkennung
    const regionCats = store.cats.all().filter((c) => c.regionId === region.id && !c.removed);
    const obsLike = { lat, lon, at: t, fingerprint, analysis };
    const candidates = findCandidates(regionCats, obsLike, game.reid);
    let decision = decide(candidates, game.reid, { hasVerifier: !!verifier });
    let matchMethod = decision.action === 'link' ? 'auto' : null;
    if (decision.action === 'verify') {
      try {
        const res = await verifier.compare({
          images: input.images || {},
          candidates: candidates.map((c) => ({ id: c.cat.id, photoId: c.cat.photoId, profile: c.cat.profile, score: c.score })),
        });
        const hit = res && res.matchId ? candidates.find((c) => c.cat.id === res.matchId) : null;
        decision = hit ? { action: 'link', candidate: hit } : { action: 'new' };
        matchMethod = 'ai';
      } catch (e) {
        log('verifier failed:', e && e.message);
        decision = decide(candidates, game.reid, { hasVerifier: false });
        matchMethod = decision.action === 'link' ? 'auto' : null;
      }
    }

    // ---- Katze anlegen oder verknüpfen
    let cat;
    let isNew = false;
    if (decision.action === 'link') {
      cat = decision.candidate.cat;
    } else {
      isNew = true;
      cat = {
        id: ctx.newId('c'),
        regionId: region.id,
        district: district ? district.id : null,
        name: null,
        namedBy: null,
        title: null,
        legendary: false,
        discoveredBy: player.id,
        discoveredAt: t,
        createdAt: t,
        lastSeenAt: t,
        lastLat: lat,
        lastLon: lon,
        profile: {},
        latest: latestFrom(analysis, t),
        fingerprint: { colors: fingerprint.colors },
        photoId: saved.photoId,
        photoUrl: saved.photoUrl,
        status: 'active',
        rarity: rarityOf(analysis),
        observationCount: 0,
        catcherIds: [],
        needsReview: !!decision.needsReview,
        possibleDuplicates: decision.needsReview ? candidates.map((c) => c.cat.id) : [],
      };
      store.cats.insert(cat);
    }
    if (decision.action === 'link' && decision.needsReview) {
      store.cats.update(cat.id, { needsReview: true, possibleDuplicates: candidates.slice(1).map((c) => c.cat.id) });
    }

    // ---- Vorher-Zustand für XP/Tagesziel
    const before = todaysCats(store, player.id, day);
    const caughtBefore = mine.some((o) => isCounted(o) && resolveCatId(store, o.catId) === cat.id);
    const caughtToday = before.some((x) => x.catId === cat.id);
    const healthAlready = mine.some(
      (o) => o.dayKey === day && resolveCatId(store, o.catId) === cat.id && ['attention', 'urgent'].includes(o.analysis && o.analysis.health_severity),
    );

    const obs = {
      id: ctx.newId('o'),
      playerId: player.id,
      catId: cat.id,
      regionId: region.id,
      district: district ? district.id : null,
      dayKey: day,
      createdAt: t,
      capturedAt,
      lat,
      lon,
      accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
      source,
      counted,
      flags,
      status: 'ok',
      photoId: saved.photoId,
      photoUrl: saved.photoUrl,
      analysis,
      fingerprint,
      detector,
      match: {
        method: isNew ? null : matchMethod,
        score: candidates[0] ? candidates[0].score : null,
        candidates: candidates.map((c) => ({ catId: c.cat.id, score: c.score, dist: c.dist })),
      },
      isDiscovery: isNew,
      rarity: null,
      xp: 0,
    };
    store.observations.insert(obs);
    cat = recomputeCat(ctx, cat.id);
    store.observations.update(obs.id, { rarity: cat.rarity });

    // ---- Status: Gesundheitsbefund → „braucht Hilfe“
    if (['attention', 'urgent'].includes(analysis.health_severity) && ['active', undefined].includes(cat.status)) {
      store.cats.update(cat.id, { status: 'needs_help', statusAt: t, statusBy: player.id });
      store.events.insert({ id: ctx.newId('e'), catId: cat.id, type: 'auto_flag', by: player.id, at: t, from: 'active', to: 'needs_help', note: analysis.health_notes || '' });
    } else if (cat.status === 'active' || cat.status === 'needs_help' || cat.status === 'in_care') {
      // nichts – Hilfe-Status setzen/aufheben Freiwillige
    } else if (cat.status === 'adopted' || cat.status === 'deceased') {
      store.observations.update(obs.id, { flags: [...flags, 'status_conflict'] });
    }

    // ---- XP
    const xpStart = store.players.get(player.id).xp || 0;
    const xpItems = [];
    const mult = (RARITY[cat.rarity] || RARITY.common).mult;
    if (counted) {
      if (isNew) xpItems.push(['discovery', game.xp.discovery * mult]);
      else if (!caughtBefore) xpItems.push(['first_catch', game.xp.firstCatch * mult]);
      else if (!caughtToday) xpItems.push(['daily_catch', game.xp.dailyCatch * mult]);
      else xpItems.push(['resighting', game.xp.resighting]);
      if (['attention', 'urgent'].includes(analysis.health_severity) && !healthAlready) xpItems.push(['health_report', game.xp.healthReport]);
    }
    let gained = 0;
    for (const [reason, amount] of xpItems) {
      const e = addXp(player, amount, reason, { observationId: obs.id, catId: cat.id, regionId: region.id });
      if (e) gained += e.amount;
    }
    store.observations.update(obs.id, { xp: gained });

    const after = todaysCats(store, player.id, day);
    const goal = game.dailyGoal;
    let goalReached = false;
    const goalPaid = store.xp.where('playerId', player.id).some((x) => x.reason === 'daily_goal' && x.dayKey === day);
    if (before.length < goal && after.length >= goal && !goalPaid) {
      goalReached = true;
      const e = addXp(player, game.xp.dailyGoal, 'daily_goal', { regionId: region.id });
      gained += e.amount;
      xpItems.push(['daily_goal', e.amount]);
    }

    // ---- Tagesaufgaben
    const questsCompleted = [];
    const fresh = store.players.get(player.id);
    const done = new Set((fresh.questsDone && fresh.questsDone[day]) || []);
    const todayObs = todayCountedObs(player.id, day);
    for (const q of questsFor(day, region, game)) {
      if (done.has(q.id)) continue;
      if (questProgress(q, todayObs, region.timezone).done) {
        done.add(q.id);
        const e = addXp(player, q.xp, 'quest', { questId: q.id, regionId: region.id });
        gained += e.amount;
        questsCompleted.push(describeQuest(q, region));
      }
    }
    if (questsCompleted.length) {
      // nur den heutigen Tag behalten – alte Einträge sind für nichts mehr nötig
      store.players.update(player.id, { questsDone: { [day]: [...done] } });
    }

    // ---- Abzeichen und Level
    const levelBefore = levelFor(xpStart, game.levels).level;
    const newBadges = refreshBadges(player.id, region);
    const p2 = store.players.get(player.id);
    const lvl = levelFor(p2.xp, game.levels);

    return {
      observation: publicObservation(ctx, store.observations.get(obs.id), { precise: true }),
      cat: publicCat(ctx, cat, { precise: true }),
      analysis,
      isNew,
      match: { method: obs.match.method, score: obs.match.score },
      counted,
      flags,
      xp: { gained, items: xpItems.map(([reason, amount]) => ({ reason, amount: Math.round(amount) })), total: p2.xp },
      level: { ...lvl, up: lvl.level > levelBefore, title: levelTitle(lvl.level, game.levelTitles) },
      today: { day, count: after.length, goal, reached: after.length >= goal, justReached: goalReached },
      questsCompleted,
      newBadges: newBadges.map((id) => game.badges.find((b) => b.id === id)),
      canName: isNew,
    };
  }

  function todayCountedObs(playerId, day) {
    return store.observations
      .where('playerId', playerId)
      .filter((o) => o.dayKey === day && isCounted(o))
      .map((o) => ({ ...o, catId: resolveCatId(store, o.catId) }));
  }

  function describeQuest(q, region) {
    return { ...q, districtName: q.district ? districtName(region, q.district) : null };
  }

  function refreshBadges(playerId, region) {
    const p = store.players.get(playerId);
    const today = ctx.day(now(), region);
    const metrics = playerMetrics(store, playerId, { tz: region.timezone, today, dailyGoal: game.dailyGoal });
    const earned = earnedBadges(metrics, game.badges);
    const had = new Set(p.badges || []);
    const fresh = earned.filter((id) => !had.has(id));
    if (fresh.length) {
      const dates = { ...(p.badgeDates || {}) };
      for (const id of fresh) dates[id] = now();
      store.players.update(playerId, { badges: [...had, ...fresh], badgeDates: dates });
    }
    return fresh;
  }

  // ---------------------------------------------------------------- Katze benennen / Einspruch

  async function nameCat(player, catId, name) {
    if (!player || player.banned) fail(403, 'banned', 'Konto gesperrt');
    const cat = store.cats.get(resolveCatId(store, catId));
    if (!cat || cat.removed) fail(404, 'cat_not_found');
    const clean = cleanName(name, { min: 2, max: 20 });
    if (!clean) fail(400, 'invalid_name', 'Name: 2–20 Zeichen');
    const isAdmin = player.role === 'admin';
    if (cat.name && !isAdmin) fail(409, 'already_named', 'Diese Katze hat schon einen Namen');
    const t = now();
    const discoverer = cat.discoveredBy === player.id;
    const openToAll = t - (cat.discoveredAt || 0) > 24 * 3600000 && (cat.catcherIds || []).includes(player.id);
    if (!isAdmin && !discoverer && !openToAll) fail(403, 'not_allowed', 'Nur wer die Katze entdeckt hat, darf sie (in den ersten 24 h) benennen');
    await assertCleanName(clean, 'cat');
    if (store.cats.get(cat.id).name && !isAdmin) fail(409, 'already_named', 'Diese Katze hat schon einen Namen');
    store.cats.update(cat.id, { name: clean, namedBy: player.id });
    store.events.insert({ id: ctx.newId('e'), catId: cat.id, type: 'named', by: player.id, at: t, note: clean });
    return publicCat(ctx, store.cats.get(cat.id));
  }

  function dispute(player, observationId, reason) {
    if (!player || player.banned) fail(403, 'banned', 'Konto gesperrt');
    const o = store.observations.get(observationId);
    if (!o || o.playerId !== player.id) fail(404, 'observation_not_found');
    if (store.disputes.where('observationId', o.id).some((d) => !d.resolved)) fail(409, 'already_disputed');
    const d = { id: ctx.newId('d'), observationId: o.id, playerId: player.id, catId: o.catId, reason: cleanText(reason, 300) || 'not_this_cat', createdAt: now(), resolved: false };
    store.disputes.insert(d);
    store.observations.update(o.id, { disputed: true });
    return d;
  }

  // ---------------------------------------------------------------- Heute / Profil / Sammlung

  function today(player) {
    const region = homeRegion(player);
    const t = now();
    const day = ctx.day(t, region);
    const cats = todaysCats(store, player.id, day);
    const obs = todayCountedObs(player.id, day);
    const done = new Set((player.questsDone && player.questsDone[day]) || []);
    const quests = questsFor(day, region, game).map((q) => ({ ...describeQuest(q, region), ...questProgress(q, obs, region.timezone), claimed: done.has(q.id) }));
    const partners = store.places.where('type', 'partner').filter((p) => p.active && p.status === 'approved' && p.regionId === region.id);
    const minCats = partners.length ? Math.min(...partners.map((p) => (p.reward && p.reward.minCats) || game.dailyGoal)) : game.dailyGoal;
    const voucher = store.vouchers.where('playerId', player.id).find((v) => v.dayKey === day) || null;
    return {
      day,
      region: { id: region.id, name: region.name },
      goal: game.dailyGoal,
      minCatsForVoucher: minCats,
      count: cats.length,
      reached: cats.length >= game.dailyGoal,
      cats: cats.map((c) => {
        const cat = store.cats.get(c.catId);
        return { ...c, name: cat && cat.name, pattern: cat && cat.profile && cat.profile.pattern, photoUrl: cat && cat.photoUrl, rarity: cat && cat.rarity };
      }),
      quests,
      voucher: voucher ? ctx.publicVoucher(voucher) : null,
      cooldownSec: game.catchCooldownSec,
    };
  }

  function profile(player) {
    const region = homeRegion(player);
    const t = now();
    const metrics = playerMetrics(store, player.id, { tz: region.timezone, today: ctx.day(t, region), dailyGoal: game.dailyGoal });
    const p = store.players.get(player.id);
    const earned = new Set(p.badges || []);
    return {
      player: publicPlayer(p),
      metrics,
      badges: game.badges.map((b) => ({ ...b, earned: earned.has(b.id), earnedAt: (p.badgeDates || {})[b.id] || null, value: metrics[b.metric] || 0 })),
    };
  }

  /** Eigene Sammlung: jede gefangene Katze einmal, mit Anzahl und erstem Fang. */
  function myDex(player) {
    const map = new Map();
    for (const o of store.observations.where('playerId', player.id)) {
      if (o.status === 'rejected') continue;
      const id = resolveCatId(store, o.catId);
      const e = map.get(id) || { catId: id, times: 0, firstAt: o.createdAt, lastAt: o.createdAt, discovered: false };
      e.times++;
      e.firstAt = Math.min(e.firstAt, o.createdAt);
      e.lastAt = Math.max(e.lastAt, o.createdAt);
      if (o.isDiscovery) e.discovered = true;
      map.set(id, e);
    }
    const list = [];
    for (const e of map.values()) {
      const cat = store.cats.get(e.catId);
      if (!cat || cat.removed) continue;
      list.push({ ...e, cat: publicCat(ctx, cat) });
    }
    list.sort((a, b) => b.lastAt - a.lastAt);
    const patterns = new Set(list.map((e) => e.cat.profile && e.cat.profile.pattern).filter((x) => x && x !== 'diger'));
    return { total: list.length, patterns: [...patterns], entries: list };
  }

  function observationsOf(player, { limit = 50 } = {}) {
    return store.observations
      .where('playerId', player.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((o) => ({ ...publicObservation(ctx, o, { precise: true }), counted: o.counted, flags: o.flags, xp: o.xp, status: o.status }));
  }

  // ---------------------------------------------------------------- Zusammenbau

  const api = {
    ctx,
    publicPlayer,
    createPlayer,
    playerByTokenHash,
    updatePlayer,
    catchCat,
    nameCat,
    dispute,
    today,
    profile,
    myDex,
    observationsOf,
    homeRegion,
    addXp,
    refreshBadges,
    stats: (opts2 = {}) => computeStats(ctx, opts2),
    leaderboard: (opts2 = {}) => leaderboard(ctx, opts2),
    config: () => ({
      regions: regions.map((r) => ({ id: r.id, name: r.name, city: r.city, timezone: r.timezone, center: r.center, zoom: r.zoom, polygon: r.polygon, districts: r.districts.map((d) => ({ id: d.id, name: d.name, aka: d.aka || null, center: d.center })) })),
      game: {
        dailyGoal: game.dailyGoal, catchCooldownSec: game.catchCooldownSec, maxGpsAccuracyM: game.maxGpsAccuracyM,
        missingAfterDays: game.missingAfterDays, levels: game.levels, levelTitles: game.levelTitles, badges: game.badges, xp: game.xp,
      },
      ai: { analyzer: analyzer.name || 'unknown', verifier: !!verifier },
    }),
  };
  Object.assign(api, censusApi(ctx, api), voucherApi(ctx, api), adminApi(ctx, api));
  // Erweiterungen: jede hängt ihr eigenes xyzApi(ctx, api) an
  // ── Erweiterung: share ──
  Object.assign(api, shareApi(ctx, api));

  // ── Erweiterung: cafe ──
  Object.assign(api, cafeApi(ctx, api));

  // ── Erweiterung: routes ──
  Object.assign(api, routesApi(ctx, api, { walks: opts.walks, rules: opts.walkRules }));

  // ── Erweiterung: impact ──
  Object.assign(api, impactApi(ctx, api));

  // ── Erweiterung: report ──
  Object.assign(api, reportApi(ctx, api));

  // ── Erweiterung: perf ──

  return api;
}
