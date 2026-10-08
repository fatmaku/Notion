// Cat Me If You Can – Cafés als Vertriebsweg: Empfehlungscode (refCode) je Partner-Café, Zuordnung
// neuer Spieler:innen („über den QR-Code von Café X gekommen“), Zahlen fürs Café und Daten für die
// Druckvorlagen (Tischaufsteller, Sticker, Poster). Läuft wie die ganze Engine im Server und im Browser.
//
// * refCode: 6 Zeichen ohne verwechselbare Zeichen (kein 0/O, 1/I/L), eindeutig, öffentlich – er
//   steht im QR-Code auf dem Tisch. Neue Partner bekommen ihn beim Anlegen, ältere beim ersten Bedarf.
// * Zuordnung: Der Server merkt sich den Code 30 Tage in einem eigenen Cookie (server/cafe.js). Beim
//   Anlegen des Kontos wird player.referral = {placeId, at} gespeichert. Der erste Kontakt zählt, ein
//   vorhandener Eintrag wird nie überschrieben. Keine IP, kein weiteres Tracking.
// * Zahlen fürs Café: nur Summen – keine Spitznamen, keine Orte, keine Zeiten einzelner Personen.

import { fail } from './util.js';

/** Dieselben eindeutigen Zeichen wie bei Gutscheinen: 31 Zeichen → 31^6 ≈ 887 Mio. Codes. */
export const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REF_LENGTH = 6;
export const REF_COOKIE = 'catme_ref';
export const REF_DAYS = 30;
const DAY_MS = 86400000;
const DEFAULT_PCT = 20;

function rngBytes(n) {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/** Zufälliger Code ohne Modulo-Schiefe (Bytes ≥ 248 werden verworfen). */
export function makeRefCode(randomBytes = rngBytes) {
  const limit = 256 - (256 % REF_ALPHABET.length);
  let s = '';
  for (let guard = 0; s.length < REF_LENGTH && guard < 64; guard++) {
    for (const b of randomBytes(REF_LENGTH * 2)) {
      if (b >= limit) continue;
      s += REF_ALPHABET[b % REF_ALPHABET.length];
      if (s.length === REF_LENGTH) break;
    }
  }
  if (s.length !== REF_LENGTH) throw new Error('makeRefCode: Zufallsquelle liefert nichts Brauchbares');
  return s;
}

/** Neuer Code, der in `taken` (Set) noch nicht vorkommt. */
export function uniqueRefCode(taken, randomBytes = rngBytes) {
  for (let i = 0; i < 64; i++) {
    const c = makeRefCode(randomBytes);
    if (!taken.has(c)) return c;
  }
  throw new Error('uniqueRefCode: kein freier Code gefunden');
}

/** Eingabe aus URL/Cookie → kanonischer Code oder null („ab-c 234“ → „ABC234“). */
export function normalizeRefCode(input) {
  if (typeof input !== 'string' || input.length > 32) return null;
  const s = input.toUpperCase().replace(/[\s-]/g, '');
  if (s.length !== REF_LENGTH) return null;
  for (const ch of s) if (!REF_ALPHABET.includes(ch)) return null;
  return s;
}

/** Nur freigegebene, aktive Partner-Cafés zählen (Cookie, Zuordnung, Druckvorlage). */
export const isLivePartner = (p) => !!p && p.type === 'partner' && p.status === 'approved' && p.active !== false;

export function cafeApi(ctx, api) {
  const { store, game } = ctx;
  const baseUpsertPlace = api.upsertPlace;

  const rewardOf = (p) => ({
    minCats: (p && p.reward && Number(p.reward.minCats)) || game.dailyGoal,
    discountPct: (p && p.reward && Number(p.reward.discountPct)) || DEFAULT_PCT,
  });

  /**
   * Alle Partner-Orte ohne Code bekommen jetzt einen (Orte von vor dieser Erweiterung, Demo-Daten).
   * Gibt die Zahl der neu vergebenen Codes zurück.
   */
  function ensureRefCodes() {
    const partners = store.places.where('type', 'partner');
    if (partners.every((p) => p.refCode)) return 0;
    const taken = new Set(store.places.all().map((p) => p.refCode).filter(Boolean));
    let fresh = 0;
    let demo = false;
    for (const p of partners) {
      if (p.refCode) continue;
      const code = uniqueRefCode(taken);
      taken.add(code);
      store.places.update(p.id, { refCode: code });
      fresh++;
      if (p.demo) demo = true;
    }
    if (demo) seedDemoReferrals();
    return fresh;
  }

  /**
   * Nur Demo-Daten: Die Demo-Spieler:innen „kamen“ über die Demo-Cafés, damit die Café-Ansicht im
   * Demo nicht leer ist. Echte Konten werden nie angefasst.
   */
  function seedDemoReferrals() {
    const cafes = store.places.where('type', 'partner').filter((p) => p.demo && isLivePartner(p)).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.id.localeCompare(b.id));
    const players = store.players.all().filter((p) => p.demo).sort((a, b) => a.id.localeCompare(b.id));
    if (!cafes.length || !players.length || players.some((p) => p.referral)) return;
    players.forEach((p, i) => {
      const at = Math.min(ctx.now(), (p.createdAt || ctx.now()) + (i + 1) * 2 * DAY_MS);
      store.players.update(p.id, { referral: { placeId: cafes[i % cafes.length].id, at, demo: true } });
    });
  }

  function refCodeOf(placeOrId) {
    const p = typeof placeOrId === 'string' ? store.places.get(placeOrId) : placeOrId;
    if (!p || p.type !== 'partner') return null;
    if (!p.refCode) ensureRefCodes();
    return (store.places.get(p.id) || {}).refCode || null;
  }

  /** Café zu einem Code – egal in welchem Zustand (für die Moderation). */
  function placeByRefCode(raw) {
    const code = normalizeRefCode(raw);
    if (!code) return null;
    ensureRefCodes();
    return store.places.where('type', 'partner').find((p) => p.refCode === code) || null;
  }

  /** Café zu einem Code, nur wenn es freigegeben und aktiv ist. */
  function refPartner(raw) {
    const p = placeByRefCode(raw);
    return isLivePartner(p) ? p : null;
  }

  /** Erster Kontakt gewinnt: Ist schon ein Café eingetragen, bleibt es dabei. */
  function attributeReferral(player, raw) {
    if (!player) return null;
    const fresh = store.players.get(player.id);
    if (!fresh || fresh.referral) return null;
    const p = refPartner(raw);
    if (!p) return null;
    const referral = { placeId: p.id, at: ctx.now() };
    store.players.update(fresh.id, { referral });
    return referral;
  }

  /** Zeitpunkte, an denen jemand das Tagesziel geschafft hat (Tagesziel-XP oder Gutschein geholt). */
  function goalHits(playerId) {
    return [
      ...store.xp.where('playerId', playerId).filter((x) => x.reason === 'daily_goal').map((x) => x.at),
      ...store.vouchers.where('playerId', playerId).map((v) => v.createdAt),
    ];
  }

  /**
   * Zahlen für ein Café: wie viele über den QR-Code kamen (gesamt / letzte `days` Tage), wie viele
   * davon das Tagesziel geschafft haben, wie viele Gutscheine hier eingelöst wurden. Nur Summen.
   */
  function partnerStats(partner, { days = REF_DAYS } = {}) {
    if (!partner || partner.type !== 'partner') fail(404, 'place_not_found');
    const t = ctx.now();
    const since = t - days * DAY_MS;
    const referred = store.players.all().filter((p) => p.referral && p.referral.placeId === partner.id && !p.banned);
    let goal = 0;
    let goalRecent = 0;
    for (const p of referred) {
      const hits = goalHits(p.id);
      if (hits.length) goal++;
      if (hits.some((at) => at >= since)) goalRecent++;
    }
    const redeemed = store.vouchers.all().filter((v) => v.partnerId === partner.id && v.redeemedAt);
    return {
      placeId: partner.id,
      name: partner.name,
      refCode: refCodeOf(partner),
      days,
      players: { total: referred.length, recent: referred.filter((p) => p.referral.at >= since).length },
      reachedGoal: { total: goal, recent: goalRecent },
      redeemed: { total: redeemed.length, recent: redeemed.filter((v) => v.redeemedAt >= since).length },
      reward: rewardOf(partner),
    };
  }

  /** Moderation: Code und Zahlen für jedes Partner-Café (auch pausierte), nach Place-ID. */
  function referralOverview(actor, { days = REF_DAYS } = {}) {
    if (!actor || actor.banned || actor.role !== 'admin') fail(403, 'forbidden', 'Nur für Moderation');
    ensureRefCodes();
    const out = {};
    for (const p of store.places.where('type', 'partner')) {
      const s = partnerStats(p, { days });
      out[p.id] = { placeId: p.id, live: isLivePartner(p), refCode: s.refCode, players: s.players, reachedGoal: s.reachedGoal, redeemed: s.redeemed };
    }
    return out;
  }

  /**
   * Öffentliche Daten für die Druckvorlage. Ohne Café: allgemeine Version (Tagesziel, Standardrabatt).
   * Nur freigegebene, aktive Cafés – keine PIN, keine Zahlen, keine Koordinaten.
   */
  function cafeKit(placeId) {
    const base = { dailyGoal: game.dailyGoal, discountPct: DEFAULT_PCT, cafe: null };
    if (placeId == null || placeId === '') return base;
    const p = typeof placeId === 'string' && placeId.length <= 64 ? store.places.get(placeId) : null;
    if (!isLivePartner(p)) fail(404, 'cafe_not_found', 'Café nicht gefunden');
    return {
      ...base,
      cafe: { id: p.id, name: p.name, address: p.address || '', refCode: refCodeOf(p), ...rewardOf(p), demo: !!p.demo },
    };
  }

  /** „Willkommen von Café X“: öffentliche Angaben zu einem Code (oder null). */
  function refWelcome(raw) {
    const p = refPartner(raw);
    return { cafe: p ? { id: p.id, name: p.name, address: p.address || '', ...rewardOf(p) } : null };
  }

  const out = { ensureRefCodes, refCodeOf, placeByRefCode, refPartner, attributeReferral, partnerStats, referralOverview, cafeKit, refWelcome };
  if (typeof baseUpsertPlace === 'function') {
    // Neues Partner-Café bekommt seinen Code gleich beim Anlegen (die Moderation sieht ihn sofort).
    out.upsertPlace = (actor, data) => {
      const res = baseUpsertPlace(actor, data);
      return res && res.type === 'partner' ? { ...res, refCode: refCodeOf(res.id) } : res;
    };
  }
  return out;
}
