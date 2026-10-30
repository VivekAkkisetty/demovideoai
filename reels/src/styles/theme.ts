/** Global video format: 9:16 vertical, Reels / Shorts. */
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/** Pastel low-poly palette shared by every scene. */
export const palette = {
  skyTop: "#BCD8FF",
  skyHorizon: "#FFE2CF",
  waterSurface: "#62CFE3",
  waterDeep: "#12506E",
  waterAbyss: "#0A2B44",
  waterInner: "#8CC7A6",
  sand: "#F3DBA8",
  sandDark: "#D9B97C",
  sandWet: "#9C8156",
  grass: "#9ED69B",
  rock: "#9AA6BA",
  steel: "#93A8BF",
  steelDark: "#5A6E86",
  concrete: "#E9E4DA",
  accent: "#FFB84D",
  accentHot: "#FF7A59",
  mint: "#8EF0C8",
  ink: "#0E1020",
  white: "#FFFFFF",
  kelp: "#58C28B",
  fish: ["#FF9F7A", "#FFD36B", "#9AD7FF", "#F6A6D8"],
  buildings: ["#F7B7A3", "#FFE3A3", "#BFE3F2", "#D9C6F0"],
} as const;

export const typography = {
  display: '"Poppins", "Noto Sans Telugu", system-ui, sans-serif',
} as const;

/** Safe zones (px) so Reels / Shorts UI chrome never covers overlays. */
export const safeArea = { top: 150, bottom: 380, side: 56 } as const;
