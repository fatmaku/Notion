// LiveFX investor deck generator: one script, three languages.
// Usage: node build-deck.js            -> builds DE, TR and EN
//        node build-deck.js de         -> builds one language
// Reads deck-content.<lang>.json from this folder and writes LiveFX_Investor_Deck_<LANG>.pptx.
// Images: ../live-fx/business/{landing-assets,video/assets,video/stills} and ./assets (prototype screenshots).
const fs = require('fs');
const path = require('path');

const PPTX_TRIES = ['pptxgenjs',
  '/tmp/claude-0/-home-user-Notion/cc1f2860-dda2-5ade-b7dc-17972a1d59e6/scratchpad/investor-node/node_modules/pptxgenjs',
  '/tmp/claude-0/-home-user-Notion/cc1f2860-dda2-5ade-b7dc-17972a1d59e6/scratchpad/node_modules/pptxgenjs'];
function resolvePptx() {
  for (const t of PPTX_TRIES) { try { return require.resolve(t); } catch (e) { /* next */ } }
  throw new Error('pptxgenjs not found – run: npm install pptxgenjs');
}
const PPTX_PATH = resolvePptx();
const PptxGenJS = require(PPTX_PATH);
const JSZip = require(require.resolve('jszip', { paths: [path.dirname(PPTX_PATH)] }));

const ROOT = path.resolve(__dirname, '..');
const BIZ = path.join(ROOT, 'live-fx/business');
const IMG = {
  neon: path.join(BIZ, 'landing-assets/overlay-neon.jpg'),
  rain: path.join(BIZ, 'landing-assets/overlay-portrait-rain.jpg'),
  panel: path.join(BIZ, 'video/assets/panel.jpg'),
  card: (l) => path.join(BIZ, `video/assets/overlay-card${l === 'de' ? '' : '.' + l}.jpg`),
  vision: (l, t) => path.join(BIZ, `video/stills/vision-${l}-16x9-${t}.jpg`),
  proto: (k, l) => path.join(__dirname, `assets/proto-${k}-${l}.jpg`),
};

// LiveFX palette: night background, neon pink, mint, gold (+ light blue for line C).
const THEME = {
  name: 'LiveFX Investor',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '0F1115', lt1: 'FFFFFF', dk2: '1A1D24', lt2: 'A9B0BD',
    accent1: 'FF2D75', accent2: '2DFFB5', accent3: 'FFD166', accent4: '6CC4FF', accent5: '2A2E38', accent6: '3A0F22',
    hlink: 'FFD166', folHlink: '2DFFB5',
  },
};
const HEX = { bg: '0F1115', card: '1A1D24', line: '2A2E38', white: 'FFFFFF', muted: 'A9B0BD', pink: 'FF2D75', mint: '2DFFB5', gold: 'FFD166', blue: '6CC4FF', wine: '3A0F22' };

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
  pres.company = 'LiveFX';
  pres.subject = D.deckTitle;
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const COL = { bg: C.text1, card: C.text2, white: C.background1, muted: C.background2, pink: C.accent1, mint: C.accent2, gold: C.accent3, blue: C.accent4, line: C.accent5, wine: C.accent6 };
  const W = 13.333, M = 0.6;
  const footer = { text: { text: D.footer, options: { x: M, y: 7.0, w: 8, h: 0.3, fontSize: 9, color: COL.muted, charSpacing: 2, margin: 0 } } };

  pres.defineSlideMaster({
    title: 'LFX_TITLE',
    background: { color: HEX.bg },
    objects: [footer, { placeholder: { options: { name: 'title', type: 'title', x: M, y: 1.2, w: 6.3, h: 2.6, fontFace: THEME.headFontFace, fontSize: 48, bold: true, color: COL.white, valign: 'top', align: 'left', margin: 0 }, text: '' } }],
  });
  pres.defineSlideMaster({
    title: 'LFX_CONTENT',
    background: { color: HEX.bg },
    margin: [0.5, 0.6, 0.6, 0.6],
    objects: [
      { text: { text: D.footer, options: { x: M, y: 7.0, w: 8, h: 0.3, fontSize: 9, color: COL.muted, charSpacing: 2, margin: 0 } } },
      { placeholder: { options: { name: 'kicker', type: 'body', x: M, y: 0.38, w: 9, h: 0.3, fontSize: 11, bold: true, color: COL.pink, charSpacing: 3, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.7, w: W - 2 * M, h: 0.75, fontFace: THEME.headFontFace, fontSize: 32, bold: true, color: COL.white, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: { x: W - M - 0.6, y: 7.0, w: 0.6, h: 0.3, fontSize: 9, color: COL.muted, align: 'right', margin: 0 },
  });

  // helpers --------------------------------------------------------------
  let objN = 0;
  const on = (p) => `${p}-${++objN}`;
  const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontFace: THEME.bodyFontFace, color: COL.white, fontSize: 14, valign: 'top', objectName: on('Text') }, o));
  const H = (s, text, o) => T(s, text, Object.assign({ fontFace: THEME.headFontFace, bold: true }, o));
  const card = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, Object.assign({ x, y, w, h, rectRadius: 0.12, fill: { color: COL.card }, line: { color: HEX.line, width: 0.75 }, objectName: on('Card') }, o));
  const pill = (s, text, x, y, w, color, o = {}) => s.addText(text, Object.assign({ shape: pres.shapes.ROUNDED_RECTANGLE, isTextBox: true, x, y, w, h: 0.32, rectRadius: 0.16, fill: { color: COL.bg }, line: { color, width: 1.25 }, color, fontSize: 10, bold: true, charSpacing: 1.5, align: 'center', valign: 'middle', margin: 0, fontFace: THEME.bodyFontFace, objectName: on('Pill') }, o));
  const dot = (s, x, y, d, color, text, tc) => s.addText(text || '', { shape: pres.shapes.OVAL, isTextBox: true, x, y, w: d, h: d, fill: { color }, line: { color, width: 0 }, color: tc || COL.bg, fontSize: Math.max(10, Math.round(d * 24)), bold: true, align: 'center', valign: 'middle', margin: 0, fontFace: THEME.headFontFace, objectName: on('Badge') });
  const img = (s, p, x, y, w, h, o = {}) => s.addImage(Object.assign({ path: p, x, y, w, h, sizing: { type: 'cover', w, h }, objectName: on('Image') }, o));
  // Motif: a voice waveform in pink → mint (the microphone that drives everything).
  const wave = (s, x, y, w, h, n = 28) => {
    const step = w / n, bw = step * 0.5;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(Math.sin(i * 0.55) * 0.75 + Math.sin(i * 1.7) * 0.25);
      const bh = Math.max(0.08, h * (0.2 + 0.8 * a));
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + i * step, y: y + (h - bh) / 2, w: bw, h: bh, rectRadius: bw / 2, fill: { color: i < n / 2 ? COL.pink : COL.mint }, line: { type: 'none' }, objectName: on('Wave') });
    }
  };
  const content = (sec, k) => {
    const s = pres.addSlide({ masterName: 'LFX_CONTENT', sectionTitle: sec });
    s.addText(D[k].kicker, { placeholder: 'kicker' });
    s.addText(D[k].title, { placeholder: 'title' });
    return s;
  };
  const src = (s, text, y = 6.62) => T(s, text, { x: M, y, w: W - 2 * M, h: 0.25, fontSize: 9, color: COL.muted, italic: true });
  const SEC = D.sections;
  const accents = [COL.pink, COL.mint, COL.gold, COL.blue];
  const pct = (v) => (lang === 'tr' ? `%${v}` : lang === 'de' ? `${v} %` : `${v}%`);

  // 1 · Title ---------------------------------------------------------------
  pres.addSection({ title: SEC[0] });
  {
    const s = pres.addSlide({ masterName: 'LFX_TITLE', sectionTitle: SEC[0] });
    const d = D.s1;
    T(s, d.kicker, { x: M, y: 0.7, w: 6.3, h: 0.3, fontSize: 12, bold: true, color: COL.pink, charSpacing: 3 });
    s.addText(d.title, { placeholder: 'title' });
    T(s, d.sub, { x: M, y: 3.9, w: 6.0, h: 0.8, fontSize: 15, color: COL.muted });
    wave(s, M, 4.8, 6.0, 0.4, 36);
    card(s, M, 5.4, 3.1, 1.35, { line: { color: HEX.pink, width: 1 } });
    T(s, d.askLabel, { x: M + 0.25, y: 5.52, w: 2.6, h: 0.25, fontSize: 10, bold: true, color: COL.pink, charSpacing: 3 });
    H(s, d.ask, { x: M + 0.25, y: 5.8, w: 2.7, h: 0.5, fontSize: 30 });
    T(s, d.askSub, { x: M + 0.25, y: 6.3, w: 2.7, h: 0.4, fontSize: 10, color: COL.muted });
    d.people.forEach(([lab, name], i) => {
      T(s, lab, { x: 4.0, y: 5.45 + i * 0.7, w: 3.0, h: 0.22, fontSize: 9, bold: true, color: COL.muted, charSpacing: 2 });
      H(s, name, { x: 4.0, y: 5.67 + i * 0.7, w: 3.0, h: 0.34, fontSize: 18 });
    });
    img(s, lang === 'de' ? IMG.neon : IMG.card(lang), 7.2, 0.6, 5.53, 3.11);
    img(s, IMG.vision(lang, '8s'), 7.2, 3.9, 5.53, 3.11);
    pill(s, d.imgLabels[0].toUpperCase(), 7.4, 0.8, 1.6, COL.pink);
    s.addNotes(`${d.title.replace(/\n/g, ' ')} – ${d.sub}`);
  }

  // 2 · Thesis --------------------------------------------------------------
  {
    const s = content(SEC[0], 's2');
    const d = D.s2, n = d.cards.length, gap = 0.25, cw = (W - 2 * M - gap * (n - 1)) / n;
    d.cards.forEach(([h, b], i) => {
      const x = M + i * (cw + gap), col = accents[i % 4];
      card(s, x, 1.75, cw, 3.7);
      H(s, String(i + 1).padStart(2, '0'), { x: x + 0.25, y: 1.95, w: 1, h: 0.55, fontSize: 30, color: col });
      H(s, h, { x: x + 0.25, y: 2.65, w: cw - 0.45, h: 0.8, fontSize: 18 });
      T(s, b, { x: x + 0.25, y: 3.5, w: cw - 0.45, h: 1.8, fontSize: 13, color: COL.muted });
    });
    T(s, d.bottom, { x: M, y: 5.8, w: 8.6, h: 0.7, fontSize: 18, italic: true, color: COL.gold, fontFace: THEME.headFontFace, valign: 'middle' });
    wave(s, 9.6, 5.85, 3.13, 0.55, 22);
    s.addNotes(d.bottom);
  }

  // 3 · Gap -----------------------------------------------------------------
  {
    const s = content(SEC[0], 's3');
    const d = D.s3;
    const gx = 2.0, gy = 1.95, cw = 2.75, ch = 1.95, g = 0.12;
    d.axisY.forEach((t, r) => T(s, t, { x: M, y: gy + r * (ch + g), w: 1.3, h: ch, fontSize: 12, bold: true, color: COL.muted, valign: 'middle' }));
    d.axisX.forEach((t, c) => T(s, t.toUpperCase(), { x: gx + c * (cw + g), y: 1.6, w: cw, h: 0.3, fontSize: 10, bold: true, color: COL.muted, align: 'center', charSpacing: 2 }));
    d.cells.forEach(([h, b], i) => {
      const r = Math.floor(i / 2), c = i % 2, x = gx + c * (cw + g), y = gy + r * (ch + g);
      const us = i === 3;
      card(s, x, y, cw, ch, us ? { fill: { color: COL.wine }, line: { color: HEX.pink, width: 1.5 } } : {});
      H(s, h, { x: x + 0.22, y: y + 0.3, w: cw - 0.44, h: 0.75, fontSize: us ? 26 : 16, color: us ? COL.pink : COL.white, valign: 'middle' });
      T(s, b, { x: x + 0.22, y: y + 1.1, w: cw - 0.44, h: 0.7, fontSize: 13, color: us ? COL.white : COL.muted });
    });
    const x = 8.1, w = W - M - x;
    d.stats.forEach(([n, l], i) => {
      const y = 1.75 + i * 1.6;
      H(s, n, { x, y, w, h: 0.6, fontSize: 34, color: accents[i] });
      T(s, l, { x, y: y + 0.65, w, h: 0.75, fontSize: 13, color: COL.muted });
    });
    src(s, d.src);
  }

  // 4 · Build ---------------------------------------------------------------
  pres.addSection({ title: SEC[1] });
  {
    const s = content(SEC[1], 's4');
    const d = D.s4;
    const iw = 6.2, ih = iw / 1.6;
    img(s, IMG.panel, M, 1.7, iw, ih);
    img(s, IMG.card(lang), M + iw - 2.55, 1.7 + ih - 1.25, 2.4, 1.35, { shadow: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 90, opacity: 0.6 } });
    pill(s, d.status, M, 5.75, iw, COL.mint, { h: 0.4, fontSize: 12 });
    const x = 7.2, w = W - M - x;
    T(s, d.body, { x, y: 1.7, w, h: 1.0, fontSize: 14 });
    const sw = (w - 0.25) / 2;
    d.stats.forEach(([n, l], i) => {
      const xx = x + (i % 2) * (sw + 0.25), yy = 2.85 + Math.floor(i / 2) * 0.95;
      H(s, n, { x: xx, y: yy, w: sw, h: 0.5, fontSize: 28, color: accents[i % 4] });
      T(s, l, { x: xx, y: yy + 0.5, w: sw, h: 0.35, fontSize: 12, color: COL.muted });
    });
    T(s, d.features, { x, y: 5.75, w, h: 0.75, fontSize: 12, color: COL.white });
    src(s, d.src);
  }

  // 5 · Vision A–D ------------------------------------------------------------
  {
    const s = content(SEC[1], 's5');
    const d = D.s5, gap = 0.25, cw = (W - 2 * M - 3 * gap) / 4, ih = cw * 9 / 16;
    const cols = [COL.mint, COL.gold, COL.blue, COL.pink], stills = ['8s', '15s', '22s', '29s'];
    d.lines.forEach(([L, name, body, st], i) => {
      const x = M + i * (cw + gap), y = 1.7;
      card(s, x, y, cw, 4.25);
      img(s, IMG.vision(lang, stills[i]), x, y, cw, ih);
      dot(s, x + 0.2, y + ih + 0.22, 0.5, cols[i], L);
      H(s, name, { x: x + 0.85, y: y + ih + 0.22, w: cw - 1.0, h: 0.5, fontSize: 20, valign: 'middle' });
      T(s, body, { x: x + 0.2, y: y + ih + 0.9, w: cw - 0.4, h: 1.2, fontSize: 13, color: COL.muted });
      pill(s, st.toUpperCase(), x + 0.2, y + 3.75, cw - 0.4, cols[i]);
    });
    T(s, d.bottom, { x: M, y: 6.1, w: W - 2 * M, h: 0.4, fontSize: 15, italic: true, color: COL.gold, fontFace: THEME.headFontFace });
    src(s, d.src);
  }

  // 6 · Prototypes ------------------------------------------------------------
  {
    const s = content(SEC[1], 's6');
    const d = D.s6;
    const w1 = 4.15, h1 = w1 * 652 / 846, w2 = 3.5, h2 = w2 * 575 / 960;
    img(s, IMG.proto('story', lang), M, 1.7, w1, h1);
    img(s, IMG.proto('wortbild', lang), M + w1 + 0.3, 1.7, w2, h2);
    const capY = [1.75 + h1, 1.75 + h2];
    [[M, w1, COL.mint], [M + w1 + 0.3, w2, COL.gold]].forEach(([x, w, c], i) => {
      H(s, d.caps[i][0], { x, y: capY[i] + 0.05, w, h: 0.35, fontSize: 15, color: c });
      T(s, d.caps[i][1], { x, y: capY[i] + 0.42, w, h: 0.6, fontSize: 12, color: COL.muted });
    });
    const x = 8.95, w = W - M - x;
    card(s, x, 1.7, w, 4.75);
    H(s, d.costHead, { x: x + 0.3, y: 1.9, w: w - 0.6, h: 0.45, fontSize: 18, color: COL.gold });
    d.cost.forEach(([lab, n, sub], i) => {
      const y = 2.55 + i * 1.35, c = i ? COL.mint : COL.pink;
      T(s, lab.toUpperCase(), { x: x + 0.3, y, w: w - 0.6, h: 0.25, fontSize: 10, bold: true, color: COL.muted, charSpacing: 2 });
      H(s, n, { x: x + 0.3, y: y + 0.28, w: w - 0.6, h: 0.55, fontSize: 26, color: c });
      T(s, sub, { x: x + 0.3, y: y + 0.85, w: w - 0.6, h: 0.3, fontSize: 11, color: COL.muted });
    });
    T(s, d.costNote, { x: x + 0.3, y: 5.3, w: w - 0.6, h: 0.9, fontSize: 14, italic: true, color: COL.white });
    src(s, d.src);
  }

  // 7 · Market --------------------------------------------------------------
  pres.addSection({ title: SEC[2] });
  {
    const s = content(SEC[2], 's7');
    const d = D.s7;
    const cx = 2.9, by = 6.35, ds = [4.6, 3.1, 1.6], fills = [HEX.card, '2A1622', HEX.wine];
    d.rings.forEach(([lab, n, sub], i) => {
      const dd = ds[i];
      s.addShape(pres.shapes.OVAL, { x: cx - dd / 2, y: by - dd, w: dd, h: dd, fill: { color: fills[i] }, line: { color: [HEX.line, HEX.gold, HEX.pink][i], width: 1.25 }, objectName: on('Ring') });
    });
    const ly = [by - 4.6 + 0.3, by - 3.1 + 0.25, by - 1.6 + 0.3];
    d.rings.forEach(([lab, n, sub], i) => {
      const c = [COL.muted, COL.gold, COL.pink][i], ww = [3.6, 2.4, 1.4][i];
      T(s, `${lab} · ${sub}`, { x: cx - ww / 2, y: ly[i], w: ww, h: i === 2 ? 0.35 : 0.25, fontSize: i === 2 ? 9 : 10, bold: true, color: c, align: 'center' });
      H(s, n, { x: cx - ww / 2, y: ly[i] + (i === 2 ? 0.35 : 0.27), w: ww, h: 0.45, fontSize: i === 2 ? 18 : 22, align: 'center' });
    });
    T(s, d.ringNote, { x: M, y: 6.4, w: 4.6, h: 0.22, fontSize: 9, italic: true, color: COL.muted, align: 'center' });
    const x1 = 5.75, x2 = 9.35, cw = 3.38;
    H(s, d.coreHead, { x: x1, y: 1.7, w: cw, h: 0.35, fontSize: 16, color: COL.pink });
    d.core.forEach(([n, l], i) => {
      const y = 2.2 + i * 1.3;
      H(s, n, { x: x1, y, w: cw, h: 0.5, fontSize: 24 });
      T(s, l, { x: x1, y: y + 0.52, w: cw, h: 0.55, fontSize: 12, color: COL.muted });
    });
    H(s, d.adjHead, { x: x2, y: 1.7, w: cw, h: 0.35, fontSize: 16, color: COL.mint });
    d.adj.forEach(([n, l], i) => {
      const y = 2.2 + i * 0.82;
      H(s, n, { x: x2, y, w: cw, h: 0.4, fontSize: 18 });
      T(s, l, { x: x2, y: y + 0.4, w: cw, h: 0.3, fontSize: 11, color: COL.muted });
    });
    src(s, d.src);
  }

  // 8 · Business model ------------------------------------------------------
  {
    const s = content(SEC[2], 's8');
    const d = D.s8;
    const gw = 8.4, gap = 0.22, cw = (gw - 2 * gap) / 3, ch = 2.2;
    d.tiers.forEach(([n, p, b], i) => {
      const x = M + (i % 3) * (cw + gap), y = 1.7 + Math.floor(i / 3) * (ch + gap), hi = i === 1;
      card(s, x, y, cw, ch, hi ? { fill: { color: COL.wine }, line: { color: HEX.pink, width: 1.5 } } : {});
      T(s, n.toUpperCase(), { x: x + 0.22, y: y + 0.2, w: cw - 0.44, h: 0.28, fontSize: 10, bold: true, color: hi ? COL.pink : COL.muted, charSpacing: 2 });
      H(s, p, { x: x + 0.22, y: y + 0.52, w: cw - 0.44, h: 0.55, fontSize: p.length > 14 ? 17 : 21, color: accents[i % 4], valign: 'middle' });
      T(s, b, { x: x + 0.22, y: y + 1.15, w: cw - 0.44, h: 0.95, fontSize: 12, color: COL.white });
    });
    const x = M + gw + 0.3, w = W - M - x;
    card(s, x, 1.7, w, 4.62);
    H(s, d.anchorHead, { x: x + 0.25, y: 1.88, w: w - 0.5, h: 0.4, fontSize: 16, color: COL.gold });
    T(s, d.anchors.map((t, i) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: i < d.anchors.length - 1 } })), { x: x + 0.25, y: 2.35, w: w - 0.5, h: 2.3, fontSize: 12, paraSpaceAfter: 6 });
    T(s, d.unit, { x: x + 0.25, y: 4.75, w: w - 0.5, h: 1.4, fontSize: 13, italic: true, color: COL.mint });
    src(s, d.src);
  }

  // 9 · Differentiation & risks ---------------------------------------------
  {
    const s = content(SEC[2], 's9');
    const d = D.s9;
    const mark = (cx, cy, c, us) => {
      const r = 0.12, fillC = c === 'f' ? (us ? HEX.pink : HEX.white) : (c === 'p' ? HEX.gold : HEX.bg);
      s.addShape(pres.shapes.OVAL, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: c === 'n' ? { type: 'none' } : { color: fillC, transparency: c === 'p' ? 35 : 0 }, line: { color: c === 'n' ? HEX.muted : fillC, width: 1.25 }, objectName: on('Mark') });
    };
    const c0 = 2.55, cwm = 0.95, rh = 0.56, ty = 1.7;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M + c0, y: ty, w: cwm, h: rh * (d.rows.length + 1), rectRadius: 0.08, fill: { color: COL.wine }, line: { color: HEX.pink, width: 1 }, objectName: 'Matrix-highlight' });
    d.cols.forEach((c, i) => { if (i) T(s, c, { x: M + c0 + (i - 1) * cwm, y: ty, w: cwm, h: rh, fontSize: 11, bold: true, color: i === 1 ? COL.pink : COL.muted, align: 'center', valign: 'middle' }); });
    d.rows.forEach(([lab, v], r) => {
      const y = ty + (r + 1) * rh;
      s.addShape(pres.shapes.LINE, { x: M, y, w: c0 + 5 * cwm, h: 0, line: { color: HEX.line, width: 0.75 }, objectName: on('Rule') });
      T(s, lab, { x: M, y, w: c0 - 0.1, h: rh, fontSize: 13, valign: 'middle' });
      [...v].forEach((c, i) => mark(M + c0 + i * cwm + cwm / 2, y + rh / 2, c, i === 0));
    });
    d.legend.forEach((t, i) => { const lx = M + i * 1.9; mark(lx + 0.12, 5.9, 'fpn'[i], false); T(s, t, { x: lx + 0.35, y: 5.75, w: 1.5, h: 0.3, fontSize: 11, color: COL.muted, valign: 'middle' }); });
    const x = 8.3, w = W - M - x;
    H(s, d.riskHead, { x, y: 1.7, w, h: 0.4, fontSize: 16, color: COL.gold });
    d.risks.forEach(([h, b], i) => {
      const y = 2.2 + i * 0.85;
      dot(s, x, y + 0.05, 0.32, COL.gold, '!');
      T(s, h, { x: x + 0.45, y, w: w - 0.45, h: 0.3, fontSize: 13, bold: true });
      T(s, b, { x: x + 0.45, y: y + 0.32, w: w - 0.45, h: 0.45, fontSize: 11, color: COL.muted });
    });
    src(s, d.src);
  }

  // 10 · Roadmap & GTM ------------------------------------------------------
  pres.addSection({ title: SEC[3] });
  {
    const s = content(SEC[3], 's10');
    const d = D.s10, n = d.steps.length, step = (W - 2 * M) / n, ly = 2.35;
    s.addShape(pres.shapes.LINE, { x: M + step / 2, y: ly, w: step * (n - 1), h: 0, line: { color: HEX.line, width: 2 }, objectName: 'Timeline' });
    d.steps.forEach(([q, h, b], i) => {
      const cx = M + step * (i + 0.5), c = accents[i % 4];
      T(s, q, { x: cx - step / 2, y: 1.7, w: step, h: 0.3, fontSize: 12, bold: true, color: COL.muted, align: 'center' });
      dot(s, cx - 0.16, ly - 0.16, 0.32, c);
      H(s, h, { x: cx - step / 2 + 0.05, y: ly + 0.35, w: step - 0.1, h: 0.7, fontSize: 15, align: 'center' });
      T(s, b, { x: cx - step / 2 + 0.08, y: ly + 1.05, w: step - 0.16, h: 0.9, fontSize: 11, color: COL.muted, align: 'center' });
    });
    const gap = 0.22, cw = (W - 2 * M - 3 * gap) / 4;
    d.gtm.forEach(([h, b], i) => {
      const x = M + i * (cw + gap), y = 4.7;
      card(s, x, y, cw, 1.55);
      H(s, h, { x: x + 0.22, y: y + 0.2, w: cw - 0.44, h: 0.4, fontSize: 15, color: accents[i] });
      T(s, b, { x: x + 0.22, y: y + 0.68, w: cw - 0.44, h: 0.75, fontSize: 12, color: COL.muted });
    });
    src(s, d.src);
  }

  // 12 · Use of funds -------------------------------------------------------
  {
    const s = content(SEC[3], 's12');
    const d = D.s12;
    const cc = [HEX.pink, HEX.mint, HEX.gold, HEX.blue, '5A6070'];
    s.addChart(pres.charts.DOUGHNUT, [{ name: d.total, labels: d.split.map((r) => r[1]), values: d.split.map((r) => r[0]) }], {
      x: M, y: 1.6, w: 4.9, h: 4.9, holeSize: 60, chartColors: cc, dataBorder: { pt: 2, color: HEX.bg },
      showLegend: false, showTitle: false, showValue: false, showPercent: false, showLabel: false, objectName: 'Use-of-funds-donut',
    });
    H(s, d.total, { x: M + 1.2, y: 3.6, w: 2.5, h: 0.6, fontSize: 32, align: 'center' });
    T(s, d.totalSub, { x: M + 1.2, y: 4.2, w: 2.5, h: 0.3, fontSize: 10, bold: true, color: COL.muted, align: 'center', charSpacing: 3 });
    const x = 6.0, w = W - M - x;
    pill(s, D.proposal.toUpperCase(), x, 1.65, 5.0, COL.pink, { fill: { color: COL.wine } });
    d.split.forEach(([p, n, amt, sub], i) => {
      const y = 2.15 + i * 0.84;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + 0.17, w: 0.22, h: 0.22, rectRadius: 0.05, fill: { color: cc[i] }, line: { type: 'none' }, objectName: on('Key') });
      H(s, pct(p), { x: x + 0.4, y, w: 1.05, h: 0.55, fontSize: 24, color: { 0: COL.pink, 1: COL.mint, 2: COL.gold, 3: COL.blue, 4: COL.muted }[i], valign: 'middle' });
      T(s, n, { x: x + 1.5, y: y + 0.02, w: 3.4, h: 0.3, fontSize: 14, bold: true });
      T(s, sub, { x: x + 1.5, y: y + 0.33, w: 3.4, h: 0.3, fontSize: 11, color: COL.muted });
      H(s, amt, { x: x + w - 1.9, y, w: 1.9, h: 0.55, fontSize: 18, align: 'right', valign: 'middle' });
      if (i < d.split.length - 1) s.addShape(pres.shapes.LINE, { x, y: y + 0.74, w, h: 0, line: { color: HEX.line, width: 0.75 }, objectName: on('Rule') });
    });
    T(s, d.note, { x, y: 6.4, w, h: 0.45, fontSize: 10, italic: true, color: COL.muted });
  }

  // 11 · Financials: 5-year base P&L + runway/cash ---------------------------
  {
    const s = content(SEC[3], 's11');
    const d = D.s11;
    s.addChart(pres.charts.BAR, d.series.map(([name, v]) => ({ name, labels: d.years, values: v })), {
      x: M, y: 1.6, w: 7.0, h: 4.0, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 45,
      chartColors: [HEX.mint, '5A6070', HEX.pink],
      catAxisLabelColor: HEX.white, catAxisLabelFontSize: 11, catAxisLabelFontFace: '+mn-lt', catAxisLineShow: false, catAxisLabelPos: 'low',
      valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
      showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: HEX.white, dataLabelFontSize: 8, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '#,##0',
      showLegend: true, legendPos: 'b', legendColor: HEX.muted, legendFontSize: 11, legendFontFace: '+mn-lt',
      showTitle: true, title: d.chartTitle, titleColor: HEX.muted, titleFontSize: 12, titleFontFace: '+mn-lt', objectName: 'PnL-chart',
    });
    d.results.forEach(([l, v], i) => {
      const y = 5.72 + i * 0.29;
      T(s, l, { x: M, y, w: 2.0, h: 0.27, fontSize: 11, bold: true, color: COL.muted });
      T(s, v, { x: M + 2.05, y, w: 5.0, h: 0.27, fontSize: 11, color: i === 0 ? COL.mint : COL.white });
    });
    const x = 7.9, w = W - M - x;
    card(s, x, 1.6, w, 4.95);
    H(s, d.runHead, { x: x + 0.25, y: 1.75, w: w - 0.5, h: 0.35, fontSize: 15, color: COL.gold });
    const lw = 1.45, cw = (w - 0.5 - lw) / d.cashCols.length, ty = 2.2, rh = 0.36;
    d.cashCols.forEach((c, j) => T(s, c, { x: x + 0.25 + lw + j * cw, y: ty, w: cw, h: rh, fontSize: 10, bold: true, color: COL.muted, align: 'right', valign: 'middle' }));
    d.cashRows.forEach(([lab, vals], r) => {
      const y = ty + (r + 1) * rh, base = r === 2;
      s.addShape(pres.shapes.LINE, { x: x + 0.25, y, w: w - 0.5, h: 0, line: { color: HEX.line, width: 0.75 }, objectName: on('Rule') });
      T(s, lab, { x: x + 0.25, y, w: lw, h: rh, fontSize: 11, bold: base, color: base ? COL.mint : COL.white, valign: 'middle' });
      vals.forEach((v, j) => T(s, v, { x: x + 0.25 + lw + j * cw, y, w: cw, h: rh, fontSize: 11, bold: base, color: String(v).startsWith('−') ? COL.pink : (base ? COL.mint : COL.white), align: 'right', valign: 'middle' }));
    });
    T(s, d.cashNote, { x: x + 0.25, y: ty + 5 * rh + 0.05, w: w - 0.5, h: 0.25, fontSize: 9, italic: true, color: COL.muted });
    d.run.forEach(([n, l], i) => {
      const y = 4.45 + i * 1.0;
      H(s, n, { x: x + 0.25, y, w: w - 0.5, h: 0.45, fontSize: 24, color: [COL.pink, COL.gold][i] });
      T(s, l, { x: x + 0.25, y: y + 0.46, w: w - 0.5, h: 0.45, fontSize: 11, color: COL.muted });
    });
    src(s, d.src);
  }

  // 15 · Valuation: founder offer + reference methods ------------------------
  {
    const s = content(SEC[3], 's15');
    const d = D.s15;
    pill(s, d.proposal.toUpperCase(), W - M - 5.6, 0.38, 5.6, COL.pink, { fill: { color: COL.wine }, fontSize: 8.5, charSpacing: 0.5 });
    const bx = M + 2.15, bw = 3.45, max = d.scaleMax, cols = [HEX.mint, HEX.gold, HEX.blue, HEX.pink];
    T(s, d.refHead, { x: M, y: 1.6, w: 7.2, h: 0.3, fontSize: 11, bold: true, color: COL.muted, charSpacing: 2 });
    d.methods.forEach(([name, v, lab, how], i) => {
      const y = 1.98 + i * 0.78;
      T(s, name, { x: M, y, w: 2.1, h: 0.36, fontSize: 13, bold: true, valign: 'middle' });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: y + 0.04, w: bw, h: 0.28, rectRadius: 0.05, fill: { color: COL.card }, line: { type: 'none' }, objectName: on('Track') });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: y + 0.04, w: bw * v / max, h: 0.28, rectRadius: 0.05, fill: { color: cols[i] }, line: { type: 'none' }, objectName: on('Bar') });
      H(s, lab, { x: bx + bw + 0.1, y, w: 1.55, h: 0.36, fontSize: lab.length > 8 ? 13 : 15, color: [COL.mint, COL.gold, COL.blue, COL.pink][i], valign: 'middle' });
      T(s, how, { x: M, y: y + 0.37, w: 7.2, h: 0.3, fontSize: 9, color: COL.muted });
    });
    const ax = bx + bw * d.markerV / max;
    s.addShape(pres.shapes.LINE, { x: ax, y: 1.9, w: 0, h: 3.1, line: { color: HEX.white, width: 1.5, dashType: 'dash' }, objectName: 'Offer-line' });
    T(s, d.markerLabel, { x: ax - 1.6, y: 4.98, w: 3.2, h: 0.25, fontSize: 10, bold: true, color: COL.white, align: 'center' });
    H(s, d.whyHead, { x: M, y: 5.3, w: 7.2, h: 0.3, fontSize: 12, color: COL.gold });
    const half = Math.ceil(d.why.length / 2);
    [d.why.slice(0, half), d.why.slice(half)].forEach((list, c) => T(s, list.map((t, k) => ({ text: t, options: { bullet: { indent: 10 }, breakLine: k < list.length - 1 } })), { x: M + c * 3.65, y: 5.62, w: 3.55, h: 0.95, fontSize: 10, paraSpaceAfter: 2 }));
    const x = 8.15, w = W - M - x;
    card(s, x, 1.6, w, 3.0, { fill: { color: COL.wine }, line: { color: HEX.pink, width: 1.25 } });
    H(s, d.offerHead, { x: x + 0.25, y: 1.75, w: w - 0.5, h: 0.3, fontSize: 12, color: COL.pink, charSpacing: 1 });
    d.offer.forEach(([n, l], i) => {
      const y = 2.12 + i * 0.78;
      H(s, n, { x: x + 0.25, y, w: 2.55, h: 0.55, fontSize: n.length > 7 ? 22 : 30, color: [COL.white, COL.white, COL.mint][i], valign: 'middle' });
      T(s, l, { x: x + 2.85, y, w: w - 3.1, h: 0.55, fontSize: 12, color: COL.muted, valign: 'middle' });
    });
    card(s, x, 4.75, w, 1.8);
    H(s, d.safeHead, { x: x + 0.25, y: 4.88, w: w - 0.5, h: 0.32, fontSize: 13, color: COL.gold });
    T(s, d.safe.map((t, k) => ({ text: t, options: { bullet: { indent: 10 }, breakLine: k < d.safe.length - 1 } })), { x: x + 0.25, y: 5.24, w: w - 0.5, h: 1.2, fontSize: 11, paraSpaceAfter: 3 });
    src(s, d.src);
  }

  // 13 · Gates --------------------------------------------------------------
  {
    const s = content(SEC[3], 's13');
    const d = D.s13, n = d.gates.length, gap = 0.2, cw = (W - 2 * M - gap * (n - 1)) / n, base = 6.2;
    d.gates.forEach(([no, when, h, items], i) => {
      const ch = 3.25 + i * 0.32, x = M + i * (cw + gap), y = base - ch, last = i === n - 1;
      card(s, x, y, cw, ch, last ? { fill: { color: COL.wine }, line: { color: HEX.pink, width: 1.25 } } : {});
      H(s, no, { x: x + 0.2, y: y + 0.18, w: 1, h: 0.45, fontSize: 24, color: accents[i % 4] });
      T(s, when.toUpperCase(), { x: x + 0.2, y: y + 0.66, w: cw - 0.4, h: 0.25, fontSize: 10, bold: true, color: COL.muted, charSpacing: 2 });
      H(s, h, { x: x + 0.2, y: y + 0.95, w: cw - 0.4, h: 0.45, fontSize: 19 });
      T(s, items.map((t, k) => ({ text: t, options: { breakLine: k < items.length - 1 } })), { x: x + 0.2, y: y + 1.45, w: cw - 0.4, h: ch - 1.55, fontSize: 12, color: COL.white, paraSpaceAfter: 5 });
    });
    pill(s, (d.proposal || D.proposal).toUpperCase(), W - M - 4.8, 0.38, 4.8, COL.pink, { fill: { color: COL.wine }, fontSize: 8.5, charSpacing: 0.5 });
    T(s, d.note, { x: M, y: 6.3, w: W - 2 * M, h: 0.45, fontSize: 10, italic: true, color: COL.muted });
  }

  // 14 · Team & round -------------------------------------------------------
  pres.addSection({ title: SEC[4] });
  {
    const s = content(SEC[4], 's14');
    const d = D.s14;
    const cw = 4.05;
    d.team.forEach(([ini, name, role, bio], i) => {
      const x = M + i * (cw + 0.25), h = 3.25;
      card(s, x, 1.7, cw, h);
      dot(s, x + 0.25, 1.95, 0.85, i ? COL.mint : COL.pink, ini);
      H(s, name, { x: x + 1.3, y: 1.95, w: cw - 1.5, h: 0.4, fontSize: 19 });
      T(s, role, { x: x + 1.3, y: 2.38, w: cw - 1.5, h: 0.5, fontSize: 9, bold: true, color: i ? COL.mint : COL.pink, charSpacing: 1 });
      T(s, bio, { x: x + 0.25, y: 3.0, w: cw - 0.5, h: 1.85, fontSize: 13, color: COL.muted });
    });
    const x = M + 2 * (cw + 0.25), w = W - M - x;
    card(s, x, 1.7, w, 3.25);
    H(s, d.hireHead, { x: x + 0.25, y: 1.9, w: w - 0.5, h: 0.6, fontSize: 16, color: COL.gold });
    d.hires.forEach(([r, t], i) => {
      const y = 2.6 + i * 0.57;
      T(s, r, { x: x + 0.25, y, w: w - 0.5, h: 0.28, fontSize: 13, bold: true });
      T(s, t, { x: x + 0.25, y: y + 0.27, w: w - 0.5, h: 0.25, fontSize: 11, color: COL.muted });
    });
    wave(s, M, 5.25, 3.0, 0.6, 22);
    card(s, 3.85, 5.15, W - M - 3.85, 0.85, { fill: { color: COL.wine }, line: { color: HEX.pink, width: 1 } });
    H(s, d.askLine, { x: 4.1, y: 5.18, w: 5.0, h: 0.8, fontSize: 18, valign: 'middle' });
    T(s, d.contact, { x: 9.0, y: 5.18, w: W - M - 9.2, h: 0.8, fontSize: 13, align: 'right', valign: 'middle', color: COL.white });
    T(s, d.disclaimer, { x: M, y: 6.25, w: W - 2 * M, h: 0.45, fontSize: 10, italic: true, color: COL.muted });
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
