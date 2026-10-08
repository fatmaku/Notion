// Cat Me If You Can – öffentlicher Monatsbericht „Straßenkatzen von Kadıköy“ (report.html).
// Für Presse, Tierschutz und Stadtverwaltung: Kennzahlen mit Vormonat, Hilfe-Fälle, Diagramme,
// Mahalle-Tabelle, Datenlage, ehrliche Methodik, offene Daten, Teilen, Drucken (A4, css/report.css).
//
// Daten: GET /api/report?month=YYYY-MM (server/report.js). Ohne Server (statisch gehostet) oder mit
// ?demo=1 rechnet die Spiel-Engine im Browser mit den Demo-Daten (api.js, Demo-Modus) – dann steht
// überall „Demo“. Sprache: ?lang=…, sonst die gespeicherte (wie App und Startseite).
// Keine Koordinaten, keine Spitznamen: der Bericht enthält nur Summen je Monat und Mahalle.

import { RemoteApi, createLocalApi } from './api.js';
import { t, L, getLang, setLang, LANGS, LANG_INFO, locale } from './i18n.js';
import { esc, bdi, isolate, fmtNum, pct, sep, toast, errorText } from './ui.js';
import { columnChart, hbarChart, tableHtml } from './charts.js';
import { copyLink } from './share.js'; // wie in der App: Zwischenablage, sonst Dialog mit Link und „Schließen“
import { AGE_GROUPS, BCS_CLASSES, SEVERITY, CONDITION_TAGS } from '../core/taxonomy.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const SEV_COLOR = { none: 'var(--good)', mild: 'var(--warning)', attention: 'var(--serious)', urgent: 'var(--critical)' };
const SEV_ICON = { none: '✓', mild: '!', attention: '⚠', urgent: '🆘' };

const params = new URLSearchParams(location.search);
const state = { api: null, demo: false, local: false, data: null, badMonth: false, charts: [] };

// ---------------------------------------------------------------- Formate (immer gregorianisch)

const loc = () => `${locale()}-u-ca-gregory`;
const capFirst = (s) => (s ? s.charAt(0).toLocaleUpperCase(getLang()) + s.slice(1) : s);
const utcMid = (m, d = 15) => Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, d, 12);

/** „September 2026“ (fa: „سپتامبر ۲۰۲۶“ – gregorianisch, denn so zählen die Monate). */
function monthName(m, { year = true } = {}) {
  const f = new Intl.DateTimeFormat(loc(), { month: 'long', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  return f.format(utcMid(m));
}

/** „8. Oktober“ aus 'YYYY-MM-DD'. */
function dayName(day) {
  return new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12)).replace(/ /g, '\u00a0'); // „8 October“ nicht umbrechen
}

function stamp(ts) {
  return new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(ts);
}

function addMonths(m, n) {
  const i = Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1 + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

const valueText = (v, kind) => (v == null ? '–' : kind === 'pct' ? pct(v) : fmtNum(v));

// ---------------------------------------------------------------- Bausteine

function langSelect() {
  return `<label class="mr-lang"><span class="mr-sr">${esc(t('mr.lang'))}</span>
    <select data-lang aria-label="${esc(t('mr.lang'))}">${LANGS.map((l) => `<option value="${l}" lang="${l}" ${l === getLang() ? 'selected' : ''}>${esc(LANG_INFO[l].name)}</option>`).join('')}</select></label>`;
}

function picker(d) {
  const list = d.months.map((x) => x.month);
  if (!list.includes(d.month)) list.push(d.month);
  list.sort().reverse();
  const first = list[list.length - 1];
  const prevOk = d.month > first;
  const nextOk = d.month < d.currentMonth;
  return `<div class="mr-picker no-print" role="group" aria-label="${esc(t('mr.month'))}">
    <button type="button" class="mr-step" data-step="-1" ${prevOk ? '' : 'disabled'} aria-label="${esc(t('mr.prev'))}" title="${esc(t('mr.prev'))}"><span class="dir-ic" aria-hidden="true">‹</span></button>
    <label class="mr-month"><span class="mr-sr">${esc(t('mr.month'))}</span>
      <select data-month>${list.map((m) => `<option value="${esc(m)}" ${m === d.month ? 'selected' : ''}>${esc(capFirst(monthName(m)))}</option>`).join('')}</select></label>
    <button type="button" class="mr-step" data-step="1" ${nextOk ? '' : 'disabled'} aria-label="${esc(t('mr.next'))}" title="${esc(t('mr.next'))}"><span class="dir-ic" aria-hidden="true">›</span></button>
  </div>`;
}

function masthead(d) {
  const notes = [];
  if (state.demo) notes.push(`<p class="mr-note demo" data-demo-note>🧪 ${esc(t('mr.demo'))}</p>`);
  if (state.badMonth) notes.push(`<p class="mr-note warn" data-bad-month>${esc(t('mr.badMonth', { month: isolate(monthName(d.month)) }))}</p>`);
  if (d.partial) notes.push(`<p class="mr-note" data-partial>⏳ ${esc(t('mr.partial', { date: isolate(dayName(d.throughDay)) }))}</p>`);
  return `<section class="mr-mast">
    <p class="mr-kicker">${esc(t('mr.kicker'))}</p>
    <h1 class="mr-h1">${esc(t('mr.title'))}</h1>
    <p class="mr-monthline" data-month-label>${esc(capFirst(monthName(d.month)))}</p>
    <p class="mr-lead">${esc(t('mr.lead'))}</p>
    ${picker(d)}
    ${notes.join('')}
  </section>`;
}

const KPIS = [
  ['cats', 'stats.cats'],
  ['newCats', 'mr.k.new'],
  ['observations', 'stats.obs'],
  ['players', 'mr.k.players'],
  ['tnrPct', 'stats.tnr', 'pct'],
  ['reports', 'mr.k.reports'],
  ['helpOpened', 'mr.k.opened'],
  ['helpOpen', 'mr.k.open'],
];

function kpis(d) {
  const prev = d.previous && d.previous.hasData ? d.previous : null;
  const prevName = prev ? capFirst(monthName(prev.month, { year: false })) : '';
  const tiles = KPIS.map(([key, label, kind]) => {
    const v = d.totals[key];
    let delta = '';
    if (prev) {
      const p = prev.totals[key];
      const dir = v == null || p == null ? '' : v > p ? 'up' : v < p ? 'down' : 'same';
      const arrow = { up: '▲', down: '▼', same: '=' }[dir] || '';
      delta = `<span class="mr-kpi-d ${dir}">${arrow ? `<b aria-hidden="true">${arrow}</b> ` : ''}${esc(t('mr.was', { month: prevName, v: isolate(valueText(p, kind)) }))}</span>`;
    }
    const sub = key === 'tnrPct' && d.totals.tnrKnown ? `<span class="mr-kpi-s">${esc(t('stats.tnrKnown', { n: d.totals.tnrKnown }))}</span>` : '';
    return `<div class="mr-kpi" data-kpi="${key}"><span class="mr-kpi-l">${esc(t(label))}</span><b class="mr-kpi-v">${esc(valueText(v, kind))}</b>${sub}${delta}</div>`;
  });
  const noPrev = !prev ? `<p class="mr-small muted" data-no-prev>${esc(t('mr.noPrev', { month: isolate(monthName(d.previous.month)) }))}</p>` : '';
  return `<section class="mr-kpis" aria-label="${esc(t('mr.kicker'))}">${tiles.join('')}</section>${noPrev}`;
}

function helpCard(d) {
  const h = d.help;
  const big = (n, label, key) => `<div class="mr-hnum" data-help="${key}"><b>${esc(fmtNum(n))}</b><span>${esc(label)}</span></div>`;
  const rows = [
    ['toCare', 'mr.help.care', h.toCare],
    ['resolved', 'mr.help.fine', h.resolved],
    ['adopted', 'mr.help.adopted', h.adopted],
    ...(h.died ? [['died', 'mr.help.died', h.died]] : []),
    ['inCare', d.partial ? 'mr.help.inCareNow' : 'mr.help.inCare', h.inCare],
  ];
  const none = !h.opened && !h.helped && !h.open ? `<p class="muted mr-small">${esc(t('mr.help.none'))}</p>` : '';
  return `<section class="card mr-sec mr-help" data-sec="help">
    <h2>🩺 ${esc(t('mr.s.help'))}</h2>
    <p class="mr-small muted">${esc(t('mr.help.lead'))}</p>
    <div class="mr-hnums">${big(h.opened, t('mr.help.opened'), 'opened')}${big(h.helped, t('mr.help.helped'), 'helped')}${big(h.open, t(d.partial ? 'mr.help.openNow' : 'mr.help.open'), 'open')}</div>
    ${none}
    <ul class="mr-outcomes">${rows.map(([k, label, n]) => `<li data-outcome="${k}"><span>${esc(t(label))}</span><b>${esc(fmtNum(n))}</b></li>`).join('')}</ul>
  </section>`;
}

/** Diagramm-Karte mit Umschalter Grafik/Tabelle (wie in der Statistik der App). */
function vizCard(key, title, note = '') {
  return `<section class="card mr-sec viz-card" data-viz="${key}">
    <header><h2>${esc(title)}</h2><button type="button" class="link small mr-toggle no-print" data-toggle aria-pressed="false">${esc(t('stats.table'))}</button></header>
    ${note ? `<p class="mr-small muted">${esc(note)}</p>` : ''}
    <div data-chart></div><div data-table hidden></div></section>`;
}

function chartDefs(d) {
  const cats = d.totals.cats;
  const keysWith = (table, map, { keepUnknown = false } = {}) => Object.keys(table).filter((k) => k !== 'unknown' || keepUnknown || map[k]);
  const empty = (el) => {
    el.innerHTML = `<p class="muted mr-small">${esc(t('mr.none'))}</p>`;
  };
  return {
    reports: {
      draw: (el) => {
        const rows = Object.keys(CONDITION_TAGS).filter((k) => d.reports[k]).sort((a, b) => d.reports[b] - d.reports[a]).map((k) => ({ label: L(CONDITION_TAGS, k), icon: CONDITION_TAGS[k].icon, value: d.reports[k] }));
        if (rows.length) hbarChart(el, rows);
        else empty(el);
      },
      table: () => tableHtml([t('mr.s.reports'), t('mr.k.reports')], Object.keys(CONDITION_TAGS).map((k) => [`${CONDITION_TAGS[k].icon} ${L(CONDITION_TAGS, k)}`, fmtNum(d.reports[k] || 0)])),
    },
    health: {
      draw: (el) => hbarChart(el, Object.keys(SEVERITY).map((k) => ({ label: L(SEVERITY, k), icon: SEV_ICON[k], value: d.severity[k] || 0, color: SEV_COLOR[k] })), { total: cats }),
      table: () => tableHtml([t('stats.health'), t('stats.col.cats')], Object.keys(SEVERITY).map((k) => [`${SEV_ICON[k]} ${L(SEVERITY, k)}`, fmtNum(d.severity[k] || 0)])),
    },
    bcs: {
      draw: (el) => hbarChart(el, keysWith(BCS_CLASSES, d.bcs).map((k) => ({ label: L(BCS_CLASSES, k), value: d.bcs[k] || 0 })), { total: cats }),
      table: () => tableHtml([t('stats.bcsDist'), t('stats.col.cats')], Object.keys(BCS_CLASSES).map((k) => [L(BCS_CLASSES, k), fmtNum(d.bcs[k] || 0)])),
    },
    ages: {
      draw: (el) => hbarChart(el, keysWith(AGE_GROUPS, d.ages).map((k) => ({ label: L(AGE_GROUPS, k), value: d.ages[k] || 0 })), { total: cats }),
      table: () => tableHtml([t('stats.ages'), t('stats.col.cats')], Object.keys(AGE_GROUPS).map((k) => [L(AGE_GROUPS, k), fmtNum(d.ages[k] || 0)])),
    },
    perDay: {
      draw: (el) => columnChart(el, d.perDay.map((x) => ({
        label: x.day,
        short: fmtNum(Number(x.day.slice(8))),
        value: x.observations,
        tip: `${dayName(x.day)}${sep()}${t('stats.obs')}: ${fmtNum(x.observations)}${sep()}${t('mr.k.new')}: ${fmtNum(x.newCats)}`,
      })), { every: 5 }),
      table: () => tableHtml(['📅', t('stats.obs'), t('mr.k.new')], d.perDay.map((x) => [dayName(x.day), fmtNum(x.observations), fmtNum(x.newCats)])),
    },
  };
}

/** Mahalle-Zeilen: mit Fotos – oder mit offenen Hilfe-Fällen/Meldungen, auch ohne neue Fotos. */
function districtRows(d) {
  return d.districts
    .filter((x) => x.coverage !== 'none' || x.needsHelp || x.hungry)
    .sort((a, b) => b.cats - a.cats || b.needsHelp - a.needsHelp || a.name.localeCompare(b.name, 'tr'));
}

function districtsCard(d) {
  const rows = districtRows(d);
  const low = (x) => x.coverage !== 'ok';
  const body = rows.map((x) => `<tr data-district="${esc(x.id)}"><td><bdi>${esc(x.name)}</bdi>${low(x) ? ` <span class="mr-low" title="${esc(t('mr.cov.low'))}" aria-label="${esc(t('mr.cov.low'))}">○</span>` : ''}</td>
    <td class="num">${esc(fmtNum(x.cats))}</td><td class="num${x.needsHelp ? ' mr-hot' : ' mr-zero'}">${esc(fmtNum(x.needsHelp))}</td><td class="num${x.hungry ? '' : ' mr-zero'}">${esc(fmtNum(x.hungry))}</td><td class="num">${x.tnrPct == null ? '–' : esc(pct(x.tnrPct))}</td></tr>`).join('');
  return `<section class="card mr-sec mr-districts" data-sec="districts">
    <h2>📍 ${esc(t('mr.s.districts'))}</h2>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl mr-tbl">
      <thead><tr><th scope="col">${esc(t('stats.col.district'))}</th><th scope="col">${esc(t('stats.col.cats'))}</th><th scope="col">${esc(t('mr.col.help'))}</th><th scope="col">${esc(t('mr.col.hungry'))}</th><th scope="col">${esc(t('stats.col.tnr'))}</th></tr></thead>
      <tbody>${body}</tbody></table></div>` : `<p class="muted mr-small">${esc(t('mr.none'))}</p>`}
    <p class="mr-small muted">${esc(t('mr.lowNote', { n: d.method.lowDataPhotos }))}</p>
    <p class="mr-small muted">${esc(t('mr.minNote', { n: d.method.minSample }))}</p>
  </section>`;
}

function coverageCard(d) {
  const c = d.coverage;
  const names = (ids) => ids.map((id) => d.districts.find((x) => x.id === id)).filter(Boolean).map((x) => bdi(x.name)).join(getLang() === 'fa' || getLang() === 'ar' ? '، ' : ', ');
  const item = (txt) => `<li>${txt}</li>`;
  return `<section class="card mr-sec mr-coverage" data-sec="coverage">
    <h2>🔎 ${esc(t('mr.s.coverage'))}</h2>
    <ul class="mr-facts">
      ${item(esc(t('mr.cov.days', { n: c.daysWithData, total: c.days })))}
      ${item(esc(t('mr.cov.areas', { n: c.districtsWithData, total: c.districtsTotal })))}
      ${c.aiAssessedPct == null ? '' : item(esc(t('mr.cov.ai', { pct: pct(c.aiAssessedPct) })))}
      ${c.earKnownPct == null ? '' : item(esc(t('mr.cov.ears', { pct: pct(c.earKnownPct) })))}
    </ul>
    ${c.low.length ? `<p class="mr-small"><b>○ ${esc(t('mr.cov.low'))}</b> ${names(c.low)}</p>` : ''}
    ${c.none.length ? `<p class="mr-small"><b>${esc(t('mr.cov.none'))}</b> ${names(c.none)}</p>` : ''}
  </section>`;
}

function methodCard(d) {
  return `<section class="mr-method" data-sec="method">
    <h2>📏 ${esc(t('mr.s.method'))}</h2>
    <ul>${['mr.m1', 'mr.m2', 'mr.m3', 'mr.m4', 'mr.m5', 'mr.m6', 'mr.m7', 'mr.m8'].map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>
    <p class="mr-small mr-cite">${esc(t('mr.cite', { month: isolate(monthName(d.month)) }))}${sep()}${esc(t('mr.asOf', { date: isolate(stamp(d.generatedAt)) }))}</p>
  </section>`;
}

function dataCard(d) {
  const live = !state.local;
  const lang = getLang();
  return `<section class="card mr-sec mr-data" data-sec="data">
    <h2>📂 ${esc(t('mr.s.data'))}</h2>
    <p class="mr-small muted">${esc(t('mr.dl.lead'))}</p>
    <ul class="mr-links">
      ${live ? `<li><a href="api/export/cats.csv?lang=${esc(lang)}" download data-dl="csv">${esc(t('mr.dl.csv'))}</a></li>
      <li><a href="api/export/cats.geojson" download data-dl="geojson">${esc(t('mr.dl.geojson'))}</a></li>
      <li><a href="api/report?month=${esc(d.month)}" data-dl="json">${esc(t('mr.dl.json'))}</a></li>` : ''}
      <li class="no-print"><button type="button" class="link" data-dl="table">${esc(t('mr.dl.table'))}</button></li>
    </ul>
    <p class="mr-small muted">${esc(live ? t('map.fuzzy') : t('mr.dl.demo'))}</p>
  </section>`;
}

function actions() {
  return `<div class="mr-actions no-print">
    <button type="button" class="btn primary" data-share>📤 ${esc(t('mr.share'))}</button>
    <button type="button" class="btn" data-copy>🔗 ${esc(t('share.copy'))}</button>
    <button type="button" class="btn" data-print>🖨️ ${esc(t('mr.print'))}</button>
  </div>`;
}

function footer() {
  const play = state.local ? 'app.html?demo=1' : 'app.html';
  return `<footer class="mr-foot">
    <p class="mr-foot-links"><a class="btn primary" href="${play}">${esc(t('mr.play'))} <span class="dir-ic" aria-hidden="true">→</span></a> <a href="./">${esc(t('cp.what'))}</a></p>
    <p class="mr-maker">${esc(t('brand.maker'))}</p>
    <p class="mr-url print-only" dir="ltr">${esc(shareUrl())}</p>
  </footer>`;
}

// ---------------------------------------------------------------- Seite

function shareUrl() {
  const q = new URLSearchParams();
  if (state.data) q.set('month', state.data.month);
  q.set('lang', getLang());
  if (params.get('demo') === '1') q.set('demo', '1');
  return `${location.origin}${location.pathname}?${q}`;
}

function remember() {
  const q = new URLSearchParams(location.search);
  if (state.data) q.set('month', state.data.month);
  q.set('lang', getLang());
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function header() {
  const top = document.querySelector('.mr-top');
  top.querySelector('.brand').setAttribute('aria-label', 'Cat Me If You Can');
  for (const el of top.querySelectorAll('[data-demo-chip], .mr-lang')) el.remove();
  top.insertAdjacentHTML('beforeend', `${state.demo ? `<span class="chip demo" data-demo-chip title="${esc(t('mr.demo'))}">${esc(t('common.demo'))}</span>` : ''}${langSelect()}`);
  top.querySelector('[data-lang]').addEventListener('change', (e) => {
    setLang(e.target.value);
    remember();
    render();
    const again = document.querySelector('[data-lang]');
    if (again) again.focus();
  });
}

function drawCharts() {
  for (const c of state.charts) {
    if (!c.chartEl.hidden) c.def.draw(c.chartEl);
  }
}

function render() {
  const d = state.data;
  document.title = `${t('mr.title')} · ${capFirst(monthName(d.month))} · Cat Me If You Can`;
  header();
  const view = document.querySelector('#view');
  const body = d.hasData ? `
    ${helpCard(d)}
    <div class="mr-grid2">
      ${vizCard('reports', t('mr.s.reports'))}
      ${vizCard('health', t('mr.s.health'), t('mr.chartNote'))}
      ${vizCard('bcs', t('mr.s.body'), t('mr.chartNote'))}
      ${vizCard('ages', t('mr.s.ages'), t('mr.chartNote'))}
    </div>
    ${vizCard('perDay', t('mr.s.perDay'))}
    ${districtsCard(d)}
    ${coverageCard(d)}`
    : `<section class="card empty mr-empty" data-empty><div class="big-emoji" aria-hidden="true">📷</div><p><b>${esc(t('mr.empty'))}</b></p><p class="muted">${esc(t('mr.emptyHint'))}</p></section>
    ${d.help.open || d.help.opened ? helpCard(d) : ''}`;
  view.innerHTML = `
    ${masthead(d)}
    ${d.hasData ? kpis(d) : ''}
    ${body}
    ${methodCard(d)}
    ${dataCard(d)}
    ${actions()}
    ${footer()}`;

  // Diagramme + Umschalter Grafik/Tabelle
  const defs = chartDefs(d);
  state.charts = [];
  for (const card of view.querySelectorAll('[data-viz]')) {
    const def = defs[card.dataset.viz];
    const chartEl = card.querySelector('[data-chart]');
    const tableEl = card.querySelector('[data-table]');
    def.draw(chartEl);
    state.charts.push({ def, chartEl });
    card.querySelector('[data-toggle]').addEventListener('click', (e) => {
      const showTable = tableEl.hidden;
      tableEl.hidden = !showTable;
      chartEl.hidden = showTable;
      if (showTable && !tableEl.innerHTML) tableEl.innerHTML = def.table();
      if (!showTable) def.draw(chartEl);
      e.currentTarget.textContent = t(showTable ? 'stats.chart' : 'stats.table');
      e.currentTarget.setAttribute('aria-pressed', String(showTable));
    });
  }

  // Monatsauswahl
  const sel = view.querySelector('[data-month]');
  sel.addEventListener('change', () => go(sel.value, '[data-month]'));
  for (const b of view.querySelectorAll('[data-step]')) {
    b.addEventListener('click', () => go(addMonths(d.month, Number(b.dataset.step)), `[data-step="${b.dataset.step}"]`));
  }

  view.querySelector('[data-share]').addEventListener('click', share);
  view.querySelector('[data-copy]').addEventListener('click', () => copyLink(shareUrl()));
  view.querySelector('[data-print]').addEventListener('click', () => window.print());
  const tbl = view.querySelector('[data-dl="table"]');
  if (tbl) tbl.addEventListener('click', downloadTable);
  document.body.dataset.ready = '1';
}

async function go(month, focusSel) {
  if (!MONTH_RE.test(month) || (state.data && month === state.data.month)) return;
  const view = document.querySelector('#view');
  view.setAttribute('aria-busy', 'true');
  for (const el of view.querySelectorAll('.mr-picker button, .mr-picker select')) el.disabled = true;
  try {
    await load(month);
    remember();
    render();
  } catch (e) {
    toast(errorText(e), { type: 'error' });
    render();
  } finally {
    view.removeAttribute('aria-busy');
  }
  const again = focusSel && document.querySelector(focusSel);
  if (again && !again.disabled) again.focus();
  else document.querySelector('[data-month]')?.focus();
}

// ---------------------------------------------------------------- Teilen, Kopieren, Herunterladen

async function share() {
  const d = state.data;
  const url = shareUrl();
  const text = t('mr.shareText', { month: monthName(d.month) });
  if (navigator.share) {
    try {
      await navigator.share({ title: t('mr.title'), text, url });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  copyLink(url);
}

function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // keine Formeln in Tabellenprogrammen
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Mahalle-Tabelle als CSV (im Browser erzeugt – geht auch im Demo ohne Server). */
function downloadTable() {
  const d = state.data;
  const head = ['month', 'district_id', 'district', 'cats', 'photos', 'needs_help_at_month_end', 'hungry_reports', 'neutered_pct', 'cats_with_ears_visible', 'data'];
  const lines = [head.join(',')];
  for (const x of d.districts) lines.push([d.month, x.id, x.name, x.cats, x.observations, x.needsHelp, x.hungry, x.tnrPct ?? '', x.tnrKnown, x.coverage].map(csvCell).join(','));
  const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catmeifyoucan-report-${d.month}-districts${state.demo ? '-demo' : ''}.csv`;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

// ---------------------------------------------------------------- Daten

async function chooseApi() {
  if (params.get('demo') === '1') return { api: await createLocalApi(), demo: true, local: true };
  const remote = new RemoteApi();
  try {
    const h = await remote.health();
    if (!h || h.ok !== true) throw new Error('no server'); // statischer Host liefert HTML statt JSON
    return { api: remote, demo: !!h.demo, local: false };
  } catch (e) {
    // Ohne Netz keine Demo-Zahlen unterschieben – lieber ehrlich „keine Verbindung“
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw e;
    return { api: await createLocalApi(), demo: true, local: true };
  }
}

async function load(month) {
  state.badMonth = false;
  try {
    state.data = await state.api.report(month || undefined);
  } catch (e) {
    if (!(month && e && (e.code === 'invalid_month' || e.status === 400))) throw e;
    state.badMonth = true; // z. B. alter Link mit Zukunftsmonat → Standardmonat zeigen
    state.data = await state.api.report();
  }
  if (state.data.demo) state.demo = true;
}

function showError(e) {
  const view = document.querySelector('#view');
  view.innerHTML = `<div class="empty"><div class="big-emoji" aria-hidden="true">😿</div><p>${esc(errorText(e))}</p><button type="button" class="btn" data-retry>${esc(t('common.retry'))}</button></div>`;
  view.querySelector('[data-retry]').addEventListener('click', () => location.reload());
}

async function boot() {
  const l = params.get('lang');
  setLang(LANGS.includes(l) ? l : getLang());
  const chosen = await chooseApi();
  Object.assign(state, chosen);
  const m = params.get('month');
  await load(m && MONTH_RE.test(m) ? m : m ? 'invalid' : null);
  remember();
  render();
  // Drucken: Diagramme in Druckbreite neu zeichnen, danach wieder in Bildschirmbreite
  window.addEventListener('beforeprint', () => {
    document.body.classList.add('mr-printing');
    drawCharts();
  });
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('mr-printing');
    drawCharts();
  });
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(drawCharts, 150);
  });
}

boot().catch((e) => {
  try {
    showError(e && e.code ? e : { code: navigator.onLine === false ? 'network' : 'generic' });
  } catch {
    document.body.textContent = String((e && e.message) || e);
  }
});
