import type { App } from '../../app/App';
import type { RoundResult } from '../../game/GameMode';
import { MEDAL_ICON, medalFor, nextMedal } from '../../game/scoring/Medals';
import { fmtScore, fmtTime, h, toast } from '../dom';
import { renderResultCard, shareImage } from '../share';
import { MODES, T, WEAPON_TEXT } from '../i18n/de';
import type { Screen } from '../Router';

export function ResultsScreen(app: App, r: RoundResult, flags: { newBest: boolean; newDaily: boolean; newlyAffordable?: { icon: string; name: string }[] }): Screen {
  const medal = medalFor(r.mode, r.score);
  const nm = nextMedal(r.mode, r.score);
  const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
  const stat = (k: string, v: string) => [h('span', { class: 'muted' }, k), h('b', {}, v)];
  const submitBtn = h('button', { class: 'btn block secondary', onclick: () => app.submitScore(r) }, `🌍 ${T.submitScore}`);
  const share = async () => {
    const card = await renderResultCard(r, app.records.best(r.mode));
    const res = await shareImage(card, `window-blaster-${r.score}.png`, `Window Blaster – ${fmtScore(r.score)} Punkte`);
    toast(res === 'shared' ? 'Geteilt' : res === 'downloaded' ? 'Bild gespeichert' : res === 'cancelled' ? 'Abgebrochen' : 'Teilen nicht möglich');
  };
  const photo = r.photo ? h('div', { class: 'photo' }, h('img', { src: r.photo, alt: 'Bester Moment der Runde' }), h('span', { class: 'photo-label' }, '📸 Bester Moment')) : null;
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'row', style: 'align-items:center;justify-content:space-between' }, h('h2', {}, `${MODES[r.mode].icon} ${T.results}`), h('span', { class: 'medal' }, MEDAL_ICON[medal])),
      app.party?.lastPlayer ? h('p', { class: 'badge', style: 'margin:0 0 6px' }, `👥 Runde von ${app.party.lastPlayer}`) : null,
      h('div', { class: 'title', style: 'font-size:46px' }, fmtScore(r.score)),
      photo,
      h(
        'div',
        { class: 'row', style: 'align-items:center;margin-bottom:8px' },
        flags.newBest ? h('span', { class: 'badge ok' }, `★ ${T.newBest}`) : h('span', { class: 'muted small' }, `${T.best}: ${fmtScore(app.records.best(r.mode))}`),
        app.session.daily ? h('span', { class: `badge ${flags.newDaily ? 'ok' : 'warn'}` }, `📅 Tages-Challenge · heute ${fmtScore(app.records.dailyBest(r.mode))}`) : null,
      ),
      nm ? h('p', { class: 'small muted' }, `Noch ${fmtScore(nm.missing)} Punkte bis ${MEDAL_ICON[nm.medal]}`) : h('p', { class: 'small muted' }, 'Gold! Besser geht’s kaum.'),
      r.mode === 'side-runner'
        ? h(
            'div',
            { class: 'stats' },
            ...stat('Übersprungen', String(r.kills)),
            ...stat('Münzen', String(r.extra.coins ?? 0)),
            ...stat('Treffer kassiert', String(r.extra.hitsTaken ?? 0)),
            ...stat('Sprünge', String(r.shots)),
            ...stat(T.maxCombo, `×${r.maxCombo}`),
            ...stat(T.time, fmtTime(r.durationSec)),
          )
        : h(
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
      h('p', { class: 'small' }, `💰 +${fmtScore(r.score)} Guthaben → ${fmtScore(app.unlocks.balance)} Punkte`, flags.newlyAffordable?.length ? h('span', { class: 'badge ok', style: 'margin-left:8px' }, `Neu freischaltbar: ${flags.newlyAffordable.map((i) => i.icon).join(' ')}`) : null),
      r.source === 'demo' ? h('p', { class: 'small muted' }, 'Demo-Runde (synthetische Szene) – zählt nicht für die weltweite Rangliste.') : null,
      h(
        'div',
        { class: 'col', style: 'margin-top:12px' },
        app.party ? h('button', { class: 'btn block', onclick: () => app.showPartyBoard() }, '👥 Zum Duell-Stand') : h('button', { class: 'btn block', onclick: () => app.startRound() }, `🔁 ${T.again}`),
        r.source === 'camera' ? submitBtn : null,
        h('button', { class: 'btn block secondary', onclick: () => void share() }, '📤 Ergebnis teilen'),
        h('div', { class: 'row' }, h('button', { class: 'btn secondary grow', onclick: () => app.showLeaderboard() }, `🏆 ${T.leaderboard}`), h('button', { class: 'btn secondary grow', onclick: () => app.showShop() }, '🎁 Shop'), h('button', { class: 'btn secondary grow', onclick: () => app.showStart() }, T.menu)),
      ),
    ),
  );
  return { el };
}
