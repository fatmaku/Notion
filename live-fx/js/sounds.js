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

  // Bell hit at an explicit time (shared by the `bell` one-shot and the `churchBells` loop).
  function bellAt(ctx, out, t0, f, scale) {
    const partials = [
      { r: 0.5, peak: 0.16, dur: 2.2 }, // hum
      { r: 1, peak: 0.28, dur: 2.3 },
      { r: 2.76, peak: 0.16, dur: 1.6 },
      { r: 5.4, peak: 0.09, dur: 1.0 },
      { r: 8.93, peak: 0.04, dur: 0.6 },
    ];
    partials.forEach((p) => {
      tone(ctx, out, { type: 'sine', freq: f * p.r, t0, dur: p.dur, peak: p.peak * scale, attack: 0.003, release: p.dur - 0.05 });
    });
    // Clapper strike transient.
    noise(ctx, out, { t0, dur: 0.03, peak: 0.25 * scale, attack: 0.001, release: 0.025, filter: { type: 'bandpass', freq: 3000, q: 1 } });
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
      bellAt(ctx, out, ctx.currentTime, 440, 1);
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
    // ---- LiveFX 2.0 additions (audio-engine). Per-voice peaks stay <= 0.6, see docs/SOUNDS.md. ----
    bleat(ctx, out) {
      // Goat/sheep meme bleat: sawtooth with a fast, deep vibrato, slightly falling at the end.
      const t0 = ctx.currentTime;
      const dur = 0.75;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, t0);
      osc.frequency.setValueAtTime(330, t0 + 0.5);
      osc.frequency.exponentialRampToValueAtTime(260, t0 + dur);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8, t0);
      lfo.frequency.linearRampToValueAtTime(11, t0 + dur);
      const depth = ctx.createGain();
      depth.gain.value = 28; // Hz of vibrato, modulation only (not an audio-path gain)
      lfo.connect(depth).connect(osc.frequency);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 4;
      lp.frequency.setValueAtTime(1500, t0);
      lp.frequency.exponentialRampToValueAtTime(900, t0 + dur);
      const g = ctx.createGain();
      env(g, t0, 0.03, dur - 0.03 - 0.12, 0.12, 0.3);
      osc.connect(lp).connect(g).connect(out);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur + 0.05);
      lfo.stop(t0 + dur + 0.05);
      // Nasal second voice and a little breath.
      tone(ctx, out, { type: 'square', freq: 660, glideTo: 520, t0, dur, peak: 0.06, attack: 0.03, release: 0.12, filter: { type: 'bandpass', freq: 1800, q: 3 } });
      noise(ctx, out, { t0, dur: 0.3, peak: 0.04, attack: 0.02, release: 0.2, filter: { type: 'bandpass', freq: 2500, q: 1 } });
    },
    duck(ctx, out) {
      // Squeaky rubber duck: two-tone chirp (up, then down) with a thin square overtone.
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 1700, glideTo: 2500, t0, dur: 0.13, peak: 0.3, attack: 0.01, release: 0.03 });
      tone(ctx, out, { type: 'square', freq: 1700, glideTo: 2500, t0, dur: 0.13, peak: 0.05, attack: 0.01, release: 0.03, filter: { type: 'lowpass', freq: 6000 } });
      tone(ctx, out, { type: 'sine', freq: 2400, glideTo: 1400, t0: t0 + 0.16, dur: 0.2, peak: 0.3, attack: 0.01, release: 0.08 });
      tone(ctx, out, { type: 'square', freq: 2400, glideTo: 1400, t0: t0 + 0.16, dur: 0.2, peak: 0.05, attack: 0.01, release: 0.08, filter: { type: 'lowpass', freq: 6000 } });
      noise(ctx, out, { t0, dur: 0.36, peak: 0.04, attack: 0.02, release: 0.1, filter: { type: 'highpass', freq: 4000 } });
    },
    fanfare(ctx, out) {
      // Three-note trumpet fanfare (C E G, the G held): square + saw through a lowpass, sub octave for body.
      const t0 = ctx.currentTime;
      [[0, 523.3, 0.17], [0.19, 659.3, 0.17], [0.38, 784, 1.0]].forEach(([d, f, dur], i) => {
        const last = i === 2;
        const start = t0 + d;
        tone(ctx, out, { type: 'square', freq: f * 0.99, glideTo: f, t0: start, dur, peak: 0.16, attack: 0.02, release: last ? 0.4 : 0.05, filter: { type: 'lowpass', freq: 1600, q: 2 } });
        tone(ctx, out, { type: 'sawtooth', freq: f * 1.004, t0: start, dur, peak: 0.1, attack: 0.02, release: last ? 0.4 : 0.05, filter: { type: 'lowpass', freq: 2400, q: 1.5 } });
        tone(ctx, out, { type: 'sine', freq: f / 2, t0: start, dur, peak: 0.06, attack: 0.02, release: last ? 0.4 : 0.05 });
      });
      // Third and fifth under the held note make it a chord.
      [523.3, 659.3].forEach((f) => {
        tone(ctx, out, { type: 'square', freq: f, t0: t0 + 0.42, dur: 0.95, peak: 0.07, attack: 0.04, release: 0.4, filter: { type: 'lowpass', freq: 1400, q: 2 } });
      });
    },
    kidlaugh(ctx, out) {
      // Short child giggle: six rapid pulsed "hi" tones, rising a little then falling.
      const t0 = ctx.currentTime;
      const base = [720, 780, 820, 790, 740, 690];
      base.forEach((f, i) => {
        const start = t0 + i * 0.105;
        tone(ctx, out, { type: 'sine', freq: f * 1.1, glideTo: f * 0.9, t0: start, dur: 0.08, peak: 0.26, attack: 0.012, release: 0.04 });
        tone(ctx, out, { type: 'square', freq: f * 2.2, glideTo: f * 1.8, t0: start, dur: 0.07, peak: 0.045, attack: 0.012, release: 0.03, filter: { type: 'lowpass', freq: 3500, q: 2 } });
        noise(ctx, out, { t0: start, dur: 0.06, peak: 0.08, attack: 0.005, release: 0.03, filter: { type: 'bandpass', freq: 2800, q: 2 } });
      });
    },
    scream(ctx, out) {
      // Wilhelm-ish "aaah!": a sawtooth voice falling an octave with vibrato, through sweeping formant
      // bandpasses, plus breathy noise through the same formants.
      const t0 = ctx.currentTime;
      const dur = 1.0;
      const bus = ctx.createGain();
      env(bus, t0, 0.04, 0.55, dur - 0.59, 0.55);
      bus.connect(out);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(560, t0);
      osc.frequency.exponentialRampToValueAtTime(470, t0 + 0.5);
      osc.frequency.exponentialRampToValueAtTime(240, t0 + dur);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 6.5;
      const depth = ctx.createGain();
      depth.gain.value = 18; // vibrato depth in Hz (modulation only)
      lfo.connect(depth).connect(osc.frequency);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, dur + 0.1);
      const breath = ctx.createGain();
      breath.gain.value = 0.35;
      src.connect(breath);
      [{ f: 900, to: 500, q: 6, g: 0.5 }, { f: 1500, to: 900, q: 8, g: 0.3 }].forEach((fm) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = fm.q;
        bp.frequency.setValueAtTime(fm.f, t0);
        bp.frequency.exponentialRampToValueAtTime(fm.to, t0 + dur);
        const g = ctx.createGain();
        g.gain.value = fm.g;
        osc.connect(bp);
        breath.connect(bp);
        bp.connect(g).connect(bus);
      });
      osc.start(t0);
      lfo.start(t0);
      src.start(t0);
      osc.stop(t0 + dur + 0.05);
      lfo.stop(t0 + dur + 0.05);
      src.stop(t0 + dur + 0.05);
    },
    glass(ctx, out) {
      // Glass break: sharp noise burst, ringing inharmonic high partials and a few tinkling shards.
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0, dur: 0.07, peak: 0.45, attack: 0.001, release: 0.05, filter: { type: 'highpass', freq: 3500 } });
      noise(ctx, out, { t0: t0 + 0.05, dur: 0.3, peak: 0.2, attack: 0.005, release: 0.25, filter: { type: 'bandpass', freq: 6500, q: 1.2 } });
      [[3150, 0.12, 0.9], [4720, 0.1, 0.7], [6180, 0.08, 0.55], [7900, 0.06, 0.45], [9950, 0.04, 0.35]].forEach(([f, peak, dur]) => {
        tone(ctx, out, { type: 'sine', freq: f * 1.01, glideTo: f, t0, dur, peak, attack: 0.002, release: dur - 0.03 });
      });
      for (let i = 0; i < 7; i++) {
        const start = t0 + 0.08 + i * 0.065 + (i % 2) * 0.02;
        const f = 2500 + ((i * 1301) % 5000);
        tone(ctx, out, { type: 'sine', freq: f, glideTo: f * 0.97, t0: start, dur: 0.18, peak: 0.06, attack: 0.002, release: 0.15 });
      }
    },
    camera(ctx, out) {
      // Camera shutter: mirror slap, "click", short motor whirr, second click when the shutter closes.
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0, dur: 0.025, peak: 0.3, attack: 0.001, release: 0.02, filter: { type: 'lowpass', freq: 1800 } });
      tone(ctx, out, { type: 'square', freq: 2300, glideTo: 1700, t0, dur: 0.018, peak: 0.28, attack: 0.001, release: 0.012 });
      tone(ctx, out, { type: 'sawtooth', freq: 170, t0: t0 + 0.03, dur: 0.12, peak: 0.05, attack: 0.01, release: 0.04, filter: { type: 'lowpass', freq: 700, q: 2 } });
      noise(ctx, out, { t0: t0 + 0.09, dur: 0.03, peak: 0.25, attack: 0.001, release: 0.025, filter: { type: 'highpass', freq: 3000 } });
      tone(ctx, out, { type: 'square', freq: 1600, glideTo: 1200, t0: t0 + 0.09, dur: 0.016, peak: 0.2, attack: 0.001, release: 0.012 });
    },
    door(ctx, out) {
      // Creaking door: slowly rising, wobbling sawtooth through a resonant band (stick-slip creak),
      // plus a soft wooden knock at the start.
      const t0 = ctx.currentTime;
      const dur = 1.4;
      noise(ctx, out, { t0, dur: 0.05, peak: 0.15, attack: 0.002, release: 0.04, filter: { type: 'lowpass', freq: 400 } });
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, t0);
      osc.frequency.exponentialRampToValueAtTime(150, t0 + 0.5);
      osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.8);
      osc.frequency.exponentialRampToValueAtTime(190, t0 + dur);
      const lfo = ctx.createOscillator();
      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(9, t0);
      lfo.frequency.linearRampToValueAtTime(16, t0 + dur);
      const depth = ctx.createGain();
      depth.gain.value = 22; // Hz wobble (modulation only)
      lfo.connect(depth).connect(osc.frequency);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 5;
      bp.frequency.setValueAtTime(700, t0);
      bp.frequency.exponentialRampToValueAtTime(1400, t0 + dur);
      const g = ctx.createGain();
      env(g, t0 + 0.04, 0.08, dur - 0.04 - 0.08 - 0.25, 0.25, 0.3);
      osc.connect(bp).connect(g).connect(out);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur + 0.05);
      lfo.stop(t0 + dur + 0.05);
      tone(ctx, out, { type: 'sawtooth', freq: 191, glideTo: 380, t0: t0 + 0.04, dur: dur - 0.04, peak: 0.07, attack: 0.1, release: 0.25, filter: { type: 'bandpass', freq: 2200, q: 6 } });
    },
    tick(ctx, out) {
      // Clock "tick ... tock": two wooden clicks half a second apart, the second one lower.
      const t0 = ctx.currentTime;
      [[0, 2100, 1400, 2800, 0.3], [0.5, 1500, 950, 1900, 0.26]].forEach(([d, f1, f2, nf, peak]) => {
        const start = t0 + d;
        noise(ctx, out, { t0: start, dur: 0.02, peak, attack: 0.001, release: 0.015, filter: { type: 'highpass', freq: nf } });
        tone(ctx, out, { type: 'sine', freq: f1, glideTo: f2, t0: start, dur: 0.03, peak, attack: 0.001, release: 0.025 });
        tone(ctx, out, { type: 'triangle', freq: f2 / 2, t0: start, dur: 0.05, peak: 0.12, attack: 0.001, release: 0.04, filter: { type: 'lowpass', freq: 1500 } });
      });
    },
    sparkle(ctx, out) {
      // Magic glitter: rapid rising bell arpeggio with a bright octave and a high shimmer wash.
      const t0 = ctx.currentTime;
      [1568, 1760, 2093, 2349, 2637, 3136, 3520, 4186].forEach((f, i) => {
        const start = t0 + i * 0.055;
        tone(ctx, out, { type: 'sine', freq: f, t0: start, dur: 0.55, peak: 0.16, attack: 0.003, release: 0.45 });
        tone(ctx, out, { type: 'sine', freq: f * 2.01, t0: start, dur: 0.35, peak: 0.05, attack: 0.003, release: 0.3 });
      });
      noise(ctx, out, { t0: t0 + 0.1, dur: 0.8, peak: 0.05, attack: 0.1, release: 0.6, filter: { type: 'highpass', freq: 7000 } });
    },
    punch(ctx, out) {
      // Punch: low thud plus a short noise slap.
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 130, glideTo: 45, t0, dur: 0.28, peak: 0.6, attack: 0.003, release: 0.2 });
      tone(ctx, out, { type: 'triangle', freq: 220, glideTo: 60, t0, dur: 0.12, peak: 0.25, attack: 0.003, release: 0.08 });
      noise(ctx, out, { t0, dur: 0.06, peak: 0.4, attack: 0.002, release: 0.04, filter: { type: 'bandpass', freq: 1200, q: 0.8 } });
      noise(ctx, out, { t0: t0 + 0.01, dur: 0.16, peak: 0.3, attack: 0.005, release: 0.12, filter: { type: 'lowpass', freq: 450 } });
    },
    whoosh2(ctx, out) {
      // Double swish: one rising, one falling noise sweep with a faint airy sine underneath.
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0, dur: 0.3, peak: 0.4, attack: 0.07, release: 0.12, filter: { type: 'bandpass', freq: 300, glideTo: 2800, q: 1.5 } });
      noise(ctx, out, { t0: t0 + 0.32, dur: 0.4, peak: 0.4, attack: 0.08, release: 0.22, filter: { type: 'bandpass', freq: 2800, glideTo: 350, q: 1.5 } });
      noise(ctx, out, { t0, dur: 0.72, peak: 0.1, attack: 0.1, release: 0.3, filter: { type: 'highpass', freq: 6000 } });
      tone(ctx, out, { type: 'sine', freq: 180, glideTo: 700, t0, dur: 0.3, peak: 0.07, attack: 0.08, release: 0.1 });
      tone(ctx, out, { type: 'sine', freq: 700, glideTo: 160, t0: t0 + 0.32, dur: 0.4, peak: 0.07, attack: 0.08, release: 0.2 });
    },
  };


  // ---------------------------------------------------------------------------------------------
  // Ambient loops (story mode). Everything below is built from plain WebAudio nodes only: looping
  // AudioBufferSourceNodes with generated noise/tone buffers, LFO oscillators that modulate filter
  // frequency or gain, and periodic events pre-scheduled AHEAD seconds into the future. There is no
  // setTimeout anywhere: a silent 5-s "scheduler" buffer re-arms the event queue via `onended`, so
  // the loops also render correctly inside an OfflineAudioContext.
  // ---------------------------------------------------------------------------------------------

  const LOOP_FADE = 1.5; // seconds, fade-in and default fade-out
  const LOOP_AHEAD = 30; // seconds of events kept scheduled ahead of currentTime
  const LOOP_TICK = 5; // length of the silent scheduler buffer

  // Pink-ish noise (Paul Kellet's filter), roughly -3 dB/oct, much softer than white noise.
  function pinkNoiseBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return buf;
  }

  const rnd = (min, max) => min + Math.random() * (max - min);

  // Small graph builder shared by all loop recipes. `master` is the fade gain; every long-running
  // source is tracked so stop() can end it after the fade-out.
  function makeLoopBuilder(ctx, master) {
    const t0 = ctx.currentTime;
    const sources = [];
    let white = null;
    let pink = null;
    let stopped = false;
    const L = {
      ctx,
      master,
      t0,
      get stopped() { return stopped; },
      track(src) { sources.push(src); return src; },
      gain(value, dest = master) {
        const g = ctx.createGain();
        g.gain.value = value;
        g.connect(dest);
        return g;
      },
      filter(type, freq, q = 1, dest = master) {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        f.connect(dest);
        return f;
      },
      // Looping noise bed (white or pink) feeding `dest`.
      noise(kind, dest, seconds = 4) {
        const src = ctx.createBufferSource();
        if (kind === 'pink') src.buffer = pink || (pink = pinkNoiseBuffer(ctx, seconds));
        else src.buffer = white || (white = noiseBuffer(ctx, seconds));
        src.loop = true;
        src.connect(dest);
        src.start(t0);
        return L.track(src);
      },
      // Continuous oscillator.
      osc(type, freq, dest) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.connect(dest);
        o.start(t0);
        return L.track(o);
      },
      // LFO: oscillator -> depth gain -> AudioParam (adds ±depth around the param's own value).
      lfo(param, freq, depth, type = 'sine') {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = depth;
        o.connect(g).connect(param);
        o.start(t0);
        return L.track(o);
      },
      // One-shot tone at time t (uses the same envelope helper as the one-shot sounds).
      tone(dest, opts) { tone(ctx, dest, opts); },
      // One-shot noise burst at time t, sliced from a shared white-noise buffer (no per-event allocation).
      burst(dest, { t0: t, dur, peak = 0.3, attack = 0.003, release = 0.02, filter = null }) {
        const src = ctx.createBufferSource();
        src.buffer = white || (white = noiseBuffer(ctx, 4));
        const g = ctx.createGain();
        env(g, t, attack, Math.max(0, dur - attack - release), release, peak);
        let node = src;
        if (filter) {
          const f = ctx.createBiquadFilter();
          f.type = filter.type || 'bandpass';
          f.frequency.value = filter.freq || 1000;
          f.Q.value = filter.q || 1;
          src.connect(f);
          node = f;
        }
        node.connect(g).connect(dest);
        src.start(t, Math.random() * 3, dur + 0.1);
        src.stop(t + dur + 0.1);
      },
      // Event stream: `nextGap()` returns the seconds until the next event, `fn(t)` schedules it.
      // Events are kept LOOP_AHEAD s ahead; a silent LOOP_TICK-s buffer source re-arms the queue.
      events(nextGap, fn, firstDelay = nextGap()) {
        let cursor = t0 + firstDelay;
        const silent = ctx.createBuffer(1, Math.floor(ctx.sampleRate * LOOP_TICK), ctx.sampleRate);
        const fill = () => {
          const horizon = ctx.currentTime + LOOP_AHEAD;
          let guard = 0;
          while (cursor < horizon && guard++ < 2000) {
            fn(cursor);
            cursor += Math.max(0.01, nextGap());
          }
        };
        const arm = () => {
          if (stopped) return;
          try {
            fill();
            const s = ctx.createBufferSource();
            s.buffer = silent;
            s.connect(master);
            s.onended = arm;
            s.start(ctx.currentTime);
            L.track(s);
          } catch (_) {
            /* context closed / rendering finished */
          }
        };
        arm();
      },
      stopAll(at) {
        stopped = true;
        for (const s of sources) {
          try { s.stop(at); } catch (_) { /* already stopped */ }
        }
      },
    };
    return L;
  }

  // ---- shared building blocks -----------------------------------------------------------------

  function rainLayer(L, dest, level) {
    // Pink noise, band-limited to the "hiss on leaves" range, with a gentle intensity wobble.
    const g = L.gain(level, dest);
    L.lfo(g.gain, 0.17, level * 0.25);
    const hp = L.filter('highpass', 700, 0.7, g);
    const lp = L.filter('lowpass', 7000, 0.5, hp);
    L.noise('pink', lp);
    // Random drip ticks: tiny descending sine blips.
    const drips = L.gain(1, dest);
    L.events(() => rnd(0.04, 0.35), (t) => {
      const f = rnd(1200, 3200);
      L.tone(drips, { type: 'sine', freq: f, glideTo: f * 0.6, t0: t, dur: 0.035, peak: rnd(0.03, 0.09) * level * 3, attack: 0.002, release: 0.02 });
    });
  }

  function windLayer(L, dest, level) {
    // White noise through a resonant bandpass whose centre sweeps slowly (0.1–0.3 Hz).
    const g = L.gain(level, dest);
    L.lfo(g.gain, 0.13, level * 0.4);
    const bp = L.filter('bandpass', 520, 1.6, g);
    L.lfo(bp.frequency, 0.21, 330);
    L.noise('white', bp);
    // Low rumble bed with its own slower swell.
    const rg = L.gain(level * 0.8, dest);
    L.lfo(rg.gain, 0.1, level * 0.3);
    const lp = L.filter('lowpass', 220, 0.8, rg);
    L.noise('pink', lp);
  }

  function thunderRumbles(L, dest, level, minGap, maxGap, firstDelay) {
    L.events(() => rnd(minGap, maxGap), (t) => {
      const f = rnd(40, 80);
      const dur = 2.0;
      L.tone(dest, { type: 'sine', freq: f, glideTo: f * 0.6, t0: t, dur, peak: 0.32 * level, attack: 0.15, release: 1.2 });
      L.tone(dest, { type: 'triangle', freq: f * 1.5, glideTo: f * 0.8, t0: t + 0.05, dur: dur * 0.8, peak: 0.08 * level, attack: 0.2, release: 1.0 });
      L.burst(dest, { t0: t, dur, peak: 0.22 * level, attack: 0.1, release: 1.4, filter: { type: 'lowpass', freq: 140, q: 0.7 } });
    }, firstDelay);
  }

  // ---- loop recipes ---------------------------------------------------------------------------

  const LOOPS = {
    rain(L) {
      rainLayer(L, L.master, 0.5);
    },
    wind(L) {
      windLayer(L, L.master, 0.45);
    },
    fireplace(L) {
      // Low rumble of the fire plus random short crackles (highpass noise, 30–60 ms) and pops.
      const rg = L.gain(0.7);
      L.lfo(rg.gain, 0.3, 0.2);
      const lp = L.filter('lowpass', 170, 0.9, rg);
      L.noise('pink', lp);
      const cr = L.gain(1);
      L.events(() => rnd(0.05, 0.45), (t) => {
        L.burst(cr, { t0: t, dur: rnd(0.03, 0.06), peak: rnd(0.1, 0.3), attack: 0.002, release: 0.015, filter: { type: 'highpass', freq: rnd(2000, 4000), q: 0.8 } });
        if (Math.random() < 0.25) L.tone(cr, { type: 'sine', freq: rnd(150, 260), glideTo: 70, t0: t, dur: 0.06, peak: 0.18, attack: 0.003, release: 0.04 });
      });
    },
    birds(L) {
      // Faint forest air plus random sine-glide chirps (2–4 kHz) grouped in short phrases.
      const air = L.gain(0.08);
      L.lfo(air.gain, 0.09, 0.03);
      const bp = L.filter('bandpass', 2800, 0.6, air);
      L.noise('pink', bp);
      const chirps = L.gain(1);
      L.events(() => rnd(0.5, 1.8), (t) => {
        const n = 3 + Math.floor(Math.random() * 5);
        const base = rnd(2000, 3400);
        let tt = t;
        for (let i = 0; i < n; i++) {
          const f1 = base * rnd(0.9, 1.15);
          const f2 = Math.min(4000, Math.max(2000, f1 * rnd(0.7, 1.4)));
          const dur = rnd(0.05, 0.14);
          L.tone(chirps, { type: 'sine', freq: f1, glideTo: f2, t0: tt, dur, peak: rnd(0.08, 0.16), attack: 0.008, release: dur * 0.4 });
          tt += dur + rnd(0.04, 0.16);
        }
      }, rnd(0.2, 0.8));
    },
    sea(L) {
      // Lowpass noise with an 8-s swell, plus foam hiss riding the same swell.
      const wg = L.gain(0.45);
      L.lfo(wg.gain, 1 / 8, 0.28);
      const lp = L.filter('lowpass', 420, 0.9, wg);
      L.lfo(lp.frequency, 1 / 8, 200);
      L.noise('pink', lp);
      const fg = L.gain(0.09);
      L.lfo(fg.gain, 1 / 8, 0.06);
      const hp = L.filter('highpass', 2500, 0.7, fg);
      L.noise('white', hp);
    },
    thunder(L) {
      rainLayer(L, L.master, 0.45);
      thunderRumbles(L, L.master, 1, 6, 14, rnd(1, 4));
    },
    nightCrickets(L) {
      // Periodic 4.2 kHz chirp trains (14 chirps every 0.17 s, then a short pause) over a night floor.
      const floor = L.gain(0.05);
      const bp = L.filter('bandpass', 900, 0.5, floor);
      L.noise('pink', bp);
      const cg = L.gain(1);
      let i = 0;
      L.events(() => {
        i++;
        return i % 14 === 0 ? 0.9 : 0.17 + (i % 3) * 0.02;
      }, (t) => {
        L.tone(cg, { type: 'sine', freq: 4200, t0: t, dur: 0.06, peak: 0.12, attack: 0.005, release: 0.03 });
        L.tone(cg, { type: 'sine', freq: 4300, t0: t + 0.07, dur: 0.05, peak: 0.1, attack: 0.005, release: 0.03 });
      }, 0.1);
    },
    heartbeatSlow(L) {
      // Lub-dub every 1.2 s.
      const g = L.gain(1);
      L.events(() => 1.2, (t) => {
        L.tone(g, { type: 'sine', freq: 75, glideTo: 40, t0: t, dur: 0.22, peak: 0.6, attack: 0.008, release: 0.15 }); // lub
        L.tone(g, { type: 'sine', freq: 65, glideTo: 38, t0: t + 0.24, dur: 0.18, peak: 0.42, attack: 0.008, release: 0.12 }); // dub
        L.burst(g, { t0: t, dur: 0.05, peak: 0.1, release: 0.04, filter: { type: 'lowpass', freq: 250 } });
      }, 0.2);
    },
    churchBells(L) {
      // Inharmonic bell hits every 3 s, alternating between two pitches, over a faint tower-wind bed.
      const air = L.filter('lowpass', 300, 0.7, L.gain(0.12));
      L.noise('pink', air);
      const g = L.gain(1);
      let i = 0;
      L.events(() => 3, (t) => {
        bellAt(L.ctx, g, t, i++ % 2 ? 392 : 440, 0.7);
      }, 0.3);
    },
    cityHum(L) {
      // 55 Hz drone + slowly breathing lowpass noise + an occasional distant horn (350/440 Hz).
      L.osc('sine', 55, L.gain(0.22));
      L.osc('triangle', 110, L.gain(0.06));
      const ng = L.gain(0.35);
      L.lfo(ng.gain, 0.06, 0.12);
      const lp = L.filter('lowpass', 600, 0.7, ng);
      L.lfo(lp.frequency, 0.045, 250);
      L.noise('pink', lp);
      const hg = L.gain(1);
      L.events(() => rnd(4, 12), (t) => {
        const dur = rnd(0.4, 0.9);
        [350, 440].forEach((f) => {
          L.tone(hg, { type: 'square', freq: f, t0: t, dur, peak: 0.07, attack: 0.05, release: 0.15, filter: { type: 'lowpass', freq: 1200, q: 1 } });
        });
      }, rnd(1, 5));
    },
    spaceDrone(L) {
      // Three detuned sines through a slowly sweeping lowpass, plus sparse high pings.
      const lp = L.filter('lowpass', 420, 2, L.gain(0.8));
      L.lfo(lp.frequency, 0.07, 300);
      [55, 55 * 1.007, 82.4].forEach((f) => L.osc('sine', f, L.gain(0.16, lp)));
      L.osc('sawtooth', 110.3, L.gain(0.05, lp));
      const pg = L.gain(1);
      L.events(() => rnd(2, 6), (t) => {
        const f = rnd(1800, 3600);
        L.tone(pg, { type: 'sine', freq: f, glideTo: f * 0.94, t0: t, dur: 0.7, peak: 0.08, attack: 0.01, release: 0.6 });
      }, rnd(0.5, 2.5));
    },
    storm(L) {
      // Wind + rain + thunder, a notch louder than the single layers.
      const mix = L.gain(1.05);
      windLayer(L, mix, 0.4);
      rainLayer(L, mix, 0.4);
      thunderRumbles(L, mix, 0.7, 4, 10, rnd(0.8, 3));
    },
  };

  function startLoop(name, ctx, out, volume = 1) {
    const recipe = LOOPS[name];
    if (!recipe) return null;
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(volume, t0 + LOOP_FADE);
    master.connect(out);
    const L = makeLoopBuilder(ctx, master);
    recipe(L);
    return {
      name,
      gain: master,
      stop(fadeSec = LOOP_FADE) {
        if (L.stopped) return;
        const t = ctx.currentTime;
        const fade = Math.max(0.01, Number(fadeSec) || 0);
        const current = Math.max(0.0001, Number(master.gain.value) || 0);
        if (typeof master.gain.cancelScheduledValues === 'function') master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(current, t);
        master.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        L.stopAll(t + fade + 0.05);
      },
    };
  }

  // ---------------------------------------------------------------------------------------------
  // LiveFX 2.0 – groups, intensity layers and the mixer.
  // ---------------------------------------------------------------------------------------------

  // Sound groups for the panel/editor. Every one-shot name appears in exactly one of the first three
  // groups; `ambient-loops` mirrors `loops`. `names` is exported in this grouped order.
  const GROUPS = {
    impact: ['airhorn', 'boom', 'punch', 'rimshot', 'drumroll', 'buzzer', 'nope', 'dramatic', 'siren', 'heartbeat', 'gong', 'glass', 'door', 'camera', 'scratch', 'whoosh', 'whoosh2'],
    funny: ['sadTrombone', 'crickets', 'applause', 'laugh', 'kidlaugh', 'ooh', 'boing', 'slideWhistle', 'bleat', 'duck', 'scream', 'tick'],
    magic: ['ding', 'pop', 'tada', 'fanfare', 'cash', 'coin', 'levelUp', 'bell', 'sparkle'],
    'ambient-loops': Object.keys(LOOPS),
  };
  const NAMES = GROUPS.impact.concat(GROUPS.funny, GROUPS.magic);
  // Safety net: a recipe that is missing from the groups is still playable and listed.
  for (const n of Object.keys(SFX)) if (!NAMES.includes(n)) NAMES.push(n);

  // Optional dedicated intensity layers: `fn(ctx, out, level)` adds the extra voice(s) for
  // `intensity` 2 (level 2) or 3 (level 3). Sounds without an entry get the generic detuned,
  // slightly delayed replay (see `playLayer`). Peaks stay within the 0.6 per-voice budget.
  const LAYERS = {
    boom(ctx, out, level) {
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 80, glideTo: 24, t0, dur: 1.6, peak: 0.45, attack: 0.01, release: 1.2 }); // sub octave
      if (level >= 3) noise(ctx, out, { t0, dur: 0.5, peak: 0.3, attack: 0.01, release: 0.4, filter: { type: 'lowpass', freq: 300 } });
    },
    punch(ctx, out, level) {
      const t0 = ctx.currentTime;
      tone(ctx, out, { type: 'sine', freq: 70, glideTo: 30, t0, dur: 0.4, peak: 0.45, attack: 0.003, release: 0.3 });
      noise(ctx, out, { t0, dur: 0.1, peak: level >= 3 ? 0.4 : 0.25, attack: 0.002, release: 0.08, filter: { type: 'bandpass', freq: 2500, q: 0.7 } });
    },
    airhorn(ctx, out, level) {
      const t0 = ctx.currentTime;
      [207.5, 311].forEach((f) => {
        tone(ctx, out, { type: 'sawtooth', freq: f * 0.97, glideTo: f, t0, dur: 0.9, peak: level >= 3 ? 0.14 : 0.1, attack: 0.02, release: 0.25, filter: { type: 'lowpass', freq: 1800, q: 2 } });
      });
    },
    glass(ctx, out, level) {
      const t0 = ctx.currentTime;
      noise(ctx, out, { t0: t0 + 0.02, dur: 0.5, peak: 0.25, attack: 0.005, release: 0.4, filter: { type: 'bandpass', freq: 5000, q: 0.8 } });
      for (let i = 0; i < (level >= 3 ? 10 : 5); i++) {
        const f = 2000 + ((i * 1733) % 6000);
        tone(ctx, out, { type: 'sine', freq: f, glideTo: f * 0.96, t0: t0 + 0.1 + i * 0.05, dur: 0.25, peak: 0.06, attack: 0.002, release: 0.2 });
      }
    },
    applause(ctx, out, level) {
      const t0 = ctx.currentTime;
      for (let i = 0; i < (level >= 3 ? 50 : 25); i++) {
        noise(ctx, out, { t0: t0 + Math.random() * 2.2, dur: 0.04, peak: 0.12, filter: { type: 'bandpass', freq: 1200 + Math.random() * 3000, q: 1.5 } });
      }
      if (level >= 3) tone(ctx, out, { type: 'sine', freq: 1800, glideTo: 2600, t0: t0 + 0.6, dur: 0.5, peak: 0.08, attack: 0.05, release: 0.3 }); // a whistle
    },
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : lo));
  const dbToGain = (db) => Math.pow(10, db / 20);

  // A thin view onto an AudioContext for one voice: `currentTime` is shifted by `when`, every
  // oscillator/buffer source is detuned by `cents`, and the latest scheduled stop() time is
  // recorded so the mixer knows when the voice ends (ducking release, stats) without timers.
  // Methods are bound explicitly – native AudioContext methods refuse a foreign `this`.
  function voiceContext(ctx, { when = 0, cents = 0 } = {}) {
    const rate = cents ? Math.pow(2, cents / 1200) : 1;
    const sources = [];
    let end = ctx.currentTime + when;
    const track = (src) => {
      sources.push(src);
      const stop = src.stop;
      src.stop = function (t) {
        if (Number.isFinite(t) && t > end) end = t;
        return stop.call(src, t);
      };
      return src;
    };
    return {
      get currentTime() { return ctx.currentTime + when; },
      get sampleRate() { return ctx.sampleRate; },
      get end() { return end; },
      sources,
      createGain: () => ctx.createGain(),
      createBiquadFilter: () => ctx.createBiquadFilter(),
      createBuffer: (c, l, r) => ctx.createBuffer(c, l, r),
      createOscillator() {
        const o = ctx.createOscillator();
        if (cents && o.detune) o.detune.value = cents;
        return track(o);
      },
      createBufferSource() {
        const s = ctx.createBufferSource();
        if (rate !== 1 && s.playbackRate) s.playbackRate.value = rate;
        return track(s);
      },
    };
  }

  // Synthetic impulse response: stereo white noise with an exponential decay (-60 dB at `seconds`).
  function impulseResponse(ctx, seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-6.9 * i) / len);
    }
    return buf;
  }

  /**
   * Mixer (LiveFX 2.0). Graph:
   *   voice -> [StereoPanner] -> sfxBus ----------------------------\
   *   loop  -> ambientBus -> duckGain -> (dry) ----------------------> master -> limiter -> out
   *                                   \-> convolver -> wetGain -----/
   * `limiter` is a DynamicsCompressorNode (threshold -6 dB, ratio 12, attack 3 ms). Everything is
   * scheduled with AudioParam automation only – no timers – so it also works in an OfflineAudioContext.
   */
  const mixer = {
    ctx: null,
    out: null,
    sfxBus: null,
    ambientBus: null,
    duckGain: null,
    master: null,
    limiter: null,
    convolver: null,
    wetGain: null,
    autoDuck: true,
    duckMs: 300,
    duckDb: -8,
    _voices: [],
    _loop: null,
    _levels: { master: 1, sfx: 1, ambient: 1 },
    _reverb: { on: false, seconds: 1.8, mix: 0.25 },
    _duckUntil: 0,

    /** Builds the graph on `ctx` (idempotent for the same ctx; a new ctx rebuilds). Returns the mixer. */
    init(ctx, out) {
      if (!ctx) return this;
      const dest = out || ctx.destination;
      if (this.ctx === ctx && this.out === dest && this.master) return this;
      if (this._loop) {
        try { this._loop.stop(0.01); } catch (_) { /* ignore */ }
        this._loop = null;
      }
      this.ctx = ctx;
      this.out = dest;
      this._voices = [];
      this.sfxBus = ctx.createGain();
      this.ambientBus = ctx.createGain();
      this.duckGain = ctx.createGain();
      this.master = ctx.createGain();
      this.sfxBus.gain.value = this._levels.sfx;
      this.ambientBus.gain.value = this._levels.ambient;
      this.duckGain.gain.value = 1;
      this.master.gain.value = this._levels.master;
      this.convolver = null;
      this.wetGain = null;
      if (typeof ctx.createDynamicsCompressor === 'function') {
        const lim = ctx.createDynamicsCompressor();
        lim.threshold.value = -6;
        lim.knee.value = 6;
        lim.ratio.value = 12;
        lim.attack.value = 0.003;
        lim.release.value = 0.25;
        this.limiter = lim;
        this.master.connect(lim);
        lim.connect(dest);
      } else {
        this.limiter = null;
        this.master.connect(dest);
      }
      this.sfxBus.connect(this.master);
      this.ambientBus.connect(this.duckGain);
      this.duckGain.connect(this.master);
      if (this._reverb.on) this.reverb(true, this._reverb);
      return this;
    },

    // Creates an AudioContext on first use when nobody called init(). Returns null without WebAudio.
    _ensure() {
      if (this.ctx && this.master) return this.ctx;
      const AC = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
      if (!AC) return null;
      try {
        this.init(new AC());
      } catch (_) {
        return null;
      }
      return this.ctx;
    },

    _prune() {
      const now = this.ctx.currentTime;
      this._voices = this._voices.filter((v) => v.end > now);
    },

    /**
     * Plays a one-shot on the sfx bus. opts: gain 0..1 (default 1), pan -1..1 (0), intensity 1..3 (1),
     * when (seconds from now, 0). Returns `{stop(), name, end}` (`end` = scheduled end time, ctx clock).
     */
    play(name, opts = {}) {
      const ctx = this._ensure();
      if (!ctx || !SFX[name]) return null;
      const o = opts && typeof opts === 'object' ? opts : {};
      const gain = clamp(o.gain === undefined ? 1 : o.gain, 0, 1);
      const pan = clamp(o.pan === undefined ? 0 : o.pan, -1, 1);
      const intensity = Math.round(clamp(o.intensity === undefined ? 1 : o.intensity, 1, 3));
      const when = clamp(o.when === undefined ? 0 : o.when, 0, 60);
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* ignore */ }
      }
      const vg = ctx.createGain();
      vg.gain.value = gain;
      let tail = vg;
      if (pan !== 0 || o.pan !== undefined) {
        if (typeof ctx.createStereoPanner === 'function') {
          const p = ctx.createStereoPanner();
          p.pan.value = pan;
          vg.connect(p);
          tail = p;
        } else if (typeof ctx.createPanner === 'function') {
          // Fallback for engines without StereoPannerNode (old Safari): equal-power 3-D panner.
          const p = ctx.createPanner();
          p.panningModel = 'equalpower';
          if (typeof p.setPosition === 'function') p.setPosition(pan, 0, 1 - Math.abs(pan));
          vg.connect(p);
          tail = p;
        }
      }
      tail.connect(this.sfxBus);
      const voices = [voiceContext(ctx, { when })];
      SFX[name](voices[0], vg);
      for (let level = 2; level <= intensity; level++) voices.push(this._playLayer(name, vg, level, when));
      const voice = {
        name,
        get end() { return Math.max.apply(null, voices.map((v) => v.end)); },
        stop() {
          const now = ctx.currentTime;
          try {
            vg.gain.cancelScheduledValues(now);
            vg.gain.setTargetAtTime(0, now, 0.02);
          } catch (_) { /* ignore */ }
          for (const v of voices) for (const s of v.sources) { try { s.stop(now + 0.1); } catch (_) { /* already stopped */ } }
          voice._stopped = now + 0.12;
        },
      };
      this._prune();
      this._voices.push({ get end() { return voice._stopped ? Math.min(voice._stopped, voice.end) : voice.end; } });
      if (this.autoDuck && this._loop) this.duck(this.duckMs, this.duckDb);
      return voice;
    },

    _playLayer(name, out, level, when) {
      const ctx = this.ctx;
      const lg = ctx.createGain();
      lg.connect(out);
      if (LAYERS[name]) {
        lg.gain.value = 1;
        const vc = voiceContext(ctx, { when });
        LAYERS[name](vc, lg, level);
        return vc;
      }
      // Generic: a detuned replay a few ms late at lower gain – thicker and wider without clipping.
      lg.gain.value = level === 2 ? 0.5 : 0.4;
      const vc = voiceContext(ctx, { when: when + 0.014 * (level - 1), cents: level === 2 ? 9 : -14 });
      SFX[name](vc, lg);
      return vc;
    },

    /** Starts an ambient loop on the ambient bus (fades in 1.5 s); replaces a running loop (fade-out). */
    startLoop(name, opts = {}) {
      const ctx = this._ensure();
      if (!ctx || !LOOPS[name]) return null;
      const o = opts && typeof opts === 'object' ? opts : {};
      const gain = clamp(o.gain === undefined ? 1 : o.gain, 0, 1);
      if (this._loop && this._loop.name === name) return this._loop;
      this.stopLoop(o.fade);
      const h = startLoop(name, ctx, this.ambientBus, gain);
      this._loop = h;
      return h;
    },

    stopLoop(fadeSec = LOOP_FADE) {
      const h = this._loop;
      this._loop = null;
      if (!h) return false;
      try { h.stop(fadeSec); } catch (_) { /* ignore */ }
      return true;
    },

    /**
     * Ducks the ambient bus by `db` immediately and releases it back over `ms` after the last
     * active sfx voice ends (or after `ms` from now when nothing plays). Pure automation.
     */
    duck(ms = 300, db = -8) {
      if (!this.ctx || !this.duckGain) return false;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const release = Math.max(0.02, clamp(ms, 0, 60000) / 1000);
      const low = dbToGain(clamp(db, -60, 0));
      this._prune();
      let endAt = now;
      for (const v of this._voices) if (v.end > endAt) endAt = v.end;
      if (endAt === now) endAt = now + release;
      const p = this.duckGain.gain;
      if (typeof p.cancelScheduledValues === 'function') p.cancelScheduledValues(now);
      p.setTargetAtTime(low, now, 0.015);
      p.setTargetAtTime(1, endAt, release / 4); // ~98 % restored after `release`
      this._duckUntil = endAt + release;
      return true;
    },

    setMaster(v) {
      const g = clamp(v, 0, 1);
      this._levels.master = g;
      if (this.master) this._ramp(this.master.gain, g);
      return g;
    },

    setBus(bus, v) {
      if (bus !== 'sfx' && bus !== 'ambient') return null;
      const g = clamp(v, 0, 1);
      this._levels[bus] = g;
      const node = bus === 'sfx' ? this.sfxBus : this.ambientBus;
      if (node) this._ramp(node.gain, g);
      return g;
    },

    _ramp(param, v) {
      const now = this.ctx.currentTime;
      try {
        if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
        param.setTargetAtTime(v, now, 0.02);
      } catch (_) {
        param.value = v;
      }
    },

    /** Synthetic reverb on the ambient bus (scenes). `reverb(true, {seconds, mix})`, `reverb(false)`. */
    reverb(on, opts = {}) {
      const o = opts && typeof opts === 'object' ? opts : {};
      const seconds = clamp(o.seconds === undefined ? this._reverb.seconds : o.seconds, 0.1, 10);
      const mix = clamp(o.mix === undefined ? this._reverb.mix : o.mix, 0, 1);
      this._reverb = { on: !!on, seconds, mix };
      const ctx = this.ctx;
      if (!ctx || !this.master) return this._reverb.on; // applied by init()
      if (!on) {
        if (this.wetGain) this._ramp(this.wetGain.gain, 0);
        return false;
      }
      if (typeof ctx.createConvolver !== 'function') return false;
      if (!this.convolver || this.convolver._seconds !== seconds) {
        if (this.convolver) {
          try { this.convolver.disconnect(); } catch (_) { /* ignore */ }
        }
        const cv = ctx.createConvolver();
        cv.buffer = impulseResponse(ctx, seconds);
        cv._seconds = seconds;
        if (!this.wetGain) {
          this.wetGain = ctx.createGain();
          this.wetGain.gain.value = 0;
          this.wetGain.connect(this.master);
        }
        this.duckGain.connect(cv);
        cv.connect(this.wetGain);
        this.convolver = cv;
      }
      this._ramp(this.wetGain.gain, mix);
      return true;
    },

    get stats() {
      if (this.ctx) this._prune();
      const now = this.ctx ? this.ctx.currentTime : 0;
      return {
        voices: this._voices.length,
        ducked: !!this.ctx && now < this._duckUntil,
        master: this._levels.master,
        sfx: this._levels.sfx,
        ambient: this._levels.ambient,
        reverb: this._reverb.on,
        loop: this._loop ? this._loop.name : null,
        limiter: !!this.limiter,
      };
    },
  };

  global.LiveFXSounds = {
    names: NAMES,
    GROUPS,
    play(name, ctx, out, volume = 1) {
      const fn = SFX[name];
      if (!fn) return false;
      const g = ctx.createGain();
      g.gain.value = volume;
      g.connect(out);
      fn(ctx, g);
      return true;
    },
    loops: Object.keys(LOOPS),
    loop: startLoop,
    startLoop,
    mixer,
  };
})(typeof window !== 'undefined' ? window : globalThis);
