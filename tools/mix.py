#!/usr/bin/env python3
"""Synthesise lo-fi piano bed + SFX, duck music under the voiceover, write the mix.

Outputs: build/mix.wav (stereo 44.1k), out/voiceover.wav (voice only, 44.1k mono).
All SFX times mirror the visual timeline in src/main.js.
"""
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUILD, OUT = ROOT / "build", ROOT / "out"
SR, TOTAL = 44100, 45.0
N = int(SR * TOTAL)
rng = np.random.default_rng(7)

def read(p):
    with wave.open(str(p)) as w:
        sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a, sr

def write(p, a, ch=1):
    a = np.clip(a, -1, 1)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())

def mavg(x, k):
    k = max(1, int(k)); c = np.cumsum(np.concatenate([np.zeros(k // 2 + 1), x, np.zeros(k)]), dtype=np.float64)
    return ((c[k:k + len(x)] - c[:len(x)]) / k).astype(np.float32)

def lp_fast(x, fc):  # moving-average lowpass, good enough for shaping
    return mavg(x, SR / fc / 2)

def lowpass(x, fc):
    return mavg(mavg(x, SR / fc / 2), SR / fc / 2)

def add(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i < 0: return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[: j - i] * gain

def tt(d): return np.arange(int(d * SR)) / SR

# ---------- voice ----------
v22, sr22 = read(BUILD / "voiceover_22k.wav")
voice = np.interp(np.arange(N) / SR * sr22, np.arange(len(v22)), v22).astype(np.float32)
write(OUT / "voiceover.wav", voice * 0.9)

# ---------- music: lo-fi piano ----------
BPM = 76; beat = 60 / BPM
def note(f, d=2.6, vel=0.5):
    t = tt(d); y = np.zeros_like(t)
    for h, (amp, dec) in enumerate([(1, 1.6), (.45, .9), (.22, .55), (.1, .35)], start=1):
        for det in (1.0, 1.003):
            y += amp * np.sin(2 * np.pi * f * h * det * t) * np.exp(-t / dec) * 0.5
    y *= np.minimum(1, t / 0.006)
    return y * vel
def midi(n): return 440 * 2 ** ((n - 69) / 12)
chords = [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]]  # Cmaj7 Am7 Dm7 G7
music = np.zeros(N, dtype=np.float32)
bar = beat * 4
for b in range(int(TOTAL / bar) + 2):
    ch = chords[b % 4]; t0 = b * bar
    for k, n in enumerate(ch):
        add(music, t0 + k * 0.022, note(midi(n + 12), 3.0, 0.30))
    add(music, t0, note(midi(ch[0] - 12), 2.2, 0.55))                 # bass
    add(music, t0 + 2 * beat, note(midi(ch[0] - 12), 1.4, 0.40))
    for k, (off, idx) in enumerate([(1.5, 2), (2.0, 3), (2.75, 1), (3.5, 2)]):  # sparse melody, light swing
        add(music, t0 + (off + (0.08 if k % 2 else 0)) * beat, note(midi(ch[idx] + 24), 1.2, 0.20))
    for bt in (0, 2):                                                   # soft kick
        t = tt(0.25); add(music, t0 + bt * beat, np.sin(2 * np.pi * (50 * t + 70 * (1 - np.exp(-t * 30)) / 30 * 0 + 45 * np.exp(-t * 25) * 0.0 + 60 * np.exp(-t * 18) / 18)) * np.exp(-t * 14), 0.35)
    for bt in range(8):                                                 # hats
        h = lp_fast(rng.standard_normal(int(0.05 * SR)), 9000) * np.exp(-tt(0.05) * 70)
        add(music, t0 + (bt * 0.5 + (0.06 if bt % 2 else 0)) * beat, h, 0.12 if bt % 2 else 0.07)
music = lowpass(music, 3800)
crackle = (rng.random(N) > 0.9996).astype(np.float32) * rng.standard_normal(N).astype(np.float32) * 0.05
music += lp_fast(crackle, 6000)
fade = np.minimum(1, np.arange(N) / (SR * 1.5)) * np.minimum(1, (N - np.arange(N)) / (SR * 1.5))
music *= fade
music *= (10 ** (-22 / 20)) / max(np.sqrt(np.mean(music ** 2)), 1e-6)   # bed ~ -22 dBFS RMS

# ---------- SFX ----------
sfx = np.zeros(N, dtype=np.float32)
def pop(t, f, g=0.25):
    x = tt(0.09); add(sfx, t, np.sin(2 * np.pi * (f * x + (f * 0.6) * (1 - np.exp(-x * 60)) / 60 * -1)) * np.exp(-x * 45), g)
def bell(t, f, g=0.25, d=1.4):
    x = tt(d); y = (np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 2.01 * x) * np.exp(-x * 3) + .3 * np.sin(2 * np.pi * f * 3.02 * x) * np.exp(-x * 5)) * np.exp(-x * 3.2)
    add(sfx, t, y * np.minimum(1, x / 0.004), g)
def chime(t, g=0.3): [bell(t + i * 0.09, f, g) for i, f in enumerate((523.25, 659.25, 783.99, 1046.5))]
def whoosh(t, d, g=0.18, up=True):
    x = tt(d); n = rng.standard_normal(len(x)); n = lp_fast(n, 2500) - lp_fast(n, 300)
    env = np.sin(np.pi * x / d) ** 2 if up else np.exp(-x * 4)
    add(sfx, t, n * env, g)
def thump(t, g=0.5):
    x = tt(0.35); add(sfx, t, np.sin(2 * np.pi * (45 * x + 40 * (1 - np.exp(-x * 20)) / 20 * -1 + 90 * x * 0)) * np.exp(-x * 9), g)
    add(sfx, t, np.sin(2 * np.pi * 70 * x) * np.exp(-x * 12), g * 0.8)
def scribble(t0, t1, g=0.1):
    x = tt(t1 - t0); n = rng.standard_normal(len(x)); n = lp_fast(n, 7000) - lp_fast(n, 1800)
    add(sfx, t0, n * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * x)) * np.minimum(1, x * 8), g)

whoosh(4.6, 0.9, 0.12); bell(5.0, 987.77, 0.14)
whoosh(7.2, 1.2, 0.16); bell(8.4, 880, 0.3); bell(8.5, 1318.5, 0.18)
for k in range(38): u = (k / 37) ** 0.8; pop(10.4 + u * 2.8, rng.uniform(380, 700), 0.22)
for k in range(40): bell(13.7 + rng.uniform(0, 2.9), rng.uniform(1500, 2600), 0.045, 0.6)
chime(16.6, 0.34); whoosh(16.8, 1.4, 0.18)
whoosh(17.8, 1.6, 0.14)
for k in range(30): u = (k / 29) ** 0.8; pop(19.95 + u * 2.0, rng.uniform(300, 520), 0.2)
for k in range(30): bell(22.2 + rng.uniform(0, 2.6), rng.uniform(1700, 2800), 0.04, 0.6)
chime(24.9, 0.34); whoosh(25.6, 2.0, 0.16)
scribble(28.7, 31.0, 0.09); whoosh(30.0, 1.4, 0.1)
x = tt(2.6); sw = lp_fast(rng.standard_normal(len(x)), 1500) * (x / 2.6) ** 2 * np.exp(-((x - 0.2) / 2.6) * 0); add(sfx, 29.6, sw, 0.2)
thump(31.2, 0.55); chime(31.25, 0.3); whoosh(31.3, 2.0, 0.2, False)
thump(34.7, 0.6); bell(34.72, 1760, 0.12, 0.5)
for k in range(32): pop(35.0 + (k / 31) * 3.0 + rng.uniform(0, 0.08), rng.uniform(180, 340), 0.14)
pop(36.35, 160, 0.28); pop(36.75, 200, 0.26)
whoosh(37.3, 2.6, 0.18)
for i, f in enumerate([523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 1568, 1318.5, 1046.5, 783.99]):
    bell(40.3 + i * 0.25, f, 0.16, 1.2)
chime(43.9, 0.22)
sfx = lp_fast(sfx, 14000)

# ---------- duck + mix ----------
env = mavg(np.abs(voice), 0.08 * SR)
active = (env > 0.02).astype(np.float32)
smooth = mavg(active, 0.35 * SR)
duck = 1 - (1 - 10 ** (-6 / 20)) * np.clip(smooth * 1.5, 0, 1)
mixm = voice * 0.9 + music * duck + sfx * (1 - 0.35 * np.clip(smooth * 1.5, 0, 1))
# stereo: voice centre, music/sfx slightly widened
d = int(0.012 * SR)
L = voice * 0.9 + (music * duck + sfx) * 0.95
R = voice * 0.9 + np.concatenate([np.zeros(d), (music * duck + sfx)[:-d]]) * 0.95
peak = max(np.abs(L).max(), np.abs(R).max()); g = 0.89 / peak
st = np.empty(N * 2, dtype=np.float32); st[0::2] = L * g; st[1::2] = R * g
write(BUILD / "mix.wav", st, 2)
print(f"mix peak scaled by {g:.2f}; music rms {20*np.log10(np.sqrt(np.mean(music**2))):.1f} dBFS; wrote build/mix.wav, out/voiceover.wav")
