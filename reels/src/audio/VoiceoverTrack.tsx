import React from "react";
import { Audio } from "remotion";

/** Voiceover slot. Renders nothing until a `src` (e.g. staticFile("audio/vo.mp3")) is supplied. */
export const VoiceoverTrack: React.FC<{ src?: string; volume?: number; startFrom?: number }> = ({
  src,
  volume = 1,
  startFrom = 0,
}) => (src ? <Audio src={src} volume={volume} startFrom={startFrom} /> : null);
