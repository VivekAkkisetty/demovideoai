import type { SfxSlot } from "./AmbientSfx";

/**
 * Drop files into public/audio/ and set `src: staticFile("audio/<file>")`.
 * Left undefined so the sample renders (silently) with no assets.
 */
export const underseaSfxSlots: SfxSlot[] = [
  { id: "ocean-bed", from: 0, duration: 15, volume: 0.35, fadeSec: 1, loop: true },
  { id: "splash-dive", from: 2.4, duration: 2, volume: 0.6 },
  { id: "pile-driving", from: 5.2, duration: 5, volume: 0.55 },
  { id: "pump-hum", from: 10, duration: 5, volume: 0.45, loop: true },
];
