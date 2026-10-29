#!/usr/bin/env python3
"""Offline Telugu TTS (espeak-ng) -> voiceover.wav + word timings + SRT.

Each line is synthesised separately, silence-trimmed, and placed at the start
time given in src/script.json. Word timings are distributed over the measured
clip duration in proportion to word length (no forced aligner is available
offline). To use a real voice instead, drop per-line WAVs into build/vo/<id>.wav
and re-run: they take precedence over espeak output.
"""
import json, re, subprocess, wave, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"; VO = BUILD / "vo"; OUT = ROOT / "out"
for d in (BUILD, VO, OUT): d.mkdir(exist_ok=True)
SR = 22050
TOTAL = 45.0
SPEED = int(sys.argv[1]) if len(sys.argv) > 1 else 150

script = json.loads((ROOT / "src/script.json").read_text())["lines"]

def read_wav(p):
    with wave.open(str(p)) as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: a = a.reshape(-1, ch).mean(1)
    if sr != SR:
        a = np.interp(np.arange(0, len(a) * SR / sr) * sr / SR, np.arange(len(a)), a)
    return a

def trim(a, thr=0.02):
    idx = np.where(np.abs(a) > thr * max(np.abs(a).max(), 1e-6))[0]
    pad = int(0.04 * SR)
    return a[max(idx[0] - pad, 0): idx[-1] + pad]

def tokens(roman):
    out, key = [], False
    for part in re.split(r"(\*)", roman):
        if part == "*": key = not key; continue
        for w in part.split():
            out.append({"text": w, "key": key})
    return out

def weight(w):
    t = re.sub(r"[^A-Za-z0-9]", "", w)
    return (len(t) * (3 if t.isdigit() else 1)) + 1

def chunks(words):
    n = len(words)
    if n <= 5: sizes = [n]
    else:
        a = (n + 1) // 2; sizes = [a, n - a]
    out, i = [], 0
    for s in sizes: out.append(words[i:i + s]); i += s
    return out

timing, track = [], np.zeros(int(TOTAL * SR), dtype=np.float32)
for i, ln in enumerate(script):
    custom = VO / f"{ln['id']}.wav"
    if custom.exists():
        a = trim(read_wav(custom))
    else:
        tmp = BUILD / f"{ln['id']}.wav"
        subprocess.run(["espeak-ng", "-v", "te", "-s", str(SPEED), "-p", "55", "-g", "2",
                        "-w", str(tmp), ln["te"]], check=True)
        a = trim(read_wav(tmp))
    a = a / max(np.abs(a).max(), 1e-6) * 0.85
    dur = len(a) / SR
    nxt = script[i + 1]["start"] if i + 1 < len(script) else TOTAL
    budget = nxt - ln["start"] - 0.15
    flag = "" if dur <= budget else f"  <-- OVERRUN (budget {budget:.2f}s)"
    print(f"{ln['id']:7s} start {ln['start']:6.2f}  dur {dur:5.2f}s{flag}")
    s0 = int(ln["start"] * SR); track[s0:s0 + len(a)] += a[: len(track) - s0]

    toks = tokens(ln["roman"]); tot = sum(weight(t["text"]) for t in toks); t = ln["start"]
    for tk in toks:
        d = dur * weight(tk["text"]) / tot
        tk["t0"], tk["t1"] = round(t, 3), round(t + d, 3); t += d
    cs = [{"t0": c[0]["t0"], "t1": c[-1]["t1"], "words": c} for c in chunks(toks)]
    timing.append({"id": ln["id"], "start": ln["start"], "dur": round(dur, 3), "chunks": cs})

# chunk display window: from first word until the next chunk starts (or +0.35s)
flat = [c for l in timing for c in l["chunks"]]
for k, c in enumerate(flat):
    nxt = flat[k + 1]["t0"] if k + 1 < len(flat) else 45.0
    c["show0"] = round(c["t0"] - 0.05, 3)
    c["show1"] = round(min(c["t1"] + 0.45, nxt - 0.02), 3) if nxt - c["t1"] < 0.9 else round(c["t1"] + 0.45, 3)

(BUILD / "timing.json").write_text(json.dumps({"lines": timing}, ensure_ascii=False, indent=1))

with wave.open(str(BUILD / "voiceover_22k.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())

def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
srt = []
for n, c in enumerate(flat, 1):
    srt.append(f"{n}\n{ts(c['show0'])} --> {ts(c['show1'])}\n{' '.join(w['text'] for w in c['words'])}\n")
(OUT / "subtitles.srt").write_text("\n".join(srt), encoding="utf-8")
print("wrote build/timing.json, build/voiceover_22k.wav, out/subtitles.srt")
