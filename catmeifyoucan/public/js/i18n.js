// Cat Me If You Can – Oberflächentexte in 6 Sprachen: Türkisch, Englisch, Deutsch, Russisch, Arabisch,
// Persisch (die häufigsten Gäste Istanbuls). Texte liegen in js/lang/<code>.js, Enum-Beschriftungen in
// core/labels/. Fehlender Schlüssel → Englisch → Türkisch.

import { label as enumLabel } from '../core/taxonomy.js';
import tr from './lang/tr.js';
import en from './lang/en.js';
import de from './lang/de.js';
import ru from './lang/ru.js';
import ar from './lang/ar.js';
import fa from './lang/fa.js';

const STRINGS = { tr, en, de, ru, ar, fa };

/** Reihenfolge = Reihenfolge in der Sprachauswahl. dir: Schreibrichtung. */
export const LANG_INFO = {
  tr: { name: 'Türkçe', short: 'TR', dir: 'ltr', locale: 'tr-TR' },
  en: { name: 'English', short: 'EN', dir: 'ltr', locale: 'en-GB' },
  de: { name: 'Deutsch', short: 'DE', dir: 'ltr', locale: 'de-DE' },
  ru: { name: 'Русский', short: 'RU', dir: 'ltr', locale: 'ru-RU' },
  ar: { name: 'العربية', short: 'AR', dir: 'rtl', locale: 'ar' },
  fa: { name: 'فارسی', short: 'FA', dir: 'rtl', locale: 'fa-IR' },
};
export const LANGS = Object.keys(LANG_INFO);

function detect() {
  try {
    const saved = localStorage.getItem('catme.lang');
    if (saved && STRINGS[saved]) return saved;
  } catch {
    /* kein Storage */
  }
  const list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
  for (const l of list) {
    const c = String(l || '').slice(0, 2).toLowerCase();
    if (STRINGS[c]) return c;
  }
  return 'en'; // Gäste aus aller Welt: Englisch als Rückfall
}

let lang = detect();
applyDocLang();

function applyDocLang() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = LANG_INFO[lang].dir;
}

export function getLang() {
  return lang;
}

export function isRtl() {
  return LANG_INFO[lang].dir === 'rtl';
}

export function locale() {
  return LANG_INFO[lang].locale;
}

export function setLang(l) {
  if (!STRINGS[l]) return;
  lang = l;
  try {
    localStorage.setItem('catme.lang', l);
  } catch {
    /* egal */
  }
  applyDocLang();
}

const pluralRules = new Map();
function pluralCategory(n) {
  let pr = pluralRules.get(lang);
  if (!pr) pluralRules.set(lang, (pr = new Intl.PluralRules(LANG_INFO[lang].locale)));
  return pr.select(Number(n));
}

export function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? STRINGS.tr[key] ?? key;
  if (s && typeof s === 'object') {
    // Plural als Objekt {one, few, many, other}
    const cat = vars && vars.n != null ? pluralCategory(vars.n) : 'other';
    s = s[cat] ?? s.other ?? Object.values(s)[0];
  } else if (s.includes('|') && vars && vars.n != null) {
    // Kurzform Singular|Plural
    const [one, other] = s.split('|');
    s = Number(vars.n) === 1 ? one : other;
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  return s;
}

/** Enum-Beschriftung aus core/taxonomy.js in der aktuellen Sprache. */
export function L(table, key) {
  return enumLabel(table, key, lang);
}

/** Übersetzbare Objekte {tr, en, de, …} → aktuelle Sprache (Rückfall Englisch, dann Türkisch). */
export function tx(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.tr || '';
}
