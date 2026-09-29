// LiveFX – procedurally synthesized sound effects (WebAudio, no asset files, no licensing issues).
// Every function takes an AudioContext and a destination node and schedules the sound "now".
(function (global) {
  'use strict';

  function noiseBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function env(gain, t0, attack, hold, release, peak) {
    const g = gain.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.setValueAtTime(peak, t0 + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  }

  function tone(ctx, out, { type = 'sine', freq = 440, t0, dur, peak = 0.3, attack = 0.01, release = 0.1, glideTo = null, filter = null }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    env(g, t0, attack, Math.max(0, dur - attack - release), release, peak);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 2000;
      f.Q.value = filter.q || 1;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(ctx, out, { t0, dur, peak = 0.3, attack = 0.005, release = 0.1, filter = null }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur + 0.1);
    const g = ctx.createGain();
    env(g, t0, attack, Math.max(0, dur - attack - release), release, peak);
    let node = src;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'bandpass';
      f.frequency.setValueAtTime(filter.freq || 1000, t0);
      if (filter.glideTo) f.frequency.exponentialRampToValueAtTime(filter.glideTo, t0 + dur);
      f.Q.value = filter.q || 1;
      src.connect(f);
      node = f;
    }
    node.connect(g).connect(out);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
  }

  const SFX = {
    airhorn(ctx, out) {
      const t0 = ctx.currentTime;
      // Three detuned saws with a slow vibrato = classic MLG airhorn.
      [415, 622, 830].forEach((f, i) => {
        tone(ctx, out, { type: 'sawtooth', freq: f * 0.97, glideTo: f, t0, dur: 0.9, peak: 0.12, attack: 0.02, release: 0.25, filter: { type: 'lowpass', freq: 2500 + i * 500, q: 2 } });
        tone(ctx, out, { type: 'square', freq: f * 1.005, t0: t0 + 0.02, dur: 0.85, peak: 0.05, attack: 0.02, release: 0.25 });
      });
    },
    boom(ctx, out) {
      // "Vine boom" – deep sub sweep plus a short punch.
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 160, glideTo: 38, t0, dur: 1.3, peak: 0.9, attack: 0.005, release: 0.9 });
      tone(ctx, out, { type: 'triangle', freq: 90, glideTo: 30, t0, dur: 0.6, peak: 0.4, attack: 0.005, release: 0.4 });
      noise(ctx, out, { t0, dur: 0.12, peak: 0.35, release: 0.1, filter: { type: 'lowpass', freq: 600 } });
    },
    sadTrombone(ctx, out) {
      const t0 = ctx.currentTime;
      const notes = [233, 220, 207, 185]; // Bb A Ab Gb – "wah wah wah waaah"
      notes.forEach((f, i) => {
        const start = t0 + i * 0.45;
        const dur = i === 3 ? 1.2 : 0.4;
        tone(ctx, out, { type: 'sawtooth', freq: f * 1.03, glideTo: f, t0: start, dur, peak: 0.22, attack: 0.05, release: 0.15, filter: { type: 'lowpass', freq: 900, q: 6 } });
      });
    },
    rimshot(ctx, out) {
      const t0 = ctx.currentTime;
      [0, 0.12].forEach((d) => {
        tone(ctx, out, { type: 'triangle', freq: 220, glideTo: 90, t0: t0 + d, dur: 0.12, peak: 0.6, release: 0.08 });
        noise(ctx, out, { t0: t0 + d, dur: 0.08, peak: 0.3, filter: { type: 'highpass', freq: 3000 } });
      });
      noise(ctx, out, { t0: t0 + 0.26, dur: 0.6, peak: 0.25, release: 0.5, filter: { type: 'bandpass', freq: 6000, q: 0.5 } }); // crash
    },
    crickets(ctx, out) {
      const t0 = ctx.currentTime;
      for (let i = 0; i < 14; i++) {
        const start = t0 + i * 0.17 + (i % 3) * 0.02;
        tone(ctx, out, { type: 'sine', freq: 4200, t0: start, dur: 0.06, peak: 0.12, attack: 0.005, release: 0.03 });
        tone(ctx, out, { type: 'sine', freq: 4300, t0: start + 0.07, dur: 0.05, peak: 0.1, attack: 0.005, release: 0.03 });
      }
    },
    applause(ctx, out) {
      const t0 = ctx.currentTime;
      for (let i = 0; i < 60; i++) {
        const start = t0 + Math.random() * 2.2;
        noise(ctx, out, { t0: start, dur: 0.04, peak: 0.12 + Math.random() * 0.1, filter: { type: 'bandpass', freq: 1500 + Math.random() * 2500, q: 1.5 } });
      }
      noise(ctx, out, { t0, dur: 2.4, peak: 0.08, attack: 0.3, release: 1.2, filter: { type: 'bandpass', freq: 2200, q: 0.4 } });
    },
    scratch(ctx, out) {
      // Record scratch: fast band-swept noise, up then down.
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0, dur: 0.22, peak: 0.5, release: 0.05, filter: { type: 'bandpass', freq: 600, glideTo: 4000, q: 3 } });
      noise(ctx, out, { t0: t0 + 0.24, dur: 0.3, peak: 0.5, release: 0.15, filter: { type: 'bandpass', freq: 4000, glideTo: 300, q: 3 } });
    },
    ding(ctx, out) {
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 1568, t0, dur: 1.1, peak: 0.35, attack: 0.005, release: 0.9 });
      tone(ctx, out, { type: 'sine', freq: 3136, t0, dur: 0.7, peak: 0.12, attack: 0.005, release: 0.5 });
    },
    buzzer(ctx, out) {
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'square', freq: 110, t0, dur: 0.7, peak: 0.25, attack: 0.01, release: 0.1, filter: { type: 'lowpass', freq: 800 } });
      tone(ctx, out, { type: 'square', freq: 165, t0, dur: 0.7, peak: 0.12, attack: 0.01, release: 0.1, filter: { type: 'lowpass', freq: 800 } });
    },
    tada(ctx, out) {
      const t0 = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => {
        tone(ctx, out, { type: 'triangle', freq: f, t0: t0 + i * 0.09, dur: i === 3 ? 1.0 : 0.25, peak: 0.25, release: i === 3 ? 0.7 : 0.1 });
        tone(ctx, out, { type: 'sine', freq: f * 2, t0: t0 + i * 0.09, dur: i === 3 ? 0.8 : 0.2, peak: 0.08, release: 0.3 });
      });
      noise(ctx, out, { t0: t0 + 0.27, dur: 0.9, peak: 0.1, attack: 0.02, release: 0.7, filter: { type: 'highpass', freq: 5000 } });
    },
    drumroll(ctx, out) {
      const t0 = ctx.currentTime;
      let t = 0;
      let gap = 0.11;
      while (t < 2.0) {
        noise(ctx, out, { t0: t0 + t, dur: 0.05, peak: 0.3, filter: { type: 'bandpass', freq: 250, q: 1 } });
        tone(ctx, out, { type: 'triangle', freq: 180, glideTo: 120, t0: t0 + t, dur: 0.05, peak: 0.25, release: 0.03 });
        t += gap;
        gap = Math.max(0.035, gap * 0.94);
      }
      noise(ctx, out, { t0: t0 + 2.05, dur: 0.8, peak: 0.35, release: 0.7, filter: { type: 'bandpass', freq: 5000, q: 0.5 } });
    },
    cash(ctx, out) {
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0, dur: 0.08, peak: 0.4, filter: { type: 'highpass', freq: 4000 } }); // register "ka-"
      tone(ctx, out, { type: 'sine', freq: 2093, t0: t0 + 0.12, dur: 0.8, peak: 0.3, release: 0.6 }); // "-ching"
      tone(ctx, out, { type: 'sine', freq: 2637, t0: t0 + 0.14, dur: 0.7, peak: 0.15, release: 0.5 });
    },
    whoosh(ctx, out) {
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0, dur: 0.5, peak: 0.4, attack: 0.15, release: 0.25, filter: { type: 'bandpass', freq: 400, glideTo: 3000, q: 1 } });
    },
    pop(ctx, out) {
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 900, glideTo: 200, t0, dur: 0.09, peak: 0.5, attack: 0.002, release: 0.06 });
    },
  };

  global.LiveFXSounds = {
    names: Object.keys(SFX),
    play(name, ctx, out, volume = 1) {
      const fn = SFX[name];
      if (!fn) return false;
      const g = ctx.createGain();
      g.gain.value = volume;
      g.connect(out);
      fn(ctx, g);
      return true;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
