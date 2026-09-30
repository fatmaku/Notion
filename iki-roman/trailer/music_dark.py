#!/usr/bin/env python3
"""Dark cinematic PLACEHOLDER score for the İki Roman trailer (numpy only, 44.1 kHz stereo 16-bit WAV).

This is a stand-in for licensed music: a low drone (55/110 Hz, slowly detuned), a filtered minor pad,
a sub-pulse every 2 s that grows towards the impact, metallic knocks (noise bursts through a resonant
band-pass around 1.8-2.5 kHz), a swell into the impact, a deep hit with a long tail, a calm pad to the end
and a 2 s fade-out. Peaks stay <= -1 dBFS.

Usage:
  python3 music_dark.py --dur 60 --knocks 1.0,1.8,2.6,34.0,34.8,35.6 --impact 47.0 --end 53.0 --out music_60.wav
  python3 music_dark.py --dur 30 --knocks 0.7,1.3,1.9,17.0,17.6,18.2 --impact 23.0 --end 26.0 --out music_30.wav
"""
import argparse
import wave
import numpy as np

SR = 44100
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--dur', type=float, default=60.0, help='length in seconds')
ap.add_argument('--knocks', default='1.0,1.8,2.6,34.0,34.8,35.6', help='comma-separated knock times (s)')
ap.add_argument('--impact', type=float, default=47.0, help='fist-bump impact time (s)')
ap.add_argument('--end', type=float, default=53.0, help='start of the calm outro / end card (s)')
ap.add_argument('--out', default='music_60.wav')
ap.add_argument('--seed', type=int, default=1453)
A = ap.parse_args()
KNOCKS = [float(x) for x in A.knocks.split(',') if x.strip()]
rng = np.random.default_rng(A.seed)
N = int(A.dur * SR)
t = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)


def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - pan) * .7071
    R[i:j] += s * (1 + pan) * .7071


def fftfilt(x, lo=None, hi=None, slope=2.0):
    """Static Butterworth-like band-pass between lo and hi Hz, applied in the frequency domain."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    return np.fft.irfft(X * g, n=len(x))


def glide(f_of_x):
    """Sine with time-varying frequency (array of Hz)."""
    return np.sin(2 * np.pi * np.cumsum(f_of_x) / SR)


def midi(n): return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- drone: 55 / 110 Hz, slow detune
det = 0.35 * np.sin(2 * np.pi * 0.05 * t) + 0.15 * np.sin(2 * np.pi * 0.013 * t)
drone = 0.55 * glide(55 + det) + 0.35 * glide(110 - 1.3 * det) + 0.12 * glide(165 + det) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t))
drone = fftfilt(drone, hi=240)
drone_env = np.minimum(1, t / 3.0) * np.where(t < A.impact, 1.0, 0.7)
add(drone * drone_env, 0, pan=-.05, gain=.30)
add(drone * drone_env * np.roll(np.ones(N), 7), 0, pan=.05, gain=.05)

# ---------------------------------------------------------------- minor pad (A minor family), filtered, 8 s chords
CHORDS = [[45, 48, 52, 57], [41, 45, 48, 52], [38, 41, 45, 50], [40, 44, 47, 52]]  # Am, F, Dm, E
CALM = [45, 48, 52, 57, 64]                                                         # Am(add9-ish) for the outro
seg = 8.0


def pad_note(f, dur, chan_det):
    x = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(x)
    for k in range(1, 7):                                  # saw-ish partials, gently detuned per channel
        s += np.sin(2 * np.pi * f * k * (1 + chan_det) * x + rng.uniform(0, 6.28)) / k
        s += 0.5 * np.sin(2 * np.pi * f * k * (1 - chan_det * 0.6) * x + rng.uniform(0, 6.28)) / k
    env = np.minimum(1, x / 1.6) * np.minimum(1, (dur - x) / 1.6)
    return fftfilt(s * env, hi=620, slope=1.5)


k = 0
st = 0.0
while st < A.dur - 1:
    chord = CALM if st >= A.end - 0.5 else CHORDS[k % len(CHORDS)]
    d = min(seg + 1.6, A.dur - st)
    build = min(1.0, st / max(A.impact, 1))               # crescendo towards the impact
    g = (0.05 + 0.09 * build) if st < A.impact else 0.07
    for n in chord:
        f = midi(n)
        i = int(st * SR); j = min(N, i + int(d * SR))
        L[i:j] += pad_note(f, d, 0.0025)[: j - i] * g / len(chord)
        R[i:j] += pad_note(f, d, -0.0025)[: j - i] * g / len(chord)
    st += seg; k += 1

# ---------------------------------------------------------------- sub-pulse every 2 s, growing towards the impact
pulse_t = 0.0
while pulse_t < A.impact - 0.4:
    n = int(0.8 * SR); x = np.arange(n) / SR
    f = 42 + 12 * np.exp(-x * 18)
    pulse = glide(f) * np.minimum(1, x * 300) * np.exp(-x * 5.5)
    g = 0.10 + 0.55 * (pulse_t / A.impact) ** 2
    add(pulse, pulse_t, gain=g)
    pulse_t += 2.0


# ---------------------------------------------------------------- metallic knocks
def knock():
    n = int(0.7 * SR); x = np.arange(n) / SR
    burst = rng.standard_normal(n) * np.exp(-x * 70)                 # ~15 ms noise burst
    body = fftfilt(burst, lo=1600, hi=2600, slope=3)                  # resonant band 1.8-2.5 kHz
    ring = sum(np.sin(2 * np.pi * f * x + rng.uniform(0, 6.28)) * np.exp(-x * d) * a
               for f, d, a in [(1850, 13, .5), (2210, 10, .42), (2480, 15, .3), (3110, 22, .14), (740, 20, .22)])
    thud = glide(85 - 35 * np.minimum(x / 0.08, 1)) * np.exp(-x * 30)
    k = body * 2.6 + ring * .9 + thud * .8
    return k / np.max(np.abs(k))


for i, kt in enumerate(KNOCKS):
    add(knock(), kt, pan=[-.12, 0, .12][i % 3], gain=.72)

# ---------------------------------------------------------------- swell into the impact (rising filtered noise + riser)
SW = 7.0
if A.impact > SW + 1:
    n = int(SW * SR); x = np.arange(n) / SR; p = x / SW
    noise = rng.standard_normal(n)
    sw = np.zeros(n)
    for lo, hi, start, g in [(70, 260, 0.0, 1.0), (260, 800, 0.15, 0.8), (800, 2400, 0.35, 0.6), (2400, 7000, 0.55, 0.4)]:
        e = np.clip((p - start) / (1 - start), 0, 1) ** 2.2
        sw += fftfilt(noise, lo=lo, hi=hi) * e * g
    sw *= p ** 1.4
    riser = glide(110 * 2 ** (p * 2.0)) * p ** 3 * 0.35 + glide(55 * 2 ** (p * 2.0)) * p ** 3 * 0.2
    add(sw, A.impact - SW, gain=.28)
    add(riser, A.impact - SW, gain=.35)

# ---------------------------------------------------------------- impact hit with a long tail
n = int(min(7.0, A.dur - A.impact) * SR); x = np.arange(n) / SR
hit = glide(36 + 100 * np.exp(-x * 8)) * np.exp(-x * 1.1)
boom = fftfilt(rng.standard_normal(n), hi=170) * np.exp(-x * 3.2) * 1.6
crack = fftfilt(rng.standard_normal(n), lo=700, hi=6000) * np.exp(-x * 16) * 0.6
tail = fftfilt(rng.standard_normal(n), lo=180, hi=2600) * np.exp(-x * 0.85) * 0.32
shimmer = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * 0.7) for f in [880, 1108.7, 1318.5, 1760]) * 0.05
impact = (hit + boom + crack + tail + shimmer) * np.minimum(1, x * 400)
add(impact, A.impact, gain=.95)

# ---------------------------------------------------------------- master: pre-impact dip, outro level, reverb, fade, soft limit
master = np.ones(N)
dip = (t > A.impact - 0.28) & (t < A.impact - 0.02)
master[dip] = 0.2 + 0.8 * ((A.impact - 0.02 - t[dip]) / 0.26) ** 2
master *= np.where(t < A.end, 1.0, 0.85)
fo = int(2.0 * SR); master[-fo:] *= np.linspace(1, 0, fo) ** 1.5
fi = int(0.4 * SR); master[:fi] *= np.linspace(0, 1, fi)
L *= master; R *= master

# simple stereo reverb: feedback-free multi-tap delays with channel crossing
mix = np.stack([L, R], 1)
rev = mix.copy()
for d, g in [(.037, .30), (.061, .26), (.097, .22), (.151, .18), (.233, .14), (.311, .10)]:
    kk = int(d * SR); rev[kk:] += mix[:-kk][:, ::-1] * g
rev *= master[:, None] ** 0.5

# soft limiter (tanh knee) then normalise to -1 dBFS
peak = np.max(np.abs(rev))
rev = np.tanh(rev / (peak * 0.55)) * (peak * 0.55)
rev *= 10 ** (-1 / 20) / np.max(np.abs(rev))

with wave.open(A.out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((rev * 32767).astype('<i2').tobytes())
print(f'{A.out}: {A.dur:.0f} s, knocks at {KNOCKS}, impact {A.impact} s, outro from {A.end} s, peak {20*np.log10(np.max(np.abs(rev))):.2f} dBFS  (placeholder score)')
