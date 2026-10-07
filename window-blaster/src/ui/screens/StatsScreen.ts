import type { App } from '../../app/App';
import type { GameModeId } from '../../core/types';
import { fmtScore, fmtTime, h } from '../dom';
import { MODES, WEAPON_TEXT } from '../i18n/de';
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
      h('h2', {}, '📊 Statistik'),
      h(
        'div',
        { class: 'stats' },
        ...stat('Runden', String(t.rounds)),
        ...stat('Spielzeit', fmtTime(t.seconds)),
        ...stat('Ausgeschaltet', String(t.kills)),
        ...stat('Trefferquote', `${acc} % (${t.hits} / ${t.shots})`),
        ...stat('Beste Combo', `×${t.bestCombo}`),
        ...stat('Punkte gesamt', fmtScore(app.unlocks.earned)),
      ),
      h('h3', { style: 'margin:14px 0 6px;font-size:16px' }, 'Bestwerte'),
      h('div', { class: 'stats' }, ...(Object.keys(MODES) as GameModeId[]).flatMap((m) => stat(`${MODES[m].icon} ${MODES[m].name}`, fmtScore(app.records.best(m))))),
      weaponKills.length
        ? h(
            'div',
            {},
            h('h3', { style: 'margin:14px 0 6px;font-size:16px' }, 'Lieblingswaffen'),
            h('div', { class: 'stats' }, ...weaponKills.slice(0, 6).flatMap(([w, n]) => stat(`${WEAPON_TEXT[w as keyof typeof WEAPON_TEXT]?.icon ?? ''} ${WEAPON_TEXT[w as keyof typeof WEAPON_TEXT]?.name ?? w}`, `${n} ×`))),
          )
        : null,
      recent.length
        ? h(
            'div',
            {},
            h('h3', { style: 'margin:14px 0 6px;font-size:16px' }, 'Letzte Runden'),
            h(
              'ul',
              { class: 'list' },
              ...recent.map((r) => h('li', {}, h('span', { class: 'name' }, `${MODES[r.mode].icon} ${new Date(r.at).toLocaleDateString('de-DE')} · ×${r.maxCombo}${r.source === 'demo' ? ' · Demo' : ''}`), h('span', { class: 'score' }, fmtScore(r.score)))),
            ),
          )
        : h('p', { class: 'muted small' }, 'Noch keine Runden gespielt.'),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn secondary grow', onclick: () => app.showStart() }, 'Zurück')),
    ),
  );
  return { el };
}
