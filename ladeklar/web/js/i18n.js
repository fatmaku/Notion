// UI translations, gettext style: the German text is the key. t('Neue Lieferung') returns the
// text in the current language, falling back to English for staff screens and to German.
// Placeholders: t('vor {n} Min.', { n: 5 }). Dictionaries live in ./lang/<code>.js.
import { LANGS, LANG_NAMES, statusText, stepText, problemText, PROBLEM_TEXT, NOTE_SHORTCUTS } from '../../core/texts.js';
import en from './lang/en.js';
import tr from './lang/tr.js';
import pl from './lang/pl.js';
import ro from './lang/ro.js';
import ru from './lang/ru.js';
import uk from './lang/uk.js';
import cs from './lang/cs.js';
import { setFormatLang } from './format.js';

const DICT = { en, tr, pl, ro, ru, uk, cs };
let current = 'de';

export { LANGS, LANG_NAMES };
export const getLang = () => current;
export function setLang(l) {
  current = LANGS.includes(l) ? l : 'de';
  setFormatLang(current);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}
export function detectLang() {
  try { const s = localStorage.getItem('lk.lang'); if (s && LANGS.includes(s)) return s; } catch { /* storage blocked */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'de').slice(0, 2).toLowerCase();
  return LANGS.includes(nav) ? nav : 'de';
}
export function rememberLang(l) { try { localStorage.setItem('lk.lang', l); } catch { /* storage blocked */ } }

export function t(key, params) {
  // 'Fahrer|login': the German text is the part before the bar, the rest only separates translations
  const bar = key.indexOf('|');
  const de = bar > 0 ? key.slice(0, bar) : key;
  let s = current === 'de' ? de : DICT[current]?.[key] ?? DICT.en?.[key] ?? de;
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] == null ? '' : String(params[k])));
  return s;
}
export const tStatus = (s) => statusText(current, s);
export const tStep = (s) => stepText(current, s);
export const tProblem = (p) => problemText(current, p);
export const problemCodes = () => Object.keys(PROBLEM_TEXT.de);
export const noteShortcuts = () => NOTE_SHORTCUTS[current] || NOTE_SHORTCUTS.en;
