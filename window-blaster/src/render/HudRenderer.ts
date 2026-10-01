import type { Layers } from './Layers';
import { fmtScore, fmtTime } from '../ui/dom';

export interface HudWeapon {
  icon: string;
  name: string;
  ammo: string;
  reload: number;
  empty: boolean;
}

export interface HudMission {
  text: string;
  progress: number;
  goal: number;
  done: boolean;
}

export interface HudState {
  score: number;
  best: number;
  timeLeft: number | null;
  elapsed: number;
  combo: number;
  comboLeft: number;
  weapon: HudWeapon;
  weapon2?: HudWeapon;
  missions: HudMission[];
  feed: { text: string; born: number; color: string }[];
  hint: string | null;
  windowMode: string;
  lives?: number;
  extra?: string;
}

/** Screen-anchored HUD in CSS px (ctx transformed by Layers.useCssSpace). */
export class HudRenderer {
  constructor(private readonly layers: Layers) {}

  draw(s: HudState, now: number): void {
    const c = this.layers.hud;
    const W = this.layers.cssW;
    const H = this.layers.cssH;
    const k = Math.max(0.75, Math.min(1.35, Math.min(W, H) / 420));
    const sat = this.safe('top');
    const sal = this.safe('left');
    const sar = this.safe('right');
    const sab = this.safe('bottom');
    const font = (px: number, w = 800) => `${w} ${px * k}px system-ui, -apple-system, sans-serif`;
    // shadowBlur per fillText is very expensive on Safari → outline text instead
    const rawFill = c.fillText.bind(c);
    const fillText = (txt: string, x: number, y: number) => {
      const f = c.fillStyle;
      c.lineWidth = 3 * k;
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(0,0,0,0.75)';
      c.strokeText(txt, x, y);
      c.fillStyle = f;
      rawFill(txt, x, y);
    };
    c.save();
    c.fillText = fillText as typeof c.fillText;
    c.textBaseline = 'top';

    // score (top-left)
    c.textAlign = 'left';
    c.fillStyle = '#fff';
    c.font = font(30, 900);
    c.fillText(fmtScore(s.score), 14 * k + sal, 10 * k + sat);
    c.font = font(12, 600);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillText(`Bestwert ${fmtScore(s.best)}`, 14 * k + sal, 44 * k + sat);
    if (s.windowMode && s.windowMode !== 'fullframe') {
      c.fillStyle = s.windowMode === 'tracking' ? '#22c55e' : s.windowMode === 'degraded' ? '#f59e0b' : '#94a3b8';
      c.fillText(`Scheibe: ${s.windowMode === 'tracking' ? 'ok' : s.windowMode === 'degraded' ? 'unsicher' : 'aus'}`, 14 * k + sal, 60 * k + sat);
    }

    // timer (top-center)
    c.textAlign = 'center';
    c.font = font(26, 900);
    if (s.timeLeft !== null) {
      const urgent = s.timeLeft <= 10;
      c.fillStyle = urgent ? (Math.floor(now / 250) % 2 ? '#ef4444' : '#fff') : '#fff';
      c.fillText(fmtTime(s.timeLeft), W / 2, 10 * k + sat);
    } else {
      c.fillStyle = '#fff';
      c.fillText(fmtTime(s.elapsed), W / 2, 10 * k + sat);
    }
    // combo
    if (s.combo >= 2) {
      c.font = font(18, 900);
      c.fillStyle = '#ffb020';
      c.fillText(`×${s.combo} COMBO`, W / 2, 40 * k + sat);
      const bw = 90 * k;
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(W / 2 - bw / 2, 62 * k + sat, bw, 4 * k);
      c.fillStyle = '#ffb020';
      c.fillRect(W / 2 - bw / 2, 62 * k + sat, bw * s.comboLeft, 4 * k);
    }
    if (s.lives !== undefined) {
      c.font = font(20, 900);
      c.fillStyle = '#fff';
      c.fillText('❤️'.repeat(Math.max(0, s.lives)) + '🖤'.repeat(Math.max(0, 3 - s.lives)), W / 2, (s.combo >= 2 ? 72 : 42) * k + sat);
    }

    // missions (top-right, left of the pause button)
    c.textAlign = 'right';
    c.font = font(11.5, 600);
    let my = 12 * k + sat;
    for (const m of s.missions) {
      c.fillStyle = m.done ? '#22c55e' : 'rgba(255,255,255,0.85)';
      c.fillText(`${m.done ? '✓ ' : ''}${m.text}  ${Math.min(m.progress, m.goal)}/${m.goal}`, W - 78 * k - sar, my);
      my += 15 * k;
    }

    // weapon (bottom-left)
    c.textAlign = 'left';
    c.textBaseline = 'bottom';
    const wy = H - 14 * k - sab;
    c.font = font(26, 900);
    c.fillStyle = '#fff';
    c.fillText(s.weapon.icon, 14 * k + sal, wy);
    c.font = font(15, 800);
    c.fillText(s.weapon.name, 52 * k + sal, wy - 18 * k);
    c.font = font(16, 900);
    c.fillStyle = s.weapon.empty ? '#ef4444' : s.weapon.reload < 1 ? '#f59e0b' : '#fff';
    c.fillText(s.weapon.reload < 1 ? `Nachladen…` : s.weapon.ammo, 52 * k + sal, wy);
    if (s.weapon.reload < 1) {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(52 * k + sal, wy + 2 * k, 120 * k, 4 * k);
      c.fillStyle = '#f59e0b';
      c.fillRect(52 * k + sal, wy + 2 * k, 120 * k * s.weapon.reload, 4 * k);
    }
    if (s.weapon2) {
      c.font = font(13, 700);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.fillText(`${s.weapon2.icon} ${s.weapon2.ammo}`, 14 * k + sal, wy - 40 * k);
    }
    if (s.extra) {
      c.font = font(13, 700);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillText(s.extra, 14 * k + sal, wy - 58 * k);
    }

    // kill feed (bottom-center)
    c.textAlign = 'center';
    let fy = H - 20 * k - sab;
    for (let i = s.feed.length - 1; i >= 0 && i >= s.feed.length - 3; i--) {
      const f = s.feed[i];
      const age = (now - f.born) / 1000;
      const a = Math.max(0, Math.min(1, 2.2 - age));
      if (a <= 0) continue;
      c.globalAlpha = a;
      c.font = font(16, 900);
      c.fillStyle = f.color;
      c.fillText(f.text, W / 2, fy);
      fy -= 20 * k;
    }
    c.globalAlpha = 1;
    if (s.hint) {
      c.font = font(13, 600);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fillText(s.hint, W / 2, H - 76 * k - sab);
    }
    c.restore();
  }

  private safeCache: Record<string, number> = {};
  private safeAt = 0;
  private safe(side: 'top' | 'left' | 'right' | 'bottom'): number {
    const now = performance.now();
    if (now - this.safeAt > 1000) {
      this.safeAt = now;
      const cs = getComputedStyle(document.documentElement);
      for (const s of ['top', 'left', 'right', 'bottom']) {
        const n = parseFloat(cs.getPropertyValue(`--sa${s[0]}`));
        this.safeCache[s] = Number.isFinite(n) ? n : 0;
      }
    }
    return this.safeCache[side] ?? 0;
  }
}
