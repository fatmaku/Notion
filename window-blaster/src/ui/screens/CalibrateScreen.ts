import type { App } from '../../app/App';
import type { Quad, Vec2 } from '../../core/types';
import { clamp } from '../../core/math/vec';
import { capturePointer, h, toast } from '../dom';
import { T, tf } from '../i18n';
import type { Screen } from '../Router';

export interface CalibrateScreenApi extends Screen {
  onFrame(): void;
}

const LOUPE_PX = 132;
/** half size of the video region shown in the loupe (video px) */
const LOUPE_R = 44;

/**
 * Live calibration of the window pane. Built for fingers on a moving phone:
 * - corner handles (○) and edge handles (▬) with large hit areas; dragging is relative,
 *   so the corner never jumps under the finger
 * - one finger inside the pane moves the whole quad, two fingers scale it
 * - a loupe shows the magnified video under the finger
 * - while a finger is down the tracker is frozen (no gyro, no edge snap, no smoothing),
 *   afterwards it only refines the hand-placed quad within a few pixels
 */
export function CalibrateScreen(app: App): CalibrateScreenApi {
  const el = h('div', { class: 'screen transparent' });
  const status = h('span', { class: 'badge' }, '…');
  const top = h('div', { class: 'calib-top' }, h('div', {}, h('b', {}, T.calibTitle)), h('span', { class: 'hint' }, T.calibHint), h('div', { style: 'margin-top:6px' }, status));
  const pane = h('div', { class: 'calib-pane' });
  const corners: HTMLElement[] = [0, 1, 2, 3].map(() => h('div', { class: 'handle corner' }));
  // edge i joins corner i and corner (i+1)%4: top, right, bottom, left
  const edges: HTMLElement[] = [0, 1, 2, 3].map((i) => h('div', { class: `handle edge ${i % 2 ? 'v' : ''}` }));
  const runner = app.session.mode === 'side-runner';
  const groundHandle = h('div', { class: 'handle ground', style: runner ? '' : 'display:none' });
  const loupe = h('canvas', { class: 'loupe' }) as HTMLCanvasElement;

  type Drag =
    | { kind: 'corner'; idx: number; grab: Vec2 }
    | { kind: 'edge'; idx: number; anchor: Vec2; base: Quad }
    | { kind: 'ground' }
    | { kind: 'pane'; base: Quad; anchor: Vec2; m0: Vec2 | null; d0: number };
  let drag: Drag | null = null;
  let activeEl: HTMLElement | null = null;
  const panePointers = new Map<number, Vec2>();

  const wt = () => app.windowTracker;
  const rawQuad = (): Quad | null => (wt() ? (wt()!.rawQuad.map((p) => ({ ...p })) as Quad) : null);
  const frame = () => app.layers.frameRect();
  const clampPt = (p: Vec2): Vec2 => {
    const f = frame();
    return { x: clamp(p.x, f.x, f.x + f.w), y: clamp(p.y, f.y, f.y + f.h) };
  };
  const toVideoPoint = (e: PointerEvent): Vec2 => {
    const r = app.layers.stage.getBoundingClientRect();
    return app.layers.toVideo(e.clientX - r.left, e.clientY - r.top);
  };
  const apply = (q: Quad) => wt()?.setManual(q.map(clampPt) as Quad);

  const begin = (e: PointerEvent, target: HTMLElement | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (target) capturePointer(target, e.pointerId);
    wt()?.beginEdit();
    activeEl?.classList.remove('active');
    activeEl = target;
    target?.classList.add('active');
  };
  const finish = () => {
    drag = null;
    activeEl?.classList.remove('active');
    activeEl = null;
    loupe.style.display = 'none';
    wt()?.endEdit();
  };

  // ---- corner / edge / ground handles
  const startCorner = (idx: number) => (e: PointerEvent) => {
    const q = rawQuad();
    if (!q) return;
    begin(e, e.currentTarget as HTMLElement);
    const p = toVideoPoint(e);
    drag = { kind: 'corner', idx, grab: { x: q[idx].x - p.x, y: q[idx].y - p.y } };
    showLoupe(e, q[idx]);
  };
  const startEdge = (idx: number) => (e: PointerEvent) => {
    const q = rawQuad();
    if (!q) return;
    begin(e, e.currentTarget as HTMLElement);
    drag = { kind: 'edge', idx, anchor: toVideoPoint(e), base: q };
    showLoupe(e, edgeMid(q, idx));
  };
  const startGround = (e: PointerEvent) => {
    begin(e, e.currentTarget as HTMLElement);
    drag = { kind: 'ground' };
  };
  const moveHandle = (e: PointerEvent) => {
    if (!drag || drag.kind === 'pane' || !wt()) return;
    const p = toVideoPoint(e);
    if (drag.kind === 'corner') {
      const q = rawQuad()!;
      q[drag.idx] = clampPt({ x: p.x + drag.grab.x, y: p.y + drag.grab.y });
      apply(q);
      showLoupe(e, q[drag.idx]);
    } else if (drag.kind === 'edge') {
      const dx = p.x - drag.anchor.x;
      const dy = p.y - drag.anchor.y;
      const q = drag.base.map((c) => ({ ...c })) as Quad;
      const a = drag.idx;
      const b = (drag.idx + 1) % 4;
      q[a] = { x: q[a].x + dx, y: q[a].y + dy };
      q[b] = { x: q[b].x + dx, y: q[b].y + dy };
      apply(q);
      showLoupe(e, edgeMid(q, drag.idx));
    } else {
      // ground line: fraction between the top and bottom edge at this x
      const q = wt()!.get().quad;
      const tx = (p.x - q[0].x) / Math.max(1, q[1].x - q[0].x);
      const topY = q[0].y + (q[1].y - q[0].y) * clamp(tx, 0, 1);
      const bx = (p.x - q[3].x) / Math.max(1, q[2].x - q[3].x);
      const botY = q[3].y + (q[2].y - q[3].y) * clamp(bx, 0, 1);
      wt()!.groundV = clamp((p.y - topY) / Math.max(1, botY - topY), 0.3, 0.98);
    }
  };
  const endHandle = (e: PointerEvent) => {
    if (!drag || drag.kind === 'pane') return;
    e.stopPropagation();
    finish();
  };
  corners.forEach((hd, i) => {
    hd.addEventListener('pointerdown', startCorner(i));
    hd.addEventListener('pointermove', moveHandle);
    hd.addEventListener('pointerup', endHandle);
    hd.addEventListener('pointercancel', endHandle);
  });
  edges.forEach((hd, i) => {
    hd.addEventListener('pointerdown', startEdge(i));
    hd.addEventListener('pointermove', moveHandle);
    hd.addEventListener('pointerup', endHandle);
    hd.addEventListener('pointercancel', endHandle);
  });
  groundHandle.addEventListener('pointerdown', startGround);
  groundHandle.addEventListener('pointermove', moveHandle);
  groundHandle.addEventListener('pointerup', endHandle);
  groundHandle.addEventListener('pointercancel', endHandle);

  // ---- pane: one finger moves the whole quad, two fingers scale it about their midpoint
  const rebase = () => {
    const q = rawQuad();
    if (!q) return;
    const pts = [...panePointers.values()];
    if (pts.length >= 2) {
      const m0 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      drag = { kind: 'pane', base: q, anchor: m0, m0, d0: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)) };
    } else if (pts.length === 1) drag = { kind: 'pane', base: q, anchor: pts[0], m0: null, d0: 1 };
  };
  pane.addEventListener('pointerdown', (e) => {
    if (!wt()) return;
    if (!panePointers.size) begin(e, pane);
    else {
      e.preventDefault();
      capturePointer(pane, e.pointerId);
    }
    panePointers.set(e.pointerId, toVideoPoint(e));
    rebase();
  });
  pane.addEventListener('pointermove', (e) => {
    if (!drag || drag.kind !== 'pane' || !panePointers.has(e.pointerId)) return;
    panePointers.set(e.pointerId, toVideoPoint(e));
    const pts = [...panePointers.values()];
    let q: Quad;
    if (pts.length >= 2 && drag.m0) {
      const m = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const s = clamp(Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / drag.d0, 0.4, 2.5);
      const m0 = drag.m0;
      q = drag.base.map((c) => ({ x: (c.x - m0.x) * s + m.x, y: (c.y - m0.y) * s + m.y })) as Quad;
    } else {
      const dx = pts[0].x - drag.anchor.x;
      const dy = pts[0].y - drag.anchor.y;
      q = drag.base.map((c) => ({ x: c.x + dx, y: c.y + dy })) as Quad;
    }
    apply(q);
  });
  const paneUp = (e: PointerEvent) => {
    if (!panePointers.has(e.pointerId)) return;
    panePointers.delete(e.pointerId);
    if (panePointers.size) rebase();
    else finish();
  };
  pane.addEventListener('pointerup', paneUp);
  pane.addEventListener('pointercancel', paneUp);

  // ---- loupe
  function showLoupe(e: PointerEvent, at: Vec2): void {
    const video = app.layers.video;
    if (!video.videoWidth) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (loupe.width !== LOUPE_PX * dpr) {
      loupe.width = LOUPE_PX * dpr;
      loupe.height = LOUPE_PX * dpr;
    }
    const c = loupe.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, LOUPE_PX, LOUPE_PX);
    try {
      c.drawImage(video, at.x - LOUPE_R, at.y - LOUPE_R, LOUPE_R * 2, LOUPE_R * 2, 0, 0, LOUPE_PX, LOUPE_PX);
    } catch {
      /* frame not ready */
    }
    // the current quad, magnified, so the user sees where the edge sits relative to the frame
    const q = rawQuad();
    if (q) {
      const k = LOUPE_PX / (LOUPE_R * 2);
      c.strokeStyle = '#ffb020';
      c.lineWidth = 2;
      c.beginPath();
      q.forEach((p, i) => {
        const x = (p.x - at.x) * k + LOUPE_PX / 2;
        const y = (p.y - at.y) * k + LOUPE_PX / 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      });
      c.closePath();
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(LOUPE_PX / 2, LOUPE_PX / 2 - 14);
    c.lineTo(LOUPE_PX / 2, LOUPE_PX / 2 + 14);
    c.moveTo(LOUPE_PX / 2 - 14, LOUPE_PX / 2);
    c.lineTo(LOUPE_PX / 2 + 14, LOUPE_PX / 2);
    c.stroke();
    const r = app.layers.stage.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const above = cy > LOUPE_PX + 40;
    loupe.style.left = `${clamp(cx, LOUPE_PX / 2 + 4, app.layers.cssW - LOUPE_PX / 2 - 4)}px`;
    loupe.style.top = `${above ? cy - LOUPE_PX / 2 - 56 : cy + LOUPE_PX / 2 + 56}px`;
    loupe.style.display = 'block';
  }

  const bar = h(
    'div',
    { class: 'calib-bar' },
    h('button', { class: 'btn secondary', onclick: () => app.showModeScreen() }, T.back),
    h(
      'button',
      {
        class: 'btn secondary',
        onclick: () => {
          if (!wt()?.recenter()) toast(T.calibNoClearPane);
        },
      },
      `✨ ${T.calibAuto}`,
    ),
    h('button', { class: 'btn secondary', onclick: () => wt()?.setFullFrame(true) }, `⛶ ${T.calibFull}`),
    h('button', { class: 'btn grow', onclick: () => app.afterCalibrate() }, `✅ ${T.calibDone}`),
  );
  el.append(pane, top, ...edges, ...corners, groundHandle, loupe, bar);

  // handles stay reachable even when the corner lies outside the visible (cropped) video
  const place = (hd: HTMLElement, p: Vec2, margin = 24) => {
    const c = app.layers.toCss(p);
    hd.style.left = `${clamp(c.x, margin, app.layers.cssW - margin)}px`;
    hd.style.top = `${clamp(c.y, margin + 84, app.layers.cssH - margin - 70)}px`;
  };

  return {
    el,
    onFrame() {
      const tracker = wt();
      if (!tracker) return;
      const s = tracker.get();
      const q = tracker.isEditing ? tracker.rawQuad : s.quad;
      q.forEach((p, i) => place(corners[i], p));
      edges.forEach((hd, i) => place(hd, edgeMid(q, i)));
      if (runner) {
        const [a, b] = tracker.ground();
        place(groundHandle, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      const conf = Math.round(s.confidence * 100);
      const est = tracker.lastEstimate;
      let text: string;
      let cls: string;
      if (tracker.isEditing) {
        text = T.calibStatusEditing;
        cls = 'badge';
      } else if (s.mode === 'tracking') {
        text = tf(T.calibStatusTracking, { conf });
        cls = 'badge ok';
      } else if (s.mode === 'degraded') {
        text = tf(T.calibStatusDegraded, { conf });
        cls = 'badge warn';
      } else if (s.mode === 'fullframe') {
        text = est && est.kind === 'fullframe' && est.contrast < 0.12 ? T.calibStatusLowContrast : T.calibStatusFullFrame;
        cls = 'badge';
      } else {
        text = T.calibStatusNone;
        cls = 'badge bad';
      }
      if (status.textContent !== text) status.textContent = text;
      if (status.className !== cls) status.className = cls;
    },
  };
}

function edgeMid(q: Quad, i: number): Vec2 {
  const a = q[i];
  const b = q[(i + 1) % 4];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
