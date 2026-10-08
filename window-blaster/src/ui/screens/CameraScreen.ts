import type { App } from '../../app/App';
import { h } from '../dom';
import { T } from '../i18n';
import type { Screen } from '../Router';

/**
 * One tap grants camera + motion (iOS requires the motion request inside the
 * gesture), then the detector loads with a progress bar.
 */
export function CameraScreen(app: App): Screen {
  const bar = h('i', { style: 'width:0%' });
  const status = h('p', { class: 'muted small' }, ' ');
  const progress = h('div', { class: 'bar', style: 'display:none;margin:10px 0' }, bar);
  const btn = h('button', { class: 'btn block' }, `📷 ${T.cameraStart}`) as HTMLButtonElement;
  const retry = h('button', { class: 'btn block secondary', style: 'display:none', onclick: () => app.beginFlow('demo') }, `🕹️ ${T.demo}`);
  btn.addEventListener('click', () => {
    btn.disabled = true;
    progress.style.display = 'block';
    status.textContent = T.camscrPermissions;
    // synchronous inside the gesture
    const motionP = app.motion.requestPermission();
    app.sfx.unlock();
    void (async () => {
      await motionP;
      try {
        await app.startSource((f, label) => {
          bar.style.width = `${Math.round(f * 100)}%`;
          status.textContent = label;
        });
        app.afterCamera();
      } catch (e) {
        status.textContent = String((e as Error).message ?? e);
        btn.disabled = false;
        btn.textContent = T.camscrRetry;
        retry.style.display = 'block';
      }
    })();
  });
  const el = h(
    'div',
    { class: 'screen' },
    h('div', { class: 'card' }, h('h2', {}, `📷 ${T.cameraTitle}`), h('p', {}, T.cameraText), progress, status, btn, retry, h('button', { class: 'btn ghost block', onclick: () => app.showModeScreen() }, T.back)),
  );
  return { el };
}
