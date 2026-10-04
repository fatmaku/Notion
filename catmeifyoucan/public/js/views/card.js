// Cat Me If You Can – Sammelkarte nach einem Fang (und Kurzansicht einer Katze).
// Neue Katze → großes „NEUE KATZE!“ und Namensfeld für die Erstfinderin / den Erstfinder.

import { t, L, tx, getLang } from '../i18n.js';
import { esc, bdi, fmtNum, catImg, stars, severityChip, fmtAge, fmtWeight, fmtTime, modal, toast, errorText, confetti, patternLabel } from '../ui.js';
import { SEX, EAR_TIP, BEHAVIOR, EYE_COLORS, BCS_CLASSES, HEALTH_FLAGS, RARITY, AGE_GROUPS, breedLabel } from '../../core/taxonomy.js';
import { questText } from './home.js';
import { conditionFormHtml, bindConditionForm, readConditionForm } from './condition.js';
import { shareCat } from '../share.js';

function bcsBar(score) {
  if (!Number.isFinite(score)) return `<span class="muted">${esc(t('common.unknown'))}</span>`;
  const cls = score <= 3 ? 'low' : score <= 5 ? 'ok' : score <= 7 ? 'high' : 'vhigh';
  return `<span class="bcs"><span class="bcs-track">${Array.from({ length: 9 }, (_, i) => `<i class="${i < score ? cls : ''}"></i>`).join('')}</span><b>${score}/9</b></span>`;
}

export function factsHtml(a, { district } = {}) {
  const rows = [
    [t('card.type'), `${esc(patternLabel(a.pattern))}${a.long_hair ? ' · 〰' : ''}`],
    [t('card.age'), esc(fmtAge(a.age_months_min, a.age_months_max)) + (a.age_group && a.age_group !== 'unknown' ? ` <small class="muted">(${esc(L(AGE_GROUPS, a.age_group))})</small>` : '')],
    [t('card.weight'), esc(fmtWeight(a.weight_kg_min, a.weight_kg_max))],
    [t('card.condition'), `${bcsBar(a.body_condition_score)} ${a.body_condition && a.body_condition !== 'unknown' ? `<small>${esc(L(BCS_CLASSES, a.body_condition))}</small>` : ''}`],
    [t('card.sex'), esc(L(SEX, a.sex_guess || 'unknown'))],
    [t('card.ear'), `${a.ear_tip === 'tipped' ? '✂️ ' : ''}${esc(L(EAR_TIP, a.ear_tip || 'not_visible'))}`],
    [t('card.health'), a.health_assessed === false ? `<span class="muted">${esc(t('common.unknown'))}</span>` : `${severityChip(a.health_severity)}${(a.health_flags || []).length ? `<br><small>${a.health_flags.map((f) => esc(L(HEALTH_FLAGS, f))).join(' · ')}</small>` : ''}${a.health_notes ? `<br><small class="muted">${esc(a.health_notes)}</small>` : ''}`],
    [t('card.behavior'), esc(L(BEHAVIOR, a.behavior || 'unknown'))],
  ];
  if (a.eye_color && a.eye_color !== 'unknown') rows.push([t('card.eyes'), esc(L(EYE_COLORS, a.eye_color))]);
  if (a.breed_guess) rows.push([t('card.breed'), esc(breedLabel(a.breed_guess, getLang()))]);
  if (a.distinctive_marks) rows.push([t('card.marks'), esc(a.distinctive_marks)]);
  if (district) rows.push([t('card.place'), bdi(district)]);
  return `<dl class="facts">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

/** Modal mit der Karte zu einem Fang-Ergebnis. */
export function showCatchCard(result, app, { onClose } = {}) {
  const { cat, analysis: a, isNew, xp, today, newBadges, questsCompleted, level } = result;
  const rarity = cat.rarity || 'common';
  const ideas = (a.nickname_ideas || []).filter(Boolean);
  const notCounted = !result.counted ? (result.flags || []).filter((f) => t(`why.${f}`) !== `why.${f}`).map((f) => t(`why.${f}`)).join(', ') : '';
  const html = `
    <div class="catcard r-${esc(rarity)}">
      <div class="catcard-top">
        ${isNew ? `<div class="burst">${esc(t('card.new'))}</div>` : `<div class="again">${esc(t('card.again'))}</div>`}
        ${stars(rarity)} <small class="rarity-name">${esc(L(RARITY, rarity))}</small>
      </div>
      <div class="catcard-photo">${catImg(cat, { size: 'xl' })}</div>
      <div class="catcard-name">
        <h2 data-name>${cat.name ? esc(cat.name) : esc(t('card.unnamed'))}</h2>
        ${cat.title ? `<div class="legend">🌟 ${esc(cat.title)}</div>` : ''}
        <p class="flavor">${esc(tx(a.summary))}</p>
      </div>
      ${result.canName && !cat.name ? `
        <form class="namebox" data-form="name">
          <p><b>🎉 ${esc(t('card.firstFinder'))}</b></p>
          <div class="row"><input name="name" maxlength="20" minlength="2" required placeholder="${esc(t('card.namePh'))}" autocomplete="off"><button class="btn primary">${esc(t('card.saveName'))}</button></div>
          ${ideas.length ? `<div class="ideas"><small>${esc(t('card.ideas'))}:</small> ${ideas.map((n) => `<button type="button" class="chip idea" data-idea="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
        </form>` : ''}
      ${factsHtml(a, { district: cat.districtName })}
      ${a.analyzer === 'heuristic' ? `<p class="note">ℹ️ ${esc(t('card.simple'))}</p>` : ''}
      <p class="disclaimer">${esc(t('card.disclaimer'))}</p>
      <div class="xpbox">
        ${xp.gained ? `<b class="xp">${esc(t('card.xp', { n: xp.gained }))}</b>` : ''}
        <span class="prog">${esc(t('card.progress', { n: today.count, goal: today.goal }))}</span>
        <span class="muted small">${fmtTime(result.observation.at)} · ${bdi(cat.districtName)}</span>
      </div>
      ${notCounted ? `<p class="note warn">${esc(t('card.notCounted', { why: notCounted }))}</p>` : ''}
      <form class="report-box" data-form="report">
        <h3>${esc(t('report.title'))}</h3>
        <p class="small muted">${esc(t('report.lead'))}</p>
        ${conditionFormHtml()}
        <button class="btn" data-report-send disabled>${esc(t('report.send'))}</button>
      </form>
      <div class="actions">
        <button class="btn primary" data-close>${esc(t('card.continue'))}</button>
        <button class="btn" type="button" data-act="share">📤 ${esc(t('share.button'))}</button>
        <a class="btn" href="#/cat/${esc(cat.id)}" data-close>${esc(t('card.profile'))}</a>
        ${!isNew ? `<button class="btn ghost small" data-act="dispute">${esc(t('card.notThis'))}</button>` : ''}
      </div>
    </div>`;
  const m = modal(html, { cls: 'card-modal', onClose });
  if (isNew || today.justReached || (level && level.up)) confetti(m.el);
  for (const b of newBadges || []) toast(`${b.icon} ${t('card.badge', { name: tx(b.name) })}`, { type: 'success', ms: 4500 });
  for (const q of questsCompleted || []) toast(`✓ ${t('card.quest', { name: questText(q) })}`, { type: 'success' });
  if (level && level.up) toast(`⬆️ ${t('card.levelUp', { n: level.level })}`, { type: 'success', ms: 4500 });

  const form = m.el.querySelector('[data-form="name"]');
  if (form) {
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-idea]');
      if (b) form.name.value = b.dataset.idea;
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button.primary');
      btn.disabled = true;
      try {
        const updated = await app.api.nameCat(cat.id, form.name.value);
        m.el.querySelector('[data-name]').textContent = updated.name;
        form.remove();
        toast(`🐾 ${updated.name}!`, { type: 'success' });
      } catch (err) {
        toast(errorText(err), { type: 'error', ms: 4500 });
        btn.disabled = false;
      }
    });
  }
  const report = m.el.querySelector('[data-form="report"]');
  bindConditionForm(report);
  report.addEventListener('change', () => {
    report.querySelector('[data-report-send]').disabled = !readConditionForm(report).tags.length;
  });
  report.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = report.querySelector('[data-report-send]');
    btn.disabled = true;
    const { tags, note } = readConditionForm(report);
    try {
      const res = await app.api.reportCondition(result.observation.id, tags, note);
      report.innerHTML = `<p class="report-done">💚 ${esc(t('report.thanks'))}${res.xp ? ` <b>+${fmtNum(res.xp)} XP</b>` : ''}${res.status === 'needs_help' ? `<br><small>🆘 ${esc(t('report.urgent'))}</small>` : ''}</p>`;
      app.refreshPlayer();
    } catch (err) {
      toast(errorText(err), { type: 'error' });
      btn.disabled = false;
    }
  });
  m.el.querySelector('[data-act="share"]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const named = m.el.querySelector('[data-name]').textContent;
      const how = await shareCat({ ...cat, name: cat.name || (named !== t('card.unnamed') ? named : null) }, a);
      if (how === 'saved') toast(t('share.saved'), { type: 'success' });
    } catch {
      toast(t('err.generic'), { type: 'error' });
    } finally {
      e.target.disabled = false;
    }
  });
  m.el.querySelector('[data-act="dispute"]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      await app.api.dispute(result.observation.id, 'not_this_cat');
      toast('✓', { type: 'success' });
    } catch (err) {
      toast(errorText(err), { type: 'error' });
    }
  });
  return m;
}
