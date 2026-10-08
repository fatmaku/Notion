import type { App } from '../../app/App';
import type { SettingsData } from '../../app/Settings';
import { h } from '../dom';
import { LANGS, T, getLang } from '../i18n';
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
          placeholder: T.setNickPlaceholder,
          value: s.data.nickname,
          oninput: (e) => s.patch({ nickname: (e.target as HTMLInputElement).value.trim() }),
        }),
      ),
      h(
        'div',
        { class: 'row', style: 'align-items:center;margin:6px 0' },
        h('span', { class: 'muted small' }, T.setLangLabel),
        ...LANGS.map((l) =>
          h(
            'button',
            {
              class: `btn ${getLang() === l.id ? '' : 'secondary'}`,
              style: 'min-height:40px;padding:8px 14px;font-size:14px',
              onclick: () => {
                s.patch({ lang: l.id });
                app.router.show(SettingsScreen(app, onBack));
              },
            },
            l.label,
          ),
        ),
      ),
      toggle('sound', T.setSound),
      range('sfxVolume', T.setSfxVolume, 0, 100, 10, ' %'),
      toggle('music', T.setMusic),
      range('musicVolume', T.setMusicVolume, 0, 100, 10, ' %'),
      toggle('battery', T.setBattery),
      toggle('haptics', T.setHaptics),
      toggle('stretchFill', T.setStretchFill),
      toggle('poleDetector', T.setPoleDetector),
      toggle('showBoxes', T.setShowBoxes),
      toggle('debug', T.setDebug),
      range('roundSeconds', T.setRoundSeconds, 0, 180, 30, ' s'),
      range('difficulty', T.setDifficulty, 0, 2, 1),
      toggle('leftHanded', T.setLeftHanded),
      range('hfovDeg', T.setHfov, 50, 100, 1, '°'),
      range('cameraLatencyMs', T.setCameraLatency, 0, 200, 10, ' ms'),
      toggle('invertPan', T.setInvertPan),
      toggle('invertTilt', T.setInvertTilt),
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
