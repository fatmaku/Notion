import type { App } from '../../app/App';
import type { VehicleType } from '../../core/types';
import { capturePointer, h } from '../dom';
import { T, VEHICLES } from '../i18n';
import type { Screen } from '../Router';

/** Passenger-only gate: pick the vehicle, then hold the button for 2 seconds. */
export function SafetyScreen(app: App): Screen {
  let vehicle: VehicleType = app.session.vehicle;
  const grid = h('div', { class: 'choice-grid' });
  const render = () => {
    grid.replaceChildren(
      ...(Object.keys(VEHICLES) as VehicleType[]).map((k) =>
        h(
          'button',
          {
            class: `choice${k === vehicle ? ' selected' : ''}`,
            onclick: () => {
              vehicle = k;
              render();
            },
          },
          h('div', { class: 'icon' }, VEHICLES[k].icon),
          h('div', { class: 'name' }, VEHICLES[k].name),
          h('div', { class: 'desc' }, VEHICLES[k].desc),
        ),
      ),
    );
  };
  render();

  const fill = h('div', { class: 'fill' });
  const hold = h('button', { class: 'btn block hold' }, fill, h('span', {}, `✋ ${T.safetyHold}`));
  let raf = 0;
  let t0 = 0;
  const HOLD_MS = 2000;
  const cancel = () => {
    cancelAnimationFrame(raf);
    fill.style.width = '0%';
  };
  const step = () => {
    const p = Math.min(1, (performance.now() - t0) / HOLD_MS);
    fill.style.width = `${p * 100}%`;
    if (p >= 1) {
      app.sfx.unlock();
      app.session.vehicle = vehicle;
      app.settings.patch({ safetyAcceptedAt: Date.now() });
      app.afterSafety();
      return;
    }
    raf = requestAnimationFrame(step);
  };
  hold.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capturePointer(hold, e.pointerId);
    app.sfx.unlock();
    t0 = performance.now();
    raf = requestAnimationFrame(step);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) hold.addEventListener(ev, cancel);

  const el = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'card' },
      h('h2', {}, `🚦 ${T.safetyTitle}`),
      h('p', {}, T.safetyText),
      h('h2', { class: 'small muted', style: 'margin-top:14px' }, T.vehicleTitle),
      grid,
      h('p', { class: 'small muted' }, T.safetyPrivacy),
      hold,
      h('button', { class: 'btn ghost block', onclick: () => app.showStart() }, T.back),
    ),
  );
  return { el, exit: cancel };
}
