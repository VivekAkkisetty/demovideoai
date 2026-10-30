import React, { useMemo } from "react";
import * as THREE from "three";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MECH, sec } from "./timeline";

type Vec3 = [number, number, number];

export const COL = {
  hull: "#F2F6FB",
  hullShade: "#D5DFEC",
  wall: "#E7EDF5",
  floor: "#7C8CA6",
  ceiling: "#F8FAFD",
  void: "#3A4660",
  seat: "#5E82B8",
  seatDark: "#46679A",
  accent: "#FF8A5B",
  sky: "#BFE0FF",
  glass: "#8FC4EE",
  yellow: "#FFD60A",
};

const Box: React.FC<{ p: Vec3; s: Vec3; c: string; r?: Vec3; shadow?: boolean }> = ({ p, s, c, r, shadow = true }) => (
  <mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} flatShading roughness={0.8} />
  </mesh>
);

// ---- Cabin geometry constants (shared with the oxygen rig) ---------------------------------
export const CABIN = { halfLen: 5.5, floorY: -1, ceilY: 2.6, backZ: -2.6, topY: 4.4 };
export const HATCH: Vec3 = [0.3, CABIN.ceilY, 0];

const Seat: React.FC<{ x: number; z: number; tone?: string }> = ({ x, z, tone = COL.seat }) => (
  <group position={[x, CABIN.floorY, z]}>
    <Box p={[0, 0.22, 0]} s={[0.18, 0.44, 0.18]} c={COL.hullShade} />
    <Box p={[0.05, 0.5, 0]} s={[0.85, 0.22, 0.8]} c={tone} />
    <Box p={[-0.38, 1.1, 0]} s={[0.16, 1.1, 0.8]} c={tone} />
    <Box p={[-0.38, 1.78, 0]} s={[0.2, 0.34, 0.5]} c={COL.seatDark} />
    <Box p={[0.05, 0.72, -0.43]} s={[0.7, 0.12, 0.06]} c={COL.seatDark} />
    <Box p={[0.05, 0.72, 0.43]} s={[0.7, 0.12, 0.06]} c={COL.seatDark} />
  </group>
);

const Window: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 0.95, CABIN.backZ + 0.03]}>
    <Box p={[0, 0, 0]} s={[0.95, 0.75, 0.05]} c="#FFFFFF" shadow={false} />
    <mesh position={[0, 0, 0.04]}>
      <planeGeometry args={[0.75, 0.55]} />
      <meshBasicMaterial color={COL.sky} />
    </mesh>
    <mesh position={[0.12, -0.06, 0.05]}>
      <icosahedronGeometry args={[0.13, 0]} />
      <meshBasicMaterial color="#FFFFFF" />
    </mesh>
  </group>
);

/** Cutaway cabin: floor, back wall + windows, seats, ceiling slab with the PSU hatch, overhead space. */
export const Cabin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = spring({
    frame: frame - sec(MECH.hatchOpen),
    fps,
    config: { damping: 7, stiffness: 90, mass: 0.7 },
  });
  const { halfLen: H, floorY, ceilY, backZ, topY } = CABIN;
  const L = H * 2;
  return (
    <group>
      {/* floor + cargo hold */}
      <Box p={[0, floorY - 0.15, 0]} s={[L, 0.3, 5.4]} c={COL.floor} />
      <Box p={[0, floorY - 1.1, backZ / 2]} s={[L, 1.6, 2.8]} c={COL.hullShade} />
      {/* back wall + windows */}
      <Box p={[0, (floorY + topY) / 2, backZ - 0.05]} s={[L, topY - floorY, 0.1]} c={COL.wall} />
      {[-4.2, -2.1, 0, 2.1, 4.2].map((x) => (
        <Window key={x} x={x} />
      ))}
      {/* ceiling slab with a hatch-shaped hole */}
      <Box p={[-2.6, ceilY + 0.08, 0]} s={[5.2, 0.16, 5.4]} c={COL.ceiling} />
      <Box p={[3.9, ceilY + 0.08, 0]} s={[3.2, 0.16, 5.4]} c={COL.ceiling} />
      <Box p={[0.3, ceilY + 0.08, -1.55]} s={[1.0, 0.16, 2.2]} c={COL.ceiling} />
      <Box p={[0.3, ceilY + 0.08, 1.55]} s={[1.0, 0.16, 2.2]} c={COL.ceiling} />
      {/* cut edges, drawn as bright section frames */}
      {[-H, H].map((x) => (
        <group key={x}>
          <Box p={[x, (floorY + topY) / 2, 0]} s={[0.12, topY - floorY + 0.4, 0.12]} c={COL.accent} r={[0, 0, 0]} shadow={false} />
          <Box p={[x, ceilY + 0.1, backZ / 2]} s={[0.12, 0.2, 2.8]} c={COL.accent} shadow={false} />
        </group>
      ))}
      {/* overhead space: shelf, ribs, back panel details */}
      <Box p={[0, topY + 0.1, backZ / 2]} s={[L, 0.2, 2.8]} c={COL.hullShade} />
      {[-4.6, -1.6, 2.2, 4.8].map((x) => (
        <Box key={x} p={[x, (ceilY + topY) / 2, backZ + 0.1]} s={[0.12, topY - ceilY, 0.12]} c={COL.hullShade} shadow={false} />
      ))}
      {[-3.4, 3.4].map((x) => (
        <Box key={x} p={[x, ceilY + 0.9, backZ + 0.08]} s={[1.6, 0.5, 0.1]} c="#C9D4E4" shadow={false} />
      ))}
      {/* seats: window + aisle seat per row */}
      {[-3.3, 0.3, 3.6].map((x) => (
        <group key={x}>
          <Seat x={x} z={-1.65} />
          <Seat x={x} z={-0.45} tone="#6C8FC4" />
        </group>
      ))}
      {/* hatch door, hinged on its back edge so it swings clear of the mask */}
      <group position={[HATCH[0], ceilY + 0.02, -0.5]} rotation={[open * 1.75, 0, 0]}>
        <Box p={[0, 0, 0.5]} s={[1.0, 0.07, 1.0]} c={COL.accent} />
        <Box p={[0, -0.05, 0.5]} s={[0.8, 0.03, 0.8]} c="#FFB08A" shadow={false} />
      </group>
      {/* dark void in the hole so the opening reads */}
      <mesh position={[HATCH[0], ceilY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshBasicMaterial color={COL.void} />
      </mesh>
    </group>
  );
};

const wingShape = (sign: 1 | -1) => {
  const s = new THREE.Shape();
  // planform in (x, z): root chord along the fuselage, tip swept back (-x)
  s.moveTo(14, 0);
  s.lineTo(4, 0);
  s.lineTo(-17, sign * 16);
  s.lineTo(-14, sign * 16);
  s.lineTo(7, sign * 2);
  s.closePath();
  return s;
};

/** Full airliner around the cutaway section: nose, tail, wings, engines, exterior windows. */
export const Fuselage: React.FC = () => {
  const R = 4;
  const cy = 1;
  const wing = useMemo(
    () => [1, -1].map((sg) => new THREE.ExtrudeGeometry(wingShape(sg as 1 | -1), { depth: 0.28, bevelEnabled: false })),
    [],
  );
  const stab = useMemo(
    () => [1, -1].map((sg) => {
      const s = new THREE.Shape();
      s.moveTo(-21, 0);
      s.lineTo(-27, 0);
      s.lineTo(-31, sg * 8);
      s.lineTo(-29, sg * 8);
      s.lineTo(-21, sg * 1);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    }),
    [],
  );
  const fin = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-20, cy + 2);
    s.lineTo(-28, cy + 2.5);
    s.lineTo(-32, cy + 11);
    s.lineTo(-29, cy + 11);
    s.lineTo(-23, cy + 3.8);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
  }, []);
  const segs = [
    { x0: 5.5, x1: 22 },
    { x0: -22, x1: -5.5 },
  ];
  const winX = [] as number[];
  for (let x = -24; x <= 22; x += 1.8) if (Math.abs(x) > 6.5) winX.push(x);
  return (
    <group>
      {segs.map((s) => (
        <mesh key={s.x0} position={[(s.x0 + s.x1) / 2, cy, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, s.x1 - s.x0, 14, 1, false]} />
          <meshStandardMaterial color={COL.hull} flatShading roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* nose + tail cones */}
      <mesh position={[22 + 3.5, cy, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[R, 7, 14]} />
        <meshStandardMaterial color={COL.hull} flatShading roughness={0.7} />
      </mesh>
      <mesh position={[-22 - 4.5, cy + 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[R, 9, 14]} />
        <meshStandardMaterial color={COL.hull} flatShading roughness={0.7} />
      </mesh>
      <mesh position={[22 + 3.1, cy + 1.2, 0]}>
        <boxGeometry args={[2.4, 0.9, 2.2]} />
        <meshStandardMaterial color="#35507A" flatShading />
      </mesh>
      {/* accent belly stripe */}
      {segs.map((s) => (
        <mesh key={`b${s.x0}`} position={[(s.x0 + s.x1) / 2, cy - 1.1, R * 0.93]}>
          <boxGeometry args={[s.x1 - s.x0, 0.35, 0.1]} />
          <meshStandardMaterial color={COL.accent} flatShading />
        </mesh>
      ))}
      {/* exterior windows (near side) */}
      {winX.map((x) => (
        <mesh key={x} position={[x, cy + 0.2, 3.97]}>
          <boxGeometry args={[0.55, 0.7, 0.12]} />
          <meshStandardMaterial color="#35507A" flatShading />
        </mesh>
      ))}
      {/* wings */}
      <group position={[0, cy - 3.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {wing.map((g, i) => (
          <mesh key={i} geometry={g} castShadow receiveShadow position={[0, 0, -0.14]} scale={[1, i === 0 ? -1 : -1, 1]}>
            <meshStandardMaterial color="#DCE6F2" flatShading roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {[-1, 1].map((sg) => (
        <group key={sg} position={[4.5, cy - 4.3, sg * 6.2]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[1.05, 1.05, 4.2, 10]} />
            <meshStandardMaterial color="#C3CFE0" flatShading roughness={0.5} />
          </mesh>
          <mesh position={[2.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.8, 0.95, 0.15, 10]} />
            <meshStandardMaterial color="#35507A" flatShading />
          </mesh>
        </group>
      ))}
      {/* tail */}
      <group position={[0, 0, 0]}>
        <mesh geometry={fin} position={[0, 0, -0.15]} castShadow>
          <meshStandardMaterial color={COL.accent} flatShading roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <group position={[0, cy + 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {stab.map((g, i) => (
            <mesh key={i} geometry={g} castShadow position={[0, 0, -0.1]}>
              <meshStandardMaterial color="#DCE6F2" flatShading side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};
