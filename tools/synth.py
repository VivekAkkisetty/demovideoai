"""Tiny numpy synth toolkit shared by the reel mixers (no scipy)."""
import wave
import numpy as np

SR = 44100

def tt(d): return np.arange(int(d * SR)) / SR

def mavg(x, k):
    k = max(1, int(k)); c = np.cumsum(np.concatenate([np.zeros(k // 2 + 1), x, np.zeros(k)]), dtype=np.float64)
    return ((c[k:k + len(x)] - c[:len(x)]) / k).astype(np.float32)

def lp(x, fc): return mavg(x, SR / fc / 2)
def hp(x, fc): return x - lp(x, fc)
def bp(x, lo, hi): return lp(x, hi) - lp(x, lo)
def midi(n): return 440 * 2 ** ((n - 69) / 12)

class Track:
    def __init__(self, dur, seed=1):
        self.N = int(SR * dur); self.buf = np.zeros(self.N, dtype=np.float32); self.rng = np.random.default_rng(seed); self.dur = dur
    def add(self, t, sig, g=1.0):
        i = int(t * SR)
        if i >= self.N or i < 0: return
        j = min(self.N, i + len(sig)); self.buf[i:j] += sig[: j - i] * g
    def noise(self, d): return self.rng.standard_normal(int(d * SR)).astype(np.float32)

def env_ad(d, a=0.005, rel=None):
    x = tt(d); rel = rel or d * 0.8
    return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / (rel / 4.0))

def sweep(d, f0, f1, wave="sine", expo=True, vib=0.0, vibf=6.0):
    x = tt(d); u = x / max(d, 1e-6)
    f = f0 * (f1 / f0) ** u if expo else f0 + (f1 - f0) * u
    if vib: f = f * (1 + vib * np.sin(2 * np.pi * vibf * x))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == "saw": return (2 * ((ph / (2 * np.pi)) % 1) - 1).astype(np.float32)
    if wave == "square": return np.sign(np.sin(ph)).astype(np.float32)
    return np.sin(ph).astype(np.float32)

def bell(f, d=1.4, bright=1.0):
    x = tt(d)
    y = (np.sin(2 * np.pi * f * x) + 0.5 * bright * np.sin(2 * np.pi * f * 2.01 * x) * np.exp(-x * 3) + 0.3 * bright * np.sin(2 * np.pi * f * 3.02 * x) * np.exp(-x * 5)) * np.exp(-x * 3.2)
    return (y * np.minimum(1, x / 0.004)).astype(np.float32)

def piano(f, d=2.6, vel=0.5):
    x = tt(d); y = np.zeros_like(x)
    for h, (amp, dec) in enumerate([(1, 1.6), (.45, .9), (.22, .55), (.1, .35)], start=1):
        for det in (1.0, 1.003): y += amp * np.sin(2 * np.pi * f * h * det * x) * np.exp(-x / dec) * 0.5
    return (y * np.minimum(1, x / 0.006) * vel).astype(np.float32)

def write_wav(path, a, ch=1):
    a = np.clip(a, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())

def read_wav(path):
    with wave.open(str(path)) as w:
        sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a, sr
