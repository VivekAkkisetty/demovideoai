import React from "react";
import * as THREE from "three";
import { palette } from "../../styles/theme";

type Layer = { thickness: number; color: string };

const DEFAULT_LAYERS: Layer[] = [
  { thickness: 1.2, color: palette.sand },
  { thickness: 1.8, color: "#C9A27A" },
  { thickness: 2.4, color: palette.rock },
];

/**
 * Stacked cylinder with a wedge removed, i.e. a geological / structural
 * cross-section. `cutAngle` is the removed wedge in radians; the two cut faces
 * are capped so the strata are visible.
 */
export const CutawayCylinder: React.FC<{
  radius: number;
  layers?: Layer[];
  cutAngle?: number;
  /** Direction the wedge opens toward (radians around Y, 0 = +Z). */
  facing?: number;
  position?: [number, number, number];
}> = ({ radius, layers = DEFAULT_LAYERS, cutAngle = Math.PI / 2, facing = 0, position = [0, 0, 0] }) => {
  const sweep = Math.PI * 2 - cutAngle;
  const start = facing + cutAngle / 2; // gap spans start+sweep → start+2π, centred on `facing`
  let y = 0;
  return (
    <group position={position}>
      {layers.map((l, i) => {
        const y0 = y;
        y += l.thickness;
        const mat = <meshStandardMaterial color={l.color} flatShading roughness={0.9} side={THREE.DoubleSide} />;
        return (
          <group key={i} position={[0, -y0 - l.thickness / 2, 0]}>
            <mesh receiveShadow rotation={[0, start, 0]}>
              <cylinderGeometry args={[radius, radius, l.thickness, 28, 1, false, 0, sweep]} />
              {mat}
            </mesh>
            {[0, sweep].map((a, k) => (
              <group key={k} rotation={[0, start + a - Math.PI / 2, 0]}>
                <mesh position={[radius / 2, 0, 0]}>
                  <planeGeometry args={[radius, l.thickness]} />
                  <meshStandardMaterial color={l.color} flatShading side={THREE.DoubleSide} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
};
