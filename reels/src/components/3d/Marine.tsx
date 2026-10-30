import React from "react";
import * as THREE from "three";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../../styles/theme";
import { waveHeight } from "./waves";

/** Deterministic 0‒1 hash so scenes are identical on every render. */
export const rand = (i: number, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** A school of low-poly fish circling the origin. */
export const FishSchool: React.FC<{ count?: number; radius?: number; y?: number }> = ({
  count = 9,
  radius = 9,
  y = -7,
}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const r = radius + rand(i, 1) * 5;
        const a = rand(i, 2) * Math.PI * 2 + t * (0.28 + rand(i, 3) * 0.12);
        const yy = y - 2 + rand(i, 4) * 4 + Math.sin(t * 1.3 + i) * 0.3;
        const size = 0.35 + rand(i, 5) * 0.25;
        const color = palette.fish[i % palette.fish.length];
        const wag = Math.sin(t * 9 + i) * 0.5;
        return (
          <group
            key={i}
            position={[Math.cos(a) * r, yy, Math.sin(a) * r]}
            rotation={[0, -(a + Math.PI / 2), 0]}
            scale={size}
          >
            <mesh rotation={[0, 0, -Math.PI / 2]} scale={[0.8, 1.6, 0.8]} castShadow>
              <coneGeometry args={[0.5, 1, 6]} />
              <meshStandardMaterial color={color} flatShading />
            </mesh>
            <group position={[-0.75, 0, 0]} rotation={[0, wag, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.15, 0.7, 0.7]}>
                <coneGeometry args={[0.5, 1, 4]} />
                <meshStandardMaterial color={color} flatShading />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
};

/** Swaying kelp stalks rooted in the sea floor. */
export const Kelp: React.FC<{ floorY?: number; count?: number; minR?: number; maxR?: number }> = ({
  floorY = -12,
  count = 22,
  minR = 7,
  maxR = 22,
}) => {
  const t = useCurrentFrame() / 30;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i, 7) * Math.PI * 2;
        const r = minR + rand(i, 8) * (maxR - minR);
        const h = 2.5 + rand(i, 9) * 3;
        return (
          <group
            key={i}
            position={[Math.sin(a) * r, floorY, Math.cos(a) * r]}
            rotation={[Math.sin(t * 1.1 + i) * 0.12, 0, Math.cos(t * 0.9 + i * 2) * 0.12]}
          >
            <mesh position={[0, h / 2, 0]} castShadow>
              <coneGeometry args={[0.28, h, 5]} />
              <meshStandardMaterial color={palette.kelp} flatShading />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

/** Scattered boulders on the sea floor. */
export const Rocks: React.FC<{ floorY?: number; count?: number; minR?: number; maxR?: number }> = ({
  floorY = -12,
  count = 18,
  minR = 6,
  maxR = 26,
}) => (
  <>
    {Array.from({ length: count }, (_, i) => {
      const a = rand(i, 11) * Math.PI * 2;
      const r = minR + rand(i, 12) * (maxR - minR);
      const s = 0.5 + rand(i, 13) * 1.3;
      return (
        <mesh
          key={i}
          position={[Math.sin(a) * r, floorY + s * 0.3, Math.cos(a) * r]}
          rotation={[rand(i, 14) * 3, rand(i, 15) * 3, 0]}
          scale={[s, s * 0.7, s]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={palette.rock} flatShading roughness={1} />
        </mesh>
      );
    })}
  </>
);

/** Ring of marker buoys bobbing on the surface; shrink away between `fadeStart`→`fadeEnd`. */
export const BuoyRing: React.FC<{
  radius: number;
  count?: number;
  fadeStart: number;
  fadeEnd: number;
}> = ({ radius, count = 10, fadeStart, fadeEnd }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const k = interpolate(frame, [fadeStart, fadeEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const intro = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const s = k * intro;
  if (s <= 0.001) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const x = Math.sin(a) * radius;
        const z = Math.cos(a) * radius;
        return (
          <group key={i} position={[x, waveHeight(x, z, t) + 0.12, z]} scale={s}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.32, 0]} />
              <meshStandardMaterial color={i % 2 ? palette.accentHot : palette.white} flatShading />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.1, 0.5, 5]} />
              <meshStandardMaterial color={palette.accent} flatShading emissive={new THREE.Color(palette.accent)} emissiveIntensity={0.4} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};
