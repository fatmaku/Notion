#!/usr/bin/env node
/*
 * LiveFX – Markdown → gestaltetes Word-Dokument (docx)
 *
 *   node tools/build-docx.js <eingabe.md> <ausgabe.docx> <de|tr|en> [--no-pages] [--header "Text"]
 *
 * Erzeugt: Titelseite, Inhaltsverzeichnis (klickbar, mit Seitenzahlen), echte Tabellen,
 * Überschriften als Word-Formatvorlagen (Navigationsbereich), Listen, Zitate, Codeblöcke,
 * fett/kursiv/Code/Links, Kopfzeile „<Titel> · Vertraulich“ (lokalisiert) und
 * Fußzeile „Seite x von y“ (lokalisiert). Seitenformat A4.
 *
 * Seitenzahlen im Inhaltsverzeichnis: Ist LibreOffice (soffice) + pdftotext installiert,
 * baut das Skript zuerst einen Probelauf, liest die Seiten der Kapitel aus dem PDF und
 * schreibt sie ins Verzeichnis (zwei Durchläufe). Ohne diese Werkzeuge oder mit --no-pages
 * bleibt das Verzeichnis ohne Seitenzahlen (Einträge sind trotzdem klickbar).
 *
 * Abhängigkeit: npm-Paket „docx“ (v9). Auflösung in dieser Reihenfolge:
 *   1. require('docx')  – global, über NODE_PATH oder ein node_modules oberhalb von tools/
 *   2. tools/node_modules/docx  (npm i docx --prefix tools)
 *   3. $LIVEFX_NODE_MODULES/docx
 *
 * Markdown-Konventionen (wie in BUSINESSPLAN.md):
 *   - Zeile 1: „# Produkt – Dokumenttitel“ (Titelseite: großes „Produkt“, darunter „Dokumenttitel“)
 *   - bis zum ersten „---“: Untertitel, Meta-Zeilen, „> Hinweise“ → Titelseite
 *   - „## “ = Kapitel (Inhaltsverzeichnis), „### “ / „#### “ = Unterkapitel
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// ---------- docx auflösen ----------
function loadDocx() {
  const tries = [
    () => require('docx'),
    () => require(path.join(__dirname, 'node_modules', 'docx')),
    () => require(path.join(process.env.LIVEFX_NODE_MODULES || '/nonexistent', 'docx')),
  ];
  for (const t of tries) { try { return t(); } catch (e) { /* nächster Versuch */ } }
  console.error('Paket „docx“ nicht gefunden. Installieren mit:\n  npm i docx --prefix ' + __dirname +
    '\noder NODE_PATH bzw. LIVEFX_NODE_MODULES auf einen node_modules-Ordner mit docx setzen.');
  process.exit(2);
}
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  AlignmentType, BorderStyle, ShadingType, PageBreak, Footer, Header, PageNumber, LevelFormat,
  VerticalAlign, ExternalHyperlink, InternalHyperlink, Bookmark, TabStopType, LeaderType,
} = loadDocx();

// ---------- Argumente ----------
const args = process.argv.slice(2);
const flags = { pages: true, header: null };
const pos = [];
for (let k = 0; k < args.length; k++) {
  if (args[k] === '--no-pages') flags.pages = false;
  else if (args[k] === '--header') flags.header = args[++k];
  else if (args[k] === '--toc-json') flags.tocJson = args[++k]; // intern: zweiter Durchlauf
  else pos.push(args[k]);
}
const [SRC, OUT, LANG_ARG] = pos;
if (!SRC || !OUT || !/^(de|tr|en)$/.test(LANG_ARG || '')) {
  console.error('Aufruf: node tools/build-docx.js <eingabe.md> <ausgabe.docx> <de|tr|en> [--no-pages] [--header "Text"]');
  process.exit(1);
}
const LANG = LANG_ARG;

// ---------- Lokalisierung ----------
const L10N = {
  de: { locale: 'de-DE', toc: 'Inhalt', confidential: 'Vertraulich', page: 'Seite ', of: ' von ', tail: '' },
  tr: { locale: 'tr-TR', toc: 'İçindekiler', confidential: 'Gizli', page: 'Sayfa ', of: ' / ', tail: '' },
  en: { locale: 'en-GB', toc: 'Contents', confidential: 'Confidential', page: 'Page ', of: ' of ', tail: '' },
}[LANG];

// ---------- Gestaltung ----------
const FONT = 'Calibri';
const MONO = 'Consolas';
const ACCENT = 'C2185B';   // LiveFX-Pink, druckfreundlich abgedunkelt
const ACCENT2 = '0F1115';  // LiveFX-Nachtschwarz
const TEAL = '0E9F7E';     // Neon-Grün, abgedunkelt
const GREY = '666666';
const HEAD_FILL = 'FCE4EE';
const ZEBRA = 'F7F7FA';
const PAGE_W = 11906, PAGE_H = 16838; // A4 in DXA
const MARGIN = 1134;                  // 2 cm
const CONTENT_W = PAGE_W - 2 * MARGIN;
const BASE = 21;                      // 10,5 pt

// Geschütztes Leerzeichen nach ≈ / ~ und vor %/€, damit Zeichen und Zahl (z. B. „≈ +407“) nie getrennt werden
const nb = t => t.replace(/([≈~]) (?=[−\-+]?\d)/g, '$1\u00A0').replace(/(\d) (?=[%€])/g, '$1\u00A0');

// ---------- Inline-Markdown → Runs ----------
// Unterstützt: **fett**, *kursiv*, ***fett-kursiv***, `Code`, [Text](URL), nackte URLs
function inline(text, base = {}) {
  const out = [];
  const size = base.size || BASE;
  const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|https?:\/\/[^\s)|]+[^\s)|.,;:]|(?<![\w*])\*[^*\n]+\*(?![\w*]))/g;
  let last = 0, m;
  const run = (t, extra = {}) => { if (t) out.push(new TextRun({ text: nb(t), font: FONT, size, ...base, ...extra })); };
  const link = (label, url) => out.push(new ExternalHyperlink({
    link: url,
    children: [new TextRun({ text: label, font: FONT, size, ...base, color: '1565C0', underline: {} })],
  }));
  while ((m = re.exec(text))) {
    run(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('***')) run(tok.slice(3, -3), { bold: true, italics: true });
    else if (tok.startsWith('**')) {
      // verschachtelte *kursiv* innerhalb von fett
      const inner = tok.slice(2, -2);
      inline(inner, { ...base, bold: true }).forEach(r => out.push(r));
    } else if (tok.startsWith('`')) run(tok.slice(1, -1), { font: MONO, size: size - 2, color: '333333' });
    else if (tok.startsWith('[')) link(tok.slice(1, tok.indexOf('](')), m[2]);
    else if (/^https?:/.test(tok)) link(tok, tok);
    else run(tok.slice(1, -1), { italics: true });
    last = m.index + tok.length;
  }
  run(text.slice(last));
  return out;
}
const plain = t => t.replace(/\*\*|`|\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

// ---------- Markdown → Blöcke ----------
function parse(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith('# ')) i++;
  const front = { title: (lines[i] || '# Dokument').replace(/^# /, '').trim(), subtitle: '', meta: [], notes: [] };
  i++;
  while (i < lines.length && lines[i].trim() !== '---') {
    const l = lines[i].trim();
    if (l) {
      if (l.startsWith('>')) front.notes.push(l.replace(/^>\s*/, ''));
      else if (!front.subtitle) front.subtitle = l;
      else front.meta.push(l);
    }
    i++;
  }
  i++;
  const blocks = [];
  const isStart = l => /^(#{2,4} |\||>|```|---\s*$|\s*[-*] |\d+\. )/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const code = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++; blocks.push({ type: 'code', lines: code }); continue;
    }
    if (/^#{2,4} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ type: 'h', level, text: line.replace(/^#+ /, '').trim() }); i++; continue;
    }
    if (line.trim() === '---') { i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      const header = cells(rows[0]);
      const hasSep = rows[1] && /^\|?\s*:?-{2,}/.test(rows[1].trim().replace(/^\|/, ''));
      blocks.push({ type: 'table', header, body: rows.slice(hasSep ? 2 : 1).map(cells) }); continue;
    }
    if (line.startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].startsWith('>')) q.push(lines[i++].replace(/^> ?/, ''));
      blocks.push({ type: 'quote', text: q.join(' ') }); continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        const level = Math.min(2, Math.floor(lines[i].match(/^\s*/)[0].length / 2));
        let t = lines[i].replace(/^\s*[-*] /, ''); i++;
        while (i < lines.length && lines[i].trim() && !isStart(lines[i]) && /^\s+\S/.test(lines[i])) t += ' ' + lines[i++].trim();
        items.push({ level, text: t });
      }
      blocks.push({ type: 'ul', items }); continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && (/^\d+\. /.test(lines[i]) || /^\s+[-*] /.test(lines[i]))) {
        if (/^\s+[-*] /.test(lines[i])) { items.push({ level: 1, bullet: true, text: lines[i++].replace(/^\s*[-*] /, '') }); continue; }
        let t = lines[i].replace(/^\d+\. /, ''); i++;
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !/^\s+[-*] /.test(lines[i])) t += ' ' + lines[i++].trim();
        items.push({ level: 0, text: t });
      }
      blocks.push({ type: 'ol', items }); continue;
    }
    let t = line.trim(); i++;
    while (i < lines.length && lines[i].trim() && !isStart(lines[i])) t += ' ' + lines[i++].trim();
    blocks.push({ type: 'p', text: t });
  }
  return { front, blocks };
}

// ---------- Tabellen ----------
const border = { style: BorderStyle.SINGLE, size: 4, color: 'C8C8D0' };
const borders = { top: border, bottom: border, left: border, right: border };

function colWidths(header, body, size, padX) {
  const n = header.length;
  const cols = header.map((h, c) => [h, ...body.map(r => r[c] || '')].map(plain));
  // Gewicht: Mischung aus längster und durchschnittlicher Zelle
  const weight = cols.map((all, c) => {
    const lens = all.map(x => x.length);
    const max = Math.max(...lens), avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    return Math.min(Math.max(0.5 * max + 0.5 * avg, c === 0 ? 10 : 6), n > 5 ? 30 : 70);
  });
  // Untergrenze: längstes Einzelwort muss in eine Zeile passen (≈ 0,55 em pro Zeichen)
  const charDxa = size / 2 * 20 * 0.72; // großzügig, damit auch breitere Ersatzschriften passen
  const minW = cols.map(all => Math.min(CONTENT_W / 3, Math.max(...all.map(x => Math.max(0, ...nb(x).split(/[ \t\r\n]+/).map(w => w.length)))) * charDxa + 2 * padX + 40));
  let widths = weight.map(() => 0);
  let free = CONTENT_W, open = weight.map((_, c) => c);
  // iterativ verteilen: Spalten unter ihrer Untergrenze fest setzen, Rest nach Gewicht
  for (let guard = 0; guard < n + 1; guard++) {
    const wsum = open.reduce((a, c) => a + weight[c], 0);
    const fixed = open.filter(c => free * weight[c] / wsum < minW[c]);
    if (!fixed.length) { open.forEach(c => { widths[c] = Math.floor(free * weight[c] / wsum); }); break; }
    fixed.forEach(c => { widths[c] = Math.ceil(minW[c]); free -= widths[c]; });
    open = open.filter(c => !fixed.includes(c));
    if (!open.length) break;
  }
  const total = widths.reduce((a, b) => a + b, 0);
  widths = widths.map(x => Math.floor(x * CONTENT_W / total));
  widths[n - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  return widths;
}

function renderTable(b) {
  const n = b.header.length;
  const size = n > 6 ? 15 : n > 4 ? 16 : 18;
  const padX = n > 6 ? 50 : 90;
  const widths = colWidths(b.header, b.body, size, padX);
  const noHead = b.header.every(h => !h);
  const numeric = c => /^[\s*−\-+≈~<>]*[\d.,]+[\s%T€*]*$/.test(c || '');
  // Spalten, deren Zellen überwiegend Zahlen sind, werden rechtsbündig gesetzt
  const numCol = b.header.map((_, c) => {
    const vals = b.body.map(r => r[c] || '').filter(Boolean);
    return vals.length > 0 && vals.filter(numeric).length / vals.length >= 0.6;
  });
  const mk = (cells, isHead, idx) => new TableRow({
    tableHeader: isHead,
    cantSplit: true,
    children: cells.map((c, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.DXA },
      borders,
      verticalAlign: VerticalAlign.CENTER,
      shading: isHead ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: 'auto' }
        : (idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: ZEBRA, color: 'auto' } : undefined),
      margins: { top: 50, bottom: 50, left: padX, right: padX },
      children: [new Paragraph({
        alignment: !isHead && ci > 0 && numCol[ci] && numeric(c) ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 20, after: 20, line: 252 },
        children: inline(c || '', { size, bold: isHead || (noHead && ci === 0) ? true : undefined, color: isHead ? ACCENT2 : undefined }),
      })],
    })),
  });
  const rows = [
    ...(noHead ? [] : [mk(b.header, true, 0)]),
    ...b.body.map((r, idx) => { const row = r.slice(0, n); while (row.length < n) row.push(''); return mk(row, false, idx); }),
  ];
  return [new Table({ rows, width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths }),
    new Paragraph({ spacing: { after: 100 }, children: [] })];
}

// ---------- Dokument bauen ----------
function build({ front, blocks }, tocPages) {
  const children = [];
  let olInstance = 0, hIdx = 0;
  const h2 = blocks.filter(b => b.type === 'h' && b.level === 2);
  const lastH2 = h2[h2.length - 1];
  const appendixRe = /^(\d+\.\s*)?(Anhang|Ek|Ekler|Appendix|Annex)\b/i;

  for (const b of blocks) {
    switch (b.type) {
      case 'h': {
        const lvl = { 2: HeadingLevel.HEADING_1, 3: HeadingLevel.HEADING_2, 4: HeadingLevel.HEADING_3 }[b.level];
        const opts = { heading: lvl, keepNext: true, keepLines: true };
        if (b.level === 2) {
          const id = 'kap' + (++hIdx);
          b.anchor = id;
          opts.children = [new Bookmark({ id, children: [new TextRun({ text: plain(b.text) })] })];
          if (hIdx === 1 || appendixRe.test(b.text) || (b === lastH2 && appendixRe.test(b.text))) opts.pageBreakBefore = true;
        } else opts.children = [new TextRun({ text: plain(b.text) })];
        children.push(new Paragraph(opts));
        break;
      }
      case 'p':
        children.push(new Paragraph({ children: inline(b.text), spacing: { after: 140, line: 288 }, alignment: AlignmentType.JUSTIFIED }));
        break;
      case 'quote':
        children.push(new Paragraph({
          children: inline(b.text, { italics: true, color: '555555', size: 19 }),
          indent: { left: 360 }, spacing: { before: 60, after: 180, line: 276 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 10 } },
        }));
        break;
      case 'code': {
        // breite Diagramme verkleinern, damit sie nicht umbrechen (ca. 108 Zeichen bei 7 pt)
        const maxLen = Math.max(...b.lines.map(l => l.length));
        const csize = maxLen > 108 ? Math.max(10, Math.floor(14 * 108 / maxLen)) : 14;
        b.lines.forEach((l, k) => children.push(new Paragraph({
          children: [new TextRun({ text: l || ' ', font: MONO, size: csize, color: '222222' })],
          shading: { type: ShadingType.CLEAR, fill: 'F2F2F5', color: 'auto' },
          spacing: { before: k === 0 ? 80 : 0, after: 0, line: 240 }, keepNext: k < b.lines.length - 1, keepLines: true,
        })));
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      }
      case 'ul':
        b.items.forEach(it => children.push(new Paragraph({ children: inline(it.text), numbering: { reference: 'bullets', level: it.level }, spacing: { after: 70, line: 276 } })));
        children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case 'ol':
        olInstance++;
        b.items.forEach(it => children.push(new Paragraph({
          children: inline(it.text),
          numbering: it.bullet ? { reference: 'bullets', level: 1 } : { reference: 'numbers', level: 0, instance: olInstance },
          spacing: { after: 70, line: 276 },
        })));
        children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case 'table': children.push(...renderTable(b)); break;
    }
  }

  // Titelseite
  const parts = front.title.split(/\s+[–-]\s+/);
  const brand = parts.length > 1 ? parts[0] : front.title;
  const docName = parts.length > 1 ? parts.slice(1).join(' – ') : '';
  const titlePage = [
    new Paragraph({ spacing: { before: 2600 }, children: [] }),
    new Paragraph({ children: [new TextRun({ text: brand, font: FONT, size: 104, bold: true, color: ACCENT })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: docName, font: FONT, size: 50, color: ACCENT2 })], spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 12 } } }),
    new Paragraph({ children: inline(front.subtitle, { size: 26, color: '333333' }), spacing: { before: 240, after: 520, line: 300 } }),
    ...front.meta.map(m => new Paragraph({ children: inline(m, { size: 22, color: GREY }), spacing: { after: 80 } })),
    new Paragraph({ spacing: { before: 500 }, children: [] }),
    ...front.notes.map(n => new Paragraph({
      children: inline(n, { size: 18, italics: true, color: GREY }), spacing: { after: 120, line: 264 },
      indent: { left: 240 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 } },
    })),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [new TextRun({ text: L10N.toc, font: FONT, size: 36, bold: true, color: ACCENT })], spacing: { after: 280 } }),
    ...h2.map(b => new Paragraph({
      spacing: { after: 110 },
      // Rechtsbündiger Tabstopp mit Punktführung (wird von Word und LibreOffice gleich dargestellt)
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: LeaderType.DOT }],
      children: [new InternalHyperlink({ anchor: b.anchor, children: [
        new TextRun({ text: plain(b.text), font: FONT, size: 22, color: ACCENT2 }),
        new TextRun({ text: '\t' + String(tocPages[plain(b.text)] || ''), font: FONT, size: 22, color: ACCENT2 }),
      ] })],
    })),
  ];

  const headerText = flags.header || `${front.title} · ${L10N.confidential}`;
  const small = { font: FONT, size: 16, color: GREY };
  return new Document({
    creator: 'LiveFX',
    title: front.title,
    description: plain(front.subtitle),
    styles: {
      default: { document: { run: { font: FONT, size: BASE, language: { value: L10N.locale } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 34, bold: true, color: ACCENT, font: FONT },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E8C2D2', space: 6 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, color: ACCENT2, font: FONT },
          paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 22, bold: true, color: TEAL, font: FONT },
          paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [0, 1, 2].map(level => ({
          level, format: LevelFormat.BULLET, text: ['•', '–', '·'][level], alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540 + level * 360, hanging: 270 } }, run: { color: ACCENT } },
        })) },
        { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 320 } } } }] },
      ],
    },
    sections: [{
      properties: { titlePage: true, page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 567, footer: 567 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: headerText, ...small })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } } })] }),
        first: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: L10N.page, ...small }),
          new TextRun({ children: [PageNumber.CURRENT], ...small }),
          new TextRun({ text: L10N.of, ...small }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], ...small }),
        ] })] }),
        first: new Footer({ children: [new Paragraph({ children: [] })] }),
      },
      children: [...titlePage, ...children],
    }],
  });
}

// ---------- Seitenzahlen per Probelauf ----------
function have(cmd) { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; } }

function findPages(docxPath, headings) {
  const dir = path.dirname(docxPath);
  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', dir, docxPath], { stdio: 'ignore', env: { ...process.env, HOME: process.env.HOME || os.tmpdir() } });
  const pdf = docxPath.replace(/\.docx$/, '.pdf');
  const txt = execFileSync('pdftotext', ['-layout', pdf, '-'], { maxBuffer: 64 << 20 }).toString('utf8');
  const pages = txt.split('\f').map(p => p.replace(/\s+/g, ' '));
  const norm = s => s.replace(/\s+/g, ' ').trim().slice(0, 48);
  // Das Verzeichnis endet auf der ersten Seite, die den letzten Kapiteltitel enthält.
  const lastKey = norm(headings[headings.length - 1]);
  let start = pages.findIndex(p => p.includes(lastKey)) + 1;
  const result = {};
  for (const h of headings) {
    const key = norm(h);
    for (let p = start; p < pages.length; p++) {
      if (pages[p].includes(key)) { result[h] = p + 1; start = p; break; }
    }
  }
  return result;
}

(async () => {
  const parsed = parse(fs.readFileSync(SRC, 'utf8'));
  const headings = parsed.blocks.filter(b => b.type === 'h' && b.level === 2).map(b => plain(b.text));
  let tocPages = {};
  if (flags.tocJson) tocPages = JSON.parse(fs.readFileSync(flags.tocJson, 'utf8'));
  else if (flags.pages && have('soffice') && have('pdftotext')) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-docx-'));
    const probe = path.join(tmp, 'probe.docx');
    fs.writeFileSync(probe, await Packer.toBuffer(build(parse(fs.readFileSync(SRC, 'utf8')), Object.fromEntries(headings.map(h => [h, 99])))));
    try { tocPages = findPages(probe, headings); } catch (e) { console.warn('Hinweis: Seitenzahlen nicht ermittelt (' + e.message + ')'); }
    fs.rmSync(tmp, { recursive: true, force: true });
  } else if (flags.pages) console.warn('Hinweis: soffice/pdftotext fehlen – Inhaltsverzeichnis ohne Seitenzahlen.');
  const buf = await Packer.toBuffer(build(parsed, tocPages));
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, buf);
  const found = Object.keys(tocPages).length;
  console.log(`geschrieben: ${OUT} (${buf.length} Bytes, Sprache ${LANG}, ${headings.length} Kapitel, Seitenzahlen ${found}/${headings.length})`);
})().catch(e => { console.error(e); process.exit(1); });
