import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, typography } from "../../styles/theme";

/** Pill badge with icon that pops in. Wrap in a <Sequence> so the spring restarts per use. */
export const CalloutBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  color?: string;
  style?: React.CSSProperties;
}> = ({ icon, label, sublabel, color = palette.accent, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 11, stiffness: 170 } });
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 20,
        padding: "18px 36px 18px 24px",
        borderRadius: 999,
        background: color,
        color: palette.ink,
        border: "6px solid #fff",
        boxShadow: "0 10px 0 rgba(0,0,0,0.25)",
        fontFamily: typography.display,
        transform: `scale(${s}) rotate(${(1 - s) * -6}deg)`,
        transformOrigin: "left center",
        ...style,
      }}
    >
      <div style={{ display: "flex" }}>{icon}</div>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: 46, fontWeight: 800 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.75 }}>{sublabel}</div>}
      </div>
    </div>
  );
};
