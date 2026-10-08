import type { App } from '../../app/App';
import type { GameModeId, WindowSide } from '../../core/types';
import { h } from '../dom';
import { MODES, T } from '../i18n';
import type { Screen } from '../Router';

export function ModeScreen(app: App): Screen {
  let mode: GameModeId = app.session.mode;
  let side: WindowSide = app.session.side === 'front' ? 'right' : app.session.side;
  const grid = h('div', { class: 'choice-grid' });
  const sideRow = h('div', { class: 'row', style: 'margin-top:12px;align-items:center' });
  const render = () => {
    grid.replaceChildren(
      ...(Object.keys(MODES) as GameModeId[]).map((k) =>
        h(
          'button',
          {
            class: `choice${k === mode ? ' selected' : ''}`,
            onclick: () => {
              mode = k;
              render();
            },
          },
          h('div', { class: 'icon' }, MODES[k].icon),
          h('div', { class: 'name' }, MODES[k].name),
          h('div', { class: 'desc' }, MODES[k].desc),
        ),
      ),
    );
    const isSide = mode !== 'front-shooter';
    sideRow.style.display = isSide ? 'flex' : 'none';
    sideRow.replaceChildren(
      h('span', { class: 'muted small' }, `${T.calibSide}:`),
      ...(['left', 'right'] as WindowSide[]).map((s) =>
        h(
          'button',
          {
            class: `btn ${s === side ? '' : 'secondary'}`,
            style: 'min-height:40px;padding:8px 14px;font-size:14px',
            onclick: () => {
              side = s;
              render();
            },
          },
          s === 'left' ? T.modeSideLeft : T.modeSideRight,
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
      h('h2', {}, T.modeTitle),
      grid,
      sideRow,
      h(
        'div',
        { class: 'row', style: 'margin-top:16px' },
        h('button', { class: 'btn secondary', onclick: () => app.showStart() }, T.back),
        h(
          'button',
          {
            class: 'btn grow',
            onclick: () => {
              app.session.mode = mode;
              app.session.side = mode === 'front-shooter' ? 'front' : side;
              app.afterMode();
            },
          },
          T.next,
        ),
      ),
    ),
  );
  return { el };
}
