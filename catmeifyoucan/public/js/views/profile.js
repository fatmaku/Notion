// Cat Me If You Can – Profil: Level, Abzeichen, Kennzahlen, letzte Fänge, Einstellungen.
// Außerdem: Regeln & Datenschutz.

import { t, tx, LANGS, LANG_INFO, setLang, getLang } from '../i18n.js';
import { esc, fmtNum, fmtAgo, toast, errorText, catImg, patternLabel } from '../ui.js';
import { arEnabled, setArEnabled } from './catch.js';

export async function renderProfile(view, app) {
  const [{ player, profile }, obs] = await Promise.all([app.api.me(), app.api.myObservations()]);
  app.setPlayer(player);
  const lv = player.levelInfo;
  const m = profile.metrics;
  view.innerHTML = `
    <section class="card profile-head">
      <div class="avatar big">${esc(player.nickname.slice(0, 1).toLocaleUpperCase('tr'))}</div>
      <div><h1>${esc(player.nickname)}</h1>
        <p>${esc(t('home.level', { n: player.level }))} · ${esc(tx(player.title))}${player.role !== 'player' ? ` · <span class="chip">${esc(t(`p.role.${player.role}`))}</span>` : ''}</p>
        <div class="xpbar" title="${fmtNum(player.xp)} XP"><i style="width:${Math.round(lv.progress * 100)}%"></i></div>
        <small class="muted"><bdi dir="ltr">${fmtNum(player.xp)}${lv.next ? ` / ${fmtNum(lv.next)}` : ''} XP</bdi></small></div>
    </section>
    <section class="card"><h2>${esc(t('p.stats'))}</h2>
      <div class="stats-grid small">${['uniqueCats', 'catches', 'discoveries', 'districts', 'goalDays', 'currentStreak', 'maxStreak'].map((k) => `<div class="stat"><span class="stat-l">${esc(t(`m.${k}`))}</span><b class="stat-v">${fmtNum(m[k])}</b></div>`).join('')}</div>
    </section>
    <section class="card"><h2>${esc(t('p.badges'))} <small class="muted">${fmtNum(profile.badges.filter((b) => b.earned).length)}/${fmtNum(profile.badges.length)}</small></h2>
      <div class="badges">${profile.badges.map((b) => `
        <div class="badge ${b.earned ? 'on' : ''}" title="${esc(tx(b.desc))}"><span class="b-ico">${b.icon}</span><b>${esc(tx(b.name))}</b><small>${b.earned ? '✓' : `${fmtNum(Math.min(b.value, b.gte))}/${fmtNum(b.gte)}`}</small></div>`).join('')}
      </div>
    </section>
    <section class="card"><h2>${esc(t('p.recent'))}</h2>
      <ul class="timeline">${obs.slice(0, 15).map((o) => `
        <li><a href="#/cat/${esc(o.catId)}">${o.photoUrl ? `<img class="catimg sm" src="${esc(o.photoUrl)}" alt="">` : catImg({ id: o.catId, pattern: o.analysis.pattern }, { size: 'sm' })}</a>
          <div><b>${esc(patternLabel(o.analysis.pattern))}</b> · ${esc(fmtAgo(o.at))} ${o.xp ? `<span class="chip"><bdi dir="ltr">+${fmtNum(o.xp)} XP</bdi></span>` : ''}${o.isDiscovery ? ' 🔭' : ''}
          ${!o.counted ? `<br><small class="warn">${esc(t('card.notCounted', { why: (o.flags || []).map((f) => t(`why.${f}`)).join(', ') }))}</small>` : ''}</div></li>`).join('') || `<li class="muted">${esc(t('dex.empty'))}</li>`}
      </ul>
    </section>
    <section class="card"><h2>${esc(t('p.settings'))}</h2>
      <form class="settings" data-f>
        <label>${esc(t('p.nick'))}<input name="nickname" value="${esc(player.nickname)}" maxlength="20" minlength="2"></label>
        <label>${esc(t('p.lang'))}<select name="lang">${LANGS.map((l) => `<option value="${l}" ${l === getLang() ? 'selected' : ''}>${esc(LANG_INFO[l].name)}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" name="ar" ${arEnabled() ? 'checked' : ''}> ${esc(t('p.ar'))}</label>
        <button class="btn primary">${esc(t('p.save'))}</button>
      </form>
      <p class="links"><a href="#/rules">📜 ${esc(t('p.rules'))}</a> · <a href="partner.html">☕ ${esc(t('p.partner'))}</a>${player.role === 'admin' ? ` · <a href="admin.html">🛡️ ${esc(t('p.admin'))}</a>` : ''}</p>
      <button class="btn danger-soft small" data-reset>${esc(t('p.reset'))}</button>
    </section>`;

  view.querySelector('[data-f]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    setArEnabled(f.ar.checked);
    try {
      const patch = { lang: f.lang.value };
      if (f.nickname.value.trim() !== player.nickname) patch.nickname = f.nickname.value;
      await app.api.updateMe(patch);
      setLang(f.lang.value);
      toast('✓', { type: 'success' });
      app.rerender();
    } catch (err) {
      toast(errorText(err), { type: 'error' });
    }
  });
  view.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm(t('p.resetConfirm'))) return;
    if (app.api.resetDemo) app.api.resetDemo();
    app.api.logout();
    location.hash = '#/';
    location.reload();
  });
}

export function renderRules(view) {
  view.innerHTML = `
    <button class="back" data-back><span class="dir-ic" aria-hidden="true">‹</span> ${esc(t('common.back'))}</button>
    <section class="card prose">
      <h1>🐾 ${esc(t('rules.title'))}</h1>
      ${t('rules.body').split('\n').map((l) => `<p>${esc(l)}</p>`).join('')}
      <h2>🔒 ${esc(t('rules.privacy'))}</h2>
      <p>${esc(t('rules.privacyBody'))}</p>
      <p class="muted">🤖 ${esc(t('rules.ai'))}</p>
    </section>`;
}
