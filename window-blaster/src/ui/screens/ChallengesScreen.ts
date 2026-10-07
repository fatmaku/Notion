import type { App } from '../../app/App';
import { weeklyChallenge } from '../../game/scoring/Challenges';
import { fmtScore, h } from '../dom';
import { MODES, WEAPON_TEXT, locale } from '../i18n';
import type { Screen } from '../Router';

/** Daily and weekly challenges: same missions (daily) or same mode + loadout + missions (weekly) for everyone. */
export function ChallengesScreen(app: App): Screen {
  const wk = weeklyChallenge();
  const runner = wk.mode === 'side-runner';
  const weeklyBest = Math.max(...(['front-shooter', 'side-shooter', 'side-runner'] as const).map((m) => app.records.weeklyBest(m)));
  const dailyBest = Math.max(...(['front-shooter', 'side-shooter', 'side-runner'] as const).map((m) => app.records.dailyBest(m)));
  const card = (title: string, lines: (string | HTMLElement)[], best: number, onPlay: () => void, playLabel: string) =>
    h(
      'div',
      { class: 'choice', style: 'cursor:default' },
      h('div', { class: 'name', style: 'font-size:18px' }, title),
      ...lines.map((l) => h('div', { class: 'desc', style: 'font-size:14px' }, l)),
      h('div', { class: 'row', style: 'align-items:center;justify-content:space-between;margin-top:10px' }, h('span', { class: 'muted small' }, `Bestwert: ${fmtScore(best)}`), h('button', { class: 'btn', style: 'min-height:42px;padding:8px 16px', onclick: onPlay }, playLabel)),
    );
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, '📅 Challenges'),
      h('p', { class: 'muted small' }, 'Für alle gleich – vergleichbar auf der weltweiten Rangliste. Demo-Runden zählen nicht.'),
      h(
        'div',
        { class: 'col' },
        card(`📅 Tages-Challenge · ${new Date().toLocaleDateString(locale())}`, ['Modus und Waffen frei, aber dieselben drei Missionen für alle – heute neu.'], dailyBest, () => app.beginFlow(app.params.demo ? 'demo' : 'camera', 'daily'), '▶ Spielen'),
        card(
          `🗓️ Wochen-Challenge · KW ${wk.week}`,
          [
            `${MODES[wk.mode].icon} ${MODES[wk.mode].name}${runner ? '' : ` · ${WEAPON_TEXT[wk.weapons[0]].icon} ${WEAPON_TEXT[wk.weapons[0]].name} + ${WEAPON_TEXT[wk.weapons[1]].icon} ${WEAPON_TEXT[wk.weapons[1]].name}`}`,
            'Modus, Waffen und Missionen sind die ganze Woche für alle gleich. Montag kommt die nächste.',
          ],
          weeklyBest,
          () => app.beginFlow(app.params.demo ? 'demo' : 'camera', 'weekly'),
          '▶ Spielen',
        ),
      ),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn secondary grow', onclick: () => app.showStart() }, 'Zurück')),
    ),
  );
  return { el };
}
