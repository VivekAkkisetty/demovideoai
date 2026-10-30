# reels – Remotion + React Three Fiber

Programmatic 3D explainer reels (1080×1920, 30 fps) in a low-poly style.

```bash
cd reels && npm install
npm run dev      # Remotion Studio (browser preview)
npm run build    # -> out/undersea-bridge.mp4
npm run still    # one PNG for quick checks
```
(`npm run dev` / `npm run build` also work from the repo root.)

On GPU-less machines (CI, containers) render with software GL:
`npm run build -- --gl=swangle`.

## Layout

| Path | Purpose |
|---|---|
| `src/compositions/` | Scenes. `UnderseaBridgeDemo` is the 15 s sample (0–5 s dive, 5–10 s sheet piles, 10–15 s dewatering). |
| `src/components/3d/` | Reusable primitives: `WaterSurface`, `LowPolyTerrain`/`Seabed`/`Island`, `SheetPileRing`, `WaterVolume`, `CutawayCylinder`, `Pipe`/`Pump`, `Barge`/`Boat`/`Truck`, `Building`/`Bridge`, `FishSchool`/`Kelp`/`Rocks`, `Badge3D`. |
| `src/components/3d/CameraRig.tsx` | Eased keyframe camera (perspective **or** orthographic/isometric) + `useCameraPose()` for billboards/fog. |
| `src/components/ui/` | `KineticSubtitles`, `ProgressBar`, `CalloutBadge`. |
| `src/audio/` | `VoiceoverTrack` and `AmbientSfx` slots (silent until you add files to `public/audio/`). |
| `src/styles/` | `theme.ts` (palette, safe areas), `lighting.tsx` (sun + ambient + warm rim), `fonts.ts` (bundled Poppins + Noto Sans Telugu). |
| `src/data/` | Subtitle timestamps (JSON). |

## Conventions

* **Every frame is a pure function of `useCurrentFrame()`** – no `useFrame`, no state updates after mount. `<ThreeCanvas>` only redraws when the frame changes, so anything that needs async work (fonts → canvas textures) must finish *before* the canvas mounts (see `useFontsReady`).
* Waves, fish, kelp etc. use deterministic math/hashes so renders are reproducible.
* Keep overlays inside `safeArea` (top 150 px, bottom 380 px) to avoid Reels/Shorts UI.
* Isometric look: `<UnderseaBridgeDemo projection="orthographic" />` (see `CAMERA_ISO`).

## Subtitles

`KineticSubtitles` takes `{ text, start, end }[]` (seconds), so word timings from any STT/forced-aligner drop straight in. Telugu, English and mixed lines work (shaping verified with Noto Sans Telugu).

## Audio

Set `voiceoverSrc` in `src/Root.tsx` (`staticFile("audio/vo.mp3")`) and fill `src` for slots in `src/audio/undersea-slots.ts`.
