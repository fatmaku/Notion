import type { App } from '../../app/App';
import type { GameModeId } from '../../core/types';
import { fmtScore, h } from '../dom';
import { MODES, T } from '../i18n/de';
import type { Screen } from '../Router';

export function LeaderboardScreen(app: App): Screen {
  let mode: GameModeId = app.session.mode;
  let scope: 'local' | 'global' = app.leaderboard.configured ? 'global' : 'local';
  const body = h('div', {});
  const tabs = h('div', { class: 'row' });

  const renderTabs = () => {
    tabs.replaceChildren(
      ...(Object.keys(MODES) as GameModeId[]).map((m) =>
        h('button', { class: `btn ${m === mode ? '' : 'secondary'} grow`, style: 'min-height:40px;padding:6px 8px;font-size:13px', onclick: () => ((mode = m), render()) }, `${MODES[m].icon} ${MODES[m].name}`),
      ),
    );
  };

  const render = async () => {
    renderTabs();
    const scopeRow = h(
      'div',
      { class: 'row', style: 'margin:10px 0' },
      h('button', { class: `btn ${scope === 'global' ? '' : 'secondary'} grow`, style: 'min-height:40px;font-size:14px', onclick: () => ((scope = 'global'), render()) }, `🌍 ${T.global}`),
      h('button', { class: `btn ${scope === 'local' ? '' : 'secondary'} grow`, style: 'min-height:40px;font-size:14px', onclick: () => ((scope = 'local'), render()) }, `📱 ${T.local}`),
    );
    body.replaceChildren(scopeRow, h('p', { class: 'muted small' }, 'Lade …'));
    if (scope === 'local') {
      const best = app.records.best(mode);
      const daily = app.records.dailyBest(mode);
      const recent = app.records.recent().filter((r) => r.mode === mode);
      const tot = app.records.totals();
      body.replaceChildren(
        scopeRow,
        h('div', { class: 'stats' }, h('span', { class: 'muted' }, T.best), h('b', {}, fmtScore(best)), h('span', { class: 'muted' }, 'Heute'), h('b', {}, fmtScore(daily)), h('span', { class: 'muted' }, 'Runden gesamt'), h('b', {}, String(tot.rounds)), h('span', { class: 'muted' }, 'Fahrzeuge gesamt'), h('b', {}, String(tot.kills))),
        h(
          'ul',
          { class: 'list' },
          ...(recent.length ? recent.slice(0, 10) : []).map((r, i) => h('li', {}, h('span', { class: 'rank' }, `${i + 1}.`), h('span', { class: 'name' }, `${new Date(r.at).toLocaleDateString('de-DE')} · ${r.weapons.join('+')}${r.source === 'demo' ? ' · Demo' : ''}`), h('span', { class: 'score' }, fmtScore(r.score)))),
          recent.length ? null : h('li', {}, h('span', { class: 'muted' }, 'Noch keine Runden in diesem Modus.')),
        ),
      );
      return;
    }
    if (!app.leaderboard.configured) {
      body.replaceChildren(scopeRow, h('p', { class: 'muted' }, T.notConfigured));
      return;
    }
    try {
      const res = await app.leaderboard.top(mode, 'week');
      const all = await app.leaderboard.top(mode, 'all');
      const list = (title: string, rows: typeof res) =>
        h(
          'div',
          {},
          h('h2', { class: 'small muted', style: 'margin:10px 0 4px' }, title),
          h(
            'ul',
            { class: 'list' },
            ...rows.map((e, i) => h('li', { class: e.me ? 'me' : '' }, h('span', { class: 'rank' }, `${i + 1}.`), h('span', { class: 'name' }, `${e.flag ? e.flag + ' ' : ''}${e.name} · ${e.vehicle}`), h('span', { class: 'score' }, fmtScore(e.score)))),
            rows.length ? null : h('li', {}, h('span', { class: 'muted' }, 'Noch keine Einträge – sei der Erste!')),
          ),
        );
      body.replaceChildren(scopeRow, list(T.weekly, res), list(T.allTime, all));
    } catch {
      body.replaceChildren(scopeRow, h('p', { class: 'muted' }, T.offline));
    }
  };
  void render();
  const el = h('div', { class: 'screen' }, h('div', { class: 'card' }, h('h2', {}, `🏆 ${T.leaderboard}`), tabs, body, h('button', { class: 'btn block secondary', style: 'margin-top:12px', onclick: () => app.showStart() }, T.back)));
  return { el };
}
