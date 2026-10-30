import React from "react";
import * as THREE from "three";
import { interpolate } from "remotion";
import { palette } from "../../styles/theme";
import { useCameraPose } from "./CameraRig";

const sky = new THREE.Color(palette.skyTop);
const mid = new THREE.Color(palette.waterDeep);
const abyss = new THREE.Color(palette.waterAbyss);

/**
 * Background + fog that cross-fade from pastel sky to deep water as the camera
 * passes the surface (y = 0), then darken slowly with depth.
 */
export const UnderwaterAtmosphere: React.FC = () => {
  const { position } = useCameraPose();
  const under = interpolate(-position.y, [-1.2, 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const depth = interpolate(-position.y, [1, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const water = mid.clone().lerp(abyss, depth * 0.7);
  const c = sky.clone().lerp(water, under);
  const near = interpolate(under, [0, 1], [45, 32]);
  const far = interpolate(under, [0, 1], [150, 120]);
  return (
    <>
      <color attach="background" args={[c]} />
      <fog attach="fog" args={[c, near, far]} />
    </>
  );
};

/** A puffy low-poly cloud: a few merged icosahedra. */
export const Cloud: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => (
  <group position={position} scale={scale}>
    {(
      [
        [0, 0, 0, 3],
        [3, -0.4, 0.5, 2.3],
        [-3, -0.5, -0.3, 2.2],
        [1.2, 1.2, 0, 2.2],
      ] as const
    ).map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]}>
        <icosahedronGeometry args={[r, 0]} />
        <meshStandardMaterial color="#FFFFFF" flatShading roughness={1} fog={false} />
      </mesh>
    ))}
  </group>
);
