import React, { useMemo } from "react";
import * as THREE from "three";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CABIN, COL, HATCH } from "./Plane";
import { FPS, MECH, T, sec } from "./timeline";

type Vec3 = [number, number, number];
const ramp = (t: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

export const CAN = { x: HATCH[0], base: CABIN.ceilY + 0.16, h: 0.95, r: 0.3 };
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Pure functions of time (seconds) shared by tube, mask and particles. */
const maskState = (t: number, fps: number) => {
  const k = t - MECH.maskDrop;
  if (k < 0) return { L: 0.05, theta: 0, k };
  const drop = spring({ frame: k * fps, fps, config: { damping: 6, stiffness: 55, mass: 0.9 } });
  const L = 0.05 + 1.2 * drop;
  const theta = 0.55 * Math.exp(-0.9 * k) * Math.cos(4.6 * k);
  return { L, theta, k };
};

const tubePoints = (t: number, fps: number) => {
  const { L, theta } = maskState(t, fps);
  const top = new THREE.Vector3(CAN.x, CAN.base, 0);
  const pts: THREE.Vector3[] = [new THREE.Vector3(CAN.x, CAN.base + 0.1, 0), top.clone()];
  const N = 18;
  for (let i = 1; i <= N; i++) {
    const s = i / N;
    const th = maskState(t - 0.1 * (1 - s), fps).theta;
    const coil = Math.min(1, s * 6) * 0.1 * Math.min(1, L / 0.6);
    const a = s * L * 22;
    pts.push(
      new THREE.Vector3(
        top.x + L * s * Math.sin(th) + Math.cos(a) * coil,
        top.y - L * s * Math.cos(th),
        Math.sin(a) * coil,
      ),
    );
  }
  void theta;
  return pts;
};

export const maskPosition = (t: number, fps: number): { pos: THREE.Vector3; theta: number } => {
  const pts = tubePoints(t, fps);
  return { pos: pts[pts.length - 1].clone(), theta: maskState(t, fps).theta };
};

const Mask: React.FC<{ fill: number }> = ({ fill }) => (
  <group>
    <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.36, 0.3, 8, 1, true]} />
      <meshStandardMaterial color={COL.yellow} flatShading roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, 0.14]} rotation={[0, 0, Math.PI / 8]}>
      <circleGeometry args={[0.2, 8]} />
      <meshStandardMaterial color={COL.yellow} flatShading />
    </mesh>
    <mesh position={[0, 0, -0.15]} rotation={[0, 0, Math.PI / 8]}>
      <circleGeometry args={[0.31, 8]} />
      <meshStandardMaterial color="#2B3550" flatShading side={THREE.DoubleSide} />
    </mesh>
    {/* reservoir bag inflates with oxygen */}
    <mesh position={[0, -0.42 - 0.15 * fill, 0.05]} scale={[0.3 + 0.12 * fill, 0.38 + 0.2 * fill, 0.2 + 0.12 * fill]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#F6F8FF" flatShading transparent opacity={0.9} />
    </mesh>
    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.36, 0.025, 4, 16]} />
      <meshStandardMaterial color="#E0A800" flatShading />
    </mesh>
  </group>
);

const pelletPos = Array.from({ length: 70 }, (_, i) => {
  const a = hash(i) * Math.PI * 2;
  const r = Math.sqrt(hash(i + 50)) * 0.17;
  return { p: [Math.cos(a) * r, 0.08 + hash(i + 99) * 0.5, Math.sin(a) * r] as Vec3, rot: hash(i + 7) * 3, fe: hash(i + 3) > 0.5 };
});

/** Canister + glass cutaway + firing mechanism + chemical core (animated by mechanism beats). */
const Canister: React.FC<{ t: number; glow: number }> = ({ t, glow }) => {
  const shell = ramp(t, T.mechanism - 0.8, T.mechanism + 0.2); // 0 metallic -> 1 glass
  const pull = ramp(t, MECH.pullStart, MECH.pullEnd);
  const strikeK = ramp(t, MECH.strike - 0.18, MECH.strike, Easing.in(Easing.quad));
  const pinHead = 0.9 - 0.14 * strikeK;
  const retainerX = 0.08 + 0.3 * pull;
  const fall = Math.max(0, t - MECH.pullEnd);
  const flash = interpolate(t, [MECH.strike, MECH.strike + 0.08, MECH.strike + 0.5], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spring_ = useMemo(() => {
    const roof = 0.98;
    const turns = 6;
    const len = roof - pinHead;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const s = i / 48;
      const a = s * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.07, roof - s * len, Math.sin(a) * 0.07));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.012, 4, false);
  }, [pinHead]);

  const cord = useMemo(() => {
    const y = 0.9;
    const x0 = retainerX + 0.05;
    const wob = (1 - pull) * 0.06;
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(x0, y, 0),
        new THREE.Vector3(0.4, y - 0.04, 0.02),
        new THREE.Vector3(0.42 + wob, y - 0.5, 0.0),
        new THREE.Vector3(0.38 - wob, y - 1.4, 0.0),
        new THREE.Vector3(0.4, y - 2.6, 0),
      ]),
      30,
      0.012,
      4,
      false,
    );
  }, [retainerX, pull]);

  const metal = 1 - shell;
  const hot = new THREE.Color("#FF4B1F").multiplyScalar(glow * 1.2);
  return (
    <group position={[CAN.x, CAN.base, 0]}>
      {/* metal skin fades out, glass + wireframe fades in */}
      <mesh position={[0, CAN.h / 2, 0]} castShadow>
        <cylinderGeometry args={[CAN.r, CAN.r, CAN.h, 12]} />
        <meshStandardMaterial
          color="#C98A4B"
          flatShading
          roughness={0.4}
          metalness={0.35}
          transparent
          opacity={0.14 + 0.86 * metal}
          depthWrite={metal > 0.95}
        />
      </mesh>
      <mesh position={[0, CAN.h + 0.07, 0]} castShadow>
        <coneGeometry args={[CAN.r, 0.14, 12]} />
        <meshStandardMaterial color="#B6753A" flatShading roughness={0.4} metalness={0.3} transparent opacity={0.2 + 0.8 * metal} />
      </mesh>
      {[0.12, 0.8].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[CAN.r + 0.015, CAN.r + 0.015, 0.06, 12]} />
          <meshStandardMaterial color="#8B5A2B" flatShading roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, CAN.h / 2, 0]}>
        <cylinderGeometry args={[CAN.r + 0.004, CAN.r + 0.004, CAN.h, 12]} />
        <meshBasicMaterial color="#BFE6FF" wireframe transparent opacity={0.55 * shell} />
      </mesh>
      {/* chemical core: glass jacket + pellets */}
      <group>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.58, 10]} />
          <meshStandardMaterial
            color="#FF7A2B"
            emissive="#FF3D00"
            emissiveIntensity={glow * 2}
            transparent
            opacity={0.12 * shell + 0.35 * glow}
            depthWrite={false}
          />
        </mesh>
        {pelletPos.map((pl, i) => (
          <mesh key={i} position={pl.p} rotation={[pl.rot, pl.rot * 2, 0]} scale={shell}>
            <dodecahedronGeometry args={[0.032, 0]} />
            <meshStandardMaterial color={pl.fe ? "#6B7280" : "#F4EBD0"} emissive={hot} flatShading roughness={0.7} />
          </mesh>
        ))}
        {/* percussion cap */}
        <mesh position={[0, 0.66, 0]} scale={shell}>
          <cylinderGeometry args={[0.085, 0.085, 0.04, 10]} />
          <meshStandardMaterial color="#D9A441" flatShading />
        </mesh>
        {/* firing pin + spring */}
        <group scale={shell}>
          <mesh position={[0, pinHead - 0.02, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 10]} />
            <meshStandardMaterial color="#E24D4D" flatShading />
          </mesh>
          <mesh position={[0, pinHead - 0.08, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.1, 6]} />
            <meshStandardMaterial color="#E8EDF5" flatShading />
          </mesh>
          <mesh geometry={spring_}>
            <meshStandardMaterial color="#F4F7FB" flatShading metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
        {/* retainer that holds the cocked pin; lanyard pulls it out */}
        <group scale={shell}>
          <mesh position={[retainerX, 0.9 - fall * fall * 0.6, 0]}>
            <boxGeometry args={[0.2, 0.04, 0.1]} />
            <meshStandardMaterial color="#3E4A66" flatShading />
          </mesh>
          <mesh geometry={cord}>
            <meshStandardMaterial color="#E8453C" flatShading />
          </mesh>
        </group>
      </group>
      {/* spark when the pin hits the cap */}
      {flash > 0 && (
        <group position={[0, 0.68, 0]} scale={0.1 + flash * 0.5}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#FFF3B0" transparent opacity={flash} />
          </mesh>
          <mesh rotation={[0.6, 0.4, 0.8]} scale={1.8}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#FFB43A" transparent opacity={flash * 0.6} wireframe />
          </mesh>
        </group>
      )}
      <pointLight position={[0, 0.35, 0.3]} color="#FF6A2A" intensity={glow * 4} distance={2.5} />
    </group>
  );
};

/** Dashed-looking red "NO" tank + strike for the myth scene. */
const GhostTank: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inK = ramp(t, T.myth + 1.2, T.myth + 2.2);
  const xK = spring({ frame: frame - sec(T.myth + 3.4), fps, config: { damping: 9, stiffness: 140 } });
  const gone = ramp(t, T.reveal - 0.6, T.reveal + 0.2);
  const o = inK * (1 - gone);
  if (o <= 0.01) return null;
  const wob = Math.sin(t * 5) * 0.03 * (1 - xK);
  return (
    <group position={[-2.3, CABIN.ceilY + 0.17 + 0.8, -0.2]} rotation={[0, 0, wob]} scale={0.6 + 0.4 * inK}>
      <mesh>
        <cylinderGeometry args={[0.55, 0.55, 1.35, 10]} />
        <meshStandardMaterial color="#8E9AAE" flatShading transparent opacity={0.55 * o} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.55, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#8E9AAE" flatShading transparent opacity={0.55 * o} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.57, 0.57, 1.37, 10]} />
        <meshBasicMaterial color="#FF4D4D" wireframe transparent opacity={0.8 * o} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((r, i) => (
        <mesh key={i} position={[0, 0.1, 0.75]} rotation={[0, 0, r]} scale={[xK, 1, 1]}>
          <boxGeometry args={[2.5, 0.2, 0.12]} />
          <meshStandardMaterial color="#FF3B3B" emissive="#FF1E1E" emissiveIntensity={0.5} flatShading transparent opacity={o} />
        </mesh>
      ))}
    </group>
  );
};

/** The full oxygen rig: ghost tank, canister, tube, mask, flowing oxygen. */
export const OxygenRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;
  const glow = ramp(t, MECH.glowStart, T.reaction + 1.5, Easing.out(Easing.quad)) * (0.65 + 0.35 * ramp(t, T.reaction, T.reaction + 1.5));
  const { pos, theta } = maskPosition(t, fps);
  const pts = useMemo(() => tubePoints(t, fps), [t, fps]);
  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.032, 6, false),
    [pts],
  );
  const flowStart = T.reaction;
  const flowCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(CAN.x, CAN.base + 0.35, 0),
        new THREE.Vector3(CAN.x, CAN.base + 0.08, 0),
        ...pts.slice(1),
      ]),
    [pts],
  );
  const COUNT = 64;
  const fill = ramp(t, flowStart + 1.8, flowStart + 6);
  return (
    <group>
      <GhostTank t={t} />
      <Canister t={t} glow={glow} />
      <mesh geometry={tubeGeo} castShadow>
        <meshStandardMaterial color="#CFEAFF" transparent opacity={0.4} roughness={0.15} depthWrite={false} />
      </mesh>
      <group position={pos} rotation={[0, 0, theta * 0.6]}>
        <Mask fill={fill} />
      </group>
      {t > flowStart &&
        Array.from({ length: COUNT }, (_, i) => {
          const born = flowStart + i * 0.09;
          if (t < born) return null;
          const u = ((t - born) * 0.32) % 1;
          const p = flowCurve.getPoint(u);
          const jitter = 0.5 * Math.min(1, u * 5);
          p.x += (hash(i) - 0.5) * 0.06 * (1 - jitter * 0.5);
          p.z += (hash(i + 9) - 0.5) * 0.05;
          return (
            <mesh key={i} position={p} scale={0.7 + hash(i + 4) * 0.7}>
              <icosahedronGeometry args={[0.03, 0]} />
              <meshBasicMaterial color={i % 3 ? "#FFFFFF" : "#BDE9FF"} toneMapped={false} />
            </mesh>
          );
        })}
    </group>
  );
};
