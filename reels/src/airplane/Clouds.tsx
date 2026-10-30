import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { FPS } from "./timeline";

const hash = (n: number) => {
  const v = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return v - Math.floor(v);
};

const Cloud: React.FC<{ p: [number, number, number]; s: number; seed: number }> = ({ p, s, seed }) => {
  const puffs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        x: (i - 2) * 0.9 + (hash(seed + i) - 0.5) * 0.5,
        y: Math.sin((i / 4) * Math.PI) * 0.6 + hash(seed + i + 9) * 0.2,
        r: 0.9 + hash(seed + i + 3) * 0.6 - Math.abs(i - 2) * 0.12,
      })),
    [seed],
  );
  return (
    <group position={p} scale={s}>
      {puffs.map((u, i) => (
        <mesh key={i} position={[u.x, u.y, 0]} scale={[1.2, 0.85, 1]}>
          <icosahedronGeometry args={[u.r, 1]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#DCE8F6" emissiveIntensity={0.55} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

/** Low-poly cloud layers drifting past; a deep bank below that the plane descends into. */
export const Clouds: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const items = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const low = i < 30;
        return {
          x: (hash(i) - 0.5) * 300,
          y: low ? -14 - hash(i + 1) * 14 : 10 + hash(i + 1) * 22,
          z: low ? (hash(i + 2) - 0.3) * 60 : -20 - hash(i + 2) * 30,
          s: low ? 2.4 + hash(i + 3) * 3 : 1.6 + hash(i + 3) * 2,
        };
      }),
    [],
  );
  return (
    <group>
      {items.map((c, i) => {
        // keep close-up shots clean: nothing in front of the cabin near the camera path
        const z = Math.abs(c.x) < 16 && c.z > 2 ? c.z - 40 : c.z;
        return <Cloud key={i} seed={i * 7} s={c.s} p={[((c.x - t * 1.6 + 150) % 300) - 150, c.y, z]} />;
      })}
    </group>
  );
};
