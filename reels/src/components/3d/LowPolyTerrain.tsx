import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { palette } from "../../styles/theme";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Deterministic pseudo-noise in roughly [-1.5, 1.5]. */
export const noise2 = (x: number, z: number) =>
  Math.sin(x * 0.35) * Math.cos(z * 0.31) + 0.5 * Math.sin(x * 0.9 + z * 0.7);

type TerrainProps = {
  radius: number;
  rings?: number;
  segments?: number;
  height: (x: number, z: number) => number;
  color: (x: number, z: number, h: number) => THREE.Color;
  position?: [number, number, number];
};

/** Generic faceted terrain on a polar grid (vertex-coloured, flat-shaded). */
export const LowPolyTerrain: React.FC<TerrainProps> = ({
  radius,
  rings = 34,
  segments = 64,
  height,
  color,
  position = [0, 0, 0],
}) => {
  const geometry = useMemo(() => {
    const n = rings * segments * 6;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    let i = 0;
    const R = (k: number) => radius * Math.pow(k / rings, 1.4);
    const tri = (p0: [number, number], p1: [number, number], p2: [number, number]) => {
      const pts = [p0, p1, p2].map(([r, j]) => {
        const ang = (j / segments) * Math.PI * 2;
        const x = Math.sin(ang) * r;
        const z = Math.cos(ang) * r;
        return { x, z, h: height(x, z) };
      });
      // face colour from the centroid keeps facets crisp
      const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const cz = (pts[0].z + pts[1].z + pts[2].z) / 3;
      const ch = (pts[0].h + pts[1].h + pts[2].h) / 3;
      const c = color(cx, cz, ch);
      for (const p of pts) {
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.h; pos[i * 3 + 2] = p.z;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        i++;
      }
    };
    for (let k = 0; k < rings; k++) {
      for (let j = 0; j < segments; j++) {
        const r0 = R(k), r1 = R(k + 1);
        tri([r0, j], [r1, j], [r1, j + 1]);
        tri([r0, j], [r1, j + 1], [r0, j + 1]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [radius, rings, segments, height, color]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} />
    </mesh>
  );
};

const sandA = new THREE.Color(palette.sand);
const sandB = new THREE.Color(palette.sandDark);

/** Sea floor with a flat working plateau in the middle (for the cofferdam). */
export const Seabed: React.FC<{ floorY?: number; plateau?: number }> = ({
  floorY = -12,
  plateau = 5,
}) => {
  const height = useMemo(
    () => (x: number, z: number) => {
      const r = Math.hypot(x, z);
      const k = smooth(plateau, plateau + 8, r);
      return floorY + k * (noise2(x, z) * 0.9 + (r - plateau) * 0.015);
    },
    [floorY, plateau],
  );
  const color = useMemo(
    () => (x: number, z: number) => sandA.clone().lerp(sandB, 0.5 + 0.5 * noise2(x * 1.7, z * 1.3) / 1.5),
    [],
  );
  return <LowPolyTerrain radius={120} rings={40} segments={72} height={height} color={color} />;
};

const grass = new THREE.Color(palette.grass);
const beach = new THREE.Color(palette.sand);
const stone = new THREE.Color(palette.rock);

/** Background island rising out of the sea (floor at `floorY`). */
export const Island: React.FC<{
  position: [number, number, number];
  radius?: number;
  peak?: number;
  floorY?: number;
}> = ({ position, radius = 15, peak = 4, floorY = -12 }) => {
  const height = useMemo(
    () => (x: number, z: number) => {
      const r = Math.hypot(x, z) / radius;
      const base = floorY + (peak - floorY) * Math.pow(Math.max(0, 1 - r), 0.9);
      return Math.max(floorY, base + noise2(x, z) * 0.25 * (1 - r));
    },
    [radius, peak, floorY],
  );
  const color = useMemo(
    () => (_x: number, _z: number, h: number) =>
      h < 0.4 ? beach : h > 3 ? stone.clone().lerp(grass, 0.5) : grass,
    [],
  );
  return <LowPolyTerrain radius={radius} rings={22} segments={40} height={height} color={color} position={position} />;
};

/** Height of an Island's surface at world (x, z), for placing buildings on it. */
export const islandHeight = (
  center: [number, number, number],
  x: number,
  z: number,
  radius = 15,
  peak = 4,
  floorY = -12,
) => {
  const dx = x - center[0], dz = z - center[2];
  const r = Math.hypot(dx, dz) / radius;
  const base = floorY + (peak - floorY) * Math.pow(Math.max(0, 1 - r), 0.9);
  return Math.max(floorY, base + noise2(dx, dz) * 0.25 * (1 - r));
};
