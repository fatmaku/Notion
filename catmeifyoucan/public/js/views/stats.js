// Cat Me If You Can – „Kadıköy“: Zensus der Straßenkatzen (Kennzahlen, Diagramme, Mahalle),
// Ranglisten (XP · Entdeckungen · Katzen) und Hilfe-Radar.

import { t, L } from '../i18n.js';
import { esc, bdi, fmtNum, pct, catImg, statusChip, severityChip, fmtAgo, catName } from '../ui.js';
import { columnChart, hbarChart, tableHtml } from '../charts.js';
import { PATTERNS, AGE_GROUPS, SEVERITY, BCS_CLASSES, HEALTH_FLAGS, CONDITION_TAGS } from '../../core/taxonomy.js';
import { conditionText } from './condition.js';

const SEV_COLOR = { none: 'var(--good)', mild: 'var(--warning)', attention: 'var(--serious)', urgent: 'var(--critical)' };
const SEV_ICON = { none: '✓', mild: '!', attention: '⚠', urgent: '🆘' };

function tile(label, value, sub = '') {
  return `<div class="stat"><span class="stat-l">${esc(label)}</span><b class="stat-v">${esc(value)}</b>${sub ? `<span class="stat-s">${esc(sub)}</span>` : ''}</div>`;
}

/** Diagramm-Karte mit Umschalter Grafik/Tabelle. */
function vizCard(key, title) {
  return `<section class="card viz-card" data-viz="${key}">
    <header><h2>${esc(title)}</h2><button class="link small" data-toggle>${esc(t('stats.table'))}</button></header>
    <div data-chart></div><div data-table hidden></div></section>`;
}

export async function renderStats(view, app, params) {
  const s = await app.api.stats();
  const tt = s.totals;
  view.innerHTML = `
    <h1 class="pad-x">${esc(t('stats.title'))}</h1>
    <div class="stats-grid">
      ${tile(t('stats.cats'), fmtNum(tt.cats), t('stats.new7d', { n: tt.newCats7d || 0 }))}
      ${tile(t('stats.seen7'), fmtNum(tt.seen7d))}
      ${tile(t('stats.help'), fmtNum(tt.needsHelp), tt.inCare ? `🩺 ${fmtNum(tt.inCare)}` : '')}
      ${tile(t('stats.tnr'), tt.tnrPct == null ? '–' : pct(tt.tnrPct), tt.tnrKnown ? t('stats.tnrKnown', { n: tt.tnrKnown }) : '')}
      ${tile(t('stats.bcs'), tt.avgBcs == null ? '–' : fmtNum(tt.avgBcs))}
      ${tile(t('stats.obs'), fmtNum(tt.observations))}
      ${tile(t('stats.active'), fmtNum(tt.activePlayersToday))}
      ${tile(t('stats.fed'), fmtNum(tt.fed30d || 0))}
      ${tile(t('stats.hungry'), fmtNum(tt.hungry7d || 0))}
      ${tile(t('stats.vouchers'), fmtNum(tt.vouchersRedeemed))}
    </div>
    ${vizCard('perDay', t('stats.perDay'))}
    ${vizCard('health', t('stats.health'))}
    ${vizCard('reports', t('stats.reports'))}
    ${vizCard('patterns', t('stats.patterns'))}
    ${vizCard('bcs', t('stats.bcsDist'))}
    ${vizCard('ages', t('stats.ages'))}
    ${vizCard('flags', t('stats.flags'))}
    ${vizCard('hours', t('stats.hours'))}
    <section class="card"><h2>${esc(t('stats.districts'))}</h2><div data-districts></div></section>
    <section class="card" id="leaderboard"><h2>🏆 ${esc(t('stats.leaderboard'))}</h2>
      <div class="seg small" data-period>${['day', 'week', 'all'].map((p) => `<button data-p="${p}" class="${p === 'week' ? 'on' : ''}">${esc(t(`lb.${p}`))}</button>`).join('')}</div>
      <div class="seg small" data-metric>${['xp', 'discoveries', 'cats'].map((m) => `<button data-m="${m}" class="${m === 'xp' ? 'on' : ''}">${esc(t(`lb.${m}`))}</button>`).join('')}</div>
      <ol class="rank" data-lb></ol>
    </section>
    <section class="card" id="help"><h2>🆘 ${esc(t('stats.helpRadar'))}</h2><div data-help></div></section>
    ${app.api.isDemo ? '' : `<section class="card"><h2>${esc(t('stats.export'))}</h2>
      <p class="small"><a href="/api/export/cats.csv?lang=${esc(app.lang())}" download>⬇ CSV</a> · <a href="/api/export/cats.geojson" download>⬇ GeoJSON</a></p>
      <p class="small muted">${esc(t('map.fuzzy'))}</p></section>`}`;

  const charts = {
    perDay: {
      draw: (el) => columnChart(el, s.perDay.map((d) => ({ label: d.day, short: d.day.slice(8), value: d.observations, tip: `${d.day}: ${fmtNum(d.observations)} · +${fmtNum(d.newCats)} 🔭 · ${fmtNum(d.players)} 👤` })), { every: 5 }),
      table: () => tableHtml([t('stats.perDay'), t('stats.obs'), '🔭', '👤'], s.perDay.map((d) => [d.day, d.observations, d.newCats, d.players])),
    },
    health: {
      draw: (el) => hbarChart(el, Object.keys(SEVERITY).map((k) => ({ label: L(SEVERITY, k), icon: SEV_ICON[k], value: s.severity[k] || 0, color: SEV_COLOR[k] })), { total: tt.cats }),
      table: () => tableHtml([t('stats.health'), t('stats.col.cats')], Object.keys(SEVERITY).map((k) => [`${SEV_ICON[k]} ${L(SEVERITY, k)}`, s.severity[k] || 0])),
    },
    reports: {
      draw: (el) => {
        const rows = Object.keys(CONDITION_TAGS).filter((k) => (s.reports || {})[k]).sort((a, b) => s.reports[b] - s.reports[a]).map((k) => ({ label: L(CONDITION_TAGS, k), icon: CONDITION_TAGS[k].icon, value: s.reports[k] }));
        if (rows.length) hbarChart(el, rows);
        else el.innerHTML = `<p class="muted">${esc(t('lb.empty'))}</p>`;
      },
      table: () => tableHtml([t('stats.reports'), t('stats.col.cats')], Object.keys(CONDITION_TAGS).map((k) => [`${CONDITION_TAGS[k].icon} ${L(CONDITION_TAGS, k)}`, (s.reports || {})[k] || 0])),
    },
    patterns: {
      draw: (el) => hbarChart(el, Object.keys(PATTERNS).filter((k) => s.patterns[k]).sort((a, b) => s.patterns[b] - s.patterns[a]).map((k) => ({ label: L(PATTERNS, k), value: s.patterns[k] })), { total: tt.cats }),
      table: () => tableHtml([t('stats.patterns'), t('stats.col.cats')], Object.keys(PATTERNS).map((k) => [L(PATTERNS, k), s.patterns[k] || 0])),
    },
    bcs: {
      draw: (el) => hbarChart(el, Object.keys(BCS_CLASSES).map((k) => ({ label: L(BCS_CLASSES, k), value: s.bcs[k] || 0 }))),
      table: () => tableHtml([t('stats.bcsDist'), t('stats.col.cats')], Object.keys(BCS_CLASSES).map((k) => [L(BCS_CLASSES, k), s.bcs[k] || 0])),
    },
    ages: {
      draw: (el) => hbarChart(el, Object.keys(AGE_GROUPS).map((k) => ({ label: L(AGE_GROUPS, k), value: s.ages[k] || 0 }))),
      table: () => tableHtml([t('stats.ages'), t('stats.col.cats')], Object.keys(AGE_GROUPS).map((k) => [L(AGE_GROUPS, k), s.ages[k] || 0])),
    },
    flags: {
      draw: (el) => {
        const rows = Object.keys(HEALTH_FLAGS).filter((k) => s.healthFlags[k]).sort((a, b) => s.healthFlags[b] - s.healthFlags[a]).map((k) => ({ label: L(HEALTH_FLAGS, k), value: s.healthFlags[k] }));
        if (rows.length) hbarChart(el, rows);
        else el.innerHTML = `<p class="muted">${esc(t('help.empty'))}</p>`;
      },
      table: () => tableHtml([t('stats.flags'), t('stats.col.cats')], Object.keys(HEALTH_FLAGS).map((k) => [L(HEALTH_FLAGS, k), s.healthFlags[k] || 0])),
    },
    hours: {
      draw: (el) => columnChart(el, s.hours.map((v, h) => ({ label: `${String(h).padStart(2, '0')}:00`, short: String(h), value: v })), { every: 3, height: 150 }),
      table: () => tableHtml([t('stats.hours'), t('stats.obs')], s.hours.map((v, h) => [`${String(h).padStart(2, '0')}:00`, v])),
    },
  };
  for (const [key, c] of Object.entries(charts)) {
    const card = view.querySelector(`[data-viz="${key}"]`);
    const chartEl = card.querySelector('[data-chart]');
    const tableEl = card.querySelector('[data-table]');
    c.draw(chartEl);
    card.querySelector('[data-toggle]').addEventListener('click', (e) => {
      const showTable = tableEl.hidden;
      tableEl.hidden = !showTable;
      chartEl.hidden = showTable;
      if (showTable && !tableEl.innerHTML) tableEl.innerHTML = c.table();
      e.target.textContent = t(showTable ? 'stats.chart' : 'stats.table');
    });
  }

  // Mahalle-Tabelle (sortierbar per Klick)
  const dEl = view.querySelector('[data-districts]');
  let sortKey = 'cats';
  const drawDistricts = () => {
    const rows = [...s.districts].sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1));
    const cols = [['name', t('stats.col.district')], ['cats', t('stats.col.cats')], ['observations', t('stats.col.obs')], ['needsHelp', t('stats.col.help')], ['tnrPct', t('stats.col.tnr')], ['avgBcs', t('stats.col.bcs')]];
    dEl.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(([k, h]) => `<th><button class="link" data-sort="${k}">${esc(h)}${k === sortKey ? ' ↓' : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${rows.map((d) => `<tr><td><a href="#/dex?tab=all&district=${esc(d.id)}">${bdi(d.name)}</a></td><td class="num">${fmtNum(d.cats)}</td><td class="num">${fmtNum(d.observations)}</td><td class="num">${d.needsHelp ? fmtNum(d.needsHelp) : ''}</td><td class="num">${d.tnrPct == null ? '–' : esc(pct(d.tnrPct))}</td><td class="num">${fmtNum(d.avgBcs)}</td></tr>`).join('')}</tbody></table></div>`;
  };
  dEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (b && b.dataset.sort !== 'name') {
      sortKey = b.dataset.sort;
      drawDistricts();
    }
  });
  drawDistricts();

  // Rangliste
  let period = 'week';
  let metric = 'xp';
  const lbEl = view.querySelector('[data-lb]');
  const drawLb = async () => {
    const lb = await app.api.leaderboard(period, metric);
    const meNick = app.player && app.player.nickname;
    lbEl.innerHTML = lb.items.length ? lb.items.map((r) => `<li class="${r.nickname === meNick ? 'me' : ''}"><span class="rank-n">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><span class="rank-name">${esc(r.nickname)}</span><span class="rank-v">${fmtNum(r.value)} ${metric === 'xp' ? 'XP' : metric === 'discoveries' ? '🔭' : '🐱'}</span></li>`).join('')
      : `<li class="muted">${esc(t('lb.empty'))}</li>`;
  };
  view.querySelector('[data-period]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    period = b.dataset.p;
    view.querySelectorAll('[data-period] button').forEach((x) => x.classList.toggle('on', x === b));
    drawLb();
  });
  view.querySelector('[data-metric]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    metric = b.dataset.m;
    view.querySelectorAll('[data-metric] button').forEach((x) => x.classList.toggle('on', x === b));
    drawLb();
  });
  await drawLb();
  await renderHelpList(view.querySelector('[data-help]'), app);
  if (params && params.get('section')) view.querySelector(`#${params.get('section')}`)?.scrollIntoView();
}

export async function renderHelpList(el, app) {
  const h = await app.api.help();
  el.innerHTML = `<p class="small muted">${esc(t('help.lead'))}</p>${h.items.length ? `<ul class="helplist">${h.items.map((x) => `
    <li><a href="#/cat/${esc(x.cat.id)}">${catImg(x.cat, { size: 'sm' })}
      <span><b>${catName(x.cat)}</b> · ${bdi(x.cat.districtName)}<br>${statusChip(x.cat.status)} ${severityChip(x.severity)}
      ${x.lastReport ? `<br><small>${x.lastReport.tags && x.lastReport.tags.length ? `${esc(conditionText(x.lastReport.tags))} ` : ''}${esc(x.lastReport.note || '')} <span class="muted">· ${esc(fmtAgo(x.lastReport.at))}</span></small>` : ''}</span></a></li>`).join('')}</ul>`
    : `<p>${esc(t('help.empty'))}</p>`}`;
}

export async function renderHelp(view, app) {
  view.innerHTML = `<button class="back" data-back>‹ ${esc(t('common.back'))}</button><h1 class="pad-x">🆘 ${esc(t('stats.helpRadar'))}</h1><section class="card" data-help></section>`;
  await renderHelpList(view.querySelector('[data-help]'), app);
}
