import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { palette, typography } from "../../styles/theme";
import { useCameraPose } from "./CameraRig";

type Vec3 = [number, number, number];

const drawBadge = (title: string, subtitle?: string) => {
  const W = 1024, H = subtitle ? 380 : 260;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const r = 70, x = 12, y = 12, w = W - 24, h = H - 24;
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  g.fillStyle = palette.accent; g.fill();
  g.lineWidth = 12; g.strokeStyle = "#FFFFFF"; g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = palette.ink;
  g.font = `800 150px ${typography.display}`;
  g.fillText(title, W / 2, subtitle ? 135 : H / 2 + 6);
  if (subtitle) {
    g.font = `700 92px ${typography.display}`;
    g.fillStyle = "#5B3A00";
    g.fillText(subtitle, W / 2, 290);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspect: W / H };
};

/**
 * Camera-facing 3D label with a leader line and pulsing target ring.
 * Badge floats at `position`, leader ends on `target`. Always drawn on top.
 */
export const Badge3D: React.FC<{
  position: Vec3;
  target: Vec3;
  title: string;
  subtitle?: string;
  startFrame: number;
  width?: number;
}> = ({ position, target, title, subtitle, startFrame, width = 4.6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pose = useCameraPose();
  // Fonts must already be loaded (see useFontsReady in the composition): <ThreeCanvas> only
  // redraws on frame changes, so the texture has to exist on first render.
  const badge = useMemo(() => drawBadge(title, subtitle), [title, subtitle]);
  useEffect(() => () => badge.tex.dispose(), [badge]);

  if (frame < startFrame) return null;
  const s = spring({ frame: frame - startFrame, fps, config: { damping: 11, stiffness: 150 } });
  const line = Math.min(1, Math.max(0, spring({ frame: frame - startFrame - 6, fps, config: { damping: 20 } })));
  const pulse = 1 + 0.18 * Math.sin((frame - startFrame) * 0.28);

  const a = new THREE.Vector3(...position);
  const b = new THREE.Vector3(...target);
  const dir = b.clone().sub(a);
  const len = dir.length() * line;
  const mid = a.clone().add(dir.clone().normalize().multiplyScalar(len / 2));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

  return (
    <group renderOrder={999}>
      <mesh position={mid} quaternion={q}>
        <cylinderGeometry args={[0.06, 0.06, len, 6]} />
        <meshBasicMaterial color="#FFFFFF" depthTest={false} fog={false} />
      </mesh>
      <mesh position={b} quaternion={pose.quaternion} scale={pulse * line} renderOrder={999}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial color={palette.accent} depthTest={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      <group position={position} quaternion={pose.quaternion} scale={s}>
        <mesh renderOrder={1000}>
          <planeGeometry args={[width, width / badge.aspect]} />
          <meshBasicMaterial map={badge.tex} transparent depthTest={false} fog={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};
