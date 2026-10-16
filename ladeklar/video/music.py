#!/usr/bin/env python3
"""Soundtrack + sound design for the Ladeklar trailer, synthesized (no third-party audio, no licence issues).
   python3 video/music.py  ->  video/music-72.wav (16:9 master) and video/music-30.wav (9:16 short)
Part 1: ticking clock, dissonant drone, phones, message pings, paper, wind, stamp – rising tension.
Hard stop, one beat of silence. Part 2: bright D major at 104 BPM – piano arpeggios, pad, soft drums,
and UI sounds (taps, success chimes, camera, push) exactly on the picture's cues."""
import numpy as np, wave, os

SR = 44100
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))


def env_adsr(n, a=0.01, d=0.1, s=0.6, r=0.2):
    t = np.arange(n) / SR
    dur = n / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-4)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-4)
    rel = t > dur - r
    e[rel] *= np.clip((dur - t[rel]) / max(r, 1e-4), 0, 1)
    return e


def lowpass(x, cutoff):
    # one-pole low-pass (vectorised via lfilter-like cumulative approach)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    b = 1 - a
    for i in range(0, len(x), 4096):
        seg = x[i:i + 4096]
        out = np.empty_like(seg)
        for j, v in enumerate(seg):
            acc = b * v + a * acc
            out[j] = acc
        y[i:i + 4096] = out
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


class Track:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n or i + len(sig) <= 0:
            return
        s = sig
        if i < 0:
            s = s[-i:]
            i = 0
        s = s[: self.n - i]
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(s)] += s * gain * l * 1.414
        self.R[i:i + len(s)] += s * gain * r * 1.414


def tone(f, dur, harm=(1, .5, .25, .12), decay=3.0, a=0.005):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t) for k, h in enumerate(harm))
    e = np.minimum(1, t / a) * np.exp(-t * decay)
    return s * e / sum(harm)


def piano(f, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + 0.2 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 5) + 0.08 * np.sin(2 * np.pi * 4.02 * f * t) * np.exp(-t * 7))
    e = np.minimum(1, t / 0.004) * np.exp(-t * 2.2)
    return s * e * 0.5


def pad(freqs, dur, a=0.8, r=1.0, bright=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * (2 ** (det / 12))
            s += np.sin(2 * np.pi * ff * t + rng.random() * 6) + bright * np.sin(2 * np.pi * 2 * ff * t)
    s /= len(freqs) * 3
    return s * env_adsr(n, a, 0.3, 0.85, r)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def click(dur=0.012, f=4000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.5 + np.sin(2 * np.pi * f * t)) * np.exp(-t * 600)


def tick():
    s = highpass(noise(0.02), 3000) * np.exp(-np.arange(int(0.02 * SR)) / SR * 300)
    return s * 0.9


def kick(dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 110 * np.exp(-t * 18) + 42
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9)


def snare(dur=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (highpass(noise(dur), 1200) * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 18)


def hat(dur=0.06):
    n = int(dur * SR)
    return highpass(noise(dur), 6000) * np.exp(-np.arange(n) / SR * 70)


def ring(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * (np.sin(2 * np.pi * 20 * t) > 0)
    return s * env_adsr(n, 0.01, 0.05, 0.8, 0.08) * 0.35


def buzz(dur=0.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.3 + np.sin(2 * np.pi * 75 * t)
    return lowpass(s, 400) * env_adsr(n, 0.02, 0.05, 0.9, 0.05) * 0.6


def ping(hi=1.0):
    return np.concatenate([tone(988 * hi, 0.12, decay=18), tone(1319 * hi, 0.25, decay=14)]) * 0.35


def chime(high=False):
    notes = [1175, 1568, 2349] if not high else [880, 1175]
    out = np.zeros(int(0.9 * SR))
    for i, f in enumerate(notes):
        s = tone(f, 0.7, harm=(1, .3, .1), decay=6)
        out[int(i * 0.07 * SR):int(i * 0.07 * SR) + len(s)] += s
    return out * 0.32


def success():
    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate([1175, 1480, 1760, 2349]):
        s = tone(f, 0.9, harm=(1, .25), decay=4.5)
        out[int(i * 0.05 * SR):int(i * 0.05 * SR) + len(s)] += s
    return out * 0.22


def shutter():
    a = highpass(noise(0.05), 2500) * np.exp(-np.arange(int(0.05 * SR)) / SR * 90)
    b = highpass(noise(0.07), 1800) * np.exp(-np.arange(int(0.07 * SR)) / SR * 60)
    out = np.zeros(int(0.2 * SR))
    out[:len(a)] += a
    out[int(0.08 * SR):int(0.08 * SR) + len(b)] += b
    return out * 0.8


def rustle(dur=0.6):
    s = highpass(noise(dur), 1500) * (np.abs(np.sin(np.linspace(0, 9, int(dur * SR)))) ** 2)
    return s * env_adsr(len(s), 0.05, 0.1, 0.8, 0.2) * 0.35


def whoosh(dur=1.2, up=True):
    n = int(dur * SR)
    x = noise(dur)
    out = np.zeros(n)
    steps = 24
    for k in range(steps):
        c = 300 + (k / steps if up else 1 - k / steps) * 3500
        seg = slice(k * n // steps, (k + 1) * n // steps)
        out[seg] = lowpass(x[seg], c)
    return out * np.sin(np.linspace(0, np.pi, n)) * 0.6


def thump():
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 30)) * t) * np.exp(-t * 7) + lowpass(noise(0.6), 900) * np.exp(-t * 14) * 0.6) * 0.9


def drone(dur, f1=110, f2=116.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f1 * t) + 0.6 * np.sin(2 * np.pi * f2 * t) + 0.3 * np.sin(2 * np.pi * f1 * 1.5 * t + 1)) / 1.9
    s += 0.15 * lowpass(noise(dur), 300)
    return s * np.linspace(0.15, 1, n) ** 1.6


def reverb(x, mix=0.25):
    out = x.copy()
    for d, g in ((0.031, .5), (0.047, .42), (0.071, .36), (0.103, .3), (0.149, .24), (0.211, .18), (0.297, .13)):
        k = int(d * SR)
        out[k:] += x[:-k] * g * mix
    return out


NOTE = {'D': 146.83, 'E': 164.81, 'F#': 185.0, 'G': 196.0, 'A': 220.0, 'B': 246.94, 'C#': 277.18}


def build(dur, chaos_end, bright_start, cues, out_name):
    tr = Track(dur)
    # ---------- part 1 ----------
    tr.add(0.0, drone(chaos_end), 0.22)
    t = 0.2
    while t < chaos_end - 0.05:
        k = t / chaos_end
        tr.add(t, tick(), 0.35 + 0.25 * k, pan=0.3 if int(t * 4) % 2 else -0.3)
        t += 0.5 - 0.27 * k
    beat = 60 / 92
    t = cues.get('pulse', 4.0)
    while t < chaos_end - 0.2:
        tr.add(t, kick(), 0.25 + 0.3 * t / chaos_end)
        t += beat
    tr.add(chaos_end - 3.2, whoosh(3.2, True), 0.5)
    for a in cues.get('buzz', []):
        tr.add(a, buzz(), 0.55)
    for a in cues.get('rings', []):
        tr.add(a, ring(0.9), 0.45, pan=rng.uniform(-.6, .6))
    for a in cues.get('pings', []):
        tr.add(a, ping(rng.choice([0.9, 1.0, 1.12])), 0.6, pan=rng.uniform(-.5, .5))
    for a in cues.get('rustle', []):
        tr.add(a, rustle(), 0.8, pan=rng.uniform(-.4, .4))
    for a in cues.get('wind', []):
        tr.add(a, whoosh(2.2, False), 0.7)
    for a in cues.get('flip', []):
        tr.add(a, rustle(0.18), 0.6)
    for a in cues.get('stampOpen', []):
        tr.add(a, thump(), 1.0)
    # hard stop: silence until bright_start
    i0, i1 = int(chaos_end * SR), int(bright_start * SR)
    fade = int(0.04 * SR)
    for ch in (tr.L, tr.R):
        ch[i0 - fade:i0] *= np.linspace(1, 0, fade)
        ch[i0:i1] = 0
    # ---------- part 2 ----------
    bpm = 104
    b = 60 / bpm
    prog = [('D', ['D', 'F#', 'A']), ('A', ['A', 'C#', 'E']), ('B', ['B', 'D', 'F#']), ('G', ['G', 'B', 'D'])]
    tr.add(bright_start, pad([NOTE['D'] * 2, NOTE['F#'] * 2, NOTE['A'] * 2, NOTE['D'] * 4], 3.0, a=0.05, r=2.0, bright=0.4), 0.35)
    tr.add(bright_start, whoosh(1.0, False), 0.25)
    music_start = bright_start + 0.9
    end = dur
    t = music_start
    bar = 0
    while t < end - 1.5:
        root, ch = prog[bar % 4]
        freqs = [NOTE[n] * 2 for n in ch]
        tr.add(t, pad(freqs, 4 * b + 0.6, a=0.4, r=0.6, bright=0.2), 0.16)
        tr.add(t, tone(NOTE[root] / 2, 4 * b, harm=(1, .4, .15), decay=0.7, a=0.02), 0.32)
        arp = [freqs[0] * 2, freqs[1] * 2, freqs[2] * 2, freqs[1] * 2, freqs[0] * 4, freqs[2] * 2, freqs[1] * 2, freqs[2] * 2]
        for k, f in enumerate(arp):
            tt = t + k * b / 2
            if tt < end - 1.2:
                tr.add(tt, piano(f, 1.2), 0.17 if k % 2 == 0 else 0.11, pan=-0.25 if k % 2 else 0.25)
        drums_from = music_start + 4 * b
        for k in range(4):
            tt = t + k * b
            if tt >= drums_from and tt < end - 2.5:
                if k in (0, 2):
                    tr.add(tt, kick(), 0.42)
                else:
                    tr.add(tt, snare(), 0.18)
                tr.add(tt + b / 2, hat(), 0.07, pan=0.3)
                tr.add(tt, hat(), 0.05, pan=-0.3)
        t += 4 * b
        bar += 1
    # final chord
    tr.add(end - 5.0, pad([NOTE['D'] * 2, NOTE['A'] * 2, NOTE['D'] * 4, NOTE['F#'] * 4], 5.0, a=0.3, r=2.5, bright=0.3), 0.32)
    tr.add(end - 5.0, tone(NOTE['D'] / 2, 5.0, harm=(1, .3), decay=0.5), 0.3)
    # ---------- UI sounds ----------
    for a in cues.get('taps', []):
        tr.add(a, click(), 0.55)
    for a in cues.get('oks', []):
        tr.add(a, success(), 0.85)
    for a in cues.get('shutter', []):
        tr.add(a, shutter(), 0.9)
    for a in cues.get('push', []):
        tr.add(a, chime(), 0.8)
    for a in cues.get('langclick', []):
        tr.add(a, click(0.01, 2500), 0.35)
    for a in cues.get('stampOk', []):
        tr.add(a, thump(), 0.7)
    for a in cues.get('swoosh', []):
        tr.add(a, whoosh(0.7, True), 0.35)
    for a in cues.get('count', []):
        for k in range(10):
            tr.add(a + k * 0.07, click(0.008, 3200), 0.12)
    if cues.get('lastchime'):
        tr.add(cues['lastchime'], chime(), 0.7)
    # master: reverb, gentle limiter, fade
    L = reverb(tr.L, 0.35)
    R = reverb(tr.R, 0.35)
    peak = max(np.abs(L).max(), np.abs(R).max())
    L, R = np.tanh(L / peak * 1.4) * 0.89, np.tanh(R / peak * 1.4) * 0.89
    f = int(1.6 * SR)
    L[-f:] *= np.linspace(1, 0, f)
    R[-f:] *= np.linspace(1, 0, f)
    data = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
    with wave.open(os.path.join(HERE, out_name), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print('wrote', out_name, f'{dur:.1f} s')


# cue times match video/trailer.html (T / D tables)
D72 = dict(in_=30.0, tap1=31.6, ok1=31.75, tap2=34.6, ok2=34.75, tap3=38.5, ok3=38.65, tap4=40.0, flash=41.0, tap5=42.2, ok5=42.35)
build(72.0, 27.15, 28.0, {
    'pulse': 9.0,
    'buzz': [0.7, 1.9, 3.1],
    'rings': [4.6, 5.3, 6.0, 6.5, 7.1, 7.6, 8.1, 8.5],
    'pings': [9.05 + 0.15 + i * 0.36 for i in range(12)],
    'rustle': [14.3, 14.9, 15.4, 15.9, 16.4],
    'flip': [20.3 + i * 0.44 for i in range(5)],
    'wind': [19.9],
    'stampOpen': [25.05],
    'taps': [D72['tap1'], D72['tap2'], D72['tap3'], D72['tap4'], D72['tap5']],
    'oks': [D72['ok1'], D72['ok2'], D72['ok3'], D72['ok5']],
    'shutter': [D72['flash']],
    'push': [43.5, 44.4],
    'langclick': [48.2 + 0.2 + i * (4.2 - 0.5) / 8 for i in range(8)],
    'stampOk': [54.45],
    'count': [57.4, 58.3, 59.2],
    'swoosh': [63.6, 64.4, 65.2],
    'lastchime': 70.2,
}, 'music-72.wav')

D30 = dict(tap1=12.0, ok1=12.15, tap2=13.6, ok2=13.75, tap3=15.0, ok3=15.15, tap4=15.9, flash=16.4, tap5=16.8, ok5=16.95)
build(30.0, 9.0, 9.35, {
    'pulse': 1.0,
    'buzz': [0.4],
    'rings': [1.3, 1.7, 2.1, 2.5],
    'pings': [3.0 + 0.15 + i * 0.26 for i in range(12)],
    'wind': [7.2],
    'flip': [7.6 + i * 0.22 for i in range(5)],
    'taps': [D30['tap1'], D30['tap2'], D30['tap3'], D30['tap4'], D30['tap5']],
    'oks': [D30['ok1'], D30['ok2'], D30['ok3'], D30['ok5']],
    'shutter': [D30['flash']],
    'push': [17.5, 18.4],
    'langclick': [21.2 + 0.2 + i * (3.2 - 0.5) / 8 for i in range(8)],
    'stampOk': [26.45],
    'lastchime': 29.0,
}, 'music-30.wav')
