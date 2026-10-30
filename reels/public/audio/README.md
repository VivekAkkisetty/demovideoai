Drop voiceover / ambient / SFX files here (mp3, wav, m4a).
Wire them up with `staticFile("audio/<name>")`:
- voiceover: pass `voiceoverSrc` as a composition prop (see src/Root.tsx defaultProps)
- ambient / SFX: set `src` on the slots in src/audio/undersea-slots.ts
