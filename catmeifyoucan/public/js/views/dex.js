// Cat Me If You Can – KediDex: eigene Sammlung (mit Typen-Raster wie ein Pokédex) und alle Katzen.

import { t, L } from '../i18n.js';
import { esc, bdi, fmtNum, catImg, stars, statusChip, fmtAgo, patternLabel, catName } from '../ui.js';
import { PATTERNS, CAT_STATUS } from '../../core/taxonomy.js';
import { catAvatarDataUrl } from '../avatar.js';

const TYPES = Object.keys(PATTERNS).filter((p) => p !== 'diger');

function catTile(c, extra = '') {
  return `<a class="tile r-${esc(c.rarity || 'common')}" href="#/cat/${esc(c.id)}">
    ${catImg(c, { size: 'md' })}
    ${c.legendary ? '<span class="tile-legend" title="★">🌟</span>' : ''}
    ${c.status && c.status !== 'active' ? `<span class="tile-status">${t(`status.icon.${c.status}`)}</span>` : ''}
    <span class="tile-name">${catName(c)}</span>
    <span class="tile-meta">${stars(c.rarity)}</span>
    <span class="tile-sub">${bdi(c.districtName)}${extra ? ` · ${extra}` : ''}</span>
  </a>`;
}

export async function renderDex(view, app, params) {
  const tab = params.get('tab') === 'all' ? 'all' : 'mine';
  view.innerHTML = `
    <div class="seg" role="tablist">
      <a role="tab" href="#/dex" class="${tab === 'mine' ? 'on' : ''}">${esc(t('dex.mine'))}</a>
      <a role="tab" href="#/dex?tab=all" class="${tab === 'all' ? 'on' : ''}">${esc(t('dex.all'))}</a>
    </div>
    <div data-body><p class="muted center pad">${esc(t('common.loading'))}</p></div>`;
  const body = view.querySelector('[data-body]');
  if (tab === 'mine') return renderMine(body, app);
  return renderAll(body, app, params);
}

async function renderMine(body, app) {
  const dex = await app.api.dex();
  const got = new Set(dex.patterns);
  body.innerHTML = `
    <section class="card">
      <h2>${esc(t('dex.types'))} <small class="muted">${fmtNum(got.size)}/${fmtNum(TYPES.length)}</small></h2>
      <div class="types">${TYPES.map((p) => `
        <div class="type ${got.has(p) ? 'got' : ''}" title="${esc(L(PATTERNS, p))}">
          <img src="${catAvatarDataUrl({ id: p, pattern: p })}" alt="">
          <span>${esc(got.has(p) ? L(PATTERNS, p) : '???')}</span>
        </div>`).join('')}
      </div>
    </section>
    <h2 class="pad-x">${esc(t('dex.count', { n: dex.total }))}</h2>
    ${dex.entries.length ? `<div class="grid">${dex.entries.map((e) => catTile(e.cat, `${e.discovered ? '🔭 ' : ''}${esc(t('dex.caught', { n: e.times }))}`)).join('')}</div>`
      : `<div class="empty"><div class="big-emoji">🐾</div><p>${esc(t('dex.empty'))}</p><a class="btn primary" href="#/catch">📸 ${esc(t('nav.catch'))}</a></div>`}`;
}

async function renderAll(body, app, params) {
  const region = app.config.regions[0];
  const f = {
    district: params.get('district') || '',
    status: params.get('status') || '',
    pattern: params.get('pattern') || '',
    sort: params.get('sort') || 'recent',
    q: params.get('q') || '',
  };
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  body.innerHTML = `
    <form class="filters" data-filters>
      <input type="search" name="q" value="${esc(f.q)}" placeholder="🔎 ${esc(t('sort.name'))}" aria-label="${esc(t('sort.name'))}">
      <select name="district" aria-label="${esc(t('dex.filter.district'))}">${opt('', `${t('dex.filter.district')}: ${t('dex.filter.any')}`, f.district)}${region.districts.map((d) => opt(d.id, d.name, f.district)).join('')}</select>
      <select name="pattern" aria-label="${esc(t('dex.filter.pattern'))}">${opt('', `${t('dex.filter.pattern')}: ${t('dex.filter.any')}`, f.pattern)}${Object.keys(PATTERNS).map((p) => opt(p, L(PATTERNS, p), f.pattern)).join('')}</select>
      <select name="status" aria-label="${esc(t('dex.filter.status'))}">${opt('', `${t('dex.filter.status')}: ${t('dex.filter.any')}`, f.status)}${Object.keys(CAT_STATUS).map((s) => opt(s, L(CAT_STATUS, s), f.status)).join('')}</select>
      <select name="sort" aria-label="${esc(t('dex.sort'))}">${['recent', 'popular', 'newest', 'rarity', 'name'].map((s) => opt(s, t(`sort.${s}`), f.sort)).join('')}</select>
    </form>
    <div data-list><p class="muted center pad">${esc(t('common.loading'))}</p></div>`;
  const form = body.querySelector('[data-filters]');
  const apply = () => {
    const q = new URLSearchParams({ tab: 'all' });
    for (const [k, v] of new FormData(form)) if (v) q.set(k, v);
    history.replaceState(null, '', `#/dex?${q}`);
    load();
  };
  form.addEventListener('change', apply);
  let deb;
  form.q.addEventListener('input', () => {
    clearTimeout(deb);
    deb = setTimeout(apply, 300);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    apply();
  });
  async function load() {
    const fd = Object.fromEntries(new FormData(form));
    const res = await app.api.cats({ ...fd, limit: 120 });
    body.querySelector('[data-list]').innerHTML = `<p class="muted pad-x small">${esc(t('dex.count', { n: res.total }))}</p>
      <div class="grid">${res.items.map((c) => catTile(c, esc(fmtAgo(c.lastSeenAt)))).join('')}</div>`;
  }
  await load();
}

export { statusChip, patternLabel };
