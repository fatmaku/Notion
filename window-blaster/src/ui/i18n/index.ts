// Language-aware string tables. Every UI module imports `T`, `MODES`, … from here (or from the
// legacy './de' path, which re-exports this module). The exported objects are proxies over the
// table of the active language, so a language switch takes effect on the next render without a
// reload. German is the source of truth; `strings.en.ts` must mirror its shape (type-checked).
import * as de from './strings.de';
import * as en from './strings.en';

export type Lang = 'de' | 'en';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
];

type Tables = typeof de;
const tables: Record<Lang, Tables> = { de, en };
let lang: Lang = 'de';
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang): void {
  if (l !== 'de' && l !== 'en') return;
  if (l === lang) return;
  lang = l;
  try {
    document.documentElement.lang = l;
  } catch {
    /* no DOM */
  }
  for (const fn of listeners) fn(l);
}

export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Browser preference → supported language ('de' unless the browser is clearly English). */
export function detectLang(navLang: string | undefined = typeof navigator !== 'undefined' ? navigator.language : undefined): Lang {
  return navLang && /^en\b/i.test(navLang) ? 'en' : 'de';
}

function proxyOf<K extends keyof Tables>(name: K): Tables[K] {
  const table = () => tables[lang][name] as unknown as Record<PropertyKey, unknown>;
  return new Proxy({} as Record<PropertyKey, unknown>, {
    get: (_, p) => table()[p],
    has: (_, p) => p in table(),
    ownKeys: () => Reflect.ownKeys(table()),
    getOwnPropertyDescriptor: (_, p) => (p in table() ? { enumerable: true, configurable: true, writable: false, value: table()[p] } : undefined),
  }) as unknown as Tables[K];
}

export const T = proxyOf('T');
export const VEHICLES = proxyOf('VEHICLES');
export const MODES = proxyOf('MODES');
export const WEAPON_TEXT = proxyOf('WEAPON_TEXT');
export const SHOP = proxyOf('SHOP');

/** Fills `{name}` placeholders: tf(T.greeting, { name: 'Anna' }). */
export function tf(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Locale for dates and numbers. */
export function locale(): string {
  if (lang === 'de') return 'de-DE';
  // English: follow the device's English variant (en-US dates read month first)
  const n = typeof navigator !== 'undefined' ? navigator.language : '';
  return /^en-[A-Z]{2}$/i.test(n) ? n : 'en-GB';
}

/** Picks one of several variants (e.g. kill feed lines) by index. */
export function pick<V>(list: readonly V[], i: number): V {
  return list[((i % list.length) + list.length) % list.length];
}
