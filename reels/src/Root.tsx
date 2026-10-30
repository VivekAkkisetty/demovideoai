import React from "react";
import { Composition } from "remotion";
import "./styles/fonts";
import { UnderseaBridgeDemo, type UnderseaBridgeProps } from "./compositions/UnderseaBridgeDemo";
import { VIDEO } from "./styles/theme";

const defaultProps: UnderseaBridgeProps = {
  // voiceoverSrc: staticFile("audio/undersea-vo.mp3"),
  projection: "perspective",
  subtitleVariant: "pill",
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="UnderseaBridgeDemo"
      component={UnderseaBridgeDemo}
      durationInFrames={VIDEO.fps * 15}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={defaultProps}
    />
  </>
);
