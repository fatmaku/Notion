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
      tone(ctx, out, { type: 'sine', freq: 160, glideTo: 38, t0, dur: 1.3, peak: 0.6, attack: 0.005, release: 0.9 });
      tone(ctx, out, { type: 'triangle', freq: 90, glideTo: 30, t0, dur: 0.6, peak: 0.25, attack: 0.005, release: 0.4 });
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
    laugh(ctx, out) {
      // Sitcom laugh track burst: 5 "ha" pulses – bandpassed noise plus a breathy pitched
      // component, each pulse a little lower and softer than the previous one.
      const t0 = ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        const start = t0 + i * 0.19;
        const f = 900 - i * 60;
        noise(ctx, out, { t0: start, dur: 0.14, peak: 0.35 - i * 0.03, attack: 0.01, release: 0.08, filter: { type: 'bandpass', freq: f, q: 2.5 } });
        noise(ctx, out, { t0: start, dur: 0.12, peak: 0.15, attack: 0.01, release: 0.06, filter: { type: 'bandpass', freq: f * 2.4, q: 3 } });
        tone(ctx, out, { type: 'sawtooth', freq: 230 - i * 12, glideTo: 170 - i * 10, t0: start, dur: 0.13, peak: 0.08, attack: 0.02, release: 0.07, filter: { type: 'lowpass', freq: 1200, q: 3 } });
      }
      // Softer crowd tail so the burst does not end abruptly.
      noise(ctx, out, { t0: t0 + 0.9, dur: 0.6, peak: 0.08, attack: 0.05, release: 0.45, filter: { type: 'bandpass', freq: 1000, q: 0.7 } });
    },
    boing(ctx, out) {
      // Cartoon spring: a fast-decaying sine whose pitch wobbles (LFO -> gain -> osc.frequency).
      const t0 = ctx.currentTime;
      const dur = 0.7;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t0);
      osc.frequency.exponentialRampToValueAtTime(140, t0 + dur);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(22, t0);
      lfo.frequency.exponentialRampToValueAtTime(9, t0 + dur);
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(180, t0);
      depth.gain.exponentialRampToValueAtTime(20, t0 + dur);
      lfo.connect(depth).connect(osc.frequency);
      const g = ctx.createGain();
      env(g, t0, 0.005, 0.05, dur - 0.055, 0.5);
      osc.connect(g).connect(out);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur + 0.05);
      lfo.stop(t0 + dur + 0.05);
      // A little "thwack" on the attack.
      noise(ctx, out, { t0, dur: 0.04, peak: 0.2, release: 0.03, filter: { type: 'lowpass', freq: 1500 } });
    },
    slideWhistle(ctx, out) {
      // Rising then falling glissando – sine with a touch of triangle for body.
      const t0 = ctx.currentTime;
      const half = 0.6;
      tone(ctx, out, { type: 'sine', freq: 400, glideTo: 1400, t0, dur: half, peak: 0.3, attack: 0.03, release: 0.02 });
      tone(ctx, out, { type: 'sine', freq: 1400, glideTo: 350, t0: t0 + half, dur: half, peak: 0.3, attack: 0.02, release: 0.15 });
      tone(ctx, out, { type: 'triangle', freq: 400, glideTo: 1400, t0, dur: half, peak: 0.06, attack: 0.03, release: 0.02 });
      tone(ctx, out, { type: 'triangle', freq: 1400, glideTo: 350, t0: t0 + half, dur: half, peak: 0.06, attack: 0.02, release: 0.15 });
      // Faint breath noise makes it sound like a real whistle.
      noise(ctx, out, { t0, dur: 1.2, peak: 0.04, attack: 0.05, release: 0.2, filter: { type: 'bandpass', freq: 2500, q: 1 } });
    },
    dramatic(ctx, out) {
      // "Dun dun duuun": three low sawtooth chords, the last one held with a lowpass sweep.
      const t0 = ctx.currentTime;
      const chords = [
        { t: 0, dur: 0.32, notes: [98, 123.5, 147] },   // G minor
        { t: 0.42, dur: 0.32, notes: [92.5, 116.5, 139] }, // Gb minor
        { t: 0.84, dur: 1.5, notes: [87.3, 110, 130.8] },  // F minor, held
      ];
      chords.forEach((c, ci) => {
        const held = ci === 2;
        c.notes.forEach((f) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, t0 + c.t);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.Q.value = 3;
          lp.frequency.setValueAtTime(held ? 300 : 900, t0 + c.t);
          if (held) lp.frequency.exponentialRampToValueAtTime(2400, t0 + c.t + 1.0);
          const g = ctx.createGain();
          env(g, t0 + c.t, 0.02, Math.max(0, c.dur - 0.02 - (held ? 0.6 : 0.1)), held ? 0.6 : 0.1, held ? 0.16 : 0.13);
          osc.connect(lp).connect(g).connect(out);
          osc.start(t0 + c.t);
          osc.stop(t0 + c.t + c.dur + 0.05);
          // Sub octave for weight.
          tone(ctx, out, { type: 'sine', freq: f / 2, t0: t0 + c.t, dur: c.dur, peak: 0.08, attack: 0.02, release: held ? 0.6 : 0.1 });
        });
      });
    },
    coin(ctx, out) {
      // Mario-style coin: B5 then E6 on a square wave, short and bright.
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'square', freq: 987.8, t0, dur: 0.08, peak: 0.16, attack: 0.002, release: 0.02 });
      tone(ctx, out, { type: 'square', freq: 1318.5, t0: t0 + 0.08, dur: 0.45, peak: 0.16, attack: 0.002, release: 0.35 });
      tone(ctx, out, { type: 'sine', freq: 2637, t0: t0 + 0.08, dur: 0.4, peak: 0.06, attack: 0.002, release: 0.3 });
    },
    levelUp(ctx, out) {
      // Rising 5-note arpeggio (C major pentatonic-ish) with a high shimmer on top.
      const t0 = ctx.currentTime;
      const notes = [523.3, 659.3, 784, 1046.5, 1318.5];
      notes.forEach((f, i) => {
        const start = t0 + i * 0.11;
        const last = i === notes.length - 1;
        tone(ctx, out, { type: 'square', freq: f, t0: start, dur: last ? 0.9 : 0.16, peak: 0.12, attack: 0.005, release: last ? 0.6 : 0.06, filter: { type: 'lowpass', freq: 5000 } });
        tone(ctx, out, { type: 'triangle', freq: f, t0: start, dur: last ? 0.9 : 0.16, peak: 0.12, attack: 0.005, release: last ? 0.6 : 0.06 });
      });
      // Shimmer: sparkling high sines that fade out over the held note.
      [2637, 3136, 3951, 5274].forEach((f, i) => {
        tone(ctx, out, { type: 'sine', freq: f, t0: t0 + 0.5 + i * 0.06, dur: 0.7, peak: 0.05, attack: 0.02, release: 0.5 });
      });
      noise(ctx, out, { t0: t0 + 0.45, dur: 0.8, peak: 0.05, attack: 0.05, release: 0.6, filter: { type: 'highpass', freq: 7000 } });
    },
    bell(ctx, out) {
      // Church / boxing bell: inharmonic partials with a long decay.
      const t0 = ctx.currentTime;
      const f = 440;
      const partials = [
        { r: 0.5, peak: 0.16, dur: 2.2 }, // hum
        { r: 1, peak: 0.28, dur: 2.3 },
        { r: 2.76, peak: 0.16, dur: 1.6 },
        { r: 5.4, peak: 0.09, dur: 1.0 },
        { r: 8.93, peak: 0.04, dur: 0.6 },
      ];
      partials.forEach((p) => {
        tone(ctx, out, { type: 'sine', freq: f * p.r, t0, dur: p.dur, peak: p.peak, attack: 0.003, release: p.dur - 0.05 });
      });
      // Clapper strike transient.
      noise(ctx, out, { t0, dur: 0.03, peak: 0.25, attack: 0.001, release: 0.025, filter: { type: 'bandpass', freq: 3000, q: 1 } });
    },
    ooh(ctx, out) {
      // Crowd "ooooh": filtered noise through formant-ish bandpasses, swelling then fading.
      const t0 = ctx.currentTime;
      const dur = 1.5;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, dur + 0.1);
      const master = ctx.createGain();
      env(master, t0, 0.45, 0.35, dur - 0.8, 0.9);
      master.connect(out);
      // Two formants around the "oo" vowel, sliding slightly downward like a disappointed crowd.
      [{ f: 520, q: 8, g: 1 }, { f: 850, q: 10, g: 0.6 }].forEach((fm) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = fm.q;
        bp.frequency.setValueAtTime(fm.f, t0);
        bp.frequency.exponentialRampToValueAtTime(fm.f * 0.85, t0 + dur);
        const g = ctx.createGain();
        g.gain.value = fm.g;
        src.connect(bp).connect(g).connect(master);
      });
      src.start(t0);
      src.stop(t0 + dur + 0.1);
      // A few detuned low voices give it a "many people" feel.
      [150, 165, 178].forEach((f) => {
        tone(ctx, out, { type: 'triangle', freq: f * 1.04, glideTo: f * 0.94, t0, dur, peak: 0.07, attack: 0.4, release: 0.6, filter: { type: 'lowpass', freq: 700, q: 2 } });
      });
    },
    heartbeat(ctx, out) {
      // Lub-dub, lub-dub: two low thumps per beat, repeated twice.
      const t0 = ctx.currentTime;
      [0, 0.8].forEach((beat) => {
        tone(ctx, out, { type: 'sine', freq: 75, glideTo: 40, t0: t0 + beat, dur: 0.22, peak: 0.8, attack: 0.008, release: 0.15 }); // lub
        tone(ctx, out, { type: 'sine', freq: 65, glideTo: 38, t0: t0 + beat + 0.24, dur: 0.18, peak: 0.55, attack: 0.008, release: 0.12 }); // dub
        noise(ctx, out, { t0: t0 + beat, dur: 0.05, peak: 0.12, release: 0.04, filter: { type: 'lowpass', freq: 250 } });
      });
    },
    siren(ctx, out) {
      // Police siren: two full up/down sweeps on a slightly detuned square/saw pair.
      const t0 = ctx.currentTime;
      const half = 0.4;
      for (let i = 0; i < 2; i++) {
        const s = t0 + i * half * 2;
        tone(ctx, out, { type: 'square', freq: 600, glideTo: 1200, t0: s, dur: half, peak: 0.12, attack: i === 0 ? 0.03 : 0.005, release: 0.01, filter: { type: 'lowpass', freq: 2500 } });
        tone(ctx, out, { type: 'square', freq: 1200, glideTo: 600, t0: s + half, dur: half, peak: 0.12, attack: 0.005, release: i === 1 ? 0.2 : 0.01, filter: { type: 'lowpass', freq: 2500 } });
        tone(ctx, out, { type: 'sawtooth', freq: 603, glideTo: 1206, t0: s, dur: half, peak: 0.08, attack: i === 0 ? 0.03 : 0.005, release: 0.01, filter: { type: 'lowpass', freq: 3000 } });
        tone(ctx, out, { type: 'sawtooth', freq: 1206, glideTo: 603, t0: s + half, dur: half, peak: 0.08, attack: 0.005, release: i === 1 ? 0.2 : 0.01, filter: { type: 'lowpass', freq: 3000 } });
      }
    },
    nope(ctx, out) {
      // "Uh-uh" buzzer: two short low square notes, the second a bit lower.
      const t0 = ctx.currentTime;
      [[0, 130], [0.2, 110]].forEach(([d, f]) => {
        tone(ctx, out, { type: 'square', freq: f, t0: t0 + d, dur: 0.15, peak: 0.22, attack: 0.005, release: 0.04, filter: { type: 'lowpass', freq: 900 } });
        tone(ctx, out, { type: 'square', freq: f * 1.5, t0: t0 + d, dur: 0.15, peak: 0.1, attack: 0.005, release: 0.04, filter: { type: 'lowpass', freq: 900 } });
      });
    },
    gong(ctx, out) {
      // Deep gong: inharmonic low partials with a 2.5 s decay, plus a shimmering noise wash.
      const t0 = ctx.currentTime;
      const f = 110;
      [
        { r: 1, peak: 0.3, dur: 2.5 },
        { r: 1.5, peak: 0.16, dur: 2.3 },
        { r: 2.41, peak: 0.13, dur: 2.0 },
        { r: 3.87, peak: 0.08, dur: 1.5 },
        { r: 6.13, peak: 0.05, dur: 1.0 },
      ].forEach((p) => {
        tone(ctx, out, { type: 'sine', freq: f * p.r * 1.01, glideTo: f * p.r, t0, dur: p.dur, peak: p.peak, attack: 0.01, release: p.dur - 0.05 });
      });
      // Strike transient and a slow metallic wash.
      noise(ctx, out, { t0, dur: 0.06, peak: 0.3, attack: 0.002, release: 0.05, filter: { type: 'lowpass', freq: 1200 } });
      noise(ctx, out, { t0, dur: 2.2, peak: 0.06, attack: 0.15, release: 1.8, filter: { type: 'bandpass', freq: 1800, q: 4 } });
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
