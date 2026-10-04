// Cat Me If You Can – „Heute“: Tagesziel-Ring, Gutschein, Tagesaufgaben, heutige Fänge, Cafés.

import { t, L, tx } from '../i18n.js';
import { esc, catImg, fmtTime, toast, errorText, stars, pct } from '../ui.js';
import { PATTERNS } from '../../core/taxonomy.js';

function ring(count, goal) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, count / goal);
  return `<svg class="ring" viewBox="0 0 180 180" aria-hidden="true">
    <circle cx="90" cy="90" r="${r}" class="ring-track"/>
    <circle cx="90" cy="90" r="${r}" class="ring-fill" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 90 90)"/>
  </svg>`;
}

export function questText(q) {
  switch (q.kind) {
    case 'count': return t('quest.count', { n: q.n });
    case 'pattern': return t('quest.pattern', { n: q.n, pattern: L(PATTERNS, q.pattern) });
    case 'district': return t('quest.district', { district: q.districtName || q.district });
    case 'districts': return t('quest.districts', { n: q.n });
    case 'new': return t('quest.new');
    case 'early': return t('quest.early');
    case 'evening': return t('quest.evening', { n: q.n });
    default: return q.kind;
  }
}

export async function renderHome(view, app) {
  const [{ player, today }, places, help] = await Promise.all([app.api.me(), app.api.places('partner').catch(() => []), app.api.help().catch(() => ({ total: 0 }))]);
  app.setPlayer(player);
  const left = Math.max(0, today.minCatsForVoucher - today.count);
  const reached = today.count >= today.minCatsForVoucher;
  view.innerHTML = `
    <section class="hero-card">
      <div class="ring-wrap">${ring(today.count, today.goal)}
        <div class="ring-text"><b>${today.count}</b><span>/ ${today.goal}</span></div>
      </div>
      <div class="hero-side">
        <h1>${esc(t('home.goal', { n: today.count, goal: today.goal }))}</h1>
        <p>${reached ? esc(t('home.reached')) : esc(t('home.left', { n: left }))}</p>
        ${today.voucher
          ? `<a class="btn primary" href="#/voucher">☕ ${esc(t('home.showVoucher'))}</a>`
          : reached ? `<button class="btn primary" data-act="claim">☕ ${esc(t('home.claimVoucher'))}</button>` : `<a class="btn primary" href="#/catch">📸 ${esc(t('nav.catch'))}</a>`}
      </div>
    </section>

    <section class="card">
      <h2>${esc(t('home.quests'))}</h2>
      <ul class="quests">${today.quests.map((q) => `
        <li class="${q.done ? 'done' : ''}">
          <span class="q-check" aria-hidden="true">${q.done ? '✓' : ''}</span>
          <span class="q-text">${esc(questText(q))}</span>
          <span class="q-prog">${q.value}/${q.n}</span>
          <span class="q-xp">+${q.xp} XP</span>
        </li>`).join('')}
      </ul>
    </section>

    <section class="card">
      <h2>${esc(t('home.todayCats'))}</h2>
      ${today.cats.length ? `<div class="strip">${today.cats.map((c) => `
        <a class="strip-item" href="#/cat/${esc(c.catId)}">${catImg({ ...c, id: c.catId }, { size: 'sm' })}<span>${esc(c.name || L(PATTERNS, c.pattern))}</span><small>${fmtTime(c.at)}</small></a>`).join('')}</div>`
        : `<p class="muted">${esc(t('home.none'))}</p>`}
    </section>

    ${help.total ? `<a class="card help-teaser" href="#/help"><span class="big">🆘</span><span>${esc(t('home.help', { n: help.total }))}</span><span class="chev">›</span></a>` : ''}

    <section class="card">
      <h2>${esc(t('home.cafes'))}</h2>
      <ul class="cafes">${places.map((p) => `
        <li><span class="cafe-ico" aria-hidden="true">☕</span>
          <span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.address || '')}</small></span>
          <span class="cafe-deal">${p.reward ? `<b>${esc(pct(p.reward.discountPct))}</b><small>${esc(t('v.needs', { n: p.reward.minCats }))}</small>` : ''}</span>
        </li>`).join('')}
      </ul>
    </section>
    <p class="center"><a href="#/rules" class="muted small">🐾 ${esc(t('rules.title'))}</a></p>`;

  view.querySelector('[data-act="claim"]')?.addEventListener('click', async () => {
    try {
      await app.api.claimVoucher();
      location.hash = '#/voucher';
    } catch (e) {
      toast(errorText(e), { type: 'error' });
    }
  });
}

export { stars, tx };
