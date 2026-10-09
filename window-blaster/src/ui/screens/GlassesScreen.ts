import type { App } from '../../app/App';
import { h, landscapeFullscreen } from '../dom';
import { T, tf } from '../i18n';
import type { Screen } from '../Router';

/**
 * "Brillen & Headsets": everything for AR glasses and headsets in one place – see-through mode
 * for display glasses, alignment, touchpad / gamepad control, the WebXR headset view, the
 * camera choice, and an honest list of what is not possible from a web page.
 */
export function GlassesScreen(app: App): Screen {
  const s = app.settings;
  const rerender = () => app.router.show(GlassesScreen(app));
  const toggle = (checked: boolean, label: string, onChange: (v: boolean) => void, id?: string) =>
    h(
      'label',
      { class: 'toggle' },
      h('span', {}, label),
      h('input', { type: 'checkbox', checked: checked ? true : undefined, 'data-setting': id, onchange: (e) => onChange((e.target as HTMLInputElement).checked) }),
    );

  // ---- display glasses on the phone
  const glasses = h(
    'div',
    { class: 'gl-section' },
    h('h3', {}, `🕶️ ${T.glPhoneTitle}`),
    h('p', {}, T.glPhoneText),
    toggle(s.data.glasses || app.params.glasses, T.glSeeThrough, (v) => {
      s.patch({ glasses: v });
      if (v) landscapeFullscreen();
      rerender();
    }, 'glasses'),
    s.data.glasses || app.params.glasses
      ? h(
          'button',
          {
            class: 'btn block',
            style: 'margin-top:8px',
            onclick: () => {
              landscapeFullscreen();
              app.showGlassesAlign(() => app.showGlasses(), () => app.showGlasses());
            },
          },
          `🎯 ${T.glAlignBtn}${s.data.glassesAligned ? '' : ` · ${T.glAlignNeeded}`}`,
        )
      : null,
    h('p', {}, T.glScreenModeText),
    h('ul', {}, h('li', {}, T.glTipLenses), h('li', {}, T.glTipAnchor), h('li', {}, T.glTipApprox)),
  );

  // ---- control without looking at the phone
  const padLine = h('p', { 'data-pad': '1' }, app.input.padId ? tf(T.glPadConnected, { name: app.input.padId.slice(0, 48) }) : T.glPadPress);
  const timer = setInterval(() => {
    const txt = app.input.padId ? tf(T.glPadConnected, { name: app.input.padId.slice(0, 48) }) : T.glPadPress;
    if (padLine.textContent !== txt) padLine.textContent = txt;
  }, 500);
  const keys = h(
    'div',
    { class: 'gl-keys' },
    h('b', {}, '🎮'),
    h('span', {}, T.glKeysPad),
    h('b', {}, '🏃'),
    h('span', {}, T.glKeysPadRunner),
    h('b', {}, '⌨️'),
    h('span', {}, T.glKeysKeyboard),
    h('b', {}, '📽️'),
    h('span', {}, T.glKeysRemote),
  );
  const control = h(
    'div',
    { class: 'gl-section' },
    h('h3', {}, `🎮 ${T.glControlTitle}`),
    toggle(s.data.touchpad, T.glTouchpad, (v) => s.patch({ touchpad: v }), 'touchpad'),
    padLine,
    keys,
  );

  // ---- headsets (WebXR)
  const xs = app.xrSupport;
  const headsetBody: (HTMLElement | null)[] = [];
  if (xs.headset) {
    headsetBody.push(
      h('p', {}, xs.ar ? T.glXrAvailableAr : T.glXrAvailableVr),
      toggle(s.data.headset, T.glXrToggle, (v) => {
        s.patch({ headset: v });
        rerender();
      }, 'headset'),
    );
    if (s.data.headset && xs.ar) {
      const viewBtn = (id: 'screen' | 'overlay', label: string) =>
        h(
          'button',
          {
            class: `btn ${s.data.xrView === id ? '' : 'secondary'}`,
            style: 'min-height:40px;padding:8px 12px;font-size:14px',
            onclick: () => {
              s.patch({ xrView: id });
              rerender();
            },
          },
          label,
        );
      headsetBody.push(h('div', { class: 'row', style: 'margin:6px 0' }, viewBtn('screen', `🖥️ ${T.glXrViewScreen}`), viewBtn('overlay', `✨ ${T.glXrViewOverlay}`)));
      headsetBody.push(h('p', {}, s.data.xrView === 'overlay' ? T.glXrOverlayText : T.glXrScreenText));
    }
    headsetBody.push(h('p', {}, T.glXrControls));
  } else {
    headsetBody.push(h('p', {}, T.glXrUnavailable));
    headsetBody.push(h('button', { class: 'btn block secondary', 'data-send-open': '1', onclick: () => app.showSend(() => app.showGlasses()) }, `📲 ${T.glXrOpenQr}`));
  }
  headsetBody.push(h('ul', {}, h('li', {}, T.glXrQuestCamera), h('li', {}, T.glXrTravel), h('li', {}, T.glXrOthers)));

  // camera choice (headsets list several cameras; labels appear after the first permission)
  const camSelect = h('select', {
    'aria-label': T.glCameraLabel,
    onchange: (e) => {
      s.patch({ cameraId: (e.target as HTMLSelectElement).value });
      // a running camera keeps its device – restart it with the new choice next time it is needed
      if (app.frame?.kind === 'camera' && !app.mode) app.stopSource();
    },
  }) as HTMLSelectElement;
  camSelect.append(h('option', { value: '' }, T.glCameraAuto));
  void navigator.mediaDevices
    ?.enumerateDevices?.()
    .then((list) => {
      list
        .filter((d) => d.kind === 'videoinput' && d.deviceId)
        .forEach((d, i) => camSelect.append(h('option', { value: d.deviceId, selected: d.deviceId === s.data.cameraId ? true : undefined }, d.label || tf(T.glCameraN, { n: i + 1 }))));
    })
    .catch(() => undefined);
  const headset = h(
    'div',
    { class: 'gl-section' },
    h('h3', {}, `🥽 ${T.glXrTitle}`),
    ...headsetBody,
    h('label', { class: 'field' }, h('span', {}, T.glCameraLabel), camSelect),
  );

  // ---- not possible
  const nope = h(
    'div',
    { class: 'gl-section' },
    h('h3', {}, `🚫 ${T.glNopeTitle}`),
    h('ul', {}, h('li', {}, T.glNopeRayBan), h('li', {}, T.glNopeDisplay), h('li', {}, T.glNopeVision), h('li', {}, T.glNopeHeadTracking)),
  );

  const el = h(
    'div',
    { class: 'screen', 'data-screen': 'glasses' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, `🕶️ ${T.glTitle}`),
      h('p', { class: 'muted small' }, T.glIntro),
      glasses,
      control,
      headset,
      nope,
      h('button', { class: 'btn block secondary', style: 'margin-top:14px', onclick: () => app.showStart() }, T.back),
    ),
  );
  return { el, exit: () => clearInterval(timer) };
}
