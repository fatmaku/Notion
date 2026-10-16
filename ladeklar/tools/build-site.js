// Builds the marketing website.
//   dist/site/                 deployable static site (index.html, assets/, fonts/, recht/)
//   dist/site/index.artifact.html  the same page as a Claude artifact body (fonts inlined, demo link to the artifact)
// Usage: node tools/build-site.js [--demo-url=https://…] [--skip-media]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import { icon } from '../web/js/icons.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist/site');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const DEMO_SITE = 'demo.html';
const DEMO_ARTIFACT = arg('demo-url', 'https://claude.ai/artifact/VNtUhALRzJVJ3971ftvEbs');
const skipMedia = process.argv.includes('--skip-media');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'marketing/print-config.json'), 'utf8'));
const rel = (p) => path.join(ROOT, p);
const mk = (p) => fs.mkdirSync(p, { recursive: true });
mk(OUT);

/* ---------- images (webp) ---------- */
const IMAGES = [
  ...['phone-1-confirm', 'phone-1b-ok', 'phone-2-loaded', 'phone-2b-ok', 'phone-3-unloaded', 'phone-3b-ok', 'phone-4-podbutton', 'phone-5-pod', 'phone-6-delivered'].map((k) => [`video/assets/${k}.png`, `assets/phone/${k}.webp`, 600]),
  ['video/assets/office-live.png', 'assets/screens/office-live.webp', 1600],
  ['video/assets/office-proof.png', 'assets/screens/office-proof.webp', 880],
  ['video/assets/login-kaya.png', 'assets/screens/login-kaya.webp', 520],
  ['video/assets/login-nord.png', 'assets/screens/login-nord.webp', 520],
  ['docs/handbuch/img/fahrer-03-lkw-waehlen.png', 'assets/screens/fahrer-03-lkw-waehlen.webp', 520],
  ['docs/handbuch/img/fahrer-04-auftrag-bestaetigen.png', 'assets/screens/fahrer-04-auftrag-bestaetigen.webp', 520],
  ['docs/handbuch/img/fahrer-11-lieferschein-unterschrift.png', 'assets/screens/fahrer-11-lieferschein-unterschrift.webp', 520],
  ...['de', 'pl', 'ro', 'cs', 'tr', 'ru', 'uk', 'en'].map((l) => [`docs/handbuch/img/sprache-${l}.png`, `assets/lang/sprache-${l}.webp`, 340]),
];
if (!skipMedia) {
  const py = `
import sys, json
from PIL import Image
for src, dst, w in json.loads(sys.argv[1]):
    im = Image.open(src).convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=84, method=6)
`;
  const jobs = IMAGES.map(([s, d, w]) => { mk(path.dirname(path.join(OUT, d))); return [rel(s), path.join(OUT, d), w]; });
  execFileSync('python3', ['-I', '-c', py, JSON.stringify(jobs)], { stdio: 'inherit' });

  /* trailer: web versions (H.264 720p) + poster */
  const src = rel('video/Ladeklar_Trailer_16x9.mp4');
  if (fs.existsSync(src)) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(OUT, 'assets/trailer.mp4')]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', arg('poster-at', '1.6'), '-i', src, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', path.join(OUT, 'assets/trailer-poster.jpg')]);
  } else console.warn('! video/Ladeklar_Trailer_16x9.mp4 fehlt – Trailer-Abschnitt ohne Video');
}
const trailerLen = (() => {
  try {
    const s = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', rel('video/Ladeklar_Trailer_16x9.mp4')]).toString().trim();
    return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} Min.`;
  } catch { return '75 Sek.'; }
})();

/* ---------- fonts, favicon ---------- */
mk(path.join(OUT, 'fonts'));
const FONTS = [
  ['Archivo', 'archivo-latin-ext.woff2', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+20A0-20AB, U+20AD-20C4, U+2C60-2C7F, U+A720-A7FF', '400 900', 'font-stretch: 62% 125%;'],
  ['Archivo', 'archivo-latin.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD', '400 900', 'font-stretch: 62% 125%;'],
  ['Manrope', 'manrope-cyrillic.woff2', 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116', '400 800', ''],
  ['Manrope', 'manrope-latin-ext.woff2', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+20A0-20AB, U+20AD-20C4, U+2C60-2C7F, U+A720-A7FF', '400 800', ''],
  ['Manrope', 'manrope-latin.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD', '400 800', ''],
];
const fontCss = (inline, prefix = 'fonts/') => FONTS.map(([fam, file, range, w, extra]) => {
  const src = inline ? `data:font/woff2;base64,${fs.readFileSync(rel(`web/fonts/${file}`)).toString('base64')}` : prefix + file;
  return `@font-face { font-family: '${fam}'; font-style: normal; font-weight: ${w}; ${extra} font-display: swap; src: url('${src}') format('woff2'); unicode-range: ${range}; }`;
}).join('\n');
for (const [, file] of FONTS) fs.copyFileSync(rel(`web/fonts/${file}`), path.join(OUT, 'fonts', file));
fs.copyFileSync(rel('web/icons/favicon.svg'), path.join(OUT, 'assets/favicon.svg'));

/* ---------- script ---------- */
const js = (await esbuild.build({ entryPoints: [rel('site/site.js')], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false })).outputFiles[0].text;

/* ---------- page parts ---------- */
const ICONS = ['arrow-right', 'play', 'check', 'bell', 'file-check', 'phone', 'camera', 'hourglass', 'languages', 'wifi-off', 'shield-check', 'timer', 'map-pin', 'eye', 'handshake', 'download', 'lock', 'traffic-cone', 'plus', 'mail', 'copy', 'store', 'truck', 'package-check', 'triangle-alert', 'arrow-up-from-line', 'arrow-down-to-line'];
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${ICONS.map((n) => {
  const inner = icon(n).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<symbol id="i-${n}" viewBox="0 0 24 24">${inner}</symbol>`;
}).join('')}</defs></svg>`;
const MARK = '<svg viewBox="12 12 76 76" aria-hidden="true"><rect x="12" y="12" width="76" height="76" rx="20" fill="#c8a45c"/><path d="M33 31v38h22" stroke="#0b1622" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m53 56 9 9 15-21" stroke="#0b1622" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24"><use href="#i-${n}"/></svg>`;
const TICK = [
  ['KAY-2610-0019', 'Stuttgart → Hamburg', 'go', 'arrow-up-from-line', 'Aufgeladen 06:41'],
  ['NRD-2610-0007', 'Bremen → Leipzig', 'go', 'check', 'Bestätigt 07:02'],
  ['KAY-2610-0017', 'Ulm → München', 'ok', 'package-check', 'Zugestellt 09:15 · Lieferschein liegt vor'],
  ['BAU-2610-0003', 'Köln → Frankfurt', 'wait', 'hourglass', 'Standzeit 47 Min. belegt'],
  ['KAY-2610-0021', 'Köln → Dortmund', 'bad', 'triangle-alert', 'Problem: Rampe belegt'],
  ['RMK-2610-0011', 'Dortmund → Hannover', 'ok', 'arrow-down-to-line', 'Abgeladen 11:38'],
  ['KAY-2610-0018', 'Mannheim → Nürnberg', 'go', 'truck', 'Unterwegs · S-KL 2043'],
  ['NRD-2610-0009', 'Hamburg → Kiel', 'ok', 'file-check', 'Abliefernachweis als PDF'],
];
const tickList = `<ul>${TICK.map(([b, r, k, i, s]) => `<li><b>${b}</b>${r}<span class="chip ${k}">${ic(i)}${s}</span></li>`).join('')}</ul>`;
const ticker = tickList + tickList.replace('<ul>', '<ul aria-hidden="true">');
const LANGS = [['de', 'Deutsch'], ['pl', 'Polski'], ['ro', 'Română'], ['cs', 'Čeština'], ['tr', 'Türkçe'], ['ru', 'Русский'], ['uk', 'Українська'], ['en', 'English']];
const langs = LANGS.map(([l, n], i) => `<figure${i === 0 ? ' class="hot"' : ''}><img src="assets/lang/sprache-${l}.webp" alt="Fahrer-App auf ${n}" width="390" height="844" loading="lazy"><figcaption>${n}</figcaption></figure>`).join('');
const taps = JSON.parse(fs.readFileSync(rel('video/assets/assets.json'), 'utf8'));
delete taps.bookingNo;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function page({ inline, demo }) {
  return fs.readFileSync(rel('site/index.html'), 'utf8')
    .replace('/*FONTS*/', () => fontCss(inline))
    .replace('<!--ICONS-->', () => sprite)
    .replaceAll('<!--MARK-->', () => MARK)
    .replace('<!--TICKER-->', () => ticker)
    .replace('<!--LANGS-->', () => langs)
    .replace('{{TAPS}}', () => JSON.stringify(taps))
    .replace('<!--SCRIPT-->', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`)
    .replaceAll('{{DEMO_URL}}', demo)
    .replaceAll('{{EMAIL}}', esc(cfg.email))
    .replaceAll('{{TELEFON}}', esc(cfg.telefon))
    .replaceAll('{{FIRMA}}', esc(cfg.firma))
    .replaceAll('{{TRAILER_LEN}}', trailerLen);
}
fs.writeFileSync(path.join(OUT, 'index.html'), page({ inline: false, demo: DEMO_SITE }));

// artifact body: no doctype/html/head/body wrappers, fonts inlined, sides-cover meta (gutters use max())
const full = page({ inline: true, demo: DEMO_ARTIFACT });
const head = full.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '')
  .replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover">\n<title>');
const body = full.match(/<body>([\s\S]*?)<\/body>/)[1];
fs.writeFileSync(path.join(OUT, 'index.artifact.html'), head.trim() + '\n' + body.trim() + '\n');

/* ---------- demo copy for the deployable site ---------- */
if (fs.existsSync(rel('dist/demo.html'))) fs.copyFileSync(rel('dist/demo.html'), path.join(OUT, DEMO_SITE));

/* ---------- legal pages (from docs/recht, sample notes removed, banner added) ---------- */
mk(path.join(OUT, 'recht'));
const stripNotes = (md) => md
  .replace(/^> \*\*Hinweis – Muster[\s\S]*?(?=\n(?!>))/m, '')
  .replace(/^> \*\*Prüfhinweis[^\n]*(?:\n>[^\n]*)*/gm, '');
const LEGAL = [
  ['impressum', 'Impressum', () => {
    const md = fs.readFileSync(rel('docs/recht/IMPRESSUM.md'), 'utf8');
    const a = md.split(/^## 2\. Variante A[^\n]*\n/m)[1].split(/^---$/m)[0];
    return '# Impressum\n' + a.replace(/^### Impressum\n/m, '');
  }],
  ['datenschutz', 'Datenschutzerklärung', () => stripNotes(fs.readFileSync(rel('docs/recht/DATENSCHUTZ.md'), 'utf8'))],
  ['agb', 'AGB', () => stripNotes(fs.readFileSync(rel('docs/recht/AGB.md'), 'utf8'))],
  ['speicher', 'Cookies und Speicher', () => stripNotes(fs.readFileSync(rel('docs/recht/COOKIES_SPEICHER.md'), 'utf8'))],
];
const legalCss = `
:root { --ink: #0b1622; --paper: #f2f5f8; --text: #0b1622; --text-2: #3a4b5e; --line: #d6dee6; --brass: #c8a45c; --brass-2: #e6cd92; --teal: #0e7c7b; color-scheme: light; }
${fontCss(false, '../fonts/')}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--text); font: 500 1rem/1.7 Manrope, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
header { background: var(--ink); color: #e8eef5; }
header .in, main { max-width: 820px; margin: 0 auto; padding-left: max(20px, env(safe-area-inset-left, 0px)); padding-right: max(20px, env(safe-area-inset-right, 0px)); }
header .in { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 18px; }
header a { color: inherit; text-decoration: none; font-weight: 800; display: inline-flex; align-items: center; gap: 10px; }
header .brand { font-family: Archivo, Manrope, sans-serif; font-stretch: 125%; letter-spacing: .16em; }
header svg { width: 30px; height: 30px; }
.banner { margin: 28px 0 0; padding: 14px 18px; border-radius: 12px; background: #fcf0d9; color: #6b4300; font-weight: 700; font-size: .9rem; }
main { padding-block: 8px 80px; }
h1, h2, h3 { font-family: Archivo, Manrope, sans-serif; font-stretch: 110%; line-height: 1.2; letter-spacing: -.01em; text-wrap: balance; }
h1 { font-size: clamp(1.9rem, 5vw, 2.6rem); margin: 28px 0 12px; }
h2 { font-size: 1.35rem; margin: 40px 0 8px; padding-top: 20px; border-top: 1px solid var(--line); }
h3 { font-size: 1.1rem; margin: 26px 0 6px; }
p, li { color: var(--text-2); }
a { color: var(--teal); }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
.tbl { overflow-x: auto; }
th, td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
blockquote { margin: 16px 0; padding: 8px 16px; border-left: 3px solid var(--brass); background: #fff; }
hr { border: 0; border-top: 1px solid var(--line); margin: 32px 0; }
code { font-size: .9em; }`;
for (const [slug, title, get] of LEGAL) {
  const html = execFileSync('pandoc', ['-f', 'gfm', '-t', 'html5'], { input: get() }).toString()
    .replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>');
  fs.writeFileSync(path.join(OUT, 'recht', `${slug}.html`), `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} – LADEKLAR</title><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"><style>${legalCss}</style></head>
<body><header><div class="in"><a class="brand" href="../index.html">${MARK}LADEKLAR</a><a href="../index.html">← Zur Startseite</a></div></header>
<main><p class="banner">Mustertext: Platzhalter in [eckigen Klammern] werden vor dem Start ausgefüllt, der Text wird anwaltlich geprüft.</p>
${html}</main></body></html>
`);
}

const size = (p) => (fs.statSync(p).size / 1024).toFixed(0) + ' KB';
console.log('dist/site/index.html', size(path.join(OUT, 'index.html')));
console.log('dist/site/index.artifact.html', size(path.join(OUT, 'index.artifact.html')));
for (const f of ['assets/trailer.mp4', 'assets/trailer-poster.jpg']) if (fs.existsSync(path.join(OUT, f))) console.log('dist/site/' + f, size(path.join(OUT, f)));
