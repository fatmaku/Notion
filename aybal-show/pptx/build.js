// Builds the animated Aybal investor deck as a native PowerPoint file.
// Shapes that should animate get an objectName "anim:<effect>:<delayMs>[:<durMs>]";
// animate.py turns those names into PowerPoint entrance animations + slide transitions.
const pptxgen = require('pptxgenjs');
const assets = require('./assets');

const C = { cream: 'F4EDE2', cream2: 'EDE3D3', card: 'FBF7F0', wine: '6E1630', plum: '2E0B18', gold: 'B08A4A', gold2: 'D4B27A', ink: '2A0F16', muted: '7A6A62', line: 'DCCFBF', body: '4A3A36', rose: 'C35A76', pink: 'E0859E', plumMid: '3E1022', light: 'E9DFD3', dim: 'B7A79E' };
const HEAD = 'Georgia', BODY = 'Calibri';
const W = 13.333, M = 0.78, CW = W - 2 * M;
const N = 17;
const G = p => `${__dirname}/gen/${p}`;

// roadmap curve points (inches, absolute on slide)
const ROAD = [0, 1, 2, 3, 4].map(i => [M + 0.12 + i * 2.62, 3.55 - i * 0.26 - (i > 2 ? (i - 2) * 0.08 : 0)]);
const ROAD_BOX = { x: M, y: 2.1, w: CW, h: 1.5 };

(async () => {
  await assets.run([[4, (3.62 - ROAD_BOX.y) * 100], ...ROAD.map(([x, y]) => [(x - M) * 100, (y - ROAD_BOX.y) * 100]), [1173, 12]]);
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Aybal — Pre-Seed Investor Deck';
  pres.author = 'Tuncay Sancak (Founder & Inventor) · Gönül Demet (Investor Relations)';
  pres.company = 'Aybal';

  let S, n = 0;
  const nm = a => (a ? { objectName: 'anim:' + a } : {});
  const T = (text, o, a) => S.addText(text, { isTextBox: true, margin: 0, fontFace: BODY, color: C.ink, fontSize: 14, valign: 'top', ...o, ...nm(a) });
  const R = (shape, o, a) => S.addShape(shape, { ...o, ...nm(a) });
  const I = (path, o, a) => S.addImage({ path, ...o, ...nm(a) });
  const shadow = () => ({ type: 'outer', color: '2E0B18', blur: 18, offset: 6, angle: 90, opacity: 0.12 });

  function slide(dark, kicker, title, notes) {
    S = pres.addSlide(); n++;
    S.background = { color: dark ? C.plum : C.cream };
    if (kicker) T(kicker.toUpperCase(), { x: M, y: 0.55, w: 9, h: 0.25, fontSize: 10, bold: true, charSpacing: 4, color: dark ? C.gold2 : C.wine }, 'fade:0');
    if (title) T(title, { x: M, y: 0.85, w: CW, h: 0.75, fontFace: HEAD, fontSize: 30, bold: true, color: dark ? C.cream : C.ink, fit: 'shrink' }, 'float:100');
    T('CONFIDENTIAL  •  PRE-SEED  •  SEPTEMBER 2026', { x: M, y: 7.02, w: 6, h: 0.2, fontSize: 8, charSpacing: 2, color: dark ? C.dim : C.muted });
    T(`${String(n).padStart(2, '0')} / ${N}`, { x: W - M - 2, y: 7.02, w: 2, h: 0.2, fontSize: 8, charSpacing: 2, align: 'right', color: dark ? C.dim : C.muted });
    if (notes) S.addNotes(notes);
  }
  const card = (x, y, w, h, fill = C.card, line = C.line) => ({ x, y, w, h, fill: { color: fill }, line: { color: line, width: 0.75 }, rectRadius: 0.14 });

  // 1 ─ COVER
  slide(true, null, null, 'Open on the mission. Introduce yourself as founder and inventor of Aybal, and Gönül Demet as investor relations.');
  S.background = { color: C.plum };
  I(G('hero-cover.jpg'), { x: 6.3, y: 0, w: W - 6.3, h: 7.5 }, 'fade:0:1500');
  T('PRE-SEED INVESTMENT OPPORTUNITY', { x: M, y: 0.7, w: 6, h: 0.25, fontSize: 10, bold: true, charSpacing: 4, color: C.gold2 }, 'fade:300');
  T([
    { text: 'Aybal:', options: { breakLine: true } },
    { text: 'The ' }, { text: 'Voice', options: { italic: true, color: C.gold2 } }, { text: ' of', options: { breakLine: true } },
    { text: 'Family Reading' },
  ], { x: M, y: 1.35, w: 6.4, h: 3.1, fontFace: HEAD, fontSize: 50, bold: true, color: C.cream, lineSpacingMultiple: 0.95 }, 'float:500:1200');
  I(G('wave-gold.png'), { x: M, y: 4.7, w: 4.6, h: 0.56 }, 'wipeL:1400:1400');
  [['FOUNDER & INVENTOR', 'Tuncay Sancak'], ['INVESTOR RELATIONS', 'Gönül Demet'], ['DECK', 'Pre-Seed · Sept 2026']].forEach(([l, v], i) => {
    T([{ text: l, options: { fontSize: 8, bold: true, charSpacing: 2, color: C.gold2, breakLine: true } },
       { text: v, options: { fontFace: HEAD, fontSize: i == 2 ? 12 : 16, bold: i < 2, color: i == 2 ? C.light : C.cream } }],
      { x: M + i * 2.35, y: 5.5, w: 2.25, h: 0.75, paraSpaceAfter: 4 }, `float:${2000 + i * 200}`);
  });

  // 2 ─ THESIS
  slide(false, 'Aybal / Investment thesis', 'A focused bet on family voice technology', 'Five reasons in one line each. Stress: built and tested before financing.');
  [['01', 'Built & tested', 'Working platform; 1,779 automated tests passed.'],
   ['02', 'Multilingual edge', '3 interfaces, 13 voice languages; strong measured intelligibility.'],
   ['03', 'Large family market', '101M families across priority Western markets and Türkiye.'],
   ['04', 'Credible economics', 'Subscription model; venture case reaches break-even in Oct 2031.'],
   ['05', 'Focused validation', '€250k to prove conversion, retention and acquisition efficiency.']].forEach(([no, h, b], i) => {
    const x = M + i * 2.39;
    T([{ text: no, options: { fontFace: HEAD, fontSize: 30, bold: true, color: C.gold, breakLine: true } },
       { text: ' ', options: { fontSize: 10, breakLine: true } },
       { text: h, options: { fontFace: HEAD, fontSize: 16, bold: true, color: C.wine, breakLine: true } },
       { text: ' ', options: { fontSize: 6, breakLine: true } },
       { text: b, options: { fontSize: 13, color: C.body } }],
      { shape: pres.shapes.ROUNDED_RECTANGLE, ...card(x, 2.05, 2.2, 3.1), margin: [14, 12, 12, 16], shadow: shadow() }, `float:${300 + i * 200}`);
  });
  T('Investment thesis: prove family engagement before scaling spend.', { x: M, y: 5.6, w: CW, h: 0.5, fontFace: HEAD, fontSize: 21, italic: true, color: C.wine }, 'fade:1500');

  // 3 ─ MARKET GAP
  slide(true, 'Aybal / The market gap', 'Reading is available. Relevance is not.', 'The market is huge and underserved: audio that is personal, multilingual and works with the family’s own books.');
  T('101M', { x: M, y: 1.8, w: 5.6, h: 1.7, fontFace: HEAD, fontSize: 120, bold: true, color: C.gold2, valign: 'middle' }, 'zoom:300:900');
  T('families with children across Germany, Türkiye, the UK, the rest of the EU and the US', { x: M, y: 3.55, w: 5.2, h: 0.65, fontSize: 15, color: C.light }, 'fade:800');
  I(G('dots.png'), { x: M, y: 4.4, w: 5.1, h: 1.8 }, 'wipeL:1200:2000');
  T('EACH DOT ≈ 1 MILLION FAMILIES', { x: M, y: 6.3, w: 5, h: 0.2, fontSize: 9, charSpacing: 2, color: C.dim }, 'fade:2600');
  T([{ text: 'Families need audio that feels ' }, { text: 'personal', options: { italic: true, color: C.gold2 } }, { text: ', speaks ' },
     { text: 'their language', options: { italic: true, color: C.gold2 } }, { text: ' and works with ' }, { text: 'books they already own', options: { italic: true, color: C.gold2 } }, { text: '.' }],
    { x: 7.0, y: 2.0, w: 5.55, h: 2.4, fontFace: HEAD, fontSize: 25, bold: true, color: C.cream, lineSpacingMultiple: 1.05 }, 'float:1800');
  T('Today’s offer is fragmented: fixed catalogues, limited personalization, weak family controls and little word-level interactivity.', { x: 7.0, y: 4.75, w: 5.4, h: 1.0, fontSize: 15, color: C.light }, 'float:2400');

  // 4 ─ PRODUCT
  slide(false, 'Aybal / Validated build', 'From a family’s book to a shared listening moment', 'Show the product: any book becomes read-aloud audio with word-by-word highlighting.');
  T('1,779', { x: M, y: 1.8, w: 5, h: 1.15, fontFace: HEAD, fontSize: 84, bold: true, color: C.wine, valign: 'middle' }, 'zoom:300:800');
  T('automated tests passed', { x: M, y: 2.98, w: 5, h: 0.3, fontSize: 15, bold: true }, 'fade:700');
  T('Upload PDFs, EPUBs, Word files, text or photos of pages. Aybal converts them into read-aloud audio with word-by-word highlighting.', { x: M, y: 3.5, w: 5.1, h: 1.0, fontSize: 15, color: C.body }, 'float:900');
  [['3 interface languages', 1.95], ['13 voice languages', 1.75], ['≥94% measured intelligibility', 2.55]].reduce((x, [t, w], i) => {
    T(t, { shape: pres.shapes.ROUNDED_RECTANGLE, x: i < 2 ? x : M, y: i < 2 ? 4.7 : 5.15, w, h: 0.34, fill: { color: C.card }, line: { color: C.line, width: 0.75 }, rectRadius: 0.17, align: 'center', valign: 'middle', fontSize: 11.5, color: C.wine }, `float:${1100 + i * 150}`);
    return x + w + 0.12;
  }, M);
  T([{ text: 'Closed beta  ', options: { bold: true, color: C.ink } }, { text: '12 Oct 2026   →   ', options: { color: C.muted } }, { text: 'Germany launch  ', options: { bold: true, color: C.ink } }, { text: '20 Nov 2026', options: { color: C.muted } }],
    { x: M, y: 5.85, w: 5.4, h: 0.3, fontSize: 13 }, 'fade:1700');
  I(`${__dirname}/../assets/product.jpg`, { x: 6.55, y: 1.85, w: 6.0, h: 4.76, shadow: { type: 'outer', color: '2E0B18', blur: 30, offset: 10, angle: 90, opacity: 0.3 } }, 'zoom:400:900');
  T([{ text: 'Once upon a time, a little fox ' }, { text: 'found', options: { highlight: C.gold2, color: C.plum } }, { text: ' a book that could read itself aloud — in her grandmother’s voice.', options: { color: C.muted } },
     { text: '', options: { breakLine: true } }, { text: '▶  READING ALOUD  ·  WORD-BY-WORD', options: { fontFace: BODY, fontSize: 8, charSpacing: 2, color: C.muted } }],
    { shape: pres.shapes.ROUNDED_RECTANGLE, x: 6.85, y: 5.15, w: 5.4, h: 1.2, fill: { color: C.card }, line: { color: C.line, width: 0.5 }, rectRadius: 0.12, margin: [16, 16, 8, 10], fontFace: HEAD, fontSize: 12.5, color: C.ink, paraSpaceAfter: 6, shadow: shadow() }, 'float:1600');

  // 5 ─ MARKET SIZE
  slide(false, 'Aybal / Annual market opportunity', 'A €7.6B category with a disciplined entry wedge', 'TAM, SAM, SOM. The SOM is directional, not a forecast.');
  const cx = 3.3, bottom = 6.8, D = 4.9;
  R(pres.shapes.OVAL, { x: cx - D / 2, y: bottom - D, w: D, h: D, fill: { color: 'EFE3CE' }, line: { color: C.line, width: 0.75 } }, 'zoom:300:900');
  T('TAM', { x: cx - 1, y: bottom - D + 0.35, w: 2, h: 0.3, align: 'center', fontFace: HEAD, fontSize: 15, bold: true, charSpacing: 3, color: C.gold }, 'fade:800');
  const d2 = D * 0.387;
  R(pres.shapes.OVAL, { x: cx - d2 / 2, y: bottom - d2, w: d2, h: d2, fill: { color: C.gold } }, 'zoom:1300:800');
  T('SAM', { x: cx - 1, y: bottom - d2 + 0.3, w: 2, h: 0.3, align: 'center', fontFace: HEAD, fontSize: 15, bold: true, charSpacing: 3, color: 'FFFFFF' }, 'fade:1800');
  R(pres.shapes.OVAL, { x: cx - 0.17, y: bottom - 0.36, w: 0.34, h: 0.34, fill: { color: C.wine } }, 'zoom:2200:600');
  [['TAM', '€7.6B', 'Gross family reading spend in target markets'], ['SAM', '€1.14B', '15% assumed willingness to pay'], ['SOM', '€38M', '4% penetration of willing segment; directional, not forecast']].forEach(([l, v, d], i) => {
    const y = 2.3 + i * 1.35, dl = 500 + i * 850;
    T(l, { x: 6.6, y: y + 0.28, w: 0.8, h: 0.3, fontSize: 11, bold: true, charSpacing: 3, color: C.gold }, `float:${dl}`);
    T(v, { x: 7.4, y, w: 2.3, h: 0.85, fontFace: HEAD, fontSize: 40, bold: true, color: C.wine, valign: 'middle' }, `float:${dl}`);
    T(d, { x: 9.8, y: y + 0.12, w: 2.75, h: 0.7, fontSize: 13, color: C.body, valign: 'middle' }, `float:${dl}`);
    R(pres.shapes.LINE, { x: 6.6, y: y + 1.05, w: 5.95, h: 0, line: { color: C.line, width: 0.75 } }, `wipeL:${dl + 200}`);
  });

  // 6 ─ PRICING
  slide(false, 'Aybal / Business model', 'Simple subscriptions, attractive web margins', 'Four plans; web margins around 75–77%. The family annual plan is the best-value commitment.');
  [['PLUS / MONTH', '€9.99', 'per month', '€6.41 margin', 76], ['PLUS / YEAR', '€79.99', 'per year', '€4.21 monthly margin', 75], ['FAMILY / MONTH', '€24.99', 'per month', '€16.22 margin', 77], ['FAMILY / YEAR', '€199.99', 'per year', null, 0]].forEach(([tag, p, per, mg, pct], i) => {
    const x = M + i * 2.99, feat = i == 3, y = feat ? 1.95 : 2.1, h = 3.55, dl = 300 + i * 220;
    R(pres.shapes.ROUNDED_RECTANGLE, { ...card(x, y, 2.8, h, feat ? C.plum : C.card, feat ? C.plum : C.line), shadow: shadow() }, `float:${dl}`);
    T([{ text: tag, options: { fontSize: 10, bold: true, charSpacing: 3, color: C.gold, breakLine: true } }, { text: ' ', options: { fontSize: 14, breakLine: true } },
       { text: p, options: { fontFace: HEAD, fontSize: 32, bold: true, color: feat ? C.gold2 : C.wine, breakLine: true } },
       { text: per, options: { fontSize: 12, color: feat ? C.dim : C.muted } }], { x: x + 0.3, y: y + 0.35, w: 2.3, h: 1.8 }, `float:${dl}`);
    if (mg) {
      T(mg, { x: x + 0.3, y: y + h - 0.95, w: 1.75, h: 0.25, fontSize: 10.5 }, `fade:${dl + 300}`);
      T(pct + '%', { x: x + 1.9, y: y + h - 0.95, w: 0.6, h: 0.25, fontSize: 12, bold: true, align: 'right' }, `fade:${dl + 300}`);
      R(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: y + h - 0.6, w: 2.2, h: 0.1, fill: { color: C.cream2 }, rectRadius: 0.05 }, `fade:${dl + 300}`);
      R(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: y + h - 0.6, w: 2.2 * pct / 100, h: 0.1, fill: { color: C.wine }, rectRadius: 0.05 }, `wipeL:${dl + 700}:1200`);
    } else {
      T('Best-value family commitment', { x: x + 0.3, y: y + h - 1.05, w: 2.3, h: 0.7, fontFace: HEAD, fontSize: 18, italic: true, color: C.gold2 }, `fade:${dl + 300}`);
      T('BEST VALUE', { shape: pres.shapes.ROUNDED_RECTANGLE, x: x + 1.45, y: y - 0.16, w: 1.15, h: 0.32, fill: { color: C.gold }, rectRadius: 0.16, align: 'center', valign: 'middle', fontSize: 9, bold: true, charSpacing: 2, color: 'FFFFFF' }, `zoom:${dl + 600}:500`);
    }
  });
  T('Revenue begins with Germany launch in Nov 2026. Local pricing will adapt to Türkiye and UK purchasing power; margins shown are Germany/EU web purchases.', { x: M, y: 6.0, w: CW, h: 0.45, fontSize: 12, color: C.muted }, 'fade:1600');

  // 7 ─ COMPARISON
  slide(false, 'Aybal / Differentiation', 'Personalized by design—not bolted on', 'Aybal is the only option strong on all five capabilities.');
  const cols = [6.2, 8.25, 10.3, 12.05], rows = [['Natural multilingual voices', 'fffn'], ['Consented personal voices', 'fnpn'], ['User-owned content', 'fnfp'], ['Word-level highlighting', 'fnpf'], ['Family accounts & controls', 'fpnf']];
  R(pres.shapes.ROUNDED_RECTANGLE, { x: cols[0] - 0.75, y: 1.9, w: 1.5, h: 3.6, fill: { color: C.wine, transparency: 93 }, rectRadius: 0.12 }, 'fade:200');
  ['CAPABILITY', 'AYBAL', 'AUDIOBOOKS', 'GENERIC TTS', 'FAMILY APPS'].forEach((h, i) => T(h, { x: i ? cols[i - 1] - 0.9 : M, y: 2.05, w: i ? 1.8 : 3, h: 0.25, align: i ? 'center' : 'left', fontSize: 10, bold: true, charSpacing: 3, color: i == 1 ? C.wine : C.muted }, 'fade:300'));
  rows.forEach(([cap, v], r) => {
    const y = 2.5 + r * 0.6;
    R(pres.shapes.LINE, { x: M, y, w: CW, h: 0, line: { color: C.line, width: 0.75 } }, `wipeL:${300 + r * 80}`);
    T(cap, { x: M, y: y + 0.12, w: 4.5, h: 0.38, fontFace: HEAD, fontSize: 18, bold: true, valign: 'middle' }, `float:${400 + r * 100}`);
    [...v].forEach((c, k) => {
      const s = 0.24, x = cols[k] - s / 2, yy = y + 0.19, dl = 900 + k * 450 + r * 70;
      if (c == 'f') R(pres.shapes.OVAL, { x, y: yy, w: s, h: s, fill: { color: C.wine } }, `zoom:${dl}:400`);
      if (c == 'n') R(pres.shapes.OVAL, { x, y: yy, w: s, h: s, fill: { color: C.cream }, line: { color: 'C7B8A6', width: 1.5 } }, `zoom:${dl}:400`);
      if (c == 'p') R(pres.shapes.ISOSCELES_TRIANGLE, { x, y: yy, w: s, h: s, fill: { color: C.gold } }, `zoom:${dl}:400`);
    });
  });
  T([{ text: '●', options: { color: C.wine } }, { text: '  Strong      ' }, { text: '▲', options: { color: C.gold } }, { text: '  Partial      ' }, { text: '○', options: { color: 'B0A090' } }, { text: '  Weak / absent' }],
    { x: M, y: 5.72, w: 5, h: 0.3, fontSize: 12, color: C.muted }, 'fade:3000');
  T('Measured voice intelligibility: German 98%  •  Turkish 97%', { x: 6.3, y: 5.72, w: 6.25, h: 0.3, fontSize: 13, bold: true, color: C.wine, align: 'right' }, 'fade:3200');
  T('Beta metrics will test whether technical differentiation translates into retention.', { x: M, y: 6.15, w: CW, h: 0.3, fontSize: 12, color: C.muted }, 'fade:3400');

  // 8 ─ ROADMAP
  slide(false, 'Aybal / Roadmap', 'Validate. Launch. Expand. Compound.', 'From closed beta in October to profitability: each step unlocks the next.');
  I(G('curve.png'), ROAD_BOX, 'wipeL:300:2600');
  [['OCT 2026', 'Closed beta', '50 founding families'], ['NOV 2026', 'Germany launch', 'Revenue starts'], ['2027 – 28', 'Prove retention', 'Gates 1–2; market expansion'], ['2029 – 30', 'Scale to 5 markets', 'Platform pilot; subscriber growth'], ['2030 – 33', 'Profitability', 'Strong BE Aug ’30 · Venture BE Oct ’31']].forEach(([w, h, p], i) => {
    const [x, y] = ROAD[i], dl = 500 + i * 520;
    R(pres.shapes.OVAL, { x: x - 0.14, y: y - 0.14, w: 0.28, h: 0.28, fill: { color: i == 0 ? C.wine : C.cream }, line: { color: C.wine, width: 2.5 } }, `zoom:${dl}:500`);
    T([{ text: w, options: { fontSize: 10, bold: true, charSpacing: 3, color: C.gold, breakLine: true } }, { text: h, options: { fontFace: HEAD, fontSize: 21, bold: true, color: C.wine, breakLine: true } }, { text: p, options: { fontSize: 13, color: C.body } }],
      { x: x - 0.14, y: y + 0.4, w: 2.35, h: 1.4, paraSpaceAfter: 5 }, `float:${dl + 150}`);
  });

  // 9 ─ GROWTH
  slide(true, 'Aybal / Venture scenario', 'A venture case built on household growth', 'Let the chart draw. From 2,571 households in 2027 to 313,116 by 2033; revenue reaches €39.37M. Scenario, not forecast.');
  const yrs = ['2027', '2028', '2029', '2030', '2031', '2032', '2033'];
  // Intermediate values read from the original deck chart; 2033 revenue (€39.37M) is stated exactly.
  S.addChart(pres.charts.LINE, [
    { name: 'Revenue', labels: yrs, values: [0.1, 0.9, 2.9, 7.4, 15.1, 26.0, 39.37] },
    { name: 'Exit ARR', labels: yrs, values: [0.3, 1.4, 4.6, 10.3, 19.2, 31.0, 43.0] }],
    { x: 0.55, y: 1.8, w: 8.0, h: 4.95, chartColors: [C.pink, C.gold2], lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 7, lineSmooth: true,
      valAxisMaxVal: 50, valAxisMinVal: 0, valAxisMajorUnit: 10, valAxisLabelFormatCode: '"€"0"M"', valAxisLabelColor: C.dim, catAxisLabelColor: C.dim, valAxisLabelFontSize: 10, catAxisLabelFontSize: 11,
      valGridLine: { color: '4A2232', size: 0.75 }, catGridLine: { style: 'none' }, catAxisLineShow: false, valAxisLineShow: false,
      showLegend: true, legendPos: 't', legendColor: C.light, legendFontSize: 11, showTitle: false, plotArea: { fill: { color: C.plum } }, ...nm('wipeL:500:2800') });
  T('2027  →  2033', { x: 9.0, y: 1.95, w: 3.6, h: 0.3, fontSize: 13, bold: true, charSpacing: 4, color: C.gold2 }, 'fade:600');
  T('313,116', { x: 9.0, y: 2.3, w: 3.8, h: 0.95, fontFace: HEAD, fontSize: 60, bold: true, color: C.cream, valign: 'middle' }, 'zoom:3100:800');
  T('subscriber households by 2033', { x: 9.0, y: 3.25, w: 3.6, h: 0.3, fontSize: 14, color: C.light }, 'fade:3300');
  I(G('houses.png'), { x: 9.0, y: 3.75, w: 3.5, h: 0.875 }, 'wipeL:3400:1600');
  T('€39.37M', { x: 9.0, y: 4.85, w: 3.6, h: 0.8, fontFace: HEAD, fontSize: 46, bold: true, color: C.pink, valign: 'middle' }, 'zoom:4200:700');
  T('2033 revenue', { x: 9.0, y: 5.65, w: 3.6, h: 0.3, fontSize: 14, color: C.light }, 'fade:4400');
  T('Starts at 2,571 households in 2027 · scenario, not forecast', { x: 9.0, y: 6.1, w: 3.7, h: 0.45, fontSize: 11, color: C.dim }, 'fade:4600');

  // 10 ─ EBITDA
  slide(false, 'Aybal / Illustrative EBITDA scenarios', 'Profitability follows disciplined scale', 'Strong case breaks even in August 2030, venture case in October 2031. Scenario outputs, not promises.');
  // Values read from the original deck chart.
  S.addChart(pres.charts.BAR, [
    { name: 'Venture', labels: yrs, values: [-0.15, -0.45, -0.6, -0.4, 0.2, 1.6, 3.35] },
    { name: 'Strong', labels: yrs, values: [-0.1, -0.25, 0.05, 1.1, 3.2, 6.0, 9.0] }],
    { x: 0.55, y: 1.8, w: 8.0, h: 4.95, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 45, chartColors: [C.wine, C.gold],
      valAxisMaxVal: 10, valAxisMinVal: -2, valAxisMajorUnit: 2, valAxisLabelFormatCode: '"€"0"M"', valAxisLabelColor: C.muted, catAxisLabelColor: C.muted, valAxisLabelFontSize: 10, catAxisLabelFontSize: 11,
      valGridLine: { color: C.line, size: 0.75 }, catGridLine: { style: 'none' }, catAxisLabelPos: 'low', valAxisLineShow: false,
      showLegend: true, legendPos: 't', legendColor: C.muted, legendFontSize: 11, ...nm('wipeU:400:2400') });
  [['STRONG CASE', 'AUG ’30', 'strong case break-even', C.gold], ['VENTURE CASE', 'OCT ’31', 'venture case break-even', C.wine]].forEach(([f, b, l, col], i) => {
    const y = 2.0 + i * 1.75, dl = 2800 + i * 600;
    T(f, { shape: pres.shapes.ROUNDED_RECTANGLE, x: 9.0, y, w: 1.35, h: 0.28, fill: { color: col }, rectRadius: 0.14, align: 'center', valign: 'middle', fontSize: 8.5, bold: true, charSpacing: 2, color: 'FFFFFF' }, `zoom:${dl}:400`);
    T(b, { x: 9.0, y: y + 0.35, w: 3.6, h: 0.85, fontFace: HEAD, fontSize: 50, bold: true, color: C.wine, valign: 'middle' }, `float:${dl + 100}`);
    T(l, { x: 9.0, y: y + 1.2, w: 3.6, h: 0.3, fontSize: 14, color: C.body }, `fade:${dl + 200}`);
  });
  T('Scenario outputs, not promises. Demand and retention remain unproven; an investment may result in total loss.', { x: 9.0, y: 5.75, w: 3.6, h: 0.75, fontSize: 11, color: C.muted }, 'fade:4200');

  // 11 ─ ROUND
  slide(true, 'Aybal / The round', 'A focused €250k pre-seed round', 'The ask: €250k on a €1.30M pre-money cap, planned close March 2027. Gönül Demet coordinates investor conversations.');
  T('€250,000', { x: M, y: 1.9, w: 6.3, h: 1.45, fontFace: HEAD, fontSize: 76, bold: true, color: C.gold2, valign: 'middle' }, 'zoom:300:900');
  T('≈ $285,000', { x: M, y: 3.4, w: 4, h: 0.35, fontSize: 17, color: C.dim }, 'fade:900');
  [['VALUATION CAP', '€1.30M', 'pre-money · ~16% equity at cap'], ['PLANNED CLOSE', 'March 2027', 'Investor contact: Gönül Demet']].forEach(([l, v, s], i) => {
    const x = M + i * 3.1, dl = 1100 + i * 200;
    R(pres.shapes.LINE, { x, y: 4.3, w: 2.8, h: 0, line: { color: '6B5040', width: 0.75 } }, `wipeL:${dl}`);
    T([{ text: l, options: { fontSize: 10, bold: true, charSpacing: 3, color: C.gold2, breakLine: true } }, { text: v, options: { fontFace: HEAD, fontSize: 28, bold: true, color: C.cream, breakLine: true } }, { text: s, options: { fontSize: 12, color: C.dim } }],
      { x, y: 4.45, w: 2.9, h: 1.3, paraSpaceAfter: 6 }, `float:${dl}`);
  });
  T('SCENARIO VALUATION FRAME', { x: 7.4, y: 1.95, w: 5, h: 0.25, fontSize: 10, bold: true, charSpacing: 3, color: C.gold2 }, 'fade:1000');
  [['€52M', 'downside reference', 13], ['€175M', 'venture scenario — 2033', 43.75], ['€400M', 'strong scenario — 2030', 100]].forEach(([v, l, p], i) => {
    const y = 2.45 + i * 1.1, dl = 1400 + i * 450;
    T(v, { x: 7.4, y, w: 2, h: 0.5, fontFace: HEAD, fontSize: 30, bold: true, color: C.cream, valign: 'bottom' }, `float:${dl}`);
    T(l, { x: 9.4, y: y + 0.18, w: 3.15, h: 0.3, fontSize: 12, color: C.dim, align: 'right' }, `float:${dl}`);
    R(pres.shapes.ROUNDED_RECTANGLE, { x: 7.4, y: y + 0.62, w: 5.15, h: 0.14, fill: { color: '451828' }, rectRadius: 0.07 }, `fade:${dl}`);
    R(pres.shapes.ROUNDED_RECTANGLE, { x: 7.4, y: y + 0.62, w: 5.15 * p / 100, h: 0.14, fill: { color: C.gold2 }, rectRadius: 0.07 }, `wipeL:${dl + 300}:${600 + p * 12}`);
  });
  T('Subject to beta evidence, diligence and final legal terms. All valuations are forward-looking scenarios, not guarantees.', { x: 7.4, y: 5.85, w: 5.15, h: 0.55, fontSize: 11, color: C.dim }, 'fade:3200');

  // 12 ─ USE OF FUNDS
  slide(false, 'Aybal / Use of funds', 'Capital goes first to execution capacity', 'Half of the round goes into the team; a quarter into marketing tests.');
  const alloc = [['Team', 50, '€125,000', C.wine], ['Marketing', 25, '€62,500', C.gold], ['EU voice operation + store app development', 15, '€37,500', C.rose], ['Legal / trust', 10, '€25,000', C.plumMid]];
  S.addChart(pres.charts.DOUGHNUT, [{ name: 'Allocation', labels: alloc.map(a => a[0]), values: alloc.map(a => a[1]) }],
    { x: 0.7, y: 1.75, w: 5.0, h: 5.0, holeSize: 58, chartColors: alloc.map(a => a[3]), showLegend: false, showValue: false, showPercent: false, showLabel: false, dataBorder: { pt: 2, color: C.cream }, ...nm('wheel:300:1600') });
  T([{ text: '€250k', options: { fontFace: HEAD, fontSize: 38, bold: true, color: C.wine, breakLine: true } }, { text: 'ALLOCATION', options: { fontSize: 9, bold: true, charSpacing: 3, color: C.muted } }],
    { x: 2.2, y: 3.75, w: 2.0, h: 1.0, align: 'center', valign: 'middle' }, 'zoom:1700:600');
  alloc.forEach(([nme, p, e, col], i) => {
    const y = 2.1 + i * 0.95, dl = 700 + i * 400;
    R(pres.shapes.ROUNDED_RECTANGLE, { x: 6.6, y: y + 0.24, w: 0.2, h: 0.2, fill: { color: col }, rectRadius: 0.04 }, `zoom:${dl}:400`);
    T(p + '%', { x: 7.0, y, w: 1.2, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: C.wine, valign: 'middle' }, `float:${dl}`);
    T(nme, { x: 8.25, y, w: 2.9, h: 0.7, fontFace: HEAD, fontSize: 16, bold: true, valign: 'middle' }, `float:${dl}`);
    T(e, { x: 11.1, y, w: 1.45, h: 0.7, fontSize: 14, color: C.muted, align: 'right', valign: 'middle' }, `float:${dl}`);
    R(pres.shapes.LINE, { x: 6.6, y: y + 0.82, w: 5.95, h: 0, line: { color: C.line, width: 0.75 } }, `wipeL:${dl + 100}`);
  });
  T('Allocation totals reflect the operating budget and may vary slightly from round proceeds due to timing and FX.', { x: 6.6, y: 6.0, w: 5.95, h: 0.45, fontSize: 11, color: C.muted }, 'fade:2600');

  // 13 ─ GATES
  slide(false, 'Aybal / Milestone gates', 'Scale only after evidence clears the gate', 'Spend only scales once each gate is cleared with evidence.');
  [['01', 'APR 2027', 'Activation', '300 trials\n≥43% trial-to-pay\n≤25% month-one churn', 2.55], ['02', 'Q1 2028', 'Retention', '12-month retention ≥38%\nK-factor ≥0.25\nLTV/CAC ≥3', 3.0], ['03', '2029', 'Efficiency', 'Conversion ≥5.5%\nDACH signup ≤€3.50\nPaid CAC ≤€54', 3.45], ['04', '2030', 'Expansion', 'Five markets live\nPlatform pilot', 3.9], ['05', 'SCENARIO', 'Outcome', '€400M enterprise value target — not a forecast', 4.45]].forEach(([no, w, h, p, hh], i) => {
    const x = M + i * 2.39, y = 6.75 - hh, top = i == 4, dl = 300 + i * 450;
    T([{ text: no, options: { fontFace: HEAD, fontSize: 26, bold: true, color: top ? C.gold2 : C.gold, breakLine: true } }, { text: w, options: { fontSize: 9.5, bold: true, charSpacing: 3, color: top ? C.light : C.muted, breakLine: true } },
       { text: h, options: { fontFace: HEAD, fontSize: 21, bold: true, color: top ? C.gold2 : C.wine, breakLine: true } }, { text: p, options: { fontSize: 12, color: top ? C.light : C.body } }],
      { shape: pres.shapes.ROUNDED_RECTANGLE, ...card(x, y, 2.2, hh + 0.2, top ? C.wine : C.card, top ? C.wine : C.line), margin: [14, 12, 12, 16], paraSpaceAfter: 6, shadow: shadow() }, `wipeU:${dl}:900`);
  });
  R(pres.shapes.RECTANGLE, { x: 0, y: 6.75, w: W, h: 0.75, fill: { color: C.cream }, line: { color: C.cream, width: 0 } });
  T('CONFIDENTIAL  •  PRE-SEED  •  SEPTEMBER 2026', { x: M, y: 7.02, w: 6, h: 0.2, fontSize: 8, charSpacing: 2, color: C.muted });
  T(`13 / ${N}`, { x: W - M - 2, y: 7.02, w: 2, h: 0.2, fontSize: 8, charSpacing: 2, align: 'right', color: C.muted });

  // 14 ─ RISKS
  slide(false, 'Aybal / Risk management', 'Risk is explicit—and instrumented', 'Seven risks, each with a concrete mitigation.');
  const risks = [['Retention & demand', 'Closed beta cohorts; gate spend on conversion and churn.'], ['CAC & marketing', 'Channel tests, capped budgets, LTV/CAC thresholds.'], ['Founder concentration', 'Priority hiring, documented operations, advisor support.'], ['Voice / copyright / privacy', 'Consent controls, rights workflow, DPIA and regulatory review.'], ['Trademark & app stores', 'Clearance before scale; preserve web-first economics.'], ['Türkiye FX', 'Localized pricing and regular FX sensitivity review.'], ['Platform contracts', 'Base case excludes uncontracted platform revenue.']];
  [['Named up front. Mitigated by design.', 'Seven risks, each with a concrete mitigation.'], ...risks].forEach(([h, p], i) => {
    const x = M + (i % 4) * 2.99, y = 2.0 + Math.floor(i / 4) * 2.25, lead = i == 0, dl = 250 + i * 170;
    T([{ text: h, options: { fontFace: HEAD, fontSize: lead ? 16 : 15, bold: true, color: lead ? C.gold2 : C.wine, breakLine: true } }, { text: p, options: { fontSize: 12.5, color: lead ? C.light : C.body } }],
      { shape: pres.shapes.ROUNDED_RECTANGLE, ...card(x, y, 2.8, 2.0, lead ? C.plum : C.card, lead ? C.plum : C.line), margin: [16, lead ? 14 : 38, 12, 16], paraSpaceAfter: 8, fontSize: 12, shadow: shadow() }, `float:${dl}`);
    if (!lead) I(G('icon-shield.png'), { x: x + 2.33, y: y + 0.25, w: 0.3, h: 0.3 }, `zoom:${dl + 300}:400`);
  });

  // 15 ─ FOUNDER & INVENTOR
  slide(true, null, null, 'Your slide: you invented Aybal and built the product before raising money. Bring in the Mercedes-Benz AI background and the DE/TR community access.');
  R(pres.shapes.OVAL, { x: M, y: 0.65, w: 1.25, h: 1.25, fill: { color: C.plum }, line: { color: C.gold2, width: 1.5 } }, 'zoom:100:900');
  T('TS', { x: M, y: 0.65, w: 1.25, h: 1.25, align: 'center', valign: 'middle', fontFace: HEAD, fontSize: 34, bold: true, color: C.gold2 }, 'zoom:400:700');
  T('THE FOUNDER & INVENTOR', { x: 2.3, y: 0.85, w: 5.5, h: 0.25, fontSize: 10, bold: true, charSpacing: 4, color: C.gold2 }, 'fade:500');
  T('The person who invented Aybal—and built it before asking anyone to fund it.', { x: 2.3, y: 1.15, w: 5.8, h: 0.65, fontFace: HEAD, fontSize: 16, italic: true, color: C.dim }, 'fade:700');
  T('Tuncay Sancak', { x: M, y: 2.05, w: 7.6, h: 1.0, fontFace: HEAD, fontSize: 54, bold: true, color: C.cream, valign: 'middle' }, 'float:900:1200');
  [['FOUNDER & INVENTOR', 2.35, true], ['MANAGING DIRECTOR', 2.25], ['PRODUCT ARCHITECT', 2.25]].reduce((x, [t, w, main], i) => {
    T(t, { shape: pres.shapes.ROUNDED_RECTANGLE, x, y: 3.2, w, h: 0.36, fill: { color: main ? C.gold : C.plum }, line: { color: C.gold, width: 0.75 }, rectRadius: 0.18, align: 'center', valign: 'middle', fontSize: 8.5, bold: true, charSpacing: 1, color: main ? C.plum : C.gold2 }, `zoom:${1600 + i * 150}:400`);
    return x + w + 0.15;
  }, M);
  T(['Product architect and Germany–Türkiye bridge.', 'Former project lead, AI expert and data scientist at Mercedes-Benz.', 'Native German and Turkish speaker, trilingual in business.', 'Founder of the HappyiZ movement, with a network across families, professionals and educational institutions in Türkiye.', 'Author of children’s books, including the gift book “Good That You Exist”, available in German, Turkish and English.']
    .map((t, i, a) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < a.length - 1 } })),
    { x: M, y: 3.8, w: 7.5, h: 2.1, fontSize: 13, color: C.light, paraSpaceAfter: 5 }, 'float:2000');
  [['1,779', 'automated tests'], ['3', 'interface languages'], ['13', 'voice languages'], ['Built', 'before financing']].forEach(([b, l], i) => {
    T([{ text: b, options: { fontFace: HEAD, fontSize: 28, bold: true, color: C.gold2, breakLine: true } }, { text: l, options: { fontSize: 11, color: C.dim } }],
      { shape: pres.shapes.ROUNDED_RECTANGLE, x: M + i * 1.9, y: 5.95, w: 1.8, h: 0.9, fill: { color: '3A1020' }, line: { color: '6B4A36', width: 0.75 }, rectRadius: 0.1, margin: [10, 8, 6, 6], valign: 'middle' }, `zoom:${2600 + i * 180}:500`);
  });
  R(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: 1.0, w: 3.8, h: 5.6, fill: { color: '1F0710' }, line: { color: C.gold, width: 1 }, rectRadius: 0.2 }, 'float:1000');
  T('Why this founder matters', { x: 8.95, y: 1.3, w: 3.4, h: 0.5, fontFace: HEAD, fontSize: 21, bold: true, color: C.gold2, align: 'center' }, 'fade:1300');
  [['grid', 'Product, technology and content already integrated'], ['people', 'Direct access to the initial DE/TR customer communities'], ['growth', 'Founder-led, milestone-based team build after the round']].forEach(([ic, t], i) => {
    const y = 2.2 + i * 1.4, dl = 1600 + i * 350;
    R(pres.shapes.LINE, { x: 9.05, y: y - 0.2, w: 3.2, h: 0, line: { color: '5A4030', width: 0.75 } }, `fade:${dl}`);
    R(pres.shapes.OVAL, { x: 9.05, y: y + 0.1, w: 0.7, h: 0.7, fill: { color: '1F0710' }, line: { color: C.gold, width: 1 } }, `zoom:${dl}:500`);
    I(G(`icon-${ic}.png`), { x: 9.22, y: y + 0.25, w: 0.36, h: 0.36 * 28 / 24 }, `zoom:${dl + 100}:500`);
    T(t, { x: 9.95, y: y + 0.05, w: 2.4, h: 0.8, fontSize: 13, color: C.light, valign: 'middle' }, `float:${dl + 100}`);
  });

  // 16 ─ TEAM
  slide(false, 'Aybal / Team', 'The people behind Aybal', 'Founder and inventor plus investor relations today; hires are tied to milestones.');
  [['TS', 'Tuncay Sancak', 'FOUNDER & INVENTOR · MANAGING DIRECTOR', 'Invented and built the Aybal platform. Leads product, technology and content.', true], ['GD', 'Gönül Demet', 'INVESTOR RELATIONS & FUNDRAISING', 'Leads investor outreach for the pre-seed round and prepared this investment deck.', false]].forEach(([ini, nme, role, d, lead], i) => {
    const x = M + i * 5.99, dl = 300 + i * 300;
    R(pres.shapes.ROUNDED_RECTANGLE, { ...card(x, 1.95, 5.78, 1.55, lead ? C.plum : C.card, lead ? C.plum : C.line), shadow: shadow() }, `float:${dl}`);
    T(ini, { shape: pres.shapes.OVAL, x: x + 0.3, y: 2.25, w: 0.95, h: 0.95, fill: { color: lead ? C.wine : C.cream2 }, line: { color: C.gold, width: 1.5 }, align: 'center', valign: 'middle', fontFace: HEAD, fontSize: 26, bold: true, color: lead ? C.gold2 : C.wine }, `zoom:${dl + 200}:500`);
    T([{ text: nme, options: { fontFace: HEAD, fontSize: 24, bold: true, color: lead ? C.cream : C.wine, breakLine: true } }, { text: role, options: { fontSize: 9, bold: true, charSpacing: 2, color: C.gold, breakLine: true } }, { text: d, options: { fontSize: 12, color: lead ? C.light : C.body } }],
      { x: x + 1.5, y: 2.1, w: 4.1, h: 1.3, paraSpaceAfter: 4, valign: 'middle' }, `float:${dl + 200}`);
  });
  T('Team formation after financing', { x: M, y: 3.95, w: 6, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true }, 'fade:900');
  R(pres.shapes.LINE, { x: M, y: 4.75, w: CW, h: 0, line: { color: C.gold, width: 2 } }, 'wipeL:1100:2200');
  [['Technical co-founder & growth/community lead', 'from the round'], ['Customer service', 'from 1,500 subscriptions'], ['Second developer', 'from €40,000 MRR'], ['Country leads, partnerships, legal/data protection & finance', 'from the seed round']].forEach(([h, s], i) => {
    const x = M + i * 2.99, dl = 1200 + i * 500;
    R(pres.shapes.OVAL, { x, y: 4.62, w: 0.26, h: 0.26, fill: { color: C.cream }, line: { color: C.wine, width: 2.5 } }, `zoom:${dl}:400`);
    T([{ text: h, options: { fontFace: HEAD, fontSize: 13.5, bold: true, color: C.wine, breakLine: true } }, { text: s, options: { fontSize: 11.5, color: C.muted } }], { x, y: 5.0, w: 2.8, h: 1.2, paraSpaceAfter: 4 }, `float:${dl + 100}`);
  });
  T('Founder commitment: long-term and exclusive leadership, four-year vesting, non-compete and key-person insurance planned.', { x: M, y: 6.35, w: CW, h: 0.4, fontFace: HEAD, fontSize: 13.5, italic: true, color: C.wine }, 'fade:3400');

  // 17 ─ CLOSE
  slide(false, null, null, 'Close with the vision and the ask. Invite follow-up via Gönül Demet and founders@aybal.com.');
  R(pres.shapes.RECTANGLE, { x: 8.9, y: 0, w: W - 8.9, h: 7.5, fill: { color: C.wine }, line: { color: C.wine, width: 0 } }, 'wipeU:0:900');
  R(pres.shapes.OVAL, { x: 8.1, y: 1.0, w: 1.9, h: 1.9, fill: { color: C.gold } }, 'zoom:700:900');
  I(`${__dirname}/../assets/tablet.jpg`, { x: 9.55, y: 3.0, w: 3.12, h: 3.9, shadow: { type: 'outer', color: '000000', blur: 30, offset: 10, angle: 90, opacity: 0.35 } }, 'float:1100:1100');
  T('THANK YOU FOR YOUR CONSIDERATION', { x: M, y: 0.9, w: 7, h: 0.25, fontSize: 10, bold: true, charSpacing: 4, color: C.wine }, 'fade:300');
  T('Give every family a new voice in reading.', { x: M, y: 1.4, w: 7.4, h: 2.3, fontFace: HEAD, fontSize: 42, bold: true, color: C.ink }, 'float:500:1200');
  I(G('wave-wine.png'), { x: M, y: 3.9, w: 4.0, h: 0.5 }, 'wipeL:1300:1400');
  T('Join Aybal in proving the next chapter of family reading.', { x: M, y: 4.5, w: 7.5, h: 0.4, fontSize: 18, color: C.wine }, 'fade:1700');
  [['FOUNDER & INVENTOR', 'Tuncay Sancak'], ['INVESTOR RELATIONS', 'Gönül Demet'], ['CONTACT', 'founders@aybal.com\naybal.com']].forEach(([l, v], i) => {
    T([{ text: l, options: { fontSize: 8, bold: true, charSpacing: 1.5, color: C.gold, breakLine: true } }, { text: v, options: { fontFace: HEAD, fontSize: 14, bold: true } }],
      { x: M + i * 2.3, y: 5.25, w: i == 2 ? 2.9 : 2.2, h: 0.95, paraSpaceAfter: 5 }, `float:${2000 + i * 200}`);
  });
  T('Confidential pre-seed materials. Forward-looking statements are subject to material risks and uncertainty.', { x: M, y: 6.45, w: 7.5, h: 0.3, fontSize: 9.5, color: C.muted }, 'fade:2700');

  await pres.writeFile({ fileName: `${__dirname}/raw.pptx` });
  console.log('wrote raw.pptx');
})();
