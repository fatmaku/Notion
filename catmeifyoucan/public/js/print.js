// Cat Me If You Can – Druckvorlagen für Partner-Cafés (print.html): Tischaufsteller (2 × A6 auf A4,
// Vorderseite mit QR, Rückseite mit 4 Regeln), runde Sticker (6 × 80 mm auf A4) und Poster (A4).
// Texte Türkisch + Englisch, auf Wunsch eine dritte Sprache (de/ru/ar/fa, ar/fa von rechts nach links).
// Café: ?cafe=<placeId> (nur öffentliche Daten) oder die angemeldete Café-Sitzung (partner.html);
// ohne Café die allgemeine Version mit QR zur Startseite. Druck in echten Millimetern: css/print.css.
// Ohne Server (statisch gehostet) läuft die Engine im Browser mit den Demo-Cafés (api.js, Demo-Modus).

import { RemoteApi, createLocalApi } from './api.js';
import { t, LANG_INFO } from './i18n.js';
import { esc, isolate } from './ui.js';
import { qrSvgFor, refLink, shortLink, isLocalAddress } from './views/cafe.js';
import tr from './lang/tr.js';
import en from './lang/en.js';
import de from './lang/de.js';
import ru from './lang/ru.js';
import ar from './lang/ar.js';
import fa from './lang/fa.js';

const STR = { tr, en, de, ru, ar, fa };
const BASE_LANGS = ['tr', 'en'];
const EXTRA_LANGS = ['de', 'ru', 'ar', 'fa'];
const LAYOUTS = ['tent', 'sticker', 'poster'];
const PARTNER_TOKEN = 'catme.partner.token';

const params = new URLSearchParams(location.search);
const state = {
  layout: LAYOUTS.includes(params.get('layout')) ? params.get('layout') : 'tent',
  lang3: EXTRA_LANGS.includes(params.get('lang3')) ? params.get('lang3') : '',
  kit: null,
  link: '',
  notFound: false,
  qr: { big: '', small: '' },
  cafes: [],
};
let api = null;

// ---------------------------------------------------------------- Texte in einer bestimmten Sprache

const plural = new Map();
const numbers = new Map();
function fmtNum(l, n) {
  let f = numbers.get(l);
  if (!f) numbers.set(l, (f = new Intl.NumberFormat(LANG_INFO[l].locale, { maximumFractionDigits: 1 })));
  return f.format(n);
}

/** Wie t() aus i18n.js, aber für eine feste Sprache (auf einem Blatt stehen mehrere Sprachen). */
export function tl(l, key, vars = {}) {
  let s = STR[l][key] ?? STR.en[key] ?? key;
  if (s && typeof s === 'object') {
    let pr = plural.get(l);
    if (!pr) plural.set(l, (pr = new Intl.PluralRules(LANG_INFO[l].locale)));
    s = s[vars.n != null ? pr.select(Number(vars.n)) : 'other'] ?? s.other;
  } else if (s.includes('|') && vars.n != null) {
    const [one, other] = s.split('|');
    s = Number(vars.n) === 1 ? one : other;
  }
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : typeof vars[k] === 'number' ? fmtNum(l, vars[k]) : String(vars[k])));
}

/** Prozent wie ui.js pct(), aber für eine feste Sprache (BRAND.md: tr „%20“, de „20 %“, fa „۲۰٪“). */
export function pctIn(l, n) {
  if (l === 'tr') return `%${n}`;
  if (l === 'de') return `${n} %`;
  if (l === 'ar' || l === 'fa') return new Intl.NumberFormat(LANG_INFO[l].locale, { style: 'percent', maximumFractionDigits: 1 }).format(n / 100);
  return `${n}%`;
}

const sheetLangs = () => [...BASE_LANGS, ...(state.lang3 ? [state.lang3] : [])];
const attrs = (l) => `lang="${l}" dir="${LANG_INFO[l].dir}"`;

/** Ein Text in allen Blatt-Sprachen untereinander (1. Sprache groß, weitere kleiner). */
function ml(key, cls, vars = () => ({})) {
  return `<div class="ml ${cls || ''}">${sheetLangs().map((l, i) => `<p class="l${i + 1}" ${attrs(l)}>${esc(tl(l, key, vars(l)))}</p>`).join('')}</div>`;
}

function offerVars() {
  const k = state.kit;
  const n = k.cafe ? k.cafe.minCats : k.dailyGoal;
  const p = k.cafe ? k.cafe.discountPct : k.discountPct;
  return (l) => ({ n, pct: pctIn(l, p) });
}
const offerKey = () => (state.kit.cafe ? 'print.offer' : 'print.offerAll');

/** Regel „📸 Nur fotografieren.“ → [Emoji, Text]. */
function splitEmoji(s) {
  const m = /^(\S+)\s+(.*)$/su.exec(s);
  return m && !/[\p{L}\p{N}]/u.test(m[1]) ? [m[1], m[2]] : ['', s];
}

function kindList(cls) {
  return `<ul class="kind ${cls || ''}">${[1, 2, 3, 4].map((i) => {
    const [emo] = splitEmoji(tl('en', `print.kind${i}`));
    return `<li><span class="kind-ic" aria-hidden="true">${esc(emo)}</span><div>${sheetLangs().map((l, j) => `<p class="l${j + 1}" ${attrs(l)}>${esc(splitEmoji(tl(l, `print.kind${i}`))[1])}</p>`).join('')}</div></li>`;
  }).join('')}</ul>`;
}

const brandRow = (cls) => `<div class="brandrow ${cls || ''}"><img src="icons/logo.svg" alt="" class="b-logo"><div class="b-word"><b>Cat Me If You Can</b><i>Kadıköy</i></div></div>`;
const pun = (cls) => `<p class="pun ${cls || ''}" lang="en" dir="ltr">Cat me if you can.</p>`;
const qrBox = (size, cls) => `<div class="qr ${cls || ''}" role="img" aria-label="QR: ${esc(shortLink(state.link))}">${state.qr[size]}</div>`;
const linkText = () => `<p class="qr-link" dir="ltr">${esc(shortLink(state.link))}</p>`;
const maker = () => `<div class="maker">${['tr', 'en'].map((l) => `<p ${attrs(l)}>${esc(tl(l, 'brand.maker'))}</p>`).join('')}</div>`;

// ---------------------------------------------------------------- Vorlagen

function tentFront() {
  return `<section class="face f-front">
    ${brandRow()}
    ${pun()}
    ${ml(offerKey(), 'offer', offerVars())}
    ${qrBox('big', 'qr-tent')}
    ${ml('print.scan', 'scanline')}
    ${linkText()}
  </section>`;
}

function tentBack() {
  return `<section class="face f-back">
    ${ml('print.kindTitle', 'ktitle')}
    ${kindList()}
    <div class="back-foot"><img src="icons/logo.svg" alt="" class="b-logo sm"><div>${pun('sm')}${maker()}</div></div>
  </section>`;
}

function tentSheet() {
  const strip = `<div class="tent-strip"><div class="half upper">${tentBack()}</div><div class="half lower">${tentFront()}</div></div>`;
  return `<div class="sheet tent">${strip}${strip}<i class="cut-v" aria-hidden="true"></i><i class="fold-h" aria-hidden="true"></i></div>`;
}

function sticker() {
  return `<div class="sticker"><div class="st-in">
    <img src="icons/logo.svg" alt="" class="st-logo">
    ${pun('st-pun')}
    ${qrBox('small', 'qr-sticker')}
    <div class="ml st-scan">${sheetLangs().map((l, i) => `<p class="l${i + 1}" ${attrs(l)}>${esc(tl(l, 'print.scanShort'))}</p>`).join('')}</div>
  </div></div>`;
}

function stickerSheet() {
  return `<div class="sheet stickers">${Array.from({ length: 6 }, sticker).join('')}<div class="sheet-foot">${maker()}</div></div>`;
}

function posterSheet() {
  const c = state.kit.cafe;
  return `<div class="sheet poster">
    ${brandRow('po-brand')}
    ${pun('po-pun')}
    ${ml('print.what', 'po-what')}
    <div class="po-offer">${ml(offerKey(), 'offer', offerVars())}</div>
    <div class="po-qr">${qrBox('big', 'qr-poster')}<div class="po-scan">${ml('print.scan', 'scanline')}${ml('print.free', 'free')}${linkText()}</div></div>
    <div class="po-kind">${ml('print.kindTitle', 'ktitle')}${kindList('two')}</div>
    <footer class="po-foot">${c ? `<p class="po-cafe"><b><bdi>${esc(c.name)}</bdi></b>${c.address ? ` · <bdi>${esc(c.address)}</bdi>` : ''}</p>` : ''}${maker()}</footer>
  </div>`;
}

const SHEETS = { tent: tentSheet, sticker: stickerSheet, poster: posterSheet };

// ---------------------------------------------------------------- Seite

function controls() {
  const k = state.kit;
  const who = k.cafe ? esc(t('print.for', { name: isolate(k.cafe.name) })) : esc(t(state.notFound ? 'print.notFound' : 'print.generic'));
  return `<section class="card pk-controls no-print">
    <a class="back" href="partner.html" data-back><span class="dir-ic" aria-hidden="true">‹</span> ${esc(t('common.back'))}</a>
    <h1>${esc(t('print.title'))}</h1>
    <p class="${state.notFound ? 'warn' : 'muted'}" data-who>${who}</p>
    ${isLocalAddress(state.link) ? `<p class="warn small" data-local>⚠️ ${esc(t('print.local'))}</p>` : ''}
    ${state.cafes.length ? `<label class="pk-field"><span class="pk-label">${esc(t('print.cafe'))}</span>
      <select data-cafe><option value="">${esc(t('print.allCafes'))}</option>${state.cafes.map((c) => `<option value="${esc(c.id)}" ${k.cafe && k.cafe.id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    </label>` : ''}
    <div class="pk-field" role="group" aria-label="${esc(t('print.layout'))}">
      <span class="pk-label" aria-hidden="true">${esc(t('print.layout'))}</span>
      <div class="seg">${LAYOUTS.map((l) => `<button type="button" data-layout="${l}" class="${l === state.layout ? 'on' : ''}" aria-pressed="${l === state.layout}">${esc(t(`print.${l}`))}</button>`).join('')}</div>
    </div>
    <label class="pk-field"><span class="pk-label">${esc(t('print.lang3'))}</span>
      <select data-lang3><option value="">${esc(t('print.none'))}</option>${EXTRA_LANGS.map((l) => `<option value="${l}" lang="${l}" ${l === state.lang3 ? 'selected' : ''}>${esc(LANG_INFO[l].name)}</option>`).join('')}</select>
    </label>
    <p class="small muted" data-hint>${esc(t(`print.hint.${state.layout}`))} ${esc(t('print.hint100'))}</p>
    <button type="button" class="btn primary big wide" data-print>🖨️ ${esc(t('print.print'))}</button>
  </section>`;
}

function fit() {
  const stage = document.querySelector('[data-stage]');
  const box = document.querySelector('[data-fit]');
  const sheet = box && box.firstElementChild;
  if (!stage || !sheet) return;
  const scale = Math.min(1, (stage.clientWidth - 2) / sheet.offsetWidth);
  box.style.transform = `scale(${scale})`;
  box.style.height = `${Math.ceil(sheet.offsetHeight * scale)}px`;
  box.style.width = `${Math.floor(sheet.offsetWidth * scale)}px`;
}

function drawSheet() {
  document.querySelector('[data-fit]').innerHTML = SHEETS[state.layout]();
  document.body.dataset.layout = state.layout;
  fit();
}

function remember() {
  const q = new URLSearchParams(location.search);
  q.set('layout', state.layout);
  if (state.lang3) q.set('lang3', state.lang3);
  else q.delete('lang3');
  if (state.kit && state.kit.cafe) q.set('cafe', state.kit.cafe.id);
  else q.delete('cafe');
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function render() {
  const view = document.querySelector('#view');
  view.innerHTML = `${controls()}<div class="pk-stage" data-stage dir="ltr"><div class="pk-fit" data-fit></div></div>`;
  drawSheet();
  view.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-layout]');
    if (!b || b.dataset.layout === state.layout) return;
    state.layout = b.dataset.layout;
    view.querySelectorAll('[data-layout]').forEach((x) => {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    view.querySelector('[data-hint]').textContent = `${t(`print.hint.${state.layout}`)} ${t('print.hint100')}`;
    remember();
    drawSheet();
  });
  view.querySelector('[data-lang3]').addEventListener('change', (e) => {
    state.lang3 = EXTRA_LANGS.includes(e.target.value) ? e.target.value : '';
    remember();
    drawSheet();
  });
  const pick = view.querySelector('[data-cafe]');
  if (pick) {
    pick.addEventListener('change', async () => {
      pick.disabled = true;
      state.notFound = false;
      try {
        await applyKit(await api.cafeKit(pick.value || null));
      } catch {
        state.notFound = true;
        await applyKit(await api.cafeKit(null));
      }
      render();
      remember();
      const again = document.querySelector('[data-cafe]');
      if (again) again.focus();
    });
  }
  view.querySelector('[data-print]').addEventListener('click', () => window.print());
  view.querySelector('[data-back]').addEventListener('click', (e) => {
    let same = false;
    try {
      same = !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch {
      /* egal */
    }
    if (same && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
}

// ---------------------------------------------------------------- Daten

async function chooseApi() {
  if (params.get('demo') === '1') return createLocalApi();
  const remote = new RemoteApi();
  try {
    const h = await remote.health();
    if (!h || h.ok !== true) throw new Error('no server');
    return remote;
  } catch {
    return createLocalApi(); // statisch gehostet → Demo-Cafés aus der Engine im Browser
  }
}

/** Angemeldetes Café (Sitzung aus partner.html) → seine ID. */
async function partnerFromSession() {
  let token = null;
  try {
    token = sessionStorage.getItem(PARTNER_TOKEN);
  } catch {
    /* kein Storage */
  }
  if (!token) return null;
  try {
    const res = await fetch('/api/partner/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const j = await res.json();
    return (j && j.partner && j.partner.id) || null;
  } catch {
    return null;
  }
}

async function loadKit(api) {
  let id = params.get('cafe');
  if (!id && !api.isDemo) id = await partnerFromSession();
  if (id) {
    try {
      return await api.cafeKit(id);
    } catch (e) {
      if (!(e && (e.status === 404 || e.code === 'cafe_not_found'))) throw e;
      state.notFound = true;
    }
  }
  return api.cafeKit(null);
}

/** Café-Daten übernehmen: Link und QR-Codes neu. */
async function applyKit(kit) {
  state.kit = kit;
  state.link = refLink(kit.cafe && kit.cafe.refCode, kit.publicUrl);
  // Ruhezone: 4 Module (Norm) bei Tischkarte/Poster; Sticker 2 Module, der weiße Sticker-Rand ergänzt sie.
  const [big, small] = await Promise.all([qrSvgFor(state.link, { margin: 4 }), qrSvgFor(state.link, { margin: 2 })]);
  state.qr = { big, small };
}

async function boot() {
  document.title = `Cat Me If You Can · ${t('print.title')}`;
  api = await chooseApi();
  const [kit, cafes] = await Promise.all([
    loadKit(api),
    // öffentliche Liste der Partner-Cafés für die Auswahl (Demo: die Demo-Cafés)
    api.places('partner').then((list) => list.filter((p) => p.type === 'partner').map((p) => ({ id: p.id, name: p.name }))).catch(() => []),
  ]);
  state.cafes = cafes;
  await applyKit(kit);
  render();
  remember();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  document.body.dataset.ready = '1';
}

boot().catch((e) => {
  document.querySelector('#view').innerHTML = `<div class="empty"><div class="big-emoji">😿</div><p>${esc(t('err.generic'))}</p><p class="small muted">${esc(String((e && e.message) || e))}</p></div>`;
});
