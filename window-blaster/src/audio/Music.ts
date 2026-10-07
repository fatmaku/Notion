/**
 * Procedural background music – no audio files. A small step sequencer schedules
 * WebAudio notes a little ahead of time. Two styles:
 *   'action'  driving synth-wave for the shooters (kick, hats, bass, pad, arp)
 *   'runner'  bouncy chiptune for the side-window runner
 * `intensity` (0..1) opens the filter and adds layers as the combo grows or time runs out.
 * Shares the AudioContext of Sfx; everything degrades to silence without one.
 */
export type MusicStyle = 'action' | 'runner';

export interface MusicBus {
  ctx: AudioContext;
  master: GainNode;
}

export interface StepEvent {
  /** 'kick' | 'hat' | 'snare' | 'bass' | 'pad' | 'arp' | 'lead' */
  part: string;
  freq: number;
  /** length in steps */
  len: number;
  gain: number;
}

const STEPS = 16;
// A minor progression for the action loop (Am – F – C – G), one bar each
const ACTION_CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
// C major for the runner (C – G – Am – F)
const RUNNER_CHORDS = [
  [60, 64, 67],
  [55, 59, 62],
  [57, 60, 64],
  [53, 57, 60],
];
const RUNNER_LEAD = [72, 0, 76, 0, 79, 0, 76, 72, 74, 0, 77, 0, 79, 0, 0, 0, 72, 0, 76, 0, 79, 81, 79, 76, 74, 0, 71, 0, 72, 0, 0, 0];

export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Pure pattern function: which notes play at this step (bar-relative) for a style and intensity. */
export function stepEvents(style: MusicStyle, step: number, bar: number, intensity: number): StepEvent[] {
  const s = ((step % STEPS) + STEPS) % STEPS;
  const chords = style === 'action' ? ACTION_CHORDS : RUNNER_CHORDS;
  const chord = chords[((bar % chords.length) + chords.length) % chords.length];
  const root = chord[0];
  const out: StepEvent[] = [];
  const hi = intensity >= 0.5;
  if (style === 'action') {
    if (s % 4 === 0) out.push({ part: 'kick', freq: 150, len: 1, gain: 0.9 });
    if (s % 8 === 4) out.push({ part: 'snare', freq: 0, len: 1, gain: 0.5 });
    if (s % 2 === 1 || (hi && s % 4 === 0)) out.push({ part: 'hat', freq: 0, len: 1, gain: s % 4 === 2 ? 0.35 : 0.22 });
    if (s % 2 === 0) out.push({ part: 'bass', freq: mtof(root - 24 + (s % 8 === 6 ? 7 : 0)), len: 2, gain: 0.5 });
    if (s === 0) for (const n of chord) out.push({ part: 'pad', freq: mtof(n), len: STEPS, gain: 0.08 });
    if (hi) out.push({ part: 'arp', freq: mtof(chord[s % 3] + 12 + (s >= 8 ? 12 : 0)), len: 1, gain: 0.12 });
    if (intensity >= 0.8 && s % 8 === 7) out.push({ part: 'lead', freq: mtof(chord[2] + 24), len: 1, gain: 0.14 });
  } else {
    if (s % 4 === 0 || (hi && s === 10)) out.push({ part: 'kick', freq: 130, len: 1, gain: 0.7 });
    if (s % 8 === 4) out.push({ part: 'snare', freq: 0, len: 1, gain: 0.35 });
    if (s % 2 === 1) out.push({ part: 'hat', freq: 0, len: 1, gain: 0.2 });
    out.push({ part: 'bass', freq: mtof(root - 12 + (s % 4 === 2 ? 7 : 0)), len: 1, gain: 0.35 });
    const m = RUNNER_LEAD[(bar % 2) * STEPS + s];
    if (m) out.push({ part: 'lead', freq: mtof(m + (hi ? 12 : 0)), len: 1, gain: 0.16 });
    if (hi && s % 4 === 2) for (const n of chord) out.push({ part: 'arp', freq: mtof(n + 12), len: 1, gain: 0.07 });
  }
  return out;
}

export class Music {
  enabled = true;
  volume = 0.32;
  private style: MusicStyle | null = null;
  private bus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private nextStepAt = 0;
  private step = 0;
  private intensity = 0.3;
  private shownIntensity = 0.3;
  private paused = false;

  constructor(private readonly audio: () => MusicBus | null) {}

  get playing(): boolean {
    return this.style !== null;
  }

  private bpm(): number {
    return this.style === 'runner' ? 148 : 124;
  }

  start(style: MusicStyle): void {
    if (!this.enabled) return;
    const a = this.audio();
    if (!a) return;
    if (this.style === style && this.timer) return;
    this.stop(0.05);
    const { ctx, master } = a;
    this.style = style;
    this.paused = false;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1800;
    this.filter.Q.value = 0.8;
    this.filter.connect(this.bus).connect(master);
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    this.bus.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.4);
    this.step = 0;
    this.nextStepAt = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.tick(), 60);
  }

  stop(fadeS = 0.5): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
    const bus = this.bus;
    const filter = this.filter;
    const a = this.audio();
    if (bus && a) {
      bus.gain.cancelScheduledValues(a.ctx.currentTime);
      bus.gain.setTargetAtTime(0.0001, a.ctx.currentTime, Math.max(0.01, fadeS / 3));
      setTimeout(() => {
        try {
          filter?.disconnect();
          bus.disconnect();
        } catch {
          /* already gone */
        }
      }, fadeS * 1000 + 100);
    }
    this.bus = null;
    this.filter = null;
    this.style = null;
  }

  pause(): void {
    this.paused = true;
    const a = this.audio();
    if (this.bus && a) this.bus.gain.setTargetAtTime(this.volume * 0.15, a.ctx.currentTime, 0.2);
  }

  resume(): void {
    this.paused = false;
    const a = this.audio();
    if (this.bus && a) this.bus.gain.setTargetAtTime(this.volume, a.ctx.currentTime, 0.2);
  }

  /** 0 = calm … 1 = frantic. Smoothed internally. */
  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.3));
  }

  /** Briefly lowers the music under a big sound effect. */
  duck(ms = 260, to = 0.35): void {
    const a = this.audio();
    if (!this.bus || !a || this.paused) return;
    const t = a.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.volume * to, t);
    this.bus.gain.setTargetAtTime(this.volume, t + ms / 1000, 0.15);
  }

  private tick(): void {
    const a = this.audio();
    if (!a || !this.style || !this.filter) return;
    const { ctx } = a;
    if (ctx.state === 'suspended') return;
    const stepDur = 60 / this.bpm() / 4;
    // after a suspension (tab hidden, iOS lock) skip the missed steps instead of firing them all at once
    if (this.nextStepAt < ctx.currentTime - 0.25) this.nextStepAt = ctx.currentTime + 0.05;
    this.shownIntensity += (this.intensity - this.shownIntensity) * 0.15;
    this.filter.frequency.setTargetAtTime(900 + this.shownIntensity * 5200, ctx.currentTime, 0.1);
    // schedule everything that starts within the next 180 ms
    while (this.nextStepAt < ctx.currentTime + 0.18) {
      const bar = Math.floor(this.step / STEPS);
      for (const ev of stepEvents(this.style, this.step, bar, this.shownIntensity)) this.play(ctx, ev, this.nextStepAt, stepDur);
      this.step++;
      this.nextStepAt += stepDur;
    }
  }

  private play(ctx: AudioContext, ev: StepEvent, t: number, stepDur: number): void {
    const out = this.filter;
    if (!out) return;
    const dur = Math.max(0.05, ev.len * stepDur);
    const g = ctx.createGain();
    g.connect(out);
    const done = (n: AudioScheduledSourceNode) => {
      n.onended = () => {
        n.disconnect();
        g.disconnect();
      };
    };
    switch (ev.part) {
      case 'kick': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(ev.freq, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        g.gain.setValueAtTime(ev.gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.25);
        done(o);
        break;
      }
      case 'snare':
      case 'hat': {
        if (!this.noise) return;
        const s = ctx.createBufferSource();
        s.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = ev.part === 'hat' ? 'highpass' : 'bandpass';
        f.frequency.value = ev.part === 'hat' ? 7000 : 1800;
        const d = ev.part === 'hat' ? 0.05 : 0.14;
        g.gain.setValueAtTime(ev.gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.connect(f).connect(g);
        s.start(t, Math.random() * 0.5);
        s.stop(t + d + 0.02);
        s.onended = () => {
          s.disconnect();
          f.disconnect();
          g.disconnect();
        };
        break;
      }
      case 'bass': {
        const o = ctx.createOscillator();
        o.type = this.style === 'runner' ? 'square' : 'sawtooth';
        o.frequency.value = ev.freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(ev.gain, t + 0.01);
        g.gain.setValueAtTime(ev.gain, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.02);
        done(o);
        break;
      }
      case 'pad': {
        // two detuned triangles per chord note
        for (const det of [-6, 6]) {
          const o = ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = ev.freq;
          o.detune.value = det;
          o.connect(g);
          o.start(t);
          o.stop(t + dur + 0.3);
          done(o);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(ev.gain, t + dur * 0.3);
        g.gain.setValueAtTime(ev.gain, t + dur * 0.8);
        g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
        break;
      }
      default: {
        // arp / lead: short plucky square
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = ev.freq;
        g.gain.setValueAtTime(ev.gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.18));
        o.connect(g);
        o.start(t);
        o.stop(t + Math.min(dur, 0.18) + 0.02);
        done(o);
      }
    }
  }
}
