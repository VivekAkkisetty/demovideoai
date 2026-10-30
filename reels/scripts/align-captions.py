#!/usr/bin/env python3
"""Align the transcript to the voiceover without a speech model.

1. Detect syllable nuclei (peaks of the smoothed speech energy) and pauses in public/voiceover.mp3.
2. Estimate syllables per word from the Tenglish spelling.
3. Monotone DP matches syllables <-> nuclei; pauses may only fall on punctuation boundaries.
Writes src/data/airplane-oxygen.words.json.   Usage: python3 scripts/align-captions.py
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.signal import find_peaks
from scipy.ndimage import gaussian_filter1d

root = Path(__file__).resolve().parent.parent
SR = 16000
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(root / "public/voiceover.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.float32)
HOP = 160  # 10 ms
n = len(x) // HOP
frames = x[: n * HOP].reshape(n, HOP)
# emphasise vowel band energy: simple pre-emphasis-free RMS on the whole band is robust enough
rms = np.sqrt((frames ** 2).mean(1) + 1e-12)
db = 20 * np.log10(rms + 1e-9)
env = gaussian_filter1d(rms, 2.0)  # ~20 ms smoothing -> one bump per syllable
floor = np.percentile(db, 20)
voiced = db > (floor + 10)

peaks, _ = find_peaks(env, distance=4, prominence=np.max(env) * 0.006, height=np.max(env) * 0.02)
peaks = [int(p) for p in peaks if voiced[p]]
nuc = np.array(peaks) * 0.01 + 0.005

# pauses: runs of unvoiced frames >= 120 ms between voiced frames
pauses = []
i = 0
while i < n:
    if not voiced[i]:
        j = i
        while j < n and not voiced[j]:
            j += 1
        if j - i >= 12 and i > 0 and j < n:
            pauses.append((i * 0.01, j * 0.01))
        i = j
    else:
        i += 1

# ---- transcript -> words -> syllables -------------------------------------------------
SPECIAL = {"35,000": 5, "450": 4, "15": 2, "sodium": 3, "chlorate": 2, "ignite": 2, "altitude": 3, "produce": 2, "pure": 1,
           "yellow": 2, "celsius": 3, "oxygen": 3, "tanks": 1, "masks": 1}
def syl(word):
    w = re.sub(r"[^\w,]", "", word.lower())
    if w in SPECIAL:
        return SPECIAL[w]
    return max(1, len(re.findall(r"[aeiouy]+", w)))

paras = [l.strip() for l in (root / "src/data/airplane-oxygen.transcript.txt").read_text().splitlines() if l.strip()]
words = []  # (text, syllables, phrase_break_after)
for p in paras:
    toks = p.split()
    for k, t in enumerate(toks):
        brk = bool(re.search(r"[.,?!…]$|\.\.\.$", t))
        big = bool(re.search(r"[.?!]$|\.\.\.$", t))
        words.append((t, syl(t), brk, big, k == len(toks) - 1))
sylls = []  # (word_idx, boundary_after: 0 none,1 comma-ish,2 sentence)
for wi, (t, s, brk, big, _) in enumerate(words):
    for k in range(s):
        sylls.append((wi, (2 if big else 1 if brk else 0) if k == s - 1 else 0))
N, M = len(sylls), len(nuc)
print("pauses",[(round(a,2),round(b,2)) for a,b in pauses],file=sys.stderr)
print(f"{N} syllables, {M} nuclei, {len(pauses)} pauses", file=sys.stderr)

def pause_between(t0, t1):
    return sum(1 for a, b in pauses if a >= t0 - 0.02 and b <= t1 + 0.02)

# DP: state (i syllables matched, j last nucleus used). dp[i][j] = min cost with syllable i-1 -> nucleus j-1.
INF = 1e18
SKIP_NUC = 0.55      # a nucleus left unused (noise / extra peak)
SKIP_SYL = 1.2       # syllable squeezed with no own nucleus (it reuses the previous time)
NOPAUSE = 1.0        # phrase boundary without audible pause
BADPAUSE = 4.0       # audible pause in the middle of a phrase
dp = np.full((N + 1, M + 1), INF)
bk = np.zeros((N + 1, M + 1, 2), dtype=np.int32)
dp[0][0] = 0
# allow leading nuclei to be skipped
for j in range(1, M + 1):
    dp[0][j] = dp[0][j - 1] + SKIP_NUC * 0.5
    bk[0][j] = (0, j - 1)
for i in range(1, N + 1):
    bnd = sylls[i - 2][1] if i >= 2 else 0  # boundary between syllable i-2 and i-1
    for j in range(1, M + 1):
        best, arg = INF, (0, 0)
        # match syllable i-1 to nucleus j-1, previous syllable matched to nucleus pj-1 (pj<j), skipping nuclei between
        for pj in range(max(0, j - 7), j):
            if dp[i - 1][pj] >= INF:
                continue
            c = dp[i - 1][pj] + SKIP_NUC * (j - pj - 1)
            if i >= 2 and pj >= 1:
                gap = nuc[j - 1] - nuc[pj - 1]
                np_ = pause_between(nuc[pj - 1], nuc[j - 1])
                if np_ and bnd == 0:
                    c += BADPAUSE * np_
                if not np_ and bnd == 2:
                    c += NOPAUSE * 2
                elif not np_ and bnd == 1:
                    c += NOPAUSE * 0.4
                c += 0.5 * abs(gap - 0.17) if not np_ else 0  # typical syllable spacing
            if c < best:
                best, arg = c, (i - 1, pj)
        if dp[i - 1][j] + SKIP_SYL < best:  # two syllables share one nucleus
            best, arg = dp[i - 1][j] + SKIP_SYL, (i - 1, j)
        dp[i][j] = best
        bk[i][j] = arg
# end: allow trailing nuclei unused
tail = [dp[N][j] + SKIP_NUC * 0.5 * (M - j) for j in range(M + 1)]
j = int(np.argmin(tail))
assign = [0.0] * N
i = N
while i > 0:
    assign[i - 1] = nuc[j - 1]
    i, j = bk[i][j]
    if i == 0:
        break

# ---- syllable times -> word times ---------------------------------------------------------
out = []
k = 0
for wi, (t, s, brk, big, last) in enumerate(words):
    ts = assign[k : k + s]
    k += s
    out.append([t, ts[0], ts[-1]])
res = []
for wi, (t, a, b) in enumerate(out):
    start = max(0.0, a - 0.09)
    nxt = out[wi + 1][1] - 0.09 if wi + 1 < len(out) else b + 0.4
    end = min(nxt, b + 0.28) if nxt > b else b + 0.15
    res.append({"text": t, "start": round(start, 3), "end": round(max(end, start + 0.12), 3)})
(root / "src/data/airplane-oxygen.words.json").write_text(json.dumps({"words": res}, indent=1) + "\n")
for r in res[::6]:
    print(r["start"], r["text"], file=sys.stderr)
