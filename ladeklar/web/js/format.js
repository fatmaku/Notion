// Formatting helpers (time zone Europe/Berlin, locale from the UI language) and HTML escaping.
const TZ = 'Europe/Berlin';
const LOCALE = { de: 'de-DE', en: 'en-GB', pl: 'pl-PL', ro: 'ro-RO', cs: 'cs-CZ', tr: 'tr-TR', ru: 'ru-RU', uk: 'uk-UA' };
let lang = 'de';
export const setFormatLang = (l) => { lang = l; };
const loc = () => LOCALE[lang] || 'de-DE';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;

export function time(ms) { return ms ? new Intl.DateTimeFormat(loc(), { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(ms) : ''; }
export function dateTime(ms) { return ms ? new Intl.DateTimeFormat(loc(), { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms) : ''; }
export function longDate(ms) { return ms ? new Intl.DateTimeFormat(loc(), { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(ms) : ''; }
export function dayLabel(iso, t) {
  if (!iso) return '';
  const today = isoToday();
  if (iso === today) return t('Heute');
  if (iso === addDays(today, 1)) return t('Morgen');
  if (iso === addDays(today, -1)) return t('Gestern');
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(loc(), { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit' }).format(Date.UTC(y, m - 1, d));
}
export function isoToday(ms = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
export function window_(p) { return p?.from && p?.to ? `${p.from}–${p.to}` : p?.from ? `ab ${p.from}` : p?.to ? `bis ${p.to}` : ''; }

export function ago(ms, t) {
  if (!ms) return '';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return t('gerade eben');
  const m = Math.round(s / 60);
  if (m < 60) return t('vor {n} Min.', { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t('vor {n} Std.', { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? t('gestern') : t('vor {n} Tagen', { n: d });
}
export function minutes(n, t) { if (n == null) return '–'; const h = Math.floor(n / 60), m = n % 60; return h ? t('{h} Std. {m} Min.', { h, m }) : t('{m} Min.', { m }); }
export function euro(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n || 0); }
export function num(n, d = 0) { return n == null ? '–' : new Intl.NumberFormat(loc(), { maximumFractionDigits: d }).format(n); }
export function kg(n) { return n == null ? '' : n >= 1000 ? `${num(n / 1000, 1)} t` : `${num(n)} kg`; }
export function phoneHref(p) { return 'tel:' + String(p || '').replace(/[^\d+]/g, ''); }
/** +4917610000004 → +49 176 10000004 · +497114006200 → +49 711 4006200 (stored numbers are E.164-like). */
export function phone(p) {
  const s = String(p || '').trim();
  const d = s.replace(/[^\d+]/g, '');
  if (!/^\+\d{8,15}$/.test(d)) return s;
  if (d.startsWith('+49')) {
    const n = d.slice(3);
    // mobile 15x/16x/17x and most area codes have 3 digits; Berlin, Hamburg, Frankfurt, München have 2
    const cut = /^(30|40|69|89)/.test(n) ? 2 : 3;
    return `+49 ${n.slice(0, cut)} ${n.slice(cut)}`;
  }
  const cc = /^\+(1|7|2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|8[1246]|9[0-58])/.exec(d)?.[0] || d.slice(0, 4);
  return `${cc} ${d.slice(cc.length).replace(/(\d{3})(?=\d{3})/g, '$1 ')}`;
}
const isApple = () => typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
/** Route to the place: Apple Karten on iPhone/iPad, Google Maps everywhere else. */
export function mapsHref(p) {
  const q = [p?.place, p?.street, [p?.zip, p?.city].filter(Boolean).join(' '), p?.country && p.country !== 'DE' ? p.country : ''].filter(Boolean).join(', ');
  return isApple() ? 'https://maps.apple.com/?dirflg=d&daddr=' + encodeURIComponent(q) : 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q);
}
export function address(p) { return [p?.street, [p?.zip, p?.city].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
export const initials = (name) => (String(name || '?').split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
