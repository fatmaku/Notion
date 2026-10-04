// Cat Me If You Can – Trailer-Musik, komplett synthetisch (lizenzfrei, keine Samples).
// Fröhliche Zupf-Melodie in C-Dur, 120 BPM, weicher Beat, Pad, dazu kleine Geräusche, die genau
// auf die Bilder fallen (Zeitplan aus timeline.js). Ergebnis: WAV, 44,1 kHz, 16 Bit, Stereo.
// Aufruf: node trailer/music.js [ausgabe.wav]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DURATION, cues } from './timeline.js';

const SR = 44100;
const N = Math.ceil(SR * DURATION);
const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = rng(20261004);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Busse: trocken (L/R) und Echo-Send für die Melodie. */
const L = new Float32Array(N);
const R = new Float32Array(N);
const EL = new Float32Array(N);
const ER = new Float32Array(N);

function mix(t0, buf, gain = 1, pan = 0, send = 0) {
  const s0 = Math.round(t0 * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < buf.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    L[j] += buf[i] * gl;
    R[j] += buf[i] * gr;
    if (send) {
      EL[j] += buf[i] * gl * send;
      ER[j] += buf[i] * gr * send;
    }
  }
}

// ---------- Klänge ----------
/** Gezupfter Ton (additiv): Obertöne klingen schneller ab → weich und „plucky“. */
function pluck(freq, dur, { tau = 0.42, harm = 7, bright = 1.4, inharm = 0 } = {}) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  for (let k = 1; k <= harm; k++) {
    const f = freq * k * (1 + inharm * (k - 1) * (k - 1));
    if (f > 16000) break;
    const a = 1 / Math.pow(k, bright);
    const tk = tau / (0.6 + 0.4 * k);
    const ph = rnd() * TAU;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] += a * Math.sin(TAU * f * t + ph) * Math.exp(-t / tk);
    }
  }
  const atk = Math.floor(0.004 * SR);
  for (let i = 0; i < atk && i < n; i++) out[i] *= i / atk;
  const rel = Math.floor(0.03 * SR);
  for (let i = 0; i < rel && i < n; i++) out[n - 1 - i] *= i / rel;
  return out;
}
function bell(freq, dur, tau = 1.1) {
  const parts = [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12], [2, 0.3]];
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  for (const [r, a] of parts) {
    const f = freq * r;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] += a * Math.sin(TAU * f * t) * Math.exp(-t / (tau / Math.sqrt(r)));
    }
  }
  for (let i = 0; i < 80 && i < n; i++) out[i] *= i / 80;
  return out;
}
function bassNote(freq, dur) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t / 0.32);
    out[i] = env * (Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * 2 * freq * t) + 0.1 * Math.sin(TAU * 3 * freq * t));
  }
  for (let i = 0; i < 400 && i < n; i++) out[n - 1 - i] *= i / 400;
  return out;
}
/** Weiche Fläche (Akkord), links/rechts leicht verstimmt. */
function pad(t0, dur, notes, gain) {
  const n = Math.floor((dur + 0.5) * SR);
  for (const [side, det] of [[-0.7, 0.9994], [0.7, 1.0006]]) {
    const out = new Float32Array(n);
    for (const m of notes) {
      const f0 = hz(m) * det;
      for (let k = 1; k <= 5; k++) {
        const a = 1 / (k * k * 0.8 + 0.2);
        const ph = rnd() * TAU;
        for (let i = 0; i < n; i++) out[i] += a * Math.sin(TAU * f0 * k * (i / SR) + ph);
      }
    }
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.35) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.5) : 1);
      out[i] *= env;
    }
    mix(t0, out, gain, side);
  }
}
function noise(n) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
  return out;
}
function hp(buf, a = 0.85) {
  let y = 0;
  let x1 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    y = a * (y + x - x1);
    x1 = x;
    buf[i] = y;
  }
  return buf;
}
function lp(buf, a = 0.3) {
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    buf[i] = y;
  }
  return buf;
}
function env(buf, tau, atk = 0.001) {
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    buf[i] *= Math.min(1, t / atk) * Math.exp(-t / tau);
  }
  return buf;
}
function kick() {
  const n = Math.floor(0.45 * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 48 + 100 * Math.exp(-t / 0.035);
    ph += (TAU * f) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / 0.13) * Math.min(1, t / 0.002);
  }
  return out;
}
const hat = () => env(hp(noise(Math.floor(0.08 * SR)), 0.9), 0.018);
const clap = () => env(lp(hp(noise(Math.floor(0.25 * SR)), 0.8), 0.35), 0.07, 0.002);
const shaker = () => env(hp(noise(Math.floor(0.06 * SR)), 0.95), 0.012, 0.004);
function sweep(f0, f1, dur, tau = dur / 2) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    ph += (TAU * (f0 + (f1 - f0) * p)) / SR;
    out[i] = Math.sin(ph) * Math.exp(-(i / SR) / tau) * Math.min(1, i / 60);
  }
  return out;
}
function whoosh(dur) {
  const n = Math.floor(dur * SR);
  const x = noise(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const a = 0.02 + 0.25 * Math.sin(Math.PI * p);
    y += a * (x[i] - y);
    x[i] = y * Math.sin(Math.PI * p);
  }
  return x;
}

// ---------- Komposition ----------
const BEAT = 0.5; // 120 BPM
const C = cues();
// Takte (2 s) ab 3 s; vorher Intro. [Start, Grundton (MIDI), Akkordtöne]
const CH = {
  C: { root: 48, pad: [60, 64, 67] },
  G: { root: 43, pad: [59, 62, 67] },
  Am: { root: 45, pad: [60, 64, 69] },
  F: { root: 41, pad: [60, 65, 69] },
};
const bars = [
  [3, 'C'], [5, 'G'], [7, 'Am'], [9, 'F'], [11, 'C'], [13, 'G'],
  [15, 'Am'], [17, 'F'], [19, 'G'], [21, 'C'], [23, 'F'],
];
const _ = null;
const MEL = {
  3: [76, _, 79, 76, 72, _, 74, 76],
  5: [74, _, 79, 74, 71, _, 74, _],
  7: [72, _, 76, 72, 81, _, 79, 76],
  9: [77, 76, 74, 72, 74, _, 72, _],
  11: [76, 79, 84, 79, 76, _, 79, 81],
  13: [79, _, 74, 79, 83, 81, 79, _],
  15: [76, _, _, _, 72, _, 74, _],
  17: [77, _, _, _, 76, _, 72, _],
  19: [74, _, 79, _, 83, _, 86, _],
  21: [84, _, 79, 76, 79, _, 84, _],
  23: [81, _, 77, _, _, _, _, _],
};

// Intro (Nacht): leise Fläche + funkelnde hohe Töne, „Augen“ glitzern
pad(0, 3.0, [57, 64, 69, 72], 0.016);
const stars = [84, 88, 91, 93, 96];
[0.25, 0.75, 1.15, 1.6, 2.05, 2.45].forEach((t, i) => mix(t, pluck(hz(stars[(i * 3) % 5]), 1.2, { tau: 0.5, harm: 4, bright: 2 }), 0.05, i % 2 ? 0.5 : -0.5, 0.6));
C.eyes.forEach((t, i) => mix(t, bell(hz([91, 88, 93, 96][i % 4]), 1.0, 0.6), 0.03, i % 2 ? -0.3 : 0.3, 0.4));
// Auftakt vor Szene 2
[2.5, 2.625, 2.75, 2.875].forEach((t, i) => mix(t, pluck(hz([67, 69, 71, 72][i]), 0.4, { tau: 0.2 }), 0.12, 0.1, 0.25));

for (const [t0, name] of bars) {
  const ch = CH[name];
  const sectionB = t0 >= 15 && t0 < 21;
  const ending = t0 >= 23;
  const len = ending ? 3 : 2;
  pad(t0, len, ch.pad, sectionB ? 0.028 : 0.018);
  // Bass
  const bpat = ending ? [[0, 0, 2.6]] : sectionB ? [[0, 0, 0.95], [1, 0, 0.95]] : [[0, 0, 0.4], [0.75, 0, 0.25], [1, 7, 0.4], [1.5, 0, 0.45]];
  for (const [dt, iv, d] of bpat) mix(t0 + dt, bassNote(hz(ch.root + iv), d), sectionB ? 0.2 : 0.24, 0);
  // Melodie
  const mel = MEL[t0] || [];
  mel.forEach((m, i) => {
    if (m == null) return;
    let dur = 0.25;
    for (let k = i + 1; k < mel.length && mel[k] == null; k++) dur += 0.25;
    mix(t0 + i * 0.25, pluck(hz(m), Math.min(1.6, dur + 0.5), { tau: sectionB ? 0.6 : 0.38, bright: 1.25, inharm: 0.0004 }), sectionB ? 0.15 : 0.17, 0.18, 0.35);
    // leise Oktave darüber als Glitzer
    if (!sectionB) mix(t0 + i * 0.25, pluck(hz(m + 12), 0.5, { tau: 0.18, harm: 3, bright: 2 }), 0.035, -0.25, 0.4);
  });
  // Schlagzeug
  if (ending) {
    mix(t0, kick(), 0.42, 0);
    continue;
  }
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (sectionB) {
      if (b === 0 || b === 2) mix(tb, kick(), 0.3, 0);
      mix(tb + 0.25, hat(), 0.05, -0.35);
      continue;
    }
    if (b === 0 || b === 2) mix(tb, kick(), 0.42, 0);
    if (b === 3 && (t0 === 13 || t0 === 21)) mix(tb + 0.25, kick(), 0.3, 0);
    if (b === 1 || b === 3) mix(tb, clap(), 0.16, 0.1);
    mix(tb + 0.25, hat(), 0.09, -0.35);
    for (let s = 0; s < 4; s++) mix(tb + s * 0.125, shaker(), s % 2 ? 0.025 : 0.04, 0.4);
  }
}
// Schlussakkord + Glocke
[72, 76, 79, 84].forEach((m, i) => mix(23 + i * 0.09, pluck(hz(m), 2.8, { tau: 0.9, bright: 1.3 }), 0.1, -0.3 + i * 0.2, 0.4));
mix(23.0, bell(hz(96), 2.6, 1.3), 0.045, 0, 0.5);

// ---------- Geräusche zum Bild ----------
mix(C.lock, pluck(hz(88), 0.3, { tau: 0.08, harm: 2 }), 0.08, 0.2); // Sucher rastet ein
mix(C.lock + 0.07, pluck(hz(93), 0.3, { tau: 0.08, harm: 2 }), 0.08, 0.2);
mix(C.throwA - 0.02, whoosh(0.55), 0.35, -0.2); // Wollknäuel fliegt
mix(C.land, sweep(330, 190, 0.12, 0.05), 0.22, 0.1); // landet (bop)
mix(C.land + 0.17, sweep(300, 210, 0.1, 0.04), 0.12, 0.1);
// Auslöser: zweifaches mechanisches Klicken (kein Blitz)
mix(C.shutter, env(hp(noise(Math.floor(0.03 * SR)), 0.7), 0.004), 0.5, 0);
mix(C.shutter, sweep(180, 90, 0.05, 0.02), 0.25, 0);
mix(C.shutter + 0.085, env(hp(noise(Math.floor(0.03 * SR)), 0.7), 0.005), 0.4, 0);
mix(C.shutter + 0.2, bell(hz(91), 0.8, 0.4), 0.03, 0.3); // +1 KediDex
mix(C.cardLand - 0.25, whoosh(0.35), 0.2, 0);
mix(C.cardLand, sweep(420, 980, 0.14, 0.08), 0.13, 0); // Karte da
[84, 88, 91].forEach((m, i) => mix(C.cardLand + 0.08 + i * 0.07, pluck(hz(m), 0.6, { tau: 0.25, harm: 3 }), 0.07, -0.3 + i * 0.3, 0.4));
C.typing.forEach((t) => {
  mix(t, env(hp(noise(Math.floor(0.02 * SR)), 0.6), 0.003), 0.16, 0.15);
  mix(t, sweep(2200, 1900, 0.02, 0.01), 0.04, 0.15);
});
const pent = [72, 74, 76, 79, 81];
C.count.forEach(({ t, n }) => {
  const m = pent[(n - 1) % 5] + 12 * Math.floor((n - 1) / 5);
  mix(t, pluck(hz(Math.min(m, 103)), 0.25, { tau: 0.06, harm: 3, bright: 1.8 }), 0.06, n % 2 ? -0.25 : 0.25);
});
mix(C.ding, bell(hz(96), 1.8, 1.1), 0.08, 0, 0.4); // 20 erreicht
mix(C.cup, sweep(260, 700, 0.12, 0.06), 0.15, 0);
[79, 84, 88, 91].forEach((m, i) => mix(C.cup + 0.25 + i * 0.06, pluck(hz(m), 0.8, { tau: 0.3, harm: 3 }), 0.06, 0.4 - i * 0.25, 0.4));
mix(C.tap, sweep(900, 600, 0.04, 0.015), 0.12, 0.2); // Chip antippen
[0.6, 0.95].forEach((dt) => mix(C.heart + dt, sweep(85, 55, 0.18, 0.07), 0.3, 0)); // Herzschlag
mix(C.logo, whoosh(0.45), 0.18, 0);
[84, 88, 91, 96].forEach((m, i) => mix(C.logo + 0.35 + i * 0.08, bell(hz(m), 1.2, 0.6), 0.03, -0.3 + i * 0.2, 0.5));

// ---------- Echo (Ping-Pong, punktierte Achtel) ----------
function lpAcc(ch, x) {
  lpAcc.s[ch] += 0.35 * (x - lpAcc.s[ch]);
  return lpAcc.s[ch];
}
lpAcc.s = [0, 0];
const D = Math.round(0.375 * SR);
for (let i = D; i < N; i++) {
  EL[i] += ER[i - D] * 0.32;
  ER[i] += EL[i - D] * 0.32;
}
for (let i = 0; i < N; i++) {
  L[i] += lpAcc(0, EL[i]) * 0.5;
  R[i] += lpAcc(1, ER[i]) * 0.5;
}

// ---------- Master: weich begrenzen, Blenden, normalisieren ----------
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.35) * (t > 24.3 ? Math.max(0, 1 - (t - 24.3) / (DURATION - 24.3)) : 1);
  L[i] = Math.tanh(L[i] * 1.3) * fade;
  R[i] = Math.tanh(R[i] * 1.3) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / (peak || 1);

export function writeWav(file) {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * norm * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * norm * 32767))), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([h, data]));
  return file;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || 'trailer-music.wav';
  console.log(writeWav(out), `${DURATION}s`, `peak→${(20 * Math.log10(0.89)).toFixed(1)} dBFS`);
}
