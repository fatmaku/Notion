// Cat Me If You Can – Katzenprofil: Steckbrief, Zustand im Verlauf, Sichtungen auf der Karte,
// Fänger-Rangliste (Entdecker:in ganz oben), Protokoll, Hilfe melden, Status (Freiwillige).

import { t, L, tx } from '../i18n.js';
import { esc, catImg, stars, statusChip, fmtAgo, fmtDate, fmtDateTime, toast, errorText, modal, catName } from '../ui.js';
import { CAT_STATUS, BEHAVIOR, RARITY } from '../../core/taxonomy.js';
import { factsHtml } from './card.js';
import { lineChart } from '../charts.js';
import { miniMap } from '../map.js';

export async function renderCat(view, app, id) {
  const data = await app.api.cat(id);
  const { cat, observations: obs, events, history, catchers } = data;
  const me = app.player;
  const canStatus = me && ['volunteer', 'admin'].includes(me.role);
  const latest = { ...(cat.profile || {}), ...(cat.latest || {}) };
  view.innerHTML = `
    <button class="back" data-back>‹ ${esc(t('common.back'))}</button>
    <section class="cat-hero r-${esc(cat.rarity || 'common')}">
      ${catImg(cat, { size: 'xl' })}
      <div class="cat-hero-text">
        <h1>${catName(cat)} ${cat.demo ? `<span class="chip demo">${esc(t('cat.demo'))}</span>` : ''}</h1>
        ${cat.title ? `<div class="legend">🌟 ${esc(t('cat.legend'))}: ${esc(cat.title)}</div>` : ''}
        <div>${stars(cat.rarity)} <small>${esc(L(RARITY, cat.rarity || 'common'))}</small></div>
        <div class="chips">${statusChip(cat.status)} ${cat.needsReview ? `<span class="chip">${esc(t('cat.review'))}</span>` : ''}</div>
        <p class="small muted">${esc(cat.districtName || '')} · ${esc(t('cat.seenTimes', { n: cat.observationCount }))} · ${esc(t('cat.byPlayers', { n: cat.catcherCount }))}</p>
        ${cat.discoveredBy ? `<p class="small">🔭 ${esc(t('card.discoveredBy', { name: cat.discoveredBy }))}</p>` : ''}
      </div>
    </section>

    <section class="card">
      <h2>${esc(t('cat.facts'))}</h2>
      ${factsHtml(latest, { district: cat.districtName })}
      <p class="small muted">${esc(t('cat.firstSeen'))}: ${esc(fmtDate(cat.firstSeenAt))} · ${esc(t('cat.lastSeen'))}: ${esc(fmtAgo(cat.lastSeenAt))}</p>
      <p class="disclaimer">${esc(t('card.disclaimer'))}</p>
      <div class="actions">
        <button class="btn danger-soft" data-act="help">🆘 ${esc(t('cat.reportHelp'))}</button>
        ${canStatus ? `<button class="btn" data-act="status">🩺 ${esc(t('cat.setStatus'))}</button>` : ''}
      </div>
    </section>

    ${history.filter((h) => Number.isFinite(h.bcs)).length > 1 ? `<section class="card"><h2>${esc(t('cat.history'))}</h2><div data-chart="bcs"></div></section>` : ''}

    <section class="card">
      <h2>🏆 ${esc(t('cat.catchers'))}</h2>
      <ol class="rank">${catchers.map((c, i) => `
        <li><span class="rank-n">${i + 1}</span><span class="rank-name">${c.discoverer ? '👑 ' : ''}${esc(c.nickname)}
          ${c.discoverer ? `<small class="chip">${esc(t('cat.discoverer'))}</small>` : ''}${c.namer ? `<small class="chip">${esc(t('cat.namer'))}</small>` : ''}</span>
          <span class="rank-v">${c.times}×</span></li>`).join('')}
      </ol>
    </section>

    <section class="card">
      <h2>${esc(t('cat.sightings'))}</h2>
      <div class="minimap" data-map></div>
      <p class="small muted">${esc(t('map.fuzzy'))}</p>
      <ul class="timeline">${obs.map((o) => `
        <li>${o.photoUrl ? `<img class="catimg sm" src="${esc(o.photoUrl)}" alt="" loading="lazy">` : '<span class="dot"></span>'}
          <div><b>${esc(fmtDateTime(o.at))}</b> · ${esc(o.by || '')}${o.isDiscovery ? ' 🔭' : ''}<br>
          <small class="muted">${esc(L(BEHAVIOR, o.analysis.behavior || 'unknown'))}${o.analysis.health_severity && o.analysis.health_severity !== 'none' ? ` · ⚠ ${esc(o.analysis.health_notes || o.analysis.health_severity)}` : ''}</small>
          ${o.analysis.summary ? `<br><small>${esc(tx(o.analysis.summary))}</small>` : ''}</div></li>`).join('')}
      </ul>
    </section>

    ${events.length ? `<section class="card"><h2>${esc(t('cat.log'))}</h2><ul class="log">${events.map((e) => `
      <li><small class="muted">${esc(fmtDateTime(e.at))}</small> ${esc(t(`ev.${e.type}`))}${e.to ? ` → ${esc(L(CAT_STATUS, e.to))}` : ''}${e.note ? `: ${esc(e.note)}` : ''}${e.by ? ` <small class="muted">(${esc(e.by)})</small>` : ''}</li>`).join('')}</ul></section>` : ''}`;

  const chartEl = view.querySelector('[data-chart="bcs"]');
  if (chartEl) {
    lineChart(chartEl, history.filter((h) => Number.isFinite(h.bcs)).map((h) => ({ x: h.at, y: h.bcs, tip: `${fmtDate(h.at)}: BCS ${h.bcs}/9` })), { band: [4, 5] });
  }
  miniMap(view.querySelector('[data-map]'), app, obs.map((o) => [o.lat, o.lon]));

  view.querySelector('[data-act="help"]').addEventListener('click', () => {
    if (!app.api.hasToken()) return toast(t('err.login_required'), { type: 'error' });
    const m = modal(`<form class="pad" data-f><h2>🆘 ${esc(t('cat.reportHelp'))}</h2>
      <textarea name="note" rows="4" maxlength="500" required minlength="3" placeholder="${esc(t('cat.helpPh'))}"></textarea>
      <div class="actions"><button class="btn primary">${esc(t('cat.send'))}</button><button type="button" class="btn" data-close>${esc(t('common.cancel'))}</button></div></form>`);
    m.el.querySelector('[data-f]').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await app.api.reportHelp(cat.id, e.target.note.value);
        m.close();
        toast(t('cat.helpSent'), { type: 'success' });
        renderCat(view, app, cat.id);
      } catch (err) {
        toast(errorText(err), { type: 'error' });
      }
    });
  });
  view.querySelector('[data-act="status"]')?.addEventListener('click', () => {
    const m = modal(`<form class="pad" data-f><h2>🩺 ${esc(t('cat.setStatus'))}</h2>
      <select name="status">${['active', 'needs_help', 'in_care', 'adopted', 'deceased'].map((s) => `<option value="${s}" ${s === cat.status ? 'selected' : ''}>${t(`status.icon.${s}`)} ${esc(L(CAT_STATUS, s))}</option>`).join('')}</select>
      <textarea name="note" rows="3" maxlength="500" placeholder="${esc(t('cat.statusNote'))}"></textarea>
      <div class="actions"><button class="btn primary">${esc(t('p.save'))}</button><button type="button" class="btn" data-close>${esc(t('common.cancel'))}</button></div></form>`);
    m.el.querySelector('[data-f]').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await app.api.setStatus(cat.id, e.target.status.value, e.target.note.value);
        m.close();
        renderCat(view, app, cat.id);
      } catch (err) {
        toast(errorText(err), { type: 'error' });
      }
    });
  });
}
