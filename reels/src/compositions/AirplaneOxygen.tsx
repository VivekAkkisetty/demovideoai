import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, StudioCanvas } from "../components/3d";
import { KineticSubtitles, ProgressBar } from "../components/ui";
import { useFontsReady } from "../styles/fonts";
import { safeArea, typography } from "../styles/theme";
import { FloatingBadge } from "../airplane/Badge";
import { Clouds } from "../airplane/Clouds";
import { OxygenRig, CAN } from "../airplane/Oxygen";
import { Cabin, Fuselage } from "../airplane/Plane";
import { AUDIO_SRC, CAMERA, T, WORDS, sec } from "../airplane/timeline";

/** Whole airliner; after the outro cue it noses down and sinks into the cloud bank. */
const Airliner: React.FC = () => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [sec(T.outro), sec(T.end)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  return (
    <group position={[k * 9, -k * 13, 0]} rotation={[0, 0, -k * 0.2]}>
      <Fuselage />
      <Cabin />
      <OxygenRig />
    </group>
  );
};

const Scene: React.FC = () => (
  <StudioCanvas lighting={{ ambient: 1.5, sunIntensity: 2.2, rimIntensity: 1.0, shadowExtent: 9, sunPosition: [10, 26, 24] }}>
    <CameraRig keyframes={CAMERA} sway={0.05}>
      <Clouds />
      <Airliner />
      <FloatingBadge position={[-2.6, 4.6, 0.6]} target={[-1.6, 2.2, 0.3]} from={T.altitudeWord - 0.1} to={T.myth + 0.2} label="35,000 FT" sub="ALTITUDE" size={44} />
      <FloatingBadge
        position={[-2.4, 4.9, 0.5]}
        target={[-2.3, 3.9, -0.2]}
        from={T.tanks - 0.1}
        to={T.reveal - 0.3}
        label="NO OXYGEN TANKS"
        icon="❌"
        bg="#FF5A5A"
        fg="#fff"
        size={40}
      />
      <FloatingBadge
        position={[0.3, 4.55, 0.4]}
        target={[CAN.x, CAN.base + 1.0, 0.3]}
        from={T.generator - 0.05}
        to={T.mechanism - 0.2}
        label="CHEMICAL OXYGEN"
        sub="GENERATOR"
        size={38}
      />
      <FloatingBadge
        position={[0.3, 4.0, 0.5]}
        target={[CAN.x, CAN.base + 0.4, 0.2]}
        from={T.chemicals - 0.1}
        to={T.reaction - 0.1}
        label="Sodium Chlorate (NaClO₃)"
        sub="+ Iron (Fe)"
        size={32}
        bg="#FFFFFF"
      />
      <FloatingBadge
        position={[1.0, 3.55, 0.4]}
        target={[CAN.x + 0.1, CAN.base + 0.4, 0.3]}
        from={T.heat - 0.1}
        to={T.heat + 3.2}
        label="450°C"
        sub="REACTION HEAT"
        size={26}
        bg="#FF7A3D"
        fg="#fff"
      />
      <FloatingBadge
        position={[1.15, 0.2, 0.3]}
        target={[0.4, 1.2, 0.2]}
        from={T.minutes - 0.1}
        to={T.outro - 0.1}
        label="15 MINUTES"
        sub="OXYGEN SUPPLY"
        size={28}
      />
    </CameraRig>
  </StudioCanvas>
);

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = sec(T.follow - 0.2);
  if (frame < f0) return null;
  const a = interpolate(frame - f0, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const s = spring({ frame: frame - f0, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        left: safeArea.side,
        right: safeArea.side,
        top: 260,
        display: "flex",
        justifyContent: "center",
        opacity: a,
        transform: `translateY(${(1 - s) * 30}px)`,
      }}
    >
      <div
        style={{
          padding: "26px 44px",
          borderRadius: 999,
          background: "rgba(16,19,34,0.82)",
          border: "5px solid #fff",
          color: "#fff",
          fontFamily: typography.display,
          fontWeight: 800,
          fontSize: 54,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        Follow for more <span style={{ color: "#FFC727" }}>engineering explainers</span>
      </div>
    </div>
  );
};

export const AirplaneOxygen: React.FC = () => {
  const ready = useFontsReady();
  const frame = useCurrentFrame();
  // slate-blue studio sky that brightens as the plane descends toward the clouds
  const k = interpolate(frame, [sec(T.outro), sec(T.end)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${k > 0 ? "#8FB4DD" : "#8CA3C4"} 0%, #BFD4EA ${55 - k * 10}%, #E6EFF8 100%)`,
      }}
    >
      <Audio src={staticFile(AUDIO_SRC)} />
      {ready && <Scene />}
      <Outro />
      <KineticSubtitles words={WORDS} variant="stroke" maxWords={4} fontSize={80} activeColor="#FFC727" />
      <ProgressBar
        segments={[T.hook, T.myth, T.reveal, T.mechanism, T.reaction, T.outro].map((a, i, arr) => ({
          from: sec(a),
          to: sec(arr[i + 1] ?? T.end),
        }))}
      />
    </AbsoluteFill>
  );
};
