import type { App } from '../../app/App';
import { weeklyChallenge } from '../../game/scoring/Challenges';
import { fmtScore, h } from '../dom';
import { MODES, T, WEAPON_TEXT, locale, tf } from '../i18n';
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
      h('div', { class: 'row', style: 'align-items:center;justify-content:space-between;margin-top:10px' }, h('span', { class: 'muted small' }, `${T.best}: ${fmtScore(best)}`), h('button', { class: 'btn', style: 'min-height:42px;padding:8px 16px', onclick: onPlay }, playLabel)),
    );
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, T.chalTitle),
      h('p', { class: 'muted small' }, T.chalIntro),
      h(
        'div',
        { class: 'col' },
        card(tf(T.chalDailyTitle, { date: new Date().toLocaleDateString(locale()) }), [T.chalDailyDesc], dailyBest, () => app.beginFlow(app.params.demo ? 'demo' : 'camera', 'daily'), `▶ ${T.play}`),
        card(
          tf(T.chalWeeklyTitle, { week: wk.week }),
          [
            `${MODES[wk.mode].icon} ${MODES[wk.mode].name}${runner ? '' : ` · ${WEAPON_TEXT[wk.weapons[0]].icon} ${WEAPON_TEXT[wk.weapons[0]].name} + ${WEAPON_TEXT[wk.weapons[1]].icon} ${WEAPON_TEXT[wk.weapons[1]].name}`}`,
            T.chalWeeklyDesc,
          ],
          weeklyBest,
          () => app.beginFlow(app.params.demo ? 'demo' : 'camera', 'weekly'),
          `▶ ${T.play}`,
        ),
      ),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn secondary grow', onclick: () => app.showStart() }, T.back)),
    ),
  );
  return { el };
}
