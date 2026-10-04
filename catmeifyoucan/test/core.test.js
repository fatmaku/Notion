// Kernbausteine: Geometrie, Zeit, Fingerabdruck, Analyse-Normalisierung, Namensfilter, Codes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../public/config/regions.js';
import { findRegion, findDistrict, haversine, fuzz } from '../public/core/geo.js';
import { dayKey, endOfDay, startOfDay, addDays, localHour } from '../public/core/time.js';
import { computeFingerprint, hammingHex, colorSimilarity, classifyPixel } from '../public/core/fingerprint.js';
import { normalizeAnalysis, guessPattern, rarityOf, heuristicAnalysis, ANALYSIS_SCHEMA } from '../public/core/analysis.js';
import { checkName } from '../public/core/moderation.js';
import { normalizeCode, makeCode, cleanName } from '../public/core/util.js';
import { scoreCandidate, decide } from '../public/core/reid.js';
import { streaks, questsFor } from '../public/core/progress.js';
import { GAME } from '../public/config/game.js';

test('Kadıköy: Punkte innen/außen und Mahalle', () => {
  const moda = findRegion(REGIONS, 40.9842, 29.0262);
  assert.equal(moda && moda.id, 'kadikoy');
  assert.equal(findDistrict(moda, 40.9842, 29.0262).id, 'caferaga');
  assert.equal(findDistrict(moda, 40.9580, 29.0980).id, 'bostanci');
  assert.equal(findRegion(REGIONS, 41.0430, 29.0050), null, 'Beşiktaş liegt außerhalb');
  assert.equal(findRegion(REGIONS, 52.52, 13.405), null, 'Berlin liegt außerhalb');
  assert.equal(findRegion(REGIONS, NaN, 29), null);
  assert.ok(Math.abs(haversine(40.98, 29.02, 40.99, 29.02) - 1112) < 5);
  assert.equal(fuzz(40.984234, 3), 40.984);
});

test('Spieltag in Istanbul-Zeit (nicht UTC)', () => {
  const tz = 'Europe/Istanbul';
  // 21:30 UTC = 00:30 Ortszeit am nächsten Tag
  assert.equal(dayKey(Date.parse('2026-10-04T21:30:00Z'), tz), '2026-10-05');
  assert.equal(dayKey(Date.parse('2026-10-04T20:59:00Z'), tz), '2026-10-04');
  assert.equal(localHour(Date.parse('2026-10-04T21:30:00Z'), tz), 0);
  assert.equal(endOfDay('2026-10-04', tz), Date.parse('2026-10-04T20:59:59.999Z'));
  assert.equal(startOfDay('2026-10-05', tz), Date.parse('2026-10-04T21:00:00Z'));
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(streaks(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05'], '2026-10-05'), { max: 3, current: 1 });
});

function solid(w, h, rgb) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) a.set([...rgb, 255], i * 4);
  return a;
}

test('Fingerabdruck: Fellfarben, Ähnlichkeit, dHash', () => {
  assert.equal(classifyPixel(20, 20, 20), 'black');
  assert.equal(classifyPixel(245, 245, 240), 'white');
  assert.equal(classifyPixel(230, 130, 40), 'orange');
  const orange = computeFingerprint(solid(32, 32, [230, 130, 40]), 32, 32);
  assert.ok(orange.colors.orange > 0.95);
  assert.equal(orange.hash.length, 16);
  const black = computeFingerprint(solid(32, 32, [15, 15, 15]), 32, 32);
  assert.ok(colorSimilarity(orange.colors, orange.colors) > 0.99);
  assert.ok(colorSimilarity(orange.colors, black.colors) < 0.05);
  assert.equal(hammingHex('ffff000000000000', 'ffff000000000000'), 0);
  assert.equal(hammingHex('ffff000000000000', 'fff0000000000000'), 4);
  assert.equal(hammingHex('xyz', 'abc'), 64);
});

test('Fellmuster aus Farben', () => {
  assert.equal(guessPattern({ orange: 0.4, black: 0.3, white: 0.3 }), 'uc_renk');
  assert.equal(guessPattern({ orange: 0.8, white: 0.05 }), 'sarman');
  assert.equal(guessPattern({ black: 0.6, white: 0.35 }), 'smokin');
  assert.equal(guessPattern({ black: 0.9 }), 'siyah');
  assert.equal(guessPattern({ brown: 0.5, black: 0.2, gray: 0.1 }), 'tekir');
  assert.equal(guessPattern({ white: 0.9 }), 'beyaz');
});

test('Analyse wird normalisiert und abgesichert', () => {
  const a = normalizeAnalysis({
    is_cat: true, pattern: 'dragon', age_months_min: 80, age_months_max: 20, weight_kg_min: 99, body_condition_score: 14,
    health_flags: ['wound', 'wound', 'nonsense'], health_severity: 'none', ownership: 'owned', summary_tr: 'x'.repeat(500),
    main_cat_box: { x: 0.8, y: 0.1, w: 0.5, h: 0.5 },
  }, { analyzer: 'claude' });
  assert.equal(a.pattern, 'diger');
  assert.deepEqual([a.age_months_min, a.age_months_max], [20, 80]);
  assert.equal(a.weight_kg_min, 12);
  assert.equal(a.body_condition_score, 9);
  assert.equal(a.body_condition, 'obese');
  assert.deepEqual(a.health_flags, ['wound']);
  assert.equal(a.health_severity, 'attention', 'Wunde hebt die Dringlichkeit an');
  assert.equal(a.ownership, 'owned');
  assert.ok(a.summary.tr.length <= 220);
  assert.ok(Math.abs(a.main_cat_box.w - 0.2) < 1e-9, 'Box bleibt im Bild');
  assert.equal(normalizeAnalysis({}).is_cat, false);
  assert.equal(rarityOf({ pattern: 'van' }), 'epic');
  assert.equal(rarityOf({ pattern: 'tekir', eye_color: 'odd' }), 'uncommon');
  assert.equal(rarityOf({ pattern: 'tekir' }, { legendary: true }), 'legendary');
  assert.equal(heuristicAnalysis({ detector: { score: 0 } }).is_cat, false);
  assert.equal(heuristicAnalysis({ fingerprint: { colors: { orange: 0.9 } } }).pattern, 'sarman');
});

test('JSON-Schema für Structured Outputs: nur unterstützte Konstrukte', () => {
  const walk = (s, where) => {
    if (s.type === 'object' || (s.properties && !s.type)) {
      assert.equal(s.additionalProperties, false, `${where}: additionalProperties:false`);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), `${where}: alle Felder required`);
      for (const [k, v] of Object.entries(s.properties)) walk(v, `${where}.${k}`);
    }
    for (const bad of ['minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems']) assert.ok(!(bad in s), `${where}: ${bad} nicht unterstützt`);
    if (s.items) walk(s.items, `${where}[]`);
    if (s.anyOf) s.anyOf.forEach((x, i) => walk(x, `${where}|${i}`));
  };
  walk(ANALYSIS_SCHEMA, 'analysis');
});

test('Namensfilter: Schimpfwörter in vielen Sprachen, auch verschleiert', () => {
  const bad = ['siktir', 'S1KT1R', 's.i.k.t.i.r', 'Siktirgit', 'orospu', 'Orrrospu çocuğu', 'amk', 'göt', 'yarrak', 'şerefsiz', 'sikerim',
    'fuck', 'F.U.C.K', 'fuuuck', 'motherfucker', 'Arschloch', 'Hurensohn', 'Fick dich', 'puta', 'cazzo', 'kurwa', 'блядь', 'сука',
    'sharmouta', 'كسمك', 'Hitler', '1488', 'nazi', 'pussy'];
  for (const n of bad) assert.equal(checkName(n).ok, false, `sollte gesperrt sein: ${n}`);
  const good = ['Paşa', 'Duman', 'Pamuk', 'Tarçın', 'Boncuk', 'Şeker', 'Kömür', 'Fındık', 'Işıkım', 'Sıkıntı', 'Sıkı', 'Klasik', 'Sikke',
    'Computadora', 'Torpedo', 'Amina', 'Amin', 'Hür', 'Goten', 'Kayarak', 'Sam I am', 'Nazife', 'Gotik', 'Marsch', 'Bayrak', 'Kedi2024',
    'Massachusetts', 'Classic', 'Cocktail', 'Dickens', 'Hancock', 'Pusula', 'Moda Kedisi', 'Bahariye Paşası'];
  for (const n of good) assert.equal(checkName(n).ok, true, `sollte erlaubt sein: ${n}`);
  assert.equal(checkName('Admin', { kind: 'player' }).reason, 'reserved');
  assert.equal(checkName('Admin', { kind: 'cat' }).ok, true);
});

test('Gutscheincodes und Namen', () => {
  const c = makeCode();
  assert.match(c, /^CAT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(normalizeCode(c.toLowerCase().replace(/-/g, ' ')), c);
  assert.equal(normalizeCode(`CATME:${c}`), c);
  assert.equal(normalizeCode(c.slice(4).replace('-', '')), c, 'ohne Präfix');
  assert.equal(normalizeCode('CAT-0000-1111'), null, '0 und 1 gibt es nicht');
  assert.equal(cleanName('  Paşa  '), 'Paşa');
  assert.equal(cleanName('<script>'), null);
  assert.equal(cleanName('a'), null);
});

test('Wiedererkennung: gleiche Katze nah dran vs. Widersprüche', () => {
  const colors = { black: 0.1, white: 0.1, gray: 0.1, orange: 0.6, cream: 0.05, brown: 0.05 };
  const cat = { lastLat: 40.9842, lastLon: 29.0262, lastSeenAt: 0, fingerprint: { colors }, profile: { pattern: 'sarman', eye_color: 'yellow', ear_tip: 'tipped' } };
  const same = scoreCandidate({ lat: 40.9843, lon: 29.0263, at: 1, fingerprint: { colors }, analysis: { pattern: 'sarman', eye_color: 'yellow', ear_tip: 'tipped' } }, cat);
  assert.ok(same.score > 0.85, `Score ${same.score}`);
  const untipped = scoreCandidate({ lat: 40.9843, lon: 29.0263, at: 1, fingerprint: { colors }, analysis: { pattern: 'sarman', eye_color: 'yellow', ear_tip: 'none' } }, cat);
  assert.ok(untipped.score < same.score - 0.3, 'Ohrmarke kann nicht verschwinden');
  const far = scoreCandidate({ lat: 40.9600, lon: 29.0800, at: 1, fingerprint: { colors }, analysis: { pattern: 'sarman' } }, cat);
  assert.equal(far.score, 0);
  assert.equal(decide([{ score: 0.9 }], GAME.reid).action, 'link');
  assert.equal(decide([{ score: 0.7 }], GAME.reid).action, 'new');
  assert.equal(decide([{ score: 0.7 }], GAME.reid).needsReview, true);
  assert.equal(decide([{ score: 0.7 }], GAME.reid, { hasVerifier: true }).action, 'verify');
  assert.equal(decide([], GAME.reid).action, 'new');
});

test('Tagesaufgaben sind pro Tag für alle gleich', () => {
  const a = questsFor('2026-10-04', REGIONS[0], GAME);
  const b = questsFor('2026-10-04', REGIONS[0], GAME);
  assert.deepEqual(a, b);
  assert.equal(a.length, GAME.quests.perDay);
  assert.equal(new Set(a.map((q) => q.kind)).size, a.length, 'verschiedene Aufgabentypen');
});

test('Namen: persischer Halbabstand und arabische Vokalzeichen erlaubt, Zeichen-Türme nicht', () => {
  assert.equal(cleanName('گربه‌دوست'), 'گربه‌دوست');
  assert.equal(cleanName('‌گربه‌‌ها‌'), 'گربه‌ها');
  assert.equal(cleanName('گربه ‌ دوست'), 'گربه دوست');
  assert.equal(cleanName('مُحَمَّد'), 'مُحَمَّد');
  assert.equal(cleanName('Ayşe'), 'Ayşe');
  assert.equal(cleanName('Zé́́́ynep'), null, 'Akzent-Turm');
  assert.equal(cleanName('́Ayla'), null, 'beginnt mit Akzent');
  assert.equal(cleanName('Ay​la'), null, 'Nullbreiten-Leerzeichen bleibt verboten');
  assert.equal(cleanName('Ay‍la'), null, 'ZWJ bleibt verboten');
  // Schimpfwort mit Halbabstand dazwischen wird trotzdem erkannt
  const sneaky = cleanName('sik‌tir');
  assert.ok(sneaky);
  assert.equal(checkName(sneaky).ok, false);
});
