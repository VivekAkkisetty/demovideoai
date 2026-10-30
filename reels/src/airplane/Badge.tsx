import React from "react";
import { Html, Line } from "@react-three/drei";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { typography } from "../styles/theme";
import { sec } from "./timeline";

type Vec3 = [number, number, number];

/** Rounded pill pinned to a 3D coordinate (drei <Html>) with an optional pointer line to `target`. */
export const FloatingBadge: React.FC<{
  position: Vec3;
  target?: Vec3;
  from: number;
  to: number;
  label: string;
  sub?: string;
  bg?: string;
  fg?: string;
  icon?: string;
  size?: number;
}> = ({ position, target, from, to, label, sub, bg = "#FFC727", fg = "#101322", icon, size = 46 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = sec(from);
  const f1 = sec(to);
  if (frame < f0 || frame > f1 + 10) return null;
  const pop = spring({ frame: frame - f0, fps, config: { damping: 11, stiffness: 160 } });
  const out = interpolate(frame, [f1, f1 + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = spring({ frame: frame - f0 - 5, fps, config: { damping: 22 } });
  const bob = Math.sin((frame - f0) * 0.12) * 0.04;
  const p: Vec3 = [position[0], position[1] + bob, position[2]];
  return (
    <group>
      {target && (
        <Line
          points={[p, [p[0] + (target[0] - p[0]) * line, p[1] + (target[1] - p[1]) * line, p[2] + (target[2] - p[2]) * line]]}
          color="#FFFFFF"
          lineWidth={4}
          depthTest={false}
          transparent
          opacity={out}
          renderOrder={999}
        />
      )}
      <Html position={p} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            whiteSpace: "nowrap",
            padding: "16px 34px",
            borderRadius: 999,
            background: bg,
            color: fg,
            border: "6px solid #fff",
            boxShadow: "0 10px 0 rgba(15,20,45,0.28)",
            fontFamily: typography.display,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.1,
            letterSpacing: 0.5,
            textAlign: "center",
            opacity: out,
            transform: `scale(${pop * (0.9 + 0.1 * out)}) rotate(${(1 - pop) * -5}deg)`,
          }}
        >
          {icon && <span style={{ fontSize: size * 1.1 }}>{icon}</span>}
          <span>
            {label}
            {sub && <div style={{ fontSize: size * 0.62, fontWeight: 700, opacity: 0.8, marginTop: 4 }}>{sub}</div>}
          </span>
        </div>
      </Html>
    </group>
  );
};
