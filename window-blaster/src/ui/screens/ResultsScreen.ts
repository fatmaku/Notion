import type { App } from '../../app/App';
import type { RoundResult } from '../../game/GameMode';
import { MEDAL_ICON, medalFor, nextMedal } from '../../game/scoring/Medals';
import { fmtScore, fmtTime, h } from '../dom';
import { MODES, T, WEAPON_TEXT } from '../i18n/de';
import type { Screen } from '../Router';

export function ResultsScreen(app: App, r: RoundResult, flags: { newBest: boolean; newDaily: boolean }): Screen {
  const medal = medalFor(r.mode, r.score);
  const nm = nextMedal(r.mode, r.score);
  const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
  const stat = (k: string, v: string) => [h('span', { class: 'muted' }, k), h('b', {}, v)];
  const submitBtn = h('button', { class: 'btn block secondary', onclick: () => app.submitScore(r) }, `🌍 ${T.submitScore}`);
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'row', style: 'align-items:center;justify-content:space-between' }, h('h2', {}, `${MODES[r.mode].icon} ${T.results}`), h('span', { class: 'medal' }, MEDAL_ICON[medal])),
      h('div', { class: 'title', style: 'font-size:46px' }, fmtScore(r.score)),
      flags.newBest ? h('div', { class: 'badge ok', style: 'margin-bottom:8px' }, `★ ${T.newBest}`) : h('div', { class: 'muted small' }, `${T.best}: ${fmtScore(app.records.best(r.mode))}`),
      nm ? h('p', { class: 'small muted' }, `Noch ${fmtScore(nm.missing)} Punkte bis ${MEDAL_ICON[nm.medal]}`) : h('p', { class: 'small muted' }, 'Gold! Besser geht’s kaum.'),
      h(
        'div',
        { class: 'stats' },
        ...stat(T.kills, String(r.kills)),
        ...stat(T.hits, `${r.hits} / ${r.shots} Schuss`),
        ...stat(T.accuracy, `${acc} %`),
        ...stat(T.maxCombo, `×${r.maxCombo}`),
        ...stat(T.time, fmtTime(r.durationSec) + (r.extra.extraSec ? ` (+${Math.round(r.extra.extraSec)} s verdient)` : '')),
        ...stat('Waffen', r.weapons.map((w) => WEAPON_TEXT[w as keyof typeof WEAPON_TEXT]?.icon ?? w).join(' ')),
      ),
      r.missions.length
        ? h(
            'ul',
            { class: 'list' },
            ...r.missions.map((m) => h('li', { class: m.done ? 'me' : '' }, h('span', { class: 'name' }, `${m.done ? '✓' : '○'} ${m.text}`), h('span', { class: 'score' }, m.done ? `+${m.reward}` : `${m.progress}/${m.goal}`))),
          )
        : null,
      r.source === 'demo' ? h('p', { class: 'small muted' }, 'Demo-Runde (synthetische Szene) – zählt nicht für die weltweite Rangliste.') : null,
      h(
        'div',
        { class: 'col', style: 'margin-top:12px' },
        h('button', { class: 'btn block', onclick: () => app.startRound() }, `🔁 ${T.again}`),
        r.source === 'camera' ? submitBtn : null,
        h('div', { class: 'row' }, h('button', { class: 'btn secondary grow', onclick: () => app.showLeaderboard() }, `🏆 ${T.leaderboard}`), h('button', { class: 'btn secondary grow', onclick: () => app.showStart() }, T.menu)),
      ),
    ),
  );
  return { el };
}
