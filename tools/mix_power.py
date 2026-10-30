#!/usr/bin/env python3
"""Sound design + mix for the power-grid reel. Event times mirror src/power/layout.js + main.js."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from synth import *

ROOT = Path(__file__).resolve().parent.parent
BUILD, OUT = ROOT / "build" / "power", ROOT / "out"
TOTAL = 45.0
N = int(SR * TOTAL)
R = np.random.default_rng(11)

# ---------- voice ----------
v22, sr22 = read_wav(BUILD / "voiceover_22k.wav")
voice = np.interp(np.arange(N) / SR * sr22, np.arange(len(v22)), v22).astype(np.float32)
write_wav(OUT / "power-voiceover.wav", voice * 0.9)

# ---------- music: warm lo-fi bed ----------
mus = Track(TOTAL, 3); BPM = 84; beat = 60 / BPM; bar = beat * 4
chords = [[45, 48, 52, 55], [41, 45, 48, 52], [48, 52, 55, 59], [43, 47, 50, 53]]  # Am7 Fmaj7 Cmaj7 G
for b in range(int(TOTAL / bar) + 2):
    ch = chords[b % 4]; t0 = b * bar
    for k, n in enumerate(ch): mus.add(t0 + k * 0.02, piano(midi(n + 12), 3.0, 0.26))
    mus.add(t0, piano(midi(ch[0] - 12), 2.4, 0.5)); mus.add(t0 + 2 * beat, piano(midi(ch[0] - 12), 1.6, 0.36))
    for k, (off, idx) in enumerate([(1.5, 2), (2.0, 3), (2.75, 1), (3.5, 2)]): mus.add(t0 + (off + (0.07 if k % 2 else 0)) * beat, piano(midi(ch[idx] + 24), 1.2, 0.17))
    for bt in (0, 2):
        x = tt(0.25); mus.add(t0 + bt * beat, np.sin(2 * np.pi * (46 * x + 38 * np.exp(-x * 20) / 20)) * np.exp(-x * 13), 0.34)
    for bt in range(8):
        h = hp(mus.noise(0.05), 6000) * np.exp(-tt(0.05) * 70); mus.add(t0 + (bt * 0.5 + (0.05 if bt % 2 else 0)) * beat, h, 0.1 if bt % 2 else 0.055)
music = lp(lp(mus.buf, 3600), 5200)
music *= np.minimum(1, np.arange(N) / (SR * 1.2)) * np.minimum(1, (N - np.arange(N)) / (SR * 2.0))
music *= (10 ** (-22.5 / 20)) / np.sqrt(np.mean(music ** 2))

# ---------- SFX ----------
sx = Track(TOTAL, 5)
def click(t, g=0.5):
    n = sx.noise(0.03); sx.add(t, bp(n, 1500, 6500) * np.exp(-tt(0.03) * 200), g * 3); sx.add(t, sweep(0.04, 2400, 900) * np.exp(-tt(0.04) * 120), g)
def whoosh(t, d, g=0.2, lo=300, hi=3500, peak=0.5):
    x = tt(d); n = sx.noise(d); sw = (x / d); f = lp(n, hi) - lp(n, lo)
    env = np.sin(np.pi * np.clip(sw, 0, 1)) ** 2
    sx.add(t, f * env * (0.4 + 1.2 * np.sin(np.pi * np.clip(sw, 0, 1)) ** 0.5), g * 2.4)
def thump(t, g=0.6, f=52):
    x = tt(0.45); sx.add(t, np.sin(2 * np.pi * (f * x + 38 * (1 - np.exp(-x * 18)) / 18 * -1)) * np.exp(-x * 8), g); sx.add(t, lp(sx.noise(0.2), 400) * np.exp(-tt(0.2) * 20), g * 0.9)
def crack(t, g=0.6, d=0.18):
    n = sx.noise(d); sx.add(t, hp(n, 1200) * np.exp(-tt(d) * 22), g * 2.0)
def zap(t, d=0.5, g=0.35):
    x = tt(d); s = sweep(d, 3500, 400, "saw", vib=0.04, vibf=40) * np.exp(-x * 5); sx.add(t, hp(s, 600), g); crack(t, g * 0.6, 0.12)
def hum(t0, t1, f=100, g=0.1, harm=(1, 2, 3, 5), swell=0.4):
    d = t1 - t0; x = tt(d); y = sum(np.sin(2 * np.pi * f * h * x + h) * (1 / h) for h in harm)
    y *= (1 + 0.12 * np.sin(2 * np.pi * 7 * x)); env = np.minimum(1, x / swell) * np.minimum(1, (d - x) / swell)
    sx.add(t0, y * env, g)
def rumble(t0, t1, g=0.12, fc=140):
    d = t1 - t0; n = lp(sx.noise(d), fc); x = tt(d); sx.add(t0, n * np.minimum(1, x / 0.5) * np.minimum(1, (d - x) / 0.5), g * 6)
def riser(t0, d, f0, f1, g=0.2, noise=0.5):
    x = tt(d); u = x / d; s = sweep(d, f0, f1, "saw") * u ** 2; n = hp(sx.noise(d), 1500) * u ** 3 * noise
    sx.add(t0, lp(s, 4000) * g + n * g, 1.0)
def chime(t, g=0.28, notes=(523.25, 659.25, 783.99, 1046.5), gap=0.09): [sx.add(t + i * gap, bell(f, 1.5), g) for i, f in enumerate(notes)]
def ping(t, f, g=0.18, d=0.9): sx.add(t, bell(f, d), g)
PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0]

# 0-4: night room, switch, bulb, whip
rumble(0.0, 3.6, 0.03, 220)
for k in range(9): sx.add(0.2 + k * 0.38 + R.uniform(0, 0.1), sweep(0.07, 4300, 4700) * np.exp(-tt(0.07) * 30), 0.025)
click(1.33, 0.55); click(1.36, 0.35)
sx.add(1.45, sweep(0.25, 90, 190) * np.exp(-tt(0.25) * 6), 0.25); ping(1.5, 1318.5, 0.14, 1.3); ping(1.52, 1975.5, 0.07, 1.0)
hum(1.5, 3.7, 100, 0.07, (1, 2, 4), 0.2)
whoosh(3.45, 1.1, 0.22, 200, 4200); riser(3.3, 1.2, 150, 1400, 0.14, 0.5); thump(4.5, 0.55)
# mine
sx.add(4.8, sweep(0.9, 400, 2200) * np.sin(np.pi * np.clip(tt(0.9) / 0.9, 0, 1)), 0.1); ping(5.3, 1760, 0.06, 0.8)
rumble(4.5, 9.0, 0.11, 130)
for k in range(int((8.9 - 4.9) * 5.5)):
    t = 4.9 + k / 5.5 + R.uniform(0, 0.05); sx.add(t, bp(sx.noise(0.06), 600, 3200) * np.exp(-tt(0.06) * 60), 0.22)
    if R.random() < 0.5: sx.add(t + 0.07, bp(sx.noise(0.05), 300, 1800) * np.exp(-tt(0.05) * 70), 0.15)
x = tt(4.0); sx.add(4.9, sweep(4.0, 330, 290, vib=0.01, vibf=2.2) * 0.02 * np.minimum(1, x / 0.5), 1.0)
# train
sx.add(8.65, (sweep(1.0, 392, 392, vib=0.012, vibf=5.5) + 0.8 * sweep(1.0, 494, 494, vib=0.012, vibf=5.5)) * 0.12 * np.sin(np.pi * np.clip(tt(1.0) / 1.0, 0, 1)) ** 0.6, 1.0)
rumble(8.6, 13.0, 0.14, 160)
t = 8.9; rate = 2.2
while t < 12.9:
    u = (t - 8.8) / 4.1; rate = 2.4 + 5.5 * min(1, u * 1.1) ** 0.8
    sx.add(t, lp(sx.noise(0.16), 1600) * np.exp(-tt(0.16) * 16) * (0.8 + 0.2 * R.random()), 0.55); sx.add(t, hp(sx.noise(0.08), 3000) * np.exp(-tt(0.08) * 40), 0.15)
    t += 1 / rate
t = 8.9
while t < 12.8:
    u = (t - 8.8) / 4.1; cl = 7 + 14 * min(1, u * 1.2) ** 0.9
    sx.add(t, bp(sx.noise(0.04), 900, 3800) * np.exp(-tt(0.04) * 90), 0.12); t += 1 / cl
x = tt(0.7); sx.add(12.3, hp(sx.noise(0.7), 2500) * np.exp(-x * 4) * 0.35 + sweep(0.7, 2200, 1300, "saw") * 0.04 * np.exp(-x * 4), 1.0)
# boiler + fire
for k in range(6): sx.add(13.15 + k * 0.17, lp(sx.noise(0.2), 500) * np.exp(-tt(0.2) * 18), 0.45)
thump(13.4, 0.5, 70); sx.add(13.4, lp(sx.noise(0.9), 900) * np.exp(-tt(0.9) * 4), 0.6)
x = tt(8.5); fire = bp(sx.noise(8.5), 150, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.3 * x + 1) ** 2) * np.minimum(1, x / 0.8); sx.add(13.4, fire, 0.26)
for k in range(70): sx.add(13.6 + R.uniform(0, 7.6), hp(sx.noise(0.012), 2500) * np.exp(-tt(0.012) * 300), R.uniform(0.15, 0.4))
x = tt(6.3); sx.add(15.0, hp(sx.noise(6.3), 3200) * np.minimum(1, x / 1.2) * np.minimum(1, (6.3 - x) / 0.6), 0.09)
# turbine
x = tt(3.5); sp = sweep(3.5, 140, 900, "saw", expo=True) * (x / 3.5) ** 1.2; sx.add(17.0, lp(sp, 3200), 0.12)
x = tt(4.2); sp2 = sweep(4.2, 70, 440, "sine") * (x / 4.2) ** 1.4; sx.add(17.0, sp2, 0.13)
hum(17.6, 22.0, 100, 0.1, (1, 2, 3, 4, 6), 0.6)
riser(19.8, 0.7, 300, 2400, 0.22, 0.9); zap(20.45, 0.6, 0.38); thump(20.45, 0.5, 60); chime(20.55, 0.22, (783.99, 1046.5, 1318.5, 1568.0), 0.06)
# transmission
whoosh(21.0, 0.9, 0.24, 300, 5000); zap(21.1, 0.7, 0.3); riser(20.7, 0.8, 200, 3000, 0.16, 0.6)
hum(21.6, 26.2, 100, 0.09, (1, 3, 5, 7), 0.6)
for k in range(80): sx.add(21.8 + R.uniform(0, 4.3), hp(sx.noise(0.01), 3500) * np.exp(-tt(0.01) * 380), R.uniform(0.1, 0.32))
for i, tp in enumerate([22.05, 22.7, 23.35, 24.0, 24.65, 25.15, 25.6]):
    whoosh(tp - 0.12, 0.34, 0.14, 500, 4800); ping(tp, PENT[i % len(PENT)] * 1.0, 0.1, 0.6)
whoosh(26.0, 1.0, 0.2, 300, 3500)
# substation
sx.add(26.7, sweep(0.9, 1300, 180) * 0.12 * np.exp(-tt(0.9) * 3.0), 1.0)
hum(26.9, 29.8, 100, 0.13, (1, 2, 4, 6), 0.4)
x = tt(0.28); sx.add(27.12, hp(sx.noise(0.28), 900) * np.exp(-x * 11) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 90 * x))), 0.7)
crack(27.14, 0.7, 0.15); crack(27.3, 0.5, 0.12); crack(27.46, 0.4, 0.1); thump(27.15, 0.5, 80)
sx.add(28.6, sweep(1.0, 700, 240) * 0.1 * np.exp(-tt(1.0) * 2.5), 1.0)
# distribution + home
for i, tp in enumerate([30.4, 31.0, 31.6, 32.2]): ping(tp, PENT[i] * 0.5, 0.14, 0.9)
hum(29.8, 33.5, 60, 0.07, (1, 2, 3), 0.6)
thump(32.28, 0.4, 100); crack(32.3, 0.4, 0.12); zap(32.32, 0.3, 0.2)
riser(33.0, 1.6, 300, 2000, 0.16, 0.7)
for k in range(14): ping(33.65 + k * 0.1, PENT[(k * 2) % len(PENT)] * (1 if k < 9 else 0.5), 0.08, 0.7)
click(34.5, 0.2); sx.add(34.62, sweep(0.3, 90, 200) * np.exp(-tt(0.3) * 6), 0.3); chime(34.65, 0.3, (523.25, 659.25, 783.99, 1046.5, 1318.5), 0.07); thump(34.62, 0.4, 60)
hum(34.7, 37.0, 100, 0.07, (1, 2, 4), 0.3)
# fault + cut
whoosh(36.2, 1.1, 0.24, 250, 4500); riser(36.1, 1.0, 200, 1600, 0.12, 0.4)
for k in range(26): crack(36.85 + k * 0.012 + R.uniform(0, 0.02), R.uniform(0.15, 0.5), 0.05)
x = tt(0.4); sx.add(36.85, sweep(0.4, 880, 880, "square") * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * x))) * 0.05, 1.0)
sx.add(37.0, sweep(0.5, 1200, 1200, "square") * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 8 * tt(0.5)))) * 0.05, 1.0)
sx.add(37.18, sweep(1.4, 180, 28, "sine") * 0.4 * np.exp(-tt(1.4) * 2.2), 1.0); thump(37.2, 0.75, 38); crack(37.2, 0.5, 0.25)
sx.add(37.3, lp(sx.noise(2.0), 300) * np.exp(-tt(2.0) * 2.5), 0.25)
# restore
riser(38.9, 1.0, 90, 1600, 0.26, 0.9); whoosh(39.3, 1.4, 0.26, 250, 5200); zap(39.5, 0.8, 0.35); thump(39.5, 0.5, 60)
for k in range(10): ping(39.6 + k * 0.1, PENT[min(k, len(PENT) - 1)], 0.14, 1.0)
chime(40.25, 0.36, (523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0), 0.06); hum(40.2, 42.0, 100, 0.06, (1, 2, 4), 0.4)
# outro sparkle
for k in range(26): ping(41.2 + k * 0.12 + R.uniform(0, 0.04), PENT[R.integers(2, 9)] * (2 if R.random() < 0.3 else 1), 0.06, 0.7)
chime(43.6, 0.22)
sfx = lp(sx.buf, 14000)
sfx = np.tanh(sfx * 1.7) / 1.7          # soft-limit effect spikes so they do not set the master gain

# ---------- ducking + mix ----------
env = mavg(np.abs(voice), 0.08 * SR); active = (env > 0.02).astype(np.float32); sm = mavg(active, 0.3 * SR)
vg = np.clip(sm * 1.6, 0, 1)
cut = np.zeros(N, dtype=np.float32); cut[int(37.1 * SR):int(39.5 * SR)] = 1; cut = mavg(cut, 0.25 * SR)
music_g = (1 - (1 - 10 ** (-10 / 20)) * vg) * (1 - 0.82 * cut)
sfx_g = 1 - 0.5 * vg
bus = music * music_g * 0.9 + sfx * sfx_g * 0.85
d = int(0.012 * SR)
L = voice + bus
Rr = voice + np.concatenate([np.zeros(d), bus[:-d]])
L = np.tanh(L * 1.35) / 1.35; Rr = np.tanh(Rr * 1.35) / 1.35      # master soft limiter
g = 0.93 / max(np.abs(L).max(), np.abs(Rr).max(), 1e-6)
st = np.empty(N * 2, dtype=np.float32); st[0::2] = L * g; st[1::2] = Rr * g
write_wav(BUILD / "mix.wav", st, 2)
print(f"master gain {g:.2f}; music rms {20*np.log10(np.sqrt(np.mean(music**2))):.1f} dBFS -> build/power/mix.wav, out/power-voiceover.wav")
