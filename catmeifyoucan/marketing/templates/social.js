// Cat Me If You Can – baut ein Social-Media-Bild aus den Texten (marketing/texts.js) und den Zeichnungen
// (art.js, Katzen aus /js/avatar.js). Danach werden Überschriften eingepasst und die Bild-Bühne skaliert.
// Fertig, wenn <html data-ready="1">; window.__layout() liefert die Layout-Prüfung für render.js.
import { catAvatarSvg } from '/js/avatar.js';
import { TEXTS, FORMATS, SLOGAN, HASHTAG, BRANDS, CAT_NAME, MOTIFS, num } from '/marketing/texts.js';
import { C, icon, stars, starfield, moon, cityscape, yarn, confetti, viewfinder, mapPanel, cafeWindow, pawTrail } from './art.js';

const q = new URLSearchParams(location.search);
const motif = MOTIFS.includes(q.get('motif')) || q.get('motif') === 'og' ? q.get('motif') : 'cat-me';
const format = motif === 'og' ? 'og' : FORMATS[q.get('format')] && q.get('format') !== 'og' ? q.get('format') : 'post';
const lang = TEXTS[q.get('lang')] ? q.get('lang') : 'en';
const T = TEXTS[lang];
const EN = TEXTS.en;
const dir = T.dir;
const F = FORMATS[format];
const M = { ...(EN[motif] || {}), ...(T[motif] || {}) };
const story = format === 'story';

document.documentElement.lang = lang;
document.documentElement.dir = dir;

// ───────────────────────── Helfer ─────────────────────────
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const BRAND_RE = new RegExp(BRANDS.map((b) => b.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&')).join('|'), 'g');
/** Text sicher einsetzen; Markennamen laufen immer links→rechts und brechen nie um. */
const rich = (s) => esc(s).replace(BRAND_RE, (m) => `<bdi class="nb" dir="ltr">${m}</bdi>`);

const CATS = {
  sarman: { id: 'tarcin', pattern: 'sarman', eye_color: 'green' },
  tekir: { id: 'pamuk-7', pattern: 'tekir', eye_color: 'yellow' },
  siyah: { id: 'gece', pattern: 'siyah', eye_color: 'yellow' },
  smokin: { id: 'frak', pattern: 'smokin', eye_color: 'green' },
  uc_renk: { id: 'sans', pattern: 'uc_renk', eye_color: 'copper' },
  gri: { id: 'duman', pattern: 'gri', eye_color: 'yellow' },
  beyaz: { id: 'kar', pattern: 'beyaz', eye_color: 'odd' },
  kaplumbaga: { id: 'kaplan', pattern: 'kaplumbaga', eye_color: 'copper' },
  van: { id: 'van', pattern: 'van', eye_color: 'blue' },
  tekir_beyaz: { id: 'bulut', pattern: 'tekir_beyaz', eye_color: 'green' },
};

function kcard({ cat, w, x, y, rot = 0, tag = '', name = '', n = 3, dex = true, z = 1 }) {
  return `<div class="kcard" style="--cw:${w}px;--rot:${rot}deg;left:${x}px;top:${y}px;z-index:${z}">
    ${tag ? `<div class="kcard-tag" dir="${dir}">${esc(tag)}</div>` : ''}
    <div class="kcard-pic">${catAvatarSvg(CATS[cat])}</div>
    <div class="kcard-stars">${stars(n)}</div>
    ${name ? `<div class="kcard-name" dir="ltr">${esc(name)}<i class="caret"></i></div>` : ''}
    ${dex ? `<div class="kcard-dex" dir="ltr">${icon('paw')}KediDex</div>` : ''}
  </div>`;
}

const head = (lines, hl, fit, extra = '') =>
  `<h1 class="head" data-tb data-fit="${fit}" ${extra}>${lines.map((l, i) => `<span class="ln${i === hl ? ' hl' : ''}">${rich(l)}</span>`).join('')}</h1>`;
const sub = (s, fit) => `<p class="sub" data-tb data-fit="${fit}">${rich(s)}</p>`;

function topBar() {
  return `<header class="top">
    <div class="brand" data-tb><img src="/icons/logo.svg" alt="" width="68" height="68"><span class="wordmark" dir="ltr">Cat Me If You Can</span></div>
    <div class="place" data-tb>${icon('pin')}<span>${esc(T.place)}</span></div>
  </header>`;
}

function foot({ maker = true } = {}) {
  return `<footer class="foot">
    <div class="foot-row">
      <div class="cta" data-tb><span class="ic-wrap">${icon('play')}</span><span>${esc(T.cta)}</span></div>
      <div class="tag" data-tb dir="ltr">${HASHTAG}</div>
    </div>
    ${maker ? `<p class="maker" data-tb data-fit="${dir === 'rtl' ? 22 : 21},17,1">${rich(T.maker)}</p>` : ''}
  </footer>`;
}

const S = story
  ? { head: '118,60,3', headLong: '96,56,3', sub: '42,30,3', small: '30,24,2' }
  : { head: '104,56,2', headLong: '92,52,3', sub: '37,28,2', small: '28,22,2' };

// ───────────────────────── Bühnen (Bildteil jedes Motivs) ─────────────────────────
function catMeStage() {
  const sp = (x, y, r) => `<svg class="abs" style="left:${x - r}px;top:${y - r}px" width="${r * 2}" height="${r * 2}" viewBox="-1 -1 2 2"><path d="M0-1Q.28-.28 1 0Q.28.28 0 1Q-.28.28-1 0Q-.28-.28 0-1Z" fill="${C.sun}"/></svg>`;
  return {
    w: 860, h: 680,
    html: `
      <div class="glow" style="left:130px;top:40px;width:600px;height:600px"></div>
      <svg class="abs" style="left:120px;top:150px" width="200" height="140" viewBox="0 0 200 140" aria-hidden="true">
        <path d="M10 120C60 40 130 20 196 30" fill="none" stroke="${C.cream}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 18" opacity=".7"/>
      </svg>
      <div class="abs" style="left:40px;top:60px;transform:rotate(-18deg)">${yarn(170)}</div>
      <img class="logo-big" src="/icons/logo.svg" alt="" style="left:200px;top:110px;width:460px;height:460px;transform:rotate(-3deg)">
      ${kcard({ cat: 'tekir', w: 196, x: 22, y: 360, rot: -13, n: 2, z: 2 })}
      ${kcard({ cat: 'smokin', w: 186, x: 652, y: 96, rot: 12, n: 4, z: 2 })}
      ${sp(690, 520, 22)}${sp(770, 470, 12)}${sp(170, 640, 14)}${sp(600, 40, 16)}`,
  };
}

function twentyStage() {
  const cats = ['tekir', 'siyah', 'uc_renk', 'sarman', 'gri', 'smokin', 'kaplumbaga'];
  const W = 900;
  const cw = 196;
  const pivot = 760;
  const cards = cats
    .map((c, i) => {
      const a = (i - 3) * 11;
      return `<div class="kcard" style="--cw:${cw}px;left:${W / 2 - cw / 2}px;top:150px;transform-origin:50% ${pivot}px;transform:rotate(${a}deg);z-index:${i === 3 ? 5 : 5 - Math.abs(i - 3)}">
        <div class="kcard-pic">${catAvatarSvg(CATS[c])}</div><div class="kcard-stars">${stars(1 + ((i * 2) % 4))}</div>${i === 3 ? `<div class="kcard-dex" dir="ltr">${icon('paw')}KediDex</div>` : ''}</div>`;
    })
    .join('');
  return {
    w: W, h: 700,
    html: `${cards}
      <div class="badge20" style="left:${W / 2 - 125}px;top:0;z-index:9" dir="${dir}">${icon('check')}<span class="big" dir="ltr">${num(lang, 20)}/${num(lang, 20)}</span><span class="small">${esc(M.today)}</span></div>
      <div class="ticket" style="left:${dir === 'rtl' ? 40 : 420}px;top:520px;transform:rotate(${dir === 'rtl' ? -5 : 5}deg);z-index:10" dir="${dir}">
        <span class="tk-ic">${icon('cup')}</span><span class="tk-txt" data-fitw="440,30">${esc(M.ticket)}</span>
      </div>`,
  };
}

function nameItStage() {
  return {
    w: 760, h: 800,
    html: `
      <div class="abs" style="left:0;top:0">${confetti({ w: 760, h: 800, n: 46, seed: 4, hole: { x: 120, y: 40, w: 520, h: 740 } })}</div>
      <div class="abs" style="left:110px;top:30px;opacity:.85">${viewfinder(540, 760, { color: C.cream, len: 90, sw: 12, r: 26 })}</div>
      ${kcard({ cat: 'sarman', w: 440, x: 160, y: 110, rot: -4, tag: M.newCat, name: CAT_NAME, n: 3, z: 3 })}`,
  };
}

function countsStage() {
  const c = M.chips;
  const chip = (k, on) => `<div class="chipw"><div class="chip c-${k}${on ? ' on' : ''}" data-shrink="19">${icon(k)}<span>${esc(c[k])}</span></div>${on ? `<span class="tick">${icon('check')}</span>` : ''}</div>`;
  return {
    w: 980, h: 600,
    html: `
      <div class="abs" style="left:${dir === 'rtl' ? 10 : 420}px;top:20px;transform:rotate(${dir === 'rtl' ? -3 : 3}deg);filter:drop-shadow(0 18px 30px rgba(20,33,61,.18))">${mapPanel(540, 560)}</div>
      <div class="chipcard" dir="${dir}" style="${dir === 'rtl' ? 'right' : 'left'}:10px;top:90px;width:540px;--rot:${dir === 'rtl' ? 3 : -3}deg;z-index:3">
        <div class="chipcard-head"><div class="pic">${catAvatarSvg(CATS.tekir)}</div><div class="ask" data-tb>${esc(M.ask)}</div></div>
        <div class="chips">${chip('healthy')}${chip('hungry', true)}${chip('sick')}${chip('injured')}</div>
      </div>`,
  };
}

function madeStage() {
  return { w: 900, h: 556, html: `<div class="abs" style="left:0;top:0">${cafeWindow()}</div>` };
}

// ───────────────────────── Hintergründe ─────────────────────────
function nightBg(w, h, { sky, water, eyes = 3, avoid = [], withMoon = true }) {
  const city = cityscape({ w, sky, water, seed: 3, eyes, lights: 0.2 });
  return `
    <div class="stars" style="left:0;top:0">${starfield({ w, h: h - water - sky * 0.95, n: Math.round(w * h / 9000), seed: 5, avoid })}</div>
    ${withMoon ? `<div style="left:0;top:0">${moon(w - 170, 118, 54)}</div>` : ''}
    <div style="left:0;bottom:0">${city}</div>`;
}

/** Deko für die textfreien Story-Zonen (oben 220 px, unten 380 px). */
function storyDeco() {
  const W = F.w;
  const H = F.h;
  const trail = (o) => `<div style="left:0;top:0">${pawTrail({ w: W, h: H, ...o })}</div>`;
  if (motif === 'twenty') return trail({ from: [-40, H - 120], to: [W + 40, H - 300], bend: 0.12, n: 10, size: 52, color: C.navy, op: 0.16 });
  if (motif === 'every-cat-counts') return trail({ from: [W + 40, H - 110], to: [-40, H - 290], bend: -0.1, n: 10, size: 50, color: C.teal, op: 0.22 });
  if (motif === 'made-in-kadikoy') return trail({ from: [-40, H - 130], to: [W + 40, H - 260], bend: 0.14, n: 10, size: 50, color: C.orangeD, op: 0.22 });
  if (motif === 'name-it') return `<div style="left:0;top:${H - 380}px">${confetti({ w: W, h: 380, n: 26, seed: 31 })}</div><div style="left:0;top:0">${confetti({ w: W, h: 200, n: 16, seed: 32 })}</div>`;
  return '';
}

// ───────────────────────── Motive ─────────────────────────
function build() {
  const W = F.w;
  const H = F.h;
  let bg = '';
  let stage;
  let sections;
  let align = '';
  if (motif === 'og') return buildOg();
  if (motif === 'cat-me') {
    align = 'align-center';
    bg = nightBg(W, H, story ? { sky: 250, water: 130, eyes: 4 } : { sky: 150, water: 46, eyes: 2, withMoon: false });
    stage = catMeStage();
    sections = [
      topBar(),
      'VISUAL',
      `<div class="copy">
        <h1 class="head slogan" lang="en" dir="ltr" data-tb data-fit="${story ? '124,70,2' : '112,64,2'}"><span class="ln">Cat me</span><span class="ln hl">if you can.</span></h1>
        ${sub(M.line, S.sub)}
      </div>`,
      foot(),
    ];
  } else if (motif === 'twenty') {
    bg = `<div class="stars" style="left:0;top:0">${starfield({ w: W, h: H, n: 26, seed: 12, color: C.cream, sparkleColor: C.sun })}</div>`;
    stage = twentyStage();
    sections = [
      topBar(),
      'VISUAL',
      `<div class="copy">
        ${head(M.head, 1, S.head)}
        ${sub(M.sub, S.sub)}
        <div class="note" data-tb>${icon('cup')}<span>${esc(M.note)}</span></div>
      </div>`,
      foot(),
    ];
  } else if (motif === 'name-it') {
    align = 'align-center';
    stage = nameItStage();
    sections = [
      topBar(),
      'VISUAL',
      `<div class="copy">${head(M.head, 1, S.head)}${sub(M.sub, S.sub)}</div>`,
      foot(),
    ];
  } else if (motif === 'every-cat-counts') {
    stage = countsStage();
    const steps = M.steps
      .map((s, i) => `<div class="step"><div class="sic">${icon(['camera', 'tap', 'heart'][i])}<span class="num" dir="ltr">${num(lang, i + 1)}</span></div><div class="lbl" data-tb>${esc(s)}</div></div>`)
      .join('');
    sections = [
      topBar(),
      `<div class="copy">
        <div class="kicker" data-tb>${icon('heart')}<span>${esc(M.kicker)}</span></div>
        ${head(M.head, -1, S.headLong)}
        ${sub(M.sub, S.sub)}
      </div>`,
      'VISUAL',
      `<div class="steps">${steps}</div>`,
      story ? `<p class="privacy" data-tb>${icon('pin')}<span>${esc(M.privacy)}</span></p>` : '',
      foot(),
    ];
  } else if (motif === 'made-in-kadikoy') {
    stage = madeStage();
    sections = [
      topBar(),
      `<div class="copy">
        ${head(M.head, 1, S.headLong)}
        ${sub(M.sub, S.sub)}
        <p class="pun" data-tb data-fit="${story ? '34,26,2' : '31,24,2'}">${rich(M.pun)}</p>
      </div>`,
      'VISUAL',
      foot({ maker: false }),
    ];
  }
  if (story) bg += storyDeco();
  const visual = `<div class="visual"><div class="stage" style="width:${stage.w}px;height:${stage.h}px">${stage.html}</div></div>`;
  return `<div class="frame m-${motif} f-${format} ${align}" data-motif="${motif}">
    <div class="bg">${bg}</div>
    <div class="content">${sections.map((s) => (s === 'VISUAL' ? visual : s)).join('')}</div>
  </div>`;
}

function ogStage() {
  return {
    w: 640, h: 560,
    html: `
      <div class="glow" style="left:60px;top:20px;width:520px;height:520px"></div>
      <div class="abs" style="left:0;top:10px;transform:rotate(-18deg)">${yarn(130)}</div>
      <img class="logo-big" src="/icons/logo.svg" alt="" style="left:120px;top:80px;width:400px;height:400px;transform:rotate(-3deg)">
      ${kcard({ cat: 'tekir', w: 176, x: 6, y: 320, rot: -12, n: 2, z: 2 })}
      ${kcard({ cat: 'smokin', w: 166, x: 466, y: 40, rot: 12, n: 4, z: 2 })}`,
  };
}

function buildOg() {
  const stage = ogStage();
  return `<div class="frame m-og f-og" data-motif="og">
    <div class="bg">
      <div class="stars" style="left:0;top:0">${starfield({ w: 1200, h: 520, n: 70, seed: 6 })}</div>
      <div style="left:0;bottom:0;opacity:.9">${cityscape({ w: 1200, sky: 150, water: 40, seed: 3, eyes: 2, lights: 0.16, ferry: false })}</div>
    </div>
    <div class="og-wrap">
      <div class="og-text">
        <div class="brand" data-tb><img src="/icons/logo.svg" alt="" width="60" height="60"><span class="wordmark" dir="ltr">Cat Me If You Can</span></div>
        <h1 class="head slogan" lang="en" dir="ltr" data-tb data-fit="86,52,2"><span class="ln">Cat me</span><span class="ln hl">if you can.</span></h1>
        <p class="sub" data-tb data-fit="31,24,2">${rich(T['cat-me'].line)}</p>
        <div class="og-row">
          <div class="cta" data-tb><span class="ic-wrap">${icon('play')}</span><span>${esc(T.cta)}</span></div>
        </div>
      </div>
      <div class="visual"><div class="stage" style="width:${stage.w}px;height:${stage.h}px">${stage.html}</div></div>
    </div>
  </div>`;
}

// ───────────────────────── Einpassen ─────────────────────────
/** Anzahl der Zeilen eines Elements (über die Zeilen-Rechtecke des Textes). */
function lineCount(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const fs = parseFloat(getComputedStyle(el).fontSize);
  const mids = [...range.getClientRects()].filter((r) => r.width > 0.5).map((r) => r.top + r.height / 2).sort((a, b) => a - b);
  let n = 0;
  let last = -1e9;
  for (const m of mids) {
    if (m - last > fs * 0.6) {
      n++;
      last = m;
    }
  }
  return n;
}

function fitEl(el) {
  const [max, min, maxLines] = el.dataset.fit.split(',').map(Number);
  const parts = el.querySelector('.ln') ? [...el.querySelectorAll('.ln')] : [el];
  const ok = (lines) => {
    if (el.scrollWidth > el.clientWidth + 1) return false;
    for (const p of parts) if (p.scrollWidth > p.clientWidth + 1) return false;
    const counts = parts.map(lineCount);
    return lines === parts.length && parts.length > 1 ? counts.every((c) => c === 1) : counts.reduce((a, b) => a + b, 0) <= lines;
  };
  // Erst so wenige Zeilen wie möglich (groß genug), dann eine Zeile mehr, zuletzt bis zur Mindestgröße.
  const isHead = el.classList.contains('head');
  for (let lines = isHead ? parts.length : maxLines; lines <= maxLines; lines++) {
    const floor = lines === maxLines ? min : Math.max(min, Math.round(max * 0.6));
    for (let s = max; s >= floor; s -= 1) {
      el.style.fontSize = `${s}px`;
      if (ok(lines)) return;
    }
  }
  el.style.fontSize = `${min}px`;
  el.dataset.fitFail = '1';
}

/** Einzeiliger Text, der höchstens maxW breit sein darf (Gutschein). */
function fitWidth(el) {
  const [maxW, min] = el.dataset.fitw.split(',').map(Number);
  let s = parseFloat(getComputedStyle(el).fontSize);
  while (el.getBoundingClientRect().width > maxW && s > min) {
    s -= 1;
    el.style.fontSize = `${s}px`;
  }
}

/** Schrift verkleinern, bis nichts mehr überläuft (Chips). */
function shrink(el) {
  const min = Number(el.dataset.shrink);
  let s = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 1 && s > min) {
    s -= 1;
    el.style.fontSize = `${s}px`;
  }
}

/** Sterne/Funkeln entfernen, die hinter Text liegen würden. */
function thinStars() {
  const pad = 16;
  const rects = [];
  for (const el of document.querySelectorAll('[data-tb], .cta, .place')) {
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const r of range.getClientRects()) rects.push(r);
    rects.push(el.getBoundingClientRect());
  }
  for (const layer of document.querySelectorAll('.stars svg')) {
    for (const node of [...layer.children]) {
      const b = node.getBoundingClientRect();
      if (rects.some((r) => b.left < r.right + pad && r.left - pad < b.right && b.top < r.bottom + pad && r.top - pad < b.bottom)) node.remove();
    }
  }
}

function fitStage() {
  for (const v of document.querySelectorAll('.visual')) {
    const st = v.querySelector('.stage');
    const r = v.getBoundingClientRect();
    const sw = parseFloat(st.style.width);
    const sh = parseFloat(st.style.height);
    const maxScale = format === 'og' ? 0.95 : 1.3;
    const s = Math.min(r.width / sw, r.height / sh, maxScale);
    st.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
    st.dataset.scale = s.toFixed(3);
  }
}

// ───────────────────────── Prüfung (für render.js) ─────────────────────────
window.__layout = function layout() {
  const issues = [];
  const frame = document.querySelector('.frame');
  const fr = frame.getBoundingClientRect();
  const margin = format === 'og' ? 20 : 32;
  const textRects = [];
  const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 0.5) continue;
      textRects.push({ r, t: n.textContent.trim().slice(0, 40) });
    }
  }
  for (const { r, t } of textRects) {
    if (r.left < fr.left + margin - 0.5 || r.right > fr.right - margin + 0.5 || r.top < fr.top + margin - 0.5 || r.bottom > fr.bottom - margin + 0.5) {
      issues.push(`Text zu nah am Rand/außerhalb: "${t}" (${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)})`);
    }
    if (story && (r.top < F.safeTop || r.bottom > F.h - F.safeBottom)) {
      issues.push(`Text in der Story-Schutzzone: "${t}" (y ${Math.round(r.top)}–${Math.round(r.bottom)})`);
    }
  }
  // Überlauf in Textblöcken
  for (const el of frame.querySelectorAll('[data-tb], .kcard-name, .kcard-tag, .chip, .tk-txt, .badge20, .step .lbl')) {
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') issues.push(`Überlauf: "${el.textContent.trim().slice(0, 40)}" (${el.scrollWidth} > ${el.clientWidth})`);
    if (el.dataset.fitFail) issues.push(`Passt nicht in die vorgesehenen Zeilen: "${el.textContent.trim().slice(0, 40)}"`);
  }
  // Überlappung der Textblöcke untereinander (außerhalb der Bühne)
  const blocks = [...frame.querySelectorAll('[data-tb]')].filter((el) => !el.closest('.stage'));
  const box = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  };
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i].contains(blocks[j]) || blocks[j].contains(blocks[i])) continue;
      const a = box(blocks[i]);
      const b = box(blocks[j]);
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
        issues.push(`Überlappung: "${blocks[i].textContent.trim().slice(0, 24)}" / "${blocks[j].textContent.trim().slice(0, 24)}"`);
      }
    }
  }
  // Bühne darf die Texte nicht überdecken
  for (const st of frame.querySelectorAll('.visual')) {
    const vr = st.getBoundingClientRect();
    for (const el of blocks) {
      const b = box(el);
      if (b.left < vr.right - 1 && vr.left < b.right - 1 && b.top < vr.bottom - 1 && vr.top < b.bottom - 1) issues.push(`Bild überdeckt Text: "${el.textContent.trim().slice(0, 30)}"`);
    }
    const s = parseFloat(st.querySelector('.stage').dataset.scale);
    if (s < 0.5) issues.push(`Bild-Bühne sehr klein (Skalierung ${s})`);
  }
  // Keine Großbuchstaben-Zeilen
  for (const el of frame.querySelectorAll('*')) {
    if (getComputedStyle(el).textTransform === 'uppercase') issues.push(`text-transform: uppercase an ${el.className}`);
  }
  // Schriften wirklich geladen?
  const need = dir === 'rtl' ? ['Unbounded', 'Vazirmatn'] : ['Unbounded', 'Manrope'];
  const loaded = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
  for (const f of need) if (!loaded.has(f)) issues.push(`Schrift nicht geladen: ${f}`);
  const scale = [...frame.querySelectorAll('.stage')].map((s) => s.dataset.scale).join(',');
  const sizes = [...frame.querySelectorAll('[data-fit]')].map((e) => `${e.className.split(' ')[0]}:${parseFloat(e.style.fontSize)}`).join(' ');
  return { issues, scale, sizes };
};

// ───────────────────────── Start ─────────────────────────
async function main() {
  document.getElementById('root').innerHTML = build();
  document.body.style.width = `${F.w}px`;
  document.body.style.height = `${F.h}px`;
  const sample = document.getElementById('root').textContent + SLOGAN + '0123456789';
  const fams = dir === 'rtl' ? ['900 40px Vazirmatn', '600 40px Vazirmatn', '800 40px Unbounded', '700 40px Manrope'] : ['800 40px Unbounded', '700 40px Unbounded', '600 40px Manrope', '800 40px Manrope'];
  await Promise.all(fams.map((f) => document.fonts.load(f, sample).catch(() => null)));
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  for (const el of document.querySelectorAll('[data-fitw]')) fitWidth(el);
  for (const el of document.querySelectorAll('[data-fit]')) fitEl(el);
  for (const el of document.querySelectorAll('[data-shrink]')) shrink(el);
  fitStage();
  thinStars();
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  document.documentElement.dataset.ready = '1';
}
main().catch((e) => {
  document.documentElement.dataset.ready = 'error';
  document.documentElement.dataset.error = String(e && e.stack || e);
});
