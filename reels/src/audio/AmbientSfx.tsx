import React from "react";
import { Audio, interpolate, Sequence, useVideoConfig } from "remotion";

export type SfxSlot = {
  id: string;
  /** Leave undefined to keep the slot silent; set to staticFile("audio/....mp3"). */
  src?: string;
  /** Start / length in seconds. */
  from: number;
  duration: number;
  volume?: number;
  fadeSec?: number;
  loop?: boolean;
};

/** Timeline of ambient beds and one-shot SFX with fade in/out. Empty slots render nothing. */
export const AmbientSfx: React.FC<{ slots: SfxSlot[] }> = ({ slots }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {slots.map((s) => {
        if (!s.src) return null;
        const dur = Math.round(s.duration * fps);
        const fade = Math.round((s.fadeSec ?? 0.4) * fps);
        const base = s.volume ?? 0.5;
        return (
          <Sequence key={s.id} from={Math.round(s.from * fps)} durationInFrames={dur} layout="none">
            <Audio
              src={s.src}
              loop={s.loop}
              volume={(f) =>
                interpolate(f, [0, fade, dur - fade, dur], [0, base, base, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              }
            />
          </Sequence>
        );
      })}
    </>
  );
};
