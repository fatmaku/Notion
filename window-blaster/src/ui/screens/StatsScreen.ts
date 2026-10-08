import type { App } from '../../app/App';
import type { GameModeId } from '../../core/types';
import { fmtScore, fmtTime, h } from '../dom';
import { locale, MODES, T, tf, WEAPON_TEXT } from '../i18n';
import type { Screen } from '../Router';

/** Lifetime statistics: totals, bests per mode, favourite weapons, recent rounds. */
export function StatsScreen(app: App): Screen {
  const t = app.records.totals();
  const acc = t.shots ? Math.round((t.hits / t.shots) * 100) : 0;
  const stat = (k: string, v: string) => [h('span', { class: 'muted' }, k), h('b', {}, v)];
  const weaponKills = Object.entries(app.records.weaponKills()).sort((a, b) => b[1] - a[1]);
  const recent = app.records.recent().slice(0, 8);
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, T.statsTitle),
      h(
        'div',
        { class: 'stats' },
        ...stat(T.statsRounds, String(t.rounds)),
        ...stat(T.statsPlaytime, fmtTime(t.seconds)),
        ...stat(T.kills, String(t.kills)),
        ...stat(T.accuracy, tf(T.statsAccuracyValue, { acc, hits: t.hits, shots: t.shots })),
        ...stat(T.maxCombo, `×${t.bestCombo}`),
        ...stat(T.statsTotalPoints, fmtScore(app.unlocks.earned)),
      ),
      h('h3', { style: 'margin:14px 0 6px;font-size:16px' }, T.statsBests),
      h('div', { class: 'stats' }, ...(Object.keys(MODES) as GameModeId[]).flatMap((m) => stat(`${MODES[m].icon} ${MODES[m].name}`, fmtScore(app.records.best(m))))),
      weaponKills.length
        ? h(
            'div',
            {},
            h('h3', { style: 'margin:14px 0 6px;font-size:16px' }, T.statsFavWeapons),
            h('div', { class: 'stats' }, ...weaponKills.slice(0, 6).flatMap(([w, n]) => stat(`${WEAPON_TEXT[w as keyof typeof WEAPON_TEXT]?.icon ?? ''} ${WEAPON_TEXT[w as keyof typeof WEAPON_TEXT]?.name ?? w}`, `${n} ×`))),
          )
        : null,
      recent.length
        ? h(
            'div',
            {},
            h('h3', { style: 'margin:14px 0 6px;font-size:16px' }, T.statsRecent),
            h(
              'ul',
              { class: 'list' },
              ...recent.map((r) => h('li', {}, h('span', { class: 'name' }, `${MODES[r.mode].icon} ${new Date(r.at).toLocaleDateString(locale())} · ×${r.maxCombo}${r.source === 'demo' ? ` · ${T.statsDemoTag}` : ''}`), h('span', { class: 'score' }, fmtScore(r.score)))),
            ),
          )
        : h('p', { class: 'muted small' }, T.statsNoRounds),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn secondary grow', onclick: () => app.showStart() }, T.back)),
    ),
  );
  return { el };
}
