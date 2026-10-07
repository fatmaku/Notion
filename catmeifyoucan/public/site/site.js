// Cat Me If You Can – Startseite: Sprache, sanfte Einblendungen, 3D-Hero, Live-Zahlen, Trailer, Teilen.
// Ohne JavaScript bleibt die Seite vollständig lesbar (Englisch, statisches Bild, alles sichtbar).

import { TEXT, LANG_INFO, HASHTAGS, CHIP_FALLBACK, pickLang, t as translate } from './i18n.js';
import { CONDITION_TAGS, label } from '../core/taxonomy.js';

const root = document.documentElement;
root.classList.remove('no-js');
root.classList.add('js');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS_KEY = 'catme.lang';
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

// ------------------------------------------------------------------ Sprache

function storedLang() {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function storeLang(l) {
  try {
    localStorage.setItem(LS_KEY, l);
  } catch {
    /* privater Modus */
  }
}

function initialLang() {
  let q = null;
  try {
    q = new URLSearchParams(window.location.search).get('lang');
  } catch {
    /* egal */
  }
  if (q && TEXT[q]) return q;
  const saved = storedLang();
  if (saved && TEXT[saved]) return saved;
  return pickLang(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
}

let lang = initialLang();
const T = (key) => translate(lang, key);
const langListeners = [];

function numFmt(n) {
  try {
    return new Intl.NumberFormat(LANG_INFO[lang].locale, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}

/** Prozent in Landesschreibweise (BRAND.md 4): tr %20 · de 20 % · en/ru/ar 20% · fa ۲۰٪ */
function pctFmt(n) {
  const v = numFmt(n);
  if (lang === 'tr') return `%${v}`;
  if (lang === 'de') return `${v} %`;
  if (lang === 'fa') return `${v}٪`;
  return `${v}%`;
}

function chipLabel(tag) {
  const entry = CONDITION_TAGS[tag];
  if (!entry) return tag;
  const own = entry.label && entry.label[lang];
  if (own) return own;
  const fb = CHIP_FALLBACK[lang] && CHIP_FALLBACK[lang][tag];
  return fb || label(CONDITION_TAGS, tag, lang);
}

// Markennamen nie umbrechen und in RTL-Texten sauber isolieren
const BRANDS = /(Happy Overthinking Coffee|HappyTuncay|Cat Me If You Can|KediDex)/g;
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function setText(el, text) {
  if (!BRANDS.test(text)) {
    el.textContent = text;
    return;
  }
  BRANDS.lastIndex = 0;
  const safe = text.replace(/[&<>"']/g, (c) => ESC[c]);
  el.innerHTML = safe.replace(BRANDS, '<bdi class="nobr" dir="ltr">$1</bdi>');
}

function applyLang() {
  root.lang = lang;
  root.dir = LANG_INFO[lang].dir;
  for (const el of $$('[data-i18n]')) setText(el, T(el.dataset.i18n));
  for (const el of $$('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), T(key.trim()));
    }
  }
  // Schritt-Nummern in der Ziffernschrift der Sprache (fa: ۱ ۲ ۳), wie alle anderen Zahlen
  for (const el of $$('[data-num]')) el.textContent = numFmt(Number(el.dataset.num));
  for (const s of $$('[data-lang-select]')) s.value = lang;
  for (const fn of langListeners) fn();
}

function setLang(l, persist) {
  if (!TEXT[l] || l === lang) return;
  lang = l;
  if (persist) storeLang(l);
  applyLang();
}

for (const s of $$('[data-lang-select]')) {
  s.addEventListener('change', () => setLang(s.value, true));
}

// ------------------------------------------------------------------ Kopfzeile

const topbar = $('[data-topbar]');
const heroCta = $('.hero .cta-row');
function onScrollTop() {
  topbar.classList.toggle('is-solid', window.scrollY > 12);
}
window.addEventListener('scroll', onScrollTop, { passive: true });
onScrollTop();
if (heroCta && 'IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    for (const e of entries) topbar.classList.toggle('is-past', !e.isIntersecting && e.boundingClientRect.top < 0);
  }).observe(heroCta);
} else {
  topbar.classList.add('is-past');
}

// ------------------------------------------------------------------ Einblenden beim Scrollen

function setupReveal() {
  if (reduced || !('IntersectionObserver' in window)) return;
  // Geschwister nacheinander einblenden
  for (const list of $$('.steps, .ben-grid, .rule-grid, .stat-grid, .report-grid, .share-grid')) {
    [...list.children].forEach((el, i) => el.style.setProperty('--d', `${i * 90}ms`));
  }
  const pending = new Set($$('.rv'));
  const reveal = (el) => {
    el.classList.add('in');
    pending.delete(el);
    io.unobserve(el);
  };
  // Aufholen: was bei schnellem Springen (Anker, Wischen) schon über dem unteren Rand liegt, zeigen
  const catchUp = () => {
    const limit = window.innerHeight;
    for (const el of pending) if (el.getBoundingClientRect().top < limit) reveal(el);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) reveal(e.target);
      catchUp();
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
  );
  for (const el of pending) io.observe(el);
  let raf = 0;
  window.addEventListener('scroll', () => {
    if (!pending.size || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      catchUp();
    });
  }, { passive: true });
  root.classList.add('motion');
}

// ------------------------------------------------------------------ Zählen (sanft)

function countTo(el, to, { dur = 1400, fmt = numFmt, onStep } = {}) {
  if (reduced || !window.requestAnimationFrame) {
    el.textContent = fmt(to);
    if (onStep) onStep(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const t0 = performance.now();
    let lastShown = -1;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (v !== lastShown) {
        el.textContent = fmt(v);
        lastShown = v;
        if (onStep) onStep(v);
      }
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function whenVisible(el, fn, threshold = 0.35) {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { threshold },
  );
  io.observe(el);
}

// ------------------------------------------------------------------ Der Deal: 0 → 20

function setupDeal() {
  const box = $('[data-deal]');
  if (!box) return;
  const num = $('[data-deal-num]', box);
  const slots = $$('[data-deal-slots] li', box);
  const ringFg = $('.ring-fg', box);
  const goal = 20;
  const show = (v) => {
    num.textContent = numFmt(v);
    slots.forEach((li, i) => li.classList.toggle('on', i < v));
    if (ringFg) ringFg.style.strokeDashoffset = String(100 - (v / goal) * 100);
  };
  langListeners.push(() => {
    if (!box.classList.contains('armed') || box.classList.contains('done')) num.textContent = numFmt(goal);
  });
  if (reduced || !('IntersectionObserver' in window)) {
    show(goal);
    box.classList.add('done');
    return;
  }
  box.classList.add('armed');
  show(0);
  whenVisible(box, async () => {
    await new Promise((r) => setTimeout(r, 250));
    await countTo(num, goal, { dur: 2600, onStep: show });
    box.classList.add('done');
  });
}

// ------------------------------------------------------------------ Zustands-Chips (zum Ausprobieren)

const PROBLEM = new Set(['hungry', 'thirsty', 'sick', 'injured', 'danger']);
function setupChips() {
  const wrap = $('[data-chips]');
  if (!wrap) return;
  const thanks = $('[data-thanks]');
  const btns = $$('.chip', wrap);
  const render = () => {
    for (const b of btns) {
      const tag = b.dataset.tag;
      const entry = CONDITION_TAGS[tag];
      $('.chip-l', b).textContent = chipLabel(tag);
      if (entry && entry.icon) $('.chip-ic', b).textContent = entry.icon;
      b.dataset.sev = (entry && entry.severity) || 'none';
    }
    const any = btns.some((b) => b.getAttribute('aria-pressed') === 'true');
    thanks.textContent = any ? T('help.thanks') : '';
  };
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    const tag = b.dataset.tag;
    if (on && tag === 'healthy') for (const o of btns) if (PROBLEM.has(o.dataset.tag)) o.setAttribute('aria-pressed', 'false');
    if (on && PROBLEM.has(tag)) for (const o of btns) if (o.dataset.tag === 'healthy') o.setAttribute('aria-pressed', 'false');
    render();
  });
  langListeners.push(render);
  render();
}

// ------------------------------------------------------------------ Live-Zahlen

const STAT_KEYS = ['cats', 'observations', 'needsHelp', 'tnrPct', 'fed30d', 'hungry7d'];
const statsState = { data: null, demo: false, source: 'none', shown: false };

async function fetchJson(url, ms = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) throw new Error(`http ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadStats() {
  try {
    const data = await fetchJson('api/stats');
    if (!data || !data.totals) throw new Error('shape');
    let demo = false;
    try {
      const h = await fetchJson('api/health', 3000);
      demo = !!(h && h.demo);
    } catch {
      /* egal */
    }
    return { data, demo, source: 'api' };
  } catch {
    // Statisch gehostet (kein Server): Demo-Zahlen aus der Spiel-Engine im Browser
    try {
      const { createLocalApi } = await import('../js/api.js');
      const data = await (await createLocalApi()).stats();
      return { data, demo: true, source: 'local' };
    } catch (err) {
      console.warn('[catme] Zahlen nicht verfügbar', err);
      return { data: null, demo: true, source: 'none' };
    }
  }
}

function renderStats(animate) {
  const box = $('[data-stats]');
  const { data, demo } = statsState;
  if (!box || !data) return;
  $('[data-demo-badge]', box).hidden = !demo;
  $('[data-demo-note]', box).hidden = !demo;
  box.classList.toggle('is-demo', demo);
  for (const key of STAT_KEYS) {
    const dd = $(`[data-stat="${key}"]`, box);
    if (!dd) continue;
    const raw = data.totals[key];
    const card = dd.closest('.stat');
    if (raw == null || Number.isNaN(Number(raw))) {
      dd.textContent = '–';
      continue;
    }
    if (card) card.hidden = false;
    const fmt = key === 'tnrPct' ? pctFmt : numFmt;
    if (animate) countTo(dd, Number(raw), { dur: 1500, fmt });
    else dd.textContent = fmt(Number(raw));
  }
}

async function setupStats() {
  const box = $('[data-stats]');
  if (!box) return;
  const res = await loadStats();
  Object.assign(statsState, res);
  if (!res.data) return;
  whenVisible(box, () => {
    statsState.shown = true;
    renderStats(true);
  }, 0.2);
  langListeners.push(() => statsState.shown && renderStats(false));
}

// ------------------------------------------------------------------ Trailer

async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (!r.ok) return false;
    return !/text\/html/i.test(r.headers.get('content-type') || '');
  } catch {
    return false;
  }
}

let trailerToken = 0;
let trailerPoster = null;
async function resolveTrailer() {
  const player = $('[data-player]');
  if (!player) return;
  const video = $('[data-video]', player);
  if (video && !video.paused) return; // läuft gerade – nicht stören
  const token = ++trailerToken;
  const portrait = window.matchMedia('(orientation: portrait) and (max-width: 820px)').matches;
  const fmts = portrait ? ['9x16', '16x9'] : ['16x9'];
  const langs = lang === 'en' ? ['en'] : [lang, 'en'];
  let found = null;
  for (const f of fmts) {
    for (const l of langs) {
      if (await exists(`media/trailer-${f}-${l}.mp4`)) {
        found = { f, l };
        break;
      }
    }
    if (found) break;
  }
  if (token !== trailerToken) return;
  if (!found) {
    trailerPoster = null;
    player.classList.remove('has-video');
    showPlaceholder();
    return;
  }
  // Es gibt einen Trailer: der Platzhalter darf nie mehr „kommt bald“ sagen (auch wenn er hier nicht abspielbar ist)
  player.classList.add('has-video');
  const src = `media/trailer-${found.f}-${found.l}.mp4`;
  // Standbild: passendes Format, sonst das 16:9-Bild derselben Sprache
  let poster = null;
  for (const cand of [...new Set([`media/trailer-${found.f}-${found.l}.jpg`, `media/trailer-16x9-${found.l}.jpg`])]) {
    if (await exists(cand)) {
      poster = cand;
      break;
    }
  }
  const hasPoster = !!poster;
  if (token !== trailerToken) return;
  trailerPoster = poster;
  if (video.dataset.src !== src) {
    video.dataset.src = src;
    video.textContent = '';
    if (hasPoster) video.poster = poster;
    else video.removeAttribute('poster');
    const source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.append(source);
    video.load();
  }
  player.dataset.ratio = found.f;
  player.classList.remove('is-empty');
  video.hidden = false;
  $('[data-player-ph]', player).hidden = true;
}

/** Kein abspielbares Video: Standbild des Trailers (falls vorhanden), sonst der gestaltete Platzhalter. */
function showPlaceholder() {
  const player = $('[data-player]');
  const ph = $('[data-player-ph]', player);
  player.classList.add('is-empty');
  player.classList.toggle('has-still', !!trailerPoster);
  ph.style.backgroundImage = trailerPoster ? `url("${trailerPoster}")` : '';
  if (!trailerPoster) player.dataset.ratio = '16x9';
  $('[data-video]', player).hidden = true;
  ph.hidden = false;
}

function setupTrailer() {
  const player = $('[data-player]');
  if (!player) return;
  player.classList.add('is-empty');
  const video = $('[data-video]', player);
  // kaputte oder fehlende Datei → nie einen kaputten Player zeigen, sondern das Standbild
  video.addEventListener('error', showPlaceholder, true);
  // erst prüfen, wenn der Abschnitt in die Nähe kommt (spart Anfragen)
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    resolveTrailer();
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        go();
      }
    }, { rootMargin: '600px 0px' });
    io.observe(player);
    // Aufholen: bei schnellem Springen (Ende-Taste, Anker, langsames Handy) sieht der Observer den
    // Player evtl. nie – dann reicht es, dass er schon über dem unteren Rand (+600 px) liegt.
    const onScroll = () => {
      if (!started && player.getBoundingClientRect().top < window.innerHeight + 600) {
        io.disconnect();
        go();
      }
      if (started) window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  } else {
    go();
  }
  // Sprung über den Hero-Knopf „Trailer ansehen“: Player mittig zeigen (ganz sichtbar, samt Steuerleiste)
  window.addEventListener('hashchange', () => /^#(trailer|watch)$/.test(window.location.hash) && go());
  // Der Player ändert seine Größe, sobald klar ist, welches Video/Format es gibt → kurz nachzentrieren
  let centerUntil = 0;
  const center = () => player.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => performance.now() < centerUntil && center()).observe(player);
  }
  for (const ev of ['wheel', 'touchstart', 'keydown']) {
    window.addEventListener(ev, () => {
      centerUntil = 0;
    }, { passive: true });
  }
  for (const a of $$('a[href="#watch"]')) {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      centerUntil = performance.now() + 3000;
      go();
      center();
      try {
        history.replaceState(null, '', '#watch');
      } catch {
        /* egal */
      }
    });
  }
  langListeners.push(() => started && resolveTrailer());
}

// ------------------------------------------------------------------ Teilen

function pageUrl() {
  const u = new URL(window.location.href);
  u.hash = '';
  u.search = '';
  return u.toString();
}

let toastTimer = 0;
function toast(msg) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.textContent = '';
  }, 3200);
}

async function copyText(text, input) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Rückfall unten */
  }
  try {
    const el = input || Object.assign(document.createElement('textarea'), { value: text });
    if (!input) {
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.append(el);
    }
    el.value = text;
    el.focus();
    el.select();
    const ok = document.execCommand && document.execCommand('copy');
    if (!input) el.remove();
    return !!ok;
  } catch {
    return false;
  }
}

function setupShare() {
  const url = pageUrl();
  const input = $('[data-share-url]');
  if (input) input.value = url;
  const shareBtn = $('[data-share]');
  if (shareBtn && navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', async () => {
      try {
        await navigator.share({ title: 'Cat Me If You Can', text: `${T('share.text')} ${HASHTAGS.slice(0, 2).join(' ')}`, url });
      } catch {
        /* abgebrochen */
      }
    });
  }
  const copyBtn = $('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const ok = await copyText(url, input);
      if (ok) toast(T('share.copied'));
      else {
        toast(T('share.fail'));
        if (input) {
          input.focus();
          input.select();
        }
      }
    });
  }
  const tagsBtn = $('[data-copy-tags]');
  if (tagsBtn) {
    tagsBtn.addEventListener('click', async () => {
      const ok = await copyText(HASHTAGS.join(' '));
      toast(ok ? T('share.tagsCopied') : T('share.fail'));
    });
  }
}

// ------------------------------------------------------------------ 3D-Hero

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return true;
  } catch {
    return false;
  }
}

async function setupHero() {
  const hero = $('#hero');
  const canvas = $('.hero-canvas', hero);
  if (!hero || !canvas) return;
  if (!webglAvailable()) {
    root.classList.add('no-webgl');
    return;
  }
  // WebGL ist da: kein Überblenden vom Standbild – der Sternenhimmel bleibt kurz leer, dann kommt 3D
  hero.classList.add('webgl-pending');
  try {
    const { startHero } = await import('./hero3d.js');
    const inner = $('.hero-inner', hero);
    const ctl = await startHero({
      canvas,
      host: hero,
      reduced,
      // freier Bereich für die Szene auf dem Handy: unter der Kopfzeile, mit Luft über dem Ort-Abzeichen
      safeArea: () => ({
        top: (topbar ? topbar.offsetHeight : 64) + 4,
        bottom: inner && inner.firstElementChild ? inner.offsetTop + inner.firstElementChild.offsetTop - 16 : hero.clientHeight * 0.42,
      }),
      onReady: () => hero.classList.add('is-3d'),
      onLost: () => {
        hero.classList.remove('is-3d', 'webgl-pending');
        root.classList.add('no-webgl');
      },
    });
    if (!ctl) {
      root.classList.add('no-webgl');
      hero.classList.remove('webgl-pending');
    } else {
      // Schriften können die Texthöhe ändern → freien Bereich neu messen
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ctl.relayout());
      let dir = root.dir;
      langListeners.push(() => {
        if (root.dir !== dir) {
          dir = root.dir;
          ctl.relayout();
        }
      });
    }
    window.__catme.hero = ctl;
  } catch (err) {
    root.classList.add('no-webgl');
    hero.classList.remove('is-3d', 'webgl-pending');
    console.warn('[catme] 3D aus', err);
  }
}

// ------------------------------------------------------------------ Start

window.__catme = { lang: () => lang, stats: statsState, hero: null };
applyLang();
setupReveal();
setupDeal();
setupChips();
setupShare();
setupTrailer();
setupStats();
setupHero();
