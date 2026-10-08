import type { App } from '../../app/App';
import { sanitizeCal } from '../../app/Settings';
import type { GlassesCal } from '../../render/Layers';
import { PAD, shapeStick } from '../../input/bindings';
import { capturePointer, h, toast } from '../dom';
import { T } from '../i18n';
import type { Screen } from '../Router';

export interface GlassesAlignApi extends Screen {
  onFrame(now: number): void;
}

/**
 * See-through glasses: the faint camera image is shown on top of the real view; the player
 * drags (move) and pinches (zoom) until both line up. The result maps every effect onto the
 * real world. Works with touch, mouse wheel, keyboard (arrows, + / −) and gamepad.
 */
export function GlassesAlignScreen(app: App, onDone: () => void, onBack: () => void): GlassesAlignApi {
  const L = app.layers;
  let cal: GlassesCal = sanitizeCal(app.settings.data.glassesCal);
  let ghost = true;
  const apply = () => {
    cal = sanitizeCal(cal);
    L.setCal(cal);
    readout.textContent = `${Math.round(cal.k * 100)} % · ${(cal.dx * 100).toFixed(1)} / ${(cal.dy * 100).toFixed(1)}`;
  };
  const zoom = (f: number) => {
    cal = { ...cal, k: cal.k * f };
    apply();
  };
  const shift = (dx: number, dy: number) => {
    cal = { ...cal, dx: cal.dx + dx, dy: cal.dy + dy };
    apply();
  };

  const status = h('div', { class: 'hint' }, T.glAlignHint);
  const readout = h('span', { class: 'badge', style: 'font-variant-numeric:tabular-nums' });
  const top = h('div', { class: 'calib-top' }, h('b', {}, `🕶️ ${T.glAlignTitle}`), status);

  // drag = move, two fingers = zoom
  const pane = h('div', { class: 'calib-pane' });
  const pts = new Map<number, { x: number; y: number }>();
  let pinch0 = 0;
  pane.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capturePointer(pane, e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  pane.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const nx = e.clientX;
    const ny = e.clientY;
    if (pts.size >= 2) {
      pts.set(e.pointerId, { x: nx, y: ny });
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 10 && d > 10) zoom(d / pinch0);
      pinch0 = d;
      return;
    }
    shift((nx - p.x) / L.cssW, (ny - p.y) / L.cssH);
    pts.set(e.pointerId, { x: nx, y: ny });
  });
  const lift = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    pinch0 = 0;
  };
  pane.addEventListener('pointerup', lift);
  pane.addEventListener('pointercancel', lift);
  pane.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  const ghostBtn = h('button', { class: 'btn secondary', onclick: () => setGhost(!ghost) }, `👁 ${T.glAlignGhost}`);
  const setGhost = (on: boolean) => {
    ghost = on;
    document.body.classList.toggle('glasses-ghost', on);
    ghostBtn.classList.toggle('secondary', !on);
  };
  const done = () => {
    app.settings.patch({ glassesCal: cal, glassesAligned: true, glassesAspect: L.cssW / Math.max(1, L.cssH) });
    onDone();
  };
  const smallBtn = 'min-width:52px';
  const bar = h(
    'div',
    { class: 'calib-bar' },
    h('button', { class: 'btn secondary', onclick: () => onBack() }, T.back),
    h('button', { class: 'btn secondary', style: smallBtn, 'aria-label': T.glAlignZoomOut, onclick: () => zoom(1 / 1.03) }, '−'),
    h('button', { class: 'btn secondary', style: smallBtn, 'aria-label': T.glAlignZoomIn, onclick: () => zoom(1.03) }, '+'),
    h(
      'button',
      {
        class: 'btn secondary',
        onclick: () => {
          cal = { k: 1, dx: 0, dy: 0 };
          apply();
        },
      },
      `⟲ ${T.glAlignReset}`,
    ),
    ghostBtn,
    readout,
    h('button', { class: 'btn grow', 'data-done': '1', onclick: done }, `✅ ${T.glAlignDone}`),
  );

  const el = h('div', { class: 'screen transparent glasses-align' }, pane, top, bar);

  const onKey = (e: KeyboardEvent) => {
    const big = e.shiftKey ? 5 : 1;
    const step = 0.004 * big;
    let used = true;
    if (e.code === 'ArrowLeft') shift(-step, 0);
    else if (e.code === 'ArrowRight') shift(step, 0);
    else if (e.code === 'ArrowUp') shift(0, -step);
    else if (e.code === 'ArrowDown') shift(0, step);
    else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'PageUp') zoom(1 + 0.01 * big);
    else if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'PageDown') zoom(1 / (1 + 0.01 * big));
    else if (e.code === 'Escape') onBack();
    else used = false;
    if (used) e.preventDefault();
  };

  let prevA = true; // the A press that opened this screen must not finish it
  let prevB = true;
  let prevY = true;
  let lastNow = 0;
  let started = false;
  /** false once the screen was left – a camera start finishing later must not touch anything */
  let alive = true;

  return {
    el,
    enter() {
      alive = true;
      app.input.menu.suspended = true;
      window.addEventListener('keydown', onKey);
      setGhost(true);
      apply();
      // alignment needs the real camera (a demo left running from an earlier round would line up a fake street)
      const wantDemo = app.params.demo;
      if ((!app.frame || (!wantDemo && app.frame.kind !== 'camera')) && !started) {
        started = true;
        status.textContent = T.glAlignStarting;
        app.session.source = wantDemo ? 'demo' : 'camera';
        void app
          .startSource()
          .then(() => {
            if (!alive) return;
            status.textContent = T.glAlignHint;
            apply();
          })
          .catch((err: unknown) => {
            if (!alive) return;
            toast(String((err as Error)?.message ?? err), 4000);
            onBack();
          });
      }
    },
    exit() {
      alive = false;
      app.input.menu.suspended = false;
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('glasses-ghost');
      // leaving without "done" restores the saved alignment
      app.applySettings();
    },
    onFrame(now: number) {
      const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0;
      lastNow = now;
      const gp = app.input.pad();
      if (gp) {
        const ls = shapeStick(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
        const dpx = (gp.buttons[PAD.RIGHT]?.pressed ? 1 : 0) - (gp.buttons[PAD.LEFT]?.pressed ? 1 : 0);
        const dpy = (gp.buttons[PAD.DOWN]?.pressed ? 1 : 0) - (gp.buttons[PAD.UP]?.pressed ? 1 : 0);
        const mx = ls.x * 0.25 + dpx * 0.04;
        const my = ls.y * 0.25 + dpy * 0.04;
        if (mx || my) shift(mx * dt, my * dt);
        const rs = shapeStick(0, gp.axes[3] ?? 0).y;
        const trig = (gp.buttons[PAD.RT]?.value ?? 0) - (gp.buttons[PAD.LT]?.value ?? 0);
        const z = -rs * 0.6 + trig * 0.6;
        if (Math.abs(z) > 0.02) zoom(Math.exp(z * dt));
        const a = !!gp.buttons[PAD.A]?.pressed;
        const b = !!gp.buttons[PAD.B]?.pressed;
        const y = !!gp.buttons[PAD.Y]?.pressed;
        if (a && !prevA) done();
        if (b && !prevB) onBack();
        if (y && !prevY) setGhost(!ghost);
        prevA = a;
        prevB = b;
        prevY = y;
      } else {
        prevA = false;
        prevB = false;
        prevY = false;
      }
      // live detections help to line things up on passing cars
      const c = L.fx;
      c.save();
      c.lineWidth = 3 / Math.max(0.01, L.scale);
      c.strokeStyle = 'rgba(255,176,32,0.9)';
      for (const t of app.tracker.active) {
        const b = t.predict(now - app.settings.data.cameraLatencyMs);
        c.strokeRect(b.x, b.y, b.w, b.h);
      }
      // outline of the camera frame and its centre
      const fr = L.frameRect();
      c.strokeStyle = 'rgba(56,189,248,0.8)';
      c.setLineDash([16 / L.scale, 10 / L.scale]);
      c.strokeRect(fr.x, fr.y, fr.w, fr.h);
      c.setLineDash([]);
      const cx = fr.w / 2;
      const cy = fr.h / 2;
      const r = 26 / L.scale;
      c.beginPath();
      c.moveTo(cx - r, cy);
      c.lineTo(cx + r, cy);
      c.moveTo(cx, cy - r);
      c.lineTo(cx, cy + r);
      c.stroke();
      c.restore();
    },
  };
}
