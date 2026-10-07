// Spiel-Engine: Fangen, Wiedererkennung, Anti-Cheat, Tagesziel, Gutscheine, Namen, Moderation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';
import { normalizeAnalysis } from '../public/core/analysis.js';
import { COLOR_KEYS } from '../public/core/fingerprint.js';
import { GAME } from '../public/config/game.js';

const T0 = Date.parse('2026-10-04T07:00:00Z'); // 10:00 in Istanbul

function setup({ gameOverride = {}, verifier = null, moderator = null } = {}) {
  let now = T0;
  let nextAnalysis = null;
  const store = new MemoryStore();
  const removed = [];
  const engine = createEngine({
    store,
    now: () => now,
    verifier,
    moderator,
    game: { ...GAME, ...gameOverride },
    analyzer: {
      name: 'test',
      async analyze() {
        const raw = nextAnalysis || {};
        nextAnalysis = null;
        return normalizeAnalysis({ is_cat: true, is_live_photo: true, ownership: 'street', pattern: 'tekir', eye_color: 'yellow', age_group: 'adult', body_condition_score: 5, health_severity: 'none', ...raw }, { analyzer: 'test' });
      },
    },
    photos: {
      async save() {
        return { photoId: `ph${now}`, photoUrl: `/photos/x_${now}.jpg` };
      },
      async remove(id) {
        removed.push(id);
      },
    },
  });
  const partnerIdOf = () => store.places.where('type', 'partner')[0];
  return {
    engine,
    store,
    removed,
    tick: (ms) => {
      now += ms;
    },
    at: (t) => {
      now = t;
    },
    next: (a) => {
      nextAnalysis = a;
    },
    partner: partnerIdOf,
  };
}

/** Eindeutiger Fingerabdruck pro Katze (Farben + Hash). */
function fp(i, base = 'orange') {
  const colors = Object.fromEntries(COLOR_KEYS.map((k) => [k, 0.02]));
  colors[COLOR_KEYS[i % COLOR_KEYS.length]] = 0.5;
  colors[base] = (colors[base] || 0) + 0.3;
  const hash = ((i * 2654435761) >>> 0).toString(16).padStart(8, '0') + ((i * 97 + 13) >>> 0).toString(16).padStart(8, 'a');
  return { colors, hash };
}

const MODA = { lat: 40.9842, lon: 29.0262 };
const step = (i) => ({ lat: MODA.lat + (i % 5) * 0.0045 - 0.009, lon: MODA.lon + Math.floor(i / 5) * 0.006 });

async function catchAt(s, player, i, extra = {}) {
  const p = step(i);
  return s.engine.catchCat(player, { ...p, accuracy: 10, capturedAt: undefined, source: 'camera', fingerprint: fp(i), images: {}, ...extra });
}

test('Erster Fang: neue Katze, XP, Erstfinder darf benennen – Schimpfwörter nicht', async () => {
  const s = setup();
  const p = await s.engine.createPlayer({ nickname: 'Ayşe', lang: 'tr', tokenHash: 'h'.repeat(64) });
  const r = await catchAt(s, p, 0);
  assert.equal(r.isNew, true);
  assert.equal(r.counted, true);
  assert.equal(r.today.count, 1);
  assert.ok(r.xp.gained >= 100);
  assert.equal(r.canName, true);
  assert.ok(r.newBadges.some((b) => b.id === 'first_catch'));
  await assert.rejects(s.engine.nameCat(p, r.cat.id, 'S1kt1r'), { code: 'name_not_allowed' });
  const named = await s.engine.nameCat(p, r.cat.id, 'Paşa');
  assert.equal(named.name, 'Paşa');
  await assert.rejects(s.engine.nameCat(p, r.cat.id, 'Duman'), { code: 'already_named' });

  const q = await s.engine.createPlayer({ nickname: 'Zeynep', lang: 'de', tokenHash: 'z'.repeat(64) });
  s.tick(60000);
  const r2 = await catchAt(s, q, 0, { fingerprint: { ...fp(0), hash: '0f0f0f0f0f0f0f0f' } });
  assert.equal(r2.isNew, false, 'gleiche Katze wiedererkannt');
  assert.equal(r2.cat.id, r.cat.id);
  assert.equal(r2.cat.name, 'Paşa');
  assert.equal(r2.canName, false);
  const detail = s.engine.getCat(r.cat.id);
  assert.equal(detail.catchers[0].nickname, 'Ayşe', 'Entdeckerin führt die Fänger-Liste an');
  assert.equal(detail.catchers[0].discoverer, true);
});

test('Spitznamen: Filter, reserviert, eindeutig', async () => {
  const s = setup();
  await assert.rejects(s.engine.createPlayer({ nickname: 'Orospu', tokenHash: 'a'.repeat(64) }), { code: 'name_not_allowed' });
  await assert.rejects(s.engine.createPlayer({ nickname: 'admin', tokenHash: 'a'.repeat(64) }), { code: 'name_reserved' });
  await s.engine.createPlayer({ nickname: 'Kedi Sever', tokenHash: 'a'.repeat(64) });
  await assert.rejects(s.engine.createPlayer({ nickname: 'kedi sever', tokenHash: 'b'.repeat(64) }), { code: 'nickname_taken' });
});

test('KI-Moderator kann Namen zusätzlich ablehnen (jede Sprache)', async () => {
  const s = setup({ moderator: { check: async (name) => ({ ok: name !== 'Kûn' }) } });
  await assert.rejects(s.engine.createPlayer({ nickname: 'Kûn', tokenHash: 'a'.repeat(64) }), { code: 'name_not_allowed' });
  const p = await s.engine.createPlayer({ nickname: 'Miyav', tokenHash: 'a'.repeat(64) });
  assert.equal(p.nickname, 'Miyav');
});

test('Anti-Cheat: Abklingzeit, Duplikatfoto, Gebiet, Galerie, GPS, Hauskatze, keine Katze', async () => {
  const s = setup();
  const p = await s.engine.createPlayer({ nickname: 'Test', tokenHash: 't'.repeat(64) });
  await catchAt(s, p, 0);
  await assert.rejects(catchAt(s, p, 1), { code: 'cooldown' });
  s.tick(30000);
  await assert.rejects(catchAt(s, p, 1, { fingerprint: fp(0) }), { code: 'duplicate_photo' });
  await assert.rejects(catchAt(s, p, 1, { lat: 41.043, lon: 29.005 }), { code: 'outside_region' });
  const g = await catchAt(s, p, 2, { source: 'gallery' });
  assert.equal(g.counted, false);
  assert.ok(g.flags.includes('gallery'));
  s.tick(30000);
  const weak = await catchAt(s, p, 3, { accuracy: 900 });
  assert.equal(weak.counted, false);
  assert.ok(weak.flags.includes('gps_inaccurate'));
  s.tick(30000);
  s.next({ ownership: 'owned', collar: true, ownership_reason: 'collar' });
  await assert.rejects(catchAt(s, p, 4), { code: 'pet_cat' });
  s.tick(30000);
  s.next({ is_cat: false });
  await assert.rejects(catchAt(s, p, 5), { code: 'no_cat' });
  s.tick(30000);
  s.next({ is_live_photo: false });
  await assert.rejects(catchAt(s, p, 6), { code: 'not_live_photo' });
  assert.equal(s.removed.length, 3, 'abgelehnte Fotos werden gelöscht');
  s.tick(30000);
  const fast = await catchAt(s, p, 7, { lat: 40.958, lon: 29.098 }); // Bostancı, 30 s später
  assert.ok(fast.flags.includes('impossible_travel'));
  assert.equal(fast.counted, false);
  assert.equal(s.engine.today(p).count, 1, 'nur der erste Fang zählt');
});

test('Gleiche Katze am selben Tag zählt nur einmal fürs Tagesziel', async () => {
  const s = setup();
  const p = await s.engine.createPlayer({ nickname: 'Doppel', tokenHash: 'd'.repeat(64) });
  const a = await catchAt(s, p, 0);
  s.tick(60000);
  const b = await catchAt(s, p, 0, { fingerprint: { ...fp(0), hash: 'aaaaaaaaaaaaaaaa' } });
  assert.equal(b.cat.id, a.cat.id);
  assert.equal(b.today.count, 1);
  assert.equal(b.xp.gained, s.engine.ctx.game.xp.resighting);
});

test('20 Katzen an einem Tag → Gutschein → Café löst einmal ein, nur am selben Tag', async () => {
  const s = setup();
  // Partner-Café anlegen (Admin)
  const admin = { id: 'admin', role: 'admin' };
  s.engine.upsertPlace(admin, { type: 'partner', name: 'Kafe Test', lat: 40.984, lon: 29.027, reward: { minCats: 20, discountPct: 20 }, pinHash: 'scrypt$x$y' });
  const cafe = s.partner();
  const p = await s.engine.createPlayer({ nickname: 'Yirmi', tokenHash: 'y'.repeat(64) });
  for (let i = 0; i < 19; i++) {
    await catchAt(s, p, i);
    s.tick(180000); // 3 min – Straßenkatzen-Tempo, keine „unmögliche Reise“
  }
  await assert.rejects(async () => s.engine.claimVoucher(p), { code: 'goal_not_reached' });
  const last = await catchAt(s, p, 19);
  assert.equal(last.today.count, 20);
  assert.equal(last.today.justReached, true);
  assert.ok(last.xp.items.some((x) => x.reason === 'daily_goal'));
  assert.ok(last.newBadges.some((b) => b.id === 'daily_goal'));

  const v = s.engine.claimVoucher(p);
  assert.match(v.code, /^CAT-/);
  assert.equal(s.engine.claimVoucher(p).code, v.code, 'ein Gutschein pro Tag');
  const chk = s.engine.checkVoucher(cafe, v.code.toLowerCase());
  assert.equal(chk.valid, true);
  assert.equal(chk.catCount, 20);
  assert.equal(chk.discountPct, 20);
  const red = s.engine.redeemVoucher(cafe, v.code);
  assert.equal(red.redeemed, true);
  assert.throws(() => s.engine.redeemVoucher(cafe, v.code), { code: 'already_redeemed' });
  assert.equal(s.engine.partnerRedemptions(cafe).items.length, 1);

  // Neuer Gutschein am nächsten Tag ungültig ohne neue Katzen; alter läuft ab
  const p2 = await s.engine.createPlayer({ nickname: 'Morgen', tokenHash: 'm'.repeat(64) });
  for (let i = 30; i < 50; i++) {
    s.tick(180000);
    await catchAt(s, p2, i);
  }
  const v2 = s.engine.claimVoucher(p2);
  s.at(Date.parse('2026-10-04T21:30:00Z')); // 00:30 am nächsten Tag (Istanbul)
  const exp = s.engine.checkVoucher(cafe, v2.code);
  assert.equal(exp.valid, false);
  assert.equal(exp.reason, 'expired');
  assert.equal(s.engine.today(p2).count, 0, 'neuer Tag, neues Glück');
});

test('Moderation: Zusammenführen und Ablehnen rechnen Zähler und XP neu', async () => {
  const s = setup({ gameOverride: { reid: { radiusM: 450, linkScore: 0.99, verifyLow: 0.98, autoLinkWithVerifier: 0.995, maxCandidates: 3 } } });
  const admin = { id: 'admin', role: 'admin' };
  const p = await s.engine.createPlayer({ nickname: 'Ayla', tokenHash: 'q'.repeat(64) });
  const a = await catchAt(s, p, 0);
  s.tick(60000);
  const b = await catchAt(s, p, 1);
  assert.notEqual(a.cat.id, b.cat.id);
  assert.equal(s.engine.today(p).count, 2);
  s.engine.mergeCats(admin, b.cat.id, a.cat.id);
  assert.equal(s.engine.today(p).count, 1, 'nach Zusammenführen nur noch eine Katze');
  assert.equal(s.engine.getCat(b.cat.id).cat.id, a.cat.id, 'alte ID leitet weiter');
  const xpBefore = s.store.players.get(p.id).xp;
  s.engine.rejectObservation(admin, b.observation.id, 'Test');
  assert.ok(s.store.players.get(p.id).xp < xpBefore, 'XP zurückgebucht');
  const split = s.engine.ctx.store.observations.where('playerId', p.id).filter((o) => o.status !== 'rejected');
  assert.equal(split.length, 1);
  assert.throws(() => s.engine.mergeCats({ id: 'x', role: 'player' }, a.cat.id, b.cat.id), { code: 'forbidden' });
});

test('KI-Vergleich entscheidet bei unsicheren Fällen', async () => {
  const calls = [];
  const s = setup({ verifier: { compare: async (args) => { calls.push(args); return { matchId: null, confidence: 0.9 }; } } });
  const p = await s.engine.createPlayer({ nickname: 'Vergleich', tokenHash: 'v'.repeat(64) });
  const a = await catchAt(s, p, 0);
  s.tick(60000);
  // fast gleiche Farben, gleicher Ort → ohne KI würde verknüpft; KI sagt „andere Katze“
  const b = await catchAt(s, p, 0, { fingerprint: { ...fp(0), hash: '0123456789abcdef' }, lat: step(0).lat + 0.002 });
  assert.equal(calls.length, 1);
  assert.notEqual(b.cat.id, a.cat.id);
  assert.equal(b.isNew, true);
});

test('Gesundheit: Hinweis setzt „braucht Hilfe“, Meldungen, Status nur für Freiwillige', async () => {
  const s = setup();
  const p = await s.engine.createPlayer({ nickname: 'Helfer', tokenHash: 'e'.repeat(64) });
  s.next({ health_flags: ['eye_discharge', 'very_thin'], health_severity: 'attention', body_condition_score: 2 });
  const r = await catchAt(s, p, 0);
  assert.equal(s.engine.getCat(r.cat.id).cat.status, 'needs_help');
  assert.ok(r.xp.items.some((x) => x.reason === 'health_report'));
  assert.equal(s.engine.helpList().total, 1);
  await assert.rejects(async () => s.engine.reportHelp(p, r.cat.id, 'scheiße f.u.c.k'), { code: 'text_not_allowed' });
  s.engine.reportHelp(p, r.cat.id, 'Auge entzündet, sehr dünn');
  assert.throws(() => s.engine.reportHelp(p, r.cat.id, 'nochmal'), { code: 'already_reported' });
  assert.throws(() => s.engine.setCatStatus(p, r.cat.id, 'in_care', ''), { code: 'forbidden' });
  s.store.players.update(p.id, { role: 'volunteer' });
  s.engine.setCatStatus(s.store.players.get(p.id), r.cat.id, 'in_care', 'Tierarzt Moda');
  assert.equal(s.engine.getCat(r.cat.id).cat.status, 'in_care');
  assert.ok(s.engine.getCat(r.cat.id).events.some((e) => e.type === 'status' && e.to === 'in_care'));
});

test('Statistik, Ranglisten und Datenschutz (gerundete Koordinaten)', async () => {
  const s = setup();
  const p = await s.engine.createPlayer({ nickname: 'Statistik', tokenHash: 's'.repeat(64) });
  for (let i = 0; i < 3; i++) {
    s.next({ ear_tip: i === 0 ? 'tipped' : 'none' });
    await catchAt(s, p, i);
    s.tick(60000);
  }
  const st = s.engine.stats();
  assert.equal(st.totals.cats, 3);
  assert.equal(st.totals.tnrPct, 33);
  assert.equal(st.perDay.length, 30);
  assert.equal(st.perDay[29].observations, 3);
  const lb = s.engine.leaderboard({ period: 'day', metric: 'discoveries' });
  assert.equal(lb.items[0].nickname, 'Statistik');
  assert.equal(lb.items[0].value, 3);
  const cats = s.engine.listCats({});
  for (const c of cats.items) assert.ok(String(c.lat).split('.')[1].length <= 3, 'öffentliche Koordinaten gerundet');
  assert.equal(s.engine.mapData().cats.length, 3);
});

test('Zustand melden: beim Fang (einmal, +XP) und vom Profil; ernst → Hilfe-Radar; Statistik', async () => {
  const s = setup();
  const p = await s.engine.createPlayer({ nickname: 'Melder', tokenHash: 'r'.repeat(64) });
  const r = await catchAt(s, p, 0);
  const xp0 = s.store.players.get(p.id).xp;
  const rep = s.engine.reportCondition(p, r.observation.id, { tags: ['hungry', 'healthy', 'nope'], note: 'sehr hungrig' });
  assert.deepEqual(s.store.observations.get(r.observation.id).report.tags, ['hungry'], '„gesund“ fliegt raus, Unbekanntes auch');
  assert.equal(rep.severity, 'mild');
  assert.equal(rep.status, 'active', 'hungrig allein ist kein Notfall');
  assert.equal(s.store.players.get(p.id).xp, xp0 + s.engine.ctx.game.xp.conditionReport);
  assert.throws(() => s.engine.reportCondition(p, r.observation.id, { tags: ['sick'] }), { code: 'already_reported' });
  assert.throws(() => s.engine.reportCondition(p, `${r.observation.id}_gibtsnicht`, { tags: ['sick'] }), { code: 'observation_not_found' });

  s.tick(60000);
  const q = await s.engine.createPlayer({ nickname: 'Zweite', tokenHash: 'w'.repeat(64) });
  const r2 = await catchAt(s, q, 7);
  assert.throws(() => s.engine.reportCondition(p, r2.observation.id, { tags: ['sick'] }), { code: 'observation_not_found' }, 'nur eigene Fänge');
  const rep2 = s.engine.reportCondition(q, r2.observation.id, { tags: ['injured'] });
  assert.equal(rep2.severity, 'urgent');
  assert.equal(rep2.status, 'needs_help');
  assert.equal(s.engine.helpList().items[0].lastReport.tags[0], 'injured');

  s.engine.reportHelp(p, r2.cat.id, { tags: ['fed'], note: '' });
  const st = s.engine.stats();
  assert.equal(st.reports.hungry, 1);
  assert.equal(st.reports.injured, 1);
  assert.equal(st.totals.fed30d, 1);
  assert.equal(st.totals.hungry7d, 1);
  assert.equal(s.engine.getCat(r2.cat.id).cat.lastReport.tags[0], 'fed');
  s.tick(7 * 3600000);
  const r3 = await catchAt(s, p, 9);
  s.tick(7 * 3600000);
  assert.throws(() => s.engine.reportCondition(p, r3.observation.id, { tags: ['sick'] }), { code: 'report_too_late' });
});
