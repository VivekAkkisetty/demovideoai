#!/usr/bin/env python3
"""Sound effects only (no voice, no music) for the crop-survey reel. Times mirror src/crop/*.js.
Writes crop/assets/crop-sfx.wav and out/crop-sfx.wav. Leave headroom: the creator adds a voice later."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from synth import *

ROOT = Path(__file__).resolve().parent.parent
TOTAL = 45.0; N = int(SR * TOTAL)
sx = Track(TOTAL, 21); R = np.random.default_rng(5)

def noiseb(t, d, lo, hi, g, decay=None, atk=0.004):
    n = bp(sx.noise(d), lo, hi); x = tt(d)
    env = np.minimum(1, x / atk) * (np.exp(-x * decay) if decay else np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2)
    sx.add(t, n * env, g * 3)
def tone(t, d, f0, f1, g, wave="sine", decay=6, vib=0):
    x = tt(d); sx.add(t, sweep(d, f0, f1, wave, vib=vib, vibf=30) * np.exp(-x * decay) * np.minimum(1, x / 0.004), g)
def thump(t, g=0.6, f=60, d=0.45):
    x = tt(d); sx.add(t, np.sin(2 * np.pi * (f * x + 30 * (1 - np.exp(-x * 18)) / 18 * -1)) * np.exp(-x * 8), g); sx.add(t, lp(sx.noise(0.18), 350) * np.exp(-tt(0.18) * 22), g * 0.8)
def click(t, g=0.5, f=2200):
    sx.add(t, bp(sx.noise(0.03), 1800, 7000) * np.exp(-tt(0.03) * 220), g * 3); tone(t, 0.04, f, f * 0.4, g * 0.6, decay=120)
def whoosh(t, d, g=0.2, lo=250, hi=4200):
    n = bp(sx.noise(d), lo, hi); x = tt(d); sx.add(t, n * np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2 * (0.4 + 1.1 * np.sin(np.pi * np.clip(x / d, 0, 1)) ** 0.5), g * 2.4)
def rumble(t0, t1, g=0.1, fc=140):
    d = t1 - t0; n = lp(sx.noise(d), fc); x = tt(d); sx.add(t0, n * np.minimum(1, x / 0.6) * np.minimum(1, (d - x) / 0.6), g * 6)
def hum(t0, t1, f=100, g=0.05, harm=(1, 2, 3, 5), sw=0.8):
    d = t1 - t0; x = tt(d); y = sum(np.sin(2 * np.pi * f * h * x + h) / h for h in harm) * (1 + 0.1 * np.sin(2 * np.pi * 6 * x)); sx.add(t0, y * np.minimum(1, x / sw) * np.minimum(1, (d - x) / sw), g)
def crackle(t0, t1, n, g=0.25, lo=2500):
    for _ in range(n): sx.add(R.uniform(t0, t1), hp(sx.noise(0.012), lo) * np.exp(-tt(0.012) * 320), g * R.uniform(0.4, 1))
def metal(t, g=0.3, f=3100):
    x = tt(0.5); y = sum(np.sin(2 * np.pi * f * k * x) * a for k, a in [(1, 1), (1.62, .6), (2.4, .4)]) * np.exp(-x * 9); sx.add(t, y * np.minimum(1, x / 0.002), g)
def chirp(t, g=0.05):
    f = R.uniform(2800, 4200); tone(t, 0.09, f, f * 1.35, g, decay=14); tone(t + 0.12, 0.08, f * 1.1, f * 1.5, g * 0.8, decay=14)

# ambience: gentle wind bed, a few birds on the farm scenes
x = tt(TOTAL); wind = lp(sx.noise(TOTAL), 380) * (0.55 + 0.45 * np.sin(2 * np.pi * x / 9 + 1)); sx.add(0, wind * np.minimum(1, x / 1.5) * np.minimum(1, (TOTAL - x) / 2), 0.7)
for t in [4.8, 5.6, 6.1, 8.4, 9.2, 30.2, 31.0, 33.4, 35.2]: chirp(t)
# 0-4 hook: pin falls, lands, ripple
tone(0.55, 0.8, 2000, 520, 0.05, decay=2.5); thump(1.36, 0.5, 70); tone(1.38, 0.18, 1100, 320, 0.2, decay=22); noiseb(1.4, 1.8, 400, 3000, 0.05)
# whip down to the field
whoosh(3.45, 1.15, 0.22); rumble(3.5, 4.8, 0.08, 120)
# the survey team walks in (soft steps through paddy water), waves, photographs
for k in range(5): t = 4.7 + k * 0.37; thump(t, 0.2, 90, 0.2); noiseb(t + 0.03, 0.12, 700, 3200, 0.12, decay=26)
noiseb(5.6, 1.3, 1200, 5000, 0.06)                                 # cloth swish: hello wave
click(6.95, 0.18, 1500); click(7.18, 0.55, 2400); click(7.245, 0.4, 1700); noiseb(7.18, 0.18, 2500, 9000, 0.12, decay=18)   # shutter + flash
tone(7.3, 1.2, 70, 140, 0.25, decay=2.2); whoosh(7.35, 1.2, 0.1, 150, 1800)                                              # GPS pulse
# photo leaves for the registry
whoosh(8.2, 0.9, 0.12, 400, 6000); crackle(8.9, 13.2, 55, 0.18)
whoosh(9.2, 1.1, 0.26, 200, 5500); whoosh(10.6, 2.8, 0.22, 300, 6500); rumble(10.5, 13.3, 0.07, 200)
thump(13.3, 0.75, 55); noiseb(13.3, 0.7, 800, 9000, 0.1, decay=7); crackle(13.3, 13.9, 30, 0.35)
hum(13.4, 45, 100, 0.045); tone(13.5, 0.5, 400, 1500, 0.07, decay=5)
# the wave of surveyed plots + the counter
whoosh(15.8, 1.0, 0.2); noiseb(16.5, 5.6, 150, 700, 0.03)
for i in range(120):
    u = i / 119; t = 16.7 + 5.0 * (u ** 0.9); click(t, 0.1 + 0.08 * u, 1800 + 900 * u)
thump(21.7, 0.55, 65); crackle(21.6, 22.0, 18, 0.3); whoosh(21.9, 1.0, 0.24)
# bank: cards pop, scanner sweeps, mismatch buzzes, match stamps
rumble(22.9, 29.0, 0.03, 200)
noiseb(24.3, 0.5, 1500, 6000, 0.06, decay=8); thump(24.4, 0.25, 160, 0.2); click(24.4, 0.3, 1400); thump(25.1, 0.25, 180, 0.2); click(25.1, 0.3, 1800)
tone(25.7, 0.9, 380, 2100, 0.12, "saw", decay=1.5); noiseb(25.7, 0.9, 2000, 8000, 0.05)
tone(26.8, 0.38, 112, 104, 0.3, "square", decay=3.5); thump(26.8, 0.6, 50); crackle(26.8, 27.2, 14, 0.3)
noiseb(27.9, 0.3, 1200, 5000, 0.08, decay=14)
thump(28.4, 0.5, 90, 0.25); click(28.4, 0.45, 2600); noiseb(28.45, 0.4, 3000, 10000, 0.11, decay=9); crackle(28.4, 29.0, 22, 0.25, 4000)
# the Farmer ID
whoosh(28.9, 1.0, 0.24); noiseb(29.7, 0.5, 1000, 5000, 0.1, decay=8); thump(29.8, 0.3, 130, 0.2)
whoosh(30.6, 0.9, 0.12, 300, 3500); thump(31.45, 0.35, 100, 0.2)
for i, t in enumerate([31.5, 32.0, 32.5, 33.0]): click(t, 0.35, 1500 + 300 * i); thump(t, 0.2, 120, 0.15)
metal(31.55, 0.28, 3100); noiseb(32.05, 0.15, 1500, 6000, 0.12, decay=16); thump(32.55, 0.35, 75, 0.25); click(33.05, 0.5, 2800)
for i in range(70):
    u = i / 69; click(31.95 + 2.45 * (u ** 0.9), 0.09 + 0.05 * u, 1600 + 700 * u)
thump(34.45, 0.4, 70, 0.3); crackle(34.4, 34.9, 14, 0.2)
# the lock: whoosh up, dread, heartbeat, shackle clicks shut
whoosh(36.7, 1.1, 0.26); rumble(37.4, 43.5, 0.08, 90); hum(37.6, 44, 70, 0.04, (1, 2, 3), 1.0)
tone(37.7, 1.0, 120, 210, 0.08, "saw", decay=1.4); noiseb(37.7, 1.0, 600, 3500, 0.05)
for b in [38.2, 39.1, 40.0, 40.9]: thump(b, 0.55, 48, 0.4); thump(b + 0.3, 0.38, 46, 0.35)
click(39.38, 0.55, 2200); metal(39.42, 0.4, 2700); click(39.5, 0.5, 1700); thump(39.5, 0.4, 85); crackle(39.4, 39.9, 20, 0.3, 3500)
# outro
whoosh(41.8, 1.0, 0.22); noiseb(42.4, 2.4, 300, 4000, 0.04); thump(44.0, 0.25, 70, 0.5)

sfx = lp(sx.buf, 15000)
sfx = np.tanh(sfx * 1.6) / 1.6                                   # tame spikes
sfx *= np.minimum(1, np.arange(N) / (SR * 0.05)) * np.minimum(1, (N - np.arange(N)) / (SR * 0.8))
sfx *= 0.45 / max(np.abs(sfx).max(), 1e-6)                       # peak ~ -7 dBFS, leaves the voice room
d = int(0.011 * SR); L = sfx; Rr = np.concatenate([np.zeros(d), sfx[:-d]])
st = np.empty(N * 2, dtype=np.float32); st[0::2] = L; st[1::2] = Rr
for dst in [ROOT / "crop/assets", ROOT / "out"]:
    dst.mkdir(parents=True, exist_ok=True); write_wav(dst / "crop-sfx.wav", st, 2)
print(f"rms {20*np.log10(np.sqrt(np.mean(sfx**2))):.1f} dBFS, peak {20*np.log10(np.abs(sfx).max()):.1f} dBFS -> crop/assets/crop-sfx.wav")
