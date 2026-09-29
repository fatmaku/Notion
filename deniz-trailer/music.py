"""Synthesizes a gentle music-box / pad score (C major, 90 bpm).
Usage: python3 music.py [duration] [out.wav] [chime times...] [finale start] (defaults: the 70 s trailer)."""
import sys
import numpy as np, wave
SR, BPM = 44100, 90
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 70.0
OUTFILE = sys.argv[2] if len(sys.argv) > 2 else 'music.wav'
CHIMES = [float(x) for x in sys.argv[3:-1]] if len(sys.argv) > 4 else [12.3, 19.8, 50.5, 64.6]
END = float(sys.argv[-1]) if len(sys.argv) > 4 else 64.6
beat = 60 / BPM
t = np.arange(int(SR * DUR)) / SR
out = np.zeros((len(t), 2))
N = lambda n: 440 * 2 ** ((n - 69) / 12)  # midi -> Hz

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(len(t), i + len(sig))
    if i >= len(t) or j <= i: return
    s = sig[: j - i] * gain
    out[i:j, 0] += s * (1 - pan) * .5 * 2 ** .5
    out[i:j, 1] += s * (1 + pan) * .5 * 2 ** .5

def musicbox(f, d=2.2):
    x = np.arange(int(d * SR)) / SR
    env = np.exp(-x * 3.2) * np.minimum(1, x * 400)
    return env * (np.sin(2*np.pi*f*x) + .35*np.sin(2*np.pi*2*f*x)*np.exp(-x*6) + .12*np.sin(2*np.pi*3.01*f*x)*np.exp(-x*9))

def pad(freqs, d):
    x = np.arange(int(d * SR)) / SR
    env = np.minimum(1, x / 1.2) * np.minimum(1, (d - x) / 1.2)
    s = sum(np.sin(2*np.pi*f*x) + .5*np.sin(2*np.pi*f*1.004*x) + .5*np.sin(2*np.pi*f*.996*x) for f in freqs)
    return env * s / len(freqs)

def bass(f, d):
    x = np.arange(int(d * SR)) / SR
    return np.exp(-x * 1.5) * np.minimum(1, x * 200) * (np.sin(2*np.pi*f*x) + .2*np.sin(2*np.pi*2*f*x))

def chime(start):  # rising sparkle glissando for butterfly moments
    for k, n in enumerate([84, 88, 91, 96, 100, 103]):
        add(musicbox(N(n), 1.6), start + k * .07, pan=-.6 + k * .24, gain=.18)

CH = {'C': [60, 64, 67], 'Am': [57, 60, 64], 'F': [53, 57, 60], 'G': [55, 59, 62], 'Em': [52, 55, 59]}
prog = ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G']
bar = 4 * beat
nbars = int(np.ceil(DUR / bar))
for b in range(nbars):
    st = b * bar
    if st > DUR - 3: break
    c = 'C' if st >= END else prog[b % len(prog)]
    notes = CH[c]
    add(pad([N(n) for n in notes], bar + 1.2), st, gain=.16 if st < 22 else .2)
    add(bass(N(notes[0] - 12), bar), st, gain=.22 if st >= 6 else .1)
    # music-box arpeggio: sparse at start, busier in the montage, calm at the end
    dens = 2 if st < 12 else 4 if st < 22 else 8 if st < END - 14 else 4
    pattern = [0, 1, 2, 1, 2, 0, 1, 2]
    for k in range(dens):
        n = notes[pattern[k % 8]] + 12 + (12 if (k % 4 == 3 and st >= 22) else 0)
        add(musicbox(N(n)), st + k * bar / dens, pan=np.sin(k) * .4, gain=.2)
    if END - 14 <= st < END:  # melody over the finale
        for k, n in enumerate([76, 74, 72, 67] if b % 2 else [72, 74, 76, 79]):
            add(musicbox(N(n), 2.6), st + k * beat, gain=.24)
for s in CHIMES: chime(s)
add(musicbox(N(72), 5) + musicbox(N(76), 5) + musicbox(N(79), 5) + musicbox(N(84), 5), END, gain=.2)

# simple stereo reverb (feedback delays), fade in/out, normalize
rev = out.copy()
for d, g in [(.043, .35), (.071, .3), (.113, .25), (.167, .2), (.251, .15)]:
    k = int(d * SR); rev[k:] += out[:-k][:, ::-1] * g
rev[:int(1.5*SR)] *= np.linspace(0, 1, int(1.5*SR))[:, None]
fo = int(3 * SR); rev[-fo:] *= np.linspace(1, 0, fo)[:, None]
rev /= np.max(np.abs(rev)) / .8
with wave.open(OUTFILE, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((rev * 32767).astype('<i2').tobytes())
print(OUTFILE, 'written')
