import React from "react";
import * as THREE from "three";
import { palette } from "../../styles/theme";

type Props = {
  radius: number;
  floorY: number;
  /** Current water level (y). Drains by lowering this. */
  level: number;
  /** Top of the enclosure; the air column spans level → topY. */
  topY: number;
  /** 0‒1 fade for the whole volume. */
  opacity?: number;
};

/**
 * Water body inside a cylindrical enclosure. The part above `level` is rendered
 * as a pale "air" column so the drop reads clearly even from underwater.
 */
export const WaterVolume: React.FC<Props> = ({ radius, floorY, level, topY, opacity = 1 }) => {
  const h = Math.max(0.001, level - floorY);
  const airH = Math.max(0.001, topY - level);
  return (
    <group>
      <mesh position={[0, floorY + h / 2, 0]} scale={[1, h, 1]}>
        <cylinderGeometry args={[radius, radius, 1, 24, 1, true]} />
        <meshStandardMaterial
          color={palette.waterInner}
          transparent
          opacity={0.38 * opacity}
          side={THREE.DoubleSide}
          flatShading
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, level, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 24]} />
        <meshStandardMaterial
          color="#BFF2E2"
          transparent
          opacity={0.7 * opacity}
          side={THREE.DoubleSide}
          flatShading
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, level + airH / 2, 0]} scale={[1, airH, 1]} renderOrder={2}>
        <cylinderGeometry args={[radius, radius, 1, 24, 1, true]} />
        <meshBasicMaterial
          color="#EAF8FF"
          transparent
          opacity={0.3 * opacity}
          side={THREE.BackSide}
          fog={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
