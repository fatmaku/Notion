import type { Quad, Rect, Vec2 } from '../core/types';
import type { Projectile } from '../game/Projectile';
import type { Track } from '../vision/Tracker';

/** Drawing helpers in VIDEO px space (ctx already transformed by Layers). */
export class FxRenderer {
  constructor(readonly ctx: CanvasRenderingContext2D) {}

  crosshair(p: Vec2, r: number, color = 'rgba(255,255,255,0.85)', active = false): void {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = active ? 3 : 2;
    c.beginPath();
    c.arc(p.x, p.y, r, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      c.moveTo(p.x + dx * r * 0.5, p.y + dy * r * 0.5);
      c.lineTo(p.x + dx * r * 1.3, p.y + dy * r * 1.3);
    }
    c.stroke();
    c.fillStyle = color;
    c.beginPath();
    c.arc(p.x, p.y, Math.max(1.5, r * 0.08), 0, Math.PI * 2);
    c.fill();
  }

  /** Corner brackets marking a recognised target. */
  bracket(b: Rect, color: string, lw = 2, t = 0): void {
    const c = this.ctx;
    const len = Math.min(b.w, b.h) * 0.25;
    const pulse = 1 + Math.sin(t * 6) * 0.03;
    const x = b.x + b.w / 2 - (b.w * pulse) / 2;
    const y = b.y + b.h / 2 - (b.h * pulse) / 2;
    const w = b.w * pulse;
    const h = b.h * pulse;
    c.strokeStyle = color;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(x, y + len);
    c.lineTo(x, y);
    c.lineTo(x + len, y);
    c.moveTo(x + w - len, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + len);
    c.moveTo(x + w, y + h - len);
    c.lineTo(x + w, y + h);
    c.lineTo(x + w - len, y + h);
    c.moveTo(x + len, y + h);
    c.lineTo(x, y + h);
    c.lineTo(x, y + h - len);
    c.stroke();
  }

  /** HP pips above a target. */
  hpBar(b: Rect, hp: number, max: number): void {
    if (hp >= max || max <= 0) return;
    const c = this.ctx;
    const w = Math.max(24, b.w * 0.6);
    const x = b.x + b.w / 2 - w / 2;
    const y = b.y - Math.max(6, b.h * 0.08);
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(x - 1, y - 1, w + 2, 6);
    c.fillStyle = hp / max > 0.5 ? '#22c55e' : hp / max > 0.25 ? '#f59e0b' : '#ef4444';
    c.fillRect(x, y, (w * hp) / max, 4);
  }

  lockRing(b: Rect, progress: number, t: number): void {
    const c = this.ctx;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const r = Math.max(b.w, b.h) * (0.9 - progress * 0.3);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * 2);
    c.strokeStyle = progress >= 1 ? '#ef4444' : '#ffb020';
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(0, 0, r, (i * Math.PI) / 2 + 0.2, (i * Math.PI) / 2 + Math.PI / 2 - 0.2);
      c.stroke();
    }
    c.restore();
    if (progress >= 1) {
      c.font = `900 ${Math.max(12, b.h * 0.2)}px system-ui`;
      c.fillStyle = '#ef4444';
      c.textAlign = 'center';
      c.fillText('LOCK', cx, b.y - Math.max(10, b.h * 0.15));
    }
  }

  projectile(p: Projectile): void {
    const c = this.ctx;
    // trail
    if (p.trail.length > 1) {
      c.lineCap = 'round';
      for (let i = 1; i < p.trail.length; i++) {
        const a = i / p.trail.length;
        c.strokeStyle = p.kind === 'rocket' ? `rgba(220,220,220,${a * 0.7})` : `rgba(255,255,255,${a * 0.35})`;
        c.lineWidth = (p.kind === 'rocket' ? 10 : 4) * a * p.scale;
        c.beginPath();
        c.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        c.lineTo(p.trail[i].x, p.trail[i].y);
        c.stroke();
      }
    }
    const s = p.scale;
    c.save();
    c.translate(p.pos.x, p.pos.y);
    switch (p.kind) {
      case 'grenade': {
        c.rotate(p.spin);
        c.fillStyle = '#2f3b2f';
        c.beginPath();
        c.ellipse(0, 0, 14 * s, 18 * s, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#1a221a';
        c.lineWidth = 2 * s;
        c.beginPath();
        c.moveTo(-14 * s, 0);
        c.lineTo(14 * s, 0);
        c.moveTo(0, -18 * s);
        c.lineTo(0, 18 * s);
        c.stroke();
        c.fillStyle = '#9aa';
        c.fillRect(-4 * s, -24 * s, 8 * s, 8 * s);
        break;
      }
      case 'rocket': {
        c.rotate(Math.atan2(p.vel.y, p.vel.x));
        c.fillStyle = '#d1d5db';
        c.beginPath();
        c.moveTo(26 * s, 0);
        c.lineTo(8 * s, -8 * s);
        c.lineTo(-20 * s, -8 * s);
        c.lineTo(-20 * s, 8 * s);
        c.lineTo(8 * s, 8 * s);
        c.closePath();
        c.fill();
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.moveTo(26 * s, 0);
        c.lineTo(8 * s, -8 * s);
        c.lineTo(8 * s, 8 * s);
        c.closePath();
        c.fill();
        c.fillStyle = '#ffb020';
        c.beginPath();
        c.moveTo(-20 * s, -6 * s);
        c.lineTo(-38 * s, 0);
        c.lineTo(-20 * s, 6 * s);
        c.closePath();
        c.fill();
        break;
      }
      case 'milkshake': {
        c.rotate(p.spin * 0.5);
        c.fillStyle = '#fff';
        c.beginPath();
        c.moveTo(-12 * s, -16 * s);
        c.lineTo(12 * s, -16 * s);
        c.lineTo(8 * s, 18 * s);
        c.lineTo(-8 * s, 18 * s);
        c.closePath();
        c.fill();
        c.fillStyle = '#ff7eb6';
        c.fillRect(-12 * s, -16 * s, 24 * s, 10 * s);
        c.fillStyle = '#ef4444';
        c.fillRect(2 * s, -30 * s, 3 * s, 16 * s);
        break;
      }
    }
    c.restore();
  }

  quad(q: Quad, color: string, lw = 2, dash: number[] = []): void {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = lw;
    c.setLineDash(dash);
    c.beginPath();
    c.moveTo(q[0].x, q[0].y);
    for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y);
    c.closePath();
    c.stroke();
    c.setLineDash([]);
  }

  /** Darken everything outside the window quad (subtle vignette). */
  outsideQuadDim(q: Quad, frame: Rect, alpha = 0.35): void {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(frame.x - 10, frame.y - 10, frame.w + 20, frame.h + 20);
    c.moveTo(q[0].x, q[0].y);
    for (let i = 3; i >= 1; i--) c.lineTo(q[i].x, q[i].y);
    c.closePath();
    c.fillStyle = `rgba(0,0,0,${alpha})`;
    c.fill('evenodd');
    c.restore();
  }

  debugTrack(t: Track, box: Rect): void {
    const c = this.ctx;
    c.strokeStyle = t.state === 'confirmed' ? '#22c55e' : t.state === 'coasting' ? '#f59e0b' : '#64748b';
    c.lineWidth = 2;
    c.strokeRect(box.x, box.y, box.w, box.h);
    c.font = '14px ui-monospace, monospace';
    c.fillStyle = '#fff';
    c.fillText(`#${t.id} ${t.cls} ${t.speed.toFixed(0)}px/s`, box.x + 3, box.y - 4);
  }
}
