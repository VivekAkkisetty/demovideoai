import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../../styles/theme";
import { waveHeight } from "./waves";

type Props = {
  /** Hole in the middle (e.g. the cofferdam) so the inner level can animate independently. */
  innerRadius?: number;
  outerRadius?: number;
  rings?: number;
  segments?: number;
  y?: number;
  color?: string;
  opacity?: number;
};

/**
 * Faceted ocean: a polar grid (dense near the centre) displaced by shared
 * sine waves each frame; flat-shaded for the low-poly look. Visible from both sides.
 */
export const WaterSurface: React.FC<Props> = ({
  innerRadius = 0.01,
  outerRadius = 90,
  rings = 44,
  segments = 72,
  y = 0,
  color = palette.waterSurface,
  opacity = 0.82,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const ringR = useMemo(
    () =>
      Array.from({ length: rings + 1 }, (_, k) =>
        innerRadius + (outerRadius - innerRadius) * Math.pow(k / rings, 1.7),
      ),
    [rings, innerRadius, outerRadius],
  );

  const geometry = useMemo(() => {
    const pos = new Float32Array(rings * segments * 18);
    let i = 0;
    const vert = (r: number, j: number) => {
      const a = (j / segments) * Math.PI * 2;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      pos[i++] = x;
      pos[i++] = y + waveHeight(x, z, t);
      pos[i++] = z;
    };
    for (let k = 0; k < rings; k++) {
      for (let j = 0; j < segments; j++) {
        const [r0, r1] = [ringR[k], ringR[k + 1]];
        vert(r0, j); vert(r1, j); vert(r1, j + 1);
        vert(r0, j); vert(r1, j + 1); vert(r0, j + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [rings, segments, ringR, y, t]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={color}
        flatShading
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0.05}
        depthWrite={false}
      />
    </mesh>
  );
};
