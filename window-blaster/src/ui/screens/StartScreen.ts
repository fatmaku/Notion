import type { App } from '../../app/App';
import { h } from '../dom';
import { T } from '../i18n/de';
import type { Screen } from '../Router';

export function StartScreen(app: App): Screen {
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h1', { class: 'title' }, 'Window ', h('span', { class: 'accent' }, 'Blaster')),
      h('p', { class: 'subtitle' }, T.tagline),
      h(
        'div',
        { class: 'col' },
        h('button', { class: 'btn block', onclick: () => app.beginFlow('camera') }, `🎥 ${T.play}`),
        h('button', { class: 'btn block secondary', onclick: () => app.beginFlow('demo') }, `🕹️ ${T.demo}`),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn secondary grow', onclick: () => app.showLeaderboard() }, `🏆 ${T.leaderboard}`),
          h('button', { class: 'btn secondary grow', onclick: () => app.showSettings() }, `⚙️ ${T.settings}`),
        ),
      ),
      h('p', { class: 'footer' }, `v${__APP_VERSION__} · ${T.safetyPrivacy}`),
    ),
  );
  return { el };
}
