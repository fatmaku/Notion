import type { App } from '../../app/App';
import { Party } from '../../app/Party';
import { fmtScore, h } from '../dom';
import { T, tf } from '../i18n';
import type { Screen } from '../Router';

/** Set up a hot-seat duel: names, number of rounds each. */
export function PartySetupScreen(app: App): Screen {
  const last = app.storage.get<{ names: string[]; rounds: number }>('party.v1', { names: [tf(T.partyPlayerDefault, { n: 1 }), tf(T.partyPlayerDefault, { n: 2 })], rounds: 1 });
  let names = [...last.names];
  let rounds = last.rounds;
  const list = h('div', { class: 'col' });
  const roundsRow = h('div', { class: 'row', style: 'align-items:center;margin-top:10px' });
  const render = () => {
    list.replaceChildren(
      ...names.map((n, i) =>
        h(
          'div',
          { class: 'row', style: 'align-items:center' },
          h('span', { style: 'width:28px;text-align:center;font-size:20px' }, ['🟡', '🔵', '🟢', '🟣'][i]),
          h('input', {
            type: 'text',
            maxlength: 14,
            value: n,
            placeholder: tf(T.partyPlayerDefault, { n: i + 1 }),
            'aria-label': tf(T.partyNameLabel, { n: i + 1 }),
            class: 'grow',
            oninput: (e) => (names[i] = (e.target as HTMLInputElement).value),
          }),
          names.length > 2
            ? h(
                'button',
                {
                  class: 'btn ghost',
                  style: 'min-height:36px;padding:4px 10px',
                  'aria-label': T.partyRemovePlayer,
                  onclick: () => {
                    names.splice(i, 1);
                    render();
                  },
                },
                '✕',
              )
            : null,
        ),
      ),
      ...(names.length < 4
        ? [
            h(
              'button',
              {
                class: 'btn secondary',
                onclick: () => {
                  names = [...names, tf(T.partyPlayerDefault, { n: names.length + 1 })];
                  render();
                },
              },
              T.partyAddPlayer,
            ),
          ]
        : []),
    );
    roundsRow.replaceChildren(
      h('span', { class: 'muted small' }, T.partyRoundsPerPlayer),
      ...[1, 2, 3].map((r) =>
        h(
          'button',
          {
            class: `btn ${r === rounds ? '' : 'secondary'}`,
            style: 'min-height:40px;padding:8px 14px;font-size:14px',
            onclick: () => {
              rounds = r;
              render();
            },
          },
          String(r),
        ),
      ),
    );
  };
  render();
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, T.partyTitle),
      h('p', { class: 'muted small' }, T.partyIntro),
      list,
      roundsRow,
      h(
        'div',
        { class: 'row', style: 'margin-top:16px' },
        h('button', { class: 'btn secondary', onclick: () => app.showStart() }, T.back),
        h(
          'button',
          {
            class: 'btn grow',
            onclick: () => {
              app.storage.set('party.v1', { names, rounds });
              app.beginParty(new Party(names, rounds));
            },
          },
          T.partyStart,
        ),
      ),
    ),
  );
  return { el };
}

/** Standings between rounds and the final result. */
export function PartyBoardScreen(app: App, party: Party): Screen {
  const s = party.standings();
  const colors = ['🟡', '🔵', '🟢', '🟣'];
  const winners = party.winners();
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, party.done ? T.partyOver : tf(T.partyRoundHeading, { played: party.playedRounds, total: party.totalRounds })),
      party.done ? h('div', { class: 'title', style: 'font-size:30px' }, winners.length > 1 ? tf(T.partyDraw, { names: winners.join(' & ') }) : tf(T.partyWins, { name: winners[0] })) : null,
      h(
        'ul',
        { class: 'list' },
        ...s.map((r) =>
          h(
            'li',
            { class: r.rank === 1 && party.playedRounds > 0 ? 'me' : '' },
            h('span', { class: 'name' }, `${r.rank}. ${colors[r.index]} ${r.player}`, h('span', { class: 'muted small' }, r.rounds.length ? `  (${r.rounds.map(fmtScore).join(' + ')})` : `  ${T.partyNotPlayed}`)),
            h('span', { class: 'score' }, fmtScore(r.total)),
          ),
        ),
      ),
      h(
        'div',
        { class: 'col', style: 'margin-top:14px' },
        party.done
          ? h('button', { class: 'btn block', onclick: () => app.beginParty(party.rematch()) }, T.partyRematch)
          : h('button', { class: 'btn block', onclick: () => app.partyPlayNext() }, tf(T.partyPlayNext, { name: String(party.current), round: party.roundNumber })),
        h('button', { class: 'btn block secondary', onclick: () => app.endParty() }, party.done ? T.partyToMenu : T.partyAbort),
      ),
    ),
  );
  return { el };
}
