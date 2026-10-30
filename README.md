# Telugu explainer reels (9:16, 45 s)

Two offline-rendered Instagram reels built with Three.js, rendered frame-by-frame in headless Chromium and muxed with a synthesized soundtrack.

| Reel | Page | Script | Output |
|---|---|---|---|
| Bill → Law | `src/index.html` | `src/script.json` | `out/bill-law-ela-avtundi.mp4` |
| Switch ON → light | `src/power/index.html` | `src/power/script.json` | `out/switch-on-light-ela-vastundi.mp4` |

## Pipeline (power reel)

```bash
npm install
REEL=power python3 tools/tts.py 170        # voice per line -> build/power/voiceover_22k.wav + word timings + SRT
python3 tools/mix_power.py                 # music + SFX + ducking -> build/power/mix.wav
PAGE=src/power/index.html node tools/render.mjs 0 1350 frames_power   # split the range across workers
bash tools/mux_power.sh                    # -> out/switch-on-light-ela-vastundi.mp4
```

* Every frame is a pure function of time (`window.renderFrame(f)`), so ranges can render in parallel (`tools/render.mjs <start> <end> <dir>`).
* `PAGE=... node tools/probe.mjs 1.5 12 30` renders single moments to `frames_test/` for review; `tools/cam.mjs` prints camera pose.

## Swapping in a real voice

`tools/tts.py` falls back to offline `espeak-ng` (robotic). To use any other voice, put one WAV per line id in `build/power/vo/<id>.wav` (ids are in `src/power/script.json`), then re-run the pipeline: subtitle timing, word highlights, SRT and music ducking all follow the new audio. Line durations must fit before the next line's `start`.

## Layout of the power scene

* `src/power/layout.js` – station coordinates, terrain, rail/wires, orb + power-state choreography (pure functions of `t`).
* `src/power/world.js` – geometry (mine, train, plant, pylons, substation, village, house).
* `src/power/fx.js` – stateless GPU particle emitters.
* `src/power/main.js` – camera path, post (bloom + grade/whip blur), HUD, subtitles.
* `tools/synth.py`, `tools/mix_power.py` – sound design; SFX times mirror the scene events.
