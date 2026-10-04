// Cat Me If You Can – Katzenanalyse: gemeinsames Format, JSON-Schema für die KI, Normalisierung und eine
// einfache Analyse ohne KI (Fellfarben aus dem Fingerabdruck).
//
// Wichtig: Alles hier sind *Schätzungen aus einem Foto*. Die Oberfläche sagt das auch so.

import {
  PATTERNS, COAT_COLORS, EYE_COLORS, AGE_GROUPS, BCS_CLASSES, SEX, EAR_TIP, HEALTH_FLAGS,
  SEVERITY, BEHAVIOR, SETTINGS, RARITY, OWNERSHIP,
} from './taxonomy.js';

const keys = (o) => Object.keys(o);
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const str = { type: 'string' };
const num = { type: 'number' };
const int = { type: 'integer' };
const bool = { type: 'boolean' };
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const enumOf = (o) => ({ type: 'string', enum: keys(o) });

/** JSON-Schema der Analyse (Structured Outputs). Zahlenbereiche erzwingt normalizeAnalysis(). */
export const ANALYSIS_SCHEMA = obj({
  is_cat: bool,
  cat_count: int,
  is_live_photo: bool,
  ownership: enumOf(OWNERSHIP),
  ownership_reason: str,
  photo_quality: { type: 'string', enum: ['good', 'ok', 'poor'] },
  main_cat_box: nullable(obj({ x: num, y: num, w: num, h: num })),
  pattern: enumOf(PATTERNS),
  coat_colors: { type: 'array', items: enumOf(COAT_COLORS) },
  long_hair: bool,
  eye_color: enumOf(EYE_COLORS),
  breed_guess: str,
  breed_confidence: num,
  age_group: enumOf(AGE_GROUPS),
  age_months_min: nullable(int),
  age_months_max: nullable(int),
  weight_kg_min: nullable(num),
  weight_kg_max: nullable(num),
  body_condition_score: nullable(int),
  sex_guess: enumOf(SEX),
  sex_reason: str,
  ear_tip: enumOf(EAR_TIP),
  collar: bool,
  health_flags: { type: 'array', items: enumOf(HEALTH_FLAGS) },
  health_severity: enumOf(SEVERITY),
  health_notes: str,
  behavior: enumOf(BEHAVIOR),
  setting: enumOf(SETTINGS),
  people_visible: bool,
  distinctive_marks: str,
  nickname_ideas: { type: 'array', items: str },
  summary_tr: str,
  summary_de: str,
  summary_en: str,
  summary_ru: str,
  summary_ar: str,
  summary_fa: str,
  confidence: num,
});

const pick = (table, v, fallback) => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(table, v) ? v : fallback);
const clampNum = (v, lo, hi) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, Number(v))) : null);
const clampInt = (v, lo, hi) => {
  const n = clampNum(v, lo, hi);
  return n == null ? null : Math.round(n);
};
const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max) : '');
const uniqList = (arr, table, max) => {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const v of arr) if (typeof v === 'string' && table[v] && !out.includes(v)) out.push(v);
  return out.slice(0, max);
};

export function bcsClass(score) {
  if (!Number.isFinite(score)) return 'unknown';
  if (score <= 2) return 'very_thin';
  if (score === 3) return 'thin';
  if (score <= 5) return 'ideal';
  if (score <= 7) return 'overweight';
  return 'obese';
}

/**
 * Macht aus beliebiger (KI- oder Client-)Ausgabe ein sicheres, vollständiges Analyse-Objekt.
 * Unbekannte Enum-Werte → neutraler Wert, Zahlen geklemmt, Texte gekürzt.
 */
export function normalizeAnalysis(raw, { analyzer = 'unknown', model = null } = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  let ageMin = clampInt(r.age_months_min, 0, 300);
  let ageMax = clampInt(r.age_months_max, 0, 300);
  if (ageMin != null && ageMax != null && ageMin > ageMax) [ageMin, ageMax] = [ageMax, ageMin];
  let wMin = clampNum(r.weight_kg_min, 0.1, 12);
  let wMax = clampNum(r.weight_kg_max, 0.1, 12);
  if (wMin != null && wMax != null && wMin > wMax) [wMin, wMax] = [wMax, wMin];
  const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const bcs = clampInt(r.body_condition_score, 1, 9);
  let box = null;
  if (r.main_cat_box && typeof r.main_cat_box === 'object') {
    const b = r.main_cat_box;
    const x = clampNum(b.x, 0, 1), y = clampNum(b.y, 0, 1), w = clampNum(b.w, 0, 1), h = clampNum(b.h, 0, 1);
    if (x != null && y != null && w && h) box = { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
  }
  const flags = uniqList(r.health_flags, HEALTH_FLAGS, 8);
  let severity = pick(SEVERITY, r.health_severity, flags.length ? 'mild' : 'none');
  if (flags.includes('very_thin') || flags.includes('eye_injury') || flags.includes('wound')) {
    if (SEVERITY[severity].rank < SEVERITY.attention.rank) severity = 'attention';
  }
  const ageGroup = pick(AGE_GROUPS, r.age_group, 'unknown');
  return {
    is_cat: r.is_cat === true,
    cat_count: clampInt(r.cat_count, 0, 50) ?? (r.is_cat === true ? 1 : 0),
    is_live_photo: r.is_live_photo !== false,
    ownership: pick(OWNERSHIP, r.ownership, 'unclear'),
    ownership_reason: text(r.ownership_reason, 160),
    photo_quality: ['good', 'ok', 'poor'].includes(r.photo_quality) ? r.photo_quality : 'ok',
    main_cat_box: box,
    pattern: pick(PATTERNS, r.pattern, 'diger'),
    coat_colors: uniqList(r.coat_colors, COAT_COLORS, 4),
    long_hair: r.long_hair === true,
    eye_color: pick(EYE_COLORS, r.eye_color, 'unknown'),
    breed_guess: text(r.breed_guess, 80),
    breed_confidence: clampNum(r.breed_confidence, 0, 1) ?? 0,
    age_group: ageGroup,
    age_months_min: ageMin,
    age_months_max: ageMax,
    weight_kg_min: round1(wMin),
    weight_kg_max: round1(wMax),
    body_condition_score: bcs,
    body_condition: bcsClass(bcs),
    sex_guess: pick(SEX, r.sex_guess, 'unknown'),
    sex_reason: text(r.sex_reason, 160),
    ear_tip: pick(EAR_TIP, r.ear_tip, 'not_visible'),
    collar: r.collar === true,
    health_flags: flags,
    health_severity: severity,
    // false = Gesundheit wurde nicht beurteilt (einfache Analyse) – nicht als „gesund“ zählen
    health_assessed: r.health_assessed !== false,
    health_notes: text(r.health_notes, 300),
    behavior: pick(BEHAVIOR, r.behavior, 'unknown'),
    setting: pick(SETTINGS, r.setting, 'other'),
    people_visible: r.people_visible === true,
    distinctive_marks: text(r.distinctive_marks, 200),
    nickname_ideas: Array.isArray(r.nickname_ideas) ? r.nickname_ideas.map((s) => text(s, 24)).filter(Boolean).slice(0, 4) : [],
    summary: {
      tr: text(r.summary_tr, 220), de: text(r.summary_de, 220), en: text(r.summary_en, 220),
      ru: text(r.summary_ru, 220), ar: text(r.summary_ar, 220), fa: text(r.summary_fa, 220),
    },
    confidence: clampNum(r.confidence, 0, 1) ?? 0.5,
    analyzer,
    model,
  };
}

/** Grundseltenheit aus dem Fellmuster, Sonderfälle heben sie an. Legenden setzt die Moderation. */
export function rarityOf(analysis, { legendary = false } = {}) {
  if (legendary) return 'legendary';
  let r = (PATTERNS[analysis.pattern] || PATTERNS.diger).rarity;
  const order = keys(RARITY);
  const bump = () => {
    r = order[Math.min(order.indexOf(r) + 1, order.indexOf('epic'))];
  };
  if (analysis.eye_color === 'odd') bump();
  if (analysis.long_hair) bump();
  if (analysis.eye_color === 'blue' && analysis.pattern !== 'renk_uclu') bump();
  return r;
}

/**
 * Analyse ohne KI: Fellmuster aus den Farbanteilen des Ausschnitts, sonst neutrale Werte.
 * Ehrlich: Alter, Gewicht und Gesundheit lassen sich so nicht schätzen → „unbekannt“.
 */
export function heuristicAnalysis({ fingerprint, detector } = {}) {
  const c = (fingerprint && fingerprint.colors) || null;
  const detected = detector && Number(detector.score) >= 0.4;
  const raw = {
    is_cat: detector ? !!detected || detector.score == null : true,
    cat_count: 1,
    is_live_photo: true,
    ownership: 'unclear',
    photo_quality: 'ok',
    main_cat_box: detector && detector.box ? detector.box : null,
    pattern: c ? guessPattern(c) : 'diger',
    coat_colors: c ? Object.entries(c).filter(([, v]) => v >= 0.12).sort((a, b) => b[1] - a[1]).map(([k]) => k) : [],
    eye_color: 'unknown',
    breed_guess: '',
    breed_confidence: 0,
    age_group: 'unknown',
    sex_guess: 'unknown',
    ear_tip: 'not_visible',
    health_flags: [],
    health_severity: 'none',
    health_assessed: false,
    behavior: 'unknown',
    setting: 'other',
    confidence: 0.3,
  };
  if (raw.pattern === 'uc_renk') {
    raw.sex_guess = 'female';
    raw.sex_reason = 'Üç renkli kediler neredeyse her zaman dişidir.';
  }
  return normalizeAnalysis(raw, { analyzer: 'heuristic' });
}

/** Fellmuster aus Farbanteilen (Regeln grob nach Häufigkeit in Istanbul). */
export function guessPattern(c) {
  const v = (k) => c[k] || 0;
  const white = v('white');
  const orange = v('orange') + v('cream') * 0.5;
  const black = v('black');
  const gray = v('gray');
  const brown = v('brown');
  const dark = black + brown;
  if (orange > 0.12 && black > 0.12) return white > 0.12 ? 'uc_renk' : 'kaplumbaga';
  if (white > 0.6 && orange > 0.05) return 'van';
  if (white > 0.7) return 'beyaz';
  if (v('orange') > 0.35) return white > 0.18 ? 'sarman_beyaz' : 'sarman';
  if (v('cream') > 0.35) return v('brown') > 0.15 ? 'renk_uclu' : 'krem';
  if (black > 0.55 && white < 0.12 && brown < 0.2) return 'siyah';
  if (black > 0.3 && white > 0.18) return 'smokin';
  if (gray > 0.4 && white > 0.18) return 'gri_beyaz';
  if (gray > 0.5 && brown < 0.15) return 'gri';
  if (dark + gray > 0.45) return white > 0.18 ? 'tekir_beyaz' : 'tekir';
  return 'diger';
}

/** Türkischer Ablativ mit Vokalharmonie und Konsonantenangleichung: Moda'dan, Kadıköy'den, Kozyatağı'ndan. */
export function trAblative(name) {
  const lower = name.toLocaleLowerCase('tr');
  const vowels = lower.match(/[aeıioöuü]/g) || ['e'];
  const back = 'aıou'.includes(vowels[vowels.length - 1]);
  const last = lower[lower.length - 1];
  const endsVowel = 'aeıioöuü'.includes(last);
  const hard = 'çfhkpsşt'.includes(last);
  // Possessiv-Endung (…ağı, …yolu) bekommt ein -n-: Kozyatağı'ndan; sonst Vokal + d: Moda'dan
  const possessive = endsVowel && /(ğı|ği|yolu|köyü|başı|yatağı)$/.test(lower);
  const d = hard ? 't' : 'd';
  return `${name}'${possessive ? 'n' : ''}${d}${back ? 'an' : 'en'}`;
}

/** Kurztext ohne KI, damit jede Karte etwas zu sagen hat. */
export function fallbackSummary(analysis, districtName, lang) {
  const p = PATTERNS[analysis.pattern] || PATTERNS.diger;
  const name = (p.label && (p.label[lang] || p.label.en)) || p.label.tr;
  const where = districtName || 'Kadıköy';
  if (lang === 'de') return `${name} aus ${where}.`;
  if (lang === 'en') return `A ${name.toLowerCase()} from ${where}.`;
  if (lang === 'ru') return `${name} из района ${where}.`;
  if (lang === 'ar') return `${name} من ${where}.`;
  if (lang === 'fa') return `${name} از ${where}.`;
  return `${trAblative(where)} bir ${name.toLocaleLowerCase('tr')}.`;
}

export { BCS_CLASSES };
