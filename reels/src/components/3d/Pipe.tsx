import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { palette } from "../../styles/theme";

type Props = {
  points: [number, number, number][];
  radius?: number;
  color?: string;
  /** 0‒1 portion of the pipe that has "grown" so far. */
  progress?: number;
  /** When set, animated droplets travel along the pipe (frame-driven). */
  flowFrame?: number;
  flowCount?: number;
  flowColor?: string;
};

/** Smooth hose / pipe through control points, optionally with flowing droplets. */
export const Pipe: React.FC<Props> = ({
  points,
  radius = 0.16,
  color = palette.steelDark,
  progress = 1,
  flowFrame,
  flowCount = 9,
  flowColor = "#9BE7FF",
}) => {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 90, radius, 8, false), [curve, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * Math.min(1, Math.max(0, progress))));

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} flatShading roughness={0.5} metalness={0.2} />
      </mesh>
      {flowFrame !== undefined &&
        progress >= 1 &&
        Array.from({ length: flowCount }, (_, i) => {
          const u = (flowFrame * 0.012 + i / flowCount) % 1;
          const p = curve.getPoint(u);
          return (
            <mesh key={i} position={p}>
              <icosahedronGeometry args={[radius * 1.25, 0]} />
              <meshBasicMaterial color={flowColor} fog={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Compact dewatering pump: base, tank, motor and gauge. Shakes slightly while running. */
export const Pump: React.FC<{
  position: [number, number, number];
  running?: boolean;
  frame?: number;
}> = ({ position, running = false, frame = 0 }) => {
  const shake = running ? Math.sin(frame * 1.9) * 0.012 : 0;
  return (
    <group position={[position[0], position[1] + shake, position[2]]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[1.4, 0.2, 0.9]} />
        <meshStandardMaterial color={palette.steelDark} flatShading />
      </mesh>
      <mesh position={[-0.25, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.7, 8]} />
        <meshStandardMaterial color={palette.accentHot} flatShading roughness={0.5} />
      </mesh>
      <mesh position={[0.4, 0.45, 0]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.5]} />
        <meshStandardMaterial color={palette.accent} flatShading roughness={0.5} />
      </mesh>
      <mesh position={[-0.25, 1.0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 8]} />
        <meshStandardMaterial color="#FFFFFF" flatShading />
      </mesh>
    </group>
  );
};
