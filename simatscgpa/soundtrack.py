"""Synthesize the 24 s soundtrack: a soft pad + pulse bed with SFX placed on the
timeline events in index.html. Writes out/soundtrack.wav (48 kHz stereo)."""
import os, wave
import numpy as np

SR, DUR = 48000, 24.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

def hz(m): return 440 * 2 ** ((m - 69) / 12)
def env(n, a, r):
    e = np.ones(n); a, r = int(a * SR), int(r * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e
def add(at, sig, gain=1.0, pan=0.0):
    i = int(at * SR); sig = sig[: max(0, N - i)]
    L[i:i + len(sig)] += sig * gain * (1 - pan) ** .5
    R[i:i + len(sig)] += sig * gain * (1 + pan) ** .5
def lowpass(x, a):  # one-pole, a in (0,1): smaller = darker
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y

# Pad: four chords, detuned saws softened through a low-pass.
chords = [(0, [57, 60, 64, 71]), (6, [53, 57, 60, 64]), (12, [48, 55, 60, 64]), (18, [55, 59, 62, 67])]
for k, (start, notes) in enumerate(chords):
    n = int(6.4 * SR); tt = np.arange(n) / SR; sig = np.zeros(n)
    for m in notes:
        for d in (-.07, .07):
            ph = (hz(m + d) * tt) % 1.0
            sig += (2 * ph - 1) * .5 + np.sin(2 * np.pi * hz(m + d) * tt)
    sig = lowpass(sig / 16, .045) * env(n, 1.4, 1.6)
    add(start, sig, .55)

# Sub pulse on every beat (100 bpm) from the problem scene on.
beat = 60 / 100
for b in np.arange(3.7, 23.4, beat):
    n = int(.35 * SR); tt = np.arange(n) / SR
    f = 55 * (1 + .6 * np.exp(-tt * 30))
    add(b, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9), .32)

def whoosh(at, length=.55, gain=.35):
    n = int(length * SR); x = rng.standard_normal(n)
    cut = np.linspace(.01, .25, n) ** 1.5
    y = np.empty(n); s = 0.0
    for i in range(n): s += cut[i] * (x[i] - s); y[i] = s
    add(at - length * .8, y * np.sin(np.linspace(0, np.pi, n)) ** 2, gain)

def pluck(at, m, gain=.25, pan=0.0):
    n = int(.6 * SR); tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * hz(m) * tt) + .35 * np.sin(4 * np.pi * hz(m) * tt)) * np.exp(-tt * 7)
    add(at, s * env(n, .003, .05), gain, pan)

def click(at, gain=.5):
    n = int(.05 * SR); tt = np.arange(n) / SR
    add(at, (rng.standard_normal(n) * .5 + np.sin(2 * np.pi * 1800 * tt)) * np.exp(-tt * 140), gain)

def impact(at, gain=.6):
    n = int(1.6 * SR); tt = np.arange(n) / SR
    f = 45 * (1 + 2 * np.exp(-tt * 18))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3)
    air = lowpass(rng.standard_normal(n), .2) * np.exp(-tt * 6) * .4
    add(at, body + air, gain)

def shimmer(at, gain=.12):
    for i, m in enumerate([84, 88, 91, 96]): pluck(at + i * .05, m, gain, -.5 + i * .33)

def riser(at, length, gain=.25):
    n = int(length * SR); tt = np.arange(n) / SR
    f = 200 * 2 ** (tt / length * 3)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .3 + lowpass(rng.standard_normal(n), .08)
    add(at, tone * (tt / length) ** 2, gain)

# Scene 1
pluck(.3, 69, .22); pluck(.42, 76, .22); impact(.9, .45); shimmer(1.5)
# Transitions
for s in (3.7, 7.5, 13.4, 17.8, 20.7): whoosh(s)
# Scene 2: strikes, then the answer
for i in range(3): whoosh(5.0 + i * .18 + .25, .25, .18)
impact(6.3, .55)
# Scene 3: grade pops climb, cursor click
for i, m in enumerate([72, 76, 79, 84]): pluck(8.7 + i * .55, m, .28, -.4 + i * .27)
click(12.05); riser(12.2, 1.3)
# Scene 4: hit, counter ticks, chart pings
impact(13.6, .7)
for k in np.arange(13.65, 15.4, .07): click(k, .06)
for i, m in enumerate([76, 79, 81, 83, 88]): pluck(14.3 + 1.7 * i / 4, m, .2, -.5 + i * .25)
# Scene 5: step cards
for i, m in enumerate([67, 71, 74]): pluck(18.1 + i * .38, m, .25)
# Scene 6: CTA click + final chime
click(22.45, .55); impact(22.5, .4); shimmer(22.6, .16)
for m in (57, 64, 69, 72, 76): pluck(22.55, m, .14)

mix = np.stack([L, R], 1)
mix *= np.clip((DUR - t) / .6, 0, 1)[:, None]          # fade to silence with the picture
mix *= np.clip(t / .15, 0, 1)[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)                   # gentle limiting
mix *= .89 / np.abs(mix).max()
os.makedirs(os.path.join(os.path.dirname(__file__), 'out'), exist_ok=True)
out = os.path.join(os.path.dirname(__file__), 'out', 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)
