import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../../styles/theme";

/** One corrugated (zig-zag) steel sheet pile, base at y = 0, `height` tall. */
export const makePileGeometry = (width: number, height: number, teeth = 2, depth = 0.14, thickness = 0.05) => {
  const pts = Array.from({ length: teeth * 2 + 1 }, (_, i) => ({
    x: -width / 2 + (i / (teeth * 2)) * width,
    d: i % 2 === 0 ? 0 : depth,
  }));
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].d);
  pts.slice(1).forEach((p) => shape.lineTo(p.x, p.d));
  [...pts].reverse().forEach((p) => shape.lineTo(p.x, p.d - thickness));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // extrusion (z) becomes up (y)
  return g;
};

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

type Props = {
  radius?: number;
  count?: number;
  height?: number;
  /** y of the pile's base once fully driven in. */
  baseY?: number;
  /** First pile starts sinking at this frame; the rest follow `stagger` frames apart. */
  startFrame: number;
  stagger?: number;
  dropHeight?: number;
  /** Ghost the piles facing `cutawayAzimuth` from `cutawayFrame` for a see-through cross-section. */
  cutawayFrame?: number;
  cutawayAzimuth?: number;
  cutawayHalfAngle?: number;
};

/** Ring of sheet piles that drop in one after another with a spring settle. */
export const SheetPileRing: React.FC<Props> = ({
  radius = 3,
  count = 32,
  height = 16,
  baseY = -14,
  startFrame,
  stagger = 3.4,
  dropHeight = 18,
  cutawayFrame = Infinity,
  cutawayAzimuth = 0.65,
  cutawayHalfAngle = 1.05,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = ((2 * Math.PI * radius) / count) * 1.02;
  const geometry = useMemo(() => makePileGeometry(width, height), [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const ghost = interpolate(frame, [cutawayFrame, cutawayFrame + 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const theta = (i / count) * Math.PI * 2;
        const start = startFrame + i * stagger;
        if (frame < start) return null;
        const s = spring({
          frame: frame - start,
          fps,
          config: { damping: 13, stiffness: 110, mass: 0.9 },
          durationInFrames: 30,
        });
        const d = Math.abs(wrapAngle(theta - cutawayAzimuth));
        const edge = 1 - interpolate(d, [cutawayHalfAngle - 0.3, cutawayHalfAngle], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = 1 - 0.88 * ghost * edge;
        return (
          <mesh
            key={i}
            geometry={geometry}
            position={[Math.sin(theta) * radius, baseY + dropHeight * (1 - s), Math.cos(theta) * radius]}
            rotation={[0, theta, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={i % 2 ? palette.steel : "#A3B7CC"}
              metalness={0.35}
              roughness={0.55}
              flatShading
              side={THREE.DoubleSide}
              transparent={opacity < 0.999}
              opacity={opacity}
              depthWrite={opacity > 0.99}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/** Horizontal bracing rings (walers) that pop in once the piles are down. */
export const Walers: React.FC<{ radius?: number; levels: number[]; startFrame: number }> = ({
  radius = 3.12,
  levels,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame) return null;
  return (
    <>
      {levels.map((y, i) => {
        const s = spring({ frame: frame - startFrame - i * 5, fps, config: { damping: 12, stiffness: 140 } });
        return (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[s, s, s]} castShadow>
            <torusGeometry args={[radius, 0.1, 6, 40]} />
            <meshStandardMaterial color={palette.accent} flatShading roughness={0.5} metalness={0.2} />
          </mesh>
        );
      })}
    </>
  );
};
