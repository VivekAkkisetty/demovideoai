import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { palette } from "../../styles/theme";

/** Side-profile hull extruded across its beam; bow rises at +x. */
const hullGeometry = (length: number, beam: number, depth: number, bow = 0.5) => {
  const s = new THREE.Shape();
  s.moveTo(-length / 2, 0);
  s.lineTo(length / 2 - bow, 0);
  s.lineTo(length / 2, depth * 0.9);
  s.lineTo(length / 2, depth);
  s.lineTo(-length / 2, depth);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: beam, bevelEnabled: false });
  g.translate(0, 0, -beam / 2);
  return g;
};

const Hull: React.FC<{ length: number; beam: number; depth: number; color: string; bow?: number }> = ({
  length,
  beam,
  depth,
  color,
  bow,
}) => {
  const g = useMemo(() => hullGeometry(length, beam, depth, bow), [length, beam, depth, bow]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g} position={[0, -depth * 0.6, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} flatShading roughness={0.7} />
    </mesh>
  );
};

type VehicleProps = {
  position: [number, number, number];
  rotationY?: number;
  children?: React.ReactNode;
};

/** Work barge with crane. Children sit on the deck (local origin = waterline, deck at y≈0.45). */
export const Barge: React.FC<VehicleProps> = ({ position, rotationY = 0, children }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <Hull length={6.4} beam={3.2} depth={1.2} color={palette.steelDark} bow={0.7} />
    <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[6.2, 0.12, 3.0]} />
      <meshStandardMaterial color={palette.accent} flatShading />
    </mesh>
    {/* cabin */}
    <mesh position={[2.0, 1.15, 0]} castShadow>
      <boxGeometry args={[1.4, 1.3, 1.6]} />
      <meshStandardMaterial color={palette.white} flatShading />
    </mesh>
    <mesh position={[2.0, 1.4, 0.81]}>
      <boxGeometry args={[1.0, 0.5, 0.02]} />
      <meshStandardMaterial color="#5C7894" flatShading />
    </mesh>
    {/* crane */}
    <mesh position={[-1.9, 1.1, 0.9]} castShadow>
      <boxGeometry args={[0.35, 1.2, 0.35]} />
      <meshStandardMaterial color={palette.accentHot} flatShading />
    </mesh>
    <mesh position={[-1.9, 2.3, 0.9]} rotation={[0, 0, 0.9]} castShadow>
      <boxGeometry args={[3.2, 0.14, 0.14]} />
      <meshStandardMaterial color={palette.accentHot} flatShading />
    </mesh>
    {children}
  </group>
);

/** Small pastel motor boat. */
export const Boat: React.FC<VehicleProps & { color?: string }> = ({
  position,
  rotationY = 0,
  color = palette.accentHot,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <Hull length={3.2} beam={1.3} depth={0.7} color={color} bow={0.6} />
    <mesh position={[-0.2, 0.6, 0]} castShadow>
      <boxGeometry args={[1.1, 0.7, 0.9]} />
      <meshStandardMaterial color={palette.white} flatShading />
    </mesh>
  </group>
);

/** Flat-bed truck for bridge traffic; faces +x. */
export const Truck: React.FC<VehicleProps & { color?: string }> = ({
  position,
  rotationY = 0,
  color = palette.accentHot,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0.9, 0.55, 0]} castShadow>
      <boxGeometry args={[0.9, 0.9, 1.1]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
    <mesh position={[-0.5, 0.6, 0]} castShadow>
      <boxGeometry args={[1.9, 1.0, 1.15]} />
      <meshStandardMaterial color={palette.white} flatShading />
    </mesh>
    {([[-0.9, 0.55], [-0.9, -0.55], [0.9, 0.55], [0.9, -0.55]] as const).map(([x, z], i) => (
      <mesh key={i} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.2, 8]} />
        <meshStandardMaterial color={palette.ink} flatShading />
      </mesh>
    ))}
  </group>
);
