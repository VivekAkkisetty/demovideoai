import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import "./styles/fonts";
import { AirplaneOxygen } from "./compositions/AirplaneOxygen";
import { UnderseaBridgeDemo, type UnderseaBridgeProps } from "./compositions/UnderseaBridgeDemo";
import { AUDIO_SRC, AUDIO_SECONDS, FPS } from "./airplane/timeline";
import { VIDEO } from "./styles/theme";

const underseaProps: UnderseaBridgeProps = { projection: "perspective", subtitleVariant: "pill" };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AirplaneOxygen"
      component={AirplaneOxygen}
      durationInFrames={Math.ceil(AUDIO_SECONDS * FPS)}
      fps={FPS}
      width={VIDEO.width}
      height={VIDEO.height}
      // Length follows public/voiceover.mp3 exactly.
      calculateMetadata={async () => ({
        durationInFrames: Math.ceil((await getAudioDurationInSeconds(staticFile(AUDIO_SRC))) * FPS),
      })}
    />
    <Composition
      id="UnderseaBridgeDemo"
      component={UnderseaBridgeDemo}
      durationInFrames={VIDEO.fps * 15}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={underseaProps}
    />
  </>
);
