#!/usr/bin/env node
// Vision-Trailer soundtrack: the music bed of music.js (100 BPM, Am–F–C–G, unchanged synthesis) plus
// sound effects on the cues of vision.html: rain 7–11 s, thunder 8.9 s, card "dings" 12.1/13.3/14.4/15.6 s,
// success chime 16.75 s, applause 18.9 s, whoosh 25.3 s, click 28.3 s, clip pops 28.5 s, sparkle 32.6 s.
// Pure JavaScript, no dependencies, deterministic. Peak <= 0.5.
//   node music-vision.js [seconds=35] [out=music-vision.wav]
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 44100, BPM = 100;
const DUR = Number(process.argv[2] || 35);
const OUT = process.argv[3] || path.join(__dirname, 'music-vision.wav');
const N = Math.floor(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const beat = 60 / BPM, bar = 4 * beat;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// Mix a generated signal (function of local time x in seconds, returns sample) at `start`.
function add(start, dur, pan, gain, fn) {
  const i0 = Math.floor(start * SR), n = Math.floor(dur * SR);
  const gl = gain * Math.sqrt(0.5 * (1 - pan)), gr = gain * Math.sqrt(0.5 * (1 + pan));
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i >= N) break;
    const s = fn(k / SR);
    L[i] += s * gl; R[i] += s * gr;
  }
}
const env = (x, a, d, dur) => Math.min(1, x / a) * Math.min(1, Math.max(0, (dur - x) / d));
const soft = (v) => Math.tanh(v * 1.4) / 1.4;

function bass(f, dur) { return (x) => env(x, 0.004, 0.08, dur) * Math.exp(-x * 2.2) * soft(Math.sin(6.2832 * f * x) * 1.3 + 0.35 * Math.sin(6.2832 * 2 * f * x)); }
function pad(freqs, dur) {
  return (x) => {
    let s = 0;
    for (const f of freqs) {
      s += Math.sin(6.2832 * f * x) + 0.6 * Math.sin(6.2832 * f * 1.006 * x + 1) + 0.6 * Math.sin(6.2832 * f * 0.994 * x + 2) + 0.25 * Math.sin(6.2832 * 2 * f * x);
    }
    const lfo = 0.85 + 0.15 * Math.sin(6.2832 * 0.3 * x);
    return env(x, 0.9, 0.9, dur) * lfo * s / (freqs.length * 2.5);
  };
}
function pluck(f, dur) {
  return (x) => env(x, 0.003, 0.05, dur) * Math.exp(-x * 5.5) * (Math.sin(6.2832 * f * x) + 0.5 * Math.sin(6.2832 * 2 * f * x) * Math.exp(-x * 7) + 0.2 * Math.sin(6.2832 * 3 * f * x) * Math.exp(-x * 10));
}
function kick(x) { const f = 48 + 120 * Math.exp(-x * 28); return Math.exp(-x * 11) * Math.sin(6.2832 * f * x) * Math.min(1, x * 800); }
function hat(open) { const d = open ? 0.18 : 0.045; return (x) => { const n = rnd() * 2 - 1; return Math.exp(-x / (d / 4)) * n * Math.min(1, x * 3000); }; }
function snare(x) { const n = rnd() * 2 - 1; return (Math.exp(-x * 18) * n * 0.8 + Math.exp(-x * 25) * Math.sin(6.2832 * 190 * x) * 0.5) * Math.min(1, x * 2000); }

const CH = { Am: [57, 60, 64], F: [53, 57, 60], C: [60, 64, 67], G: [55, 59, 62] };
const PROG = ['Am', 'F', 'C', 'G'];
const nbars = Math.ceil(DUR / bar);
for (let b = 0; b < nbars; b++) {
  const st = b * bar; if (st >= DUR - 0.5) break;
  const name = PROG[b % 4], notes = CH[name];
  const intro = st < bar * 2, full = st >= bar * 4;
  add(st, bar + 0.6, 0, intro ? 0.11 : 0.15, pad(notes.map((n) => hz(n)), bar + 0.6));
  // bass: root on 1 and 2&, fifth on 3, root on 4
  const root = notes[0] - 24, fifth = root + 7;
  for (const [off, n] of [[0, root], [1.5, root], [2, fifth], [3, root], [3.5, root]]) {
    if (intro && off > 0) continue;
    add(st + off * beat, beat * 0.9, 0, 0.28, bass(hz(n), beat * 0.9));
  }
  // drums
  for (let q = 0; q < 8; q++) {
    const tq = st + q * beat / 2;
    if (!intro) add(tq, 0.2, 0.25, (q % 2 ? 0.07 : 0.1), hat(q === 7));
    if (full && (q === 0 || q === 4 || q === 7)) add(tq, 0.3, 0, 0.3, kick);
    else if (!intro && (q === 0 || q === 4)) add(tq, 0.3, 0, 0.2, kick);
    if (full && (q === 2 || q === 6)) add(tq, 0.25, -0.1, 0.13, snare);
  }
  // pluck arpeggio, 8ths, octave up
  const arp = [0, 1, 2, 1, 2, 0, 1, 2];
  const dens = st < bar * 2 ? 2 : st < bar * 4 ? 4 : 8;
  for (let k = 0; k < dens; k++) {
    const n = notes[arp[k % 8]] + 12 + (k === 7 ? 12 : 0);
    add(st + k * bar / dens, 0.7, Math.sin(k * 1.3) * 0.5, 0.17, pluck(hz(n), 0.7));
  }
  // simple top melody every second bar once the groove is full
  if (full && b % 2 === 0) {
    const mel = name === 'Am' ? [76, 72, 74, 72] : name === 'F' ? [72, 69, 72, 74] : name === 'C' ? [76, 79, 76, 74] : [74, 71, 74, 76];
    mel.forEach((n, k) => add(st + k * beat + beat * 0.5, 1.1, 0.15, 0.14, pluck(hz(n), 1.1)));
  }
}

// stereo ping-pong delay (dotted 8th) + gentle fade-in; normalize to 0.5 peak
const d = Math.floor(beat * 0.75 * SR);
for (let i = d; i < N; i++) { L[i] += R[i - d] * 0.22; R[i] += L[i - d] * 0.22; }

// ---------- sound effects (added after the delay so they stay dry and on the frame) ----------
let lp1 = 0, lp2 = 0;
const noise = () => rnd() * 2 - 1;
function rainNoise(x) { lp1 += 0.08 * (noise() - lp1); return lp1 * 2.2 * (0.8 + 0.2 * Math.sin(x * 7)); }
add(7.0, 4.0, 0, 0.16, (x) => Math.min(1, x / 0.5) * Math.min(1, (4 - x) / 0.6) * rainNoise(x));
add(8.88, 2.2, 0, 0.55, (x) => { lp2 += 0.02 * (noise() - lp2); return Math.exp(-x * 1.6) * (lp2 * 6 + 0.4 * Math.sin(6.2832 * 42 * x) * Math.exp(-x * 4)) * Math.min(1, x * 200); });
function bell(f) { return (x) => Math.exp(-x * 4) * (Math.sin(6.2832 * f * x) + 0.4 * Math.sin(6.2832 * f * 2.76 * x) * Math.exp(-x * 6)) * Math.min(1, x * 500); }
[[12.1, 88], [13.3, 91], [14.4, 95], [15.6, 88]].forEach(([t, m]) => add(t, 1.2, 0, 0.18, bell(hz(m))));
[[16.75, 84], [16.85, 88], [16.95, 91]].forEach(([t, m]) => add(t, 0.9, 0.2, 0.14, bell(hz(m))));
for (let k = 0; k < 70; k++) { const t = 18.9 + rnd() * 1.8; add(t, 0.06, rnd() * 1.6 - 0.8, 0.12 * (1 - (t - 18.9) / 2.2), (x) => noise() * Math.exp(-x * 90)); }
function whoosh(d) { let l = 0; return (x) => { const p = x / d, a = 0.02 + 0.25 * Math.sin(Math.PI * p); l += a * (noise() - l); return l * Math.sin(Math.PI * p) * 3; }; }
add(25.25, 0.7, -0.3, 0.3, whoosh(0.7));
add(28.3, 0.05, 0, 0.3, (x) => Math.sin(6.2832 * 2200 * x) * Math.exp(-x * 120));
[28.5, 28.65, 28.8].forEach((t, i) => add(t, 0.25, i - 1, 0.18, (x) => Math.sin(6.2832 * (500 + 900 * x) * x * 3) * Math.exp(-x * 14)));
add(32.0, 0.9, 0, 0.22, whoosh(0.9));
for (let k = 0; k < 12; k++) add(32.6 + k * 0.05, 0.4, rnd() - 0.5, 0.06, bell(hz(96 + (k % 5) * 3)));
const fi = Math.floor(0.4 * SR);
for (let i = 0; i < fi; i++) { L[i] *= i / fi; R[i] *= i / fi; }
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.5 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4);
}
fs.writeFileSync(OUT, buf);
console.log(`${OUT} written: ${DUR}s, ${BPM} BPM, peak ${(0.5).toFixed(2)}`);
