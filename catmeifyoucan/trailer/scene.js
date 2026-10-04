// Cat Me If You Can – Trailer-Szene (Motion Graphics, flach mit leichtem 3D).
// Jedes Bild ist eine reine Funktion der Zeit: window.renderAt(t). Keine CSS-Animationen,
// keine Zufälle ohne festen Seed – so ist jedes Rendering gleich.
// URL: /trailer/scene.html?lang=en&format=16x9  (lang: tr en de ru ar fa · format: 16x9 | 9x16)

import { catAvatarSvg } from '/js/avatar.js';
import { TEXTS, SLOGAN, CAT_NAME, num } from './texts.js';
import { START, ORDER, EV, XF, DURATION, clamp, seg, eio, counterAt } from './timeline.js';

const params = new URLSearchParams(location.search);
const LANG = TEXTS[params.get('lang')] ? params.get('lang') : 'en';
const FORMAT = params.get('format') === '9x16' ? '9x16' : '16x9';
const T = TEXTS[LANG];
const RTL = T.dir === 'rtl';
const F16 = FORMAT === '16x9';
const W = F16 ? 1920 : 1080;
const H = F16 ? 1080 : 1920;
const RMAX = Math.hypot(W, H);

// ---------- kleine Helfer ----------
const eo = (p) => 1 - Math.pow(1 - p, 3);
const eob = (p, k = 1.70158) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2);
const lerp = (a, b, p) => a + (b - a) * p;
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const bump = (u, t0, d = 0.5) => { const p = seg(u, t0, t0 + d); return Math.sin(Math.PI * p); };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}
const q = (root, sel) => root.querySelector(sel);
const qa = (root, sel) => [...root.querySelectorAll(sel)];

function style(node, transform, opacity) {
  if (!node) return;
  if (transform != null) node.style.transform = transform;
  if (opacity != null) node.style.opacity = String(Math.round(clamp(opacity) * 1000) / 1000);
}
/** Einblenden: von unten weich nach oben (ease-out). */
function appear(node, u, t0, { dy = 46, d = 0.6, s0 = 1 } = {}) {
  const p = eo(seg(u, t0, t0 + d));
  const sc = s0 === 1 ? '' : ` scale(${f1(lerp(s0, 1, p) * 100) / 100})`;
  style(node, `translate3d(0, ${f1((1 - p) * dy)}px, 0)${sc}`, seg(u, t0, t0 + d * 0.7));
}

// ---------- Layout je Format ----------
// Bildbereich (900 × 900) neben dem Text (16:9) bzw. über dem Text (9:16).
const VIS = F16 ? { x: RTL ? 90 : 930, y: 90 } : { x: 90, y: 196 };
const VC = { x: VIS.x + 450, y: VIS.y + 450 };

// ---------- Katzen (Köpfe aus avatar.js, Körper hier dazu) ----------
function avatar(pattern, name, opts = {}) {
  return catAvatarSvg({ id: name, name, pattern, profile: { pattern, eye_color: opts.eye, ear_tip: opts.ear } });
}
function headOnly(pattern, name, opts) {
  return avatar(pattern, name, opts)
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/<rect width="120" height="120" rx="24" fill="[^"]+"\/>/, '');
}
function coatOf(svg) {
  const base = (svg.match(/<ellipse cx="60" cy="70" rx="40" ry="34" fill="([^"]+)"/) || [])[1] || '#8a7a68';
  const stripes = (svg.match(/<g stroke="(#[0-9a-fA-F]{6})" stroke-width="4"/) || [])[1] || null;
  return { base, stripes };
}
const WHITE = '#f4efe6';
const BODY_EXTRA = {
  smokin: { chest: WHITE, paws: WHITE },
  tekir_beyaz: { chest: WHITE, paws: WHITE },
  sarman_beyaz: { chest: WHITE, paws: WHITE },
  gri_beyaz: { chest: WHITE, paws: WHITE },
  uc_renk: { patches: ['#e9893a', '#2b2b2e'] },
  kaplumbaga: { patches: ['#e9893a', '#5a3a22'] },
  van: { tail: '#e9893a' },
};
/** Sitzende Katze (viewBox 0 0 200 250), Kopf als Gruppe .head zum Neigen. */
function sittingCat(pattern, name, attrs = '', opts = {}) {
  const inner = headOnly(pattern, name, opts);
  const { base, stripes } = coatOf(avatar(pattern, name, opts));
  const x = BODY_EXTRA[pattern] || {};
  return `<svg ${attrs} viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
    <path class="tail" d="M146 228 C 198 228, 206 168, 176 148" fill="none" stroke="${x.tail || base}" stroke-width="18" stroke-linecap="round"/>
    <path d="M100 92 C 58 92, 38 150, 40 200 C 42 234, 70 244, 100 244 C 130 244, 158 234, 160 200 C 162 150, 142 92, 100 92 Z" fill="${base}"/>
    ${x.patches ? `<path d="M44 190 C 46 150, 70 132, 92 152 C 86 190, 70 214, 46 214 Z" fill="${x.patches[0]}"/><path d="M156 170 C 150 140, 128 128, 116 140 C 122 170, 140 190, 158 196 Z" fill="${x.patches[1]}"/>` : ''}
    ${stripes ? `<g stroke="${stripes}" stroke-width="7" stroke-linecap="round" fill="none"><path d="M46 170 q14 4 22 -3"/><path d="M43 198 q16 4 26 -3"/><path d="M154 170 q-14 4 -22 -3"/><path d="M157 198 q-16 4 -26 -3"/></g>` : ''}
    ${x.chest ? `<path d="M100 116 C 80 134, 74 172, 80 212 C 90 230, 110 230, 120 212 C 126 172, 120 134, 100 116 Z" fill="${x.chest}"/>` : ''}
    <ellipse cx="78" cy="240" rx="18" ry="10" fill="${x.paws || base}"/>
    <ellipse cx="122" cy="240" rx="18" ry="10" fill="${x.paws || base}"/>
    <g class="head"><svg x="14" y="-10" width="172" height="172" viewBox="0 0 120 120">${inner}</svg></g>
  </svg>`;
}

const YARN = `<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M84 70 q22 10 8 28" fill="none" stroke="#f28c28" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="44" fill="#f28c28"/><g fill="none" stroke="#c4610f" stroke-width="5" stroke-linecap="round"><path d="M12 40 q38 -22 76 4"/><path d="M8 57 q42 -20 84 4"/><path d="M16 75 q32 -18 68 2"/><path d="M38 8 q-16 40 6 86"/><path d="M62 8 q-20 40 4 86"/></g><circle cx="34" cy="28" r="8" fill="#fbf3e4" opacity=".4"/></svg>`;
const PAW = (c) => `<svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true"><g fill="${c}"><ellipse cx="20" cy="27" rx="10" ry="8"/><circle cx="8.5" cy="16" r="4.6"/><circle cx="15.5" cy="8.5" r="4.6"/><circle cx="24.5" cy="8.5" r="4.6"/><circle cx="31.5" cy="16" r="4.6"/></g></svg>`;
const STAR = (fill) => `<svg viewBox="0 0 48 48" width="48" height="48"><path d="M24 3 l6.3 13.6 14.7 1.7 -10.9 10.1 2.9 14.6 L24 35.6 11 43 l2.9-14.6 L3 18.3l14.7-1.7z" fill="${fill}" stroke="#14213d" stroke-width="3" stroke-linejoin="round"/></svg>`;
const HEART = `<svg viewBox="0 0 100 90" width="100%" height="100%"><path d="M50 86 C 20 64, 4 46, 4 28 C 4 12, 16 2, 30 2 C 40 2, 46 8, 50 14 C 54 8, 60 2, 70 2 C 84 2, 96 12, 96 28 C 96 46, 80 64, 50 86 Z" fill="#f28c28" stroke="#fbf3e4" stroke-width="5"/><path d="M26 22 q-8 2 -9 12" stroke="#fbf3e4" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/></svg>`;

/** Markennamen nie umbrechen. */
function keepBrands(text) {
  return esc(text).replace(/(Happy Overthinking Coffee|HappyTuncay|Cat Me If You Can|KediDex)/g, '<span style="white-space:nowrap">$1</span>');
}
/** Zeile „A · B · C“ in Abschnitte teilen: umbrochen wird nur an „ · “ (siehe breakAtSeparators). */
function segLine(text) {
  return text.split(' · ').map((s) => `<span class="seg">${keepBrands(s)}</span>`).join('<span class="sep"> · </span>');
}
/** Wo ein Abschnitt in einer neuen Zeile beginnt, wird der Trenner „ · “ zum Zeilenumbruch. */
function breakAtSeparators(box) {
  for (const sep of qa(box, '.sep')) {
    const prev = sep.previousElementSibling;
    const next = sep.nextElementSibling;
    if (next.offsetTop >= prev.offsetTop + prev.offsetHeight - 2) sep.replaceWith(document.createElement('br'));
  }
}
/** Zustands-Chips: Schrift verkleinern, falls ein Text trotz breiterer Karte nicht in seinen Chip passt. */
function fitChips(pop) {
  const chips = qa(pop, '.chip');
  let fs = parseFloat(getComputedStyle(chips[0]).fontSize);
  while (fs > 24 && chips.some((c) => c.scrollWidth > c.clientWidth + 1)) {
    fs -= 1;
    for (const c of chips) c.style.fontSize = `${fs}px`;
  }
  pop.dataset.chipSize = String(fs);
}

// ---------- Textblock ----------
function copyBlock(lines, { sub, acc = [], cls = '' } = {}) {
  const ls = lines.map((s, i) => `<span class="ln ${acc[i] || ''}"><span>${esc(s)}</span></span>`).join('');
  return `<div class="copy ${cls}"><div class="h">${ls}</div>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
}
/** Überschrift so groß wie möglich, aber nie breiter als die Spalte (auch nicht höher als die Zone). */
function fitCopy(c) {
  const h = q(c, '.h');
  const base = F16 ? (RTL ? 118 : 100) : RTL ? 124 : 104;
  const maxW = F16 ? 780 : 840; // 9:16: je 120 px Rand links/rechts (Knöpfe der Apps)
  const zone = F16 ? (c.classList.contains('top') ? 420 : 820) : 474;
  const sub = q(c, '.sub');
  const subH = sub ? sub.getBoundingClientRect().height + parseFloat(getComputedStyle(sub).marginTop) : 0;
  const spans = qa(h, '.ln > span');
  // A: jede Zeile bleibt eine Zeile
  h.classList.remove('wrap');
  h.style.fontSize = `${base}px`;
  let w = 0;
  for (const s of spans) w = Math.max(w, s.getBoundingClientRect().width);
  let size = Math.floor(base * Math.min(1, maxW / w));
  h.style.fontSize = `${size}px`;
  const hh = h.getBoundingClientRect().height;
  if (hh + subH > zone) size = Math.floor((size * (zone - subH)) / hh);
  // B: lange Zeilen dürfen umbrechen, wenn die Schrift sonst zu klein wird
  const minGood = F16 ? 78 : 86;
  let wrap = false;
  if (size < minGood) {
    h.classList.add('wrap');
    for (let s = base; s > size; s -= 2) {
      h.style.fontSize = `${s}px`;
      const lh = s * (RTL ? 1.4 : 1.1);
      const fits =
        spans.every((sp) => sp.scrollWidth <= maxW + 1 && sp.getBoundingClientRect().height < lh * 2.5) &&
        h.getBoundingClientRect().height + subH <= zone;
      if (fits) { size = s; wrap = true; break; }
    }
    if (!wrap) h.classList.remove('wrap');
  }
  h.style.fontSize = `${size}px`;
  c.dataset.size = `${size}${wrap ? 'w' : ''}`;
}
function renderCopy(root, u, times, subT) {
  const lines = qa(root, '.copy .ln');
  lines.forEach((ln, i) => appear(ln, u, times[Math.min(i, times.length - 1)] + (i >= times.length ? 0.15 * (i - times.length + 1) : 0)));
  const sub = q(root, '.copy .sub');
  if (sub) appear(sub, u, subT, { dy: 30 });
}

const scenes = {};

// ======================================================================================
// Szene 1 – Nacht über Kadıköy
// ======================================================================================
function mosque(cx, by, k) {
  const X = (v) => f1(cx + v * k);
  const Y = (v) => f1(by + v * k);
  const R = (x, y, w, h) => `<rect x="${X(x)}" y="${Y(y)}" width="${f1(w * k)}" height="${f1(h * k)}"/>`;
  const dome = (x, y, r) => `<path d="M${X(x - r)} ${Y(y)} A ${f1(r * k)} ${f1(r * k)} 0 0 1 ${X(x + r)} ${Y(y)} Z"/>`;
  const minaret = (x, h) =>
    R(x - 6, -h, 12, h) + R(x - 10, -h * 0.6, 20, 6) + R(x - 9, -h * 0.82, 18, 5) +
    `<path d="M${X(x - 7)} ${Y(-h)} L${X(x)} ${Y(-h - 48)} L${X(x + 7)} ${Y(-h)} Z"/>`;
  return (
    R(-150, -70, 300, 72) + dome(0, -70, 84) + R(-3, -184, 6, 32) + dome(-104, -70, 42) + dome(104, -70, 42) +
    R(-200, -36, 400, 38) + dome(-168, -36, 22) + dome(168, -36, 22) +
    minaret(-236, 250) + minaret(236, 250) + minaret(-206, 196) + minaret(206, 196)
  );
}
function galata(cx, by, k) {
  const X = (v) => f1(cx + v * k);
  const Y = (v) => f1(by + v * k);
  return `<rect x="${X(-30)}" y="${Y(-200)}" width="${f1(60 * k)}" height="${f1(202 * k)}"/><rect x="${X(-37)}" y="${Y(-214)}" width="${f1(74 * k)}" height="${f1(16 * k)}"/><path d="M${X(-37)} ${Y(-214)} L${X(0)} ${Y(-300)} L${X(37)} ${Y(-214)} Z"/>`;
}
const CATSIL = 'M-21 0 C -25 -24, -21 -40, -14 -50 C -21 -58, -22 -68, -18 -76 L -20 -95 L -6 -83 C -2 -84, 2 -84, 6 -83 L 20 -95 L 18 -76 C 22 -68, 21 -58, 14 -50 C 21 -40, 25 -24, 21 0 Z';

function buildS1() {
  const r = rng(11);
  const hz = F16 ? 650 : 880; // ferne Uferlinie
  const shore = F16 ? 872 : 1062; // Dächer von Kadıköy
  const moon = F16 ? { x: RTL ? 330 : 1590, y: 220, r: 84 } : { x: 790, y: 380, r: 84 };
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${hz}"><stop offset="0" stop-color="#07102a"/><stop offset=".55" stop-color="#14213d"/><stop offset="1" stop-color="#34507f"/></linearGradient>
    <radialGradient id="mglow"><stop offset="0" stop-color="#fbf3e4" stop-opacity=".32"/><stop offset=".35" stop-color="#fbf3e4" stop-opacity=".10"/><stop offset="1" stop-color="#fbf3e4" stop-opacity="0"/></radialGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b3768"/><stop offset="1" stop-color="#0b1734"/></linearGradient>
    <radialGradient id="eglow"><stop offset="0" stop-color="#f6d55c" stop-opacity=".6"/><stop offset="1" stop-color="#f6d55c" stop-opacity="0"/></radialGradient>
  </defs><g id="s1cam">`;
  s += `<rect x="-60" y="-60" width="${W + 120}" height="${H + 120}" fill="url(#sky)"/>`;
  s += '<g id="s1stars">';
  const nStars = F16 ? 110 : 90;
  for (let i = 0; i < nStars; i++) {
    const x = r() * W;
    const y = r() * (hz - 190);
    const rad = 1 + r() * 2.4;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="${r() < 0.22 ? '#f6d55c' : '#fbf3e4'}"/>`;
  }
  s += '</g>';
  s += `<circle cx="${moon.x}" cy="${moon.y}" r="${moon.r * 3.4}" fill="url(#mglow)"/>`;
  s += `<circle cx="${moon.x}" cy="${moon.y}" r="${moon.r}" fill="#fbf3e4"/>`;
  s += `<g fill="#ece0c6"><circle cx="${f1(moon.x - moon.r * 0.3)}" cy="${f1(moon.y - moon.r * 0.15)}" r="${f1(moon.r * 0.2)}"/><circle cx="${f1(moon.x + moon.r * 0.34)}" cy="${f1(moon.y + moon.r * 0.28)}" r="${f1(moon.r * 0.13)}"/><circle cx="${f1(moon.x + moon.r * 0.12)}" cy="${f1(moon.y - moon.r * 0.5)}" r="${f1(moon.r * 0.09)}"/></g>`;
  // ferne Altstadt-Silhouette (Moscheen, Galata-Turm)
  s += `<g id="s1far"><g fill="#0c1736">`;
  s += `<path d="M-60 ${hz + 4} L-60 ${hz - 26} C ${W * 0.15} ${hz - 62}, ${W * 0.3} ${hz - 38}, ${W * 0.45} ${hz - 54} S ${W * 0.8} ${hz - 30}, ${W + 60} ${hz - 48} L ${W + 60} ${hz + 4} Z"/>`;
  const rb = rng(5);
  for (let x = -40; x < W + 40; x += 26 + rb() * 46) {
    const hh = 10 + rb() * 38;
    const ww = 18 + rb() * 38;
    s += `<rect x="${f1(x)}" y="${f1(hz - 26 - hh)}" width="${f1(ww)}" height="${f1(hh + 30)}"/>`;
  }
  const mosques = F16 ? [[640, 0.92], [1090, 1.12], [1470, 0.78]] : [[210, 0.86], [640, 1.08]];
  for (const [x, k] of mosques) s += mosque(x, hz - 40, k);
  s += galata(F16 ? 1790 : 975, hz - 30, F16 ? 0.9 : 0.95);
  s += '</g><g fill="#f6d55c" opacity=".55">';
  for (let x = 10; x < W; x += 18 + rb() * 40) s += `<rect x="${f1(x)}" y="${f1(hz - 8 - rb() * 30)}" width="3" height="3"/>`;
  s += '</g></g>';
  // Wasser
  s += `<rect x="-60" y="${hz}" width="${W + 120}" height="${shore - hz + 80}" fill="url(#sea)"/>`;
  s += '<g id="s1shim" fill="#fbf3e4">';
  for (let i = 0; i < 9; i++) s += `<rect x="${moon.x}" y="${hz + 14 + i * ((shore - hz - 30) / 9)}" width="10" height="5" rx="2.5" opacity="${f1(0.55 - i * 0.04)}"/>`;
  s += '</g>';
  // Fähre (Vapur)
  let win = '';
  for (let i = 0; i < 12; i++) win += `<rect x="${36 + i * 21}" y="27" width="13" height="14" rx="3"/>`;
  for (let i = 0; i < 6; i++) win += `<rect x="${92 + i * 22}" y="5" width="12" height="10" rx="3"/>`;
  s += `<g id="s1ferry"><g opacity=".3" fill="#f6d55c"><rect x="30" y="96" width="250" height="5" rx="2.5"/><rect x="60" y="110" width="190" height="4" rx="2"/><rect x="90" y="122" width="120" height="3" rx="1.5"/></g>
    <path d="M0 52 L320 52 L298 90 L22 90 Z" fill="#0a1430"/><rect x="0" y="50" width="320" height="7" fill="#f28c28"/>
    <rect x="26" y="19" width="264" height="33" rx="7" fill="#e9e0cc"/><rect x="82" y="-1" width="150" height="22" rx="7" fill="#dcd2bd"/>
    <rect x="144" y="-36" width="26" height="38" rx="3" fill="#14213d"/><rect x="144" y="-36" width="26" height="11" rx="3" fill="#f28c28"/>
    <g fill="#f6d55c">${win}</g></g>`;
  // Dächer von Kadıköy + Katzen
  const rh = rng(23);
  const houses = [];
  for (let x = -60; x < W + 60; ) {
    const w = 130 + rh() * 120;
    houses.push({ x, w, top: shore + (rh() * 64 - 26), gable: rh() < 0.55, chim: rh() < 0.5 });
    x += w - 2;
  }
  const catXs = F16 ? (RTL ? [1740, 560, 170] : [190, 1390, 1770]) : [150, 560, 930];
  const cats = catXs.map((cx) => {
    const hs = houses.reduce((a, b) => (Math.abs(b.x + b.w / 2 - cx) < Math.abs(a.x + a.w / 2 - cx) ? b : a));
    hs.gable = false;
    hs.chim = false;
    return hs;
  });
  const noWin = F16 ? [9999, 9999] : [1080, 1580];
  s += '<g id="s1near"><g fill="#060d22">';
  let lights = '';
  for (const hs of houses) {
    s += `<rect x="${f1(hs.x)}" y="${f1(hs.top)}" width="${f1(hs.w)}" height="${f1(H - hs.top + 60)}"/>`;
    if (hs.gable) s += `<path d="M${f1(hs.x - 8)} ${f1(hs.top + 2)} L${f1(hs.x + hs.w / 2)} ${f1(hs.top - hs.w * 0.27)} L${f1(hs.x + hs.w + 8)} ${f1(hs.top + 2)} Z"/>`;
    if (hs.chim) s += `<rect x="${f1(hs.x + hs.w * 0.7)}" y="${f1(hs.top - 34)}" width="20" height="36"/>`;
    const cols = Math.max(1, Math.floor((hs.w - 30) / 46));
    for (let c = 0; c < cols; c++) {
      for (let y = hs.top + 34; y < H - 20; y += 74) {
        if (y > noWin[0] - 40 && y < noWin[1]) continue;
        const v = rh();
        if (v < 0.24) lights += `<rect x="${f1(hs.x + 22 + c * 46)}" y="${f1(y)}" width="20" height="30" rx="3" fill="${v < 0.08 ? '#f28c28' : '#f6d55c'}" opacity="${v < 0.08 ? 0.55 : 0.7}"/>`;
      }
    }
  }
  s += `</g>${lights}`;
  // Katzen auf den Dächern (Silhouette mit leuchtenden Augen)
  let eyes = '';
  const eyeColors = ['#f6d55c', '#b9e07a', '#f6d55c', '#9fd3e8', '#f6d55c'];
  cats.forEach((hs, i) => {
    const cx = hs.x + hs.w * 0.5;
    const k = F16 ? 1.25 : 1.45;
    s += `<g transform="translate(${f1(cx)} ${f1(hs.top + 1)}) scale(${k})" fill="#060d22"><path d="${CATSIL}"/><path d="M19 -4 C 42 -4, 46 -28, 35 -38" fill="none" stroke="#060d22" stroke-width="7" stroke-linecap="round"/></g>`;
    eyes += eyePair(cx, hs.top + 1 - 66 * k, 7 * k, eyeColors[i], i);
  });
  // Augen im Dunkeln (Gassen)
  const dark = F16 ? [[730, 1000], [1290, 1036]] : [[300, 1700], [780, 1800]];
  dark.forEach(([x, y], j) => (eyes += eyePair(x, y, 9, eyeColors[3 + j], 3 + j)));
  s += `${eyes}</g></g></svg>`;

  const root = el(`<section class="scene" id="s1"></section>`);
  root.appendChild(el(s));
  root.appendChild(el(copyBlock(T.s1, { acc: ['', 'acc-o'], cls: 'top' })));
  const eyeEls = qa(root, '.eyep');
  const stars = qa(root, '#s1stars circle');
  const shim = qa(root, '#s1shim rect');
  const ferryG = q(root, '#s1ferry');
  const cam = q(root, '#s1cam');
  const far = q(root, '#s1far');
  const ferry = F16 ? { x0: RTL ? 1360 : 300, x1: RTL ? 900 : 760, y: hz + 44, k: 0.9 } : { x0: 150, x1: 470, y: hz + 34, k: 0.72 };
  const openT = EV.s1.eyes;
  const blinkT = EV.s1.blink;
  return {
    root,
    wipe: { x: W / 2, y: H / 2 },
    render(u) {
      const z = 1 + 0.06 * eio(seg(u, 0, 3.6));
      cam.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${z.toFixed(4)}) translate(${-W / 2} ${-H / 2 + 0})`);
      far.setAttribute('transform', `translate(${f1(-10 * u)} 0)`);
      stars.forEach((c, i) => c.setAttribute('opacity', f1(0.55 + 0.45 * Math.sin(u * 1.7 + i * 1.37))));
      shim.forEach((rc, i) => {
        const w = (F16 ? 90 : 70) * (0.5 + 0.5 * Math.sin(u * 2.2 + i * 0.9)) + 26 - i * 1.5;
        rc.setAttribute('width', f1(w));
        rc.setAttribute('x', f1(moon.x - w / 2 + 6 * Math.sin(u * 1.3 + i)));
      });
      const fx = lerp(ferry.x0, ferry.x1, u / 3.4);
      const fy = ferry.y + 3 * Math.sin(u * 2.4);
      ferryG.setAttribute('transform', `translate(${f1(fx)} ${f1(fy)}) scale(${ferry.k}) rotate(${f1(0.8 * Math.sin(u * 2.4 + 1))} 160 60)`);
      eyeEls.forEach((g, i) => {
        const o = eo(seg(u, openT[i % openT.length], openT[i % openT.length] + 0.25));
        const bl = bump(u, blinkT[i % blinkT.length], 0.22);
        const sy = Math.max(0.06, o * (1 - 0.94 * bl));
        const cx = +g.dataset.x;
        const cy = +g.dataset.y;
        q(g, '.lids').setAttribute('transform', `translate(${cx} ${cy}) scale(1 ${sy.toFixed(3)}) translate(${-cx} ${-cy})`);
        q(g, '.glow').setAttribute('opacity', f1(o * (0.6 + 0.4 * (1 - bl))));
      });
      renderCopy(root, u, [EV.s1.l1, EV.s1.l2], 9);
    },
  };
}
function eyePair(cx, cy, r, color, i) {
  const dx = r * 1.05;
  return `<g class="eyep" data-x="${f1(cx)}" data-y="${f1(cy)}"><g class="glow"><circle cx="${f1(cx - dx)}" cy="${f1(cy)}" r="${f1(r * 3.4)}" fill="url(#eglow)"/><circle cx="${f1(cx + dx)}" cy="${f1(cy)}" r="${f1(r * 3.4)}" fill="url(#eglow)"/></g><g class="lids" data-i="${i}"><ellipse cx="${f1(cx - dx)}" cy="${f1(cy)}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.5)}" fill="${color}"/><ellipse cx="${f1(cx + dx)}" cy="${f1(cy)}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.5)}" fill="${color}"/><ellipse cx="${f1(cx - dx)}" cy="${f1(cy)}" rx="${f1(r * 0.16)}" ry="${f1(r * 0.42)}" fill="#060d22"/><ellipse cx="${f1(cx + dx)}" cy="${f1(cy)}" rx="${f1(r * 0.16)}" ry="${f1(r * 0.42)}" fill="#060d22"/></g></g>`;
}

// ======================================================================================
// Szene 2 – Foto machen (Sucher rastet ein, Wollknäuel, Auslöser)
// ======================================================================================
function buildS2() {
  const SW = 398; // Bildschirm
  const SH = 848;
  const catBox = { x: 99, y: 372, w: 200, h: 250 };
  const street = `<svg width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${SW}" height="${SH}" fill="#f1dfc2"/>
    <g fill="#e8d2b0">${Array.from({ length: 9 }, (_, i) => `<rect x="${(i % 3) * 140 - 20 + (i % 2) * 40}" y="${130 + Math.floor(i / 3) * 140}" width="70" height="26" rx="6"/>`).join('')}</g>
    <rect x="0" y="40" width="${SW}" height="48" fill="#f28c28"/>
    <g fill="#fbf3e4">${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 52 + 14}" y="40" width="24" height="48"/>`).join('')}</g>
    <path d="M0 88 ${Array.from({ length: 8 }, (_, i) => `Q ${i * 52 + 26} 112 ${i * 52 + 52} 88`).join(' ')} Z" fill="#f28c28"/>
    <rect x="26" y="150" width="124" height="176" rx="12" fill="#1f8a8a"/><path d="M88 150 V326 M26 238 H150" stroke="#fbf3e4" stroke-width="8"/>
    <path d="M238 600 V300 a60 60 0 0 1 120 0 V600 Z" fill="#1f8a8a"/><circle cx="256" cy="452" r="8" fill="#f6d55c"/>
    <rect x="0" y="596" width="${SW}" height="40" fill="#dcc3a0"/>
    <rect x="0" y="636" width="${SW}" height="${SH - 636}" fill="#cdb38e"/>
    <g fill="#c2a780">${Array.from({ length: 18 }, (_, i) => `<ellipse cx="${(i % 6) * 72 + (Math.floor(i / 6) % 2) * 36}" cy="${672 + Math.floor(i / 6) * 58}" rx="30" ry="14"/>`).join('')}</g>
    <rect x="34" y="530" width="64" height="66" rx="10" fill="#c4610f"/><g fill="#1f8a8a"><ellipse cx="52" cy="512" rx="16" ry="34" transform="rotate(-22 52 512)"/><ellipse cx="80" cy="508" rx="16" ry="36" transform="rotate(20 80 508)"/><ellipse cx="66" cy="496" rx="15" ry="38"/></g>
    <g class="cat">${sittingCat('sarman', 'Pasa', `x="${catBox.x}" y="${catBox.y}" width="${catBox.w}" height="${catBox.h}"`, { eye: 'green' })}</g>
  </svg>`;
  const html = `<section class="scene" id="s2" style="background:#fbf3e4">
    <div class="abs dots" style="inset:0;background-image:radial-gradient(rgba(20,33,61,.09) 3px, transparent 3.6px);background-size:46px 46px"></div>
    <div class="vis" style="left:${VIS.x}px;top:${VIS.y}px">
      <div class="abs blob" style="left:50px;top:60px;width:800px;height:800px;border-radius:50%;background:#f28c28"></div>
      <div class="abs ring" style="left:690px;top:40px;width:150px;height:150px;border-radius:50%;border:22px solid #1f8a8a"></div>
      <div class="abs sunb" style="left:60px;top:700px;width:96px;height:96px;border-radius:50%;background:#f6d55c"></div>
      <div class="abs shadow" style="left:250px;top:840px;width:400px;height:60px;border-radius:50%;background:radial-gradient(rgba(20,33,61,.35), rgba(20,33,61,0) 70%)"></div>
      <div class="phone-wrap" style="left:235px;top:10px;width:430px;height:880px">
        <div class="phone">
          <div class="screen">
            <div class="shot">${street}<div class="abs yarn" style="width:64px;height:64px;left:0;top:0">${YARN}</div></div>
            <svg class="abs ui" width="${SW}" height="${SH}" style="left:0;top:0"><path class="br" fill="none" stroke="#fbf3e4" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
              <g class="btn"><circle cx="199" cy="770" r="46" fill="none" stroke="#fbf3e4" stroke-width="8"/><circle class="btnin" cx="199" cy="770" r="35" fill="#fbf3e4"/></g></svg>
            <div class="abs bar1" style="left:0;right:0;top:0;height:0;background:#0b1430"></div>
            <div class="abs bar2" style="left:0;right:0;bottom:0;height:0;background:#0b1430"></div>
            <div class="notch"></div>
            <div class="pill plus1">+1 ${PAW('#14213d')}<span>KediDex</span></div>
          </div>
          <div class="gloss"></div>
        </div>
      </div>
    </div>
    ${copyBlock(T.s2, { sub: T.s2sub })}
  </section>`;
  const root = el(html);
  q(root, '.copy .sub').style.color = 'rgba(20,33,61,.82)';
  q(root, '.copy').style.color = '#14213d';
  const R = {
    blob: q(root, '.blob'), ring: q(root, '.ring'), sun: q(root, '.sunb'), phone: q(root, '.phone'), gloss: q(root, '.gloss'),
    shot: q(root, '.shot'), br: q(root, '.br'), btn: q(root, '.btn'), btnin: q(root, '.btnin'), ui: q(root, '.ui'),
    yarn: q(root, '.yarn'), bar1: q(root, '.bar1'), bar2: q(root, '.bar2'), plus: q(root, '.plus1'), head: q(root, '.cat .head'), shadow: q(root, '.shadow'),
  };
  const E = EV.s2;
  const from = { x: 26, y: 120, w: 346, h: 600 };
  const to = { x: catBox.x - 18, y: catBox.y - 6, w: catBox.w + 36, h: catBox.h + 10 };
  const ball0 = { x: 199, y: 770, s: 74 };
  const ball1 = { x: 292, y: 598, s: 52 };
  return {
    root,
    wipe: { x: VC.x, y: VC.y },
    render(u) {
      const bp = eob(seg(u, 0.05, 0.7), 1.2);
      style(R.blob, `scale(${f1(lerp(0.4, 1, bp) * 100) / 100})`, seg(u, 0.05, 0.3));
      style(R.ring, `translate(${f1(8 * Math.sin(u * 1.4))}px, ${f1(10 * Math.cos(u * 1.2))}px) scale(${f1(eob(seg(u, 0.3, 0.9)) * 100) / 100})`, seg(u, 0.3, 0.5));
      style(R.sun, `translate(${f1(-8 * Math.sin(u * 1.1))}px, ${f1(8 * Math.cos(u * 1.5))}px) scale(${f1(eob(seg(u, 0.4, 1.0)) * 100) / 100})`, seg(u, 0.4, 0.6));
      const pp = eo(seg(u, E.phone[0], E.phone[1]));
      const ry = lerp(-32, -12, pp) + 3 * Math.sin(u * 1.1);
      const rx = lerp(16, 5, pp) + 1.5 * Math.sin(u * 0.9 + 1);
      const press = bump(u, E.throwA - 0.12, 0.24);
      style(R.phone, `translate3d(0, ${f1((1 - pp) * 300 + press * 6)}px, 0) rotateX(${f1(rx)}deg) rotateY(${f1(RTL ? -ry : ry)}deg) rotateZ(${f1(lerp(-5, -1.5, pp))}deg)`, seg(u, E.phone[0], E.phone[0] + 0.25));
      R.gloss.style.background = `linear-gradient(${f1(110 + ry * 2)}deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.16) 45%, rgba(255,255,255,0) 60%)`;
      style(R.shadow, null, pp * 0.9);
      // Sucher rastet ein
      const lp = eio(seg(u, E.lock[0], E.lock[1]));
      const b = { x: lerp(from.x, to.x, lp), y: lerp(from.y, to.y, lp), w: lerp(from.w, to.w, lp), h: lerp(from.h, to.h, lp) };
      const pulse = bump(u, E.lock[1], 0.3);
      const g = 6 * pulse;
      b.x -= g; b.y -= g; b.w += 2 * g; b.h += 2 * g;
      const L = 52;
      R.br.setAttribute('d', `M${f1(b.x)} ${f1(b.y + L)} V${f1(b.y)} H${f1(b.x + L)} M${f1(b.x + b.w - L)} ${f1(b.y)} H${f1(b.x + b.w)} V${f1(b.y + L)} M${f1(b.x + b.w)} ${f1(b.y + b.h - L)} V${f1(b.y + b.h)} H${f1(b.x + b.w - L)} M${f1(b.x + L)} ${f1(b.y + b.h)} H${f1(b.x)} V${f1(b.y + b.h - L)}`);
      R.br.setAttribute('stroke', u >= E.lock[1] ? '#f28c28' : '#fbf3e4');
      R.br.setAttribute('opacity', f1(seg(u, 0.35, 0.6)));
      R.btnin.setAttribute('r', f1(35 - 7 * press));
      R.ui.style.opacity = String(f1(1 - seg(u, E.saved, E.saved + 0.2)));
      // Wollknäuel-Wurf (landet neben der Katze)
      const yp = seg(u, E.throwA, E.throwB);
      let yx, yy, ys, rot;
      if (u < E.throwB) {
        yx = lerp(ball0.x, ball1.x, yp);
        yy = lerp(ball0.y, ball1.y, yp) - 330 * Math.sin(Math.PI * yp);
        ys = lerp(ball0.s, ball1.s, yp);
        rot = 540 * yp;
      } else {
        const wq = seg(u, E.wiggle[0], E.wiggle[1]);
        yx = ball1.x;
        yy = ball1.y - 14 * Math.abs(Math.sin(Math.PI * 2 * wq)) * (1 - wq);
        ys = ball1.s;
        rot = 540 + 16 * Math.sin(Math.PI * 6 * wq) * (1 - wq);
      }
      style(R.yarn, `translate(${f1(yx - ys / 2)}px, ${f1(yy - ys / 2)}px) rotate(${f1(rot)}deg) scale(${f1(ys / 64 * 100) / 100})`, u >= E.throwA ? 1 : 0);
      R.yarn.style.transformOrigin = '32px 32px';
      R.yarn.style.left = '-0px';
      // Katze schaut zum Knäuel
      const tilt = 12 * eo(seg(u, E.throwB - 0.1, E.throwB + 0.3));
      R.head.setAttribute('transform', `rotate(${f1(tilt)} 100 120)`);
      // Auslöser (Verschluss, kein Blitz)
      const sp = u < E.shutter ? 0 : u < E.shutter + 0.07 ? eo(seg(u, E.shutter, E.shutter + 0.07)) : 1 - eo(seg(u, E.shutter + 0.07, E.shutter + 0.2));
      R.bar1.style.height = `${f1(sp * 426)}px`;
      R.bar2.style.height = `${f1(sp * 426)}px`;
      // gespeichertes Foto
      const fp = eob(seg(u, E.saved, E.saved + 0.45), 1.4);
      R.shot.style.transform = `scale(${(1 - 0.12 * fp).toFixed(4)}) rotate(${f1(-3.5 * fp)}deg)`;
      R.shot.style.boxShadow = fp > 0 ? `0 0 0 ${f1(12 * clamp(fp, 0, 1.2))}px #fbf3e4, 0 24px 40px rgba(0,0,0,${f1(0.35 * clamp(fp))})` : 'none';
      R.shot.style.borderRadius = `${f1(lerp(40, 8, clamp(fp)))}px`;
      const plusP = eob(seg(u, E.saved + 0.15, E.saved + 0.55), 2);
      style(R.plus, `translateX(-50%) scale(${f1(Math.max(0, plusP) * 100) / 100})`, seg(u, E.saved + 0.15, E.saved + 0.3));
      renderCopy(root, u, [E.l1], E.sub);
    },
  };
}

// ======================================================================================
// Szene 3 – Sammelkarte dreht sich: „Neue Katze!“, Name wird getippt
// ======================================================================================
function buildS3() {
  const CW = 540;
  const CH = 760;
  const stars = [1, 1, 1, 0, 0].map((on) => STAR(on ? '#f6d55c' : '#efe3cd')).join('');
  const r = rng(77);
  const conf = Array.from({ length: 44 }, (_, i) => {
    const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.5;
    const v = 700 + r() * 900;
    const c = ['#f28c28', '#f6d55c', '#fbf3e4', '#14213d'][i % 4];
    const sh = i % 3 === 0 ? 'border-radius:50%;width:18px;height:18px' : 'width:14px;height:28px;border-radius:4px';
    return { a, v, spin: (r() - 0.5) * 1400, html: `<div class="abs cf" style="left:0;top:0;${sh};background:${c}"></div>` };
  });
  const html = `<section class="scene" id="s3" style="background:radial-gradient(circle at ${VC.x}px ${VC.y}px, #2aa3a0 0%, #1f8a8a 45%, #176b70 100%)">
    <div class="abs rays" style="left:${VC.x - RMAX}px;top:${VC.y - RMAX}px;width:${RMAX * 2}px;height:${RMAX * 2}px;border-radius:50%;background:repeating-conic-gradient(rgba(251,243,228,.075) 0deg 9deg, rgba(251,243,228,0) 9deg 18deg)"></div>
    <div class="vis" style="left:${VIS.x}px;top:${VIS.y}px">
      <div class="abs confs" style="left:450px;top:400px">${conf.map((c) => c.html).join('')}</div>
      <div class="card-wrap" style="left:${450 - CW / 2}px;top:${470 - CH / 2}px;width:${CW}px;height:${CH}px">
        <div class="card">
          <div class="face front">
            <div class="abs" style="left:60px;top:76px;width:420px;height:400px;border-radius:30px;overflow:hidden">${avatar('gri', CAT_NAME, { eye: 'yellow' }).replace('<svg ', '<svg width="420" height="420" style="margin-top:-10px" preserveAspectRatio="xMidYMid slice" ')}</div>
            <div class="abs" style="left:0;right:0;top:492px;display:flex;justify-content:center;gap:10px;direction:ltr">${stars}</div>
            <div class="namefield" style="top:562px"><span class="nm"></span><span class="caret"></span></div>
            <div class="kdx">${PAW('#1f8a8a')}<span>KediDex</span></div>
            <div class="sheen"></div>
          </div>
          <div class="face back"><img src="/icons/logo.svg" width="300" height="300" alt="" style="border-radius:26%"></div>
        </div>
        <div class="pill newcat">${esc(T.newCat)}</div>
      </div>
    </div>
    ${copyBlock(T.s3, { acc: ['', 'acc-s'] })}
  </section>`;
  const root = el(html);
  const R = { rays: q(root, '.rays'), card: q(root, '.card'), wrap: q(root, '.card-wrap'), sheen: q(root, '.sheen'), nm: q(root, '.nm'), caret: q(root, '.caret'), ribbon: q(root, '.newcat') };
  const cfs = qa(root, '.cf');
  const E = EV.s3;
  let lastName = null;
  return {
    root,
    wipe: { x: VC.x, y: VC.y },
    render(u) {
      R.rays.style.transform = `rotate(${f1(u * 9)}deg)`;
      R.rays.style.opacity = f1(seg(u, 0.1, 0.8));
      const p = seg(u, E.flip[0], E.flip[1]);
      const land = E.flip[1];
      let ry = lerp(180, 0, eob(p, 1.1));
      let rx = lerp(-18, 0, eo(p));
      const idle = seg(u, land, land + 0.6);
      ry += idle * 7 * Math.sin((u - land) * 1.7);
      rx += idle * 4 * Math.sin((u - land) * 1.25 + 0.6);
      const ty = lerp(240, 0, eo(p)) + idle * 8 * Math.sin((u - land) * 1.4);
      const sc = lerp(0.7, 1, eo(p)) * (1 + 0.03 * bump(u, land, 0.35));
      style(R.wrap, `translate3d(0, ${f1(ty)}px, 0) scale(${sc.toFixed(4)})`, seg(u, E.flip[0], E.flip[0] + 0.15));
      R.card.style.transform = `rotateX(${f1(rx)}deg) rotateY(${f1(ry)}deg)`;
      const sx = 120 - ((ry + 30) / 210) * 160;
      R.sheen.style.background = `linear-gradient(105deg, rgba(255,255,255,0) ${f1(sx)}%, rgba(255,255,255,.45) ${f1(sx + 7)}%, rgba(255,255,255,0) ${f1(sx + 15)}%)`;
      const rp = eob(seg(u, E.ribbon, E.ribbon + 0.4), 2.2);
      style(R.ribbon, `translateX(-50%) rotate(${f1(lerp(-12, -3, clamp(rp)))}deg) scale(${f1(Math.max(0, rp) * 100) / 100})`, seg(u, E.ribbon, E.ribbon + 0.12));
      const n = u < E.typeA ? 0 : Math.min(CAT_NAME.length, 1 + Math.floor((u - E.typeA) / E.typeStep));
      const name = CAT_NAME.slice(0, n);
      if (name !== lastName) { R.nm.textContent = name; lastName = name; }
      R.caret.style.opacity = f1(seg(u, land, land + 0.2));
      // Konfetti
      const ct = u - land;
      cfs.forEach((c, i) => {
        const d = conf[i];
        if (ct < 0) { c.style.opacity = '0'; return; }
        const tt = Math.min(ct, 2.4);
        const x = Math.cos(d.a) * d.v * tt * 0.55;
        const y = Math.sin(d.a) * d.v * tt * 0.55 + 620 * tt * tt;
        c.style.transform = `translate(${f1(x)}px, ${f1(y)}px) rotate(${f1(d.spin * tt)}deg)`;
        c.style.opacity = f1(1 - seg(ct, 1.2, 2.0));
      });
      renderCopy(root, u, [E.l1, E.l2], 9);
    },
  };
}

// ======================================================================================
// Szene 4 – 20 Katzen an einem Tag = 20 % Rabatt
// ======================================================================================
const TILE_PATTERNS = ['tekir', 'sarman', 'smokin', 'uc_renk', 'beyaz', 'siyah', 'van', 'gri', 'krem', 'tekir_beyaz', 'sarman_beyaz', 'kaplumbaga', 'gri_beyaz', 'renk_uclu', 'sarman', 'tekir', 'siyah', 'uc_renk', 'smokin', 'van'];
const TILE_NAMES = ['Pamuk', 'Tarcin', 'Boncuk', 'Sutlac', 'Kar', 'Gece', 'Lokum', 'Bulut', 'Kaymak', 'Zeytin', 'Simit', 'Kahve', 'Misket', 'Fistik', 'Paşa', 'Mia', 'Kömür', 'Badem', 'Fındık', 'Şeker'];
function cupSvg() {
  const isFa = LANG === 'fa' || LANG === 'ar';
  return `<svg viewBox="0 0 420 420" width="420" height="420" xmlns="http://www.w3.org/2000/svg">
    <g class="steam" fill="none" stroke="#14213d" stroke-opacity=".28" stroke-width="12" stroke-linecap="round"><path class="st1"/><path class="st2"/><path class="st3"/></g>
    <ellipse cx="200" cy="372" rx="178" ry="34" fill="#14213d"/>
    <ellipse cx="200" cy="362" rx="150" ry="22" fill="#22325a"/>
    <path d="M330 192 c 64 -6 74 86 -6 104" fill="none" stroke="#14213d" stroke-width="24" stroke-linecap="round"/>
    <path d="M60 150 L340 150 L318 312 Q 312 352 270 352 L130 352 Q 88 352 82 312 Z" fill="#fff" stroke="#14213d" stroke-width="10" stroke-linejoin="round"/>
    <path d="M70 214 L330 214 L322 278 L78 278 Z" fill="#f28c28"/>
    <ellipse cx="200" cy="150" rx="140" ry="24" fill="#6b4a32" stroke="#14213d" stroke-width="10"/>
    <path d="M200 166 c -22 -14 -36 -4 -30 6 c 6 10 30 12 30 12 c 0 0 24 -2 30 -12 c 6 -10 -8 -20 -30 -6 z" fill="#fbf3e4" opacity=".9"/>
    <text x="200" y="${isFa ? 266 : 264}" text-anchor="middle" font-family="${isFa ? 'Vazirmatn' : 'Unbounded'}" font-weight="800" font-size="${isFa ? 64 : 56}" fill="#14213d" direction="ltr">${esc(T.pct)}</text>
  </svg>`;
}
function buildS4() {
  const TS = 136;
  const GAP = 18;
  const gx = 450 - (5 * TS + 4 * GAP) / 2;
  const gy = 210;
  const tiles = TILE_PATTERNS.map((p, i) => {
    const c = i % 5;
    const rr = Math.floor(i / 5);
    const col = RTL ? 4 - c : c;
    const x = gx + col * (TS + GAP);
    const y = gy + rr * (TS + GAP);
    return `<div class="tile empty" style="left:${x}px;top:${y}px"></div><div class="tile fill" data-i="${i}" style="left:${x}px;top:${y}px">${avatar(p, TILE_NAMES[i])}</div>`;
  }).join('');
  const sparks = Array.from({ length: 8 }, (_, i) => `<div class="abs spk" style="left:0;top:0;width:44px;height:44px">${STAR('#f6d55c').replace('stroke="#14213d"', 'stroke="#f28c28"')}</div>`).join('');
  const html = `<section class="scene" id="s4" style="background:#fbf3e4">
    <div class="abs" style="inset:0;background-image:radial-gradient(rgba(242,140,40,.16) 3px, transparent 3.6px);background-size:46px 46px"></div>
    <div class="vis" style="left:${VIS.x}px;top:${VIS.y}px">
      <div class="pill counter">${PAW('#f28c28')}<span>${esc(T.today)}</span><span class="frac"><b class="cnum">${num(LANG, 0)}</b><i>/${num(LANG, 20)}</i></span></div>
      <div class="abs grid" style="inset:0">${tiles}</div>
      <div class="abs sparks" style="left:450px;top:520px">${sparks}</div>
      <div class="cupwrap" style="left:240px;top:300px;width:420px;height:420px"><div class="abs cup" style="inset:0">${cupSvg()}</div></div>
    </div>
    ${copyBlock([...T.s4a, ...T.s4b], { sub: T.s4sub, acc: T.s4a.map(() => '').concat(['acc-oi']) })}
  </section>`;
  const root = el(html);
  q(root, '.copy').style.color = '#14213d';
  q(root, '.copy .sub').style.color = 'rgba(20,33,61,.82)';
  const R = { counter: q(root, '.counter'), cnum: q(root, '.cnum'), grid: q(root, '.grid'), cup: q(root, '.cup'), st: qa(root, '.steam path'), sparks: qa(root, '.spk') };
  const fills = qa(root, '.tile.fill');
  const E = EV.s4;
  // Zeitpunkt, an dem Kachel i gefüllt wird
  const tf = fills.map(() => 99);
  for (let u = 0; u < 5; u += 0.002) {
    const n = counterAt(u);
    for (let i = 0; i < n; i++) if (tf[i] === 99) tf[i] = u;
  }
  let lastN = -1;
  const lines = qa(root, '.copy .ln');
  return {
    root,
    wipe: { x: VC.x, y: VC.y + 70 },
    render(u) {
      const cp = eob(seg(u, 0.15, 0.6), 1.6);
      const n = counterAt(u);
      const done = u >= E.count[1];
      style(R.counter, `translateX(-50%) scale(${f1(Math.max(0, cp) * (1 + 0.08 * bump(u, E.count[1], 0.4)) * 100) / 100})`, seg(u, 0.15, 0.3));
      if (n !== lastN) { R.cnum.textContent = num(LANG, n); lastN = n; }
      fills.forEach((t, i) => {
        const p = eob(seg(u, tf[i], tf[i] + 0.28), 2);
        style(t, `scale(${f1(Math.max(0, lerp(0.3, 1, p)) * 100) / 100}) rotate(${f1((1 - clamp(p)) * (i % 2 ? 14 : -14))}deg)`, seg(u, tf[i], tf[i] + 0.08));
      });
      const dim = eo(seg(u, E.cup - 0.05, E.cup + 0.4));
      const pulse = bump(u, E.count[1], 0.4);
      style(R.grid, `scale(${(1 + 0.03 * pulse - 0.05 * dim).toFixed(4)})`, 1 - 0.68 * dim);
      const kp = seg(u, E.cup, E.cup + 0.6);
      const k = eob(kp, 1.8);
      style(R.cup, `translateY(${f1((1 - eo(kp)) * 160 + 6 * Math.sin(u * 2.1) * kp)}px) rotateY(${f1(lerp(70, 0, eo(kp)) + 6 * Math.sin(u * 1.6) * kp)}deg) rotateX(${f1(lerp(20, 4, eo(kp)))}deg) scale(${f1(Math.max(0, k) * 100) / 100})`, seg(u, E.cup, E.cup + 0.15));
      R.st.forEach((path, i) => {
        const x0 = 150 + i * 50;
        const ph = u * 3 + i * 1.7;
        const a = 14;
        path.setAttribute('d', `M${x0} 120 c ${f1(a * Math.sin(ph))} -20 ${f1(-a * Math.sin(ph + 1))} -40 0 -60 s ${f1(a * Math.sin(ph + 2))} -40 0 -60`);
        path.setAttribute('opacity', f1(seg(u, E.cup + 0.3 + i * 0.1, E.cup + 0.8 + i * 0.1)));
      });
      R.sparks.forEach((s, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const sp = eo(seg(u, E.cup + 0.25, E.cup + 1.0));
        const d = lerp(120, 300, sp);
        style(s, `translate(${f1(Math.cos(a) * d - 22)}px, ${f1(Math.sin(a) * d * 0.85 - 22)}px) rotate(${f1(sp * 140)}deg) scale(${f1((1 - sp * 0.4) * 100) / 100})`, (u > E.cup + 0.25 ? 1 : 0) * (1 - seg(u, E.cup + 0.9, E.cup + 1.4)));
      });
      const times = T.s4a.map((_, i) => E.l1 + i * 0.18).concat([E.l2]);
      lines.forEach((ln, i) => appear(ln, u, times[i]));
      const sub = q(root, '.copy .sub');
      appear(sub, u, E.sub, { dy: 30 });
      void done;
    },
  };
}

// ======================================================================================
// Szene 5 – Die ernste Seite: zählen, melden, helfen
// ======================================================================================
const LAND = [[330, -20], [300, 140], [262, 232], [300, 330], [246, 420], [128, 548], [150, 640], [282, 612], [372, 702], [410, 840], [840, 840], [840, -20]];
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function buildS5() {
  const r = rng(321);
  const dots = [];
  while (dots.length < 46) {
    const x = 40 + r() * 760;
    const y = 40 + r() * 740;
    if (!inPoly(x, y, LAND) || !inPoly(x - 26, y, LAND)) continue;
    if (dots.some((d) => Math.hypot(d.x - x, d.y - y) < 54)) continue;
    if (x > 420 && y > 420 && x < 860) continue; // dort liegt die Karte mit den Chips
    dots.push({ x, y });
  }
  const focus = { x: 520, y: 300 };
  const streets = [];
  const rs = rng(9);
  for (let i = 0; i < 16; i++) {
    const x1 = 300 + rs() * 520;
    const y1 = rs() * 820;
    const a = rs() * Math.PI;
    const L = 160 + rs() * 380;
    streets.push(`<path d="M${f1(x1)} ${f1(y1)} l${f1(Math.cos(a) * L)} ${f1(Math.sin(a) * L)}"/>`);
  }
  const map = `<svg width="820" height="820" viewBox="0 0 820 820" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="landc"><path d="M${LAND.map((p) => p.join(' ')).join(' L')} Z"/></clipPath></defs>
    <rect width="820" height="820" fill="#1f8a8a"/>
    <g stroke="#fbf3e4" stroke-opacity=".12" stroke-width="3" fill="none">${Array.from({ length: 7 }, (_, i) => `<path d="M-20 ${120 + i * 110} q 120 -30 240 0 t 240 0"/>`).join('')}</g>
    <path d="M${LAND.map((p) => p.join(' ')).join(' L')} Z" fill="#f3e6cf" stroke="#fbf3e4" stroke-width="10" stroke-linejoin="round"/>
    <g clip-path="url(#landc)"><g stroke="#e2cfae" stroke-width="12" stroke-linecap="round" fill="none">${streets.join('')}</g>
    <ellipse cx="640" cy="160" rx="70" ry="46" fill="#cfe0c4"/><ellipse cx="330" cy="560" rx="54" ry="36" fill="#cfe0c4"/></g>
    <path class="route" d="M792 60 C 700 80, 640 200, ${focus.x} ${focus.y}" fill="none" stroke="#14213d" stroke-width="7" stroke-dasharray="4 16" stroke-linecap="round"/>
    <g class="dots">${dots.map((d) => `<g transform="translate(${f1(d.x)} ${f1(d.y)})"><circle class="dr" r="22" fill="#f28c28" opacity="0"/><circle class="dd" r="13" fill="#f28c28" stroke="#fff" stroke-width="5"/></g>`).join('')}</g>
    <g class="focus" transform="translate(${focus.x} ${focus.y})"><circle class="fr" r="30" fill="none" stroke="#f6d55c" stroke-width="8"/><circle r="18" fill="#f28c28" stroke="#fff" stroke-width="6"/><path class="ok" d="M-9 0 l6 7 l12 -14" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0"/></g>
    <g class="vol"><path d="M0 0 C -26 -30, -40 -46, -40 -64 A 40 40 0 0 1 40 -64 C 40 -46, 26 -30, 0 0 Z" fill="#14213d" stroke="#fff" stroke-width="5"/><g transform="translate(-17 -82) scale(.34)">${HEART.replace(/<\/?svg[^>]*>/g, '')}</g></g>
  </svg>`;
  const chipKeys = ['healthy', 'hungry', 'sick', 'injured'];
  const icons = { healthy: '😺', hungry: '🍽️', sick: '🤒', injured: '🩹' };
  const chips = chipKeys.map((k) => `<div class="chip" data-k="${k}"><span class="e">${icons[k]}</span><span>${esc(T.chips[k])}</span></div>`).join('');
  const popX = 410;
  const popY = 430;
  const html = `<section class="scene" id="s5" style="background:#14213d">
    <div class="abs" style="inset:0;background-image:radial-gradient(rgba(251,243,228,.07) 3px, transparent 3.6px);background-size:46px 46px"></div>
    <div class="vis" style="left:${VIS.x}px;top:${VIS.y}px">
      <div class="map-wrap" style="left:40px;top:30px;width:820px;height:820px"><div class="map">${map}</div></div>
      <div class="pop" style="right:${900 - popX - 470}px;top:${popY}px"><div class="row"><div class="av">${avatar('tekir', 'Zeytin', { eye: 'green' }).replace('<svg ', '<svg width="96" height="96" ')}</div><div class="who"><b>Zeytin</b><span>📍 Moda</span></div></div><div class="chips">${chips}</div><div class="ripple" style="left:0;top:0;width:10px;height:10px;opacity:0"></div></div>
      <div class="abs heart" style="left:${popX + 372}px;top:${popY - 96}px;width:130px;height:117px">${HEART}</div>
    </div>
    ${copyBlock(T.s5, { sub: T.s5sub, acc: ['', 'acc-o'] })}
  </section>`;
  const root = el(html);
  const R = {
    map: q(root, '.map'), pop: q(root, '.pop'), heart: q(root, '.heart'), ripple: q(root, '.ripple'), focus: q(root, '.focus'), fr: q(root, '.fr'),
    ok: q(root, '.ok'), vol: q(root, '.vol'), route: q(root, '.route'), hungry: q(root, '.chip[data-k="hungry"]'), chips: qa(root, '.chip'),
  };
  const dg = qa(root, '.dots > g');
  const dt = dg.map((_, i) => lerp(EV.s5.dots[0], EV.s5.dots[1], ((i * 7919) % dg.length) / dg.length));
  const routeLen = R.route.getTotalLength ? R.route.getTotalLength() : 0;
  const E = EV.s5;
  return {
    root,
    wipe: { x: VC.x, y: VC.y + 70 },
    render(u) {
      const mp = eo(seg(u, E.panel[0], E.panel[1]));
      R.map.style.transform = `translateY(${f1((1 - mp) * 180)}px) rotateX(${f1(lerp(48, 16, mp) + 1.5 * Math.sin(u * 0.9))}deg) rotateZ(${f1(lerp(-8, -2, mp))}deg)`;
      R.map.style.opacity = f1(seg(u, E.panel[0], E.panel[0] + 0.3));
      dg.forEach((g, i) => {
        const p = eob(seg(u, dt[i], dt[i] + 0.3), 2.4);
        const ring = seg(u, dt[i], dt[i] + 0.7);
        q(g, '.dd').setAttribute('transform', `scale(${f1(Math.max(0, p) * 100) / 100})`);
        q(g, '.dd').setAttribute('opacity', u >= dt[i] ? '1' : '0');
        const dr = q(g, '.dr');
        dr.setAttribute('transform', `scale(${f1(lerp(0.6, 2.2, ring) * 100) / 100})`);
        dr.setAttribute('opacity', f1(u >= dt[i] ? 0.5 * (1 - ring) : 0));
      });
      const fp = eob(seg(u, E.focus, E.focus + 0.4), 2);
      R.focus.setAttribute('transform', `translate(520 300) scale(${f1(Math.max(0, fp) * 100) / 100})`);
      R.focus.setAttribute('opacity', u >= E.focus ? '1' : '0');
      const fr = ((u - E.focus) % 1.1) / 1.1;
      R.fr.setAttribute('r', f1(26 + 26 * clamp(fr)));
      R.fr.setAttribute('opacity', f1(u >= E.focus ? 1 - clamp(fr) : 0));
      // Karte mit Zustands-Chips
      const pp = eob(seg(u, E.pop, E.pop + 0.45), 1.6);
      style(R.pop, `translate(${f1((1 - clamp(pp)) * 40)}px, ${f1((1 - clamp(pp)) * 60)}px) scale(${f1(Math.max(0, lerp(0.5, 1, pp)) * 100) / 100})`, seg(u, E.pop, E.pop + 0.15));
      R.pop.style.transformOrigin = '20% 0%';
      R.chips.forEach((c, i) => appear(c, u, E.pop + 0.15 + i * 0.07, { dy: 20, d: 0.35 }));
      const on = u >= E.tap;
      R.hungry.classList.toggle('on', on);
      const tb = bump(u, E.tap - 0.04, 0.3);
      R.hungry.style.transform = `scale(${(1 - 0.08 * tb).toFixed(3)})`;
      const rp = seg(u, E.tap, E.tap + 0.6);
      const hr = R.hungry;
      const cx = hr.offsetLeft + hr.offsetWidth / 2;
      const cy = hr.offsetTop + hr.offsetHeight / 2;
      const rad = lerp(20, 150, eo(rp));
      R.ripple.style.left = `${f1(cx - rad)}px`;
      R.ripple.style.top = `${f1(cy - rad)}px`;
      R.ripple.style.width = R.ripple.style.height = `${f1(rad * 2)}px`;
      R.ripple.style.opacity = f1(u >= E.tap ? 1 - rp : 0);
      // Herz
      const hp = eob(seg(u, E.heart, E.heart + 0.4), 2.4);
      const beat = 1 + 0.1 * bump(u, E.heart + 0.6, 0.25) + 0.1 * bump(u, E.heart + 0.95, 0.25) + 0.08 * bump(u, E.heart + 1.7, 0.25);
      style(R.heart, `rotate(${f1(8 * (1 - clamp(hp)))}deg) scale(${f1(Math.max(0, hp) * beat * 100) / 100})`, seg(u, E.heart, E.heart + 0.12));
      // Freiwillige:r kommt
      const vp = eio(seg(u, E.help[0], E.help[1]));
      if (routeLen) {
        const pt = R.route.getPointAtLength(routeLen * vp);
        R.vol.setAttribute('transform', `translate(${f1(pt.x)} ${f1(pt.y - 22)})`);
        R.route.setAttribute('stroke-dashoffset', '0');
      }
      R.vol.setAttribute('opacity', f1(seg(u, E.help[0] - 0.1, E.help[0] + 0.1)));
      R.route.setAttribute('opacity', f1(0.55 * seg(u, E.help[0] - 0.2, E.help[0] + 0.1)));
      R.ok.setAttribute('opacity', f1(seg(u, E.help[1], E.help[1] + 0.15)));
      renderCopy(root, u, [E.l1, E.l2], E.sub);
    },
  };
}

// ======================================================================================
// Szene 6 – Abspann: Logo, Name, Slogan, Hinweise, Macher-Zeile
// ======================================================================================
function buildS6() {
  const r = rng(99);
  let stars = '';
  for (let i = 0; i < (F16 ? 80 : 70); i++) stars += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(1 + r() * 2.2)}" fill="${r() < 0.25 ? '#f6d55c' : '#fbf3e4'}"/>`;
  const L = F16
    ? { logo: { x: 960, y: 236, s: 230 }, bubble: { x: 1104, y: 92 }, word: { y: 398, fs: 108, lines: ['<span class="o">Cat Me</span> If You Can'] }, play: 570, rules: 712, maker: 930 }
    : { logo: { x: 540, y: 446, s: 300 }, bubble: { x: 650, y: 262 }, word: { y: 664, fs: 122, lines: ['<span class="o">Cat Me</span>', 'If You Can'] }, play: 1000, rules: 1150, maker: 1392 };
  const peek = F16 ? [['sarman', 110, 0.9], ['tekir', 290, 0.72], ['smokin', 1630, 0.72], ['uc_renk', 1810, 0.9]] : [['sarman', 150, 1], ['tekir', 400, 0.85], ['smokin', 660, 0.85], ['uc_renk', 920, 1]];
  const slogan = F16 ? esc(SLOGAN) : 'Cat me<br>if you can.';
  const html = `<section class="scene" id="s6" style="background:radial-gradient(circle at 50% ${F16 ? 30 : 30}%, #1d2f57 0%, #14213d 55%, #0d1730 100%)">
    <svg class="abs" width="${W}" height="${H}" style="left:0;top:0"><g class="stars">${stars}</g></svg>
    ${peek.map(([p, x, k], i) => `<div class="abs peek" data-i="${i}" style="left:${x - 110 * k}px;top:${H - 170 * k}px;width:${220 * k}px;height:${220 * k}px"><svg viewBox="0 0 120 120" width="100%" height="100%">${headOnly(p, 'Peek' + i, { eye: i % 2 ? 'green' : 'yellow' })}</svg></div>`).join('')}
    <div class="abs lglow" style="left:${L.logo.x - L.logo.s * 1.3}px;top:${L.logo.y - L.logo.s * 1.3}px;width:${L.logo.s * 2.6}px;height:${L.logo.s * 2.6}px;border-radius:50%;background:radial-gradient(rgba(242,140,40,.32), rgba(242,140,40,0) 65%)"></div>
    <img class="logo" src="/icons/logo.svg" alt="" width="${L.logo.s}" height="${L.logo.s}" style="left:${L.logo.x - L.logo.s / 2}px;top:${L.logo.y - L.logo.s / 2}px;width:${L.logo.s}px;height:${L.logo.s}px">
    <div class="bubble" style="left:${L.bubble.x}px;top:${L.bubble.y}px">${slogan}<svg class="abs" width="44" height="40" style="left:12px;bottom:-26px"><path d="M4 0 L40 0 L6 36 Z" fill="#fbf3e4"/></svg></div>
    <div class="word" style="top:${L.word.y}px;font-size:${L.word.fs}px">${L.word.lines.map((l) => `<div class="wl"><span>${l}</span></div>`).join('')}</div>
    <div class="pill play" style="top:${L.play}px">${PAW('#14213d')}<span>${esc(T.play)}</span></div>
    <div class="rules" style="top:${L.rules}px">${segLine(T.rules)}</div>
    <div class="maker" style="top:${L.maker}px">${segLine(T.maker)}</div>
  </section>`;
  const root = el(html);
  const R = { glow: q(root, '.lglow'), logo: q(root, '.logo'), bubble: q(root, '.bubble'), wl: qa(root, '.wl'), play: q(root, '.play'), rules: q(root, '.rules'), maker: q(root, '.maker'), stars: qa(root, '.stars circle'), peek: qa(root, '.peek') };
  R.bubble.style.transformOrigin = '0% 100%';
  const E = EV.s6;
  return {
    root,
    wipe: { x: W / 2, y: H / 2 },
    render(u) {
      R.stars.forEach((c, i) => c.setAttribute('opacity', f1(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(u * 1.3 + i * 2.1)))));
      const lp = seg(u, E.logo, E.logo + 0.7);
      const k = eob(lp, 1.6);
      const fl = seg(u, E.logo + 0.7, E.logo + 1.4);
      style(R.logo, `translateY(${f1(fl * 8 * Math.sin((u - E.logo) * 1.6))}px) perspective(1400px) rotateY(${f1(lerp(-70, 0, eo(lp)) + fl * 8 * Math.sin((u - E.logo) * 1.1))}deg) rotateX(${f1(fl * 4 * Math.sin((u - E.logo) * 0.9 + 1))}deg) scale(${f1(Math.max(0, k) * 100) / 100})`, seg(u, E.logo, E.logo + 0.2));
      style(R.glow, `scale(${f1((0.9 + 0.1 * Math.sin(u * 1.4)) * 100) / 100})`, seg(u, E.logo, E.logo + 0.8));
      const bp = eob(seg(u, E.bubble, E.bubble + 0.45), 2);
      style(R.bubble, `rotate(${f1(lerp(-10, -3, clamp(bp)))}deg) scale(${f1(Math.max(0, bp) * 100) / 100})`, seg(u, E.bubble, E.bubble + 0.12));
      R.wl.forEach((w, i) => appear(w, u, E.word + i * 0.15, { dy: 50 }));
      const pp = eob(seg(u, E.pill, E.pill + 0.45), 1.8);
      style(R.play, `translateX(-50%) scale(${f1(Math.max(0, pp) * (1 + 0.02 * Math.sin((u - E.pill) * 3) * seg(u, E.pill + 0.6, E.pill + 1)) * 1000) / 1000})`, seg(u, E.pill, E.pill + 0.15));
      appear(R.rules, u, E.rules, { dy: 24 });
      appear(R.maker, u, E.maker, { dy: 24 });
      R.peek.forEach((p, i) => {
        const t0 = 0.5 + i * 0.18;
        const pk = eob(seg(u, t0, t0 + 0.6), 1.4);
        const h = 170 * (F16 ? [0.9, 0.72, 0.72, 0.9][i] : [1, 0.85, 0.85, 1][i]);
        p.style.transform = `translateY(${f1((1 - pk) * h * 1.2 + 4 * Math.sin(u * 1.5 + i))}px) rotate(${f1((i % 2 ? 6 : -6) + 3 * Math.sin(u * 1.2 + i))}deg)`;
      });
    },
  };
}

// ======================================================================================
// Aufbau und Zeitsteuerung
// ======================================================================================
async function fontsReady() {
  const all = JSON.stringify(T) + SLOGAN + CAT_NAME + 'Cat Me If You Can KediDex +0123456789/%';
  const loads = ['800 100px Unbounded', '700 100px Unbounded', '800 40px Manrope', '700 40px Manrope', '600 40px Manrope'];
  if (RTL) loads.push('800 100px Vazirmatn', '700 40px Vazirmatn', '600 40px Vazirmatn');
  await Promise.all(loads.map((f) => document.fonts.load(f, all)));
  await document.fonts.ready;
}

window.renderAt = (t) => {
  ORDER.forEach((id, i) => {
    const sc = scenes[id];
    const s = START[id];
    const next = ORDER[i + 1];
    const endVis = next ? START[next] + XF : DURATION + 10;
    const visible = t >= s && t < endVis;
    sc.root.style.display = visible ? 'block' : 'none';
    sc.root.style.zIndex = String(i + 1);
    if (!visible) return;
    const u = t - s;
    if (i > 0 && u < XF) {
      const p = eio(u / XF);
      sc.root.style.clipPath = `circle(${f1(p * RMAX)}px at ${f1(sc.wipe.x)}px ${f1(sc.wipe.y)}px)`;
    } else sc.root.style.clipPath = 'none';
    if (next && t > START[next]) {
      const p = eio(seg(t, START[next], START[next] + XF));
      sc.root.style.transform = `scale(${(1 - 0.06 * p).toFixed(4)})`;
    } else sc.root.style.transform = 'none';
    sc.render(u);
  });
};

async function init() {
  stage.className = `${F16 ? 'f16' : 'f9'} ${RTL ? 'rtl' : 'ltr'}`;
  stage.dir = RTL ? 'rtl' : 'ltr';
  stage.lang = LANG;
  document.documentElement.lang = LANG;
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  await fontsReady();
  const builders = { s1: buildS1, s2: buildS2, s3: buildS3, s4: buildS4, s5: buildS5, s6: buildS6 };
  for (const id of ORDER) {
    scenes[id] = builders[id]();
    stage.appendChild(scenes[id].root);
  }
  await Promise.all(qa(stage, 'img').map((img) => img.decode().catch(() => {})));
  // Texte einpassen (dafür alle Szenen kurz sichtbar)
  for (const id of ORDER) scenes[id].root.style.display = 'block';
  for (const c of qa(stage, '.copy')) fitCopy(c);
  for (const p of qa(stage, '.pop')) fitChips(p);
  for (const b of qa(stage, '.rules, .maker')) breakAtSeparators(b);
  window.renderAt(params.has('t') ? Number(params.get('t')) : 0);
  window.__meta = { lang: LANG, format: FORMAT, W, H, sizes: qa(stage, '.copy').map((c) => c.dataset.size) };
  window.__ready = true;
}
const stage = document.getElementById('stage');
init().catch((e) => {
  window.__error = String((e && e.stack) || e);
  console.error(e);
});
