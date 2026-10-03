// Portfolio investor deck generator: one script, three languages.
// Usage: node build-deck.js            -> builds DE, TR and EN
//        node build-deck.js de         -> builds one language
// Reads deck-content.<lang>.json from this folder and writes Portfolio_Investor_Deck_<LANG>.pptx.
// Images are read from the sibling project folders (../aybal-show, ../live-fx).
const fs = require('fs');
const path = require('path');

const PPTX_TRIES = ['pptxgenjs',
  '/tmp/claude-0/-home-user-Notion/cc1f2860-dda2-5ade-b7dc-17972a1d59e6/scratchpad/investor-node/node_modules/pptxgenjs',
  '/tmp/claude-0/-home-user-Notion/cc1f2860-dda2-5ade-b7dc-17972a1d59e6/scratchpad/node-tools/node_modules/pptxgenjs'];
function resolvePptx() {
  for (const t of PPTX_TRIES) { try { return require.resolve(t); } catch (e) { /* next */ } }
  throw new Error('pptxgenjs not found – run: npm install pptxgenjs');
}
const PPTX_PATH = resolvePptx();
const PptxGenJS = require(PPTX_PATH);
const JSZip = require(require.resolve('jszip', { paths: [path.dirname(PPTX_PATH)] }));

const ROOT = path.resolve(__dirname, '..');
const IMG = {
  aybalHero: path.join(ROOT, 'aybal-show/assets/hero.jpg'),
  aybalProduct: path.join(ROOT, 'aybal-show/assets/product.jpg'),
  fxNeon: path.join(ROOT, 'live-fx/business/landing-assets/overlay-neon.jpg'),
  fxPanel: path.join(ROOT, 'live-fx/business/landing-assets/panel.jpg'),
  fxRain: path.join(ROOT, 'live-fx/business/landing-assets/overlay-portrait-rain.jpg'),
  still: (lang, t) => path.join(ROOT, `live-fx/business/video/stills/vision-${lang}-16x9-${t}.jpg`),
};

// Palette: Aybal (plum / wine / gold) next to LiveFX (night / pink / mint), plus violet for the book series.
const THEME = {
  name: 'Eine Stimme',
  headFontFace: 'Georgia',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '15111A', lt1: 'FFFFFF', dk2: '241C2A', lt2: 'BDB3C4',
    accent1: 'D4B27A', // Aybal gold
    accent2: 'FF2D75', // LiveFX pink
    accent3: 'A08FFF', // book series violet
    accent4: '2DFFB5', // LiveFX mint
    accent5: '6E1630', // Aybal wine
    accent6: 'FFD166', // LiveFX gold
    hlink: 'FFD166', folHlink: 'D4B27A',
  },
};
const HEX = { bg: '15111A', bg2: '1B1520', card: '241C2A', line: '3A2E40', white: 'FFFFFF', muted: 'BDB3C4', dim: '8C8294', gold: 'D4B27A', pink: 'FF2D75', violet: 'A08FFF', mint: '2DFFB5', wine: '6E1630', plum: '2E0B18' };

async function applyThemeColors(file, theme) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n));
  for (const n of names) {
    let xml = await zip.file(n).async('string');
    for (const [k, v] of Object.entries(theme.colors)) {
      xml = xml.replace(new RegExp(`<a:${k}>[\\s\\S]*?</a:${k}>`), `<a:${k}><a:srgbClr val="${v}"/></a:${k}>`);
    }
    xml = xml.replace(/<a:clrScheme name="[^"]*"/, `<a:clrScheme name="${theme.name}"`);
    zip.file(n, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

async function build(lang) {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, `deck-content.${lang}.json`), 'utf8'));
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
  pres.title = D.deckTitle;
  pres.author = 'Gönül Demet (Investor Relations)';
  pres.subject = D.deckTitle;
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const COL = { bg: C.text1, card: C.text2, white: C.background1, muted: C.background2, gold: C.accent1, pink: C.accent2, violet: C.accent3, mint: C.accent4, wine: C.accent5, yellow: C.accent6 };
  const W = 13.333, M = 0.6;

  const footerText = { text: { text: D.footer, options: { x: M, y: 7.0, w: 8, h: 0.3, fontSize: 9, color: COL.muted, charSpacing: 2, margin: 0 } } };
  pres.defineSlideMaster({
    title: 'PF_TITLE',
    background: { color: HEX.bg },
    objects: [
      footerText,
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 1.15, w: 6.1, h: 2.1, fontFace: THEME.headFontFace, fontSize: 50, bold: true, color: COL.white, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
  });
  pres.defineSlideMaster({
    title: 'PF_CONTENT',
    background: { color: HEX.bg },
    margin: [0.5, 0.6, 0.6, 0.6],
    objects: [
      { text: { text: D.footer, options: { x: M, y: 7.0, w: 8, h: 0.3, fontSize: 9, color: COL.muted, charSpacing: 2, margin: 0 } } },
      { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 0.38, w: 9, h: 0.3, fontSize: 11, bold: true, color: COL.gold, charSpacing: 3, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.68, w: W - 2 * M, h: 0.75, fontFace: THEME.headFontFace, fontSize: 32, bold: true, color: COL.white, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: { x: W - M - 0.6, y: 7.0, w: 0.6, h: 0.3, fontSize: 9, color: COL.muted, align: 'right', margin: 0 },
  });

  // helpers --------------------------------------------------------------
  let objN = 0;
  const on = (p) => `${p}-${++objN}`;
  const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontFace: THEME.bodyFontFace, color: COL.white, fontSize: 14, valign: 'top', objectName: on('Text') }, o));
  const card = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, Object.assign({ x, y, w, h, rectRadius: 0.12, fill: { color: COL.card }, line: { color: HEX.line, width: 0.75 }, objectName: on('Card') }, o));
  const pill = (s, text, x, y, w, color, o = {}) => s.addText(text, Object.assign({ shape: pres.shapes.ROUNDED_RECTANGLE, isTextBox: true, x, y, w, h: 0.32, rectRadius: 0.16, fill: { color: COL.bg }, line: { color, width: 1.25 }, color, fontSize: 10, bold: true, charSpacing: 2, align: 'center', valign: 'middle', margin: 0, fontFace: THEME.bodyFontFace, objectName: on('Pill') }, o));
  const dot = (s, x, y, d, color, text, tc) => s.addText(text || '', { shape: pres.shapes.OVAL, isTextBox: true, x, y, w: d, h: d, fill: { color }, line: { color, width: 0 }, color: tc || COL.bg, fontSize: Math.max(10, Math.round(d * 22)), bold: true, align: 'center', valign: 'middle', margin: 0, fontFace: THEME.headFontFace, objectName: on('Badge') });
  const img = (s, p, x, y, w, h, o = {}) => s.addImage(Object.assign({ path: p, x, y, w, h, sizing: { type: 'cover', w, h }, objectName: on('Image') }, o));
  // Motif: a voice waveform, gold (Aybal) fading into pink (LiveFX).
  const wave = (s, x, y, w, h, n = 28) => {
    const step = w / n, bw = step * 0.5;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(Math.sin(i * 0.55) * 0.75 + Math.sin(i * 1.7) * 0.25);
      const bh = Math.max(0.08, h * (0.2 + 0.8 * a));
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + i * step, y: y + (h - bh) / 2, w: bw, h: bh, rectRadius: bw / 2, fill: { color: i < n / 2 ? COL.gold : COL.pink, transparency: 10 }, line: { type: 'none' }, objectName: on('Wave') });
    }
  };
  const content = (sec, k) => {
    const s = pres.addSlide({ masterName: 'PF_CONTENT', sectionTitle: sec });
    s.addText(D[k].kicker, { placeholder: 'kicker' });
    s.addText(D[k].title, { placeholder: 'title' });
    return s;
  };
  const src = (s, text, y = 6.62) => T(s, text, { x: M, y, w: W - 2 * M, h: 0.25, fontSize: 9, color: COL.muted, italic: true });
  const SEC = D.sections;

  // 1 · Title ---------------------------------------------------------------
  pres.addSection({ title: SEC[0] });
  {
    const s = pres.addSlide({ masterName: 'PF_TITLE', sectionTitle: SEC[0] });
    const d = D.s1;
    T(s, d.kicker, { x: M, y: 0.7, w: 6, h: 0.3, fontSize: 12, bold: true, color: COL.gold, charSpacing: 3 });
    s.addText(d.title, { placeholder: 'title' });
    T(s, d.sub, { x: M, y: 3.35, w: 5.9, h: 1.0, fontSize: 15, color: COL.muted });
    wave(s, M, 4.45, 5.9, 0.45, 34);
    card(s, M, 5.15, 3.0, 1.35);
    T(s, d.askLabel, { x: M + 0.25, y: 5.3, w: 2.3, h: 0.25, fontSize: 10, bold: true, color: COL.gold, charSpacing: 3 });
    T(s, d.ask, { x: M + 0.25, y: 5.6, w: 2.6, h: 0.7, fontSize: 28, bold: true, fontFace: THEME.headFontFace });
    d.people.forEach(([lab, name], i) => {
      T(s, lab, { x: 3.9, y: 5.2 + i * 0.68, w: 2.95, h: 0.22, fontSize: 9, bold: true, color: COL.muted, charSpacing: 2 });
      T(s, name, { x: 3.9, y: 5.42 + i * 0.68, w: 2.95, h: 0.32, fontSize: 16, bold: true });
    });
    img(s, IMG.aybalHero, 7.05, 0.6, 2.85, 6.1);
    img(s, IMG.fxNeon, 10.05, 0.6, 2.68, 2.95);
    img(s, IMG.still(lang, '8s'), 10.05, 3.75, 2.68, 2.95);
    pill(s, d.imgLabels[0].toUpperCase(), 7.25, 6.18, 1.1, COL.gold);
    pill(s, d.imgLabels[1].toUpperCase(), 10.25, 3.03, 1.1, COL.pink);
    s.addNotes(`${d.title.replace(/\n/g, ' ')} – ${d.sub}`);
  }

  // 2 · Thesis --------------------------------------------------------------
  {
    const s = content(SEC[0], 's2');
    const d = D.s2, cols = [COL.gold, COL.pink, COL.violet], glyph = ['1', '2', '3'];
    const cw = 3.85, gap = 0.29;
    d.pillars.forEach(([h, b], i) => {
      const x = M + i * (cw + gap);
      card(s, x, 1.75, cw, 3.55);
      dot(s, x + 0.35, 2.05, 0.7, cols[i], glyph[i]);
      T(s, h, { x: x + 0.35, y: 2.95, w: cw - 0.7, h: 0.75, fontSize: 19, valign: 'top', bold: true, fontFace: THEME.headFontFace });
      T(s, b, { x: x + 0.35, y: 3.75, w: cw - 0.7, h: 1.5, fontSize: 14, color: COL.muted });
    });
    T(s, d.bottom, { x: M, y: 5.75, w: 8.2, h: 0.6, fontSize: 18, italic: true, color: COL.gold, fontFace: THEME.headFontFace, valign: 'middle' });
    wave(s, 9.3, 5.78, 3.43, 0.55, 22);
    s.addNotes(d.bottom);
  }

  // 3 · Overview ------------------------------------------------------------
  pres.addSection({ title: SEC[1] });
  {
    const s = content(SEC[1], 's3');
    const cols = [COL.gold, COL.pink, COL.violet];
    const cw = 3.85, gap = 0.29;
    D.s3.cards.forEach((c, i) => {
      const x = M + i * (cw + gap), y = 1.65;
      card(s, x, y, cw, 4.85);
      pill(s, c.tag, x + 0.3, y + 0.3, 1.55, cols[i]);
      T(s, c.what, { x: x + 0.3, y: y + 0.78, w: cw - 0.6, h: 0.7, fontSize: 17, bold: true, fontFace: THEME.headFontFace });
      T(s, c.status, { x: x + 0.3, y: y + 1.52, w: cw - 0.6, h: 0.75, fontSize: 12, color: COL.muted });
      c.nums.forEach(([n, l], j) => {
        const yy = y + 2.35 + j * 0.65;
        T(s, n, { x: x + 0.3, y: yy, w: 1.75, h: 0.55, fontSize: 22, bold: true, color: cols[i], fontFace: THEME.headFontFace, valign: 'middle' });
        T(s, l, { x: x + 2.1, y: yy, w: cw - 2.35, h: 0.55, fontSize: 13, valign: 'middle' });
      });
      T(s, c.src, { x: x + 0.3, y: y + 4.35, w: cw - 0.6, h: 0.35, fontSize: 9, italic: true, color: COL.muted });
    });
  }

  // 4 · Aybal ---------------------------------------------------------------
  const statRows = (s, stats, x, y, w, color, nw = 2.55, fsz = 22) => stats.forEach(([n, l], j) => {
    const yy = y + j * 0.68;
    T(s, n, { x, y: yy, w: nw, h: 0.55, fontSize: fsz, bold: true, color, fontFace: THEME.headFontFace, valign: 'middle' });
    T(s, l, { x: x + nw + 0.1, y: yy, w: w - nw - 0.1, h: 0.55, fontSize: 13, color: COL.muted, valign: 'middle' });
  });
  const bullets = (s, items, x, y, w, h, fs = 14) => T(s, items.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1 } })), { x, y, w, h, fontSize: fs, paraSpaceAfter: 6 });
  {
    const s = content(SEC[1], 's4');
    const d = D.s4;
    img(s, IMG.aybalProduct, M, 1.65, 5.0, 3.96);
    card(s, M, 5.8, 5.0, 0.72, { fill: { color: COL.wine }, line: { color: COL.gold, width: 1 } });
    T(s, d.round, { x: M + 0.2, y: 5.8, w: 4.6, h: 0.72, fontSize: 12, bold: true, color: COL.white, valign: 'middle' });
    const x = 6.0, w = W - M - x;
    T(s, d.body, { x, y: 1.65, w, h: 0.75, fontSize: 15 });
    statRows(s, d.stats, x, 2.55, w, COL.gold);
    bullets(s, d.facts, x, 4.75, w, 1.5, 14);
    src(s, d.src);
  }

  // 5 · LiveFX --------------------------------------------------------------
  {
    const s = content(SEC[1], 's5');
    const d = D.s5;
    const ix = 7.15, iw = W - M - ix;
    img(s, IMG.fxPanel, ix, 1.65, iw, iw / 1.6);
    img(s, IMG.fxRain, ix + iw - 1.35, 1.65 + iw / 1.6 - 1.3, 1.15, 2.05, { shadow: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 90, opacity: 0.5 } });
    const w = 6.2;
    T(s, d.body, { x: M, y: 1.65, w, h: 1.0, fontSize: 14 });
    statRows(s, d.stats, M, 2.75, w, COL.pink, 3.1, 20);
    bullets(s, d.facts, M, 4.95, w, 1.5, 14);
    src(s, d.src);
  }

  // 6 · Content IP ----------------------------------------------------------
  {
    const s = content(SEC[1], 's6');
    const d = D.s6, tags = ['TR', 'DE', 'EN'];
    d.series.forEach((n, i) => {
      pill(s, tags[i], M, 1.7 + i * 0.45, 0.6, COL.violet);
      T(s, n, { x: M + 0.75, y: 1.7 + i * 0.45, w: 5.6, h: 0.32, fontSize: 15, bold: true, italic: true, fontFace: THEME.headFontFace, valign: 'middle' });
    });
    d.books.forEach((b, i) => {
      dot(s, M, 3.2 + i * 0.44, 0.32, COL.violet, String(i + 1));
      T(s, b, { x: M + 0.45, y: 3.2 + i * 0.44, w: 6.0, h: 0.32, fontSize: 14, valign: 'middle' });
    });
    T(s, d.extra, { x: M, y: 5.5, w: 6.4, h: 0.5, fontSize: 12, color: COL.muted });
    T(s, d.trailers, { x: M, y: 6.0, w: 6.4, h: 0.5, fontSize: 12, color: COL.muted });
    const ix = 7.3, iw = W - M - ix, ih = iw * 9 / 16;
    img(s, IMG.still(lang, '8s'), ix, 1.7, iw, ih);
    T(s, d.caption, { x: ix, y: 1.75 + ih, w: iw, h: 0.25, fontSize: 9, italic: true, color: COL.muted });
    const cols = [COL.gold, COL.pink];
    d.feeds.forEach(([h, b], i) => {
      const cw = (iw - 0.25) / 2, x = ix + i * (cw + 0.25);
      card(s, x, 5.2, cw, 1.25);
      T(s, h, { x: x + 0.2, y: 5.32, w: cw - 0.4, h: 0.35, fontSize: 16, bold: true, color: cols[i] });
      T(s, b, { x: x + 0.2, y: 5.7, w: cw - 0.4, h: 0.7, fontSize: 12, color: COL.muted });
    });
    src(s, d.src);
  }

  // 7 · Synergies -----------------------------------------------------------
  {
    const s = content(SEC[1], 's7');
    const d = D.s7, cols = [COL.gold, COL.pink, COL.violet, COL.mint], glyph = ['A', 'B', 'C', 'D'];
    const cw = 3.5, ch = 2.25;
    d.items.forEach(([h, b], i) => {
      const x = M + (i % 2) * (cw + 0.3), y = 1.65 + Math.floor(i / 2) * (ch + 0.3);
      card(s, x, y, cw, ch);
      dot(s, x + 0.25, y + 0.25, 0.5, cols[i], glyph[i]);
      T(s, h, { x: x + 0.9, y: y + 0.25, w: cw - 1.1, h: 0.5, fontSize: 16, bold: true, valign: 'middle' });
      T(s, b, { x: x + 0.25, y: y + 0.9, w: cw - 0.5, h: ch - 1.0, fontSize: 12, color: COL.muted });
    });
    const ix = 8.25, iw = W - M - ix, ih = iw * 9 / 16;
    img(s, IMG.still(lang, '15s'), ix, 1.65, iw, ih);
    T(s, d.caption, { x: ix, y: 1.7 + ih, w: iw, h: 0.25, fontSize: 9, italic: true, color: COL.muted });
    wave(s, ix, 4.6, iw, 0.6, 20);
    T(s, d.note, { x: ix, y: 5.45, w: iw, h: 0.9, fontSize: 14, italic: true, color: COL.gold, fontFace: THEME.headFontFace });
  }

  // 8 · Ask (donut) ---------------------------------------------------------
  pres.addSection({ title: SEC[2] });
  {
    const s = content(SEC[2], 's8');
    const d = D.s8;
    s.addChart(pres.charts.DOUGHNUT, [{ name: d.chartTitle, labels: d.split.map((r) => r[0]), values: d.split.map((r) => r[1]) }], {
      x: M, y: 1.55, w: 5.0, h: 5.0, holeSize: 62, chartColors: [HEX.gold, HEX.pink, HEX.violet],
      dataBorder: { pt: 2, color: HEX.bg }, showLegend: false, showTitle: false, showValue: false, showPercent: true, showLabel: false,
      dataLabelColor: HEX.bg, dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelFontFace: '+mn-lt', objectName: 'Use-of-funds-donut',
    });
    T(s, d.total, { x: M + 1.3, y: 3.75, w: 2.4, h: 0.5, fontSize: 26, bold: true, align: 'center', fontFace: THEME.headFontFace });
    T(s, d.chartTitle, { x: M + 1.3, y: 3.3, w: 2.4, h: 0.4, fontSize: 11, color: COL.muted, align: 'center' });
    const x = 6.2, w = W - M - x, cols = [COL.gold, COL.pink, COL.violet];
    pill(s, D.proposal.toUpperCase(), x, 1.7, 3.6, COL.pink, { fill: { color: '2A1530' } });
    d.split.forEach(([n, , amt, sub], i) => {
      const y = 2.35 + i * 1.12;
      card(s, x, y, w, 0.95);
      dot(s, x + 0.25, y + 0.3, 0.35, cols[i]);
      T(s, n, { x: x + 0.8, y: y + 0.14, w: 3.0, h: 0.38, fontSize: 18, bold: true });
      T(s, sub, { x: x + 0.8, y: y + 0.52, w: 3.4, h: 0.32, fontSize: 12, color: COL.muted });
      T(s, amt, { x: x + w - 2.6, y: y + 0.12, w: 2.35, h: 0.7, fontSize: 26, bold: true, color: cols[i], align: 'right', valign: 'middle', fontFace: THEME.headFontFace });
    });
    T(s, d.note, { x, y: 5.8, w, h: 0.7, fontSize: 12, color: COL.muted });
    s.addNotes(d.note);
  }

  // 9 · Use of funds --------------------------------------------------------
  {
    const s = content(SEC[2], 's9');
    const d = D.s9;
    const y0 = 1.65, h = 4.8;
    const w1 = 4.75, w2 = 3.45, gap = 0.29;
    card(s, M, y0, w1, h);
    T(s, d.aybalHead, { x: M + 0.25, y: y0 + 0.22, w: w1 - 0.5, h: 0.4, fontSize: 16, bold: true, color: COL.gold });
    s.addChart(pres.charts.BAR, [{ name: 'Aybal', labels: d.aybalBars.map((b) => b[0]), values: d.aybalBars.map((b) => b[1]) }], {
      x: M + 0.1, y: y0 + 0.85, w: w1 - 0.2, h: 2.9, barDir: 'bar', chartColors: [HEX.gold], barGapWidthPct: 45,
      catAxisLabelColor: HEX.white, catAxisLabelFontSize: 11, catAxisLabelFontFace: '+mn-lt', catAxisOrientation: 'maxMin', catAxisLineShow: false,
      valAxisHidden: true, valAxisMaxVal: 60, valAxisMinVal: 0, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: HEX.white, dataLabelFontSize: 11, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '0"%"',
      showLegend: false, objectName: 'Aybal-use-of-funds-bar',
    });
    T(s, d.aybalBars.map((b) => `${b[0]}: ${b[2]}`).join('  ·  '), { x: M + 0.25, y: y0 + 3.85, w: w1 - 0.5, h: 0.8, fontSize: 11, color: COL.muted });
    const cols = [[d.livefxHead, d.livefxText, d.livefxItems, COL.pink], [d.contentHead, null, d.contentItems, COL.violet]];
    cols.forEach(([head, text, items, col], i) => {
      const x = M + w1 + gap + i * (w2 + gap);
      card(s, x, y0, w2, h);
      T(s, head, { x: x + 0.25, y: y0 + 0.22, w: w2 - 0.5, h: 0.4, fontSize: 16, bold: true, color: col });
      pill(s, D.proposal.toUpperCase(), x + 0.25, y0 + 0.7, w2 - 0.5, col, { fontSize: 9, charSpacing: 0.5 });
      let yy = y0 + 1.2;
      if (text) { T(s, text, { x: x + 0.25, y: yy, w: w2 - 0.5, h: 1.45, fontSize: 12, color: COL.muted }); yy += 1.55; }
      bullets(s, items, x + 0.25, yy, w2 - 0.5, h - (yy - y0) - 0.2, 14);
    });
    src(s, d.src);
  }

  // 10 · Timeline -----------------------------------------------------------
  {
    const s = content(SEC[2], 's10');
    const d = D.s10;
    const gx = 2.1, gw = W - M - gx, qw = gw / d.quarters.length;
    d.quarters.forEach((q, i) => {
      T(s, q, { x: gx + i * qw, y: 1.6, w: qw, h: 0.3, fontSize: 11, bold: true, color: COL.muted, align: 'center' });
    });
    const cols = [COL.gold, COL.pink, COL.violet];
    d.lanes.forEach((ln, li) => {
      const y = 2.05 + li * 1.45;
      s.addShape(pres.shapes.LINE, { x: gx, y: y + 0.55, w: gw, h: 0, line: { color: HEX.line, width: 1.5 }, objectName: on('Lane') });
      T(s, ln.name, { x: M, y: y + 0.3, w: 1.4, h: 0.5, fontSize: 16, bold: true, color: cols[li], valign: 'middle' });
      ln.items.forEach(([q, text]) => {
        const x = gx + q * qw + 0.05;
        s.addText(text, { shape: pres.shapes.ROUNDED_RECTANGLE, isTextBox: true, x, y: y + 0.05, w: qw - 0.1, h: 1.0, rectRadius: 0.1, fill: { color: COL.card }, line: { color: cols[li], width: 1 }, fontSize: 11, color: COL.white, align: 'center', valign: 'middle', margin: 3, fontFace: THEME.bodyFontFace, objectName: on('Milestone') });
      });
    });
    T(s, d.note, { x: M, y: 6.45, w: W - 2 * M, h: 0.3, fontSize: 11, italic: true, color: COL.muted });
  }

  // 11 · Structure & risks --------------------------------------------------
  {
    const s = content(SEC[2], 's11');
    const d = D.s11;
    const w = 7.0;
    T(s, d.optHead, { x: M, y: 1.6, w, h: 0.35, fontSize: 15, bold: true, color: COL.gold });
    d.options.forEach(([h, b], i) => {
      const y = 2.05 + i * 1.22;
      card(s, M, y, w, 1.07);
      T(s, h, { x: M + 0.25, y: y + 0.12, w: w - 0.5, h: 0.35, fontSize: 15, bold: true });
      T(s, b, { x: M + 0.25, y: y + 0.48, w: w - 0.5, h: 0.55, fontSize: 12, color: COL.muted });
    });
    T(s, d.legal, { x: M, y: 5.8, w, h: 0.4, fontSize: 13, italic: true, color: COL.pink });
    const x = 8.0, rw = W - M - x;
    card(s, x, 1.6, rw, 4.6);
    T(s, d.riskHead, { x: x + 0.3, y: 1.8, w: rw - 0.6, h: 0.4, fontSize: 16, bold: true, color: COL.pink });
    d.risks.forEach((r, i) => {
      const y = 2.4 + i * 0.7;
      dot(s, x + 0.3, y + 0.08, 0.3, COL.pink, '!', COL.bg);
      T(s, r, { x: x + 0.8, y, w: rw - 1.1, h: 0.5, fontSize: 14, valign: 'middle' });
    });
  }

  // 12 · Team & contact -----------------------------------------------------
  pres.addSection({ title: SEC[3] });
  {
    const s = content(SEC[3], 's12');
    const d = D.s12, cols = [COL.gold, COL.gold, COL.violet];
    const cw = 3.85, gap = 0.29;
    d.team.forEach(([ini, name, role], i) => {
      const x = M + i * (cw + gap);
      card(s, x, 1.65, cw, 1.6);
      dot(s, x + 0.25, 1.95, 0.95, cols[i], ini);
      T(s, name, { x: x + 1.4, y: 1.95, w: cw - 1.6, h: 0.4, fontSize: 18, bold: true });
      T(s, role, { x: x + 1.4, y: 2.38, w: cw - 1.6, h: 0.75, fontSize: 12, color: COL.muted });
    });
    T(s, d.hiring, { x: M, y: 3.45, w: W - 2 * M, h: 0.4, fontSize: 13, color: COL.muted });
    wave(s, M, 4.15, 4.2, 0.7, 26);
    T(s, d.closing, { x: 5.1, y: 4.05, w: W - M - 5.1, h: 0.9, fontSize: 24, italic: true, color: COL.gold, fontFace: THEME.headFontFace, valign: 'middle' });
    card(s, M, 5.2, W - 2 * M, 0.75, { fill: { color: COL.wine }, line: { color: COL.gold, width: 1 } });
    T(s, d.contact, { x: M + 0.3, y: 5.2, w: W - 2 * M - 0.6, h: 0.75, fontSize: 18, bold: true, valign: 'middle' });
    T(s, d.disclaimer, { x: M, y: 6.2, w: W - 2 * M, h: 0.35, fontSize: 10, italic: true, color: COL.muted });
  }

  const out = path.join(__dirname, D.file);
  await pres.writeFile({ fileName: out });
  await applyThemeColors(out, THEME);
  console.log('wrote', out);
}

(async () => {
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['de', 'tr', 'en'];
  for (const l of langs) await build(l);
})().catch((e) => { console.error(e); process.exit(1); });
