/** Shared wave field so the surface, buoys and barge all agree on height. */
export const waveHeight = (x: number, z: number, t: number): number =>
  0.16 * Math.sin(x * 0.55 + t * 1.6) +
  0.14 * Math.cos(z * 0.62 - t * 1.25) +
  0.09 * Math.sin((x + z) * 0.95 + t * 2.1);
