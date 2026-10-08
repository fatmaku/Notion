import type { App } from '../../app/App';
import type { GameMode, PointerEv } from '../../game/GameMode';
import { capturePointer, h } from '../dom';
import { T } from '../i18n';
import type { Screen } from '../Router';

/** Transparent overlay during play: forwards touches to the mode, hosts HUD buttons and the pause menu. */
export function PlayScreen(app: App, mode: GameMode): Screen {
  const el = h('div', { class: 'screen transparent play' });
  const acts = mode.actions();

  const toEv = (e: PointerEvent, type: PointerEv['type']): PointerEv => {
    const r = app.layers.stage.getBoundingClientRect();
    const p = app.layers.toVideo(e.clientX - r.left, e.clientY - r.top);
    return { type, x: p.x, y: p.y, t: performance.now(), id: e.pointerId };
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.target !== el) return;
    e.preventDefault();
    capturePointer(el, e.pointerId);
    app.sfx.unlock();
    mode.pointer(toEv(e, 'down'));
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    mode.pointer(toEv(e, 'move'));
  });
  el.addEventListener('pointerup', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    mode.pointer(toEv(e, 'up'));
  });
  el.addEventListener('pointercancel', (e) => mode.pointer(toEv(e, 'cancel')));

  const btn = (cls: string, label: string, onDown?: () => void, onUp?: () => void) => {
    const b = h('button', { class: `hud-btn ${cls}`, 'aria-label': label }, label);
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      capturePointer(b, e.pointerId);
      onDown?.();
    });
    const up = (e: Event) => {
      e.stopPropagation();
      onUp?.();
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    return b;
  };

  el.append(btn('pause', '⏸', () => app.togglePause()));
  if (acts.swap) el.append(btn('swap', '🔁', acts.swap));
  if (acts.reload) el.append(btn('reload', '🔄', acts.reload));
  if (acts.recenter) el.append(btn('recenter', '⌖', () => app.recenter()));
  if (acts.jump) el.append(btn('jump', T.jump, acts.jump, acts.jumpRelease));
  if (acts.duck) el.append(btn('duck', T.duck, acts.duck, acts.duckRelease));

  // hidden debug toggle: 5 quick taps in the top-left corner
  let taps = 0;
  let lastTap = 0;
  const dbg = h('button', { style: 'position:absolute;left:0;top:0;width:60px;height:60px;opacity:0;border:0;background:transparent' });
  dbg.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const now = performance.now();
    taps = now - lastTap < 600 ? taps + 1 : 1;
    lastTap = now;
    if (taps >= 5) {
      taps = 0;
      app.overlay.toggle();
    }
  });
  el.append(dbg);

  const pauseCard = h(
    'div',
    { class: 'card', style: 'display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw)' },
    h('h2', {}, `⏸ ${T.paused}`),
    h(
      'div',
      { class: 'col' },
      h('button', { class: 'btn block', onclick: () => app.togglePause() }, T.resume),
      h('button', { class: 'btn block secondary', onclick: () => void app.sharePhoto() }, `📸 ${T.playSharePhoto}`),
      h('button', { class: 'btn block secondary', onclick: () => app.showSettings() }, `⚙️ ${T.settings}`),
      h('button', { class: 'btn block danger', onclick: () => app.abortRound() }, T.quit),
    ),
  );
  pauseCard.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.append(pauseCard);

  const rotate = h(
    'div',
    { class: 'rotate-hint' },
    h('div', {}, h('div', { style: 'font-size:48px' }, '📱↻'), h('p', {}, T.rotateHint), h('button', { class: 'btn secondary', onclick: () => (rotate.style.display = 'none') }, T.playRotateAnyway)),
  );
  rotate.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.append(rotate);

  return {
    el,
    enter: () => document.body.classList.add('wants-landscape'),
    exit: () => document.body.classList.remove('wants-landscape'),
  };
}

export function setPauseVisible(screenEl: HTMLElement, visible: boolean): void {
  const card = screenEl.querySelector<HTMLElement>('.card');
  if (card) card.style.display = visible ? 'block' : 'none';
}
