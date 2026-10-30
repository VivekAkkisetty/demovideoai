import React from "react";

export type StudioLightingProps = {
  /** Sun direction (also shadow origin). */
  sunPosition?: [number, number, number];
  sunIntensity?: number;
  ambient?: number;
  rimIntensity?: number;
  shadowExtent?: number;
};

/**
 * Clean low-poly studio rig:
 *  - key: directional sun with soft (PCF-soft) shadows
 *  - fill: balanced ambient + hemisphere
 *  - rim: warm back light for separation against dark / pastel backdrops
 * Enable `shadows="soft"` on the canvas.
 */
export const StudioLighting: React.FC<StudioLightingProps> = ({
  sunPosition = [18, 30, 14],
  sunIntensity = 2.4,
  ambient = 0.7,
  rimIntensity = 1.8,
  shadowExtent = 22,
}) => (
  <>
    <ambientLight intensity={ambient} color="#EAF2FF" />
    <hemisphereLight args={["#CFE6FF", "#8A7A5E", 0.55]} />
    <directionalLight
      castShadow
      position={sunPosition}
      intensity={sunIntensity}
      color="#FFF4E0"
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-camera-near={1}
      shadow-camera-far={90}
      shadow-camera-left={-shadowExtent}
      shadow-camera-right={shadowExtent}
      shadow-camera-top={shadowExtent}
      shadow-camera-bottom={-shadowExtent}
    />
    <directionalLight position={[-16, 8, -22]} intensity={rimIntensity} color="#FFB36B" />
  </>
);
