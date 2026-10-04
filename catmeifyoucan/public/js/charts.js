// Cat Me If You Can – kleine SVG-Diagramme ohne Bibliothek.
// Regeln: eine Achse, dünne Balken (≤ 24 px) mit 4 px Rundung am Datenende, Haarlinien-Raster,
// sparsame Direktbeschriftung, Hover-/Touch-Tooltip auf jedem Balken/Punkt, Tabellenansicht.
// Farben kommen aus CSS-Variablen (--series-1, Statusfarben) → Hell/Dunkel automatisch.

import { esc, fmtNum } from './ui.js';

let tip = null;
function showTip(text, x, y) {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.append(tip);
  }
  tip.textContent = text; // Tooltip-Texte sind reiner Text – nie als HTML einsetzen
  tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
  const top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
function hideTip() {
  if (tip) tip.style.display = 'none';
}

/** Hängt Hover/Touch-Tooltips an alle [data-tip]-Elemente im SVG. */
function bindTips(root) {
  const move = (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return hideTip();
    const pt = e.touches ? e.touches[0] : e;
    showTip(el.getAttribute('data-tip'), pt.clientX, pt.clientY);
  };
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerdown', move);
  root.addEventListener('pointerleave', hideTip);
}

let measureCtx = null;
function textWidth(str, font = '12px system-ui, sans-serif') {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = font;
  return measureCtx.measureText(str).width;
}
/** Kürzt einen Text mit „…“, bis er in maxW Pixel passt. */
function fitText(str, maxW) {
  if (textWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && textWidth(`${s}…`) > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
};

/** Rechteck mit 4 px Rundung nur am Datenende (oben bzw. rechts). */
function barPath(x, y, w, h, dir) {
  const r = Math.min(4, dir === 'up' ? w / 2 : h / 2, dir === 'up' ? h : w);
  if (h <= 0 || w <= 0) return '';
  if (dir === 'up') return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

/**
 * Säulen (eine Reihe). data: [{label, value, tip}]; opts: {height, every (Achsenbeschriftung), unit}
 */
export function columnChart(el, data, { height = 180, every = 1, color = 'var(--series-1)', unit = '' } = {}) {
  const W = Math.max(280, el.clientWidth || 320);
  const H = height;
  const m = { l: 34, r: 8, t: 14, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const band = iw / data.length;
  const bw = Math.min(24, Math.max(3, band - 2));
  const ticks = [0, max / 2, max];
  let maxIdx = 0;
  data.forEach((d, i) => {
    if (d.value > data[maxIdx].value) maxIdx = i;
  });
  const parts = [];
  for (const tv of ticks) {
    const y = m.t + ih - (tv / max) * ih;
    parts.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" class="grid"/>`);
    parts.push(`<text x="${m.l - 6}" y="${y + 4}" class="tick" text-anchor="end">${fmtNum(tv)}</text>`);
  }
  data.forEach((d, i) => {
    const x = m.l + i * band + (band - bw) / 2;
    const h = (d.value / max) * ih;
    const y = m.t + ih - h;
    const tipHtml = esc(d.tip || `${d.label}: ${fmtNum(d.value)}${unit}`);
    parts.push(`<rect x="${m.l + i * band}" y="${m.t}" width="${band}" height="${ih}" fill="transparent" data-tip="${tipHtml}"/>`);
    if (h > 0) parts.push(`<path d="${barPath(x, y, bw, h, 'up')}" fill="${color}" data-tip="${tipHtml}"/>`);
    if (i % every === 0 || i === data.length - 1) parts.push(`<text x="${x + bw / 2}" y="${H - 8}" class="tick" text-anchor="middle">${esc(d.short || d.label)}</text>`);
    if (i === maxIdx && d.value > 0) parts.push(`<text x="${x + bw / 2}" y="${y - 4}" class="val" text-anchor="middle">${fmtNum(d.value)}</text>`);
  });
  parts.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}" class="axis"/>`);
  el.innerHTML = `<svg class="viz" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img">${parts.join('')}</svg>`;
  bindTips(el);
}

/**
 * Waagrechte Balken. rows: [{label, value, color?, icon?}] – Wert steht am Balkenende.
 */
export function hbarChart(el, rows, { color = 'var(--series-1)', unit = '', total = null } = {}) {
  const W = Math.max(280, el.clientWidth || 320);
  const rowH = 30;
  const longest = Math.max(...rows.map((r) => textWidth(`${r.icon ? `${r.icon} ` : ''}${r.label}`)));
  const labelW = Math.round(Math.min(W * 0.46, longest + 14));
  const H = rows.length * rowH + 6;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const iw = W - labelW - 56;
  const parts = [];
  rows.forEach((r, i) => {
    const y = i * rowH + 4;
    const bw = (r.value / max) * iw;
    const pct = total ? ` (${Math.round((r.value / total) * 100)} %)` : '';
    const tipHtml = esc(`${r.label}: ${fmtNum(r.value)}${unit}${pct}`);
    parts.push(`<rect x="0" y="${y}" width="${W}" height="${rowH - 2}" fill="transparent" data-tip="${tipHtml}"/>`);
    const text = fitText(`${r.icon ? `${r.icon} ` : ''}${r.label}`, labelW - 10);
    parts.push(`<text x="${labelW - 8}" y="${y + rowH / 2 + 3}" class="lbl" text-anchor="end">${esc(text)}</text>`);
    if (bw > 0) parts.push(`<path d="${barPath(labelW, y + (rowH - 16) / 2 - 1, bw, 16, 'right')}" fill="${r.color || color}" data-tip="${tipHtml}"/>`);
    parts.push(`<text x="${labelW + bw + 6}" y="${y + rowH / 2 + 3}" class="val">${fmtNum(r.value)}</text>`);
  });
  parts.push(`<line x1="${labelW}" x2="${labelW}" y1="0" y2="${H}" class="axis"/>`);
  el.innerHTML = `<svg class="viz" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img">${parts.join('')}</svg>`;
  bindTips(el);
}

/**
 * Linie (eine Reihe) mit Punkten, feste y-Skala (z. B. BCS 1–9). points: [{x: Zeit, y, tip}]
 */
export function lineChart(el, points, { yMin = 1, yMax = 9, height = 160, color = 'var(--series-1)', band = null } = {}) {
  const W = Math.max(280, el.clientWidth || 320);
  const H = height;
  const m = { l: 26, r: 12, t: 12, b: 22 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const xs = points.map((p) => p.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const sx = (x) => (x1 === x0 ? m.l + iw / 2 : m.l + ((x - x0) / (x1 - x0)) * iw);
  const sy = (y) => m.t + ih - ((y - yMin) / (yMax - yMin)) * ih;
  const parts = [];
  if (band) parts.push(`<rect x="${m.l}" y="${sy(band[1])}" width="${iw}" height="${sy(band[0]) - sy(band[1])}" class="okband"/>`);
  for (const tv of [yMin, Math.round((yMin + yMax) / 2), yMax]) {
    parts.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${sy(tv)}" y2="${sy(tv)}" class="grid"/>`);
    parts.push(`<text x="${m.l - 6}" y="${sy(tv) + 4}" class="tick" text-anchor="end">${tv}</text>`);
  }
  const pts = points.filter((p) => Number.isFinite(p.y));
  if (pts.length > 1) parts.push(`<polyline points="${pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
  for (const p of pts) {
    parts.push(`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="12" fill="transparent" data-tip="${esc(p.tip || String(p.y))}"/>`);
    parts.push(`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="2" data-tip="${esc(p.tip || String(p.y))}"/>`);
  }
  const lastP = pts[pts.length - 1];
  if (lastP) parts.push(`<text x="${Math.min(W - m.r - 4, sx(lastP.x) + 8)}" y="${sy(lastP.y) - 8}" class="val" text-anchor="end">${lastP.y}</text>`);
  el.innerHTML = `<svg class="viz" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img">${parts.join('')}</svg>`;
  bindTips(el);
}

/** Einfache Tabelle als Alternative zur Grafik. */
export function tableHtml(headers, rows) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c ?? '–')}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}
