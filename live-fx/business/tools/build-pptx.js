#!/usr/bin/env node
'use strict';
/*
 * LiveFX – Pitch-Deck-Generator (sprachneutral)
 *
 *   node tools/build-pptx.js <deck-content.json> <ausgabe.pptx>
 *
 * Beispiele (im Ordner live-fx/business):
 *   node tools/build-pptx.js tools/deck-content.de.json LiveFX_Pitch.pptx
 *   node tools/build-pptx.js tools/deck-content.tr.json LiveFX_Pitch_TR.pptx
 *   node tools/build-pptx.js tools/deck-content.en.json LiveFX_Pitch_EN.pptx
 *
 * ALLE sichtbaren Texte (Titel, Bullets, Notizen, Diagramm- und Achsenbeschriftungen)
 * stehen in der JSON-Datei. Übersetzen = nur die JSON übersetzen; Struktur, Reihenfolge
 * der Arrays und die Feldnamen bleiben gleich. Layout, Farben und Bilder stehen hier.
 *
 * Abhängigkeit: pptxgenjs (npm). Wird gesucht in: normalem require (auch über NODE_PATH),
 * $LIVEFX_NODE_MODULES (Ordner node_modules), $PPTXGENJS (Pfad zum Paketordner),
 * tools/node_modules, business/node_modules.
 * Einmalig installieren:  npm i pptxgenjs --prefix tools   (siehe tools/README.md)
 *
 * Schriftgrößen: Für jedes Textfeld schätzt das Skript aus Textlänge und Feldgröße, ob der Text
 * passt, und setzt die Schriftgröße selbst kleiner, falls nicht (Funktion fitSize). PowerPoint
 * verkleinert Text mit "Autofit" erst, wenn jemand ihn bearbeitet – darauf verlassen wir uns
 * deshalb nicht. Längere türkische und englische Titel werden so schon beim Bauen angepasst.
 *
 * Bilder: Dateinamen stehen in meta.images der JSON (Standard: die deutschen Screenshots aus
 * landing-assets/). Pfade gelten relativ zu meta.assetsDir; für TR/EN können z. B. die Trailer-
 * Standbilder aus ../video/stills/ (tr-…, en-…) eingetragen werden.
 *
 * Umgebungsvariablen:
 *   LIVEFX_NOSHRINK=1  – lässt zusätzlich das Autofit-Kennzeichen (<a:normAutofit/>) weg. Das Ergebnis
 *                        sieht in LibreOffice so aus, wie PowerPoint die Datei öffnet; für die Sichtprüfung.
 *   LIVEFX_FITLOG=1    – listet jedes Textfeld, dessen Schriftgröße automatisch verkleinert wurde.
 */

const fs = require('fs');
const path = require('path');

function loadPptxgen() {
  const tries = ['pptxgenjs'];
  if (process.env.LIVEFX_NODE_MODULES) tries.push(path.join(path.resolve(process.env.LIVEFX_NODE_MODULES), 'pptxgenjs'));
  if (process.env.PPTXGENJS) tries.push(path.resolve(process.env.PPTXGENJS));
  tries.push(path.join(__dirname, 'node_modules', 'pptxgenjs'));
  tries.push(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'));
  for (const t of tries) {
    try { return require(t); } catch (e) { /* weiter */ }
  }
  console.error('pptxgenjs nicht gefunden. Bitte "npm i pptxgenjs --prefix tools" ausführen oder LIVEFX_NODE_MODULES=/pfad/zu/node_modules setzen.');
  process.exit(2);
}

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('Aufruf: node tools/build-pptx.js <deck-content.json> <ausgabe.pptx>');
  process.exit(1);
}
const D = JSON.parse(fs.readFileSync(path.resolve(inFile), 'utf8'));
const OUT = path.resolve(outFile);
const BUSINESS = path.resolve(__dirname, '..');
const ASSETS = path.join(BUSINESS, D.meta.assetsDir || 'landing-assets');
const IMAGES = Object.assign({
  overlayNeon: 'overlay-neon.jpg',              // 16:9-Overlay (Titel, Demo, Ask-Hintergrund)
  overlayPortrait: 'overlay-portrait-rain.jpg', // 9:16-Story-Modus (Titel, Demo)
  mobile: 'mobile.jpg',                         // Handy-Fernbedienung (Titel, Demo)
  panel: 'panel.jpg',                           // Steuerpanel (Titel, Traction)
  demo: 'demo.jpg',                             // Demo-Seite (Titel)
}, D.meta.images || {});
const img = (key) => path.join(ASSETS, IMAGES[key] || key);
const SHRINK = !process.env.LIVEFX_NOSHRINK;
const FITLOG = !!process.env.LIVEFX_FITLOG;

const pptxgen = loadPptxgen();

// ---------- Design ----------
const BG = '0F1115', CARD = '181B23', CARD2 = '1F2330', LINE = '2A2F3C';
const WHITE = 'FFFFFF', MUTED = '9AA3B5', DIM = '6B7280', INK = '1B1E27';
const PINK = 'FF2D75', MINT = '2DFFB5', GOLD = 'FFD166', SKY = '5AD1FF';
const ACC = [PINK, MINT, GOLD, WHITE];
const LINE_COL = [MINT, GOLD, SKY, PINK]; // Linien A (Erzählfilm) · B (WortBild) · C (Räume) · D (Studio)
const FONT = 'Arial';
const MONO = 'Courier New';
const W = 13.333, H = 7.5, M = 0.6, CW = W - 2 * M;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = D.meta.deckTitle;
pres.author = D.meta.author || '[Name]';
pres.subject = D.meta.subject || '';
pres.lang = D.meta.langTag || 'de-DE';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

// ---------- Schriftgrößen-Schätzung ----------
// Breite eines Zeichens in em (Arial). Grob, aber eher großzügig, damit Text sicher passt.
function charEm(ch) {
  const c = ch.codePointAt(0);
  if (c > 0x2190 && c < 0x2C00 || c >= 0x1F000) return 1.05;        // Pfeile, Symbole, Emoji
  if (' ilj.,:;|!\'’‘`·'.includes(ch)) return 0.28;
  if ('ftrI()[]-/'.includes(ch)) return 0.36;
  if ('mwMW'.includes(ch)) return 0.86;
  if ('–—€@%&'.includes(ch)) return 0.85;
  if (/[0-9]/.test(ch)) return 0.556;
  if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) return 0.69; // Großbuchstaben inkl. Ç Ğ İ Ö Ş Ü
  return 0.52;
}
// Anzahl Zeilen, die ein Absatz bei Wortumbruch in einer Breite (pt) braucht.
function countLines(text, widthPt, fs, bold, spacing) {
  const k = (bold ? 1.07 : 1.0);
  let lines = 0;
  for (const para of String(text).split('\n')) {
    let cur = 0; lines++;
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      let ww = 0;
      for (const ch of word) ww += (charEm(ch) * k * fs) + (spacing || 0);
      if (/^\s+$/.test(word)) { cur += ww; continue; }
      if (cur > 0 && cur + ww > widthPt) { lines++; cur = 0; }
      while (ww > widthPt) { lines++; ww -= widthPt; } // sehr langes Wort bricht hart um
      cur += ww;
    }
  }
  return lines;
}
// Größte Schriftgröße <= fs (Schritte 0,5 pt), bei der der Text in w × h (Zoll) passt.
function fitSize(text, w, h, fs, o = {}) {
  if (text == null || text === '') return fs;
  const min = o.min || Math.max(8, Math.round(fs * 0.6));
  const lh = o.lineH || 1.2, wPt = w * 72 - (o.indentPt || 0), hPt = h * 72 + 2;
  const paras = Array.isArray(text) ? text : [text];
  let size = fs;
  for (; size > min; size -= 0.5) {
    let tot = 0;
    paras.forEach((p, i) => { tot += countLines(p, wPt, size, o.bold, o.charSpacing) * size * lh + (i < paras.length - 1 ? (o.gap || 0) : 0); });
    if (tot <= hPt) break;
  }
  if (FITLOG && size < fs) console.log(`  Folie ${slideNo}: ${fs} → ${size} pt  „${String(paras.join(' / ')).slice(0, 70)}“`);
  return size;
}

// Folientitel: lieber einzeilig bis 24 pt, erst dann zweizeilig (bis 20 pt) im Feld von 0,85 Zoll.
function titleSize(text, w, fs) {
  for (let size = fs; size >= 24; size -= 1) if (countLines(text, w * 72, size, true) === 1) {
    if (FITLOG && size < fs) console.log(`  Folie ${slideNo}: Titel ${fs} → ${size} pt (einzeilig)  „${text.slice(0, 70)}“`);
    return size;
  }
  return fitSize(text, w, 0.85, 24, { bold: true, min: 20 });
}

// ---------- Helfer ----------
let slideNo = 0;
let currentSection = null;
function newSlide(sd) {
  if (sd.section && sd.section !== currentSection) {
    pres.addSection({ title: sd.section });
    currentSection = sd.section;
  }
  const s = pres.addSlide(currentSection ? { sectionTitle: currentSection } : undefined);
  s.background = { color: BG };
  slideNo++;
  return s;
}
function header(s, sd, opts = {}) {
  if (sd.kicker) {
    s.addText(String(sd.kicker).toUpperCase(), { x: M, y: 0.2, w: 9, h: 0.26, fontFace: FONT, fontSize: 10, bold: true, color: opts.kickerColor || PINK, charSpacing: 3, isTextBox: true, margin: 0, objectName: 'Kicker' });
  }
  if (sd.title) {
    const tw = opts.titleW || CW, fs = titleSize(sd.title, tw, opts.titleSize || 32);
    s.addText(sd.title, { x: M, y: 0.48, w: tw, h: 0.85, fontFace: FONT, fontSize: fs, bold: true, color: WHITE, isTextBox: true, margin: 0, valign: 'top', fit: SHRINK ? 'shrink' : undefined, objectName: 'Titel' });
  }
  if (sd.vision) visionBadge(s);
  s.addText(`${D.meta.footerBrand || 'LiveFX'}  ·  ${slideNo}`, { x: W - M - 2.5, y: H - 0.42, w: 2.5, h: 0.25, fontFace: FONT, fontSize: 9, color: DIM, align: 'right', isTextBox: true, margin: 0, objectName: 'Fuß' });
  if (sd.notes) s.addNotes(sd.notes);
}
function visionBadge(s) {
  const t = D.meta.visionBadge || 'VISION';
  const w = Math.max(1.0, 0.13 * t.length + 0.5);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: W - M - w, y: 0.2, w, h: 0.34, fill: { color: '2A1530' }, line: { color: PINK, width: 1.25 }, rectRadius: 0.17, objectName: 'Vision-Badge' });
  s.addText('✦ ' + t.toUpperCase(), { x: W - M - w, y: 0.2, w, h: 0.34, fontFace: FONT, fontSize: 10, bold: true, color: PINK, align: 'center', valign: 'middle', charSpacing: 2, isTextBox: true, margin: 0 });
}
function card(s, x, y, w, h, fill = CARD, line) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: line ? { color: line, width: 1.25 } : { color: fill }, rectRadius: 0.12 });
}
function label(s, text, x, y, w, h, o = {}) {
  const base = { x, y, w, h, fontFace: FONT, fontSize: 14, color: WHITE, isTextBox: true, margin: 0, valign: 'top' };
  if (SHRINK && o.fit !== false) base.fit = 'shrink';
  const opt = Object.assign(base, o);
  if (opt.fit === false) delete opt.fit;
  else if (typeof text === 'string') opt.fontSize = fitSize(text, w, h, opt.fontSize, { bold: opt.bold, min: o.min, charSpacing: opt.charSpacing || 0 });
  delete opt.min;
  s.addText(text, opt);
}
function dot(s, x, y, color, size = 0.14) {
  s.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color }, line: { color } });
}
function bullets(s, items, x, y, w, h, o = {}) {
  const arr = items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: o.gap || 8 } }));
  const opt = Object.assign({ x, y, w, h, fontFace: FONT, fontSize: 15, color: WHITE, isTextBox: true, margin: 0, valign: 'top' }, o);
  delete opt.gap;
  opt.fontSize = fitSize(items, w, h, opt.fontSize, { bold: opt.bold, indentPt: 16, gap: o.gap || 8, min: 9 });
  if (SHRINK) opt.fit = 'shrink';
  s.addText(arr, opt);
}
function bigNumber(s, num, text, x, y, w, color, o = {}) {
  label(s, num, x, y, w, 0.8, { fontSize: o.numSize || 38, bold: true, color });
  label(s, text, x, y + 0.82, w, o.textH || 0.95, { fontSize: o.textSize || 12, color: MUTED });
}
function pill(s, text, x, y, w, h, color, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: o.fill || CARD2 }, line: { color, width: 1 }, rectRadius: h / 2 });
  label(s, text, x, y, w, h, { fontSize: o.fontSize || 11, bold: true, color: o.textColor || color, align: 'center', valign: 'middle' });
}
function arrow(s, x, y, w, color = PINK) {
  s.addShape(pres.shapes.RIGHT_ARROW || 'rightArrow', { x, y, w, h: 0.3, fill: { color }, line: { color } });
}
function sources(s, text, y = 6.62) {
  if (text) label(s, text, M, y, CW - 1.2, 0.36, { fontSize: 9.5, color: DIM });
}

// ---------- Folien-Layouts ----------
const L = {};

L.title = (sd) => {
  const s = newSlide(sd);
  s.addImage({ path: img('overlayNeon'), x: 6.9, y: 0, w: 6.433, h: 3.62, transparency: 10 });
  s.addImage({ path: img('overlayPortrait'), x: 10.4, y: 3.62, w: 2.18, h: 3.88 });
  s.addImage({ path: img('mobile'), x: 6.9, y: 3.62, w: 1.79, h: 3.88 });
  s.addImage({ path: img('panel'), x: 8.69, y: 3.62, w: 1.71, h: 1.07 });
  s.addImage({ path: img('demo'), x: 8.69, y: 4.69, w: 1.71, h: 0.96 });
  s.addShape(pres.shapes.RECTANGLE, { x: 8.69, y: 5.65, w: 1.71, h: 1.85, fill: { color: CARD }, line: { color: CARD } });
  s.addShape(pres.shapes.RECTANGLE, { x: 12.58, y: 3.62, w: 0.753, h: 3.88, fill: { color: CARD }, line: { color: CARD } });
  label(s, sd.kicker, M, 1.3, 6, 0.3, { fontSize: 11, bold: true, color: MINT, charSpacing: 4 });
  label(s, sd.brand, M, 1.65, 6, 1.2, { fontSize: 72, bold: true });
  label(s, sd.tagline, M, 2.9, 6.1, 0.8, { fontSize: 28, bold: true, color: PINK, min: 18 });
  label(s, sd.lead, M, 3.8, 5.9, 1.4, { fontSize: 15, color: MUTED });
  label(s, sd.vision, M, 5.25, 5.9, 0.6, { fontSize: 13, italic: true, color: GOLD });
  s.addText([
    { text: sd.name, options: { bold: true, color: WHITE } },
    { text: '  ·  ' + sd.role, options: { color: MUTED, breakLine: true } },
    { text: sd.contact, options: { color: MUTED } },
  ], { x: M, y: 6.1, w: 6.1, h: 0.8, fontFace: FONT, fontSize: 13, isTextBox: true, margin: 0, valign: 'top' });
  if (sd.notes) s.addNotes(sd.notes);
};

L.problem = (sd) => {
  const s = newSlide(sd); header(s, sd);
  sd.rows.forEach((r, i) => {
    const y = 1.55 + i * 1.3;
    card(s, M, y, 7.4, 1.15);
    s.addShape(pres.shapes.OVAL, { x: M + 0.2, y: y + 0.27, w: 0.6, h: 0.6, fill: { color: CARD2 }, line: { color: CARD2 } });
    label(s, r[0], M + 0.2, y + 0.27, 0.6, 0.6, { fontSize: 20, align: 'center', valign: 'middle', fit: false });
    label(s, r[1], M + 1.0, y + 0.14, 6.2, 0.42, { fontSize: 15, bold: true });
    label(s, r[2], M + 1.0, y + 0.56, 6.2, 0.55, { fontSize: 12, color: MUTED });
  });
  card(s, 8.4, 1.55, 4.33, 3.75, CARD2);
  label(s, sd.callout, 8.7, 1.85, 3.75, 2.2, { fontSize: 26, bold: true, color: GOLD, valign: 'middle' });
  label(s, sd.calloutSub, 8.7, 4.1, 3.75, 1.1, { fontSize: 12, color: MUTED });
  label(s, sd.quote, M, 5.65, CW, 0.7, { fontSize: 14, italic: true, color: MINT });
};

L.solution = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: MINT });
  const sw = 2.2, gap = 0.275;
  sd.steps.forEach((st, i) => {
    const x = M + i * (sw + gap);
    card(s, x, 1.55, sw, 1.6);
    label(s, st[0], x, 1.66, sw, 0.55, { fontSize: 26, align: 'center', fit: false });
    label(s, st[1], x + 0.1, 2.22, sw - 0.2, 0.36, { fontSize: 15, bold: true, align: 'center' });
    label(s, st[2], x + 0.1, 2.6, sw - 0.2, 0.48, { fontSize: 11, color: MUTED, align: 'center' });
    if (i < sd.steps.length - 1) label(s, '›', x + sw - 0.02, 2.05, gap + 0.04, 0.5, { fontSize: 22, color: PINK, align: 'center', bold: true, fit: false });
  });
  sd.examples.forEach((e, i) => {
    const x = M + i * 4.1;
    card(s, x, 3.45, 3.85, 1.4, CARD2);
    label(s, e[0], x + 0.25, 3.58, 3.4, 0.5, { fontSize: 21, bold: true, color: [PINK, GOLD, MINT][i] });
    label(s, e[1], x + 0.25, 4.12, 3.4, 0.65, { fontSize: 13, color: WHITE });
  });
  sd.facts.forEach((f, i) => {
    const x = M + (i % 2) * 6.15, y = 5.15 + Math.floor(i / 2) * 0.68;
    dot(s, x, y + 0.1, i % 2 ? MINT : PINK);
    label(s, f, x + 0.3, y, 5.75, 0.62, { fontSize: 13 });
  });
};

L.demo = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: GOLD });
  s.addImage({ path: img('overlayNeon'), x: M, y: 1.45, w: 7.2, h: 4.05 });
  label(s, sd.captions[0], M, 5.55, 7.2, 0.5, { fontSize: 11.5, color: MUTED });
  s.addImage({ path: img('overlayPortrait'), x: 8.1, y: 1.45, w: 2.28, h: 4.05 });
  label(s, sd.captions[1], 8.1, 5.55, 2.4, 0.6, { fontSize: 11, color: MUTED });
  s.addImage({ path: img('mobile'), x: 10.7, y: 1.45, w: 1.87, h: 4.05 });
  label(s, sd.captions[2], 10.7, 5.55, 2.03, 0.6, { fontSize: 11, color: MUTED });
  card(s, M, 6.15, CW, 0.82, CARD2);
  label(s, sd.bar, M + 0.3, 6.2, CW - 0.6, 0.72, { fontSize: 12.5, valign: 'middle' });
};

L.features = (sd) => {
  const s = newSlide(sd); header(s, sd);
  const cw = 2.93, ch = 2.4, cg = 0.15;
  sd.features.forEach((f, i) => {
    const x = M + (i % 4) * (cw + cg), y = 1.5 + Math.floor(i / 4) * (ch + cg);
    card(s, x, y, cw, ch);
    label(s, f[0], x + 0.2, y + 0.16, 0.6, 0.45, { fontSize: 20, fit: false });
    label(s, f[1], x + 0.2, y + 0.64, cw - 0.4, 0.38, { fontSize: 14, bold: true, color: [PINK, MINT, GOLD][i % 3] });
    label(s, f[2], x + 0.2, y + 1.04, cw - 0.4, 1.28, { fontSize: 11, color: MUTED });
  });
};

L.whyNow = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: MINT });
  sd.stats.forEach((st, i) => bigNumber(s, st[0], st[1], M + i * 4.15, 1.45, 3.8, [PINK, MINT, GOLD][i], { textH: 1.1 }));
  sd.cards.forEach((p, i) => {
    const x = M + i * 4.15;
    card(s, x, 3.75, 3.85, 2.55);
    label(s, p[0], x + 0.25, 3.92, 3.4, 0.62, { fontSize: 15, bold: true });
    label(s, p[1], x + 0.25, 4.58, 3.4, 1.62, { fontSize: 12, color: MUTED });
  });
  sources(s, sd.sources);
};

L.market = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: GOLD });
  const c = sd.chart;
  s.addChart(pres.charts.BAR, [
    { name: c.series[0], labels: c.labels, values: c.low },
    { name: c.series[1], labels: c.labels, values: c.high },
  ], {
    x: M, y: 1.4, w: 6.6, h: 3.85, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60,
    chartColors: [PINK, MINT], showTitle: true, title: c.title, titleColor: WHITE, titleFontSize: 11, titleFontFace: FONT,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: WHITE, dataLabelFontSize: 9, dataLabelFontFace: FONT,
    catAxisLabelColor: MUTED, catAxisLabelFontSize: 9, catAxisLabelFontFace: FONT, catAxisLineShow: false,
    valAxisLabelColor: DIM, valAxisLabelFontSize: 8, valAxisLabelFontFace: FONT, valAxisLineShow: false,
    valGridLine: { color: LINE, size: 0.5 }, catGridLine: { style: 'none' },
    showLegend: true, legendPos: 'b', legendColor: MUTED, legendFontSize: 9, legendFontFace: FONT,
    plotArea: { fill: { color: BG } }, chartArea: { fill: { color: BG } },
  });
  sd.cards.forEach((r, i) => {
    const y = 1.4 + i * 1.3, col = [PINK, MINT, GOLD][i];
    card(s, 7.45, y, 5.28, 1.2);
    label(s, r[0], 7.65, y + 0.12, 0.9, 0.45, { fontSize: 19, bold: true, color: col });
    label(s, r[1], 8.55, y + 0.17, 4.0, 0.36, { fontSize: 11.5, bold: true });
    label(s, r[2], 7.65, y + 0.56, 4.9, 0.6, { fontSize: 10.5 });
  });
  // angrenzende Märkte
  label(s, sd.adjacentTitle, M, 5.42, CW, 0.3, { fontSize: 11, bold: true, color: SKY });
  const n = sd.adjacent.length, gw = 0.15, aw = (CW - gw * (n - 1)) / n;
  sd.adjacent.forEach((a, i) => {
    const x = M + i * (aw + gw);
    card(s, x, 5.76, aw, 0.82, CARD2);
    label(s, a[0], x + 0.18, 5.8, aw - 0.3, 0.38, { fontSize: 15, bold: true, color: LINE_COL[i % 4] });
    label(s, a[1], x + 0.18, 6.18, aw - 0.3, 0.36, { fontSize: 10, color: MUTED });
  });
  sources(s, sd.sources, 6.7);
};

L.model = (sd) => {
  const s = newSlide(sd); header(s, sd);
  sd.tiers.forEach((t, i) => {
    const x = M + i * 3.08, cw = 2.93, col = [WHITE, PINK, MINT, GOLD][i];
    card(s, x, 1.5, cw, 3.45, i === 1 ? CARD2 : CARD);
    label(s, t[0], x + 0.25, 1.72, cw - 0.5, 0.4, { fontSize: 16, bold: true, color: col });
    label(s, t[1], x + 0.25, 2.15, cw - 0.5, 0.7, { fontSize: 24, bold: true });
    label(s, t[2], x + 0.25, 2.95, cw - 0.5, 1.9, { fontSize: 12, color: MUTED });
    if (i < sd.tiers.length - 1) label(s, '›', x + cw, 2.95, 0.15, 0.4, { fontSize: 16, bold: true, color: DIM, align: 'center', valign: 'middle', fit: false });
  });
  card(s, M, 5.15, CW, 1.6, CARD2);
  label(s, sd.anchorTitle, M + 0.3, 5.28, 8, 0.35, { fontSize: 12, bold: true, color: GOLD });
  label(s, sd.anchorText, M + 0.3, 5.63, CW - 0.6, 1.05, { fontSize: 11.5 });
};

L.traction = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: MINT });
  sd.stats.forEach((st, i) => bigNumber(s, st[0], st[1], M + i * 3.05, 1.45, 2.9, [PINK, MINT, GOLD, WHITE][i]));
  s.addImage({ path: img('panel'), x: M, y: 3.55, w: 4.8, h: 3.0 });
  card(s, 5.7, 3.55, 7.03, 3.05);
  label(s, sd.practiceTitle, 5.95, 3.7, 6.5, 0.4, { fontSize: 15, bold: true });
  bullets(s, sd.practice, 5.95, 4.15, 6.5, 1.6, { fontSize: 12, gap: 4 });
  label(s, sd.next, 5.95, 5.85, 6.5, 0.65, { fontSize: 11.5, color: GOLD, bold: true });
};

L.competition = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: GOLD });
  const gx = 2.0, gy = 1.6, gw = 7.0, gh = 4.75, cw = gw / 2, ch = gh / 2;
  const pos = [[0, 0], [1, 0], [0, 1], [1, 1]];
  sd.quads.forEach((txt, i) => {
    const [cx, cy] = pos[i], x = gx + cx * cw, y = gy + cy * ch, me = i === 3;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.06, y: y + 0.06, w: cw - 0.12, h: ch - 0.12, fill: { color: me ? '2A1530' : CARD }, line: { color: me ? PINK : LINE, width: me ? 2 : 0.75 }, rectRadius: 0.1 });
    label(s, txt, x + 0.3, y + 0.3, cw - 0.6, ch - 0.75, { fontSize: me ? 34 : 14, bold: true, color: me ? PINK : MUTED, align: 'center', valign: 'middle' });
  });
  label(s, sd.onlyOne, gx + cw + 0.3, gy + ch + ch - 0.62, cw - 0.6, 0.4, { fontSize: 12, color: MINT, align: 'center', italic: true });
  label(s, sd.axisX[0], gx, gy - 0.36, cw, 0.3, { fontSize: 11, color: MUTED, align: 'center', bold: true });
  label(s, sd.axisX[1], gx + cw, gy - 0.36, cw, 0.3, { fontSize: 11, color: MUTED, align: 'center', bold: true });
  label(s, sd.axisY[0], M - 0.1, gy + ch * 0.3, 1.45, 0.9, { fontSize: 11, color: MUTED, align: 'right', bold: true, valign: 'middle' });
  label(s, sd.axisY[1], M - 0.1, gy + ch + ch * 0.3, 1.45, 0.9, { fontSize: 11, color: MUTED, align: 'right', bold: true, valign: 'middle' });
  label(s, sd.axisCaption, gx, gy + gh + 0.08, gw, 0.3, { fontSize: 10, color: DIM, align: 'center' });
  card(s, 9.4, gy, 3.33, gh);
  label(s, sd.onlyTitle, 9.62, gy + 0.18, 2.95, 0.4, { fontSize: 15, bold: true, color: GOLD });
  sd.only.forEach((o, i) => {
    dot(s, 9.62, gy + 0.85 + i * 0.62, i % 2 ? MINT : PINK, 0.12);
    label(s, o, 9.88, gy + 0.72 + i * 0.62, 2.72, 0.58, { fontSize: 11 });
  });
};

L.roadmap = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: MINT });
  s.addShape(pres.shapes.LINE, { x: M + 0.3, y: 2.35, w: CW - 0.6, h: 0, line: { color: LINE, width: 2 } });
  sd.milestones.forEach((m, i) => {
    const x = M + i * 3.08, cw = 2.93, col = [PINK, MINT, GOLD, WHITE][i];
    dot(s, x + 0.2, 2.24, col, 0.22);
    label(s, m[0], x + 0.2, 1.6, cw - 0.4, 0.4, { fontSize: 13, bold: true, color: col });
    card(s, x, 2.75, cw, 3.05);
    label(s, m[1], x + 0.25, 2.92, cw - 0.5, 0.72, { fontSize: 16, bold: true });
    label(s, m[2], x + 0.25, 3.68, cw - 0.5, 2.05, { fontSize: 12, color: MUTED });
  });
  label(s, sd.footer, M, 6.05, CW, 0.75, { fontSize: 12, color: MUTED, italic: true });
};

// --- Vision 1: Überblick ---
L.vision = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: GOLD, titleW: CW - 1.6 });
  const n = sd.pipeline.length, gap = 0.42, bw = (CW - gap * (n - 1)) / n;
  sd.pipeline.forEach((p, i) => {
    const x = M + i * (bw + gap);
    card(s, x, 1.5, bw, 1.25, CARD2);
    label(s, p[0], x + 0.18, 1.62, 0.6, 0.55, { fontSize: 24, fit: false });
    label(s, p[1], x + 0.85, 1.64, bw - 1.0, 0.42, { fontSize: 17, bold: true, color: [PINK, GOLD, MINT, SKY][i] });
    label(s, p[2], x + 0.18, 2.16, bw - 0.36, 0.52, { fontSize: 11, color: MUTED });
    if (i < n - 1) arrow(s, x + bw + 0.07, 1.98, gap - 0.14, PINK);
  });
  const lw = (CW - 0.15 * 3) / 4;
  sd.lines.forEach((l, i) => {
    const x = M + i * (lw + 0.15), col = LINE_COL[i];
    card(s, x, 3.0, lw, 1.9, CARD, col);
    label(s, l[0], x + 0.2, 3.12, 0.55, 0.45, { fontSize: 20, fit: false });
    label(s, l[1], x + 0.75, 3.15, lw - 0.9, 0.42, { fontSize: 15, bold: true, color: col });
    label(s, l[2], x + 0.2, 3.62, lw - 0.4, 1.2, { fontSize: 11.5, color: WHITE });
  });
  [sd.today, sd.tomorrow].forEach((b, i) => {
    const x = M + i * (CW / 2 + 0.075), w = CW / 2 - 0.075;
    card(s, x, 5.1, w, 1.2, CARD2);
    label(s, b[0], x + 0.25, 5.2, w - 0.5, 0.32, { fontSize: 11, bold: true, color: i ? GOLD : MUTED, charSpacing: 2 });
    label(s, b[1], x + 0.25, 5.52, w - 0.5, 0.72, { fontSize: 12 });
  });
  label(s, sd.tagline, M, 6.45, CW - 1.4, 0.45, { fontSize: 14, italic: true, bold: true, color: GOLD });
};

// --- Vision 2: Erzählfilm / Generative Scene Engine ---
L.sceneEngine = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: MINT, titleW: CW - 1.6 });
  // Bühne aus Shapes: Nacht, Wald, Regen, Figur, Drache
  const vx = M, vy = 1.42, vw = 6.0, vh = 3.3;
  s.addShape(pres.shapes.RECTANGLE, { x: vx, y: vy, w: vw, h: vh, fill: { color: '121838' }, line: { color: MINT, width: 1.25 }, objectName: 'Szene-Himmel' });
  s.addShape(pres.shapes.RECTANGLE, { x: vx, y: vy + vh * 0.55, w: vw, h: vh * 0.45, fill: { color: '1A2348', transparency: 30 }, line: { type: 'none' } });
  s.addShape(pres.shapes.OVAL, { x: vx + vw - 1.2, y: vy + 0.6, w: 0.62, h: 0.62, fill: { color: 'F4F1DE' }, line: { type: 'none' } });
  s.addShape(pres.shapes.OVAL, { x: vx + vw - 1.05, y: vy + 0.52, w: 0.55, h: 0.55, fill: { color: '121838' }, line: { type: 'none' } });
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const sz = 0.03 + rnd() * 0.04;
    s.addShape(pres.shapes.OVAL, { x: vx + 0.15 + rnd() * (vw - 0.4), y: vy + 0.6 + rnd() * 1.1, w: sz, h: sz, fill: { color: 'FFFFFF', transparency: 20 + Math.floor(rnd() * 50) }, line: { type: 'none' } });
  }
  // Bäume (Silhouetten)
  const trees = [[0.2, 1.5], [0.9, 1.9], [1.6, 1.4], [3.9, 1.6], [4.6, 2.0], [5.25, 1.5]];
  trees.forEach(([tx, th]) => s.addShape(pres.shapes.ISOSCELES_TRIANGLE || 'triangle', { x: vx + tx, y: vy + vh - 0.45 - th, w: 0.75, h: th, fill: { color: '0E4A3A' }, line: { color: '1F7A5C', width: 0.75 } }));
  s.addShape(pres.shapes.RECTANGLE, { x: vx, y: vy + vh - 0.48, w: vw, h: 0.48, fill: { color: '0B2A22' }, line: { type: 'none' } });
  // Regen
  for (let i = 0; i < 34; i++) {
    const rx = vx + 0.1 + rnd() * (vw - 0.4), ry = vy + 0.55 + rnd() * (vh - 1.2);
    s.addShape(pres.shapes.LINE, { x: rx, y: ry, w: 0.08, h: 0.26, line: { color: SKY, width: 1, transparency: 35 } });
  }
  // Figuren
  label(s, '👧', vx + 2.05, vy + vh - 1.25, 0.8, 0.8, { fontSize: 40, fit: false, align: 'center' });
  label(s, '🐉', vx + 3.0, vy + 1.2, 1.4, 1.3, { fontSize: 66, fit: false, align: 'center' });
  // Transkript-Leiste oben
  s.addShape(pres.shapes.RECTANGLE, { x: vx, y: vy, w: vw, h: 0.48, fill: { color: '000000', transparency: 45 }, line: { type: 'none' } });
  label(s, sd.scene.transcript, vx + 0.18, vy + 0.04, vw - 0.36, 0.4, { fontSize: 11.5, italic: true, color: WHITE, valign: 'middle' });
  // Atmo-Badge
  pill(s, sd.scene.atmo, vx + 0.18, vy + vh - 0.42, 1.6, 0.32, SKY, { fontSize: 10 });
  // Weltzustand
  card(s, vx, vy + vh + 0.12, vw, 0.5, CARD2);
  label(s, sd.scene.state, vx + 0.18, vy + vh + 0.15, vw - 0.36, 0.44, { fontFace: MONO, fontSize: 10, color: MINT, valign: 'middle' });
  // Kostenbalken (logarithmisch)
  const cy = 5.48;
  label(s, sd.cost.title, M, cy - 0.05, vw, 0.3, { fontSize: 11, bold: true, color: WHITE });
  const bx = M + 2.1, bwMax = vw - 2.1 - 1.05;
  const lg = (v) => Math.max(0.04, (Math.log10(Math.max(v, 0.1)) + 1) / 4.5) * bwMax;
  sd.cost.bars.forEach((b, i) => {
    const y = cy + 0.3 + i * 0.27, col = [PINK, GOLD, MINT][i];
    label(s, b.label, M, y, 2.0, 0.24, { fontSize: 9.5, color: MUTED, align: 'right', valign: 'middle' });
    const w0 = b.from > 0 ? lg(b.from) : 0.06, w1 = b.to > 0 ? lg(b.to) : 0.06;
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: y + 0.03, w: w0, h: 0.18, fill: { color: col }, line: { type: 'none' } });
    if (w1 > w0) s.addShape(pres.shapes.RECTANGLE, { x: bx + w0, y: y + 0.03, w: w1 - w0, h: 0.18, fill: { color: col, transparency: 55 }, line: { type: 'none' } });
    label(s, b.value, bx + w1 + 0.08, y, 1.6, 0.24, { fontSize: 9.5, bold: true, color: col, valign: 'middle' });
  });
  label(s, sd.cost.scale, M, cy + 1.13, vw, 0.4, { fontSize: 10, color: MUTED, italic: true, min: 9.5 });
  // rechte Spalte
  const rx = 6.95, rw = W - M - rx;
  label(s, sd.rolesTitle, rx, 1.45, rw, 0.3, { fontSize: 11, bold: true, color: MINT });
  let px = rx, py = 1.8;
  sd.roles.forEach((r) => {
    const w = Math.max(0.75, 0.1 * r.length + 0.35);
    if (px + w > W - M + 0.01) { px = rx; py += 0.4; }
    pill(s, r, px, py, w, 0.32, MINT, { fontSize: 9.5, textColor: WHITE });
    px += w + 0.1;
  });
  bullets(s, sd.bullets, rx, py + 0.55, rw, 5.45 - (py + 0.55), { fontSize: 14, gap: 7 });
  card(s, rx, 5.6, rw, 1.25, CARD2);
  label(s, sd.honest[0], rx + 0.22, 5.68, rw - 0.44, 0.3, { fontSize: 11, bold: true, color: GOLD });
  label(s, sd.honest[1], rx + 0.22, 5.98, rw - 0.44, 0.82, { fontSize: 11.5, color: WHITE });
};

// --- Vision 3: WortBild / Sprachenlernen ---
L.wordImage = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: GOLD, titleW: CW - 1.6 });
  const cx = M, cy = 1.45, cw = 5.3, ch = 3.85, c = sd.card;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: 'FFFFFF' }, line: { color: GOLD, width: 2.5 }, rectRadius: 0.22, objectName: 'WortBild-Karte' });
  label(s, c.emoji, cx, cy + 0.12, cw, 1.25, { fontSize: 72, align: 'center', fit: false });
  label(s, c.word, cx + 0.2, cy + 1.38, cw - 0.4, 0.85, { fontSize: 50, bold: true, color: INK, align: 'center', valign: 'middle' });
  label(s, c.syllables, cx + 0.2, cy + 2.2, cw - 0.4, 0.38, { fontSize: 16, color: '6B7280', align: 'center' });
  s.addText([
    { text: c.other[0], options: { color: '1D4ED8', bold: true } },
    { text: '  ·  ', options: { color: '9AA3B5' } },
    { text: c.other[1], options: { color: INK } },
  ], { x: cx + 0.2, y: cy + 2.62, w: cw - 0.4, h: 0.45, fontFace: FONT, fontSize: 20, align: 'center', valign: 'middle', isTextBox: true, margin: 0 });
  // Lautsprecher + Welle
  s.addShape(pres.shapes.OVAL, { x: cx + cw / 2 - 1.05, y: cy + 3.15, w: 0.5, h: 0.5, fill: { color: GOLD }, line: { color: GOLD } });
  label(s, '🔊', cx + cw / 2 - 1.05, cy + 3.15, 0.5, 0.5, { fontSize: 15, align: 'center', valign: 'middle', fit: false });
  label(s, c.speak, cx + cw / 2 - 0.45, cy + 3.15, 2.2, 0.5, { fontSize: 14, bold: true, color: '7A5B00', valign: 'middle' });
  // Sprach-Pills
  c.langs.forEach((l, i) => pill(s, l, cx + 0.95 + i * 1.2, cy + ch + 0.15, 1.05, 0.34, GOLD, { fontSize: 10.5 }));
  // Modi
  label(s, sd.modesTitle, cx, 5.92, cw, 0.28, { fontSize: 10.5, bold: true, color: MUTED });
  const mw = (cw - 0.2) / 3;
  sd.modes.forEach((m, i) => pill(s, m, cx + i * (mw + 0.1), 6.24, mw, 0.42, [GOLD, MINT, PINK][i], { fontSize: 11 }));
  // rechte Spalte
  const rx = 6.35, rw = W - M - rx;
  bullets(s, sd.bullets, rx, 1.45, rw, 2.55, { fontSize: 14, gap: 7 });
  const sw = (rw - 0.3) / 3;
  sd.stats.forEach((st, i) => {
    const x = rx + i * (sw + 0.15);
    card(s, x, 4.15, sw, 1.55);
    label(s, st[0], x + 0.18, 4.25, sw - 0.3, 0.55, { fontSize: 24, bold: true, color: [GOLD, MINT, SKY][i] });
    label(s, st[1], x + 0.18, 4.82, sw - 0.3, 0.82, { fontSize: 10.5, color: MUTED });
  });
  card(s, rx, 5.85, rw, 0.95, CARD2);
  label(s, sd.revenue, rx + 0.22, 5.9, rw - 0.44, 0.85, { fontSize: 12, valign: 'middle' });
};

// --- Vision 4: Studio, Räume, erweiterter Markt ---
L.studio = (sd) => {
  const s = newSlide(sd); header(s, sd, { kickerColor: PINK, titleW: CW - 1.6 });
  const lx = M, lw = 7.05;
  label(s, sd.studioTitle, lx, 1.42, lw, 0.34, { fontSize: 14, bold: true, color: PINK });
  const iw = (lw - 0.15) / 2;
  sd.studioItems.forEach((it, i) => {
    const x = lx + i * (iw + 0.15);
    card(s, x, 1.8, iw, 1.45);
    label(s, it[0], x + 0.2, 1.88, iw - 0.4, 0.34, { fontSize: 13, bold: true });
    label(s, it[1], x + 0.2, 2.22, iw - 0.4, 0.98, { fontSize: 11, color: MUTED });
  });
  // Zeitleiste mit Chips
  const ty = 3.4;
  card(s, lx, ty, lw, 0.95, CARD2);
  label(s, sd.timeline.file, lx + 0.15, ty + 0.1, 1.45, 0.75, { fontSize: 10, color: WHITE, valign: 'middle', align: 'center' });
  const tx = lx + 1.7, tw = lw - 1.85;
  s.addShape(pres.shapes.RECTANGLE, { x: tx, y: ty + 0.2, w: tw, h: 0.3, fill: { color: '262B38' }, line: { type: 'none' } });
  const chips = [[0.02, 0.07, 3], [0.11, 0.16, 1], [0.2, 0.24, 2], [0.29, 0.31, 0], [0.36, 0.43, 3], [0.48, 0.55, 1], [0.58, 0.61, 0], [0.66, 0.7, 2], [0.74, 0.8, 3], [0.84, 0.9, 1], [0.93, 0.96, 0]];
  const chipCol = [PINK, MINT, GOLD, '8A93A6'];
  chips.forEach(([a, b, k]) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx + a * tw, y: ty + 0.22, w: (b - a) * tw, h: 0.26, fill: { color: chipCol[k] }, line: { type: 'none' }, rectRadius: 0.06 }));
  const lgw = tw / 4;
  sd.timeline.legend.forEach((t, i) => {
    dot(s, tx + i * lgw, ty + 0.66, chipCol[i], 0.12);
    label(s, t, tx + i * lgw + 0.18, ty + 0.58, lgw - 0.2, 0.28, { fontSize: 9.5, color: MUTED, valign: 'middle' });
  });
  // Räume
  label(s, sd.roomsTitle, lx, 4.5, lw, 0.34, { fontSize: 14, bold: true, color: SKY });
  const rw3 = (lw - 0.3) / 3;
  sd.rooms.forEach((r, i) => {
    const x = lx + (i % 3) * (rw3 + 0.15), y = 4.9 + Math.floor(i / 3) * 0.85;
    card(s, x, y, rw3, 0.72);
    label(s, r[0], x + 0.15, y + 0.06, rw3 - 0.3, 0.32, { fontSize: 11.5, bold: true });
    const st = r[2];
    const col = st === 'now' ? MINT : st === 'soon' ? GOLD : PINK;
    label(s, r[1], x + 0.15, y + 0.38, rw3 - 0.3, 0.28, { fontSize: 9.5, bold: true, color: col });
  });
  // Markt-Tabelle
  const mx = 7.95, mw = W - M - mx;
  label(s, sd.market.title, mx, 1.42, mw, 0.34, { fontSize: 14, bold: true, color: GOLD });
  const rows = [sd.market.header.map((h) => ({ text: h, options: { bold: true, color: GOLD, fill: { color: CARD2 } } }))];
  sd.market.rows.forEach((r, i) => rows.push([
    { text: r[0], options: { color: WHITE, fill: { color: i === sd.market.rows.length - 1 ? '2A1530' : CARD } } },
    { text: r[1], options: { color: i === sd.market.rows.length - 1 ? PINK : WHITE, bold: true, fill: { color: i === sd.market.rows.length - 1 ? '2A1530' : CARD } } },
  ]));
  s.addTable(rows, { x: mx, y: 1.8, w: mw, colW: [mw * 0.5, mw * 0.5], fontFace: FONT, fontSize: 10.5, color: WHITE, border: { type: 'solid', pt: 1, color: BG }, rowH: 0.5, valign: 'middle', margin: 0.06 });
  label(s, sd.market.note, mx, 5.45, mw, 1.35, { fontSize: 10.5, color: MUTED, italic: true });
};

L.team = (sd) => {
  const s = newSlide(sd); header(s, sd);
  card(s, M, 1.5, 5.6, 4.95, CARD2);
  s.addShape(pres.shapes.OVAL, { x: M + 0.4, y: 1.9, w: 1.3, h: 1.3, fill: { color: PINK }, line: { color: PINK } });
  label(s, sd.photo, M + 0.4, 1.9, 1.3, 1.3, { fontSize: 12, align: 'center', valign: 'middle', bold: true });
  label(s, sd.name, M + 1.95, 2.0, 3.4, 0.5, { fontSize: 22, bold: true });
  label(s, sd.role, M + 1.95, 2.5, 3.45, 0.75, { fontSize: 12, color: PINK });
  bullets(s, sd.bullets, M + 0.4, 3.5, 4.9, 2.8, { fontSize: 12.5, gap: 6 });
  sd.open.forEach((o, i) => {
    const y = 1.5 + i * 1.68, col = [MINT, GOLD, MUTED][i];
    card(s, 6.5, y, 6.23, 1.52);
    s.addShape(pres.shapes.OVAL, { x: 6.75, y: y + 0.41, w: 0.7, h: 0.7, fill: { color: CARD2 }, line: { color: col, width: 1.5, dashType: 'dash' } });
    label(s, i < 2 ? '+' : '★', 6.75, y + 0.41, 0.7, 0.7, { fontSize: 20, align: 'center', valign: 'middle', color: col, fit: false });
    label(s, o[0], 7.7, y + 0.28, 4.85, 0.45, { fontSize: 15, bold: true });
    label(s, o[1], 7.7, y + 0.76, 4.85, 0.6, { fontSize: 12, color: MUTED });
  });
};

L.ask = (sd) => {
  const s = newSlide(sd);
  s.addImage({ path: img('overlayNeon'), x: 0, y: 0, w: W, h: H, transparency: 82 });
  label(s, String(sd.kicker).toUpperCase(), M, 0.55, 6, 0.3, { fontSize: 11, bold: true, color: MINT, charSpacing: 4 });
  label(s, sd.title, M, 0.92, CW, 0.9, { fontSize: 34, bold: true, min: 20 });
  const n = sd.cards.length, g = 0.15, cw = (CW - g * (n - 1)) / n;
  sd.cards.forEach((a, i) => {
    const x = M + i * (cw + g), col = [PINK, GOLD, MINT, SKY][i];
    card(s, x, 2.0, cw, 3.55, CARD, i === 1 ? GOLD : undefined);
    label(s, a[0], x + 0.25, 2.18, cw - 0.5, 0.75, { fontSize: 18, bold: true, color: col });
    label(s, a[1], x + 0.25, 2.98, cw - 0.5, 2.5, { fontSize: 13, color: WHITE });
  });
  card(s, M, 5.8, CW, 0.78, CARD2);
  label(s, sd.contact, M + 0.3, 5.82, CW - 0.6, 0.74, { fontSize: 15, bold: true, valign: 'middle', align: 'center' });
  label(s, sd.altNote, M, 6.72, CW - 1.6, 0.3, { fontSize: 10, color: MUTED, italic: true });
  s.addText(`${D.meta.footerBrand || 'LiveFX'}  ·  ${slideNo}`, { x: W - M - 2.5, y: H - 0.42, w: 2.5, h: 0.25, fontFace: FONT, fontSize: 9, color: DIM, align: 'right', isTextBox: true, margin: 0 });
  if (sd.notes) s.addNotes(sd.notes);
};

// ---------- Bauen ----------
for (const sd of D.slides) {
  const fn = L[sd.layout];
  if (!fn) { console.error('Unbekanntes Layout:', sd.layout); process.exit(3); }
  fn(sd);
}
pres.writeFile({ fileName: OUT }).then(() => console.log(`geschrieben: ${OUT} (${slideNo} Folien)`));
