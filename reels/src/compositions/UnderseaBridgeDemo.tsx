import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Droplets, Hammer, Waves } from "lucide-react";
import {
  Badge3D,
  Barge,
  BuoyRing,
  Boat,
  Bridge,
  Building,
  CameraRig,
  Cloud,
  FishSchool,
  Island,
  islandHeight,
  Kelp,
  Pipe,
  Pump,
  Rocks,
  Seabed,
  SheetPileRing,
  StudioCanvas,
  Truck,
  UnderwaterAtmosphere,
  Walers,
  WaterSurface,
  WaterVolume,
  useCameraPose,
  waveHeight,
  type CameraKeyframe,
} from "../components/3d";
import { CalloutBadge, KineticSubtitles, ProgressBar, type TimedWord } from "../components/ui";
import { AmbientSfx } from "../audio/AmbientSfx";
import { underseaSfxSlots } from "../audio/undersea-slots";
import { VoiceoverTrack } from "../audio/VoiceoverTrack";
import subtitles from "../data/undersea-bridge.subtitles.json";
import { useFontsReady } from "../styles/fonts";
import { palette, safeArea } from "../styles/theme";

export type UnderseaBridgeProps = {
  voiceoverSrc?: string;
  projection?: "perspective" | "orthographic";
  subtitleVariant?: "pill" | "stroke";
};

// ---- Timeline (30 fps, 15 s = 450 frames) -----------------------------------
const PHASE_1_END = 150; // 0–5 s   surface → dive
const PHASE_2_END = 300; // 5–10 s  sheet piles sink
const PHASE_3_END = 450; // 10–15 s dewatering

// ---- World ------------------------------------------------------------------
const FLOOR_Y = -12;
const RING_R = 3;
const PILE_H = 16;
const PILE_BASE_Y = -14; // driven 2 m into the bed; top sits at y = +2
const PILE_TOP_Y = PILE_BASE_Y + PILE_H;
const PILE_START = 156;
const PILE_STAGGER = 3.4;
const DRAIN_START = 305;
const DRAIN_END = 425;

const CAMERA: CameraKeyframe[] = [
  // Targets sit below the ring centre so the cofferdam rides above the subtitle zone.
  { frame: 0, position: [22, 7, 38], target: [0, 0, 0], fov: 36 },
  { frame: PHASE_1_END, position: [27, -4.5, 36], target: [0, -8, 0], fov: 34 },
  { frame: PHASE_2_END, position: [38, -4, 25], target: [0, -8, 0], fov: 34 },
  { frame: PHASE_3_END, position: [15, -3, 42], target: [0, -8, 0], fov: 34 },
];
// Isometric variant: orthographic, fixed 3/4 angle, eased zoom + slide.
const CAMERA_ISO: CameraKeyframe[] = [
  { frame: 0, position: [40, 34, 40], target: [0, 0, 0], zoom: 46 },
  { frame: PHASE_1_END, position: [40, -6, 40], target: [0, -4, 0], zoom: 40 },
  { frame: PHASE_2_END, position: [40, -6, 40], target: [0, -5, 0], zoom: 46 },
  { frame: PHASE_3_END, position: [40, 0, 40], target: [0, -6, 0], zoom: 52 },
];

const BARGE_BASE = new THREE.Vector3(7.2, 0, -4.2);
const BARGE_ROT = 0.35;
const PUMP_LOCAL = new THREE.Vector3(-1.0, 0.56, 0.2);

const BRIDGE_Z = -34;
const ISLAND_C: [number, number, number] = [-34, 0, BRIDGE_Z];

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pose = useCameraPose();

  // Draining level inside the cofferdam.
  const level = interpolate(frame, [DRAIN_START, DRAIN_END], [0, FLOOR_Y + 0.02], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const volumeFade = interpolate(frame, [270, 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dryness = interpolate(-level, [8, -FLOOR_Y - 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const floorColor = new THREE.Color(palette.sandWet).lerp(new THREE.Color(palette.sand), dryness);
  const pumping = frame >= DRAIN_START && frame <= DRAIN_END;

  // Barge bobs on the shared wave field.
  const bob = waveHeight(BARGE_BASE.x, BARGE_BASE.z, t) * 0.8 + 0.05;
  const bargePos: [number, number, number] = [BARGE_BASE.x, bob, BARGE_BASE.z];
  const hose = useMemo(() => {
    const u = new THREE.Vector2(BARGE_BASE.x, BARGE_BASE.z).normalize();
    const at = (r: number, y: number): [number, number, number] => [u.x * r, y, u.y * r];
    const pump = PUMP_LOCAL.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), BARGE_ROT);
    return [
      at(0.9, FLOOR_Y + 0.6),
      at(0.9, -6),
      at(0.9, 0.8),
      at(2.0, PILE_TOP_Y + 1.4),
      at(4.2, PILE_TOP_Y + 1.8),
      [BARGE_BASE.x + pump.x, 1.55, BARGE_BASE.z + pump.z],
    ] as [number, number, number][];
  }, []);
  const hoseProgress = interpolate(frame, [PILE_START + 130, DRAIN_START + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const aboveWater = pose.position.y > -0.4;
  const truckX = -20 + ((frame * 0.3) % 80);
  const buildingSpots: [number, number, number, number, number][] = [
    [-36, BRIDGE_Z + 3, 5, 2.4, 0],
    [-31.5, BRIDGE_Z - 3, 4, 2.2, 1],
    [-39.5, BRIDGE_Z - 2.5, 3, 2.0, 2],
    [-29.5, BRIDGE_Z + 2.5, 2, 2.6, 3],
  ];

  return (
    <>
      <UnderwaterAtmosphere />

      {/* ---- environment ---- */}
      <WaterSurface innerRadius={RING_R - 0.05} outerRadius={200} rings={52} segments={80} />
      <Seabed floorY={FLOOR_Y} />
      <Rocks floorY={FLOOR_Y} />
      <Kelp floorY={FLOOR_Y} />
      <FishSchool y={-6} />
      {aboveWater && (
        <>
          <Cloud position={[-40 + frame * 0.01, 30, -110]} scale={2.4} />
          <Cloud position={[40 + frame * 0.008, 36, -120]} scale={2.8} />
          <Cloud position={[0 + frame * 0.012, 44, -140]} scale={3} />
        </>
      )}

      {/* ---- background: island + bridge ---- */}
      <Island position={ISLAND_C} radius={15} peak={4} floorY={FLOOR_Y} />
      {buildingSpots.map(([x, z, floors, w, c], i) => (
        <Building
          key={i}
          position={[x, islandHeight(ISLAND_C, x, z) - 0.3, z]}
          floors={floors}
          width={w}
          depth={w}
          color={palette.buildings[c % palette.buildings.length]}
        />
      ))}
      <Bridge position={[-22, 0, BRIDGE_Z]} length={96} deckY={8} floorY={FLOOR_Y - 0.5} />
      <Truck position={[truckX, 8.25, BRIDGE_Z + 0.8]} />

      {/* ---- surface traffic ---- */}
      <Boat
        position={[9 - frame * 0.045, waveHeight(9 - frame * 0.045, 11, t) + 0.1, 11]}
        rotationY={Math.PI + 0.1}
        color={palette.accentHot}
      />
      <Barge position={bargePos} rotationY={BARGE_ROT}>
        <Pump position={[PUMP_LOCAL.x, 0.56, PUMP_LOCAL.z]} running={pumping} frame={frame} />
      </Barge>

      {/* ---- phase 1: marker buoys outline the pier location ---- */}
      <BuoyRing radius={RING_R + 0.6} count={10} fadeStart={PILE_START + 60} fadeEnd={PILE_START + 110} />

      {/* ---- phase 2: sheet pile cofferdam ---- */}
      <SheetPileRing
        radius={RING_R}
        count={32}
        height={PILE_H}
        baseY={PILE_BASE_Y}
        startFrame={PILE_START}
        stagger={PILE_STAGGER}
        cutawayFrame={DRAIN_START - 6}
      />
      <Walers levels={[PILE_TOP_Y - 0.9, -3.4]} startFrame={PHASE_2_END - 8} radius={RING_R + 0.12} />

      {/* ---- phase 3: dewatering ---- */}
      {frame >= 270 && (
        <>
          <WaterVolume radius={RING_R - 0.12} floorY={FLOOR_Y} level={level} topY={PILE_TOP_Y} opacity={volumeFade} />
          <mesh position={[0, FLOOR_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[RING_R - 0.1, 28]} />
            <meshStandardMaterial color={floorColor} flatShading transparent opacity={volumeFade} />
          </mesh>
        </>
      )}
      <Pipe
        points={hose}
        radius={0.17}
        progress={hoseProgress}
        flowFrame={pumping ? frame : undefined}
        flowCount={11}
      />

      <Badge3D
        position={[0, -3.2, 0.8]}
        target={[0, FLOOR_Y + 0.12, 0]}
        title="Cofferdam"
        subtitle="Pillar ki pakka base"
        startFrame={402}
        width={7.6}
      />
    </>
  );
};

const STEPS = [
  { from: 0, to: PHASE_1_END, icon: <Waves size={56} strokeWidth={2.6} />, label: "Dive in", sub: "Step 1" },
  { from: PHASE_1_END, to: PHASE_2_END, icon: <Hammer size={56} strokeWidth={2.6} />, label: "Drive sheet piles", sub: "Step 2" },
  { from: PHASE_2_END, to: PHASE_3_END, icon: <Droplets size={56} strokeWidth={2.6} />, label: "Pump it dry", sub: "Step 3" },
];

export const UnderseaBridgeDemo: React.FC<UnderseaBridgeProps> = ({
  voiceoverSrc,
  projection = "perspective",
  subtitleVariant = "pill",
}) => {
  const fontsReady = useFontsReady();
  const keyframes = projection === "orthographic" ? CAMERA_ISO : CAMERA;
  return (
    <AbsoluteFill style={{ background: palette.waterDeep }}>
      {fontsReady && (
        <StudioCanvas projection={projection}>
          <CameraRig keyframes={keyframes}>
            <Scene />
          </CameraRig>
        </StudioCanvas>
      )}

      {/* ---- overlays ---- */}
      <ProgressBar segments={STEPS.map(({ from, to }) => ({ from, to }))} />
      {STEPS.map((s) => (
        <Sequence key={s.label} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <div style={{ position: "absolute", top: safeArea.top, left: safeArea.side }}>
            <CalloutBadge icon={s.icon} label={s.label} sublabel={s.sub} />
          </div>
        </Sequence>
      ))}
      <KineticSubtitles words={subtitles.words as TimedWord[]} variant={subtitleVariant} />

      <VoiceoverTrack src={voiceoverSrc} />
      <AmbientSfx slots={underseaSfxSlots} />
    </AbsoluteFill>
  );
};
