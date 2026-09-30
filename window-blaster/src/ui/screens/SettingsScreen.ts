import type { App } from '../../app/App';
import type { SettingsData } from '../../app/Settings';
import { h } from '../dom';
import { T } from '../i18n/de';
import type { Screen } from '../Router';

export function SettingsScreen(app: App, onBack: () => void): Screen {
  const s = app.settings;
  const toggle = (key: keyof SettingsData, label: string) =>
    h(
      'label',
      { class: 'toggle' },
      h('span', {}, label),
      h('input', {
        type: 'checkbox',
        checked: s.data[key] ? true : undefined,
        onchange: (e) => s.patch({ [key]: (e.target as HTMLInputElement).checked } as Partial<SettingsData>),
      }),
    );
  const range = (key: keyof SettingsData, label: string, min: number, max: number, step: number, unit = '') => {
    const val = h('b', {}, `${s.data[key]}${unit}`);
    return h(
      'label',
      { class: 'field' },
      h('span', {}, label, ' ', val),
      h('input', {
        type: 'range',
        min,
        max,
        step,
        value: Number(s.data[key]),
        oninput: (e) => {
          const v = Number((e.target as HTMLInputElement).value);
          s.patch({ [key]: v } as Partial<SettingsData>);
          val.textContent = `${v}${unit}`;
        },
      }),
    );
  };
  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, `⚙️ ${T.settings}`),
      h(
        'label',
        { class: 'field' },
        h('span', {}, T.nickname),
        h('input', {
          type: 'text',
          maxlength: 16,
          placeholder: 'z. B. Beifahrer_42',
          value: s.data.nickname,
          oninput: (e) => s.patch({ nickname: (e.target as HTMLInputElement).value.trim() }),
        }),
      ),
      toggle('sound', '🔊 Sound'),
      toggle('haptics', '📳 Vibration'),
      toggle('stretchFill', '🪄 Verschwundene Autos realistisch füllen (Front)'),
      toggle('poleDetector', '🌳 Masten & Bäume als Hindernisse (experimentell)'),
      toggle('showBoxes', '🟩 Erkennungsboxen anzeigen'),
      toggle('debug', '🧪 Diagnose-Overlay'),
      range('roundSeconds', 'Rundenlänge (0 = endlos)', 0, 180, 30, ' s'),
      range('hfovDeg', 'Kamera-Sichtfeld (Tracking-Stärke)', 50, 100, 1, '°'),
      range('cameraLatencyMs', 'Kamera-Latenzausgleich', 0, 200, 10, ' ms'),
      toggle('invertPan', '↔️ Tracking horizontal invertieren'),
      toggle('invertTilt', '↕️ Tracking vertikal invertieren'),
      h(
        'button',
        {
          class: 'btn block',
          style: 'margin-top:14px',
          onclick: () => {
            app.applySettings();
            onBack();
          },
        },
        T.ok,
      ),
    ),
  );
  return { el };
}
