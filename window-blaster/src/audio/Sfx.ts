/**
 * All sound is synthesised with WebAudio – no asset files. Kept tiny and
 * robust: any failure (no AudioContext, autoplay policy) degrades to silence.
 */
export type SfxName =
  | 'shot'
  | 'burst'
  | 'reload'
  | 'empty'
  | 'throw'
  | 'rocket'
  | 'hit'
  | 'explosion'
  | 'bigExplosion'
  | 'splat'
  | 'paint'
  | 'skid'
  | 'vanish'
  | 'combo'
  | 'mission'
  | 'coin'
  | 'jump'
  | 'ouch'
  | 'tick'
  | 'roundEnd'
  | 'lock'
  | 'whoosh'
  | 'ricochet'
  | 'streak'
  | 'bird'
  | 'golden'
  | 'countdown'
  | 'freeze'
  | 'pow';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  enabled = true;
  private vol = 1;

  /** 0..1 master volume for effects. */
  set volume(v: number) {
    this.vol = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = 0.6 * this.vol;
  }

  /** Shared output for the music engine (null until unlocked). */
  get audio(): { ctx: AudioContext; master: GainNode } | null {
    return this.ctx && this.master ? { ctx: this.ctx, master: this.master } : null;
  }

  /** Must be called from a user gesture once to unlock audio on iOS. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6 * this.vol;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, when = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, lowpass = 4000, when = 0, highpass = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lowpass, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, lowpass * 0.15), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = s;
    node = node.connect(f);
    if (highpass > 0) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = highpass;
      node = node.connect(hp);
    }
    node.connect(g).connect(this.master);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
      node.disconnect();
    };
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  play(name: SfxName, opts: { pitch?: number } = {}): void {
    if (!this.enabled || !this.ctx) return;
    const p = opts.pitch ?? 1;
    switch (name) {
      case 'shot':
        this.noise(0.08, 0.5, 3000, 0, 300);
        this.tone(180 * p, 0.06, 'square', 0.15, 60);
        break;
      case 'burst':
        this.noise(0.05, 0.35, 2500, 0, 400);
        break;
      case 'reload':
        this.tone(600, 0.05, 'square', 0.1);
        this.tone(900, 0.05, 'square', 0.1, undefined, 0.12);
        this.noise(0.04, 0.15, 2000, 0.25);
        break;
      case 'empty':
        this.tone(300, 0.05, 'square', 0.08, 200);
        break;
      case 'throw':
        this.noise(0.18, 0.15, 1200);
        this.tone(300, 0.2, 'sine', 0.08, 500);
        break;
      case 'rocket':
        this.noise(0.9, 0.35, 1800, 0, 100);
        this.tone(120, 0.9, 'sawtooth', 0.12, 900);
        break;
      case 'lock':
        this.tone(1400 * p, 0.05, 'sine', 0.12);
        break;
      case 'hit':
        this.tone(900 * p, 0.05, 'square', 0.12, 500 * p);
        this.noise(0.05, 0.2, 5000);
        break;
      case 'explosion':
        // crack, sub boom, rumble tail and a few crackles
        this.noise(0.08, 0.9, 6000, 0, 800);
        this.tone(95, 0.55, 'sine', 0.6, 28);
        this.noise(0.7, 0.8, 900, 0.03);
        for (let i = 0; i < 4; i++) this.noise(0.03, 0.25, 3000, 0.18 + i * 0.09 + Math.random() * 0.05, 600);
        break;
      case 'bigExplosion':
        this.noise(0.1, 1.0, 7000, 0, 600);
        this.tone(70, 1.0, 'sine', 0.8, 22);
        this.tone(52, 1.3, 'triangle', 0.45, 18, 0.05);
        this.noise(1.3, 1.0, 700, 0.04);
        for (let i = 0; i < 6; i++) this.noise(0.04, 0.3, 2500, 0.25 + i * 0.11 + Math.random() * 0.06, 500);
        break;
      case 'splat':
        this.noise(0.25, 0.5, 1500);
        this.tone(220, 0.25, 'sine', 0.25, 80);
        break;
      case 'paint':
        this.noise(0.09, 0.3, 2500, 0, 500);
        this.tone(500 * p, 0.08, 'triangle', 0.1, 300);
        break;
      case 'skid':
        this.noise(0.7, 0.35, 2600, 0, 900);
        break;
      case 'vanish':
        // digital zap: falling saw, rising shimmer, airy sweep
        this.tone(900, 0.4, 'sawtooth', 0.14, 60);
        [1200, 1600, 2100, 2700].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.09, f * 1.3, 0.05 + i * 0.06));
        this.noise(0.45, 0.25, 7000, 0.02, 1500);
        break;
      case 'whoosh':
        this.noise(0.3, 0.3, 2500, 0, 300);
        this.tone(220, 0.3, 'sine', 0.05, 520);
        break;
      case 'ricochet':
        this.tone(2200 * p, 0.18, 'sine', 0.1, 700 * p);
        this.noise(0.05, 0.25, 5000, 0, 1500);
        break;
      case 'streak':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f * p, 0.14, 'square', 0.12, undefined, i * 0.07));
        this.noise(0.3, 0.2, 5000, 0.3, 2000);
        break;
      case 'bird':
        this.tone(1900, 0.12, 'sine', 0.09, 1300);
        this.tone(2100, 0.14, 'sine', 0.09, 1400, 0.15);
        break;
      case 'golden':
        [1319, 1568, 1976, 2637].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.12, undefined, i * 0.06));
        break;
      case 'countdown':
        this.tone(p > 1 ? 1760 : 1175, 0.1, 'square', 0.12);
        break;
      case 'freeze':
        this.noise(0.35, 0.3, 9000, 0, 3000);
        [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.08, undefined, i * 0.05));
        break;
      case 'pow':
        this.noise(0.06, 0.6, 2000, 0, 200);
        this.tone(140, 0.25, 'square', 0.25, 50);
        break;
      case 'combo':
        this.tone(660 * p, 0.09, 'square', 0.1);
        this.tone(880 * p, 0.12, 'square', 0.1, undefined, 0.08);
        break;
      case 'mission':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.15, undefined, i * 0.09));
        break;
      case 'coin':
        this.tone(1319, 0.07, 'square', 0.1);
        this.tone(1760, 0.18, 'square', 0.1, undefined, 0.07);
        break;
      case 'jump':
        this.tone(300, 0.18, 'square', 0.1, 700);
        break;
      case 'ouch':
        this.tone(200, 0.3, 'sawtooth', 0.2, 60);
        this.noise(0.25, 0.3, 1200);
        break;
      case 'tick':
        this.tone(1000, 0.04, 'square', 0.06);
        break;
      case 'roundEnd':
        [784, 659, 523, 392].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.15, undefined, i * 0.15));
        break;
    }
  }
}
