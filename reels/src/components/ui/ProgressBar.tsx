import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { palette, safeArea } from "../../styles/theme";

/** Story-style segmented progress bar; one segment per phase (frame ranges). */
export const ProgressBar: React.FC<{
  segments: { from: number; to: number }[];
  top?: number;
}> = ({ segments, top = 64 }) => {
  const frame = useCurrentFrame();
  useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: safeArea.side,
        right: safeArea.side,
        display: "flex",
        gap: 12,
      }}
    >
      {segments.map((s, i) => {
        const p = Math.min(1, Math.max(0, (frame - s.from) / (s.to - s.from)));
        return (
          <div
            key={i}
            style={{ flex: 1, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}
          >
            <div style={{ width: `${p * 100}%`, height: "100%", background: palette.white, borderRadius: 6 }} />
          </div>
        );
      })}
    </div>
  );
};
