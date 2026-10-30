import React, { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export type Vec3 = [number, number, number];

export type CameraKeyframe = {
  frame: number;
  position: Vec3;
  target: Vec3;
  /** Perspective cameras only. */
  fov?: number;
  /** Orthographic cameras only (isometric). */
  zoom?: number;
};

export type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  zoom: number;
  quaternion: THREE.Quaternion;
};

const ease = Easing.bezier(0.33, 0, 0.67, 1);

const track = (frame: number, frames: number[], values: number[]) =>
  interpolate(frame, frames, values, {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Pure function of the frame: keeps camera, billboards and fog in sync. */
export const sampleCamera = (
  keyframes: CameraKeyframe[],
  frame: number,
  sway = 0,
): CameraPose => {
  const frames = keyframes.map((k) => k.frame);
  const axis = (pick: (k: CameraKeyframe) => number) => track(frame, frames, keyframes.map(pick));
  const t = frame / 30;
  const position = new THREE.Vector3(
    axis((k) => k.position[0]) + Math.sin(t * 0.9) * sway,
    axis((k) => k.position[1]) + Math.cos(t * 0.7) * sway * 0.6,
    axis((k) => k.position[2]),
  );
  const target = new THREE.Vector3(
    axis((k) => k.target[0]),
    axis((k) => k.target[1]),
    axis((k) => k.target[2]),
  );
  const m = new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 1, 0));
  return {
    position,
    target,
    fov: axis((k) => k.fov ?? 35),
    zoom: axis((k) => k.zoom ?? 40),
    quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
  };
};

const PoseContext = createContext<CameraPose | null>(null);
export const useCameraPose = () => {
  const pose = useContext(PoseContext);
  if (!pose) throw new Error("useCameraPose must be used inside <CameraRig>");
  return pose;
};

/**
 * Drives the R3F camera from eased keyframes (perspective or orthographic) and
 * shares the pose with children (fog, billboards).
 */
export const CameraRig: React.FC<{
  keyframes: CameraKeyframe[];
  sway?: number;
  children?: React.ReactNode;
}> = ({ keyframes, sway = 0.15, children }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const pose = useMemo(() => sampleCamera(keyframes, frame, sway), [keyframes, frame, sway]);

  useLayoutEffect(() => {
    camera.position.copy(pose.position);
    camera.quaternion.copy(pose.quaternion);
    if (camera instanceof THREE.PerspectiveCamera) camera.fov = pose.fov;
    if (camera instanceof THREE.OrthographicCamera) camera.zoom = pose.zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, pose]);

  return <PoseContext.Provider value={pose}>{children}</PoseContext.Provider>;
};
