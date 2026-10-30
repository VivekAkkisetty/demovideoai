import React from "react";
import { palette } from "../../styles/theme";

type BuildingProps = {
  position: [number, number, number];
  width?: number;
  depth?: number;
  floors?: number;
  floorHeight?: number;
  color?: string;
};

/** Boxy low-poly building with a roof slab and window bands. */
export const Building: React.FC<BuildingProps> = ({
  position,
  width = 2.4,
  depth = 2.4,
  floors = 4,
  floorHeight = 0.9,
  color = palette.buildings[0],
}) => {
  const h = floors * floorHeight;
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, h, depth]} />
        <meshStandardMaterial color={color} flatShading roughness={0.85} />
      </mesh>
      <mesh position={[0, h + 0.12, 0]} castShadow>
        <boxGeometry args={[width + 0.2, 0.24, depth + 0.2]} />
        <meshStandardMaterial color={palette.concrete} flatShading />
      </mesh>
      {Array.from({ length: floors }, (_, f) => (
        <mesh key={f} position={[0, f * floorHeight + floorHeight * 0.55, 0]}>
          <boxGeometry args={[width + 0.03, floorHeight * 0.32, depth * 0.72]} />
          <meshStandardMaterial color="#6E8FB3" flatShading emissive="#2B4668" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Girder bridge along +x at z = `position[2]`: deck at deckY on pylons that
 * reach down to `floorY`.
 */
export const Bridge: React.FC<{
  position: [number, number, number];
  length: number;
  deckY?: number;
  floorY?: number;
  spacing?: number;
  width?: number;
}> = ({ position, length, deckY = 6, floorY = -12.5, spacing = 14, width = 3.6 }) => {
  const pylons = Math.floor(length / spacing) + 1;
  return (
    <group position={position}>
      <mesh position={[length / 2, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.5, width]} />
        <meshStandardMaterial color={palette.concrete} flatShading />
      </mesh>
      <mesh position={[length / 2, deckY + 0.4, width / 2 - 0.05]}>
        <boxGeometry args={[length, 0.35, 0.1]} />
        <meshStandardMaterial color={palette.accent} flatShading />
      </mesh>
      <mesh position={[length / 2, deckY + 0.4, -width / 2 + 0.05]}>
        <boxGeometry args={[length, 0.35, 0.1]} />
        <meshStandardMaterial color={palette.accent} flatShading />
      </mesh>
      {Array.from({ length: pylons }, (_, i) => (
        <mesh key={i} position={[i * spacing + 1, (deckY + floorY) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1.1, deckY - floorY, 8]} />
          <meshStandardMaterial color={palette.concrete} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};
