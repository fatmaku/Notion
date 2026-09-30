"""Telifsiz, sentezlenmiş arka plan müziği (numpy). Üç ruh hali: sakin, enerjik, duygusal."""
import wave
from pathlib import Path

import numpy as np

SR = 44100
MOODS = {
    "sakin": {"bpm": 84, "prog": ["C", "Am", "F", "G"], "octave": 0},
    "enerjik": {"bpm": 118, "prog": ["Am", "F", "C", "G"], "octave": 0},
    "duygusal": {"bpm": 68, "prog": ["Em", "C", "G", "D"], "octave": -1},
}
CHORDS = {"C": [60, 64, 67], "Am": [57, 60, 64], "F": [53, 57, 60], "G": [55, 59, 62], "Em": [52, 55, 59], "D": [50, 54, 57]}


def _hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def _t(d):
    return np.arange(int(d * SR)) / SR


def musicbox(f, d=2.0):
    x = _t(d)
    env = np.exp(-x * 3.0) * np.minimum(1, x * 400)
    return env * (np.sin(2 * np.pi * f * x) + .35 * np.sin(4 * np.pi * f * x) * np.exp(-x * 6) + .1 * np.sin(6.02 * np.pi * f * x) * np.exp(-x * 9))


def pluck(f, d=0.5):
    x = _t(d)
    env = np.exp(-x * 7) * np.minimum(1, x * 800)
    return env * (np.sin(2 * np.pi * f * x) + .5 * np.sin(4 * np.pi * f * x) + .25 * np.sin(6 * np.pi * f * x) + .12 * np.sin(8 * np.pi * f * x))


def piano(f, d=2.5):
    x = _t(d)
    env = np.exp(-x * 1.6) * np.minimum(1, x * 300)
    return env * (np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x) * np.exp(-x * 2) + .15 * np.sin(6 * np.pi * f * x) * np.exp(-x * 4))


def pad(freqs, d):
    x = _t(d)
    env = np.minimum(1, x / 1.0) * np.minimum(1, np.maximum(0, (d - x) / 1.0))
    s = sum(np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 1.004 * x) + .5 * np.sin(2 * np.pi * f * .996 * x) for f in freqs)
    return env * s / (2 * len(freqs))


def bass(f, d):
    x = _t(d)
    return np.exp(-x * 2.0) * np.minimum(1, x * 200) * (np.sin(2 * np.pi * f * x) + .25 * np.sin(4 * np.pi * f * x))


def kick(d=0.35):
    x = _t(d)
    f = 120 * np.exp(-x * 18) + 45
    return np.exp(-x * 9) * np.sin(2 * np.pi * np.cumsum(f) / SR)


def hat(d=0.08, seed=0):
    x = _t(d)
    rng = np.random.default_rng(seed)
    return np.exp(-x * 60) * rng.uniform(-1, 1, len(x)) * 0.5


def synth(mood="sakin", duration=30.0, out=None, seed=1):
    """WAV üretir ve yolunu döndürür."""
    mood = mood if mood in MOODS else "sakin"
    cfg = MOODS[mood]
    beat = 60 / cfg["bpm"]
    bar = 4 * beat
    n = int(SR * (duration + 3))
    out_l, out_r = np.zeros(n), np.zeros(n)
    rng = np.random.default_rng(seed)

    def add(sig, start, pan=0.0, gain=1.0):
        i = int(start * SR)
        j = min(n, i + len(sig))
        if i >= n or j <= i:
            return
        s = sig[: j - i] * gain
        out_l[i:j] += s * (1 - pan) * .7
        out_r[i:j] += s * (1 + pan) * .7

    nbars = int(np.ceil(duration / bar)) + 1
    for b in range(nbars):
        st = b * bar
        if st > duration + 0.5:
            break
        notes = [x + 12 * cfg["octave"] for x in CHORDS[cfg["prog"][b % len(cfg["prog"])]]]
        if mood == "sakin":
            add(pad([_hz(x) for x in notes], bar + 1.0), st, gain=.18)
            add(bass(_hz(notes[0] - 12), bar), st, gain=.18)
            dens = 4 if b % 4 < 2 else 8
            for k in range(dens):
                nn = notes[[0, 1, 2, 1, 2, 0, 1, 2][k % 8]] + 12 + (12 if k % 4 == 3 else 0)
                add(musicbox(_hz(nn)), st + k * bar / dens, pan=np.sin(k) * .4, gain=.2)
        elif mood == "enerjik":
            add(pad([_hz(x) for x in notes], bar + .3), st, gain=.1)
            for k in range(4):
                add(kick(), st + k * beat, gain=.8)
                add(hat(seed=b * 8 + k), st + k * beat + beat / 2, pan=.3, gain=.35)
            for k in range(8):
                add(bass(_hz(notes[0] - 12 + (12 if k % 4 == 3 else 0)), beat / 2), st + k * beat / 2, gain=.32)
            pattern = [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2]
            for k in range(16):
                nn = notes[pattern[k]] + 12 + (12 if (k % 8 == 6) else 0)
                add(pluck(_hz(nn), beat / 2), st + k * beat / 4, pan=(-.5 + (k % 4) / 3), gain=.22)
        else:  # duygusal
            add(pad([_hz(x) for x in notes], bar + 1.5), st, gain=.14)
            for k, off in enumerate([0, beat, 2 * beat, 3 * beat]):
                nn = notes[[0, 2, 1, 2][k]] + (0 if k else -12)
                add(piano(_hz(nn), 3.0), st + off, pan=-.3 + k * .2, gain=.24)
            if b % 2 == 1:
                mel = [notes[2] + 12, notes[1] + 12, notes[0] + 12, notes[2] + 12]
                for k, nn in enumerate(mel):
                    add(piano(_hz(nn), 2.0), st + k * beat + beat / 2, pan=.2, gain=.16)
    mix = np.stack([out_l, out_r], axis=1)[: int(SR * duration)]
    # sonda 2.5 sn kapanış, başta 0.5 sn açılış
    x = np.arange(len(mix)) / SR
    env = np.minimum(1, x / 0.5) * np.minimum(1, np.maximum(0, (duration - x) / 2.5))
    mix = mix * env[:, None]
    peak = np.abs(mix).max() or 1.0
    mix = mix / peak * 0.85
    out = Path(out) if out else Path(f"muzik-{mood}-{int(duration)}s.wav")
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    return out
