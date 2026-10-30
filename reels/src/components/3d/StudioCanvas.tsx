import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";
import { StudioLighting, type StudioLightingProps } from "../../styles/lighting";

/**
 * Standard canvas: soft shadows, sRGB, ACES-ish tone mapping, studio lights.
 * `projection="orthographic"` gives the isometric explainer look; pair with
 * `zoom` in CameraRig keyframes.
 */
export const StudioCanvas: React.FC<{
  projection?: "perspective" | "orthographic";
  lighting?: StudioLightingProps;
  children: React.ReactNode;
}> = ({ projection = "perspective", lighting, children }) => {
  const { width, height } = useVideoConfig();
  const ortho = projection === "orthographic";
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows="soft"
      orthographic={ortho}
      camera={
        ortho
          ? { position: [20, 20, 20], zoom: 40, near: -200, far: 400 }
          : { position: [0, 0, 20], fov: 35, near: 0.1, far: 400 }
      }
      gl={{ antialias: true, toneMapping: 4 /* ACESFilmic */ }}
    >
      <StudioLighting {...lighting} />
      {children}
    </ThreeCanvas>
  );
};
