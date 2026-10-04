// Cat Me If You Can – kleine UI-Helfer: Escaping, Formatierung, Toasts, Dialoge, Chips.

import { t, L, getLang, locale as langLocale } from './i18n.js';
import { CAT_STATUS, SEVERITY, RARITY, PATTERNS } from '../core/taxonomy.js';
import { catAvatarDataUrl } from './avatar.js';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Ereignis-Delegation: on(root, 'click', '[data-act]', (e, el) => …) */
export function on(root, type, selector, fn) {
  root.addEventListener(type, (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) fn(e, el);
  });
}

export const locale = () => langLocale();
const TZ = 'Europe/Istanbul';

export function fmtNum(n) {
  return n == null ? '–' : new Intl.NumberFormat(locale()).format(n);
}

export function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '';
}

export function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '';
}

export function fmtDateTime(ts) {
  return ts ? `${fmtDate(ts)} · ${fmtTime(ts)}` : '';
}

export function fmtAgo(ts, now = Date.now()) {
  if (!ts) return '';
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 60) return t('common.now');
  if (s < 3600) return t('common.minAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return t('common.hAgo', { n: Math.floor(s / 3600) });
  if (s < 86400 * 14) return t('common.dAgo', { n: Math.floor(s / 86400) });
  return fmtDate(ts);
}

export function fmtAge(min, max) {
  if (min == null && max == null) return t('common.unknown');
  const a = min ?? max;
  const b = max ?? min;
  if (b < 24) return `${a}–${b} ${t('card.months')}`;
  const y = (m) => Math.round((m / 12) * 2) / 2;
  return y(a) === y(b) ? `~${y(a)} ${t('card.years')}` : `${y(a)}–${y(b)} ${t('card.years')}`;
}

export function fmtWeight(min, max) {
  if (min == null && max == null) return t('common.unknown');
  const f = (v) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v);
  return min === max || max == null ? `~${f(min ?? max)} kg` : `${f(min)}–${f(max)} kg`;
}

export function stars(rarity) {
  const n = (RARITY[rarity] || RARITY.common).stars;
  return `<span class="stars r-${esc(rarity || 'common')}" title="${esc(L(RARITY, rarity || 'common'))}">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

export function statusChip(status) {
  const s = CAT_STATUS[status] ? status : 'active';
  return `<span class="chip st-${s}">${t(`status.icon.${s}`)} ${esc(L(CAT_STATUS, s))}</span>`;
}

const SEV_ICON = { none: '✓', mild: '!', attention: '⚠', urgent: '🆘' };
export function severityChip(sev) {
  const s = SEVERITY[sev] ? sev : 'none';
  return `<span class="chip sev-${s}"><b aria-hidden="true">${SEV_ICON[s]}</b> ${esc(L(SEVERITY, s))}</span>`;
}

export function patternLabel(p) {
  return L(PATTERNS, p || 'diger');
}

/** Bild einer Katze: Foto-Ausschnitt oder gezeichneter Avatar. */
export function catImg(cat, { size = 'md', cls = '' } = {}) {
  const src = cat && cat.photoUrl ? cat.photoUrl : catAvatarDataUrl(cat || {});
  const alt = cat && cat.name ? cat.name : patternLabel(cat && (cat.pattern || (cat.profile && cat.profile.pattern)));
  return `<img class="catimg ${esc(size)} ${esc(cls)}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}

export function catName(cat) {
  return cat && cat.name ? esc(cat.name) : `<span class="muted">${esc(t('card.unnamed'))}</span>`;
}

// ---------------------------------------------------------------- Toasts & Dialoge

let toastHost = null;
export function toast(msg, { type = 'info', ms = 3200 } = {}) {
  if (!toastHost || !document.body.contains(toastHost)) {
    toastHost = document.createElement('div');
    toastHost.className = 'toasts';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.append(toastHost);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastHost.append(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

export function modal(html, { onClose, cls = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `modal-wrap ${cls}`;
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="modal-x" data-close aria-label="${esc(t('common.close'))}">✕</button>${html}</div>`;
  document.body.append(wrap);
  document.body.classList.add('has-modal');
  const close = () => {
    wrap.remove();
    if (!document.querySelector('.modal-wrap')) document.body.classList.remove('has-modal');
    if (onClose) onClose();
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  const onKey = (e) => {
    if (e.key === 'Escape' && document.body.contains(wrap)) {
      document.removeEventListener('keydown', onKey);
      close();
    }
  };
  document.addEventListener('keydown', onKey);
  const first = wrap.querySelector('input, button:not(.modal-x), [tabindex]');
  if (first) setTimeout(() => first.focus(), 30);
  return { el: wrap.querySelector('.modal'), close };
}

/** Fehlermeldung aus einer API-Antwort (code → übersetzter Text). */
export function errorText(err) {
  if (!err) return t('err.generic');
  if (err.code === 'network') return t('err.network');
  const d = err.details || {};
  const key = `err.${err.code}`;
  const vars = { s: d.retryAfter, n: d.needed != null && d.count != null ? d.needed - d.count : '' };
  const txt = t(key, vars);
  return txt === key ? err.message || t('err.generic') : txt;
}

export function confetti(root = document.body, n = 40) {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#f28c28', '#1f8a8a', '#f6d55c', '#e87ba4', '#fbf3e4'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(p);
  }
  root.append(box);
  setTimeout(() => box.remove(), 2600);
}

/** Prozentangabe in Landesschreibweise: TR „%20“, DE „20 %“, EN „20%“. */
export function pct(n) {
  const l = getLang();
  if (l === 'tr') return `%${n}`;
  if (l === 'de') return `${n} %`;
  if (l === 'ar' || l === 'fa') return `${new Intl.NumberFormat(locale()).format(n)}٪`;
  return `${n}%`;
}
