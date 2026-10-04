// Cat Me If You Can – Café-Gutscheine.
//
// Regel: Wer an einem Tag (Ortszeit) mindestens `minCats` verschiedene Katzen gezählt gefangen
// hat, bekommt EINEN Gutschein für diesen Tag. Er gilt bis Mitternacht bei allen Partnern der
// Region, deren Schwelle erreicht ist (jedes Café legt Rabatt und Schwelle selbst fest, Standard
// 20 Katzen → 20 %). Eingelöst wird einmal – das Café scannt den QR-Code oder tippt den Code ein.

import { todaysCats } from './progress.js';
import { endOfDay } from './time.js';
import { fail, normalizeCode } from './util.js';

export function voucherApi(ctx) {
  const { store, game } = ctx;

  function partnersOf(regionId) {
    return store.places.where('type', 'partner').filter((p) => p.regionId === regionId && p.active !== false && p.status === 'approved');
  }

  function minCatsOf(partner) {
    return (partner.reward && Number(partner.reward.minCats)) || game.dailyGoal;
  }

  function publicVoucher(v) {
    const region = ctx.regionOf(v.regionId);
    const t = ctx.now();
    const count = todaysCats(store, v.playerId, v.dayKey).length;
    const partner = v.partnerId ? store.places.get(v.partnerId) : null;
    return {
      code: v.code,
      day: v.dayKey,
      regionId: v.regionId,
      createdAt: v.createdAt,
      expiresAt: v.expiresAt,
      expired: t > v.expiresAt,
      redeemedAt: v.redeemedAt || null,
      redeemedBy: partner ? partner.name : null,
      discountPct: v.discountPct || null,
      catCount: count,
      partners: partnersOf(region.id).map((p) => ({ id: p.id, name: p.name, minCats: minCatsOf(p), discountPct: (p.reward && p.reward.discountPct) || 20, eligible: count >= minCatsOf(p), address: p.address || '' })),
    };
  }
  ctx.publicVoucher = publicVoucher;

  /** Region, in der der Spieler heute (laut Sichtungen) unterwegs war. */
  function regionToday(player) {
    const t = ctx.now();
    const counts = new Map();
    for (const o of store.observations.where('playerId', player.id)) {
      const r = ctx.regionOf(o.regionId);
      if (o.dayKey === ctx.day(t, r)) counts.set(r.id, (counts.get(r.id) || 0) + 1);
    }
    let best = null;
    for (const [id, n] of counts) if (!best || n > best[1]) best = [id, n];
    return ctx.regionOf(best ? best[0] : ctx.regions[0].id);
  }

  function claimVoucher(player) {
    if (!player || player.banned) fail(403, 'banned');
    const region = regionToday(player);
    const t = ctx.now();
    const day = ctx.day(t, region);
    const existing = store.vouchers.where('playerId', player.id).find((v) => v.dayKey === day);
    if (existing) return publicVoucher(existing);
    const partners = partnersOf(region.id);
    const needed = partners.length ? Math.min(...partners.map(minCatsOf)) : game.dailyGoal;
    const cats = todaysCats(store, player.id, day);
    if (cats.length < needed) fail(403, 'goal_not_reached', `Noch ${needed - cats.length} Katzen bis zum Gutschein`, { count: cats.length, needed });
    let code;
    for (let i = 0; i < 10; i++) {
      code = ctx.newCode();
      if (!store.vouchers.where('code', code).length) break;
    }
    const v = {
      id: ctx.newId('v'),
      code,
      playerId: player.id,
      regionId: region.id,
      dayKey: day,
      createdAt: t,
      expiresAt: endOfDay(day, region.timezone),
      catIdsAtClaim: cats.map((c) => c.catId),
      redeemedAt: null,
      partnerId: null,
      discountPct: null,
    };
    store.vouchers.insert(v);
    return publicVoucher(v);
  }

  function voucherToday(player) {
    const region = regionToday(player);
    const day = ctx.day(ctx.now(), region);
    const v = store.vouchers.where('playerId', player.id).find((x) => x.dayKey === day);
    return v ? publicVoucher(v) : null;
  }

  /** Prüft einen Gutschein aus Sicht eines Partners (ohne einzulösen). */
  function checkVoucher(partner, rawCode) {
    if (!partner || partner.type !== 'partner') fail(403, 'not_partner');
    const code = normalizeCode(rawCode);
    if (!code) return { valid: false, reason: 'bad_code' };
    const v = store.vouchers.where('code', code)[0];
    if (!v) return { valid: false, reason: 'not_found' };
    const region = ctx.regionOf(v.regionId);
    const t = ctx.now();
    const player = store.players.get(v.playerId);
    const cats = todaysCats(store, v.playerId, v.dayKey);
    const base = {
      code,
      day: v.dayKey,
      nickname: player ? player.nickname : '?',
      catCount: cats.length,
      minCats: minCatsOf(partner),
      discountPct: (partner.reward && partner.reward.discountPct) || 20,
      cats: cats.slice(0, 30).map((c) => {
        const cat = store.cats.get(c.catId);
        return { id: c.catId, at: c.at, name: cat && cat.name, photoUrl: cat && cat.photoUrl, pattern: cat && cat.profile && cat.profile.pattern, district: c.district };
      }),
    };
    if (v.redeemedAt) {
      const where = store.places.get(v.partnerId);
      return { ...base, valid: false, reason: 'already_redeemed', redeemedAt: v.redeemedAt, redeemedBy: where ? where.name : null };
    }
    if (v.dayKey !== ctx.day(t, region) || t > v.expiresAt) return { ...base, valid: false, reason: 'expired' };
    if (partner.regionId !== v.regionId) return { ...base, valid: false, reason: 'wrong_region' };
    if (player && player.banned) return { ...base, valid: false, reason: 'player_banned' };
    if (cats.length < base.minCats) return { ...base, valid: false, reason: 'not_enough_cats' };
    if (partner.reward && partner.reward.maxPerDay) {
      const today = store.vouchers.all().filter((x) => x.partnerId === partner.id && x.redeemedAt && ctx.day(x.redeemedAt, region) === ctx.day(t, region)).length;
      if (today >= partner.reward.maxPerDay) return { ...base, valid: false, reason: 'partner_daily_limit' };
    }
    return { ...base, valid: true, reason: null };
  }

  function redeemVoucher(partner, rawCode) {
    const res = checkVoucher(partner, rawCode);
    if (!res.valid) fail(409, res.reason || 'invalid', 'Gutschein ungültig', res);
    const v = store.vouchers.where('code', res.code)[0];
    const t = ctx.now();
    store.vouchers.update(v.id, { redeemedAt: t, partnerId: partner.id, discountPct: res.discountPct, catCountAtRedeem: res.catCount });
    store.events.insert({ id: ctx.newId('e'), catId: null, type: 'voucher_redeemed', by: v.playerId, at: t, note: `${partner.name} · ${res.discountPct}%`, partnerId: partner.id });
    return { ...res, valid: false, reason: 'already_redeemed', redeemed: true, redeemedAt: t, redeemedBy: partner.name };
  }

  function partnerRedemptions(partner, { days = 1 } = {}) {
    const region = ctx.regionOf(partner.regionId);
    const t = ctx.now();
    const since = t - days * 86400000;
    const list = store.vouchers
      .all()
      .filter((v) => v.partnerId === partner.id && v.redeemedAt && v.redeemedAt >= since)
      .sort((a, b) => b.redeemedAt - a.redeemedAt)
      .map((v) => {
        const p = store.players.get(v.playerId);
        return { code: v.code, at: v.redeemedAt, nickname: p ? p.nickname : '?', catCount: v.catCountAtRedeem, discountPct: v.discountPct };
      });
    const all = store.vouchers.all().filter((v) => v.partnerId === partner.id && v.redeemedAt);
    return { today: ctx.day(t, region), items: list, totalAllTime: all.length };
  }

  return { claimVoucher, voucherToday, checkVoucher, redeemVoucher, partnerRedemptions, publicVoucher, partnersOf };
}
