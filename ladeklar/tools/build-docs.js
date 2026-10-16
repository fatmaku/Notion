// Turns the Markdown documents into designed PDFs (cover page + numbered A4 pages, brand fonts)
// and editable Word files (.docx) for the legal texts and the business plan.
//   node tools/build-docs.js            all documents
//   node tools/build-docs.js handbuch   only one group (handbuch | recht | business)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const only = process.argv[2];
const GROUPS = {
  handbuch: { dir: 'docs/handbuch', label: 'Benutzerhandbuch', docx: false, files: ['HANDBUCH_UNTERNEHMEN.md', 'FAHRER_KURZANLEITUNG.md', 'HANDBUCH_LIZENZGEBER.md'] },
  recht: { dir: 'docs/recht', label: 'Rechtliche Muster', docx: true, files: ['AGB.md', 'LEISTUNGSBESCHREIBUNG_SLA.md', 'AVV.md', 'TOM.md', 'UNTERAUFTRAGSVERARBEITER.md', 'DATENSCHUTZ.md', 'DATENSCHUTZHINWEISE_FAHRER.md', 'IMPRESSUM.md', 'NUTZUNGSBEDINGUNGEN_FAHRER.md', 'BETRIEBSVEREINBARUNG_MUSTER.md', 'COOKIES_SPEICHER.md', 'CHECKLISTE_GRUENDUNG.md', 'QUELLEN.md'] },
  business: { dir: 'business', label: 'Geschäftsunterlagen', docx: true, files: ['BUSINESSPLAN.md', 'MARKTANALYSE.md', 'WERBETEXTE.md', 'QUELLEN.md'] },
  root: { dir: '.', label: 'Produkt', docx: false, files: ['PLAN.md', 'e2e/TESTBERICHT.md'] },
};
const font = (f) => 'file://' + path.join(ROOT, 'web/fonts', f);
const CSS = `
@font-face { font-family: Archivo; src: url('${font('archivo-latin.woff2')}'); font-weight: 400 900; font-stretch: 62% 125%; }
@font-face { font-family: Archivo; src: url('${font('archivo-latin-ext.woff2')}'); font-weight: 400 900; font-stretch: 62% 125%; unicode-range: U+0100-02BA, U+1E00-1E9F; }
@font-face { font-family: Manrope; src: url('${font('manrope-latin.woff2')}'); font-weight: 400 800; }
@font-face { font-family: Manrope; src: url('${font('manrope-latin-ext.woff2')}'); font-weight: 400 800; unicode-range: U+0100-02BA, U+1E00-1E9F, U+20A0-20C0; }
@font-face { font-family: Manrope; src: url('${font('manrope-cyrillic.woff2')}'); font-weight: 400 800; unicode-range: U+0400-045F, U+0490-0491; }
@font-face { font-family: Manrope; src: url('${font('manrope-cyrillic-ext.woff2')}'); font-weight: 400 800; unicode-range: U+0460-052F; }
@page { size: A4; margin: 20mm 18mm 18mm 18mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 500 10pt/1.58 Manrope, Arial, sans-serif; color: #18222e; }
h1, h2, h3, h4 { font-family: Archivo, Manrope, Arial, sans-serif; color: #0b1622; break-after: avoid; text-wrap: balance; }
h1 { font-size: 22pt; font-stretch: 112%; font-weight: 850; letter-spacing: -.01em; margin: 0 0 10pt; padding-bottom: 8pt; border-bottom: 3pt solid #c8a45c; }
h1:not(:first-child) { break-before: page; }
h2 { font-size: 14.5pt; font-stretch: 108%; font-weight: 800; margin: 20pt 0 6pt; }
h3 { font-size: 11.5pt; font-weight: 800; margin: 14pt 0 4pt; }
h4 { font-size: 10.5pt; margin: 10pt 0 3pt; }
p { margin: 0 0 7pt; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; } li { margin: 0 0 3pt; }
a { color: #0e5f5e; text-decoration: none; }
strong { font-weight: 800; color: #0b1622; }
hr { border: 0; border-top: 1pt solid #dbe2e9; margin: 14pt 0; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 8.6pt; line-height: 1.4; break-inside: auto; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: #0b1622; color: #fff; text-align: left; font-weight: 700; padding: 5pt 6pt; }
td { padding: 4.5pt 6pt; border-bottom: .6pt solid #dbe2e9; vertical-align: top; }
tr:nth-child(even) td { background: #f6f8fa; }
blockquote { margin: 8pt 0 10pt; padding: 7pt 11pt; border-left: 3pt solid #c8a45c; background: #faf6ec; border-radius: 0 6pt 6pt 0; break-inside: avoid; }
blockquote p:last-child { margin: 0; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.4pt; background: #eef1f4; padding: 0 3pt; border-radius: 3pt; }
pre { background: #0b1622; color: #e8eef5; padding: 9pt 11pt; border-radius: 6pt; font-size: 8pt; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; }
img { display: block; max-width: 100%; max-height: 118mm; margin: 8pt auto 10pt; border-radius: 6pt; box-shadow: 0 2pt 10pt rgba(11,22,34,.18); break-inside: avoid; }
img[src*="fahrer-"], img[src*="sprache-"], img[src*="tablet-02"] { max-height: 112mm; }
p:has(> img:only-child) { text-align: center; break-inside: avoid; }
.toc { columns: 2; column-gap: 18pt; font-size: 9.5pt; margin: 0 0 6pt; padding: 0; list-style: none; }
.toc li { break-inside: avoid; margin-bottom: 4pt; }
`;
const COVER = (title, sub, label, date) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${CSS}
@page { size: A4; margin: 0; }
.cv { width: 210mm; height: 297mm; position: relative; overflow: hidden; color: #fff; background: #0b1622; font-family: Manrope, sans-serif; }
.cv .glow { position: absolute; inset: 0; background: radial-gradient(90% 60% at 85% 10%, rgba(200,164,92,.35), transparent 60%), radial-gradient(70% 50% at 0% 100%, rgba(14,124,123,.35), transparent 60%); }
.cv svg.net { position: absolute; right: -30mm; top: 40mm; width: 170mm; opacity: .5; }
.cv .wm { position: absolute; left: 22mm; top: 24mm; display: flex; align-items: center; gap: 4mm; font: 850 15pt Archivo; font-stretch: 125%; letter-spacing: .16em; }
.cv .lbl { position: absolute; left: 22mm; top: 150mm; font: 700 9.5pt Manrope; letter-spacing: .22em; text-transform: uppercase; color: #e6cd92; }
.cv h1 { position: absolute; left: 22mm; right: 22mm; top: 160mm; color: #fff; border: 0; font-size: 34pt; line-height: 1.04; margin: 0; padding: 0; }
.cv .sub { position: absolute; left: 22mm; right: 40mm; top: 215mm; font-size: 12.5pt; color: #b8c5d3; line-height: 1.5; }
.cv .ft { position: absolute; left: 22mm; right: 22mm; bottom: 18mm; display: flex; justify-content: space-between; font-size: 8.5pt; color: #8394a7; border-top: .6pt solid rgba(255,255,255,.15); padding-top: 4mm; }
</style></head><body><div class="cv"><div class="glow"></div>
<svg class="net" viewBox="0 0 400 520" fill="none" stroke="#e6cd92" stroke-opacity=".55" stroke-width="1.2"><path d="M180 30 C 200 120 140 180 170 260 S 230 380 200 500"/><path d="M60 140 C 140 150 200 120 300 160"/><path d="M40 330 C 120 300 220 360 360 320"/><path d="M300 160 C 280 240 330 300 300 420"/><path d="M170 260 L 300 160" stroke-dasharray="3 6"/><g fill="#e6cd92" stroke="none"><circle cx="180" cy="30" r="4"/><circle cx="170" cy="260" r="5"/><circle cx="200" cy="500" r="4"/><circle cx="300" cy="160" r="4"/><circle cx="60" cy="140" r="3"/><circle cx="360" cy="320" r="3"/></g></svg>
<div class="wm"><svg width="30" height="30" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#c8a45c"/><path d="M11 12v16h9" stroke="#0b1622" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m21 22 4 4 7-9" stroke="#0b1622" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>LADEKLAR</div>
<div class="lbl">${label}</div><h1>${title}</h1><div class="sub">${sub}</div>
<div class="ft"><span>Ein Tipp. Alles klar.</span><span>Stand ${date}</span></div></div></body></html>`;

function mdToHtml(file) {
  let html = execFileSync('pandoc', ['-f', 'gfm+smart', '-t', 'html5', file], { encoding: 'utf8', maxBuffer: 64e6 });
  return html;
}
function titleOf(md) {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].replace(/[*`]/g, '').trim() : 'Ladeklar';
}
function subOf(md) {
  const lines = md.split('\n').slice(1, 30).map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('---'));
  const s = (lines.find((l) => l.startsWith('>')) || lines[0] || '').replace(/^>\s*/, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return s.length > 230 ? s.slice(0, 227) + '…' : s;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
let count = 0;
for (const [key, g] of Object.entries(GROUPS)) {
  if (only && only !== key) continue;
  const outDir = path.join(ROOT, g.dir === '.' ? 'docs' : g.dir, 'pdf');
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of g.files) {
    const src = path.join(ROOT, g.dir, f);
    if (!fs.existsSync(src)) { console.log('  – fehlt:', path.relative(ROOT, src)); continue; }
    const md = fs.readFileSync(src, 'utf8');
    const title = titleOf(md);
    const base = 'file://' + path.dirname(src) + '/';
    const body = mdToHtml(src);
    const page = await ctx.newPage();
    // cover
    await page.setContent(COVER(title, subOf(md), g.label, date), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const cover = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    // content
    await page.goto('about:blank');
    await page.setContent(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title.replace(/[<>&]/g, '')}</title><base href="${base}"><style>${CSS}</style></head><body>${body}</body></html>`, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))); });
    const content = await page.pdf({
      format: 'A4', printBackground: true, displayHeaderFooter: true,
      margin: { top: '20mm', right: '18mm', bottom: '18mm', left: '18mm' },
      headerTemplate: `<div style="width:100%;padding:0 18mm;font:600 7.5px Arial,sans-serif;color:#8394a7;display:flex;justify-content:space-between"><span style="letter-spacing:.14em">LADEKLAR</span><span>${title.replace(/[<>&]/g, '')}</span></div>`,
      footerTemplate: `<div style="width:100%;padding:0 18mm;font:600 7.5px Arial,sans-serif;color:#8394a7;display:flex;justify-content:space-between"><span>Ein Tipp. Alles klar.</span><span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
    });
    await page.close();
    const pdfName = path.join(outDir, f.replace(/^.*\//, '').replace(/\.md$/, '.pdf'));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lkdoc-'));
    fs.writeFileSync(path.join(tmp, 'a.pdf'), cover); fs.writeFileSync(path.join(tmp, 'b.pdf'), content);
    execFileSync('pdfunite', [path.join(tmp, 'a.pdf'), path.join(tmp, 'b.pdf'), pdfName]);
    fs.rmSync(tmp, { recursive: true, force: true });
    count++;
    console.log('  PDF', path.relative(ROOT, pdfName));
    if (g.docx) {
      const docx = path.join(outDir, f.replace(/\.md$/, '.docx'));
      execFileSync('pandoc', ['-f', 'gfm+smart', '-t', 'docx', '--resource-path', path.dirname(src), '-o', docx, src]);
      console.log('  DOCX', path.relative(ROOT, docx));
    }
  }
}
await browser.close();
console.log(count, 'PDF erzeugt');
