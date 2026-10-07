// Cat Me If You Can – Demo-Daten: erfundene Katzen, Spieler:innen, Futterstellen und Partner-Cafés, damit
// Karte, KediDex und Statistik beim ersten Start nicht leer sind. Alles ist mit demo: true
// markiert (Oberfläche zeigt „DEMO“), Partner heißen „… (Demo)“. Für den echten Betrieb weglassen.

import { normalizeAnalysis, rarityOf } from './analysis.js';
import { recomputeCat } from './cats.js';
import { jitter, findDistrict, findRegion } from './geo.js';
import { dayKey } from './time.js';

const CAT_NAMES = [
  'Paşa', 'Duman', 'Pamuk', 'Karamel', 'Zeytin', 'Fıstık', 'Tarçın', 'Boncuk', 'Sultan', 'Gofret', 'Lokum', 'Simit',
  'Kestane', 'Mırnav', 'Pofuduk', 'Şeker', 'Badem', 'Hünkar', 'Bulut', 'Gece', 'Kömür', 'Tosun', 'Cimcime', 'Fındık',
  'Pişmaniye', 'Kahve', 'Bal', 'Limon', 'Maviş', 'Reis', 'Prenses', 'Haydut', 'Minnoş', 'Leblebi', 'Pirinç', 'Çakıl',
];
const PLAYERS = ['ModaAyşe', 'TekirSever', 'KalamışKedisi', 'Zeynep_K', 'MiyavMehmet', 'BahariyeBaran', 'YeldeğirmeniDeniz', 'SuadiyeSelin'];
const PATTERN_WEIGHTS = [
  ['tekir', 28], ['tekir_beyaz', 12], ['sarman', 12], ['smokin', 10], ['siyah', 8], ['sarman_beyaz', 8], ['beyaz', 4],
  ['gri', 4], ['gri_beyaz', 3], ['uc_renk', 5], ['kaplumbaga', 3], ['krem', 1.5], ['renk_uclu', 1], ['van', 0.5],
];
const PATTERN_COLORS = {
  tekir: ['brown', 'black'], tekir_beyaz: ['brown', 'white'], sarman: ['orange'], smokin: ['black', 'white'], siyah: ['black'],
  sarman_beyaz: ['orange', 'white'], beyaz: ['white'], gri: ['gray'], gri_beyaz: ['gray', 'white'], uc_renk: ['white', 'orange', 'black'],
  kaplumbaga: ['black', 'orange'], krem: ['cream'], renk_uclu: ['cream', 'brown'], van: ['white', 'orange'],
};
// Echte öffentliche Parks/Orte, an denen in Kadıköy tatsächlich Katzen gefüttert werden – als Beispiel-Futterstellen.
const FEEDING = [
  ['Moda Parkı', 40.9805, 29.0255], ['Yoğurtçu Parkı', 40.9858, 29.0368], ['Kalamış Parkı', 40.9770, 29.0385],
  ['Fenerbahçe Parkı', 40.9675, 29.0372], ['Göztepe 60. Yıl Parkı', 40.9712, 29.0612], ['Caddebostan Sahil', 40.9622, 29.0645],
  ['Suadiye Sahil', 40.9572, 29.0860], ['Yeldeğirmeni Meydan', 40.9982, 29.0232], ['Kozyatağı Parkı', 40.9745, 29.0965],
];
const PARTNERS = [
  { name: 'Mırmır Kafe (Demo)', lat: 40.9834, lon: 29.0263, address: 'Moda, Caferağa', minCats: 20, discountPct: 20 },
  { name: 'Tekir Kitap Kafe (Demo)', lat: 40.9976, lon: 29.0258, address: 'Yeldeğirmeni, Rasimpaşa', minCats: 20, discountPct: 20 },
  { name: 'Bıyık Fırın (Demo)', lat: 40.9893, lon: 29.0312, address: 'Bahariye, Osmanağa', minCats: 15, discountPct: 10 },
  { name: 'Martı & Kedi Çay Bahçesi (Demo)', lat: 40.9752, lon: 29.0394, address: 'Kalamış, Fenerbahçe', minCats: 20, discountPct: 25 },
  { name: 'Demlik Bostancı (Demo)', lat: 40.9588, lon: 29.0962, address: 'Bostancı', minCats: 20, discountPct: 20 },
];
// Katzenreiche Ecken – Demo-Katzen entstehen um diese Punkte.
const HOTSPOTS = [
  [40.9822, 29.0248, 3], [40.9858, 29.0368, 2], [40.9895, 29.0300, 3], [40.9978, 29.0240, 2], [40.9770, 29.0390, 2],
  [40.9680, 29.0375, 1.5], [40.9930, 29.0500, 1], [41.0060, 29.0510, 1], [40.9785, 29.0560, 1], [40.9712, 29.0612, 1.5],
  [40.9625, 29.0660, 1.5], [40.9715, 29.0790, 1], [40.9575, 29.0850, 1], [40.9745, 29.0975, 1], [40.9585, 29.0975, 1],
  [40.9960, 29.0600, 1], [40.9850, 29.0735, 0.8], [40.9925, 29.0740, 0.8], [41.0100, 29.0420, 1], [40.9800, 29.0880, 0.8],
];

const weighted = (pairs, rng) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of pairs) {
    if ((r -= w) <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
};

export function demoRng(seed = 7) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

function demoAnalysis(pattern, rng, { severity }) {
  const age = weighted([['kitten', 10], ['junior', 15], ['adult', 60], ['senior', 15]], rng);
  const months = { kitten: [2, 5], junior: [7, 18], adult: [30, 84], senior: [100, 160] }[age];
  const bcs = Math.max(2, Math.min(8, Math.round(5 + (rng() + rng() + rng() - 1.5) * 1.6)));
  const baseW = { kitten: 1.2, junior: 2.6, adult: 3.9, senior: 3.6 }[age] * (1 + (bcs - 5) * 0.08);
  const flags = [];
  if (severity === 'mild') flags.push(weighted([['eye_discharge', 3], ['matted_coat', 2], ['ear_issue', 1]], rng));
  if (severity === 'attention') flags.push(weighted([['eye_discharge', 2], ['skin_issue', 2], ['very_thin', 1], ['limping', 1], ['hair_loss', 1]], rng));
  if (severity === 'urgent') flags.push(weighted([['wound', 3], ['eye_injury', 2], ['very_thin', 1]], rng));
  const notes = { none: '', mild: 'Hafif göz akıntısı, takip edilmeli.', attention: 'Veteriner kontrolü önerilir.', urgent: 'Acil veteriner müdahalesi gerekiyor.' }[severity];
  return normalizeAnalysis({
    is_cat: true,
    cat_count: 1,
    is_live_photo: true,
    photo_quality: 'good',
    pattern,
    coat_colors: PATTERN_COLORS[pattern],
    long_hair: rng() < 0.08,
    eye_color: weighted([['yellow', 5], ['green', 4], ['copper', 1], ['blue', pattern === 'renk_uclu' ? 6 : 0.2], ['odd', pattern === 'van' || pattern === 'beyaz' ? 1.5 : 0.1]], rng),
    breed_guess: pattern === 'van' ? 'Turkish Van (likely mix)' : 'Domestic shorthair (mixed)',
    breed_confidence: 0.6,
    age_group: age,
    age_months_min: months[0],
    age_months_max: months[1],
    weight_kg_min: Math.round(baseW * 0.9 * 10) / 10,
    weight_kg_max: Math.round(baseW * 1.15 * 10) / 10,
    body_condition_score: severity === 'attention' && flags.includes('very_thin') ? 3 : bcs,
    sex_guess: pattern === 'uc_renk' || pattern === 'kaplumbaga' ? 'female' : weighted([['unknown', 6], ['male', 2], ['female', 2]], rng),
    ear_tip: weighted([['tipped', 45], ['none', 35], ['not_visible', 20]], rng),
    health_flags: flags,
    health_severity: severity,
    health_notes: notes,
    behavior: weighted([['relaxed', 4], ['sleeping', 3], ['curious', 3], ['eating', 2], ['grooming', 1], ['alert', 1]], rng),
    setting: weighted([['street', 4], ['park', 3], ['shop_cafe', 2], ['stairs_wall', 2], ['car', 1], ['coast', 1]], rng),
    confidence: 0.7,
  }, { analyzer: 'demo' });
}

/**
 * Füllt einen leeren Store mit Demo-Daten. opts.hashPin(pin) → pinHash (Server: scrypt);
 * Demo-PIN für alle Partner: 246810.
 */
export function seedDemo(engine, { seed = 7, cats: nCats = 64, hashPin = (p) => `demo$${p}`, days = 30 } = {}) {
  const { ctx } = engine;
  const { store } = ctx;
  if (store.cats.count() || store.places.count()) return { skipped: true };
  const rng = demoRng(seed);
  const region = ctx.regions[0];
  const t0 = ctx.now();

  const pinHash = hashPin('246810');
  for (const p of PARTNERS) {
    store.places.insert({
      id: ctx.newId('pl'), type: 'partner', regionId: region.id, name: p.name, lat: p.lat, lon: p.lon, address: p.address,
      hours: '08:00–23:00', status: 'approved', active: true, demo: true, pinHash,
      reward: { minCats: p.minCats, discountPct: p.discountPct, maxPerDay: null, text: null },
      description: { tr: 'Örnek partner – gerçek bir işletme değildir.', de: 'Beispiel-Partner – kein echtes Geschäft.', en: 'Example partner – not a real business.' },
      createdAt: t0,
    });
  }
  for (const [name, lat, lon] of FEEDING) {
    store.places.insert({
      id: ctx.newId('pl'), type: rng() < 0.3 ? 'water' : 'feeding', regionId: region.id, name, lat, lon, status: 'approved', active: true, demo: true,
      description: { tr: 'Gönüllüler her gün besliyor.', de: 'Wird täglich von Freiwilligen versorgt.', en: 'Fed daily by volunteers.' }, createdAt: t0,
    });
  }

  const players = PLAYERS.map((nick, i) => {
    const p = { id: ctx.newId('p'), nickname: nick, lang: 'tr', role: i === 0 ? 'volunteer' : 'player', tokenHash: `demo-${i}-${'x'.repeat(40)}`, xp: 0, badges: [], badgeDates: {}, questsDone: {}, banned: false, demo: true, createdAt: t0 - days * 86400000 };
    store.players.insert(p);
    return p;
  });

  const names = [...CAT_NAMES];
  let created = 0;
  for (let i = 0; i < nCats; i++) {
    const hs = weighted(HOTSPOTS.map((h, k) => [k, h[2]]), rng);
    let [lat, lon] = jitter(HOTSPOTS[hs][0], HOTSPOTS[hs][1], 220, rng);
    if (!findRegion(ctx.regions, lat, lon)) [lat, lon] = [HOTSPOTS[hs][0], HOTSPOTS[hs][1]];
    const pattern = weighted(PATTERN_WEIGHTS, rng);
    const severity = weighted([['none', 82], ['mild', 9], ['attention', 6], ['urgent', 3]], rng);
    const proto = demoAnalysis(pattern, rng, { severity });
    const nObs = 1 + Math.floor(rng() * rng() * 9);
    const firstAgo = Math.floor(rng() * days * 86400000);
    const catId = ctx.newId('c');
    const discoverer = players[Math.floor(rng() * players.length)];
    const named = rng() < 0.7 && names.length;
    const cat = {
      id: catId, regionId: region.id, district: null, name: named ? names.splice(Math.floor(rng() * names.length), 1)[0] : null,
      namedBy: discoverer.id, title: null, legendary: false, discoveredBy: discoverer.id, discoveredAt: t0 - firstAgo, createdAt: t0 - firstAgo,
      lastSeenAt: t0 - firstAgo, lastLat: lat, lastLon: lon, profile: {}, fingerprint: { colors: null }, photoId: null, photoUrl: null,
      status: 'active', rarity: rarityOf(proto), observationCount: 0, catcherIds: [], needsReview: false, possibleDuplicates: [], demo: true,
    };
    if (!named) cat.namedBy = null;
    store.cats.insert(cat);
    let at = t0 - firstAgo;
    for (let k = 0; k < nObs; k++) {
      if (k > 0) at = Math.min(t0 - 3600000, at + Math.floor(rng() * (t0 - at) * 0.6) + 3600000);
      const [olat, olon] = jitter(lat, lon, 70, rng);
      const player = k === 0 ? discoverer : players[Math.floor(rng() * players.length)];
      const a = k === 0 ? proto : { ...proto, behavior: demoAnalysis(pattern, rng, { severity: 'none' }).behavior };
      const district = findDistrict(region, olat, olon);
      store.observations.insert({
        id: ctx.newId('o'), playerId: player.id, catId, regionId: region.id, district: district && district.id, dayKey: dayKey(at, region.timezone),
        createdAt: at, capturedAt: at, lat: olat, lon: olon, accuracy: 10 + Math.floor(rng() * 20), source: 'camera', counted: true, flags: [],
        status: 'ok', photoId: null, photoUrl: null, analysis: a, fingerprint: { colors: null, hash: null }, detector: null,
        match: { method: k === 0 ? null : 'auto', score: null, candidates: [] }, isDiscovery: k === 0, rarity: cat.rarity, xp: 0, demo: true,
      });
      const xp = k === 0 ? ctx.game.xp.discovery : ctx.game.xp.firstCatch;
      store.xp.insert({ id: ctx.newId('x'), playerId: player.id, amount: xp, reason: k === 0 ? 'discovery' : 'first_catch', at, dayKey: dayKey(at, region.timezone), regionId: region.id, catId, demo: true });
      store.players.update(player.id, { xp: (store.players.get(player.id).xp || 0) + xp });
    }
    recomputeCat(ctx, catId);
    // Beispiel-Meldungen von Spieler:innen (gefüttert, hungrig, durstig, gesund …)
    if (rng() < 0.35 || severity === 'attention' || severity === 'urgent') {
      const tags = severity === 'urgent' ? ['injured'] : severity === 'attention' ? ['sick', 'thin'].slice(0, 1 + Math.floor(rng() * 2))
        : [weighted([['fed', 4], ['hungry', 3], ['healthy', 3], ['thirsty', 1], ['kittens', 0.6], ['cold', 0.4]], rng)];
      const reporter = players[Math.floor(rng() * players.length)];
      store.events.insert({ id: ctx.newId('e'), catId, type: severity === 'urgent' || severity === 'attention' ? 'help_report' : 'condition', by: reporter.id, at, from: 'active', to: 'active', note: '', tags, severity: severity === 'urgent' ? 'urgent' : severity === 'attention' ? 'attention' : 'none', demo: true });
      store.cats.update(catId, { lastReport: { tags, severity: severity === 'none' ? 'none' : severity, at } });
    }
    if (severity === 'attention' || severity === 'urgent') {
      store.cats.update(catId, { status: rng() < 0.3 ? 'in_care' : 'needs_help', statusAt: at });
      store.events.insert({ id: ctx.newId('e'), catId, type: 'auto_flag', by: discoverer.id, at, from: 'active', to: 'needs_help', note: proto.health_notes });
    } else if (rng() < 0.03) {
      store.cats.update(catId, { status: 'adopted', statusAt: at });
      store.events.insert({ id: ctx.newId('e'), catId, type: 'status', by: players[0].id, at, from: 'active', to: 'adopted', note: 'Yeni yuvasına kavuştu 🏡' });
    }
    created++;
  }

  // Zwei „Kadıköy-Legenden“ – in echt vergibt die Moderation diesen Titel.
  const named = store.cats.all().filter((c) => c.name && c.status === 'active').sort((a, b) => b.observationCount - a.observationCount);
  [['Moda Sahilinin Bekçisi'], ['Bahariye Paşası']].forEach(([title], i) => {
    const c = named[i];
    if (!c) return;
    store.cats.update(c.id, { legendary: true, title });
    recomputeCat(ctx, c.id);
  });
  for (const p of players) engine.refreshBadges(p.id, region);
  return { skipped: false, cats: created, players: players.length, partners: PARTNERS.length, partnerPin: '246810' };
}
