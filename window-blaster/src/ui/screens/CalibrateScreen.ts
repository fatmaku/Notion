import type { App } from '../../app/App';
import type { Quad, Vec2 } from '../../core/types';
import { clamp } from '../../core/math/vec';
import { capturePointer, h, toast } from '../dom';
import { T } from '../i18n/de';
import type { Screen } from '../Router';

export interface CalibrateScreenApi extends Screen {
  onFrame(): void;
}

/**
 * Live calibration: the tracker's quad is shown on the video; four draggable
 * corner handles (and a ground-line handle for the runner) refine it.
 */
export function CalibrateScreen(app: App): CalibrateScreenApi {
  const el = h('div', { class: 'screen transparent' });
  const status = h('span', { class: 'badge' }, '…');
  const top = h('div', { class: 'calib-top' }, h('div', {}, h('b', {}, T.calibTitle), ' – ', T.calibHint), h('div', { style: 'margin-top:6px' }, status));
  const handles: HTMLElement[] = [0, 1, 2, 3].map(() => h('div', { class: 'handle' }));
  const runner = app.session.mode === 'side-runner';
  const groundHandle = h('div', { class: 'handle ground', style: runner ? '' : 'display:none' });
  let dragging: number | null = null; // 0..3 corners, 4 = ground
  let editQuad: Quad | null = null;

  const toVideoPoint = (e: PointerEvent): Vec2 => {
    const r = app.layers.stage.getBoundingClientRect();
    const p = app.layers.toVideo(e.clientX - r.left, e.clientY - r.top);
    const f = app.layers.frameRect();
    return { x: clamp(p.x, f.x, f.x + f.w), y: clamp(p.y, f.y, f.y + f.h) };
  };

  const startDrag = (idx: number) => (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    capturePointer(e.target as HTMLElement, e.pointerId);
    dragging = idx;
    editQuad = app.windowTracker ? (app.windowTracker.get().quad.map((p) => ({ ...p })) as Quad) : null;
  };
  const moveDrag = (e: PointerEvent) => {
    if (dragging === null || !editQuad || !app.windowTracker) return;
    const p = toVideoPoint(e);
    if (dragging < 4) {
      editQuad[dragging] = p;
      app.windowTracker.setManual(editQuad);
    } else {
      // ground line: fraction between the top and bottom edge at this x
      const q = editQuad;
      const tx = (p.x - q[0].x) / Math.max(1, q[1].x - q[0].x);
      const topY = q[0].y + (q[1].y - q[0].y) * clamp(tx, 0, 1);
      const bx = (p.x - q[3].x) / Math.max(1, q[2].x - q[3].x);
      const botY = q[3].y + (q[2].y - q[3].y) * clamp(bx, 0, 1);
      app.windowTracker.groundV = clamp((p.y - topY) / Math.max(1, botY - topY), 0.3, 0.98);
    }
  };
  const endDrag = (e: PointerEvent) => {
    if (dragging === null) return;
    e.stopPropagation();
    dragging = null;
    editQuad = null;
  };
  handles.forEach((hd, i) => {
    hd.addEventListener('pointerdown', startDrag(i));
    hd.addEventListener('pointermove', moveDrag);
    hd.addEventListener('pointerup', endDrag);
    hd.addEventListener('pointercancel', endDrag);
  });
  groundHandle.addEventListener('pointerdown', startDrag(4));
  groundHandle.addEventListener('pointermove', moveDrag);
  groundHandle.addEventListener('pointerup', endDrag);
  groundHandle.addEventListener('pointercancel', endDrag);

  const bar = h(
    'div',
    { class: 'calib-bar' },
    h('button', { class: 'btn secondary', onclick: () => app.showModeScreen() }, T.back),
    h(
      'button',
      {
        class: 'btn secondary',
        onclick: () => {
          if (!app.windowTracker?.recenter()) toast('Keine klare Scheibe erkannt – Ecken von Hand setzen oder „Ganzes Bild“.');
        },
      },
      `✨ ${T.calibAuto}`,
    ),
    h('button', { class: 'btn secondary', onclick: () => app.windowTracker?.setFullFrame(true) }, `⛶ ${T.calibFull}`),
    h('button', { class: 'btn grow', onclick: () => app.afterCalibrate() }, `✅ ${T.calibDone}`),
  );
  el.append(top, ...handles, groundHandle, bar);

  const place = (hd: HTMLElement, p: Vec2) => {
    const c = app.layers.toCss(p);
    hd.style.left = `${c.x}px`;
    hd.style.top = `${c.y}px`;
  };

  return {
    el,
    onFrame() {
      const wt = app.windowTracker;
      if (!wt) return;
      const s = wt.get();
      s.quad.forEach((p, i) => place(handles[i], p));
      if (runner) {
        const [a, b] = wt.ground();
        place(groundHandle, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      const conf = Math.round(s.confidence * 100);
      const est = wt.lastEstimate;
      let text: string;
      let cls: string;
      if (s.mode === 'tracking') {
        text = `Scheibe erkannt · ${conf} %`;
        cls = 'badge ok';
      } else if (s.mode === 'degraded') {
        text = `Unsicher · ${conf} % – Ecken prüfen`;
        cls = 'badge warn';
      } else if (s.mode === 'fullframe') {
        text = est && est.kind === 'fullframe' && est.contrast < 0.12 ? 'Wenig Kontrast (Nacht?) – ganzes Bild oder Ecken setzen' : 'Ganzes Bild = Spielfläche';
        cls = 'badge';
      } else {
        text = 'Keine Scheibe – Ecken setzen oder „Ganzes Bild“';
        cls = 'badge bad';
      }
      if (status.textContent !== text) status.textContent = text;
      if (status.className !== cls) status.className = cls;
    },
  };
}
